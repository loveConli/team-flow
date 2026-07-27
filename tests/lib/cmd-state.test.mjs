// tests/lib/cmd-state.test.mjs
// Tests for scripts/lib/cmd-state.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const CLI_PATH = join(process.cwd(), 'scripts/team-flow.mjs');
let tempDir;

function tf(args, options = {}) {
  try {
    const result = execSync(
      `${shellQuote(process.execPath)} ${shellQuote(CLI_PATH)} ${args}`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...options }
    );
    return { exitCode: 0, stdout: result.trim(), stderr: '' };
  } catch (err) {
    return { exitCode: err.status || 1, stdout: err.stdout?.trim() || '', stderr: err.stderr?.trim() || err.message };
  }
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

describe('cmd-state: init', () => {
  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tf-state-cmd-'));
    // Create minimal artifacts for hash computation
    writeFileSync(join(tempDir, 'proposal.md'), '## Why\nTest proposal for state command testing, needs to be long enough for validation rules\n## What Changes\n- Add feature X');
  });

  after(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates .team-flow.yaml with hashes', () => {
    const result = tf(`state init ${tempDir}`);
    assert.equal(result.exitCode, 0, `Expected exit 0 but got ${result.exitCode}: ${result.stderr}`);

    const stateFile = join(tempDir, '.team-flow.yaml');
    assert.ok(existsSync(stateFile));
  });

  it('reports artifacts_hash in init output', () => {
    const result = tf(`state init ${tempDir}`);
    assert.ok(result.stdout.includes('artifacts_hash'));
  });

  it('--json flag outputs JSON with ok: true', () => {
    const result = tf(`state init ${tempDir} --json`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.ok(parsed.artifacts_hash.startsWith('sha256:'));
  });
});

describe('cmd-state: check', () => {
  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tf-state-check-'));
    writeFileSync(join(tempDir, 'proposal.md'), '## Why\nTest proposal for state checking with enough chars to pass validation rules.\n## What Changes\n- Feature X');
  });

  after(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports consistent after init', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state check ${tempDir}`);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('consistent'));
  });

  it('reports inconsistent after artifact change', () => {
    tf(`state init ${tempDir}`);
    // Modify an artifact
    writeFileSync(join(tempDir, 'proposal.md'), '## Why\nModified proposal with different content for inconsistency testing.\n## What Changes\n- Modified feature');
    const result = tf(`state check ${tempDir}`);
    assert.equal(result.exitCode, 1);
    assert.ok(result.stdout.includes('INCONSISTENT'));
  });

  it('--json outputs structured data', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state check ${tempDir} --json`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.consistent, true);
    assert.ok(parsed.stored_hash);
    assert.ok(parsed.current_hash);
    assert.equal(parsed.state, 'exploring');
  });
});

describe('cmd-state: transition', () => {
  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tf-state-trans-'));
    writeFileSync(join(tempDir, 'proposal.md'), '## Why\nTest proposal for state transition validation, meeting the minimum length requirement.\n## What Changes\n- Add feature');
    writeFileSync(join(tempDir, 'design.md'), '# Design\n## Context\nTest.\n## Goals\nTest.\n## Decisions\n### D1\n- Choice: Test\n- Rationale: Test\n\n## Risks And Trade-Offs\nNone.');
    writeFileSync(join(tempDir, 'tasks.md'), '# Tasks\n- [x] Task 1');
    mkdirSync(join(tempDir, 'specs', 'test'), { recursive: true });
    writeFileSync(join(tempDir, 'specs', 'test', 'spec.md'), '## ADDED Requirements\n### Requirement: Test\nSHALL work.\n#### Scenario: Test\n- **WHEN** test\n- **THEN** test');
  });

  after(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('transitions from exploring to specifying', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state transition ${tempDir} specifying`);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('exploring -> specifying'));
  });

  it('--json outputs from/to', () => {
    // Re-init to ensure we start from exploring
    rmSync(join(tempDir, '.team-flow.yaml'), { force: true });
    tf(`state init ${tempDir}`);
    // exploring→specifying is the next legal mainline transition
    const result = tf(`state transition ${tempDir} specifying --json`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.from, 'exploring');
    assert.equal(parsed.to, 'specifying');
  });

  it('persists state across invocations', () => {
    tf(`state init ${tempDir}`);
    // Legal transition: exploring → specifying
    tf(`state transition ${tempDir} specifying`);

    // Check state persisted
    const result = tf(`state check ${tempDir} --json`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.state, 'specifying');
  });

  it('rejects exploring to approved-for-build when workflow is auto', () => {
    rmSync(join(tempDir, '.team-flow.yaml'), { force: true });
    tf(`state init ${tempDir}`);

    const result = tf(`state transition ${tempDir} approved-for-build`);
    assert.equal(result.exitCode, 1);
    const output = result.stderr || result.stdout;
    assert.match(output, /workflow-mode/i);
    assert.match(output, /fast-path/i);
    assert.match(output, /tweak/i);

    const check = tf(`state get ${tempDir} state`);
    assert.equal(check.stdout.trim(), 'exploring');
  });

  it('rejects exploring to bridging when workflow is full', () => {
    rmSync(join(tempDir, '.team-flow.yaml'), { force: true });
    tf(`state init ${tempDir}`);
    tf(`state set ${tempDir} workflow full`);

    const result = tf(`state transition ${tempDir} bridging`);
    assert.equal(result.exitCode, 1);
    const output = result.stderr || result.stdout;
    assert.match(output, /workflow-mode/i);
    assert.match(output, /fast-path/i);
    assert.match(output, /hotfix/i);

    const check = tf(`state get ${tempDir} state`);
    assert.equal(check.stdout.trim(), 'exploring');
  });

  it('rejects transition when guard output is not valid JSON', () => {
    rmSync(join(tempDir, '.team-flow.yaml'), { force: true });
    tf(`state init ${tempDir}`);
    tf(`state set ${tempDir} workflow invalid-mode`);

    const result = tf(`state transition ${tempDir} specifying`);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr || result.stdout, /valid JSON|Invalid workflow|guard-error/i);

    const check = tf(`state get ${tempDir} state`);
    assert.equal(check.stdout.trim(), 'exploring');
  });

  it('rejects transition when guard pass is a truthy non-boolean value', () => {
    rmSync(join(tempDir, '.team-flow.yaml'), { force: true });
    tf(`state init ${tempDir}`);

    const shimDir = mkdtempSync(join(tmpdir(), 'tf-node-shim-'));
    const nodeShim = join(shimDir, 'node');
    writeFileSync(nodeShim, [
      '#!/bin/sh',
      'case "$1" in',
      '  */scripts/guard/guard.mjs)',
      '    printf \'%s\\n\' \'{"pass":"false","checks":[]}\'',
      '    exit 0',
      '    ;;',
      'esac',
      `exec ${shellQuote(process.execPath)} "$@"`,
      '',
    ].join('\n'));
    chmodSync(nodeShim, 0o755);

    try {
      const result = tf(`state transition ${tempDir} specifying`, {
        env: { ...process.env, PATH: `${shimDir}:${process.env.PATH}` },
      });
      assert.equal(result.exitCode, 1);
      assert.match(result.stderr || result.stdout, /guard-error|Guard check failed/i);

      const check = tf(`state get ${tempDir} state`);
      assert.equal(check.stdout.trim(), 'exploring');
    } finally {
      rmSync(shimDir, { recursive: true, force: true });
    }
  });

  it('reports guard spawn errors without changing state', () => {
    rmSync(join(tempDir, '.team-flow.yaml'), { force: true });
    tf(`state init ${tempDir}`);

    const result = tf(`state transition ${tempDir} specifying`, {
      env: { ...process.env, PATH: '' },
    });
    assert.equal(result.exitCode, 1);
    const output = result.stderr || result.stdout;
    assert.match(output, /guard-error|spawn|ENOENT/i);
    assert.doesNotMatch(output, /TypeError/i);

    const check = tf(`state get ${tempDir} state`);
    assert.equal(check.stdout.trim(), 'exploring');
  });
});

