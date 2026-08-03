// tests/e2e/deterministic/claude-driver.test.mjs
// Tier 1 确定性：claude-driver 的 stream-json 解析路径单测（用 fake `claude` 输出已知 JSONL，
// 无需真跑 claude）。给 Tier2 LLM 层去风险——dispatch 捕获/成本/max_turns/缺 result 解析在此验证。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { join, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { runClaude, dispatched, hasFinalVerdict, createBudgetTracker } from '../helpers/claude-driver.mjs';

let workDir, fakeBin;

/** 写一个 fake `claude` 可执行脚本，stdout 输出给定 JSONL 行。返回含该脚本的 PATH env。 */
function makeFakeClaude(jsonlLines) {
  const script = `#!/bin/sh\n${jsonlLines.map((l) => `echo '${l}'`).join('\n')}\n`;
  writeFileSync(join(fakeBin, 'claude'), script);
  chmodSync(join(fakeBin, 'claude'), 0o755);
  return { PATH: `${fakeBin}${delimiter}${process.env.PATH}` };
}

before(() => {
  workDir = mkdtempSync(join(tmpdir(), 'tf-e2e-drv-'));
  fakeBin = mkdtempSync(join(tmpdir(), 'tf-e2e-fakebin-'));
});
after(() => {
  for (const d of [workDir, fakeBin]) rmSync(d, { recursive: true, force: true });
});

describe('T1 claude-driver: stream-json 解析', () => {
  it('捕获子代理 dispatch + 解析 result（cost/turns/FINAL VERDICT）', async () => {
    const env = makeFakeClaude([
      '{"type":"system","subtype":"hook_started","session_id":"s-123"}',
      '{"type":"assistant","message":{"content":[{"type":"tool_use","id":"t1","name":"Task","input":{"subagent_type":"team-flow:spec-writer","description":"write specs","prompt":"do it"}}]}}',
      '{"type":"result","subtype":"success","is_error":false,"stop_reason":"end_turn","session_id":"s-123","duration_ms":1000,"num_turns":5,"total_cost_usd":0.42,"result":"specs written. FINAL VERDICT: DONE"}',
    ]);
    const r = await runClaude({ prompt: 'test', cwd: workDir, env, timeoutMs: 10000 });
    assert.equal(r.isError, false, `不应为 error: ${r.stderr}`);
    assert.equal(r.missingResult, false);
    assert.equal(r.maxTurnsHit, false);
    assert.equal(r.sessionId, 's-123');
    assert.equal(r.costUsd, 0.42);
    assert.equal(r.numTurns, 5);
    assert.equal(dispatched(r, 'team-flow:spec-writer'), true, '应捕获 spec-writer 子代理 dispatch');
    assert.equal(hasFinalVerdict(r), true, '应识别 FINAL VERDICT');
  });

  it('max_turns 显式失败被识别', async () => {
    const env = makeFakeClaude([
      '{"type":"result","subtype":"error_max_turns","is_error":true,"stop_reason":"max_turns","session_id":"s-9","num_turns":40,"total_cost_usd":1.5,"result":""}',
    ]);
    const r = await runClaude({ prompt: 'test', cwd: workDir, env, timeoutMs: 10000 });
    assert.equal(r.maxTurnsHit, true, 'stop_reason=max_turns 应被识别');
    assert.equal(r.isError, true);
  });

  it('缺 result 行（崩溃/截断）→ missingResult + isError', async () => {
    const env = makeFakeClaude([
      '{"type":"system","subtype":"hook_started","session_id":"s-x"}',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"partial..."}]}}',
    ]);
    const r = await runClaude({ prompt: 'test', cwd: workDir, env, timeoutMs: 10000 });
    assert.equal(r.missingResult, true, '无 result 行应标记 missingResult');
    assert.equal(r.isError, true);
  });

  it('预算熔断跟踪器累计与越限', () => {
    const b = createBudgetTracker(1.0);
    b.add(0.42);
    b.add(0.5);
    assert.equal(b.spent, 0.92);
    assert.equal(b.exceeded, false);
    b.add(0.2);
    assert.equal(b.exceeded, true, '超 1.0 应越限');
  });
});
