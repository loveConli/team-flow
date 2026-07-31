#!/usr/bin/env node
// scripts/ensure-branch.mjs — enforce git isolation before editing main/master
// Used by build-executor as a mandatory preflight. Exits non-zero when it
// cannot create an isolated context and no --force approval was given, so the
// agent MUST stop and ask the user instead of silently editing main/master.
//
// Usage: node ensure-branch.mjs <change-dir> [change-name] [--force]
//
// 布局识别（来源：workflow-feedback 2026-08-01 #100009）：
//   Case A 多仓库工作区 —— change-dir 形如 <root>/changes/<name>，且 <root> 下
//     存在含 .git 的直接子目录（真正的业务代码仓库，如 bff-*/ui-*/prototype/）。
//     工作区根本身往往只是近空壳 git 仓库（仅跟踪 .gitignore，无 remote）。旧实现
//     把 change-dir 当代码仓库、worktree 建在 ../，结果是空工作区副本，实现子代理
//     看不到任何参考代码。新实现为每个代码仓库在 <root>/.worktrees/<change>/<repo>
//     建立 worktree（基于各仓库当前分支），实现子代理进入 <root>/.worktrees/<change>/
//     即可看到与主工作区一致的目录结构和全部参考代码。
//   Case B 单代码仓库（遗留兼容）—— 不满足 Case A 时回退到旧行为：把 change-dir
//     当代码仓库，worktree 建在 ../<repo>-<name>。保证单仓库项目不被破坏。
//
// Security: every git invocation uses execFileSync with a LITERAL command
// ('git') and a LITERAL argument array (no shell, no string-form command) — the
// same form proven safe by install-cursor.mjs / install.mjs. Worktree paths and
// branch names derive from controlled sources (change-name / repository directory
// names) and are passed as array elements, never interpolated into a shell string;
// branch names are additionally sanitized to git-legal characters before use.
import { execFileSync } from 'node:child_process';
import { resolve, basename, dirname, join } from 'node:path';
import { readdirSync, existsSync, appendFileSync, readFileSync } from 'node:fs';

const rawChangeDir = process.argv[2];
// 第三个位置参数是可选 change-name；若它其实是 '--force' 之类的开关则忽略，避免把
// 开关误当分支名（经 cmd-isolate 调用时 parseArgs 已正确分离，此为直接调用的兜底）。
let changeName = process.argv[3];
if (changeName && changeName.startsWith('--')) changeName = undefined;
const force = process.argv.includes('--force');

if (!rawChangeDir) {
  console.error('Usage: node ensure-branch.mjs <change-dir> [change-name] [--force]');
  process.exit(2);
}

// 解析为绝对路径，后续所有路径计算基于此（来源：workflow-feedback 2026-08-01 #100009）。
const changeDir = resolve(rawChangeDir);

const PROTECTED = ['main', 'master'];

// 将分支名清洗为 git 合法字符（来源：workflow-feedback 2026-08-01 #100009）。
// git-check-ref-format 禁止空格 ~ ^ : ? * [ \ .. @{ 等，且不能以 . 开头/结尾、
// 不能 .lock 结尾。这里把非法字符替换为 '-'，去掉首尾的 . / -，避免分支名以 '-'
// 开头被 git 误解析为命令行选项。输入来自受控来源，清洗是额外的纵深防护层。
function sanitizeBranchName(raw) {
  const cleaned = String(raw)
    .replace(/[^A-Za-z0-9._/-]/g, '-')   // 非法字符 → '-'
    .replace(/\.{2,}/g, '.')             // '..' → '.'（git 禁止 '..'）
    .replace(/\.lock$/i, '')             // 禁止 '.lock' 结尾
    .replace(/\/{2,}/g, '/')            // 折叠多重 '/'
    .replace(/^[./-]+/, '')             // 去掉开头 . / -（git 禁止 . 开头；避免 '-' 开头当选项）
    .replace(/[/.]+$/, '');             // 去掉结尾 / .
  return cleaned || 'change';
}

