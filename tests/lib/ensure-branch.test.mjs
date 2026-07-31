// tests/lib/ensure-branch.test.mjs
// Regression for #15: git branch isolation must be enforceable, not just advised.
// `ensure-branch.mjs` must refuse to proceed on a protected branch when it cannot
// isolate, and must allow work on a non-protected branch.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ENSURE = join(ROOT, 'scripts', 'ensure-branch.mjs');

function run(args) {
  try {
    const out = execSync(`node ${ENSURE} ${args}`, { encoding: 'utf-8', stdio: 'pipe', timeout: 10000 });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: `${e.stdout || ''}\n${e.stderr || ''}` || e.message };
  }
}

function git(dir, ...args) {
  execSync(`git -c user.email=t@t -c user.name=test ${args.join(' ')}`, { cwd: dir, stdio: 'pipe', timeout: 10000 });
}

describe('BUG/#15: ensure-branch enforces isolation', () => {
  let plainDir, repoDir;
  before(() => {
    plainDir = mkdtempSync(join(tmpdir(), 'tf-ensure-plain-'));
    repoDir = mkdtempSync(join(tmpdir(), 'tf-ensure-repo-'));
    mkdirSync(join(repoDir, 'specs'), { recursive: true });
    writeFileSync(join(repoDir, 'README.md'), 'x');
    git(repoDir, 'init', '-q');
    git(repoDir, 'add', '-A');
    git(repoDir, 'commit', '-q', '-m', 'init');
    git(repoDir, 'checkout', '-q', '-b', 'feature/work');
  });
  after(() => {
    if (existsSync(plainDir)) rmSync(plainDir, { recursive: true, force: true });
    if (existsSync(repoDir)) rmSync(repoDir, { recursive: true, force: true });
  });

  it('SHALL refuse (non-zero) when not inside a git repository', () => {
    const r = run(`"${plainDir}"`);
    assert.equal(r.ok, false, 'ensure-branch must fail outside a git repo');
  });

  it('SHALL allow (zero) work on a non-protected branch', () => {
    const r = run(`"${repoDir}"`);
    assert.equal(r.ok, true, `ensure-branch should pass on feature branch, got: ${r.out}`);
    assert.match(r.out, /already isolated/i);
  });
});

// 来源：workflow-feedback 2026-08-01 #100009
// Case A 多仓库工作区：工作区根是近空壳 git 仓库（仅 .gitignore），真正业务代码在
// 平级独立仓库（各含 .git）。change-dir 位于 <root>/changes/<name>。tf isolate 必须
// 为每个代码仓库在 <root>/.worktrees/<change>/<repo> 建 worktree，实现子代理才能
// 看到与主工作区一致的参考代码（而非空工作区副本）。
describe('FEEDBACK/#100009: multi-repo workspace isolation (Case A)', () => {
  let root;
  const changeName = 'C2-multi';
  before(() => {
    root = mkdtempSync(join(tmpdir(), 'tf-ensure-ws-'));
    // 工作区根：近空壳 git 仓库（仅跟踪 .gitignore）
    writeFileSync(join(root, '.gitignore'), 'node_modules/\n');
    git(root, 'init', '-q');
    git(root, 'add', '-A');
    git(root, 'commit', '-q', '-m', 'init-workspace');
    // change 目录位于工作区根下（<root>/changes/<name>）
    mkdirSync(join(root, 'changes', changeName), { recursive: true });
    // 两个独立代码仓库，各自 git init+commit，处于默认分支（master/main，均属 PROTECTED）
    for (const repo of ['repo-a', 'repo-b']) {
      const repoDir = join(root, repo);
      mkdirSync(repoDir, { recursive: true });
      writeFileSync(join(repoDir, 'app.txt'), `${repo} reference code\n`);
      git(repoDir, 'init', '-q');
      git(repoDir, 'add', '-A');
      git(repoDir, 'commit', '-q', '-m', `init-${repo}`);
    }
  });
  after(() => {
    if (existsSync(root)) rmSync(root, { recursive: true, force: true });
  });

  it('SHALL create a worktree per code repo under <root>/.worktrees/<change>/', () => {
    const changeDir = join(root, 'changes', changeName);
    const r = run(`"${changeDir}"`);
    assert.equal(r.ok, true, `ensure-branch should isolate a multi-repo workspace, got: ${r.out}`);

    const wtA = join(root, '.worktrees', changeName, 'repo-a');
    const wtB = join(root, '.worktrees', changeName, 'repo-b');
    assert.ok(existsSync(wtA), 'worktree for repo-a must be created');
    assert.ok(existsSync(wtB), 'worktree for repo-b must be created');
    // 各 worktree 含对应仓库文件（实现子代理可参考既有代码，而非空副本）
    assert.ok(existsSync(join(wtA, 'app.txt')), 'repo-a worktree must contain its files');
    assert.ok(existsSync(join(wtB, 'app.txt')), 'repo-b worktree must contain its files');
  });

  it('SHALL add .worktrees/ to <root>/.gitignore', () => {
    const gi = readFileSync(join(root, '.gitignore'), 'utf-8');
    assert.match(gi, /\.worktrees\//, '.gitignore must ignore .worktrees/');
  });
});
