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
      force: { type: 'boolean', default: false }, // v0.43.1：跳过 dirty 阻断
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

  // v0.43.1：merge 失败（冲突 / dirty 阻断）→ exit 非零，调用方（release-archivist）可检测。
  // nothing-to-merge（success + skipped）不算失败。
  if (results.some(r => r.merge && r.merge.success === false)) {
    process.exitCode = 1;
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

  // 操作（v0.43.1：合并前防护——dirty 阻断 / ahead==0 短路，设计增强方案 v0.18 §74）
  if (values.merge) {
    result.merge = doMerge(repo, branch, masterBranch, result, values);
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

// v0.43.1：合并前防护（设计增强方案 v0.18 §74）
// 1. dirty 阻断：worktree 有未提交改动时默认不合并（避免改动混入 master），--force 跳过
// 2. ahead==0 短路：分支相对目标分支无新 commit 时跳过合并（幂等，可安全重复调用）
// 3. 冲突报告：merge 失败时解析 unmerged 文件列表，引导人工解决而非静默失败
function doMerge(repo, branch, masterBranch, state, values) {
  if (state.dirty === true && !values.force) {
    return {
      success: false,
      skipped: 'dirty',
      message: `Worktree has uncommitted changes — commit or stash them before merging, or use --force`,
    };
  }
  if (typeof state.ahead === 'number' && state.ahead === 0) {
    return {
      success: true,
      skipped: 'nothing-to-merge',
      message: `Branch '${branch}' is up to date with '${masterBranch}' — nothing to merge`,
    };
  }
  return mergeBranch(repo, branch, masterBranch);
}

function mergeBranch(repo, branch, masterBranch) {
  try {
    const output = execFileSync('git', ['merge', branch, '--no-edit'], {
      encoding: 'utf-8', cwd: repo.repoPath, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { success: true, message: output.trim() };
  } catch (e) {
    const raw = (e.stderr || e.stdout || e.message || '').toString().trim();
    const conflicts = collectConflicts(repo.repoPath);
    return {
      success: false,
      conflicts,
      message: conflicts.length > 0
        ? `Merge conflict in ${conflicts.length} file(s): ${conflicts.join(', ')}. Resolve manually, then 'git add' + 'git commit' to complete the merge.`
        : raw,
    };
  }
}

// v0.43.1：解析 merge 冲突的 unmerged 文件列表（git status --porcelain 的 UU/AA/DD/AU/UA/DU/UD）
function collectConflicts(repoPath) {
  try {
    const status = execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf-8', cwd: repoPath, stdio: ['ignore', 'pipe', 'pipe'],
    });
    return status
      .split('\n')
      .filter(line => /^(UU|AA|DD|AU|UA|DU|UD)/.test(line.trim()))
      .map(line => line.trim().replace(/^(UU|AA|DD|AU|UA|DU|UD)\s+/, ''));
  } catch {
    return [];
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
      if (r.merge.skipped === 'nothing-to-merge') {
        console.log(`    Merge: ⏭️  ${r.merge.message}`);
      } else if (r.merge.skipped === 'dirty') {
        console.log(`    Merge: ⛔ ${r.merge.message}`);
      } else if (r.merge.success) {
        console.log(`    Merge: ✅ ${r.merge.message}`);
      } else {
        console.log(`    Merge: ❌ ${r.merge.message}`);
        if (r.merge.conflicts && r.merge.conflicts.length > 0) {
          console.log(`    Conflicts: ${r.merge.conflicts.length} file(s)`);
        }
      }
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
  tf deisolate <change-dir> --merge --force     # merge even with uncommitted changes
  tf deisolate <change-dir> --merge --clean     # merge + remove worktree + delete branch
  tf deisolate <change-dir> --clean             # remove worktree only (no merge)
  tf deisolate <change-dir> --json              # JSON output`);
}
