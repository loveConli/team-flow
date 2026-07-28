// tests/lib/solutions-capture.test.mjs
// Tests for scripts/lib/solutions-capture.mjs — compound capture mechanism

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const { run: captureRun } = await import(join(ROOT, 'scripts', 'lib', 'solutions-capture.mjs'));

function makeDir() {
  return mkdtempSync(join(tmpdir(), 'tf-sol-capture-'));
}

function cleanup(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

describe('solutions-capture', () => {
  let dir;

  beforeEach(() => {
    dir = makeDir();
  });

  after(() => {
    // Clean up all temp dirs
    cleanup(dir);
  });

  it('creates experience file in correct phase directory', () => {
    const result = captureRun({
      phase: 'prd', domain: 'auth', type: 'pitfall', severity: 'high',
      summary: 'OAuth token refresh fails silently', dir,
    });

    assert.equal(result.phase, 'prd');
    assert.equal(result.severity, 'high');
    assert.match(result.file, /^prd\/\d{4}-\d{2}-\d{2}-.*\.md$/);

    // Verify file exists and has frontmatter
    const filePath = join(dir, result.file);
    assert.ok(existsSync(filePath), 'experience file should exist');
    const content = readFileSync(filePath, 'utf-8');
    assert.match(content, /^---\nphase: prd\n/);
    assert.match(content, /domain: auth/);
    assert.match(content, /type: pitfall/);
    assert.match(content, /severity: high/);
  });

  it('creates INDEX.md from scratch when missing', () => {
    captureRun({
      phase: 'build', domain: 'ci', type: 'pattern', severity: 'medium',
      summary: 'Parallel test execution race condition', dir,
    });

    const indexPath = join(dir, 'INDEX.md');
    assert.ok(existsSync(indexPath), 'INDEX.md should be created');
    const content = readFileSync(indexPath, 'utf-8');
    assert.match(content, /# Solutions Index/);
    assert.match(content, /parallel test execution/i);
  });

  it('appends to existing INDEX.md', () => {
    captureRun({ phase: 'build', domain: 'ci', type: 'pattern', severity: 'high', summary: 'First issue', dir });
    captureRun({ phase: 'spec', domain: 'api', type: 'insight', severity: 'low', summary: 'Second issue', dir });

    const content = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    assert.match(content, /First issue/);
    assert.match(content, /Second issue/);
  });

  it('handles Chinese characters in summary (slugify)', () => {
    const result = captureRun({
      phase: 'review', domain: 'frontend', type: 'pitfall', severity: 'high',
      summary: '中文标题测试特殊字符', dir,
    });

    assert.ok(result.file.includes('review/'), 'file should be in review phase');
    assert.ok(existsSync(join(dir, result.file)), 'file with Chinese slug should exist');
  });

  it('uses cross-phase as default when no phase specified', () => {
    const result = captureRun({ dir });
    assert.equal(result.phase, 'cross-phase');
    assert.equal(result.domain, 'general');
    assert.equal(result.severity, 'medium');
  });

  it('rejects invalid phase', () => {
    // capture calls process.exit(1) on invalid phase
    // We test by checking that the function does not create files
    const origExit = process.exit;
    let exitCode = null;
    process.exit = (code) => { exitCode = code; };
    try {
      captureRun({ phase: 'invalid-phase', dir });
    } catch { /* ignore */ }
    process.exit = origExit;
    assert.equal(exitCode, 1, 'should exit with code 1 for invalid phase');
  });
});
