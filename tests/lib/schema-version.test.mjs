// tests/lib/schema-version.test.mjs
// v0.13 §48.1：schema_version 打戳语义——测试门禁存量豁免键的不可污染性。
// 规则：① 仅 tf state init 在 change 创建（状态文件尚不存在）时打戳；
//       ② 对已有状态文件的目录重新 init 不追加（存量不被追溯收紧）；
//       ③ rebuild/writeState 不追加；④ 不可经 tf state set 手工设置。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', '..', 'scripts', 'team-flow.mjs');

function tf(args) {
  try {
    const stdout = execFileSync('node', [CLI, ...args], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 });
    return { exitCode: 0, stdout: stdout.trim(), stderr: '' };
  } catch (e) {
    return { exitCode: e.status ?? 1, stdout: e.stdout?.toString().trim() ?? '', stderr: (e.stderr?.toString() ?? e.message).trim() };
  }
}

function hasSchemaVersionField(dir) {
  return /^schema_version:/m.test(readFileSync(join(dir, '.team-flow.yaml'), 'utf-8'));
}

describe('v0.13 §48.1: schema_version 打戳语义', () => {
  let root;
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'tf-schema-version-'));
  });
  after(() => { if (existsSync(root)) rmSync(root, { recursive: true, force: true }); });

  function freshChange(name) {
    const dir = join(root, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'proposal.md'), '## Why\nSchema version fixture proposal with enough content.\n## What Changes\n- Add X');
    return dir;
  }

  it('新建 change：init 打戳 schema_version: 1', () => {
    const dir = freshChange('new-change');
    const r = tf(['state', 'init', dir]);
    assert.equal(r.exitCode, 0, r.stderr);
    assert.ok(hasSchemaVersionField(dir), '新建 change 应有 schema_version');
    assert.match(readFileSync(join(dir, '.team-flow.yaml'), 'utf-8'), /^schema_version: 1$/m);
    // json 输出也带回
    const dir2 = freshChange('new-change-json');
    const rj = tf(['state', 'init', dir2, '--json']);
    assert.equal(JSON.parse(rj.stdout).schema_version, 1);
  });

  it('已有状态文件再 init：不追加打戳（存量豁免键不可追溯污染）', () => {
    const dir = freshChange('legacy-change');
    // 模拟 v0.31 时代创建的 change：手写状态文件，无 schema_version
    writeFileSync(join(dir, '.team-flow.yaml'), 'state: executing\nworkflow: full\nchange_name: legacy-change\n');
    const r = tf(['state', 'init', dir]);
    assert.equal(r.exitCode, 0, r.stderr);
    assert.equal(hasSchemaVersionField(dir), false, '再 init 不得给存量 change 补打戳');
  });

  it('rebuild 不追加打戳（legacy 保持 legacy）', () => {
    const dir = freshChange('legacy-rebuild');
    writeFileSync(join(dir, '.team-flow.yaml'), 'state: executing\nworkflow: full\nchange_name: legacy-rebuild\n');
    const r = tf(['state', 'rebuild', dir]);
    assert.equal(r.exitCode, 0, r.stderr);
    assert.equal(hasSchemaVersionField(dir), false, 'rebuild 不得补打戳');
  });

  it('已打戳 change：后续 writeState（set 其他字段）保留 schema_version', () => {
    const dir = freshChange('stamped-keep');
    tf(['state', 'init', dir]);
    const r = tf(['state', 'set', dir, 'compound_skipped', 'true']);
    assert.equal(r.exitCode, 0, r.stderr);
    assert.match(readFileSync(join(dir, '.team-flow.yaml'), 'utf-8'), /^schema_version: 1$/m);
  });

  it('set schema_version 被拒（防伪造豁免身份）', () => {
    const dir = freshChange('forged');
    tf(['state', 'init', dir]);
    const r = tf(['state', 'set', dir, 'schema_version', '0']);
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /schema_version/);
  });
});
