/**
 * Shared git utilities for multi-repo workspace support.
 *
 * team-flow workspaces may contain multiple independent git repositories
 * (e.g. bff/ and ui/ alongside the main repo). These helpers provide
 * consistent root detection and sub-repo discovery used by:
 * - execution-plan.mjs  (SHA resolution across repos)
 * - arch-merge.mjs      (git add/commit in correct repo)
 * - cmd-prototype.mjs   (workspace root detection)
 * - cmd-publish.mjs     (workspace root detection)
 * - ensure-branch.mjs   (workspace root detection for worktree isolation)
 * - cmd-deisolate.mjs   (workspace root detection for deisolation)
 *
 * @module git-utils
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';

/**
 * Detect the workspace root from a changeDir path by looking for the
 * standard `changes/<name>/` directory layout.
 *
 * @param {string} changeDir - Absolute or relative path to a change directory
 * @returns {string|null} Workspace root (parent of `changes/`), or null if
 *   changeDir is not inside a standard `changes/` layout
 */
export function detectWorkspaceRoot(changeDir) {
  const abs = resolve(changeDir);
  const changesIdx = abs.lastIndexOf(sep + 'changes' + sep);
  return changesIdx > 0 ? abs.slice(0, changesIdx) : null;
}

/**
 * Get the git repository root for a given filesystem path.
 *
 * @param {string} path - Any path inside a git work tree
 * @returns {string} Absolute path to the git repository root
 * @throws {Error} When path is not inside a git work tree
 */
export function getGitRoot(path) {
  try {
    return execFileSync('git', ['-C', path, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new Error(`Path '${path}' is not inside a Git work tree`);
  }
}

/**
 * Scan direct children of workspaceRoot for sub-repositories that contain
 * the given git revision.  A sub-repository is any direct child directory
 * that has a `.git` entry (directory for normal repos, file for worktrees
 * and submodules).
 *
 * Used as a fallback when a SHA cannot be found in the main repo — if the
 * workspace contains independent code repos (bff/, ui/, etc.), the commit
 * may live there instead.
 *
 * @param {string} workspaceRoot - Workspace root directory to scan
 * @param {string} revision - Git revision to look up (SHA, branch, tag)
 * @returns {string|null} Absolute path to the matching sub-repo root,
 *   or null if no sub-repo contains the revision
 */
export function findSubRepo(workspaceRoot, revision) {
  let entries;
  try {
    entries = readdirSync(workspaceRoot, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = join(workspaceRoot, entry.name);
    if (!existsSync(join(candidate, '.git'))) continue;
    try {
      execFileSync('git', ['-C', candidate, 'rev-parse', '--verify', `${revision}^{commit}`], {
        stdio: ['ignore', 'ignore', 'ignore'],
      });
      // Resolve symlinks (macOS /var → /private/var) for consistency with git paths
      return realpathSync(candidate);
    } catch {
      // Not in this sub-repo, continue scanning
    }
  }
  return null;
}
