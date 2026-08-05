// tests/e2e/deterministic/guard-dimensions.test.mjs
// Tier 1 确定性：16 个 guard 维度正负向（含 v0.36.0 arch-readiness / arch-snapshot；用 checks[] 逐维度解耦断言，互不干扰）。
// 来源：设计 §七 Tier1 矩阵 + 评审 #1 1a（全维度覆盖）+ #2（负向）+ #3 M1（test-matrix-complete）。
// guard 不校验目录实际 state 是否等于 from，只按 from:to 跑维度并读取产物/字段——
// 故可在任意 state 的 fixture 上对任意 from:to 检视特定维度。
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { guardCheck, stateSet } from '../helpers/oracle.mjs';
import { makeChange, writePlanningArtifacts, writeContract, dropStateField } from '../helpers/fixture.mjs';
import { tf, shellQuote } from '../helpers/tf.mjs';

const cleanups = [];
function track(fix) { cleanups.push(fix.root); return fix; }
after(() => { for (const root of cleanups) rmSync(root, { recursive: true, force: true }); });

/** 从 checks[] 取某维度结果。 */
function dim(checks, name) {
  const c = checks.find((x) => x.dimension === name);
  assert.ok(c, `检查结果应含维度 ${name}，实际: ${checks.map((x) => x.dimension).join(',')}`);
  return c;
}

// ── artifacts-exist 维度（v0.32.2 起由 specifying→bridging 独家承载）────────
describe('T1 guard: artifacts-exist 维度（specifying→bridging）', () => {
  it('artifacts-exist 正向：四件产物 + specs 齐 → pass', () => {
    const fix = track(makeChange({ state: 'specifying', artifacts: true }));
    const r = guardCheck(fix.changeDir, 'specifying', 'bridging');
    assert.equal(dim(r.checks, 'artifacts-exist').pass, true);
  });

  it('artifacts-exist 负向：缺 proposal → fail', () => {
    const fix = track(makeChange({ state: 'specifying', artifacts: false }));
    writePlanningArtifacts(fix.changeDir, { specs: true });
    rmSync(join(fix.changeDir, 'proposal.md')); // 删 proposal
    const r = guardCheck(fix.changeDir, 'specifying', 'bridging');
    assert.equal(dim(r.checks, 'artifacts-exist').pass, false);
  });
});

// ── exploring → specifying：arch-design + arch-readiness（v0.36.0 增 arch-readiness）──
describe('T1 guard: exploring→specifying 维度', () => {
  it('维度含 arch-design + arch-readiness（artifacts-exist 已移走，P3-10）', () => {
    const fix = track(makeChange({ state: 'exploring', artifacts: false })); // 无产物也过——产物不再是本转换的判据
    const r = guardCheck(fix.changeDir, 'exploring', 'specifying');
    assert.equal(r.error, null);
    const dims = r.checks.map(c => c.dimension);
    assert.ok(dims.includes('arch-design'), `应含 arch-design，实际: ${dims.join(',')}`);
    assert.ok(dims.includes('arch-readiness'), `应含 arch-readiness（v0.36.0），实际: ${dims.join(',')}`);
    assert.ok(!dims.includes('artifacts-exist'), 'artifacts-exist 不应再挂 exploring→specifying');
  });

  it('arch-design 正向：arch_design_decision=null → pass（向后兼容）', () => {
    const fix = track(makeChange({ state: 'exploring', artifacts: true })); // archDecision 默认 null
    const r = guardCheck(fix.changeDir, 'exploring', 'specifying');
    assert.equal(dim(r.checks, 'arch-design').pass, true);
  });

  it('arch-design 正向：required + 三件套齐 → pass', () => {
    const fix = track(makeChange({ state: 'exploring', artifacts: true, architecture: true, archDecision: 'required' }));
    const r = guardCheck(fix.changeDir, 'exploring', 'specifying');
    assert.equal(dim(r.checks, 'arch-design').pass, true);
  });

  it('T1-guard-arch-negative：required + 缺 api.md → fail', () => {
    const fix = track(makeChange({ state: 'exploring', artifacts: true, architecture: true, archDecision: 'required' }));
    rmSync(join(fix.changeDir, 'architecture', 'api.md'));
    const r = guardCheck(fix.changeDir, 'exploring', 'specifying');
    assert.equal(dim(r.checks, 'arch-design').pass, false);
  });
});

