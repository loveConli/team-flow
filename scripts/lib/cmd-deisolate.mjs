#!/usr/bin/env node
// scripts/lib/cmd-deisolate.mjs — worktree deisolation (v0.35.0)
//
// 检测 change 的 worktree 状态，输出合并建议或执行合并/清理。
// 与 ensure-branch.mjs（创建）对称，补全 worktree 生命周期。
//
// Usage:
//   tf deisolate <change-dir>                  # dry-run: 输出状态报告
//   tf deisolate <change-dir> --merge          # 合并 worktree 分支回 master
//   tf deisolate <change-dir> --merge --clean  # 合并后删除 worktree + 分支
//   tf deisolate <change-dir> --clean          # 仅删除 worktree（不合并）
//
// 布局识别（对称 ensure-branch.mjs）：
//   Case A 多仓库工作区：<root>/.worktrees/<change>/<repo>/ 存在
//   Case B 单仓库：<change-dir> 同级 ../<repo>-<change-name> 存在

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { detectWorkspaceRoot } from './git-utils.mjs';

export async function run(args) {
  const { positionals, values } = parseArgs({
    args,
    options: {
      merge: { type: 'boolean', default: false },
      clean: { type: 'boolean', default: false },
      'project-root': { type: 'string' },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    printHelp();
    return;
  }

  const changeDir = resolve(positionals[0]);
  const changeName = basename(changeDir);

  // 检测布局
  const workspaceRoot = detectWorkspaceRoot(changeDir);
  const caseA = workspaceRoot ? detectCaseA(workspaceRoot, changeName) : null;
  const caseB = detectCaseB(changeDir, changeName);

  if (!caseA && !caseB) {
    const msg = `No worktrees found for change '${changeName}'.`;
    if (values.json) {
      console.log(JSON.stringify({ found: false, message: msg }));
    } else {
      console.log(`✅ ${msg}`);
    }
    return;
  }

  const repos = caseA || caseB;
  const results = [];

  for (const repo of repos) {
    const result = processRepo(repo, values);
    results.push(result);
  }

  if (values.json) {
    console.log(JSON.stringify({ found: true, repos: results }, null, 2));
  } else {
    printReport(results, values);
  }
}


// Case A: <root>/.worktrees/<change>/<repo>/
function detectCaseA(root, changeName) {
  const changeWorktreeDir = join(root, '.worktrees', changeName);
  if (!existsSync(changeWorktreeDir)) return null;

  let entries;
  try {
    entries = readdirSync(changeWorktreeDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const repos = entries
    .filter(e => e.isDirectory() && existsSync(join(changeWorktreeDir, e.name, '.git')))
    .map(e => ({
      name: e.name,
      worktreePath: join(changeWorktreeDir, e.name),
      repoPath: join(root, e.name),
      layout: 'A',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return repos.length > 0 ? repos : null;
}

// Case B: ../<repo>-<change-name>
function detectCaseB(changeDir, changeName) {
  const parentDir = dirname(changeDir);
  const repoName = basename(changeDir) || 'repo';
  // 旧 ensure-branch 行为：worktree 在 ../<repo>-<name>
  // 分支名经过 sanitize，这里用 changeName 作为近似匹配
  const candidates = [
    join(parentDir, `${repoName}-${changeName}`),
    join(parentDir, `${repoName}-${basename(changeDir)}`),
  ];

  for (const wtPath of candidates) {
    if (existsSync(join(wtPath, '.git'))) {
      return [{
        name: repoName,
        worktreePath: wtPath,
        repoPath: changeDir,
        layout: 'B',
      }];
    }
  }
  return null;
}

function processRepo(repo, values) {
  const result = { name: repo.name, worktreePath: repo.worktreePath, layout: repo.layout };

  // 获取 worktree 分支名
  let branch = '';
  try {
    branch = (execFileSync('git', ['branch', '--show-current'], {
      encoding: 'utf-8', cwd: repo.worktreePath, stdio: ['ignore', 'pipe', 'pipe'],
    }) || '').trim();
  } catch {
    result.status = 'error';
    result.message = 'Could not determine worktree branch';
    return result;
  }
  result.branch = branch;

  // 获取相对 master 的 diff
  const masterBranch = detectMasterBranch(repo.repoPath);
  try {
    const ahead = (execFileSync('git', ['rev-list', '--count', `${masterBranch}..${branch}`], {
      encoding: 'utf-8', cwd: repo.worktreePath, stdio: ['ignore', 'pipe', 'pipe'],
    }) || '0').trim();
    const behind = (execFileSync('git', ['rev-list', '--count', `${branch}..${masterBranch}`], {
      encoding: 'utf-8', cwd: repo.worktreePath, stdio: ['ignore', 'pipe', 'pipe'],
    }) || '0').trim();
    result.ahead = parseInt(ahead, 10);
    result.behind = parseInt(behind, 10);
  } catch {
    result.ahead = '?';
    result.behind = '?';
  }

  // 检查未提交改动
  try {
    const status = execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf-8', cwd: repo.worktreePath, stdio: ['ignore', 'pipe', 'pipe'],
    });
    result.dirty = status.trim().length > 0;
  } catch {
    result.dirty = '?';
  }

  // 操作
  if (values.merge) {
    result.merge = mergeBranch(repo, branch, masterBranch);
  }
  if (values.clean) {
    result.clean = cleanWorktree(repo, branch);
  }

  result.status = 'ok';
  return result;
}

function detectMasterBranch(repoPath) {
  try {
    const branch = (execFileSync('git', ['branch', '--show-current'], {
      encoding: 'utf-8', cwd: repoPath, stdio: ['ignore', 'pipe', 'pipe'],
    }) || '').trim();
    if (branch) return branch;
  } catch { /* ignore */ }
  // fallback: try master, then main
  for (const candidate of ['master', 'main']) {
    try {
      execFileSync('git', ['rev-parse', `refs/heads/${candidate}`], {
        encoding: 'utf-8', cwd: repoPath, stdio: ['ignore', 'pipe', 'pipe'],
      });
      return candidate;
    } catch { /* continue */ }
  }
  return 'master';
}

function mergeBranch(repo, branch, masterBranch) {
  try {
    const output = execFileSync('git', ['merge', branch, '--no-edit'], {
      encoding: 'utf-8', cwd: repo.repoPath, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { success: true, message: output.trim() };
  } catch (e) {
    return { success: false, message: (e.stderr || e.stdout || e.message || '').toString().trim() };
  }
}

function cleanWorktree(repo, branch) {
  const result = { worktreeRemoved: false, branchDeleted: false, errors: [] };

  // Remove worktree
  try {
    execFileSync('git', ['worktree', 'remove', repo.worktreePath, '--force'], {
      encoding: 'utf-8', cwd: repo.repoPath, stdio: ['ignore', 'pipe', 'pipe'],
    });
    result.worktreeRemoved = true;
  } catch (e) {
    result.errors.push(`worktree remove: ${(e.stderr || e.message || '').toString().trim()}`);
    // Fallback: rm -rf
    try {
      rmSync(repo.worktreePath, { recursive: true, force: true });
      result.worktreeRemoved = true;
    } catch (e2) {
      result.errors.push(`rm fallback: ${e2.message}`);
    }
  }

  // Delete branch (skip if merged)
  try {
    execFileSync('git', ['branch', '-d', branch], {
      encoding: 'utf-8', cwd: repo.repoPath, stdio: ['ignore', 'pipe', 'pipe'],
    });
    result.branchDeleted = true;
  } catch {
    // Branch not merged — use -D only if --force equivalent
    try {
      execFileSync('git', ['branch', '-D', branch], {
        encoding: 'utf-8', cwd: repo.repoPath, stdio: ['ignore', 'pipe', 'pipe'],
      });
      result.branchDeleted = true;
    } catch (e) {
      result.errors.push(`branch delete: ${(e.stderr || e.message || '').toString().trim()}`);
    }
  }

  return result;
}

function printReport(results, values) {
  console.log(`\n📦 Worktree Deisolation Report\n`);

  for (const r of results) {
    console.log(`  Repo: ${r.name} (${r.layout === 'A' ? 'multi-repo' : 'single-repo'})`);
    console.log(`    Branch: ${r.branch || 'unknown'}`);
    console.log(`    Worktree: ${r.worktreePath}`);
    if (r.ahead !== undefined) {
      console.log(`    Ahead of master: ${r.ahead} commit(s)`);
      console.log(`    Behind master: ${r.behind} commit(s)`);
    }
    console.log(`    Uncommitted changes: ${r.dirty === true ? '⚠️  YES' : r.dirty === false ? 'no' : 'unknown'}`);

    if (r.merge) {
      console.log(`    Merge: ${r.merge.success ? '✅ ' + r.merge.message : '❌ ' + r.merge.message}`);
    }
    if (r.clean) {
      console.log(`    Worktree removed: ${r.clean.worktreeRemoved ? '✅' : '❌'}`);
      console.log(`    Branch deleted: ${r.clean.branchDeleted ? '✅' : '❌'}`);
      if (r.clean.errors.length > 0) {
        console.log(`    Clean errors: ${r.clean.errors.join('; ')}`);
      }
    }
    console.log();
  }

  if (!values.merge && !values.clean) {
    console.log(`  To merge: tf deisolate <change-dir> --merge`);
    console.log(`  To clean: tf deisolate <change-dir> --merge --clean`);
  }
}

function printHelp() {
  console.log(`Usage:
  tf deisolate <change-dir>                    # dry-run: show worktree status
  tf deisolate <change-dir> --merge             # merge worktree branch back to master
  tf deisolate <change-dir> --merge --clean     # merge + remove worktree + delete branch
  tf deisolate <change-dir> --clean             # remove worktree only (no merge)
  tf deisolate <change-dir> --json              # JSON output`);
}
