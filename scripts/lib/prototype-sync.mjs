#!/usr/bin/env node
/**
 * prototype-sync — change 完成后将 UX 增量合并回全局 prototype/ + design-system.md
 *
 * v0.3 定义，v0.5 实现为 CLI 子命令
 * 用法：tf prototype-sync <change-dir> --source <ux-delta-path>
 *
 * 功能：
 * 1. 读取 change 的 UX 增量（从 execution-contract.md 或指定 --source 路径）
 * 2. 合并进全局 prototype/（pages/components/assets/flow.md）
 * 3. 若涉及设计系统迭代（新组件/token/anti-pattern），合并进 prototype/design-system.md
 * 4. 输出合并报告
 *
 * 回写顺序：arch-merge → prototype-sync（同一 change closing 内，顺序提交）
 */

import { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { join, basename, relative, sep, resolve } from 'node:path';

/**
 * 解析 CLI 参数数组为结构化对象
 * @param {string[]} argv - 原始参数数组，如 ['changes/my-change/', '--source', 'delta.md']
 * @returns {{ _: string[], source?: string, prototypeDir?: string }}
 */
function parseArgv(argv) {
  const parsed = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      parsed.source = argv[++i];
    } else if (argv[i] === '--prototype-dir' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      parsed.prototypeDir = argv[++i];
    } else if (!argv[i].startsWith('--')) {
      parsed._.push(argv[i]);
    }
  }
  return parsed;
}

/**
 * 推导 change 所属 PRD 版本（v0.37.0 §68.5）。
 * 优先级：change-brief.md 的 upstream_plan_ref → change 目录名 v{N}- 前缀。
 * @returns {string|null} 如 'v2'；无法推导返回 null
 */