// 若 change-dir 形如 <root>/changes/<name>，返回 <root>；否则返回 null。
function detectWorkspaceRoot(absChangeDir) {
  const parent = dirname(absChangeDir);          // <root>/changes
  if (basename(parent) !== 'changes') return null;
  return dirname(parent);                        // <root>
}

// 枚举 root 下含 .git 的直接子目录（= 代码仓库），按目录名排序保证确定性。
// .git 可能是目录（普通仓库）或文件（worktree/submodule 链接），existsSync 均覆盖。
function listCodeRepos(root) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory() && existsSync(join(root, e.name, '.git')))
    .map((e) => e.name)
    .sort();
}

// 确保 <root>/.gitignore 含忽略 .worktrees/ 的行，已有则不重复追加。
function ensureWorktreeGitignore(root) {
  const gitignorePath = join(root, '.gitignore');
  let existing = '';
  try {
    existing = readFileSync(gitignorePath, 'utf-8');
  } catch {
    existing = '';
  }
  const alreadyIgnored = existing
    .split(/\r?\n/)
    .map((l) => l.trim())
    .some((l) => l === '.worktrees/' || l === '.worktrees' || l === '/.worktrees/' || l === '/.worktrees');
  if (alreadyIgnored) return;
  const needsNewline = existing.length > 0 && !existing.endsWith('\n');
  appendFileSync(gitignorePath, `${needsNewline ? '\n' : ''}.worktrees/\n`);
  console.log(`ensure-branch: added '.worktrees/' to ${gitignorePath}.`);
}

// Case A：多仓库工作区隔离（来源：workflow-feedback 2026-08-01 #100009）。
// 为每个代码仓库在 <root>/.worktrees/<change>/<repo> 建 worktree（基于各仓库当前分支）。
function runMultiRepo(root, repos) {
  const changeSlug = basename(changeDir);
  const branchBase = sanitizeBranchName(changeName || changeSlug);
  const changeWorktreeDir = join(root, '.worktrees', changeSlug);

  console.error(`ensure-branch: multi-repo workspace detected at ${root}. Isolating ${repos.length} code repo(s): ${repos.join(', ')}...`);

  // 先确保 .gitignore 忽略 .worktrees/，避免 worktree 产物污染工作区根仓库。
  ensureWorktreeGitignore(root);

  const failed = [];
  for (const repo of repos) {
    const repoDir = join(root, repo);
    const repoOpts = { encoding: 'utf-8', cwd: repoDir, stdio: ['ignore', 'pipe', 'pipe'] };
    const wtPath = join(changeWorktreeDir, repo);

    // 幂等：worktree 已存在则复用，避免实现子代理重试时报 "already exists"。
    if (existsSync(join(wtPath, '.git'))) {
      console.log(`ensure-branch: [${repo}] worktree already exists at ${wtPath}; reusing.`);
      continue;
    }

    // 逐仓库判断当前分支（字面参数数组）。
    let branch = '';
    try {
      branch = (execFileSync('git', ['branch', '--show-current'], repoOpts) || '').trim();
    } catch {
      console.error(`ensure-branch: [${repo}] could not determine current git branch; cannot isolate.`);
      failed.push(repo);
      continue;
    }

    // 该仓库已不在受保护分支 → 已隔离，无需建 worktree（沿用单仓库 already-isolated 语义）。
    if (!PROTECTED.includes(branch)) {
      console.log(`ensure-branch: [${repo}] already isolated on branch '${branch}'.`);
      continue;
    }

    // 在受保护分支 → 建 worktree，基于该仓库当前分支（字面参数数组）。
    // 不同代码仓库相互独立，使用同一分支名 branchBase 不会冲突。
    try {
      execFileSync('git', ['worktree', 'add', wtPath, '-b', branchBase], { ...repoOpts, stdio: 'inherit' });
      console.log(`ensure-branch: [${repo}] created worktree at ${wtPath} on branch '${branchBase}'.`);
    } catch (e) {
      console.error(`ensure-branch: [${repo}] worktree creation failed: ${(e.stderr || e.stdout || e.message || 'unknown').toString().trim()}`);
      failed.push(repo);
    }
  }

  // 退出码语义与单仓库一致：全部隔离成功 → 0；有失败 + --force → 0（警告）；有失败 + 无 force → 1（STOP）。
  if (failed.length === 0) {
    console.log(`ensure-branch: implementation subagents should enter ${changeWorktreeDir} to work; directory structure mirrors the main workspace, with reference code from every repo available.`);
    process.exit(0);
  }
  if (force) {
    console.error(`ensure-branch: WARNING — could not isolate ${failed.length} repo(s): ${failed.join(', ')}. Proceeding with --force; these remain on their protected branches.`);
    process.exit(0);
  }
  console.error(`ensure-branch: could not isolate ${failed.length} repo(s): ${failed.join(', ')}. No --force given. STOP and ask the user for explicit approval before editing main/master.`);
  process.exit(1);
}

