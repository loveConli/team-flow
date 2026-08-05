#!/usr/bin/env node
/**
 * publish — 阶段产物白名单提交 + 可选推送（v0.37.0 §68.3）
 *
 * 用法：tf publish <target> [--push] [--dry-run]
 *   target: --prd（PRD + orchestrator.yaml + registry.yaml + 主仓库 prototype/）
 *         / --arch（docs/architecture/ 迭代快照）
 *         / --changes <dir>（change 制品，缺省则整个 changes/）
 *         / --all（全部）
 *
 * 设计（v0.15 §68.3）：
 * 1. 白名单 git add：只 add 本次 target 对应目录，防卷走无关改动（复用 arch-merge 协作安全模式）
 * 2. 脏文件检测：target 目录之外存在未提交文件 → 告警（不阻断，提示人工确认）
 * 3. 写锁：.publish.lock（mkdir 原子语义，防并行 publish 冲突）
 * 4. push 确认制：--push 显式开启；只推当前分支、不跨分支（push 是外向操作，强制确认）
 * 5. --dry-run：只打印将执行的 git 动作，不落盘不 commit 不 push
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmdirSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';

const LOCK_PATH = '.publish.lock';

/** 解析 CLI 参数。 */
function parseArgv(argv) {
  const parsed = { targets: [], push: false, dryRun: false, changeDir: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--push') parsed.push = true;
    else if (a === '--dry-run') parsed.dryRun = true;
    else if (a === '--prd') parsed.targets.push('prd');
    else if (a === '--arch') parsed.targets.push('arch');
    else if (a === '--changes') {
      // 无目录 = 整个 changes/；带目录 = 单个 change（目录以 -- 开头则视为无目录，MAJOR 修复 v0.37.0）
      parsed.targets.push('changes');
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) parsed.changeDir = argv[++i];
    } else if (a === '--all') parsed.targets.push('all');
    else if (a === '-h' || a === '--help') parsed.help = true;
    else {
      console.error(`Unknown argument: ${a}`);
      console.error('Usage: tf publish <--prd|--arch|--changes <dir>|--all> [--push] [--dry-run]');
      process.exit(2);
    }
  }
  if (parsed.targets.length === 0 && !parsed.help) {
    console.error('No target specified.');
    console.error('Usage: tf publish <--prd|--arch|--changes <dir>|--all> [--push] [--dry-run]');
    process.exit(2);
  }
  return parsed;
}

