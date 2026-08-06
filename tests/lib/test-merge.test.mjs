// tests/lib/test-merge.mjs
// v0.38.0：tf test-merge 复利回写逻辑单元测试。
// 覆盖 feedback 2026-08-05 修复：
//   - resolveDeferred 误删 Current Cases（全文件 regex → 仅 Deferred Items 段）
//   - extractSummary 遇 markdown bold（**87**）返回 0 → 容忍 bold + E2E cases 行
//   - mergeExistingBaseline startsWith('') 恒真 → 覆盖式语义（旧行不累积）
//   - filter(Boolean) 丢空列错位 → slice(1,-1) 保留空列
//   - dry-run 真正跳过写盘
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  extractSummary,
  mergeBaselines,
  createNewBaseline,
  mergeExistingBaseline,
  resolveDeferred,
  rewriteIndex,
} from '../../scripts/lib/test-merge.mjs';

function tmpDir(prefix = 'tf-test-merge-') {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return dir;
}

const STANDARD_12COL = '| case_id | behavior | design_method | input | expected | test_kind | test_tier | mock | work_mode | test_file | test_method_name | run_command |';

// ── extractSummary ──────────────────────────────────────────────────────────

describe('extractSummary', () => {
  it('普通数字格式', () => {
    const s = extractSummary([
      '- Total cases: 87',
      '- Modules covered: 13',
      '- Unit cases: 82',
      '- Integration cases: 5',
      '- E2E cases: 3',
      '- Deferred items: 2',
    ].join('\n'));
    assert.deepEqual(s, { totalCases: 87, modules: 13, unitCases: 82, integrationCases: 5, e2eCases: 3, deferred: 2 });
  });

  it('markdown bold（**87**）——C1 矩阵 LLM 手写加粗，原实现返回 0', () => {
    const s = extractSummary([
      '- Total cases: **87**',
      '- Modules covered: **13**',
      '- Unit cases: **82**',
      '- Integration cases: **5**',
      '- E2E cases: **3**',
      '- Deferred items: **2**',
    ].join('\n'));
    assert.deepEqual(s, { totalCases: 87, modules: 13, unitCases: 82, integrationCases: 5, e2eCases: 3, deferred: 2 });
  });

  it('无 Summary 行 → 全 0（不抛异常）', () => {
    const s = extractSummary('# Test Matrix\n## Cases');
    assert.deepEqual(s, { totalCases: 0, modules: 0, unitCases: 0, integrationCases: 0, e2eCases: 0, deferred: 0 });
  });
});

// ── createNewBaseline：空列（mock）列位正确 ───────────────────────────────

describe('createNewBaseline', () => {
  it('mock 列为空时后续列位不左移（slice(1,-1) 保留空列）', () => {
    const section = [
      '### Foo',
      STANDARD_12COL,
      '|---|---|---|---|---|---|---|---|---|---|---|---|',
      '| foo-new-001 | 正常 | equivalence | x | y | pure_unit | unit | mockito | TDD | FooTest | new_001 | mvn test |',
      '| foo-new-002 | 空 mock | equivalence | x | y | pure_unit | unit | | TDD | FooTest | new_002 | mvn test |',
    ].join('\n');
    const out = createNewBaseline('Foo', section, 'C1', '2026-08-05', [], []);
    const row002 = out.split('\n').find(l => l.includes('foo-new-002'));
    assert.ok(row002, 'foo-new-002 行存在');
    // 期望：| case_id | behavior | design_method | test_kind | test_tier | work_mode | test_file | test_method_name | source_change |
    // 空 mock 列（cells[7]）不导致 work_mode（cells[8]）错位
    assert.ok(row002.includes('| unit | TDD | FooTest | new_002 |'), `work_mode/test_file/test_method_name 列位正确，实际: ${row002}`);
  });
});

// ── mergeExistingBaseline：覆盖式 + 幂等 ───────────────────────────────────

describe('mergeExistingBaseline', () => {
  const existing = [
    '# Foo Test Baseline',
    '> schema_version: 1',
    '> last_updated_by_change: C1',
    '> last_updated: 2026-08-01',
    '',
    '## Current Cases（当前态 — 覆盖式）',
    '',
    '| case_id | behavior | design_method | test_kind | test_tier | work_mode | test_file | test_method_name | source_change |',
    '|---|---|---|---|---|---|---|---|---|',
    '| foo-old-001 | 旧行为 | equivalence | unit | unit | TDD | FooTest | old_001 | C1 |',
    '',
    '## Evolution Log（append-only）',
    '',
    '- **2026-08-01** [C1]: 新增 1 case, defer 0',
  ].join('\n');

  const section = [
    '### Foo',
    STANDARD_12COL,
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    '| foo-new-001 | 新行为 | boundary | x | y | pure_unit | unit | mockito | TDD | FooTest | new_001 | mvn test |',
    '| foo-new-002 | 空 mock | equivalence | x | y | pure_unit | unit | | TDD | FooTest | new_002 | mvn test |',
  ].join('\n');

  it('Current Cases 覆盖式：旧 case 行被替换、不累积', () => {
    const updated = mergeExistingBaseline(existing, section, 'C2', '2026-08-05', [], []);
    assert.ok(updated.includes('foo-new-001'), '新 case 行存在');
    assert.ok(updated.includes('foo-new-002'), '新 case 行存在');
    assert.ok(!updated.includes('foo-old-001'), '旧 case 行被替换（覆盖式）');
    assert.ok(updated.includes('## Evolution Log'), 'Evolution Log 段保留');
  });

  it('Evolution Log 幂等：同 change 同日重复 merge 不重复 append', () => {
    const once = mergeExistingBaseline(existing, section, 'C2', '2026-08-05', [], []);
    const twice = mergeExistingBaseline(once, section, 'C2', '2026-08-05', [], []);
    const count = (twice.match(/\*\*2026-08-05\*\* \[C2\]:/g) || []).length;
    assert.equal(count, 1, `C2 2026-08-05 条目只应 1 条，实际 ${count}`);
  });

  it('不同 change 同日仍追加各自条目', () => {
    const once = mergeExistingBaseline(existing, section, 'C2', '2026-08-05', [], []);
    const twice = mergeExistingBaseline(once, section, 'C3', '2026-08-05', [], []);
    assert.ok(twice.includes('**2026-08-05** [C2]:'), 'C2 条目存在');
    assert.ok(twice.includes('**2026-08-05** [C3]:'), 'C3 条目追加');
  });
});

