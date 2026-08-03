// tests/e2e/workflow/harness.mjs
// Tier2 LLM 层共享 harness：skip 判定（opt-in + 基线存在）+ 基线解压 + 预算熔断跟踪。
// 每个用例取一份全新解压副本（隔离，避免阶段推进相互污染），测后 cleanupWorkspace。
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractBaseline, cleanupWorkspace, DEFAULT_BASELINE } from '../helpers/workspace.mjs';
import { createBudgetTracker, runClaude } from '../helpers/claude-driver.mjs';
import { interactiveSystemPrompt, humanSimulatorPrompt } from '../helpers/prompts.mjs';
import assert from 'node:assert/strict';

/** Tier2 跳过原因：未设 TF_E2E_LLM=1 或缺基线归档时跳过（不 fail）。 */
export function tier2SkipReason() {
  if (process.env.TF_E2E_LLM !== '1') return 'Tier2 LLM 测试需 TF_E2E_LLM=1（local-only，慢且贵）';
  if (!existsSync(DEFAULT_BASELINE)) return `缺基线归档 ${DEFAULT_BASELINE}，先运行 npm run test:e2e:baseline`;
  return false;
}

// 全局预算熔断（评审 #1 3c）：累计 claude 成本，超 TF_E2E_BUDGET_USD（默认 50）则后续用例跳过。
export const budget = createBudgetTracker(Number(process.env.TF_E2E_BUDGET_USD || 50));

// 插件加载目录：默认用 GitHub 安装的插件（LT 决策⑤）；设 TF_E2E_PLUGIN_DIR 可指向本地源码
// （用于验证当前代码的特性是否真生效，绕过已安装插件版本）。
export const PLUGIN_DIR = process.env.TF_E2E_PLUGIN_DIR || undefined;

// Tier2 transcript 落盘目录（workflow/runs/，绝对路径不受 cwd 影响）。
// 每次 claude 调用一份 stream-json JSONL——进程被杀也保住已写部分，供事后诊断「卡住 vs 慢」。
const RUNS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'runs');

// 人工模拟器配置（LT 决策②：LLM 为主）。默认不传 --model（继承默认模型，避免代理不认 haiku 报错）；
// 重健壮性不重成本——可经 TF_E2E_HUMAN_MODEL 显式指定轻量模型。
const HUMAN_SIM_MODEL = process.env.TF_E2E_HUMAN_MODEL || '';
// 单阶段最多模拟人工决策轮数（防 claude 反复停顿烧预算）。
const MAX_HUMAN_ROUNDS = Number(process.env.TF_E2E_MAX_HUMAN_ROUNDS || 6);

