// tests/lib/solutions-inject.test.mjs
// Tests for scripts/lib/solutions-inject.mjs — compound injection mechanism

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const { run: injectRun } = await import(join(ROOT, 'scripts', 'lib', 'solutions-inject.mjs'));

function makeDir() {
  return mkdtempSync(join(tmpdir(), 'tf-sol-inject-'));
}

function cleanup(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

const INDEX_HEADER = `# Solutions Index
<!-- 每条一行，按 severity 降序，≤150 行硬上限 -->
| date | phase | domain | type | severity | summary | file |
|------|-------|--------|------|----------|---------|------|
`;

function writeIndex(dir, rows) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'INDEX.md'), INDEX_HEADER + rows.join('\n') + '\n', 'utf-8');
}

describe('solutions-inject', () => {
  let dir;

  beforeEach(() => { dir = makeDir(); });
  after(() => { cleanup(dir); });

  it('returns empty when no INDEX.md exists', () => {
    const result = injectRun({ phase: 'prd', dir });
    assert.deepEqual(result.entries, []);
  });

  it('filters by exact phase match', () => {
    writeIndex(dir, [
      '| 2026-07-01 | prd | auth | pitfall | high | PRD auth issue | prd/f1.md |',
      '| 2026-07-01 | build | auth | pitfall | high | Build auth issue | build/f2.md |',
    ]);
    const result = injectRun({ phase: 'prd', dir });
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].summary, 'PRD auth issue');
  });

  it('includes cross-phase entries for any phase query', () => {
    writeIndex(dir, [
      '| 2026-07-01 | cross-phase | general | pattern | high | Global pattern | cross-phase/f1.md |',
      '| 2026-07-01 | prd | auth | pitfall | high | PRD issue | prd/f2.md |',
    ]);
    const result = injectRun({ phase: 'build', dir });
    // cross-phase matches for any phase
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].phase, 'cross-phase');
  });

  it('filters by domain (exact match)', () => {
    writeIndex(dir, [
      '| 2026-07-01 | prd | auth | pitfall | high | Auth issue | prd/f1.md |',
      '| 2026-07-01 | prd | billing | pitfall | high | Billing issue | prd/f2.md |',
    ]);
    const result = injectRun({ phase: 'prd', domain: 'auth', dir });
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].domain, 'auth');
  });

  it('domain "general" matches any query', () => {
    writeIndex(dir, [
      '| 2026-07-01 | prd | general | pattern | high | General pattern | prd/f1.md |',
    ]);
    const result = injectRun({ phase: 'prd', domain: 'auth', dir });
    assert.equal(result.entries.length, 1);
  });

  it('sorts by severity descending (high > medium > low)', () => {
    writeIndex(dir, [
      '| 2026-07-01 | prd | auth | pitfall | low | Low issue | prd/f1.md |',
      '| 2026-07-01 | prd | auth | pitfall | high | High issue | prd/f2.md |',
      '| 2026-07-01 | prd | auth | pitfall | medium | Medium issue | prd/f3.md |',
    ]);
    const result = injectRun({ phase: 'prd', dir });
    assert.equal(result.entries[0].severity, 'high');
    assert.equal(result.entries[1].severity, 'medium');
    assert.equal(result.entries[2].severity, 'low');
  });

  it('limits to top-5 entries', () => {
    const rows = [];
    for (let i = 0; i < 10; i++) {
      rows.push(`| 2026-07-0${(i % 9) + 1} | prd | auth | pitfall | high | Issue ${i} | prd/f${i}.md |`);
    }
    writeIndex(dir, rows);
    const result = injectRun({ phase: 'prd', dir });
    assert.equal(result.entries.length, 5, 'should cap at top-5');
  });

  it('returns empty for no matching entries', () => {
    writeIndex(dir, [
      '| 2026-07-01 | build | ci | pattern | high | Build issue | build/f1.md |',
    ]);
    const result = injectRun({ phase: 'prd', dir });
    assert.deepEqual(result.entries, []);
  });
});
