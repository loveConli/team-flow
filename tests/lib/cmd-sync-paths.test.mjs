import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deriveCapabilityDir } from '../../scripts/lib/cmd-sync.mjs';

const CLI = join(process.cwd(), 'scripts/spec-superflow.mjs');
let tempRoot;

function runSync(cwd, changeDir) {
  try {
    const stdout = execFileSync(process.execPath, [CLI, 'sync', changeDir], {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status || 1,
      stdout: err.stdout?.toString() || '',
      stderr: err.stderr?.toString() || err.message,
    };
  }
}

function writeSpec(path) {
  writeFileSync(path, '## ADDED Requirements\n\n### Requirement: Sync path\n\nThe system SHALL sync canonical paths.\n\n#### Scenario: Sync\n- **WHEN** sync runs\n- **THEN** the main spec is written');
}

describe('cmd-sync: canonical spec paths', () => {
  before(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'ssf-sync-paths-'));
  });

  after(() => {
    if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  });

  it('syncs canonical specs to main specs/<capability>/spec.md', () => {
    const repo = mkdtempSync(join(tempRoot, 'repo-'));
    const change = join(repo, 'changes', 'canonical');
    mkdirSync(join(change, 'specs', 'ui-theme'), { recursive: true });
    writeSpec(join(change, 'specs', 'ui-theme', 'spec.md'));

    const result = runSync(repo, change);
    assert.equal(result.exitCode, 0, result.stdout + result.stderr);
    assert.equal(existsSync(join(repo, 'specs', 'ui-theme', 'spec.md')), true);
    assert.match(readFileSync(join(repo, 'specs', 'ui-theme', 'spec.md'), 'utf-8'), /Sync path/);
  });

  it('derives capability dirs from Windows-style spec paths', () => {
    assert.equal(
      deriveCapabilityDir('C:\\repo\\changes\\feature\\specs', 'C:\\repo\\changes\\feature\\specs\\ui-theme\\spec.md'),
      'ui-theme',
    );
  });

  it('rejects flat specs before syncing', () => {
    const repo = mkdtempSync(join(tempRoot, 'repo-flat-'));
    const change = join(repo, 'changes', 'flat');
    mkdirSync(join(change, 'specs'), { recursive: true });
    writeSpec(join(change, 'specs', 'ui-theme.md'));

    const result = runSync(repo, change);
    assert.equal(result.exitCode, 1);
    assert.match(result.stdout + result.stderr, /Invalid spec path: specs\/ui-theme\.md/);
    assert.equal(existsSync(join(repo, 'specs', 'ui-theme', 'spec.md')), false);
  });

  it('rejects root specs/spec.md before syncing', () => {
    const repo = mkdtempSync(join(tempRoot, 'repo-root-'));
    const change = join(repo, 'changes', 'root-spec');
    mkdirSync(join(change, 'specs'), { recursive: true });
    writeSpec(join(change, 'specs', 'spec.md'));

    const result = runSync(repo, change);
    assert.equal(result.exitCode, 1);
    assert.match(result.stdout + result.stderr, /Invalid spec path: specs\/spec\.md/);
    assert.equal(existsSync(join(repo, 'specs', 'spec.md')), false);
  });
});