let jsonlSeq = 0;
function slugify(label, prompt) {
  return (label || prompt.split('\n').find((l) => l.trim()) || 'stage')
    .replace(/[^a-z0-9一-龥-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'stage';
}

/** 解压一份全新工作区副本，返回 {tempRoot, workspace, change(name)}。 */
export function freshWorkspace() {
  const { tempRoot, workspace } = extractBaseline();
  return {
    tempRoot,
    workspace,
    change: (name) => join(workspace, 'changes', name),
  };
}

/**
 * 单次 claude -p 调用：交互式 system prompt + 预算累计 + 熔断 + JSONL 落盘。
 * @param {string} [label] 文件名可读标签。
 * @param {object} [opts]
 * @param {string} [opts.resumeSessionId] resume 续跑（人工决策回复用）。
 * @param {string|null} [opts.systemPrompt] 缺省注入 interactiveSystemPrompt()；传 null 跳过（resume 轮不重复注入）。
 * @param {string} [opts.model] 覆盖模型（人工模拟器用 haiku）。
 * @param {number} [opts.maxTurns]
 */
export async function runStage(ws, prompt, label, opts = {}) {
  mkdirSync(RUNS_DIR, { recursive: true });
  const jsonlPath = join(RUNS_DIR, `${Date.now()}-${String(++jsonlSeq).padStart(3, '0')}-${slugify(label, prompt)}.jsonl`);
  const systemPrompt = opts.systemPrompt === undefined ? interactiveSystemPrompt() : opts.systemPrompt;
  const r = await runClaude({
    prompt,
    cwd: ws.workspace,
    appendSystemPrompt: systemPrompt || undefined,
    pluginDir: PLUGIN_DIR,
    jsonlPath,
    resumeSessionId: opts.resumeSessionId,
    model: opts.model,
    maxTurns: opts.maxTurns,
  });
  budget.add(r.costUsd);
  assert.equal(budget.exceeded, false, `预算熔断：已 $${budget.spent} 超 $${budget.maxUsd}`);
  return r;
}

/**
 * 人工模拟器（LT 决策②：LLM 为主）：轻量 LLM 扮演 LT，读代理汇报给出决策回复。
 * 返回决策文本（空则回退默认确认）。systemPrompt=null 避免注入工作流上下文；maxTurns=1 纯回复。
 */
export async function simulateHuman(ws, agentReport, label = 'stage') {
  const r = await runStage(ws, humanSimulatorPrompt(agentReport), `${label}-人工决策`, {
    model: HUMAN_SIM_MODEL,
    maxTurns: 1,
    systemPrompt: null,
  });
  return (r.resultText || '').trim() || '确认，按你的建议继续推进。';
}

/**
 * 交互式阶段编排（LT 决策②核心）：oracle 驱动的多轮「停→人工决策→resume」环。
 * - oracle(ws, rounds) 满足 = 阶段真完成（唯一真相源；状态/文件判据用 ws，行为判据可用 rounds 的 dispatch/文本）。
 * - claude end_turn 但 oracle 未满足 = 在等人工 → simulateHuman 决策 → resume 续跑。
 * - claude 异常（isError/maxTurnsHit/非 end_turn）= 失败。
 * 返回聚合结果（跨轮 subagentDispatches/resultText/jsonl 合并，便于行为级断言）。
 * @param {(ws:any, rounds:any[])=>boolean} oracle 阶段完成判据。
 * @param {object} [opts] {label, maxHumanRounds}
 */
export async function runStageInteractive(ws, prompt, oracle, opts = {}) {
  const label = opts.label || slugify(undefined, prompt);
  const maxRounds = opts.maxHumanRounds || MAX_HUMAN_ROUNDS;
  const rounds = [];

  let r = await runStage(ws, prompt, label);
  rounds.push(r);
  if (oracle(ws, rounds)) return finishInteractive(rounds, true, 'oracle 首轮即满足');

  for (let i = 1; i <= maxRounds; i++) {
    if (r.isError) return finishInteractive(rounds, false, `claude 异常: stop=${r.stopReason} spawn=${r.spawnError || ''} ${r.stderr.slice(0, 200)}`);
    if (r.maxTurnsHit) return finishInteractive(rounds, false, `claude 触发 max_turns(${r.numTurns}) 仍未完成`);
    if (r.stopReason !== 'end_turn') return finishInteractive(rounds, false, `非预期停止: ${r.stopReason}`);
    if (!r.sessionId) return finishInteractive(rounds, false, '无 session_id，无法 resume 续跑');
    // end_turn + oracle 未满足 → claude 在等人工决策
    const decision = await simulateHuman(ws, r.resultText, `${label}-R${i}`);
    r = await runStage(ws, decision, `${label}-resume${i}`, { resumeSessionId: r.sessionId, systemPrompt: null });
    rounds.push(r);
    if (oracle(ws, rounds)) return finishInteractive(rounds, true, `第 ${i} 轮人工决策后 oracle 满足`);
  }
  return finishInteractive(rounds, false, `超 ${maxRounds} 轮人工决策 oracle 仍未满足`);
}

/** 聚合多轮结果为单一断言对象（跨轮 dispatch/文本合并）。 */
function finishInteractive(rounds, passed, reason) {
  return {
    passed,
    reason,
    rounds,
    numClaudes: rounds.length,
    subagentDispatches: rounds.flatMap((x) => x.subagentDispatches),
    resultText: rounds.map((x) => x.resultText).join('\n'),
    jsonl: rounds.map((x) => x.jsonl).join('\n'),
    isError: rounds.some((x) => x.isError),
    finalStopReason: rounds[rounds.length - 1]?.stopReason || null,
    costUsd: rounds.reduce((s, x) => s + (x.costUsd || 0), 0),
  };
}

// VRM 三个阶梯 change 名（基线归档内的真实目录）。
export const CHANGES = {
  C1: 'C1-domain-policy',
  C2: 'C2-policy-management',
  C3: 'C3-policy-import-export',
};

export { cleanupWorkspace };