// ── specifying → bridging：schema-valid ─────────────────────────────────────
describe('T1 guard: specifying→bridging schema-valid', () => {
  it('正向：合规 spec（SHALL + Scenario）→ pass', () => {
    const fix = track(makeChange({ state: 'specifying', artifacts: true }));
    const r = guardCheck(fix.changeDir, 'specifying', 'bridging');
    assert.equal(dim(r.checks, 'schema-valid').pass, true, JSON.stringify(dim(r.checks, 'schema-valid').failures));
  });

  it('负向：spec 缺 SHALL/MUST → fail', () => {
    const fix = track(makeChange({ state: 'specifying', artifacts: true }));
    // 覆写 spec 为无 SHALL/MUST 的非法内容
    writeFileSync(join(fix.changeDir, 'specs', 'policy-main', 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: weak\n\nThe system does something vaguely described.\n');
    const r = guardCheck(fix.changeDir, 'specifying', 'bridging');
    assert.equal(dim(r.checks, 'schema-valid').pass, false);
  });
});

// ── bridging → approved-for-build：contract-fresh + dp-gate-passed ──────────
describe('T1 guard: bridging→approved-for-build 维度', () => {
  it('contract-fresh 正向：init 后 hash 与产物一致 → pass', () => {
    const fix = track(makeChange({ state: 'bridging', artifacts: true }));
    const r = guardCheck(fix.changeDir, 'bridging', 'approved-for-build');
    assert.equal(dim(r.checks, 'contract-fresh').pass, true);
  });

  it('contract-fresh 负向：init 后改动产物 → hash 漂移 → fail', () => {
    const fix = track(makeChange({ state: 'bridging', artifacts: true }));
    appendFileSync(join(fix.changeDir, 'proposal.md'), '\n\n## Appended\nscope expansion after hash\n');
    const r = guardCheck(fix.changeDir, 'bridging', 'approved-for-build');
    assert.equal(dim(r.checks, 'contract-fresh').pass, false);
  });

  it('dp-gate-passed 正向：dp_3_result 已记录 → pass', () => {
    const fix = track(makeChange({ state: 'bridging', artifacts: true, set: { dp_3_result: 'approved: x' } }));
    const r = guardCheck(fix.changeDir, 'bridging', 'approved-for-build');
    assert.equal(dim(r.checks, 'dp-gate-passed').pass, true);
  });

  it('dp-gate-passed 负向：缺 dp_3_result → fail', () => {
    const fix = track(makeChange({ state: 'bridging', artifacts: true })); // 无 dp_3
    const r = guardCheck(fix.changeDir, 'bridging', 'approved-for-build');
    assert.equal(dim(r.checks, 'dp-gate-passed').pass, false);
  });
});

// ── executing → closing：tasks/tests/specs-merged/compound/test-matrix/plan ─
function closingFixture(opts = {}) {
  return track(makeChange({ state: 'executing', artifacts: true, contract: true, allChecked: true, ...opts }));
}

describe('T1 guard: executing→closing 维度', () => {
  it('tasks-complete 正向：全部勾选 → pass', () => {
    const fix = closingFixture({ allChecked: true });
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'tasks-complete').pass, true);
  });

  it('tasks-complete 负向：存在未勾选 → fail', () => {
    const fix = closingFixture({ allChecked: false });
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'tasks-complete').pass, false);
  });

  // v0.13 §50（BUG-A 政策修正）：非存量 change 的 tests-passing 只认 tf test record
  // 程序化写入的结构化证据；手工 test_result 通道已关闭，dp_6_result 自述不再是证据。
  it('tests-passing 正向：tf test record 程序化记录 → pass（v0.13 §50）', () => {
    const fix = closingFixture();
    const out = join(fix.changeDir, 'surefire-output.txt');
    writeFileSync(out, '[INFO] Results:\n[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 2\n');
    const rec = tf(`test record ${shellQuote(fix.changeDir)} --from ${shellQuote(out)}`);
    assert.equal(rec.exitCode, 0, `test record 应成功: ${rec.stderr}`);
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'tests-passing').pass, true, JSON.stringify(dim(r.checks, 'tests-passing').failures));
  });

  it('tests-passing 负向：无验证结果 → fail', () => {
    const fix = closingFixture();
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'tests-passing').pass, false);
  });

  it('tests-passing 负向：dp_6_result 自述对非存量 change 不是证据（v0.13 BUG-A 修正）', () => {
    const fix = closingFixture();
    stateSet(fix.changeDir, 'dp_6_result', 'pass: all waves implemented, spec-aligned');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'tests-passing').pass, false);
  });

  it('tests-passing 负向：tf test record 记录 fail 结果 → fail', () => {
    const fix = closingFixture();
    const out = join(fix.changeDir, 'surefire-fail.txt');
    writeFileSync(out, '[INFO] Tests run: 8, Failures: 3, Errors: 0, Skipped: 0\n');
    const rec = tf(`test record ${shellQuote(fix.changeDir)} --from ${shellQuote(out)}`);
    assert.equal(rec.exitCode, 1, 'fail 结果 record 应 exit 1');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'tests-passing').pass, false);
  });

  it('tests-passing 正向：显式 skip + 理由 → pass（可审计豁免）', () => {
    const fix = closingFixture();
    stateSet(fix.changeDir, 'test_matrix_skipped', 'true');
    stateSet(fix.changeDir, 'test_matrix_skip_reason', 'docs-only change, no code');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'tests-passing').pass, true, JSON.stringify(dim(r.checks, 'tests-passing').failures));
  });

  it('specs-merged 正向：spec_merged=true → pass', () => {
    const fix = closingFixture();
    stateSet(fix.changeDir, 'spec_merged', 'true');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'specs-merged').pass, true);
  });

  it('specs-merged 负向：存在 delta specs 且未 merge → fail', () => {
    const fix = closingFixture(); // specs 含 ## ADDED Requirements，spec_merged 默认 false
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'specs-merged').pass, false);
  });

  it('compound-captured 正向：compound_skipped=true → pass', () => {
    const fix = closingFixture();
    stateSet(fix.changeDir, 'compound_skipped', 'true');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'compound-captured').pass, true);
  });

  it('compound-captured 负向：无 learnings 且未 skip → fail', () => {
    const fix = closingFixture();
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'compound-captured').pass, false);
  });

  it('execution-plan-ready 负向：无执行计划 → fail', () => {
    const fix = closingFixture();
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'execution-plan-ready').pass, false);
  });
});

