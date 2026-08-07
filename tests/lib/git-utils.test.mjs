// tests/lib/git-utils.test.mjs
// Multi-repo workspace git utilities — detectWorkspaceRoot, getGitRoot, findSubRepo.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectWorkspaceRoot, getGitRoot, findSubRepo } from '../../scripts/lib/git-utils.mjs';

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

describe('git-utils', () => {
  let root;

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'tf-git-utils-'));
  });

  after(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe('detectWorkspaceRoot', () => {
    it('returns workspace root for standard changes/ layout', () => {
      const changeDir = join(root, 'workspace', 'changes', 'my-change');
      mkdirSync(changeDir, { recursive: true });
      assert.equal(detectWorkspaceRoot(changeDir), join(root, 'workspace'));
    });

    it('returns null for path without changes/ segment', () => {
      const someDir = join(root, 'other', 'path');
      mkdirSync(someDir, { recursive: true });
      assert.equal(detectWorkspaceRoot(someDir), null);
    });

    it('handles nested changes/ correctly (uses last occurrence)', () => {
      // /a/changes/b/changes/c → root = /a/changes/b
      const nested = join(root, 'a', 'changes', 'b', 'changes', 'c');
      mkdirSync(nested, { recursive: true });
      assert.equal(detectWorkspaceRoot(nested), join(root, 'a', 'changes', 'b'));
    });
  });

  describe('getGitRoot', () => {
    it('returns git root for a path inside a repo', () => {
      const repoDir = join(root, 'git-root-test');
      initRepo(repoDir);
      const subDir = join(repoDir, 'sub');
      mkdirSync(subDir);
      // Use realpathSync to handle macOS /var → /private/var symlink
      assert.equal(getGitRoot(subDir), realpathSync(repoDir));
    });

    it('throws for a path outside any git repo', () => {
      const noRepo = join(root, 'no-git-repo');
      mkdirSync(noRepo, { recursive: true });
      assert.throws(() => getGitRoot(noRepo), /not inside a Git work tree/);
    });
  });

  describe('findSubRepo', () => {
    let wsRoot;
    let subRepo;
    let subSha;

    before(() => {
      // Workspace root with a sub-repository
      wsRoot = join(root, 'find-sub-repo-ws');
      mkdirSync(wsRoot, { recursive: true });

      // Main repo (not a real git repo for this test, just a directory)
      // Sub-repo with a unique commit
      subRepo = join(wsRoot, 'bff');
      initRepo(subRepo);
      writeFileSync(join(subRepo, 'feature.txt'), 'new feature\n');
      runGit(subRepo, ['add', '--all']);
      runGit(subRepo, ['commit', '--quiet', '-m', 'feature commit']);
      subSha = runGit(subRepo, ['rev-parse', 'HEAD']);
    });

    it('finds sub-repo containing the given revision', () => {
      const found = findSubRepo(wsRoot, subSha);
      assert.equal(found, realpathSync(subRepo));
    });

    it('returns null when no sub-repo contains the revision', () => {
      assert.equal(findSubRepo(wsRoot, 'deadbeef' + '0'.repeat(33)), null);
    });

    it('returns null for empty workspace', () => {
      const emptyWs = join(root, 'empty-ws');
      mkdirSync(emptyWs, { recursive: true });
      assert.equal(findSubRepo(emptyWs, subSha), null);
    });
  });
});