// Case B：单代码仓库隔离（遗留兼容，保持重构前行为不变）。
// 把 change-dir 当代码仓库，worktree 建在 ../<repo>-<name>。
function runSingleRepo() {
  const GIT_OPTS = { encoding: 'utf-8', cwd: changeDir, stdio: ['ignore', 'pipe', 'pipe'] };

  // Determine current branch (literal arg array).
  let branch = '';
  try {
    branch = (execFileSync('git', ['branch', '--show-current'], GIT_OPTS) || '').trim();
  } catch {
    console.error('ensure-branch: could not determine current git branch. Is <change-dir> inside a git repository?');
    process.exit(1);
  }

  if (!PROTECTED.includes(branch)) {
    console.log(`ensure-branch: already isolated on branch '${branch}'. Proceed with implementation edits.`);
    process.exit(0);
  }

  console.error(`ensure-branch: on protected branch '${branch}'. Creating an isolated implementation context...`);

  const repoName = basename(changeDir) || 'repo';
  const name = sanitizeBranchName(changeName || repoName);
  const worktreePath = `../${repoName}-${name}`;

  // Preferred: git worktree (literal arg array).
  try {
    execFileSync('git', ['worktree', 'add', worktreePath, '-b', name], { ...GIT_OPTS, stdio: 'inherit' });
    console.log(`ensure-branch: created git worktree at ${worktreePath} on branch '${name}'. Make all implementation edits there.`);
    process.exit(0);
  } catch (e) {
    console.error(`ensure-branch: worktree creation failed: ${(e.stderr || e.stdout || e.message || 'unknown').toString().trim()}`);
  }

  // Fallback: local branch (literal arg array).
  try {
    execFileSync('git', ['switch', '-c', name], { ...GIT_OPTS, stdio: 'inherit' });
    console.log(`ensure-branch: created branch '${name}' via git switch -c. Make implementation edits there.`);
    process.exit(0);
  } catch (e) {
    console.error(`ensure-branch: branch creation failed: ${(e.stderr || e.stdout || e.message || 'unknown').toString().trim()}`);
  }

  // Both failed → require explicit approval to edit in place.
  if (force) {
    console.error('ensure-branch: WARNING — editing protected branch in place with --force. This modifies main/master directly.');
    process.exit(0);
  }
  console.error('ensure-branch: could not create an isolated context and no --force given. STOP and ask the user for explicit approval before editing main/master.');
  process.exit(1);
}

// 主流程：布局识别后分发（来源：workflow-feedback 2026-08-01 #100009）。
const workspaceRoot = detectWorkspaceRoot(changeDir);
const codeRepos = workspaceRoot ? listCodeRepos(workspaceRoot) : [];

if (workspaceRoot && codeRepos.length > 0) {
  // Case A：多仓库工作区。
  runMultiRepo(workspaceRoot, codeRepos);
} else {
  // Case B：不满足 Case A → 回退单代码仓库行为，保证单仓库项目不被破坏。
  runSingleRepo();
}