// ── test-matrix-complete（v0.12，4 豁免分支）────────────────────────────────
function contractWithMatrixSection(dir) {
  writeFileSync(join(dir, 'execution-contract.md'),
    '# Execution Contract\n\n## Intent Lock\nAdd policy.\n\n## Test Matrix\nSee test-matrix.md.\n');
}

// v0.13 §48 重写：豁免键由 contract 内容改为 state schema_version。
// 原 v0.12 四分支中"契约无 Test Matrix 段 → pass"与"无契约 → pass"两条内容型豁免
// 仅对 legacy change（无 schema_version 打戳）保留；非存量 change 一律考核。
describe('T1 guard: test-matrix-complete（v0.13 §48 六步判定）', () => {
  it('豁免1 legacy：无 schema_version 打戳（存量 change）→ pass', () => {
    const fix = closingFixture(); // makeChange 经 init 打戳，此处移除打戳降级为 legacy
    dropStateField(fix.changeDir, 'schema_version');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, true, JSON.stringify(dim(r.checks, 'test-matrix-complete').failures));
  });

  it('豁免2 显式 skip + 理由 → pass', () => {
    const fix = closingFixture();
    stateSet(fix.changeDir, 'test_matrix_skipped', 'true');
    stateSet(fix.changeDir, 'test_matrix_skip_reason', 'pure config change');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, true);
  });

  it('负向：skip 无理由 → fail（可审计豁免要求留痕）', () => {
    const fix = closingFixture();
    stateSet(fix.changeDir, 'test_matrix_skipped', 'true');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, false);
    assert.match(dim(r.checks, 'test-matrix-complete').failures.join(' '), /skip_reason/i);
  });

  it('负向：非存量契约无 Test Matrix 段 → fail（v0.12 内容型豁免已删除）', () => {
    const fix = closingFixture(); // writeContract 写的是无 Test Matrix 段的契约
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, false);
    assert.match(dim(r.checks, 'test-matrix-complete').failures.join(' '), /declare ## Test Matrix/i);
  });

  it('负向：非存量无契约 → fail', () => {
    const fix = track(makeChange({ state: 'executing', artifacts: true, contract: false }));
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, false);
  });

  it('负向：契约含 Test Matrix 段但缺 test-matrix.md → fail', () => {
    const fix = closingFixture();
    contractWithMatrixSection(fix.changeDir);
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, false);
    assert.match(dim(r.checks, 'test-matrix-complete').failures.join(' '), /missing/i);
  });

  it('负向：test-matrix.md 为空 → fail', () => {
    const fix = closingFixture();
    contractWithMatrixSection(fix.changeDir);
    writeFileSync(join(fix.changeDir, 'test-matrix.md'), '   \n');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, false);
    assert.match(dim(r.checks, 'test-matrix-complete').failures.join(' '), /empty/i);
  });

  it('负向：矩阵存在但未 rebuild（hash 为 null）→ fail（v0.13 删除空值短路）', () => {
    const fix = closingFixture();
    contractWithMatrixSection(fix.changeDir);
    writeFileSync(join(fix.changeDir, 'test-matrix.md'), '# Test Matrix\n\n## Summary\n- Total cases: 3\n');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, false);
    assert.match(dim(r.checks, 'test-matrix-complete').failures.join(' '), /rebuild/i);
  });

  it('正向：test-matrix.md 非空 + hash 一致（rebuild）→ pass', () => {
    const fix = closingFixture();
    contractWithMatrixSection(fix.changeDir);
    writeFileSync(join(fix.changeDir, 'test-matrix.md'), '# Test Matrix\n\n## Summary\n- Total cases: 3\n\n## Cases\n| case_id | behavior |\n');
    // rebuild 重算并写入 test_matrix_hash，使其与当前 test-matrix.md 一致
    const rr = tf(`state rebuild ${shellQuote(fix.changeDir)}`);
    assert.equal(rr.exitCode, 0, `rebuild 应成功: ${rr.stderr}`);
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, true, JSON.stringify(dim(r.checks, 'test-matrix-complete').failures));
  });

  it('负向：hash 记录后篡改 test-matrix.md → 漂移 → fail', () => {
    const fix = closingFixture();
    contractWithMatrixSection(fix.changeDir);
    writeFileSync(join(fix.changeDir, 'test-matrix.md'), '# Test Matrix\n\n## Summary\n- Total cases: 3\n');
    assert.equal(tf(`state rebuild ${shellQuote(fix.changeDir)}`).exitCode, 0);
    appendFileSync(join(fix.changeDir, 'test-matrix.md'), '\n## Cases\n| case_id | behavior |\n| c1 | added later |\n');
    const r = guardCheck(fix.changeDir, 'executing', 'closing');
    assert.equal(dim(r.checks, 'test-matrix-complete').pass, false);
    assert.match(dim(r.checks, 'test-matrix-complete').failures.join(' '), /modified|hash/i);
  });
});

