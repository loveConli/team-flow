// tests/lib/guard-arch-gates.test.mjs — arch-readiness / arch-snapshot 门禁测试（v0.36.3）
// 覆盖：legacy 豁免 / skip 物化限定最新迭代 / 快照存在 / 缺失 FAIL / v10 数字排序。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkArchReadiness } from '../../scripts/guard/checks/arch-readiness.mjs';
import { checkArchSnapshot } from '../../scripts/guard/checks/arch-snapshot.mjs';

function makeProject({ archBaseline, snapshot, skipped } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-gate-test-'));
  fs.mkdirSync(path.join(root, '.team-flow'), { recursive: true });
  if (archBaseline) {
    fs.writeFileSync(path.join(root, '.team-flow', 'arch-state.json'),
      JSON.stringify({ arch_baseline: 'v0', mode: 'design' }));
  }
  const iter = path.join(root, 'docs', 'architecture', 'iterations', 'v1');
  fs.mkdirSync(iter, { recursive: true });
  if (snapshot) fs.writeFileSync(path.join(iter, 'architecture.md'), '# 快照');
  if (skipped) fs.writeFileSync(path.join(iter, 'SKIPPED'), 'skipped: 迭代无结构性变更');
  const change = path.join(root, 'changes', 'v1-C1');
  fs.mkdirSync(change, { recursive: true });
  return { root, change };
}

test('legacy 豁免：无 arch-state.json → arch-readiness PASS+WARN', () => {
  const { root, change } = makeProject({ snapshot: true });
  const result = checkArchReadiness(change);
  assert.equal(result.pass, true);
  assert.equal(result.failures.length, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

test('快照存在：arch_baseline 打戳 + 快照 → PASS', () => {
  const { root, change } = makeProject({ archBaseline: true, snapshot: true });
  assert.equal(checkArchReadiness(change).pass, true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('skip 物化：最新迭代 SKIPPED → PASS', () => {
  const { root, change } = makeProject({ archBaseline: true, skipped: true });
  assert.equal(checkArchReadiness(change).pass, true);
  fs.rmSync(root, { recursive: true, force: true });
});

test('缺失 FAIL：arch_baseline 打戳但无快照无 skip → FAIL 引导回 ARCH', () => {
  const { root, change } = makeProject({ archBaseline: true });
  const result = checkArchReadiness(change);
  assert.equal(result.pass, false);
  assert.match(result.failures[0], /iterations/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('skip 限定最新迭代：旧迭代 SKIPPED 不豁免新迭代（v0.36.3 修复）', () => {
  const { root, change } = makeProject({ archBaseline: true });
  // v1 有 SKIPPED（旧），v2 空（新迭代，无快照无 skip）→ 应 FAIL
  fs.writeFileSync(path.join(root, 'docs', 'architecture', 'iterations', 'v1', 'SKIPPED'), 'old');
  fs.mkdirSync(path.join(root, 'docs', 'architecture', 'iterations', 'v2'), { recursive: true });
  const result = checkArchReadiness(change);
  assert.equal(result.pass, false, '旧迭代 SKIPPED 不得豁免新迭代');
  fs.rmSync(root, { recursive: true, force: true });
});

test('数字排序：v10 是最新迭代（v0.36.3 修复字典序 bug）', () => {
  const { root, change } = makeProject({ archBaseline: true });
  // v9 有快照，v10 空 → 最新 v10 无快照应 FAIL；字典序会把 v9 当最新误 PASS
  const v9 = path.join(root, 'docs', 'architecture', 'iterations', 'v9');
  fs.mkdirSync(v9, { recursive: true });
  fs.writeFileSync(path.join(v9, 'architecture.md'), '# v9');
  fs.mkdirSync(path.join(root, 'docs', 'architecture', 'iterations', 'v10'), { recursive: true });
  const result = checkArchReadiness(change);
  assert.equal(result.pass, false, 'v10 是最新迭代，无快照应 FAIL');
  fs.rmSync(root, { recursive: true, force: true });
});

test('arch-snapshot 同语义：legacy 豁免 / 快照 PASS', () => {
  const legacy = makeProject({ snapshot: true });
  assert.equal(checkArchSnapshot(legacy.change).pass, true);
  const done = makeProject({ archBaseline: true, snapshot: true });
  assert.equal(checkArchSnapshot(done.change).pass, true);
  fs.rmSync(legacy.root, { recursive: true, force: true });
  fs.rmSync(done.root, { recursive: true, force: true });
});
