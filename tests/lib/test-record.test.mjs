// tests/lib/test-record.test.mjs
// v0.13 §50：tf test record 解析器与 CLI 行为（tests-passing 程序化证据链）。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  parseMavenSurefire,
  parseSurefireReportDir,
  parseJest,
  parsePytest,
  detectRunner,
} from '../../scripts/lib/test-record.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', '..', 'scripts', 'team-flow.mjs');

// ── 解析器单元 ──────────────────────────────────────────────────────────────

describe('test-record parsers', () => {
  it('maven-surefire：单模块汇总行', () => {
    const s = parseMavenSurefire('[INFO] Tests run: 42, Failures: 0, Errors: 0, Skipped: 2');
    assert.deepEqual(s, { total: 42, passed: 40, failed: 0, skipped: 2 });
  });

  it('maven-surefire：多模块累加（Failures+Errors 合并为 failed）', () => {
    const text = [
      '[INFO] Tests run: 10, Failures: 1, Errors: 1, Skipped: 0',
      '[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 1',
    ].join('\n');
    const s = parseMavenSurefire(text);
    assert.deepEqual(s, { total: 15, passed: 12, failed: 2, skipped: 1 });
  });

  it('maven-surefire：无汇总行 → null', () => {
    assert.equal(parseMavenSurefire('[INFO] BUILD SUCCESS'), null);
  });

  it('surefire XML 报告目录：累加 <testsuite> 属性', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tf-surefire-xml-'));
    try {
      writeFileSync(join(dir, 'TEST-a.xml'),
        '<testsuite name="A" tests="7" failures="1" errors="0" skipped="1"></testsuite>');
      writeFileSync(join(dir, 'TEST-b.xml'),
        '<testsuite name="B" tests="3" failures="0" errors="1" skipped="0"></testsuite>');
      writeFileSync(join(dir, 'ignored.txt'), 'not xml');
      const s = parseSurefireReportDir(dir);
      assert.deepEqual(s, { total: 10, passed: 7, failed: 2, skipped: 1 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('jest：--json 输出', () => {
    const s = parseJest(JSON.stringify({
      numTotalTests: 20, numPassedTests: 17, numFailedTests: 2, numPendingTests: 1, numTodoTests: 0,
    }));
    assert.deepEqual(s, { total: 20, passed: 17, failed: 2, skipped: 1 });
  });

  it('jest：非 jest JSON → null', () => {
    assert.equal(parseJest('{"foo": 1}'), null);
    assert.equal(parseJest('not json'), null);
  });

  it('pytest：terminal summary', () => {
    const s = parsePytest('collected 8 items\n...\n===== 5 passed, 2 failed, 1 skipped in 3.21s =====');
    assert.deepEqual(s, { total: 8, passed: 5, failed: 2, skipped: 1 });
  });

  it('pytest：errors 计入 failed；no tests ran → total=0', () => {
    const s = parsePytest('===== 1 passed, 2 errors in 0.5s =====');
    assert.equal(s.failed, 2);
    const none = parsePytest('===== no tests ran in 0.1s =====');
    assert.deepEqual(none, { total: 0, passed: 0, failed: 0, skipped: 0 });
  });

  it('detectRunner：按内容特征自动识别', () => {
    assert.equal(detectRunner('Tests run: 3, Failures: 0, Errors: 0, Skipped: 0'), 'maven-surefire');
    assert.equal(detectRunner(JSON.stringify({ numTotalTests: 1, numPassedTests: 1 })), 'jest');
    assert.equal(detectRunner('===== 2 passed in 0.3s ====='), 'pytest');
    assert.equal(detectRunner('hello world'), null);
  });
});

// ── CLI 端到端 ──────────────────────────────────────────────────────────────

function tf(args) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (e) {
    return { exitCode: e.status ?? 1, stdout: e.stdout?.toString().trim() ?? '', stderr: (e.stderr?.toString() ?? e.message).trim() };
  }
}

describe('tf test record CLI（v0.13 §50）', () => {
  let dir;
  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'tf-test-record-'));
    writeFileSync(join(dir, 'proposal.md'), '## Why\nTest record fixture proposal with enough content.\n## What Changes\n- Add X');
    tf(['state', 'init', dir]);
  });
  after(() => { if (existsSync(dir)) rmSync(dir, { recursive: true, force: true }); });

  it('pass 结果：写入结构化 test_result + 证据文件落盘 + exit 0', () => {
    const out = join(dir, 'mvn-pass.txt');
    writeFileSync(out, '[INFO] Tests run: 9, Failures: 0, Errors: 0, Skipped: 1\n');
    const r = tf(['test', 'record', dir, '--from', out]);
    assert.equal(r.exitCode, 0, r.stderr);
    const state = readFileSync(join(dir, '.team-flow.yaml'), 'utf-8');
    assert.match(state, /test_result: pass: total=9 passed=8 failed=0 skipped=1 runner=maven-surefire recorded-by=tf-test-record/);
    const evidenceMatch = state.match(/test_evidence_path: (\S+)/);
    assert.ok(evidenceMatch, 'test_evidence_path 应落盘');
    assert.ok(existsSync(join(dir, evidenceMatch[1])), '证据文件应存在');
    assert.match(readFileSync(join(dir, evidenceMatch[1]), 'utf-8'), /Tests run: 9/);
  });

  it('fail 结果：test_result 记为 fail 前缀 + exit 1', () => {
    const out = join(dir, 'mvn-fail.txt');
    writeFileSync(out, 'Tests run: 4, Failures: 2, Errors: 0, Skipped: 0');
    const r = tf(['test', 'record', dir, '--from', out]);
    assert.equal(r.exitCode, 1);
    const state = readFileSync(join(dir, '.team-flow.yaml'), 'utf-8');
    assert.match(state, /test_result: fail: total=4 passed=2 failed=2/);
  });

  it('total=0：记为 fail（空真拒绝）', () => {
    const out = join(dir, 'mvn-zero.txt');
    writeFileSync(out, 'Tests run: 0, Failures: 0, Errors: 0, Skipped: 0');
    const r = tf(['test', 'record', dir, '--from', out]);
    assert.equal(r.exitCode, 1);
    assert.match(readFileSync(join(dir, '.team-flow.yaml'), 'utf-8'), /test_result: fail: total=0/);
  });

  it('无法识别的 runner 输出：拒绝并引导显式 skip（无手工通道）', () => {
    const out = join(dir, 'unknown.txt');
    writeFileSync(out, 'everything looks fine, trust me');
    const r = tf(['test', 'record', dir, '--from', out]);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /auto-detect|Supported runners/i);
    assert.match(r.stderr, /test_matrix_skipped/);
  });

  it('目录输入仅支持 surefire XML', () => {
    const xmlDir = join(dir, 'surefire-reports');
    mkdirSync(xmlDir, { recursive: true });
    writeFileSync(join(xmlDir, 'TEST-x.xml'), '<testsuite tests="2" failures="0" errors="0" skipped="0"></testsuite>');
    const ok = tf(['test', 'record', dir, '--from', xmlDir]);
    assert.equal(ok.exitCode, 0, ok.stderr);
    assert.match(readFileSync(join(dir, '.team-flow.yaml'), 'utf-8'), /test_result: pass: total=2/);
    const bad = tf(['test', 'record', dir, '--from', xmlDir, '--runner', 'jest']);
    assert.equal(bad.exitCode, 1);
  });

  it('缺 --from / 未知子命令 → 用法错误 exit 2', () => {
    assert.equal(tf(['test', 'record', dir]).exitCode, 2);
    assert.equal(tf(['test', 'unknown', dir]).exitCode, 2);
  });
});