describe('cmd-state: get', () => {
  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tf-state-get-'));
    writeFileSync(join(tempDir, 'proposal.md'), '## Why\nTest proposal for get command, needs to be long enough.\n## What Changes\n- Feature');
  });

  after(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('gets a field value', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state get ${tempDir} state`);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), 'exploring');
  });

  it('returns null for unset fields', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state get ${tempDir} dp_5_result`);
    assert.ok(result.stdout.includes('null'));
  });

  it('--json returns structured output', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state get ${tempDir} state --json`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.field, 'state');
    assert.equal(parsed.value, 'exploring');
  });

  it('errors without field argument', () => {
    const result = tf(`state get ${tempDir}`);
    assert.equal(result.exitCode, 2);
  });
});

describe('cmd-state: set', () => {
  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tf-state-set-'));
    writeFileSync(join(tempDir, 'proposal.md'), '## Why\nTest proposal for the set subcommand validation.\n## What Changes\n- Test feature');
  });

  after(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('sets a settable field', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state set ${tempDir} workflow hotfix`);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('hotfix'));
  });

  it('sets a DP field', () => {
    tf(`state init ${tempDir}`);
    tf(`state set ${tempDir} dp_1_result "confirmed: csv export"`);
    const get = tf(`state get ${tempDir} dp_1_result`);
    assert.ok(get.stdout.includes('confirmed: csv export'));
  });

  it('rejects non-settable fields', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state set ${tempDir} state executing`);
    assert.equal(result.exitCode, 1);
    // Error goes to stderr for console.error
    assert.ok(result.stderr.includes('not settable') || result.stdout.includes('not settable'),
      `Expected 'not settable' in output but got stdout: "${result.stdout}" stderr: "${result.stderr}"`);
  });

  it('rejects manual edits to execution DP-4 fields', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state set ${tempDir} dp_4_result "forged execution approval"`);
    assert.equal(result.exitCode, 1);
    assert.match(result.stderr || result.stdout, /not settable/);
  });

  it('rejects unknown fields', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state set ${tempDir} nonexistent_field value`);
    assert.equal(result.exitCode, 1);
  });

  it('--json outputs structured result', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state set ${tempDir} test_result pass --json`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.field, 'test_result');
    assert.equal(parsed.value, 'pass');
  });
});

describe('cmd-state: rebuild', () => {
  before(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tf-state-rebuild-'));
    writeFileSync(join(tempDir, 'proposal.md'), '## Why\nRebuild test proposal with sufficient content length.\n## What Changes\n- Rebuild feature');
  });

  after(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('rebuilds state from artifacts', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state rebuild ${tempDir}`);
    assert.equal(result.exitCode, 0);
    assert.ok(result.stdout.includes('rebuilt'));
  });

  it('--json returns ok with state', () => {
    tf(`state init ${tempDir}`);
    const result = tf(`state rebuild ${tempDir} --json`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state, 'exploring');
  });
});

describe('cmd-state: error handling', () => {
  it('errors when no change-dir provided', () => {
    const result = tf('state init');
    assert.equal(result.exitCode, 2);
  });

  it('errors on unknown subcommand', () => {
    const result = tf('state invalid-subcommand /tmp');
    assert.equal(result.exitCode, 2);
  });
});
