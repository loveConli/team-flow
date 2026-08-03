// tests/e2e/workflow/conduct.test.mjs
// Tier 2 LLM：行为/规范层用例（跨 change 隔离 / 结果协议 / checker 接入 / SendMessage 复用 /
// 修复→审查串行 / 实事求是 / 磁盘续跑）。多为行为级断言（stream-json dispatch 捕获 + 目录快照 +
// 弱信号），需活环境调优。opt-in（TF_E2E_LLM=1）。
// 来源：设计 §七 Tier2；#100000/#100002/#100003/#100008/v0.29.1。
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { tier2SkipReason, freshWorkspace, cleanupWorkspace, CHANGES, runStageInteractive } from './harness.mjs';
import { dispatched, hasFinalVerdict } from '../helpers/claude-driver.mjs';
import { crossChangePrompt, archGatePrompt, exploreColdstartPrompt } from '../helpers/prompts.mjs';
import { stateGet } from '../helpers/oracle.mjs';
import { patchStateField } from '../helpers/fixture.mjs';
import { rmSync } from 'node:fs';

const SKIP = tier2SkipReason();
const cleanups = [];
after(() => { for (const t of cleanups) cleanupWorkspace(t); });

/** 目录树内容哈希（路径+内容），用于跨 change 隔离的零 diff 断言（#100000，评审 #2 致命修正）。 */
function dirHash(dir) {
  const hash = createHash('sha256');
  function walk(d) {
    for (const entry of readdirSync(d).sort()) {
      const full = join(d, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === '.git') continue; // 排除 .git（worktree/状态噪音）
        hash.update(`dir:${entry}\n`);
        walk(full);
      } else {
        hash.update(`file:${entry}:${readFileSync(full).length}\n`);
        hash.update(readFileSync(full));
      }
    }
  }
  walk(dir);
  return hash.digest('hex');
}