// ── resolveDeferred：只删 Deferred Items 段（不误删 Current Cases）─────────

describe('resolveDeferred', () => {
  it('被新 case 覆盖的 deferred 行删除，Current Cases 正常 case 行保留', () => {
    const dir = tmpDir();
    const baselinesDir = join(dir, 'baselines');
    mkdirSync(baselinesDir, { recursive: true });
    const baseline = [
      '# Foo Test Baseline',
      '> last_updated_by_change: C1',
      '',
      '## Current Cases（当前态 — 覆盖式）',
      '',
      '| case_id | behavior | design_method | test_kind | test_tier | work_mode | test_file | test_method_name | source_change |',
      '|---|---|---|---|---|---|---|---|---|',
      '| foo-cas-001 | 正常 case | equivalence | unit | unit | TDD | FooTest | cas_001 | C1 |',
      '',
      '## Deferred Items',
      '',
      '| case_id | behavior | design_method | reason | deferred_since |',
      '|---|---|---|---|---|',
      '| foo-def-001 | 延迟 case | concurrency | 本期不实现 | 2026-08-01 |',
    ].join('\n');
    writeFileSync(join(baselinesDir, 'foo.md'), baseline, 'utf-8');

    // newCaseIds：含正常 case（在 Current Cases 中）+ 被解决的 deferred
    const r = resolveDeferred(dir, 'C2', ['foo-cas-001', 'foo-def-001']);
    assert.equal(r.resolved, 1, '只应解决 1 个 deferred');
    const out = readFileSync(join(baselinesDir, 'foo.md'), 'utf-8');
    assert.ok(out.includes('foo-cas-001'), 'Current Cases 正常 case 行保留（不误删）');
    assert.ok(!out.includes('foo-def-001'), 'Deferred 被覆盖行删除');
    rmSync(dir, { recursive: true, force: true });
  });

  it('dry-run 不写盘', () => {
    const dir = tmpDir();
    const baselinesDir = join(dir, 'baselines');
    mkdirSync(baselinesDir, { recursive: true });
    const baseline = [
      '## Deferred Items',
      '| foo-def-001 | 延迟 | concurrency | 理由 | 2026-08-01 |',
    ].join('\n');
    writeFileSync(join(baselinesDir, 'foo.md'), baseline, 'utf-8');
    const before = readFileSync(join(baselinesDir, 'foo.md'), 'utf-8');

    const r = resolveDeferred(dir, 'C2', ['foo-def-001'], true);
    assert.equal(r.resolved, 1, 'dry-run 仍报告将解决的数量');
    const after = readFileSync(join(baselinesDir, 'foo.md'), 'utf-8');
    assert.equal(after, before, 'dry-run 不写盘');
    rmSync(dir, { recursive: true, force: true });
  });
});

// ── dry-run 全链路不写盘 + E2E 复利 ────────────────────────────────────────

describe('mergeBaselines / rewriteIndex', () => {
  // case_id 用 {Module}-e2e-{scene}-{NNN}（3 连字符 + 数字结尾），满足 rewriteIndex 计数 regex
  const section = [
    '### Foo',
    STANDARD_12COL,
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    '| foo-e2e-check-001 | 端到端 | equivalence | x | y | playwright_integration | e2e | - | E2E | e2e/foo.spec.ts | foo_e2e | npx playwright test |',
  ].join('\n');

  it('dry-run：mergeBaselines 不创建 baseline 文件', () => {
    const dir = tmpDir();
    const r = mergeBaselines(dir, 'C1', { Foo: section }, [], [], true);
    assert.deepEqual(r, { Foo: 'would-create' });
    assert.ok(!existsSync(join(dir, 'baselines', 'foo.md')), 'dry-run 不写 baseline');
    rmSync(dir, { recursive: true, force: true });
  });

  it('E2E case（test_tier=e2e）进入 baseline 且 rewriteIndex 统计 e2e 层级', () => {
    const dir = tmpDir();
    const r = mergeBaselines(dir, 'C1', { Foo: section }, [], [], false);
    assert.deepEqual(r, { Foo: 'created' });
    const baseline = readFileSync(join(dir, 'baselines', 'foo.md'), 'utf-8');
    assert.ok(baseline.includes('foo-e2e-check-001'), 'E2E case 进入 baseline');
    assert.ok(baseline.includes('| e2e |'), 'test_tier=e2e 列保留');

    const idx = rewriteIndex(dir);
    assert.equal(idx.totalCases, 1);
    const index = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    assert.ok(/e2e:\d+/.test(index), `INDEX 出现 e2e 统计维度，实际: ${index.match(/unit:.*/)?.[0]}`);
    rmSync(dir, { recursive: true, force: true });
  });
});
