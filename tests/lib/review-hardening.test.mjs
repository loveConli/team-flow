// tests/lib/review-hardening.test.mjs
// v0.13 §51：execution review 硬化——禁止 base==head 空 diff review + receipt 测试统计证据字段。
// C1-domain-policy 现场曾出现 6 个 receipt 全部 base==head==初始 commit（对空 diff review）。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', '..', 'scripts', 'team-flow.mjs');

function runGit(directory, args) {
  return execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
}

function tf(args) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (e) {
    return { exitCode: e.status ?? 1, stdout: e.stdout?.toString().trim() ?? '', stderr: (e.stderr?.toString() ?? e.message).trim() };
  }
}

describe('v0.13 §51: execution review 硬化', () => {
  let dir;
  let base;
  let head;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'tf-review-hardening-'));
    mkdirSync(join(dir, 'specs', 'cap'), { recursive: true });
    writeFileSync(join(dir, 'proposal.md'), '## Why\nReview hardening fixture proposal with enough content.\n## What Changes\n- Add X');
    writeFileSync(join(dir, 'design.md'), '## Context\nx\n## Decisions\n### D1\n- Choice: A\n- Rationale: B');
    writeFileSync(join(dir, 'tasks.md'), '## Tasks\n- [x] 1.1 task');
    writeFileSync(join(dir, 'specs', 'cap', 'spec.md'), '## ADDED Requirements\n\n### Requirement: R\nThe system SHALL x.\n\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n');
    writeFileSync(join(dir, 'execution-contract.md'), '# Contract\n\n## Intent Lock\nx\n');
    // git：两个 commit，base=HEAD~1，head=HEAD（合法非空区间）
    runGit(dir, ['init', '--quiet']);
    runGit(dir, ['config', 'user.email', 'tests@example.invalid']);
    runGit(dir, ['config', 'user.name', 'Review Hardening Test']);
    runGit(dir, ['add', '--all']);
    runGit(dir, ['commit', '--quiet', '--message', 'initial']);
    base = runGit(dir, ['rev-parse', 'HEAD']);
    writeFileSync(join(dir, 'marker.txt'), 'second\n');
    runGit(dir, ['add', 'marker.txt']);
    runGit(dir, ['commit', '--quiet', '--message', 'second']);
    head = runGit(dir, ['rev-parse', 'HEAD']);
    // 执行计划（review 前置）
    tf(['state', 'init', dir]);
    tf(['execution', 'recommend', dir, '--wave', 'w1:serial:1.1']);
    const plan = tf(['execution', 'plan', dir, '--mode', 'sdd', '--confirm', '--acknowledge-recommendation',
      '--reason', 'review hardening fixture', '--wave', 'w1:serial:1.1']);
    assert.equal(plan.exitCode, 0, plan.stderr);
  });

  after(() => { if (existsSync(dir)) rmSync(dir, { recursive: true, force: true }); });

  function review(extraArgs = []) {
    const reportDir = join(dir, '.superpowers', 'sdd', 'reviews');
    mkdirSync(reportDir, { recursive: true });
    const report = join(reportDir, `w1-${Date.now()}.md`);
    writeFileSync(report, 'review report\n');
    return tf(['execution', 'review', dir, '--wave', 'w1', '--report', report, '--verdict', 'pass', ...extraArgs]);
  }

  it('§51.1 base==head（空 diff review）被拒', () => {
    const r = review(['--base', head, '--head', head]);
    assert.equal(r.exitCode, 1, 'base==head 应被拒');
    assert.match(r.stderr, /base must differ from head/i);
  });

  it('合法非空区间 + 测试统计 → receipt 持久化 tests 字段', () => {
    const r = review(['--base', base, '--head', head, '--tests-total', '12', '--tests-passed', '11', '--tests-failed', '1']);
    assert.equal(r.exitCode, 0, r.stderr);
    const receiptRaw = readFileSync(join(dir, '.superpowers', 'sdd', 'reviews', Buffer.from('w1').toString('base64url') + '.json'), 'utf-8');
    const receipt = JSON.parse(receiptRaw);
    assert.deepEqual(receipt.tests, { total: 12, passed: 11, failed: 1 });
  });

  it('测试统计三参数必须同时提供', () => {
    const r = review(['--base', base, '--head', head, '--tests-total', '5']);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /together/);
  });

  it('测试统计必须为非负整数', () => {
    const r = review(['--base', base, '--head', head, '--tests-total', 'x', '--tests-passed', '0', '--tests-failed', '0']);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /non-negative integer/);
  });
});