/** git 执行封装（统一 encoding + 错误降级）。 */
function git(cwd, ...args) {
  return execFileSync('git', args, { encoding: 'utf-8', cwd, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function isDir(p) {
  try { return existsSync(p) && readdirSync(p).length >= 0; } catch { return false; }
}

/**
 * 收集本次 publish 的白名单路径（目录级）。
 * 只 add 这些路径；target 目录之外的未提交改动一律不碰。
 */
function collectWhitelist(projectRoot, targets, changeDir) {
  const paths = [];
  const want = t => targets.includes('all') || targets.includes(t);

  if (want('prd')) {
    const prdDir = join(projectRoot, 'prd');
    if (isDir(prdDir)) paths.push(prdDir);
    // 主仓库内 prototype/（独立仓库场景由原型 worktree 命令管理，这里仅收集主仓库可见部分）
    const protoDir = join(projectRoot, 'prototype');
    if (isDir(protoDir)) paths.push(protoDir);
    // 产品级编排状态
    const teamflow = join(projectRoot, '.team-flow');
    if (isDir(teamflow)) {
      const registry = join(teamflow, 'registry.yaml');
      if (existsSync(registry)) paths.push(registry);
      const reqDir = join(teamflow, 'requirements');
      if (isDir(reqDir)) {
        for (const req of readdirSync(reqDir)) {
          const oy = join(reqDir, req, 'orchestrator.yaml');
          if (existsSync(oy)) paths.push(oy);
        }
      }
    }
  }

  if (want('arch')) {
    const archDir = join(projectRoot, 'docs', 'architecture');
    if (isDir(archDir)) paths.push(archDir);
    // arch_baseline 豁免键（v0.37.0 §68.5）：随架构快照一并同步，否则团队拉取后门禁误判存量（IMPORTANT 修复）
    const archState = join(projectRoot, '.team-flow', 'arch-state.json');
    if (existsSync(archState)) paths.push(archState);
  }

  if (want('changes')) {
    if (changeDir) {
      const abs = isAbsolute(changeDir) ? changeDir : resolve(projectRoot, changeDir);
      if (existsSync(abs)) paths.push(abs);
      else console.warn(`[WARN] change 目录不存在：${abs}`);
    } else {
      const changesDir = join(projectRoot, 'changes');
      if (isDir(changesDir)) paths.push(changesDir);
    }
  }

  return paths;
}

/**
 * 检测白名单之外的未提交/未跟踪文件（团队协作安全底线，仿 arch-merge detectUntouchedDirtyFiles）。
 * 返回值：外部脏文件列表（含 staged + unstaged + untracked）。
 */
function detectOutsideDirty(projectRoot, whitelist) {
  const relWhitelist = new Set(whitelist.map(p => {
    const rel = p.replace(projectRoot + '/', '');
    return rel.replace(/\/+$/, '');
  }));
  try {
    const status = git(projectRoot, 'status', '--porcelain');
    if (!status) return [];
    return status.split('\n').filter(Boolean)
      .map(line => {
        // porcelain 前 2 字符是状态，后面是路径（引号包裹的可能带空格）
        const raw = line.slice(3).replace(/^"|"$/g, '').replace(/\\ /g, ' ');
        return raw;
      })
      .filter(p => {
        if (!p) return false;
        const norm = p.replace(/\/+$/, ''); // porcelain 目录级输出带尾斜杠，先去规范化
        // 跳过 .publish.lock 自身（写锁目录）
        if (norm === LOCK_PATH || norm.startsWith(LOCK_PATH + '/')) return false;
        // 跳过 worktree 隔离区（gitignored，理论上不会出现，防御性跳过）
        if (norm.startsWith('.worktrees/')) return false;
        // 白名单判定（双向往返匹配）：
        //  - norm 在白名单项内（norm === w 或 norm.startsWith(w + '/')）→ 豁免
        //  - 白名单项是 norm 的后代（w.startsWith(norm + '/')）→ 豁免
        //    （全新仓库 porcelain 对未跟踪内容显示目录级如 `?? docs/`，
        //      其下白名单子目录 docs/architecture 已被覆盖，属正常提交范围）
        for (const w of relWhitelist) {
          if (norm === w || norm.startsWith(w + '/')) return false;
          if (w.startsWith(norm + '/')) return false;
        }
        return true;
      });
  } catch {
    return [];
  }
}

function acquireLock(projectRoot) {
  const lockPath = join(projectRoot, LOCK_PATH);
  if (existsSync(lockPath)) {
    throw new Error(`another publish in progress (${LOCK_PATH} exists) — 串行化提交，稍后重试`);
  }
  mkdirSync(lockPath);
  return lockPath;
}

function releaseLock(lockPath) {
  try { rmdirSync(lockPath); } catch { /* ignore */ }
}

function describeTargets(parsed) {
  const t = parsed.targets.includes('all') ? 'all' : parsed.targets.join('+');
  return parsed.targets.includes('changes') && parsed.changeDir ? `${t}:${parsed.changeDir}` : t;
}

/**
 * CLI 入口（export 供 team-flow.mjs 注册）。
 */
export async function run(args = []) {
  const parsed = parseArgv(args);
  if (parsed.help) {
    console.log(`tf publish — 阶段产物白名单提交 + 可选推送（v0.37.0 §68.3）

用法：tf publish <target> [--push] [--dry-run]
  --prd         提交 PRD + orchestrator.yaml + registry.yaml + 主仓库 prototype/
  --arch        提交 docs/architecture/（迭代快照）
  --changes     提交整个 changes/（或 --changes <change-dir> 指定单个 change）
  --all         提交全部上述
  --push        同时推送到远程当前分支（默认只提交不推送）
  --dry-run     只打印将执行的 git 动作，不落盘不 commit`);
    return;
  }

  const projectRoot = git(process.cwd(), 'rev-parse', '--show-toplevel');
  const whitelist = collectWhitelist(projectRoot, parsed.targets, parsed.changeDir);

  if (whitelist.length === 0) {
    console.log('ℹ️  没有可提交的阶段产物（白名单为空）。');
    return;
  }

  // 脏文件检测（target 之外）→ 告警不阻断
  const outsideDirty = detectOutsideDirty(projectRoot, whitelist);
  if (outsideDirty.length > 0) {
    console.warn(`[WARN] 白名单之外存在 ${outsideDirty.length} 个未提交文件（不提交）：`);
    for (const f of outsideDirty.slice(0, 5)) console.warn(`  - ${f}`);
    if (outsideDirty.length > 5) console.warn(`  ... 等 ${outsideDirty.length} 个`);
  }

  const targetDesc = describeTargets(parsed);
  const commitMsg = `tf publish: ${targetDesc} — sync stage artifacts`;

  if (parsed.dryRun) {
    console.log('[DRY-RUN] Would execute:');
    console.log(`  git add ${whitelist.map(p => p.replace(projectRoot + '/', '')).join(' ')}`);
    console.log(`  git commit -m "${commitMsg}"`);
    if (parsed.push) {
      const branch = git(projectRoot, 'branch', '--show-current');
      console.log(`  git push origin ${branch}`);
    }
    return { published: false, dryRun: true };
  }

  const lockPath = acquireLock(projectRoot);
  try {
    // 白名单 git add（只 add 目标目录）
    for (const p of whitelist) {
      const rel = p.replace(projectRoot + '/', '');
      execFileSync('git', ['add', rel], { cwd: projectRoot, stdio: 'pipe' });
    }
    // commit（nothing to commit 可接受）
    try {
      execFileSync('git', ['commit', '-m', commitMsg], { cwd: projectRoot, stdio: 'pipe' });
      console.log(`✅ committed: ${commitMsg}`);
    } catch (e) {
      // git 空提交消息在 stdout（execFileSync 失败时 stderr 常为空 Buffer，需先排除空值）
      const msg = (e.stderr && e.stderr.toString()) || (e.stdout && e.stdout.toString()) || '';
      // git 空提交两种提示：工作树干净 / 有未跟踪但无 staged 变更
      if (msg.includes('nothing to commit') || msg.includes('nothing added to commit')) {
        console.log('ℹ️  没有变更需要提交。');
      } else {
        throw new Error(`git commit failed: ${msg}`);
      }
    }
    // push（确认制）
    if (parsed.push) {
      const branch = git(projectRoot, 'branch', '--show-current');
      console.log(`↗️  pushing to origin/${branch} ...`);
      execFileSync('git', ['push', 'origin', branch], { cwd: projectRoot, stdio: 'inherit' });
      console.log('✅ pushed.');
    }
    return { published: true, targets: parsed.targets, pushed: parsed.push };
  } finally {
    releaseLock(lockPath);
  }
}
