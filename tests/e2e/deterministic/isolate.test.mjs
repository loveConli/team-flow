// tests/e2e/deterministic/isolate.test.mjs
// Tier 1 确定性：tf isolate（ensure-branch.mjs）多仓库 Case A / 单仓库 Case B / 保护分支前置。
// 来源：workflow-feedback 2026-08-01 #100009（多仓库工作区隔离重构）。
// Case A 触发条件（ensure-branch.mjs:220-228）：change-dir 父目录 basename==='changes' 且 root 下
//   存在含 .git 的直接子目录 → 为每个保护分支仓库在 <root>/.worktrees/<change>/<repo> 建 worktree。
// Case B：不满足 Case A 时回退——把 change-dir 当代码仓库，worktree 建在 ../<repo>-<name>（或 switch -c）。
// 隐藏前置：worktree 只对保护分支(main/master)仓库创建；非保护分支 → "already isolated" 跳过不建。
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { isolate } from '../helpers/oracle.mjs';
import { makeMultiRepoWorkspace } from '../helpers/fixture.mjs';

const PROTECTED = ['main', 'master'];

const cleanups = [];
function track(root) { cleanups.push(root); return root; }
after(() => { for (const root of cleanups) rmSync(root, { recursive: true, force: true }); });

// ── 本地夹具/工具（helper 未提供单仓库夹具与 git 查询，按约束在测试文件内本地实现）─────
function git(dir, ...args) {
  execSync(`git -c user.email=t@t -c user.name=test ${args.join(' ')}`, { cwd: dir, stdio: 'pipe', timeout: 15000 });
}
function gitOut(dir, ...args) {
  return execSync(`git ${args.join(' ')}`, { cwd: dir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

/** 单代码仓库夹具（Case B）：一个 git 仓库在保护分支(默认 master)，父目录 basename 非 'changes'。 */
function makeSingleRepoFixture() {
  const root = mkdtempSync(join(tmpdir(), 'tf-e2e-single-'));
  const repoDir = join(root, 'app-repo');
  mkdirSync(repoDir, { recursive: true });
  writeFileSync(join(repoDir, 'app.txt'), 'reference code\n');
  git(repoDir, 'init', '-q');
  git(repoDir, 'add', '-A');
  git(repoDir, 'commit', '-q', '-m', 'init-app-repo');
  return { root, repoDir };
}

describe('T1 isolate: Case A 多仓库工作区（#100009）', () => {
  it('T1-isolate-caseA：为每个代码仓库建 worktree + .gitignore 忽略 .worktrees/', () => {
    const fix = makeMultiRepoWorkspace({ name: 'C-multi' });
    track(fix.root);
    const slug = basename(fix.changeDir); // 'C-multi'

    const r = isolate(fix.changeDir);
    assert.equal(r.exitCode, 0, `Case A isolate 应 exit 0: ${r.stderr}`);

    // 文件系统断言：每个代码仓库在 <root>/.worktrees/<change>/<repo> 下都有 worktree（.git 链接 + 参考代码）。
    for (const repo of fix.repos) {
      const wt = join(fix.root, '.worktrees', slug, repo);
      assert.ok(existsSync(join(wt, '.git')), `${repo} worktree 应含 .git 链接: ${wt}`);
      assert.ok(existsSync(join(wt, 'app.txt')), `${repo} worktree 应含参考代码 app.txt: ${wt}`);
    }

    // 工作区根 .gitignore 应已追加 '.worktrees/'，避免 worktree 产物污染根仓库。
    const gitignore = readFileSync(join(fix.root, '.gitignore'), 'utf-8');
    assert.match(gitignore, /\.worktrees\//, '.gitignore 应含 .worktrees/ 忽略项');
  });

  it('T1-isolate-idempotent：同一 changeDir 重复 isolate 复用 worktree（exit 0 不报错）', () => {
    const fix = makeMultiRepoWorkspace({ name: 'C-idem' });
    track(fix.root);

    const first = isolate(fix.changeDir);
    assert.equal(first.exitCode, 0, `首次 isolate 应 exit 0: ${first.stderr}`);

    // ensure-branch.mjs:122 幂等分支——worktree 已存在则 reuse，不再 "already exists" 报错。
    const second = isolate(fix.changeDir);
    assert.equal(second.exitCode, 0, `二次 isolate 应复用并 exit 0: ${second.stderr}`);
  });

  it('T1-isolate-protected-only：只对保护分支仓库建 worktree（非保护分支 already isolated 跳过）', () => {
    const fix = makeMultiRepoWorkspace({ name: 'C-prot' });
    track(fix.root);
    const slug = basename(fix.changeDir);

    // 把 repo-a 切到非保护分支 → 已隔离；repo-b 仍在保护分支(master)。
    git(join(fix.root, 'repo-a'), 'switch', '-c', 'feature-x');
    assert.ok(!PROTECTED.includes(gitOut(join(fix.root, 'repo-a'), 'branch', '--show-current')), 'repo-a 应已离开保护分支');

    const r = isolate(fix.changeDir);
    assert.equal(r.exitCode, 0, `isolate 应 exit 0: ${r.stderr}`);

    // repo-a 非保护分支 → 不建 worktree；repo-b 保护分支 → 建 worktree。
    assert.equal(existsSync(join(fix.root, '.worktrees', slug, 'repo-a', '.git')), false,
      'repo-a 已在非保护分支，不应建 worktree');
    assert.equal(existsSync(join(fix.root, '.worktrees', slug, 'repo-b', '.git')), true,
      'repo-b 在保护分支，应建 worktree');
  });
});

describe('T1 isolate: Case B 单代码仓库（#100009 遗留兼容）', () => {
  it('T1-isolate-caseB：单仓库在保护分支 → 建 ../ worktree 或 switch -c，离开保护上下文', () => {
    const { root, repoDir } = makeSingleRepoFixture();
    track(root);
    // 前置：默认分支为保护分支（本环境 git init 默认 master）。
    assert.ok(PROTECTED.includes(gitOut(repoDir, 'branch', '--show-current')), '夹具应起始于保护分支');

    const r = isolate(repoDir);
    assert.equal(r.exitCode, 0, `Case B isolate 应 exit 0: ${r.stderr}`);

    // Case B（ensure-branch.mjs:169-217）：worktree add ../<repo>-<name>（首选）或 switch -c（回退）。
    // repoName='app-repo'，未传 change-name → name='app-repo'，worktree 位于 ../app-repo-app-repo。
    const branchAfter = gitOut(repoDir, 'branch', '--show-current');
    const worktreeBuilt = existsSync(join(root, 'app-repo-app-repo', '.git'));
    assert.ok(!PROTECTED.includes(branchAfter) || worktreeBuilt,
      `Case B 后应已离开保护分支(当前 '${branchAfter}')或已建 worktree(${worktreeBuilt})`);
  });
});