function derivePrdVersion(changeDir) {
  const briefPath = join(changeDir, 'change-brief.md');
  try {
    if (existsSync(briefPath)) {
      const content = readFileSync(briefPath, 'utf-8');
      const m = content.match(/upstream_plan_ref:\s*prd\/(v\d+)\//);
      if (m) return m[1];
    }
  } catch { /* ignore */ }
  const m = basename(changeDir).match(/^v(\d+)-/);
  if (m) return `v${m[1]}`;
  return null;
}

/**
 * 解析原型目录（v0.37.0 §68.5 制品链路径版本化）：
 * --prototype-dir 显式指定优先；否则从 change 推导 PRD 版本 → 定位版本 worktree 的 prototype/。
 * worktree 不存在时回退主仓库 prototype/ 并提示。
 */
function resolvePrototypeDir(changeDir, prototypeDirArg) {
  if (prototypeDirArg) return prototypeDirArg;
  const version = derivePrdVersion(changeDir);
  if (!version) return 'prototype'; // 无法推导版本 → 回退主仓库 prototype/
  const abs = resolve(changeDir);
  const changesIdx = abs.lastIndexOf(sep + 'changes' + sep);
  const workspaceRoot = changesIdx > 0 ? abs.slice(0, changesIdx) : process.cwd();
  const branchName = `prd-${version}`;
  const wt = join(workspaceRoot, '.worktrees', branchName, 'prototype');
  if (existsSync(join(wt, '.git'))) return wt;
  const fallback = join(workspaceRoot, 'prototype');
  console.log(`ℹ️  原型版本 worktree 不存在（${wt}），回退 ${fallback}。原型独立仓库场景请先 \`tf prototype branch ${branchName}\`。`);
  return fallback;
}

/**
 * 执行 prototype-sync 合并
 * @param {string[]|object} args - CLI 参数数组（从 tf 框架传入）或已解析的对象
 * @returns {{ synced: boolean, pages?: number, components?: number, designSystem?: boolean, conflicts?: string[], reason?: string }}
 */
export function run(args = {}) {
  // 支持两种调用方式：数组（CLI 框架 mod.run(commandArgs)）或对象（直接调用）
  if (Array.isArray(args)) {
    args = parseArgv(args);
  }

  const changeDir = args._?.[0] || args.changeDir;
  const sourcePath = args.source;
  const prototypeDir = resolvePrototypeDir(changeDir, args.prototypeDir);

  if (!changeDir) {
    console.error('Usage: tf prototype-sync <change-dir> [--source <ux-delta-path>] [--prototype-dir <path>]');
    process.exit(1);
  }

  // 1. 确定 UX 增量来源
  let uxDeltaContent = '';
  let uxDeltaSource = '';

  if (sourcePath && existsSync(sourcePath)) {
    uxDeltaContent = readFileSync(sourcePath, 'utf-8');
    uxDeltaSource = sourcePath;
  } else {
    // 默认从 execution-contract.md 提取 UX 增量
    const contractPath = join(changeDir, 'execution-contract.md');
    if (existsSync(contractPath)) {
      const contract = readFileSync(contractPath, 'utf-8');
      // 提取 UX 相关章节（## UX 增量 或 ## Prototype Changes）
      const uxMatch = contract.match(/## (?:UX 增量|Prototype Changes|UX Delta)\n([\s\S]*?)(?=\n## |\n---|\n$)/);
      if (uxMatch) {
        uxDeltaContent = uxMatch[1].trim();
        uxDeltaSource = contractPath;
      }
    }
  }

  if (!uxDeltaContent) {
    console.log('No UX delta found in change, nothing to sync');
    return { synced: false, reason: 'no-ux-delta' };
  }

  console.log(`UX delta source: ${uxDeltaSource}`);

  // 2. 确保全局 prototype/ 目录存在
  if (!existsSync(prototypeDir)) {
    console.log(`Creating prototype directory: ${prototypeDir}`);
    mkdirSync(prototypeDir, { recursive: true });
    mkdirSync(join(prototypeDir, 'pages'), { recursive: true });
    mkdirSync(join(prototypeDir, 'components'), { recursive: true });
    mkdirSync(join(prototypeDir, 'assets'), { recursive: true });
  }

  // 3. 解析 UX 增量中的文件操作
  // UX 增量格式约定：
  // - 新增页面：`[ADD] pages/xxx.html`
  // - 修改页面：`[MODIFY] pages/xxx.html`
  // - 新增组件：`[ADD] components/xxx.html`
  // - 设计系统更新：`[DS] design-system.md` + 具体内容
  const operations = [];
  const lines = uxDeltaContent.split('\n');
  let currentOp = null;
  let currentContent = [];

  for (const line of lines) {
    const opMatch = line.match(/^\[(ADD|MODIFY|DS)\]\s+(.+)$/);
    if (opMatch) {
      if (currentOp) {
        operations.push({ ...currentOp, content: currentContent.join('\n') });
      }
      currentOp = { action: opMatch[1], target: opMatch[2].trim() };
      currentContent = [];
    } else if (currentOp) {
      currentContent.push(line);
    }
  }
  if (currentOp) {
    operations.push({ ...currentOp, content: currentContent.join('\n') });
  }

  // 4. 执行合并
  const report = { synced: true, pages: 0, components: 0, designSystem: false, conflicts: [] };

  for (const op of operations) {
    const targetPath = join(prototypeDir, op.target);

    if (op.action === 'DS') {
      // 设计系统更新
      const dsPath = join(prototypeDir, 'design-system.md');
      if (existsSync(dsPath)) {
        const existing = readFileSync(dsPath, 'utf-8');
        // 追加到 design-system.md 末尾（不覆盖，避免冲突）
        writeFileSync(dsPath, existing + '\n\n<!-- prototype-sync: ' + new Date().toISOString().slice(0, 10) + ' -->\n' + op.content + '\n', 'utf-8');
      } else {
        writeFileSync(dsPath, op.content, 'utf-8');
      }
      report.designSystem = true;
      console.log(`  [DS] Updated design-system.md`);
      continue;
    }

    // 页面/组件文件操作
    if (op.action === 'ADD' && existsSync(targetPath)) {
      report.conflicts.push(`ADD conflict: ${op.target} already exists`);
      console.log(`  [CONFLICT] ${op.target} already exists, skipping ADD`);
      continue;
    }

    // 确保目录存在
    const targetDir = join(prototypeDir, op.target.includes('/') ? op.target.split('/').slice(0, -1).join('/') : '');
    if (targetDir && !existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    writeFileSync(targetPath, op.content, 'utf-8');

    if (op.target.startsWith('pages/')) report.pages++;
    if (op.target.startsWith('components/')) report.components++;
    console.log(`  [${op.action}] ${op.target}`);
  }

  // 5. 输出合并报告
  console.log(`\nPrototype sync complete:`);
  console.log(`  Pages: ${report.pages} synced`);
  console.log(`  Components: ${report.components} synced`);
  console.log(`  Design system: ${report.designSystem ? 'updated' : 'unchanged'}`);
  if (report.conflicts.length > 0) {
    console.log(`  Conflicts: ${report.conflicts.length}`);
    for (const c of report.conflicts) {
      console.log(`    - ${c}`);
    }
  }

  return report;
}

// 支持直接执行：node prototype-sync.mjs <change-dir> --source <path>
if (process.argv[1]?.includes('prototype-sync')) {
  const args = { _: [] };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].replace('--', '');
      const val = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true;
      args[key] = val;
    } else {
      args._.push(process.argv[i]);
    }
  }
  run(args);
}
