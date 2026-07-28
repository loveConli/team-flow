// tests/lib/guard-compound-captured.test.mjs
// v0.24.0: compound-captured guard — executing:closing must require learnings.md
// or explicit compound_skipped=true in state.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// Import the check function directly for unit-level testing.
const { checkCompoundCaptured } = await import(
  join(ROOT, 'scripts', 'guard', 'checks', 'compound-captured.mjs')
);

function makeDir(prefix) {
  return mkdtempSync(join(tmpdir(), `tf-compound-${prefix}-`));
}

function cleanup(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

describe('compound-captured guard', () => {
  describe('learnings.md existence', () => {
    let dir;
    before(() => { dir = makeDir('learnings'); });
    after(() => cleanup(dir));

    it('SHALL fail when no learnings.md and no compound_skipped', () => {
      writeFileSync(join(dir, '.team-flow.yaml'), 'state: executing\nworkflow: full\n');
      const result = checkCompoundCaptured(dir);
      assert.equal(result.pass, false);
      assert.ok(result.failures.length > 0);
      assert.match(result.failures[0], /Compound capture missing/);
    });

    it('SHALL pass when learnings.md exists and is non-empty', () => {
      writeFileSync(join(dir, 'learnings.md'), '# Session Learnings\n\n## Lesson 1\nTest.\n');
      const result = checkCompoundCaptured(dir);
      assert.equal(result.pass, true);
    });

    it('SHALL fail when learnings.md exists but is empty', () => {
      writeFileSync(join(dir, 'learnings.md'), '');
      const result = checkCompoundCaptured(dir);
      assert.equal(result.pass, false);
      assert.match(result.failures[0], /empty/);
    });
  });

  describe('compound_skipped explicit opt-out', () => {
    let dir;
    before(() => { dir = makeDir('skip'); });
    after(() => cleanup(dir));

    it('SHALL pass when compound_skipped=true and no learnings.md', () => {
      writeFileSync(join(dir, '.team-flow.yaml'), 'state: executing\nworkflow: full\ncompound_skipped: true\n');
      const result = checkCompoundCaptured(dir);
      assert.equal(result.pass, true);
    });

    it('SHALL fail when compound_skipped=false (not opted out)', () => {
      writeFileSync(join(dir, '.team-flow.yaml'), 'state: executing\nworkflow: full\ncompound_skipped: false\n');
      const result = checkCompoundCaptured(dir);
      assert.equal(result.pass, false);
    });
  });

  describe('no state file (backward compatibility)', () => {
    let dir;
    before(() => { dir = makeDir('no-state'); });
    after(() => cleanup(dir));

    it('SHALL fail when no state file and no learnings.md', () => {
      // No .team-flow.yaml, no learnings.md — guard should still fail
      const result = checkCompoundCaptured(dir);
      assert.equal(result.pass, false);
    });

    it('SHALL pass when no state file but learnings.md exists', () => {
      writeFileSync(join(dir, 'learnings.md'), '# Learnings\nContent.\n');
      const result = checkCompoundCaptured(dir);
      assert.equal(result.pass, true);
    });
  });
});
