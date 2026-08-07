// tests/lib/multi-repo-review.test.mjs
// Multi-repo workspace: recordReview and readCurrentReview with sub-repository SHA.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { recordReview, readCurrentReview, createPlan } from '../../scripts/lib/execution-plan.mjs';
import { readState, writeState } from '../../scripts/lib/state-loader.mjs';

function runGit(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

function initRepo(dir) {
  mkdirSync(dir, { recursive: true });
  runGit(dir, ['init', '--quiet']);
  runGit(dir, ['config', 'user.email', 'test@example.invalid']);
  runGit(dir, ['config', 'user.name', 'Test']);
  writeFileSync(join(dir, 'README.md'), '# repo\n');
  runGit(dir, ['add', '--all']);
  runGit(dir, ['commit', '--quiet', '-m', 'init']);
}

/**
 * Set up a multi-repo workspace with main repo + sub-repo, complete with
 * a valid execution plan so recordReview passes plan validation.
 */
function setupWorkspace() {
  const ws = mkdtempSync(join(tmpdir(), 'tf-multi-repo-'));
  const mainRepo = join(ws, 'main-repo');
  const bffRepo = join(mainRepo, 'bff');
  const changeDir = join(mainRepo, 'changes', 'c1');

  // Create main repo with changes/ layout
  mkdirSync(mainRepo, { recursive: true });
  runGit(mainRepo, ['init', '--quiet']);
  runGit(mainRepo, ['config', 'user.email', 'test@example.invalid']);
  runGit(mainRepo, ['config', 'user.name', 'Multi Repo Test']);

  // Change artifacts (minimum for plan validation)
  mkdirSync(join(changeDir, 'specs', 'cap'), { recursive: true });
  mkdirSync(join(mainRepo, 'docs', 'architecture'), { recursive: true });
  writeFileSync(join(changeDir, 'proposal.md'), '## Why\nMulti-repo test proposal with sufficient content for validation.\n## What Changes\n- Add BFF API');
  writeFileSync(join(changeDir, 'design.md'), '## Context\nMulti-repo test\n## Decisions\n### D1\n- Choice: Sub-repo\n- Rationale: Independence');
  writeFileSync(join(changeDir, 'tasks.md'), '## Tasks\n- [x] 1.1 Implement BFF endpoint');
  writeFileSync(join(changeDir, 'specs', 'cap', 'spec.md'), '## ADDED Requirements\n\n### Requirement: BFF API\nThe system SHALL expose a BFF endpoint.\n\n#### Scenario: Happy path\n- **WHEN** request arrives\n- **THEN** 200 returned\n');
  writeFileSync(join(changeDir, 'execution-contract.md'), '# Contract\n\n## Intent Lock\nMulti-repo test\n');

  // Commit in main repo
  runGit(mainRepo, ['add', '--all']);
  runGit(mainRepo, ['commit', '--quiet', '-m', 'initial setup']);

  // Initialize state with tweak workflow (bypasses recommendation/selection validation)
  const state = readState(changeDir);
  state.state = 'approved-for-build';
  state.workflow = 'tweak';
  state.execution_mode = 'inline';
  state.revision = 1;
  state.change_name = 'c1';
  writeState(changeDir, state);

  // Create execution plan (inline mode, single wave, tweak workflow)
  const planDir = join(changeDir, '.superpowers', 'sdd');
  mkdirSync(planDir, { recursive: true });
  const plan = createPlan(changeDir, {
    mode: 'inline',
    source: 'test-setup',
    rationale: 'multi-repo test',
    waves: [{ id: 'W1', strategy: 'parallel', tasks: ['endpoint'], depends_on: [] }],
  });
  // Write plan to disk (createPlan only validates, doesn't persist)
  writeFileSync(join(planDir, 'execution-plan.json'), `${JSON.stringify(plan, null, 2)}\n`);

  // Update state with plan hash so validatePlan passes
  const stateAfterPlan = readState(changeDir);
  stateAfterPlan.execution_plan_hash = plan.hash;
  stateAfterPlan.execution_plan_revision = plan.revision;
  writeState(changeDir, stateAfterPlan);

  // Create sub-repo with its own commits
  initRepo(bffRepo);
  const bffBase = runGit(bffRepo, ['rev-parse', 'HEAD']);

  writeFileSync(join(bffRepo, 'endpoint.js'), 'module.exports = (req, res) => res.json({ ok: true });\n');
  runGit(bffRepo, ['add', '--all']);
  runGit(bffRepo, ['commit', '--quiet', '-m', 'implement BFF endpoint']);
  const bffHead = runGit(bffRepo, ['rev-parse', 'HEAD']);

  // Report file for review evidence
  const reportPath = join(changeDir, '.superpowers', 'sdd', 'reviews', 'report-W1.md');
  mkdirSync(join(changeDir, '.superpowers', 'sdd', 'reviews'), { recursive: true });
  writeFileSync(reportPath, '# Review Report W1\n\nVerdict: pass\n');

  return { ws, mainRepo, bffRepo, changeDir, bffBase, bffHead, reportPath };
}

describe('multi-repo: recordReview with sub-repository SHA', () => {
  let ws, mainRepo, bffRepo, changeDir, bffBase, bffHead, reportPath;

  before(() => {
    ({ ws, mainRepo, bffRepo, changeDir, bffBase, bffHead, reportPath } = setupWorkspace());
  });

  after(() => {
    rmSync(ws, { recursive: true, force: true });
  });

  it('auto-detects sub-repo and records receipt with repo field', () => {
    // bffBase/bffHead only exist in bffRepo, not in mainRepo.
    // recordReview should auto-detect via findSubRepo fallback.
    const receipt = recordReview(changeDir, 'W1', {
      status: 'pass',
      base: bffBase,
      head: bffHead,
      report: reportPath,
    });

    assert.equal(receipt.base, bffBase);
    assert.equal(receipt.head, bffHead);
    assert.ok(receipt.repo, 'receipt should have repo field');
    assert.ok(receipt.repo.includes('bff'), `repo should reference bff: ${receipt.repo}`);
  });

  it('readCurrentReview can read back receipt with repo field', () => {
    const receipt = readCurrentReview(changeDir, 'W1');
    assert.ok(receipt, 'receipt should be readable');
    assert.equal(receipt.base, bffBase);
    assert.equal(receipt.head, bffHead);
    assert.ok(receipt.repo, 'receipt should have repo field');
  });

  it('succeeds with explicit --repo (repoPath) pointing to sub-repository', () => {
    // Remove existing receipt
    const receiptPath = join(changeDir, '.superpowers', 'sdd', 'reviews', 'W1.json');
    rmSync(receiptPath, { force: true });

    const receipt = recordReview(changeDir, 'W1', {
      status: 'pass',
      base: bffBase,
      head: bffHead,
      report: reportPath,
    }, bffRepo);  // explicit repoPath

    assert.equal(receipt.base, bffBase);
    assert.equal(receipt.head, bffHead);
    assert.ok(receipt.repo, 'receipt should have repo field when explicit');
  });

  it('rejects explicit repoPath that is not a git repository', () => {
    const fakePath = join(ws, 'not-a-repo');
    mkdirSync(fakePath, { recursive: true });

    assert.throws(
      () => recordReview(changeDir, 'W1', {
        status: 'pass',
        base: bffBase,
        head: bffHead,
        report: reportPath,
      }, fakePath),
      /not inside a Git work tree/
    );
  });

  it('does not add repo field for SHA in main repository', () => {
    // Create a commit in the main repo and review it
    writeFileSync(join(mainRepo, 'marker.txt'), 'main repo change\n');
    runGit(mainRepo, ['add', '--all']);
    runGit(mainRepo, ['commit', '--quiet', '-m', 'main change']);
    const mainHead = runGit(mainRepo, ['rev-parse', 'HEAD']);
    const mainBase = runGit(mainRepo, ['rev-parse', 'HEAD~1']);

    // Remove existing receipt
    const receiptPath = join(changeDir, '.superpowers', 'sdd', 'reviews', 'W1.json');
    rmSync(receiptPath, { force: true });

    const receipt = recordReview(changeDir, 'W1', {
      status: 'pass',
      base: mainBase,
      head: mainHead,
      report: reportPath,
    });

    assert.equal(receipt.base, mainBase);
    assert.equal(receipt.head, mainHead);
    assert.equal(receipt.repo, undefined, 'repo field should not be set for main repo SHA');
  });
});
