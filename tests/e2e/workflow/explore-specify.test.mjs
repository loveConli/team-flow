// tests/e2e/workflow/explore-specify.test.mjs
// Tier 2 LLM：探索→架构门控→规格（DP-0 冷启动 / 架构四步+DP-A / spec-writer dispatch 行为）。
// opt-in（TF_E2E_LLM=1），基线归档解压副本，行为级 oracle（state 字段 + stream-json dispatch 捕获）。
// 来源：设计 §七 Tier2 矩阵；#100001/#100006（dispatch 行为，评审 #2 核心修正）。
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tier2SkipReason, freshWorkspace, cleanupWorkspace, CHANGES, runStageInteractive } from './harness.mjs';
import { dispatched } from '../helpers/claude-driver.mjs';
import { exploreColdstartPrompt, archGatePrompt, specifyPrompt } from '../helpers/prompts.mjs';
import { stateGet, validate } from '../helpers/oracle.mjs';
import { patchStateField } from '../helpers/fixture.mjs';

const SKIP = tier2SkipReason();
const cleanups = [];
after(() => { for (const t of cleanups) cleanupWorkspace(t); });

describe('T2 explore→specify（LLM）', { skip: SKIP }, () => {
  it('T2-explore-coldstart：C3 冷启动 → DP-0 确认（停→人工决策→resume，dp_0_confirmed=true）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c3 = ws.change(CHANGES.C3);
    const r = await runStageInteractive(ws, exploreColdstartPrompt(CHANGES.C3),
      () => stateGet(c3, 'dp_0_confirmed').value === 'true',
      { label: 'T2-explore-coldstart' });
    assert.equal(r.passed, true, `DP-0 应经人工决策确认: ${r.reason} | claude 轮数=${r.numClaudes} stop=${r.finalStopReason}`);
    assert.equal(stateGet(c3, 'dp_0_confirmed').value, 'true', 'DP-0 应确认');
  });

  it('T2-arch-gate：C1（重置架构前）→ 架构四步+DP-A（停→人工决策→resume，arch_design/review/dp_a 落盘）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c1 = ws.change(CHANGES.C1);
    // 重置到架构判定前：移除 architecture/ + arch_design_decision=null
    rmSync(join(c1, 'architecture'), { recursive: true, force: true });
    patchStateField(c1, 'arch_design_decision', 'null');
    const r = await runStageInteractive(ws, archGatePrompt(CHANGES.C1),
      () => {
        const dec = stateGet(c1, 'arch_design_decision').value;
        return (dec === 'required' || dec === 'skipped' || dec === 'approved') && !!stateGet(c1, 'dp_a_result').value;
      },
      { label: 'T2-arch-gate' });
    assert.equal(r.passed, true, `架构门+DP-A 应完成: ${r.reason} | claude 轮数=${r.numClaudes}`);
    const dec = stateGet(c1, 'arch_design_decision').value;
    if (dec === 'required' || dec === 'approved') {
      assert.ok(stateGet(c1, 'arch_review_verdict').value, 'required/approved 时应有 arch_review_verdict');
    }
  });

  it('T2-specify-dispatch：C1 → spec-writer 以子代理 dispatch（stream-json 捕获）+ 产物合规', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c1 = ws.change(CHANGES.C1);
    const r = await runStageInteractive(ws, specifyPrompt(CHANGES.C1),
      () => existsSync(join(c1, 'proposal.md')) && validate(c1).exitCode === 0,
      { label: 'T2-specify-dispatch' });
    assert.equal(r.passed, true, `specify 应完成: ${r.reason} | claude 轮数=${r.numClaudes}`);
    // 核心行为断言（#100001/#100006）：spec-writer 必须作为子代理 dispatch，而非主进程手写
    assert.ok(
      dispatched(r, 'team-flow:spec-writer') || dispatched(r, 'spec-writer'),
      `spec-writer 应以子代理 dispatch（捕获的 dispatches: ${JSON.stringify(r.subagentDispatches)}）`
    );
  });
});
