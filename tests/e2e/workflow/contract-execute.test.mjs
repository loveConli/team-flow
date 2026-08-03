// tests/e2e/workflow/contract-execute.test.mjs
// Tier 2 LLM：契约（含 v0.12 test-matrix 产出）+ 执行（tf isolate 多仓库 worktree）。
// opt-in（TF_E2E_LLM=1）。来源：设计 §七 Tier2；v0.12（contract-builder 产 test-matrix.md）；#100009。
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tier2SkipReason, freshWorkspace, cleanupWorkspace, CHANGES, runStageInteractive } from './harness.mjs';
import { contractPrompt, executePrompt } from '../helpers/prompts.mjs';
import { stateGet, executionShow } from '../helpers/oracle.mjs';
import { patchStateField } from '../helpers/fixture.mjs';

const SKIP = tier2SkipReason();
const cleanups = [];
after(() => { for (const t of cleanups) cleanupWorkspace(t); });

describe('T2 contract→execute（LLM）', { skip: SKIP }, () => {
  it('T2-contract：C2（重置到 specifying）→ contract-builder 产契约 + test-matrix.md + hash 落盘（停→DP-3 人工批准→resume）', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c2 = ws.change(CHANGES.C2);
    // 重置到 specifying：移除契约 + 清 dp_3/test_matrix_hash，保留规划产物
    rmSync(join(c2, 'execution-contract.md'), { force: true });
    rmSync(join(c2, 'test-matrix.md'), { force: true });
    patchStateField(c2, 'state', 'specifying');
    patchStateField(c2, 'dp_3_result', 'null');
    patchStateField(c2, 'test_matrix_hash', 'null');
    const r = await runStageInteractive(ws, contractPrompt(CHANGES.C2),
      () => existsSync(join(c2, 'execution-contract.md')) && !!stateGet(c2, 'dp_3_result').value &&
            existsSync(join(c2, 'test-matrix.md')) && !!stateGet(c2, 'test_matrix_hash').value,
      { label: 'T2-contract' });
    assert.equal(r.passed, true, `contract 应完成: ${r.reason} | claude 轮数=${r.numClaudes}`);
    // v0.12：contract-builder 应产 test-matrix.md 并写 test_matrix_hash（oracle 已含，此处显式留痕）
    assert.ok(existsSync(join(c2, 'test-matrix.md')), 'v0.12：应产出 test-matrix.md');
    assert.ok(stateGet(c2, 'test_matrix_hash').value, 'v0.12：test_matrix_hash 应落盘');
  });

  it('T2-execute-isolate：C2（executing）→ build-executor 先 tf isolate 建多仓库 worktree', async () => {
    const ws = freshWorkspace(); cleanups.push(ws.tempRoot);
    const c2 = ws.change(CHANGES.C2);
    // #100009：worktree 落点 <root>/.worktrees/<change-slug>/bff-btit-vrm/.git
    const slug = basename(c2);
    const wtBff = join(ws.workspace, '.worktrees', slug, 'bff-btit-vrm', '.git');
    const r = await runStageInteractive(ws, executePrompt(CHANGES.C2),
      () => existsSync(wtBff),
      { label: 'T2-execute-isolate' });
    assert.equal(r.passed, true, `execute/isolate 应完成: ${r.reason} | claude 轮数=${r.numClaudes}`);
    assert.ok(existsSync(wtBff), `应为 bff 建 worktree: ${wtBff}`);
    // execution show 应可用（current 或有 plan）
    const es = executionShow(c2);
    assert.ok(es.json, `execution show 应返回 JSON: ${es.stderr}`);
  });
});
