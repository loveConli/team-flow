// tests/lib/solutions-promote.test.mjs
// Tests for scripts/lib/solutions-promote.mjs — change→product promotion

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// NODE_ENV=test is set below before import — promote's CLI guard skips when test.
process.env.NODE_ENV = 'test';
const { run: promoteRun } = await import(join(ROOT, 'scripts', 'lib', 'solutions-promote.mjs'));

function makeDir(prefix = '') {
  return mkdtempSync(join(tmpdir(), `tf-sol-promote-${prefix}-`));
}

function cleanup(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
}

function writeLearnings(dir, content) {
  writeFileSync(join(dir, 'learnings.md'), content, 'utf-8');
}

const INDEX_HEADER = `# Solutions Index
| date | phase | domain | type | severity | summary | file |
|------|-------|--------|------|----------|---------|------|
`;

function writeGlobalIndex(solDir, rows = []) {
  mkdirSync(solDir, { recursive: true });
  writeFileSync(join(solDir, 'INDEX.md'), INDEX_HEADER + rows.join('\n') + '\n', 'utf-8');
}

describe('solutions-promote', () => {
  let changeDir, solDir;

  beforeEach(() => {
    changeDir = makeDir('change');
    solDir = makeDir('solutions');
  });

  after(() => {
    cleanup(changeDir);
    cleanup(solDir);
  });

  it('returns zero when no learnings.md exists', () => {
    const result = promoteRun({ changeDir, dir: solDir });
    assert.equal(result.promoted, 0);
    assert.equal(result.updated, 0);
  });

  it('promotes entry with severity=high and type=pitfall', () => {
    writeLearnings(changeDir, `## Auth token refresh failure
---
phase: build
domain: auth
type: pitfall
severity: high
date: 2026-07-15
---

When OAuth token refresh fails, the system silently swallows the error.
`);
    const result = promoteRun({ changeDir, dir: solDir });
    assert.equal(result.promoted, 1);
    assert.ok(existsSync(join(solDir, 'build')), 'build phase dir should exist');
  });

  it('promotes entry with severity=medium and type=pattern', () => {
    writeLearnings(changeDir, `## Retry with backoff pattern
---
phase: build
domain: networking
type: pattern
severity: medium
date: 2026-07-15
---

Use exponential backoff for API retry logic.
`);
    const result = promoteRun({ changeDir, dir: solDir });
    assert.equal(result.promoted, 1);
  });

  it('skips entry with severity=low', () => {
    writeLearnings(changeDir, `## Minor formatting issue
---
phase: build
domain: style
type: pitfall
severity: low
date: 2026-07-15
---

Some low severity issue.
`);
    const result = promoteRun({ changeDir, dir: solDir });
    assert.equal(result.promoted, 0);
  });

  it('skips entry with type=insight (not pitfall/pattern)', () => {
    writeLearnings(changeDir, `## Interesting observation
---
phase: build
domain: auth
type: insight
severity: high
date: 2026-07-15
---

An insight that should not be promoted.
`);
    const result = promoteRun({ changeDir, dir: solDir });
    assert.equal(result.promoted, 0);
  });

  it('detects duplicate domain+type and marks as confirmed', () => {
    writeGlobalIndex(solDir, [
      '| 2026-07-01 | build | auth | pitfall | medium | Existing auth pitfall | build/existing.md |',
    ]);
    writeLearnings(changeDir, `## Another auth pitfall
---
phase: build
domain: auth
type: pitfall
severity: high
date: 2026-07-15
---

Duplicate domain+type with existing index entry.
`);
    const result = promoteRun({ changeDir, dir: solDir });
    assert.equal(result.updated, 1, 'should detect duplicate and mark as confirmed');
    assert.equal(result.promoted, 0, 'should not create new file for duplicate');
  });

  it('promotes multiple entries from single learnings.md', () => {
    writeLearnings(changeDir, `## Issue one
---
phase: spec
domain: api
type: pitfall
severity: high
date: 2026-07-15
---

First pitfall.

## Issue two
---
phase: spec
domain: db
type: pattern
severity: medium
date: 2026-07-15
---

Second pattern.

## Issue three (low sev, skipped)
---
phase: spec
domain: style
type: pitfall
severity: low
date: 2026-07-15
---

Skipped due to low severity.
`);
    const result = promoteRun({ changeDir, dir: solDir });
    assert.equal(result.promoted, 2, 'should promote 2 entries (high+medium, skip low)');
  });

  it('appends promoted entry to global INDEX.md', () => {
    writeGlobalIndex(solDir);
    writeLearnings(changeDir, `## DB migration ordering
---
phase: build
domain: db
type: pitfall
severity: high
date: 2026-07-15
---

Migration files must be ordered by timestamp.
`);
    promoteRun({ changeDir, dir: solDir });
    const indexContent = readFileSync(join(solDir, 'INDEX.md'), 'utf-8');
    assert.match(indexContent, /DB migration ordering/);
  });
});
