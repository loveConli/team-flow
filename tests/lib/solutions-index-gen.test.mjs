// tests/lib/solutions-index-gen.test.mjs
// Tests for scripts/lib/solutions-index-gen.mjs — full INDEX.md rebuild

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const { run: indexGenRun } = await import(join(ROOT, 'scripts', 'lib', 'solutions-index-gen.mjs'));

function makeDir() {
  return mkdtempSync(join(tmpdir(), 'tf-sol-indexgen-'));
}

function cleanup(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

function writeEntry(dir, phase, filename, fm) {
  const phaseDir = join(dir, phase);
  mkdirSync(phaseDir, { recursive: true });
  const fmLines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join('\n');
  writeFileSync(join(phaseDir, filename), `---\n${fmLines}\n---\n\n${fm.summary || 'Body text'}\n`, 'utf-8');
}

describe('solutions-index-gen', () => {
  let dir;

  beforeEach(() => { dir = makeDir(); });
  after(() => { cleanup(dir); });

  it('rebuilds INDEX.md from phase directories', () => {
    writeEntry(dir, 'prd', '2026-07-01-auth-issue.md', {
      phase: 'prd', domain: 'auth', type: 'pitfall', severity: 'high', date: '2026-07-01',
    });
    writeEntry(dir, 'build', '2026-07-02-ci-pattern.md', {
      phase: 'build', domain: 'ci', type: 'pattern', severity: 'medium', date: '2026-07-02',
    });

    indexGenRun({ dir });

    const content = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    assert.match(content, /# Solutions Index/);
    assert.match(content, /auth-issue/);
    assert.match(content, /ci-pattern/);
  });

  it('sorts by severity descending (high before medium before low)', () => {
    writeEntry(dir, 'prd', 'low.md', {
      phase: 'prd', domain: 'd1', type: 'pitfall', severity: 'low', date: '2026-07-03',
    });
    writeEntry(dir, 'prd', 'high.md', {
      phase: 'prd', domain: 'd2', type: 'pitfall', severity: 'high', date: '2026-07-01',
    });
    writeEntry(dir, 'prd', 'medium.md', {
      phase: 'prd', domain: 'd3', type: 'pitfall', severity: 'medium', date: '2026-07-02',
    });

    indexGenRun({ dir });

    const content = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    const highPos = content.indexOf('d2');
    const medPos = content.indexOf('d3');
    const lowPos = content.indexOf('d1');
    assert.ok(highPos < medPos, 'high should appear before medium');
    assert.ok(medPos < lowPos, 'medium should appear before low');
  });

  it('sorts by date descending within same severity', () => {
    writeEntry(dir, 'prd', 'older.md', {
      phase: 'prd', domain: 'auth', type: 'pitfall', severity: 'high', date: '2026-07-01',
    });
    writeEntry(dir, 'prd', 'newer.md', {
      phase: 'prd', domain: 'auth', type: 'pitfall', severity: 'high', date: '2026-07-15',
    });

    indexGenRun({ dir });

    const content = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    const newerPos = content.indexOf('2026-07-15');
    const olderPos = content.indexOf('2026-07-01');
    assert.ok(newerPos < olderPos, 'newer date should appear before older date');
  });

  it('scans all 7 phase directories', () => {
    const phases = ['prd', 'plan', 'prototype', 'spec', 'build', 'review', 'cross-phase'];
    for (const phase of phases) {
      writeEntry(dir, phase, `2026-07-01-${phase}-entry.md`, {
        phase, domain: 'general', type: 'insight', severity: 'medium', date: '2026-07-01',
      });
    }

    indexGenRun({ dir });

    const content = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    for (const phase of phases) {
      assert.match(content, new RegExp(phase), `INDEX should contain ${phase} entries`);
    }
  });

  it('skips non-.md files', () => {
    mkdirSync(join(dir, 'build'), { recursive: true });
    writeFileSync(join(dir, 'build', 'readme.txt'), 'Not a markdown file', 'utf-8');
    writeEntry(dir, 'build', '2026-07-01-real.md', {
      phase: 'build', domain: 'ci', type: 'pattern', severity: 'high', date: '2026-07-01',
    });

    indexGenRun({ dir });

    const content = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    assert.doesNotMatch(content, /readme\.txt/);
    assert.match(content, /real\.md/);
  });

  it('truncates to 150 entries (drops lowest priority)', () => {
    // Create 155 entries (all high severity, varying dates)
    mkdirSync(join(dir, 'build'), { recursive: true });
    for (let i = 0; i < 155; i++) {
      const day = String((i % 28) + 1).padStart(2, '0');
      writeEntry(dir, 'build', `entry-${String(i).padStart(3, '0')}.md`, {
        phase: 'build', domain: `d${i}`, type: 'pattern', severity: 'high', date: `2026-07-${day}`,
      });
    }

    indexGenRun({ dir });

    const content = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    const dataLines = content.split('\n').filter(l => l.startsWith('|') && !l.startsWith('| date') && !l.startsWith('|--'));
    assert.equal(dataLines.length, 150, 'INDEX should be truncated to 150 entries');
  });

  it('handles empty solutions directory', () => {
    // No phase directories exist
    indexGenRun({ dir });

    const content = readFileSync(join(dir, 'INDEX.md'), 'utf-8');
    assert.match(content, /# Solutions Index/);
    const dataLines = content.split('\n').filter(l => l.startsWith('|') && !l.startsWith('| date') && !l.startsWith('|--'));
    assert.equal(dataLines.length, 0);
  });
});
