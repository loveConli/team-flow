#!/usr/bin/env node
// install-git-hooks.mjs — install git hooks for team-flow repo
// Run with: npm run setup-hooks  (or node scripts/install-git-hooks.mjs)
//
// Installs a pre-commit hook that checks version consistency.
// Automatically run post-install so every contributor gets the guard.

import { writeFileSync, existsSync, chmodSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
// Ask Git for the common hooks directory so linked worktrees install correctly.
// `git rev-parse --git-path hooks` may be relative in a normal checkout.
const HOOKS_DIR = resolve(ROOT, execFileSync('git', ['rev-parse', '--git-path', 'hooks'], {
  cwd: ROOT,
  encoding: 'utf8',
}).trim());
const HOOK_PATH = join(HOOKS_DIR, 'pre-commit');

const HOOK_SCRIPT = `#!/bin/sh
# team-flow pre-commit hook — auto-check and fix version consistency
# Installed by: npm run setup-hooks
# Features:
#   1. Run check-version-consistency (blocking on version mismatch)
#   2. Auto-fix skill count and npx references (--fix mode)
#   3. Re-stage fixed files so they're included in the commit
# To bypass: git commit --no-verify

set -e

echo "🔍 Running pre-commit version consistency check..."

REPO_ROOT="$(git rev-parse --show-toplevel)"

cd "$REPO_ROOT"

# Run check-versions with auto-fix
if node scripts/check-version-consistency.mjs --fix; then
  # Check if any files were modified by auto-fix
  MODIFIED=$(git diff --name-only)
  if [ -n "$MODIFIED" ]; then
    echo "📝 Auto-fixed files detected, re-staging..."
    echo "$MODIFIED" | xargs git add
    echo "✅ Fixed files staged for commit"
  fi
  exit 0
else
  echo ""
  echo "❌ Pre-commit check failed: version consistency issues found"
  echo "   Fix the issues above and try again"
  exit 1
fi
`;

if (!existsSync(HOOKS_DIR)) {
  console.error('❌ Not inside a git repository (no .git/hooks/).');
  process.exit(1);
}

// Preserve an unrelated hook, but upgrade an older team-flow hook.
const MARKER = '# team-flow pre-commit hook';
if (existsSync(HOOK_PATH)) {
  const existing = readFileSync(HOOK_PATH, 'utf-8');
  if (existing.includes(MARKER)) {
    if (existing === HOOK_SCRIPT) {
      console.log('✅ Pre-commit hook already installed (team-flow).');
      process.exit(0);
    }
    console.log('♻️  Updating existing pre-commit hook (team-flow).');
  } else {
    console.log('⚠️  Existing pre-commit hook found. Backing up to pre-commit.backup ...');
    writeFileSync(`${HOOK_PATH}.backup`, existing);
  }
}

writeFileSync(HOOK_PATH, HOOK_SCRIPT);
chmodSync(HOOK_PATH, 0o755);
console.log('✅ Pre-commit hook installed — version consistency checked before every commit.');
console.log('   To bypass: git commit --no-verify');
