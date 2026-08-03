// tests/lib/cmd-version-hooks.test.mjs
// v0.32.2（P2-40）：hooks/session-start 版本号必须被 tf version 自动同步。
// 回归背景：v0.27.2~v0.32.1 四次发版中，cmd-version 的 pattern 写死了注释后缀措辞
// （": conditional injection"），hook 注释改为 ": auto-sync CLI version..." 后失配，
// 且 PLUGIN_VERSION 变量从未纳入同步 → 每次 npm version 链必在 check-versions 处中断。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = join(__dirname, '..', '..', 'scripts', 'team-flow.mjs');

const OLD_HOOK = [
  '#!/usr/bin/env bash',
  '# v0.1.0: auto-sync CLI version with plugin version',
  'set -e',
  '',
  '# ═ Plugin version ═',
  'PLUGIN_VERSION="0.1.0"',
  '',
  'echo "team-flow session start"',
].join('\n') + '\n';

describe('P2-40: tf version 同步 hooks/session-start', () => {
  let fixture;
  before(() => {
    fixture = mkdtempSync(join(tmpdir(), 'tf-version-hooks-'));
    mkdirSync(join(fixture, 'hooks'), { recursive: true });
    writeFileSync(join(fixture, 'hooks', 'session-start'), OLD_HOOK);
  });
  after(() => { if (existsSync(fixture)) rmSync(fixture, { recursive: true, force: true }); });

  function hookContent() {
    return readFileSync(join(fixture, 'hooks', 'session-start'), 'utf-8');
  }

  it('注释行与 PLUGIN_VERSION 变量同步到新版本', () => {
    execFileSync('node', [CLI, 'version', '0.9.9'], { cwd: fixture, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 });
    const content = hookContent();
    assert.match(content, /^# v0\.9\.9: auto-sync CLI version with plugin version$/m, '注释行应同步且保留原措辞');
    assert.match(content, /^PLUGIN_VERSION="0\.9\.9"$/m, 'PLUGIN_VERSION 变量应同步');
    assert.ok(!content.includes('0.1.0'), '不应残留旧版本号');
  });

  it('重复同步同版本幂等（文件不变）', () => {
    const before = hookContent();
    execFileSync('node', [CLI, 'version', '0.9.9'], { cwd: fixture, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 });
    assert.equal(hookContent(), before, '同版本重复同步不应改动文件');
  });

  it('注释措辞变更后仍能同步（pattern 后缀通配防腐化）', () => {
    // 模拟未来注释措辞再次演进（根因防御：后缀不得写死）
    writeFileSync(join(fixture, 'hooks', 'session-start'),
      OLD_HOOK.replaceAll('0.1.0', '0.9.9').replace('auto-sync CLI version with plugin version', 'some future wording'));
    execFileSync('node', [CLI, 'version', '1.2.3'], { cwd: fixture, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 15000 });
    const content = hookContent();
    assert.match(content, /^# v1\.2\.3: some future wording$/m, '任意后缀措辞都应命中同步');
    assert.match(content, /^PLUGIN_VERSION="1\.2\.3"$/m);
  });
});
