#!/usr/bin/env node
/**
 * prototype — 原型仓库版本 worktree 隔离（v0.37.0 §68.4）
 *
 * 用法：
 *   tf prototype branch <prd-vN>                # 创建/复用原型版本 worktree（隔离 + 团队拉取）
 *   tf prototype deisolate <prd-vN> [--merge] [--clean]
 *                                               # 版本收尾：merge 回主干 + 清理 worktree
 *
 * 设计（v0.15 §68.4/§68.6）：
 * - 原型为独立 git 仓库（有远程），位置约定 = <workspace>/prototype/
 * - 隔离单位 = PRD 版本（分支 `prd-vN`），worktree 布局 = <workspace>/.worktrees/prd-vN/prototype/
 *   （与代码实施 ensure-branch 的 .worktrees/ 统一隔离区同构，gitignored）
 * - branch：幂等（已有 worktree 复用）；从远程拉 prd-vN（远程存在）或从主干创建（不存在）
 *   —— worktree 命令同时是团队查看者的一键拉取入口（§68.6）
 * - deisolate：版本收尾（change_dag 该版本全部 closing）时 merge `prd-vN` 回主干 + 清理
 *   （方案 A，LT 决策 2026-08-05：merge 时机 = 版本收尾，一次 merge 干净）
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, appendFileSync, readFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { detectWorkspaceRoot } from './git-utils.mjs';

const PROTECTED = ['main', 'master'];

/** git 执行封装（统一 encoding + 错误降级）。 */
function git(cwd, ...args) {
  return execFileSync('git', args, { encoding: 'utf-8', cwd, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** 规范化 PRD 版本参数 → `prd-vN`。接受 "v2"/"2"/"prd-v2"。 */
function normalizeBranchName(raw) {
  const cleaned = String(raw || '').trim();
  if (!cleaned) throw new Error('缺少 PRD 版本参数（如 tf prototype branch v2）');
  if (/^prd-v\d+/i.test(cleaned)) return cleaned.toLowerCase();
  const v = cleaned.replace(/^v/i, '');
  if (!/^\d+$/.test(v)) throw new Error(`非法 PRD 版本：${raw}（应为 vN，如 v2）`);
  return `prd-v${v}`;
}

/** 定位 workspace root（cwd 在主仓库内）与原型仓库路径。 */
function resolveLayout(projectRootArg) {
  let workspaceRoot;
  if (projectRootArg) {
    workspaceRoot = resolve(projectRootArg);
  } else {
    // 优先从 changes/ 布局推断（worktree 中 cwd 可能不是主仓库）
    workspaceRoot = detectWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      try {
        workspaceRoot = git(process.cwd(), 'rev-parse', '--show-toplevel');
      } catch {
        throw new Error('无法定位 workspace root：cwd 不在 git 仓库内？请使用 --project-root 指定');
      }
    }
  }
  const protoRepo = join(workspaceRoot, 'prototype');
  if (!existsSync(join(protoRepo, '.git'))) {
    throw new Error(`原型仓库不存在或非 git 仓库：${protoRepo}\n  约定：原型仓库 = <workspace>/prototype/（独立 git 仓库，有远程）`);
  }
  return { workspaceRoot, protoRepo };
}

function ensureWorktreeGitignore(root) {
  const gitignorePath = join(root, '.gitignore');
  let existing = '';
  try { existing = readFileSync(gitignorePath, 'utf-8'); } catch { existing = ''; }
  const already = existing.split(/\r?\n/).map(l => l.trim()).some(l => l === '.worktrees/' || l === '.worktrees');
  if (already) return;
  appendFileSync(gitignorePath, `${existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''}.worktrees/\n`);
  console.log(`prototype: added '.worktrees/' to ${gitignorePath}.`);
}

/** 检查远程 prd-vN 分支是否存在。 */
function remoteBranchExists(protoRepo, branch) {
  try {
    git(protoRepo, 'rev-parse', '--verify', `origin/${branch}`);
    return true;
  } catch {
    return false;
  }
}

/** 检查本地 prd-vN 分支是否存在。 */
function localBranchExists(protoRepo, branch) {
  try {
    git(protoRepo, 'rev-parse', '--verify', `refs/heads/${branch}`);
    return true;
  } catch {
    return false;
  }
}

/** 子命令 branch：创建/复用原型版本 worktree。 */
function cmdBranch(branchName, projectRootArg) {
  const { workspaceRoot, protoRepo } = resolveLayout(projectRootArg);
  const wtPath = join(workspaceRoot, '.worktrees', branchName, basename(protoRepo));

  // 幂等：worktree 已存在 → 复用
  if (existsSync(join(wtPath, '.git'))) {
    console.log(`prototype: worktree 已存在，复用 ${wtPath}`);
    console.log(`  分支：${branchName}（原型版本 ${branchName} 的工作区）`);
    return { created: false, reused: true, worktreePath: wtPath };
  }

  ensureWorktreeGitignore(workspaceRoot);

  // fetch 远程，获取团队已推送的 prd-vN
  try { git(protoRepo, 'fetch', 'origin'); } catch { /* 远程不可达时降级为本地创建 */ }

  const fromRemote = remoteBranchExists(protoRepo, branchName);
  try {
    if (fromRemote) {
      git(protoRepo, 'worktree', 'add', wtPath, '-b', branchName, `origin/${branchName}`);
      console.log(`prototype: 从远程 origin/${branchName} 创建 worktree ${wtPath}`);
    } else {
      git(protoRepo, 'worktree', 'add', wtPath, '-b', branchName);
      console.log(`prototype: 从主干创建分支 ${branchName} 的 worktree ${wtPath}`);
      console.log(`  提示：该版本原型首次创建，迭代完成后 push origin ${branchName} 供团队拉取`);
    }
    return { created: true, fromRemote, worktreePath: wtPath };
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || '').toString().trim();
    throw new Error(`worktree 创建失败：${msg}`);
  }
}

/** 子命令 deisolate：版本收尾 merge 回主干 + 清理 worktree。 */
function cmdDeisolate(branchName, opts, projectRootArg) {
  const { workspaceRoot, protoRepo } = resolveLayout(projectRootArg);
  const wtPath = join(workspaceRoot, '.worktrees', branchName, basename(protoRepo));
  const result = { branch: branchName, worktreePath: wtPath };

  if (!existsSync(join(wtPath, '.git'))) {
    console.log(`prototype: ${branchName} 无 worktree（${wtPath} 不存在），无可清理。`);
    return { found: false };
  }
  result.found = true;

  const masterBranch = git(protoRepo, 'branch', '--show-current') || 'master';
  result.master = masterBranch;

  // ahead/behind 摘要
  try {
    const ahead = git(protoRepo, 'rev-list', '--count', `${masterBranch}..${branchName}`);
    const behind = git(protoRepo, 'rev-list', '--count', `${branchName}..${masterBranch}`);
    result.ahead = parseInt(ahead, 10);
    result.behind = parseInt(behind, 10);
  } catch { /* 分支可能未合并过，忽略 */ }

  if (opts.merge) {
    try {
      git(protoRepo, 'merge', branchName, '--no-edit');
      result.merged = true;
      console.log(`✅ ${branchName} merged → ${masterBranch}（版本收尾，方案 A）`);
    } catch (e) {
      result.merged = false;
      result.mergeError = (e.stderr || e.stdout || e.message || '').toString().trim();
      console.error(`❌ merge 失败：${result.mergeError}`);
      console.error('  存在冲突时请先人工解决再重试。');
    }
  } else {
    console.log(`  ahead=${result.ahead ?? '?'} behind=${result.behind ?? '?'}（相对 ${masterBranch}）`);
    console.log('  未执行 merge（加 --merge 提交合并回主干）。');
  }

  if (opts.clean) {
    const errors = [];
    try { git(protoRepo, 'worktree', 'remove', wtPath, '--force'); result.worktreeRemoved = true; }
    catch {
      try { rmSync(wtPath, { recursive: true, force: true }); result.worktreeRemoved = true; }
      catch (e) { errors.push(`worktree remove: ${e.message}`); }
    }
    try { git(protoRepo, 'branch', '-d', branchName); result.branchDeleted = true; }
    catch {
      try { git(protoRepo, 'branch', '-D', branchName); result.branchDeleted = true; }
      catch (e) { errors.push(`branch delete: ${e.message}`); }
    }
    if (errors.length > 0) console.error(`  ⚠️ ${errors.join('; ')}`);
    else console.log('✅ worktree + 分支已清理。');
  } else {
    console.log('  未执行清理（加 --clean 删除 worktree + 分支）。');
  }

  return result;
}

function usage() {
  console.log(`tf prototype — 原型仓库版本 worktree 隔离（v0.37.0 §68.4）

用法：
  tf prototype branch <prd-vN> [--project-root <path>]
                                               # 创建/复用原型版本 worktree（隔离 + 团队拉取）
  tf prototype deisolate <prd-vN> [--merge] [--clean] [--project-root <path>]
                                               # 版本收尾：merge 回主干 + 清理 worktree

示例：
  tf prototype branch v2                        # 为 PRD v2 创建/复用 prd-v2 worktree
  tf prototype branch prd-v2                    # 同上（分支名已含前缀）
  tf prototype deisolate v2 --merge --clean     # v2 收尾：merge 回主干 + 清理

说明：
  - 原型仓库约定：<workspace>/prototype/（独立 git 仓库，有远程）
  - worktree 布局：<workspace>/.worktrees/<prd-vN>/prototype/（gitignored 隔离区）
  - merge 时机 = 版本收尾（change_dag 该版本全部 closing），一次 merge 回主干`);
}

/** CLI 入口（export 供 team-flow.mjs 注册）。 */
export async function run(args = []) {
  const [sub, rawVersion, ...rest] = args;
  if (!sub || sub === '-h' || sub === '--help') { usage(); return; }

  if (!rawVersion) {
    console.error(`tf prototype ${sub} 缺少 PRD 版本参数（如 tf prototype ${sub} v2）`);
    process.exit(2);
  }

  let branchName;
  try { branchName = normalizeBranchName(rawVersion); }
  catch (e) { console.error(e.message); process.exit(2); }

  // Extract --project-root from remaining args
  let projectRootArg;
  const projectRootIdx = rest.indexOf('--project-root');
  if (projectRootIdx !== -1 && rest[projectRootIdx + 1]) {
    projectRootArg = rest[projectRootIdx + 1];
  }

  try {
    if (sub === 'branch') {
      return cmdBranch(branchName, projectRootArg);
    }
    if (sub === 'deisolate') {
      const opts = { merge: rest.includes('--merge'), clean: rest.includes('--clean') };
      return cmdDeisolate(branchName, opts, projectRootArg);
    }
    console.error(`未知子命令：${sub}（可用：branch / deisolate）`);
    process.exit(2);
  } catch (e) {
    console.error(`prototype: ${e.message}`);
    process.exit(1);
  }
}
