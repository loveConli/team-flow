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
const CLI = join(ROOT, 'scripts', 'team-flow.mjs');

function git(dir, ...args) {
  // 带空格的参数（如 commit message）加单引号，避免 shell 分词
  const quoted = args.map(a => /[\s"'$]/.test(a) ? `'${a.replace(/'/g, "'\\''")}'` : a).join(' ');
  execSync(`git -c user.email=t@t -c user.name=test ${quoted}`, {
    cwd: dir, stdio: 'pipe', timeout: 15000,
  });
}

function run(changeDir, args) {
  try {
    const out = execSync(`node ${CLI} deisolate ${changeDir} ${args}`, {
      encoding: 'utf-8', stdio: 'pipe', timeout: 15000,
    });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out: `${e.stdout || ''}\n${e.stderr || ''}` || e.message };
  }
}

// Case A 多仓库布局 fixture：<root>/.worktrees/<change>/<repo>/（主仓库 <root>/<repo>）
function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'tf-deiso-'));
  const repoDir = join(root, 'bff');
  const changeName = 'v1-c1-test';
  const changeDir = join(root, 'changes', changeName);
  const worktreeDir = join(root, '.worktrees', changeName, 'bff');
  mkdirSync(repoDir, { recursive: true });
  git(repoDir, 'init', '-q', '-b', 'master');
  writeFileSync(join(repoDir, 'README.md'), 'base');
  git(repoDir, 'add', '-A');
  git(repoDir, 'commit', '-q', '-m', 'init');
  return { root, repoDir, changeDir, worktreeDir };
}

function addWorktree(fx) {
  execSync(`git worktree add -b feature/v1-c1-test ${fx.worktreeDir}`, {
    cwd: fx.repoDir, stdio: 'pipe', timeout: 15000,
  });
}

function cleanup(fx) {
  try { git(fx.repoDir, 'worktree', 'remove', '--force', fx.worktreeDir); } catch { /* ignore */ }
  rmSync(fx.root, { recursive: true, force: true });
}

describe('deisolate: no worktree', () => {
  it('reports no worktrees found', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tf-deiso-none-'));
    try {
      const r = run(join(dir, 'changes', 'x'), '');
      assert.equal(r.ok, true);
      assert.match(r.out, /No worktrees found/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('deisolate: dry-run + merge + idempotency', () => {
  let fx;
  before(() => {
    fx = makeFixture();
    addWorktree(fx);
    writeFileSync(join(fx.worktreeDir, 'feature.txt'), 'hello');
    git(fx.worktreeDir, 'add', '-A');
    git(fx.worktreeDir, 'commit', '-q', '-m', 'feature work');
  });
  after(() => cleanup(fx));

  it('dry-run reports ahead commits and branch', () => {
    const r = run(fx.changeDir, '');
    assert.equal(r.ok, true);
    assert.match(r.out, /Ahead of master: 1/);
    assert.match(r.out, /feature\/v1-c1-test/);
    assert.match(r.out, /To merge: tf deisolate/);
  });

  it('--merge merges worktree branch into master', () => {
    const r = run(fx.changeDir, '--merge');
    assert.equal(r.ok, true);
    assert.match(r.out, /Merge: ✅/);
    // master 现在包含 feature.txt
    const masterFile = readFileSync(join(fx.repoDir, 'feature.txt'), 'utf-8');
    assert.equal(masterFile, 'hello');
  });

  it('--merge again → nothing to merge (idempotent)', () => {
    const r = run(fx.changeDir, '--merge');
    assert.equal(r.ok, true);
    assert.match(r.out, /nothing to merge/);
  });
});

describe('deisolate: --merge dirty guard (v0.43.1)', () => {
  let fx;
  before(() => {
    fx = makeFixture();
    addWorktree(fx);
    writeFileSync(join(fx.worktreeDir, 'feature.txt'), 'hello');
    git(fx.worktreeDir, 'add', '-A');
    git(fx.worktreeDir, 'commit', '-q', '-m', 'feature work');
    // 制造未提交改动
    writeFileSync(join(fx.worktreeDir, 'uncommitted.txt'), 'dirty');
  });
  after(() => cleanup(fx));

  it('blocks merge when worktree has uncommitted changes', () => {
    const r = run(fx.changeDir, '--merge');
    assert.equal(r.ok, false); // exit 非零
    assert.match(r.out, /uncommitted changes/);
    // master 未被污染
    assert.equal(existsSync(join(fx.repoDir, 'uncommitted.txt')), false);
  });

  it('--merge --force proceeds despite uncommitted changes', () => {
    const r = run(fx.changeDir, '--merge --force');
    assert.equal(r.ok, true);
    assert.match(r.out, /Merge: ✅/);
    // merge 只合并已提交 commit：已提交的 feature.txt 进入 master，未提交的 uncommitted.txt 不混入
    assert.equal(existsSync(join(fx.repoDir, 'feature.txt')), true);
    assert.equal(existsSync(join(fx.repoDir, 'uncommitted.txt')), false);
  });
});

describe('deisolate: --merge conflict report (v0.43.1)', () => {
  let fx;
  before(() => {
    fx = makeFixture();
    addWorktree(fx);
    // master 侧修改 README.md
    writeFileSync(join(fx.repoDir, 'README.md'), 'master change');
    git(fx.repoDir, 'add', '-A');
    git(fx.repoDir, 'commit', '-q', '-m', 'master change');
    // worktree 侧修改 README.md（不同内容）
    writeFileSync(join(fx.worktreeDir, 'README.md'), 'worktree change');
    git(fx.worktreeDir, 'add', '-A');
    git(fx.worktreeDir, 'commit', '-q', '-m', 'worktree change');
  });
  after(() => cleanup(fx));

  it('reports conflict files and exits non-zero', () => {
    const r = run(fx.changeDir, '--merge');
    assert.equal(r.ok, false);
    assert.match(r.out, /Merge conflict/);
    assert.match(r.out, /README\.md/);
  });
});

describe('deisolate: --merge --clean full lifecycle', () => {
  let fx;
  before(() => {
    fx = makeFixture();
    addWorktree(fx);
    writeFileSync(join(fx.worktreeDir, 'feature.txt'), 'hello');
    git(fx.worktreeDir, 'add', '-A');
    git(fx.worktreeDir, 'commit', '-q', '-m', 'feature work');
  });
  after(() => cleanup(fx));

  it('merges, removes worktree, deletes branch', () => {
    const r = run(fx.changeDir, '--merge --clean');
    assert.equal(r.ok, true);
    assert.match(r.out, /Merge: ✅/);
    assert.match(r.out, /Worktree removed: ✅/);
    // worktree 目录被移除
    assert.equal(existsSync(fx.worktreeDir), false);
  });
});
