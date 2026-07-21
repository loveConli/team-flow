import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let mod;
let tempDir;

describe('spec-paths', () => {
  before(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'ssf-spec-paths-'));
    mod = await import(join(process.cwd(), 'scripts/lib/spec-paths.mjs'));
  });

  after(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('finds canonical specs in sorted order', () => {
    const dir = mkdtempSync(join(tempDir, 'canonical-'));
    mkdirSync(join(dir, 'specs', 'z-auth'), { recursive: true });
    mkdirSync(join(dir, 'specs', 'a-ui'), { recursive: true });
    writeFileSync(join(dir, 'specs', 'z-auth', 'spec.md'), 'z');
    writeFileSync(join(dir, 'specs', 'a-ui', 'spec.md'), 'a');

    const files = mod.findCanonicalSpecFiles(dir).map(f => f.replace(dir + '/', ''));
    assert.deepEqual(files, ['specs/a-ui/spec.md', 'specs/z-auth/spec.md']);
  });

  it('ignores nested spec.md files when finding canonical specs', () => {
    const dir = mkdtempSync(join(tempDir, 'nested-'));
    mkdirSync(join(dir, 'specs', 'ui-theme', 'nested'), { recursive: true });
    writeFileSync(join(dir, 'specs', 'ui-theme', 'nested', 'spec.md'), 'nested');

    assert.deepEqual(mod.findCanonicalSpecFiles(dir), []);

    const result = mod.validateSpecPathLayout(dir, { requireSpecs: true });
    assert.equal(result.pass, false);
    assert.deepEqual(result.specFiles, []);
    assert.ok(result.failures.some(f => f.includes('No canonical spec files found')));
  });

  it('reports flat capability specs with expected canonical path', () => {
    const dir = mkdtempSync(join(tempDir, 'flat-'));
    mkdirSync(join(dir, 'specs'), { recursive: true });
    writeFileSync(join(dir, 'specs', 'ui-theme.md'), 'flat');

    const invalid = mod.findInvalidSpecFiles(dir);
    assert.deepEqual(invalid.map(i => i.path), ['specs/ui-theme.md']);
    assert.deepEqual(invalid.map(i => i.expected), ['specs/ui-theme/spec.md']);
  });

  it('reports root specs/spec.md as invalid', () => {
    const dir = mkdtempSync(join(tempDir, 'root-spec-'));
    mkdirSync(join(dir, 'specs'), { recursive: true });
    writeFileSync(join(dir, 'specs', 'spec.md'), 'root');

    const invalid = mod.findInvalidSpecFiles(dir);
    assert.deepEqual(invalid, [{ path: 'specs/spec.md', expected: 'specs/<capability>/spec.md' }]);
  });

  it('does not reject README.md inside specs', () => {
    const dir = mkdtempSync(join(tempDir, 'readme-'));
    mkdirSync(join(dir, 'specs'), { recursive: true });
    writeFileSync(join(dir, 'specs', 'README.md'), 'notes');

    assert.deepEqual(mod.findInvalidSpecFiles(dir), []);
  });

  it('fails layout validation when canonical specs are required but missing', () => {
    const dir = mkdtempSync(join(tempDir, 'missing-'));
    mkdirSync(join(dir, 'specs'), { recursive: true });

    const result = mod.validateSpecPathLayout(dir, { requireSpecs: true });
    assert.equal(result.pass, false);
    assert.deepEqual(result.specFiles, []);
    assert.ok(result.failures.some(f => f.includes('No canonical spec files found')));
  });
});