// ── test-matrix-ready（v0.13 §49 门禁前移：approved-for-build → executing）────
describe('T1 guard: test-matrix-ready（v0.13 §49 门禁前移）', () => {
  it('维度挂载：full approved-for-build→executing 检查清单含 test-matrix-ready', () => {
    const fix = track(makeChange({ state: 'approved-for-build', artifacts: true, contract: true }));
    const r = guardCheck(fix.changeDir, 'approved-for-build', 'executing');
    assert.ok(r.checks.some(c => c.dimension === 'test-matrix-ready'), `应含 test-matrix-ready，实际: ${r.checks.map(c => c.dimension).join(',')}`);
  });

  it('负向：非存量无矩阵 → fail（开工前阻断，附两条出路引导）', () => {
    const fix = track(makeChange({ state: 'approved-for-build', artifacts: true, contract: true }));
    const r = guardCheck(fix.changeDir, 'approved-for-build', 'executing');
    const d = dim(r.checks, 'test-matrix-ready');
    assert.equal(d.pass, false);
    assert.match(d.failures.join(' '), /Test Matrix/);
    assert.match(d.failures.join(' '), /skip/i);
  });

  it('正向：契约声明 + test-matrix.md 非空 → pass', () => {
    const fix = track(makeChange({ state: 'approved-for-build', artifacts: true, contract: true }));
    contractWithMatrixSection(fix.changeDir);
    writeFileSync(join(fix.changeDir, 'test-matrix.md'), '# Test Matrix\n\n## Summary\n- Total cases: 2\n');
    const r = guardCheck(fix.changeDir, 'approved-for-build', 'executing');
    assert.equal(dim(r.checks, 'test-matrix-ready').pass, true, JSON.stringify(dim(r.checks, 'test-matrix-ready').failures));
  });

  it('正向：显式 skip + 理由 → pass', () => {
    const fix = track(makeChange({ state: 'approved-for-build', artifacts: true, contract: true }));
    stateSet(fix.changeDir, 'test_matrix_skipped', 'true');
    stateSet(fix.changeDir, 'test_matrix_skip_reason', 'hotfix-style tweak within full workflow');
    const r = guardCheck(fix.changeDir, 'approved-for-build', 'executing');
    assert.equal(dim(r.checks, 'test-matrix-ready').pass, true);
  });

  it('正向：legacy（无 schema_version）→ pass', () => {
    const fix = track(makeChange({ state: 'approved-for-build', artifacts: true, contract: true }));
    dropStateField(fix.changeDir, 'schema_version');
    const r = guardCheck(fix.changeDir, 'approved-for-build', 'executing');
    assert.equal(dim(r.checks, 'test-matrix-ready').pass, true);
  });

  it('豁免体系：hotfix/tweak 入口不挂 test-matrix-ready', () => {
    const fix = track(makeChange({ state: 'approved-for-build', workflow: 'tweak', artifacts: true, contract: true }));
    const r = guardCheck(fix.changeDir, 'approved-for-build', 'executing', { workflow: 'tweak' });
    assert.ok(!r.checks.some(c => c.dimension === 'test-matrix-ready'), 'tweak 不应挂 test-matrix-ready');
  });
});

// ── hotfix：dp3-approved + contract-current ─────────────────────────────────
describe('T1 guard: hotfix 维度', () => {
  it('dp3-approved 正向：dp_3_result 以 approved 开头 → pass', () => {
    const fix = track(makeChange({ state: 'bridging', workflow: 'hotfix', artifacts: true, contract: true, set: { dp_3_result: 'approved: hotfix' } }));
    const r = guardCheck(fix.changeDir, 'bridging', 'approved-for-build', { workflow: 'hotfix' });
    assert.equal(dim(r.checks, 'dp3-approved').pass, true);
  });

  it('dp3-approved 负向：dp_3_result 非 approved → fail', () => {
    const fix = track(makeChange({ state: 'bridging', workflow: 'hotfix', artifacts: true, contract: true, set: { dp_3_result: 'pending: x' } }));
    const r = guardCheck(fix.changeDir, 'bridging', 'approved-for-build', { workflow: 'hotfix' });
    assert.equal(dim(r.checks, 'dp3-approved').pass, false);
  });
});
