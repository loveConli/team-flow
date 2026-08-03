// tests/e2e/helpers/claude-driver.mjs
// team-flow e2e runner（Tier2 LLM 层）：claude -p 无头驱动。
// 机制来源：tests/headless-staged-v0.16.0.sh:43-60（--plugin-dir 直载 + --dangerously-skip-permissions
// + --append-system-prompt 自动决策 + stream-json --verbose），补 --max-turns 与结构化解析。
// 风控四件套（评审 #1 3a-d）：单用例超时 / 预算熔断 / max_turns 显式失败 / 崩溃截断处理。
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';

/**
 * 运行一次 claude -p，解析 stream-json JSONL，返回结构化结果。
 * @param {object} opts
 * @param {string} opts.prompt 阶段 prompt
 * @param {string} opts.cwd 工作目录（解压出的临时工作区）
 * @param {string} [opts.appendSystemPrompt] 自动决策 system prompt（替代 AskUserQuestion）
 * @param {number} [opts.maxTurns=40]
 * @param {number} [opts.timeoutMs=900000] 单用例超时（默认 15min）
 * @param {string} [opts.resumeSessionId] 续接会话
 * @param {string} [opts.pluginDir] 可选 --plugin-dir 旁路（默认用 GitHub 安装的插件）
 * @param {string} [opts.model] 可选 --model（人工模拟器用 haiku 等轻量模型省钱）
 * @param {string} [opts.jsonlPath] 可选：原始 stream-json 落盘路径（边到边写，进程被杀也保住已写部分，
 *   供事后诊断 Tier2「卡住 vs 慢」——2026-08-01 因首跑被误停、transcript 随进程丢失而补）。
 * @param {string[]} [opts.extraArgs]
 * @returns {Promise<ClaudeResult>}
 */
export function runClaude(opts) {
  const {
    prompt, cwd, appendSystemPrompt, maxTurns = 40, timeoutMs = 900000,
    resumeSessionId, pluginDir, model, jsonlPath, extraArgs = [],
  } = opts;

  return new Promise((resolve) => {
    const args = [
      '-p', prompt,
      '--dangerously-skip-permissions',
      '--output-format', 'stream-json',
      '--verbose', // stream-json 在 print 模式的硬前置（既有 skill 7 处漏写）
      '--max-turns', String(maxTurns),
    ];
    if (appendSystemPrompt) args.push('--append-system-prompt', appendSystemPrompt);
    if (resumeSessionId) args.push('--resume', resumeSessionId);
    if (pluginDir) args.push('--plugin-dir', pluginDir);
    if (model) args.push('--model', model);
    args.push(...extraArgs);

    const lines = [];
    const subagentDispatches = []; // {subagent_type, description, toolUseId}
    let resultLine = null;
    let timedOut = false;
    let stderr = '';
    let buf = '';

    // 原始 stream-json 落盘（可选）：边到边写，进程被 SIGKILL/SIGTERM 也保住已写部分。
    const jsonlStream = jsonlPath ? createWriteStream(jsonlPath, { flags: 'w' }) : null;

    const child = spawn('claude', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: opts.env || process.env });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      if (jsonlStream) jsonlStream.write(chunk); // 先落盘原始字节，再解析
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        lines.push(line);
        const obj = tryParse(line);
        if (!obj) continue;
        if (obj.type === 'result') resultLine = obj;
        collectSubagentDispatch(obj, subagentDispatches);
      }
    });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('error', (err) => {
      clearTimeout(timer);
      jsonlStream?.end();
      resolve(finish({ lines, resultLine, subagentDispatches, stderr: `${stderr}\n${err.message}`, exitCode: 1, timedOut, spawnError: err.message, jsonlPath }));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      jsonlStream?.end();
      resolve(finish({ lines, resultLine, subagentDispatches, stderr, exitCode: code, timedOut, jsonlPath }));
    });
  });
}

function finish({ lines, resultLine, subagentDispatches, stderr, exitCode, timedOut, spawnError, jsonlPath }) {
  const r = resultLine || {};
  const stopReason = r.stop_reason || (timedOut ? 'timeout' : null);
  return {
    exitCode,
    timedOut,
    jsonlPath: jsonlPath || null,
    spawnError: spawnError || null,
    // result 行缺失或 is_error 或超时 → 视为错误（崩溃/截断处理，评审 #1 5b）
    isError: r.is_error === true || timedOut || resultLine == null,
    missingResult: resultLine == null,
    stopReason,
    maxTurnsHit: stopReason === 'max_turns', // max_turns 显式失败（评审 #1 3d）
    sessionId: r.session_id || null,
    durationMs: r.duration_ms || 0,
    costUsd: r.total_cost_usd || 0,
    numTurns: r.num_turns || 0,
    resultText: r.result || '',
    subagentDispatches,
    jsonl: lines.join('\n'),
    stderr,
  };
}

function collectSubagentDispatch(obj, out) {
  // Agent 工具在 stream-json 中为 assistant 消息的 tool_use 块（name=Task/Agent），input 含 subagent_type。
  if (obj.type !== 'assistant' || !Array.isArray(obj.message?.content)) return;
  for (const block of obj.message.content) {
    if (block.type === 'tool_use' && (block.name === 'Task' || block.name === 'Agent')) {
      out.push({
        subagent_type: block.input?.subagent_type || block.input?.agent || null,
        description: block.input?.description || '',
        toolUseId: block.id || null,
      });
    }
  }
}

function tryParse(line) {
  try { return JSON.parse(line); } catch { return null; }
}

/** 断言用：结果文本或某子代理输出是否含 FINAL VERDICT 标记（#100008 结果协议）。 */
export function hasFinalVerdict(claudeResult) {
  return /FINAL VERDICT/i.test(claudeResult.resultText) || /FINAL VERDICT/i.test(claudeResult.jsonl);
}

/** 断言用：是否调度过某 subagent_type（#100001/#100006 dispatch 行为）。 */
export function dispatched(claudeResult, subagentType) {
  return claudeResult.subagentDispatches.some((d) => d.subagent_type === subagentType);
}

/**
 * 预算熔断跟踪器（评审 #1 3c）：累计 cost，超阈值则后续用例应跳过。
 */
export function createBudgetTracker(maxUsd = 50) {
  let spent = 0;
  return {
    add(costUsd) { spent += costUsd || 0; },
    get spent() { return Number(spent.toFixed(4)); },
    get exceeded() { return spent > maxUsd; },
    maxUsd,
  };
}
