// tests/e2e/deterministic/validate-execution.test.mjs
// Tier 1 确定性：tf validate（产物 schema 校验）+ tf execution（show/recommend）+ tf runtime infer（模式推断）。
// 来源：workflow-feedback 2026-08-01 #100001 / #100006（执行模式推荐 + 工作流推断确定性）。
// 退出码语义：validate 0=valid / 1=有 ERROR；execution show 无 plan 抛错 → CLI main().catch → exit 1；
// infer 恒输出 JSON {mode,explicit,reason}（workflow=auto 时走自动检测，否则 explicit 覆盖）。
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validate, infer, executionShow } from '../helpers/oracle.mjs';
import { makeChange } from '../helpers/fixture.mjs';
import { tfJson, shellQuote } from '../helpers/tf.mjs';

const cleanups = [];
function track(fix) { cleanups.push(fix.root); return fix; }
after(() => { for (const root of cleanups) rmSync(root, { recursive: true, force: true }); });

// ── validate：产物 schema 正负向 ────────────────────────────────────────────
describe('T1 validate: 产物 schema 校验', () => {
  it('T1-validate-positive：合规四件产物 → exit 0', () => {
    const fix = track(makeChange({ state: 'specifying', artifacts: true }));
    const r = validate(fix.changeDir);
    assert.equal(r.exitCode, 0, `合规产物应 exit 0\nstdout: ${r.stdout}\nstderr: ${r.stderr}`);
  });

  it('T1-validate-negative：spec 缺 SHALL/MUST → exit 1', () => {
    const fix = track(makeChange({ state: 'specifying', artifacts: true }));
    // 覆写 spec 为无 SHALL/MUST 的非法内容（validateDeltaSpec 应判 ERROR）。
    writeFileSync(join(fix.changeDir, 'specs', 'policy-main', 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: weak\n\nThe system does something vaguely described.\n');
    const r = validate(fix.changeDir);
    assert.equal(r.exitCode, 1, `缺 SHALL/MUST 的 spec 应 exit 1\nstdout: ${r.stdout}`);
  });
});

// ── infer：workflow 模式自动推断（workflow=auto 走自动检测）─────────────────
describe('T1 infer: workflow 模式推断（#100006）', () => {
  it('T1-infer-full：标准 fixture（含 api 关键词 + 3 任务）→ mode=full（自动检测）', () => {
    // workflow:'auto' 跳过 explicit 覆盖（infer-workflow.mjs:51），强制走自动检测路径。
    const fix = track(makeChange({ state: 'exploring', workflow: 'auto', artifacts: true }));
    const r = infer(fix.changeDir);
    assert.equal(r.exitCode, 0, `infer 应 exit 0: ${r.stderr}`);
    assert.equal(r.json.mode, 'full', `应推断 full，reason: ${r.json.reason}`);
    assert.equal(r.json.explicit, false, 'workflow=auto 应为自动检测（explicit=false）');
  });

  it('T1-infer-hotfix：极简 fixture（1 任务 + 无 schema/api/新模块关键词）→ mode=hotfix', () => {
    const fix = track(makeHotfixFixture());
    const r = infer(fix.changeDir);
    assert.equal(r.exitCode, 0, `infer 应 exit 0: ${r.stderr}`);
    assert.equal(r.json.mode, 'hotfix', `应推断 hotfix，reason: ${r.json.reason}`);
    assert.equal(r.json.explicit, false, '无 .team-flow.yaml → workflow 默认 auto，应为自动检测');
  });
});

// ── execution：show / recommend ─────────────────────────────────────────────
describe('T1 execution: show / recommend（#100001）', () => {
  it('T1-execution-show-noplan：无执行计划 → execution show exit 1', () => {
    const fix = track(makeChange({ state: 'executing', artifacts: true })); // 未创建 execution plan
    const r = executionShow(fix.changeDir);
    assert.equal(r.exitCode, 1, `无 plan 时 show 应抛错并 exit 1: ${r.stderr}`);
  });

  it('T1-execution-recommend：有 tasks → recommend exit 0 + 合法 mode + 非空 available_modes', () => {
    const fix = track(makeChange({ state: 'approved-for-build', artifacts: true })); // 含 3 任务
    const r = tfJson(`execution recommend ${shellQuote(fix.changeDir)} --json`);
    assert.equal(r.exitCode, 0, `recommend 应 exit 0: ${r.stderr}`);
    assert.ok(r.json && r.json.recommendation, `json.recommendation 应存在: ${r.stdout}`);
    const rec = r.json.recommendation.recommendation;
    assert.ok(rec && ['inline', 'batch-inline', 'sdd'].includes(rec.mode),
      `recommendation.mode 应 ∈ {inline,batch-inline,sdd}，实际: ${rec && rec.mode}`);
    assert.ok(Array.isArray(r.json.recommendation.available_modes) && r.json.recommendation.available_modes.length > 0,
      'available_modes 应为非空数组');
  });
});

// ── 本地夹具：hotfix 推断极简 fixture（helper 的产物模板含 api 关键词，不适用）─────
// infer 仅读 proposal.md + tasks.md + .team-flow.yaml（缺失时 workflow 默认 auto）。
// 判据（infer-workflow.mjs:96）：taskCount≤2 && fileCount≤2 && 无 schema/api 关键词 && 无新模块关键词 → hotfix。
function makeHotfixFixture() {
  const root = mkdtempSync(join(tmpdir(), 'tf-e2e-hotfix-'));
  const changeDir = join(root, 'changes', 'C-hotfix');
  mkdirSync(changeDir, { recursive: true });
  // 刻意规避全部 schema 关键词(schema/api/interface/接口/validator/类型/...)与新模块关键词。
  writeFileSync(join(changeDir, 'proposal.md'),
    '## Why\n\nFix a small typo in the documentation heading that confuses readers.\n\n## What Changes\n\n- Correct the heading text\n');
  writeFileSync(join(changeDir, 'tasks.md'),
    '## Batch 1\n\n- [x] Task 1.1: Correct the heading text in the documentation\n');
  return { root, changeDir };
}