describe('T2 conduct（LLM 行为规范）', { skip: SKIP }, () => {
  // 架构门完成判据（arch_design_decision 判定 + DP-A 落盘），供 4 个架构相关用例复用。
  const archDone = (c1) => () => {
    const dec = stateGet(c1, 'arch_design_decision').value;
    return (dec === 'required' || dec === 'skipped') && !!stateGet(c1, 'dp_a_result').value;
  };
  // 行为判据：某轮出现 FINAL VERDICT（阶段产出终态标记）。
  const finalVerdictSeen = (_, rounds) => hasFinalVerdict(rounds[rounds.length - 1]);

  it('T2-cross-change：推进 C2 时 C1 产物目录树零改动（#100000 隔离）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c1 = ws.change(CHANGES.C1);
    const before = dirHash(c1);
    const r = await runStageInteractive(ws, crossChangePrompt(CHANGES.C2, CHANGES.C1), finalVerdictSeen,
      { label: 'T2-cross-change' });
    assert.equal(r.passed, true, `推进 C2 应完成: ${r.reason}`);
    const afterHash = dirHash(c1);
    assert.equal(afterHash, before, '跨 change 隔离：C1 产物目录树应零改动');
  });

  it('T2-result-protocol：阶段产出含 FINAL VERDICT 终态标记（#100008，硬断言）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const r = await runStageInteractive(ws, exploreColdstartPrompt(CHANGES.C3), finalVerdictSeen,
      { label: 'T2-result-protocol' });
    assert.equal(r.passed, true, `阶段应完成并产出 FINAL VERDICT: ${r.reason}`);
    assert.ok(hasFinalVerdict(r), '子代理/阶段输出应含 FINAL VERDICT 标记');
  });

  it('T2-cross-change-checker：跨 change 不一致时 cross-change-consistency-checker 被调度', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const checkerDispatched = (_, rounds) => rounds.some(
      (rr) => dispatched(rr, 'team-flow:cross-change-consistency-checker') || dispatched(rr, 'cross-change-consistency-checker')
    );
    const r = await runStageInteractive(ws, crossChangePrompt(CHANGES.C2, CHANGES.C1), checkerDispatched,
      { label: 'T2-cross-change-checker' });
    assert.equal(r.passed, true, `cross-change-consistency-checker 应被调度: ${r.reason}（dispatches: ${JSON.stringify(r.subagentDispatches)}）`);
  });

  it('T2-sendmessage-reuse：架构修复循环复用原子代理（architecture-design 至多 dispatch 一次，v0.29.1）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c1 = ws.change(CHANGES.C1);
    rmSync(join(c1, 'architecture'), { recursive: true, force: true });
    patchStateField(c1, 'arch_design_decision', 'null');
    const r = await runStageInteractive(ws, archGatePrompt(CHANGES.C1), archDone(c1), { label: 'T2-sendmessage-reuse' });
    assert.equal(r.passed, true, `架构门应完成: ${r.reason}`);
    const designDispatches = r.subagentDispatches.filter(
      (d) => d.subagent_type === 'team-flow:architecture-design' || d.subagent_type === 'architecture-design'
    );
    // 循环修正必须 SendMessage 恢复原子代理，不得为每次修正启动新子代理 → dispatch 次数 ≤ 1
    assert.ok(designDispatches.length <= 1, `architecture-design 应至多 dispatch 1 次（复用原子代理），实得 ${designDispatches.length}`);
  });

  it('T2-serial：修复→审查串行（审查 dispatch 不早于修复完成，#100003 时序）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c1 = ws.change(CHANGES.C1);
    rmSync(join(c1, 'architecture'), { recursive: true, force: true });
    patchStateField(c1, 'arch_design_decision', 'null');
    const r = await runStageInteractive(ws, archGatePrompt(CHANGES.C1), archDone(c1), { label: 'T2-serial' });
    assert.equal(r.passed, true, `架构门应完成: ${r.reason}`);
    // stream-json 中 dispatch 按出现顺序记录；若同时存在 design 与 reviewer dispatch，
    // 首个 reviewer dispatch 必须出现在首个 design dispatch 之后（串行，非并行）。
    const idxDesign = r.subagentDispatches.findIndex((d) => /architecture-design/.test(d.subagent_type || ''));
    const idxReviewer = r.subagentDispatches.findIndex((d) => /architecture-reviewer/.test(d.subagent_type || ''));
    if (idxDesign >= 0 && idxReviewer >= 0) {
      assert.ok(idxReviewer > idxDesign, `审查 dispatch(${idxReviewer}) 应在修复 dispatch(${idxDesign}) 之后（串行）`);
    }
  });

  it('T2-pragmatic：面对可疑 reviewer 建议，输出含"查证代码/既有模式"证据引用（#100002 弱信号）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c1 = ws.change(CHANGES.C1);
    rmSync(join(c1, 'architecture'), { recursive: true, force: true });
    patchStateField(c1, 'arch_design_decision', 'null');
    // 注入一个可疑建议，要求子代理先查证再采纳
    const prompt = `${archGatePrompt(CHANGES.C1)}\n\n额外约束：评审曾建议"跨模块调用直接用 @Autowired 注入"。` +
      `在采纳任何技术建议前，必须先在代码库中搜索既有跨模块调用模式予以验证；` +
      `若建议与既有模式冲突，在产物或汇报中说明你查证到的既有模式与取舍。`;
    const r = await runStageInteractive(ws, prompt, archDone(c1), { label: 'T2-pragmatic' });
    assert.equal(r.passed, true, `架构门应完成: ${r.reason}`);
    // 弱信号断言：输出应体现实事求是（查证/既有模式/验证 等证据引用），而非盲从
    assert.match(r.resultText + r.jsonl, /(既有模式|查证|验证|搜索代码|existing (pattern|implementation)|verify)/i,
      '实事求是弱信号：输出应含查证/既有模式/验证类证据引用');
  });

  it('T2-interruption-resume：磁盘状态续跑（二次运行不重复已完成阶段）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c3 = ws.change(CHANGES.C3);
    const dp0Done = () => stateGet(c3, 'dp_0_confirmed').value === 'true';
    const r1 = await runStageInteractive(ws, exploreColdstartPrompt(CHANGES.C3), dp0Done, { label: 'T2-interruption-resume-1' });
    assert.equal(r1.passed, true, `首次运行应完成 DP-0: ${r1.reason}`);
    // 二次运行：应从磁盘状态续跑，识别 DP-0 已完成而不重做（oracle 首轮即满足 = 不重复）
    const r2 = await runStageInteractive(ws, exploreColdstartPrompt(CHANGES.C3), dp0Done, { label: 'T2-interruption-resume-2' });
    assert.equal(r2.passed, true, `续跑运行应保持 DP-0: ${r2.reason}`);
    assert.equal(stateGet(c3, 'dp_0_confirmed').value, 'true', '续跑后 DP-0 应保持 confirmed');
  });
});
