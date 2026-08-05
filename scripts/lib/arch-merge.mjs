#!/usr/bin/env node
/**
 * arch-merge — change 完成后将架构增量合并回全局 docs/architecture/
 *
 * v0.10 §28.4 定义，v0.23.0 实现为 CLI 子命令；v0.35.0（v0.14 §62）重构：
 * 从"append 演进日志"重构为"当前态幂等 upsert + 生成式产物 + 冲突预检 + 并发安全"。
 *
 * 用法：tf arch-merge <change-dir> [--project-root <path>] [--dry-run]
 *
 * 重构要点（评审共识，v0.14 §62.5 4 硬门禁）：
 * 1. 抽取 0 结果 abort：结构化解析失配显式报错，禁止静默继续返回 merged:true
 * 2. marker 成对校验：当前态替换区 marker 缺失/重复 → 硬失败禁止写盘
 * 3. 全局写锁：.arch-merge.lock（mkdir 原子语义），防多 change 并行 closing lost update
 * 4. 白名单 git add：只 add 本次 touch 文件，检测其他脏文件告警
 * 另：schema-baseline 幂等追加、演进日志按 changeName 去重、生成式 PHYSICAL-MODEL/DATABASE/API-INDEX、冲突预检。
 */

import {
  readFileSync, writeFileSync as fsWriteFileSync, existsSync, mkdirSync, readdirSync, rmdirSync, cpSync,
} from 'node:fs';
import { join, basename, dirname, resolve, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  parseTableAfter, extractEndpoints, extractAggregates,
  extractTablesFromSql, extractTablesFromDatabaseMd, readFrontmatter,
} from './arch-parse.mjs';

const MARKER_BEGIN = '<!-- arch:current-state:begin -->';
const MARKER_END = '<!-- arch:current-state:end -->';
const LOCK_PATH = '.arch-merge.lock';

/* ============ 硬门禁：abort / 写锁 ============ */

/** 抽取失败显式报错（P2：禁止静默继续合并）。 */
function abort(msg) {
  throw new Error(`arch-merge abort: ${msg}`);
}

/** DRY-RUN 不落盘（修复：原实现 dryRun 只跳过 commit，产物仍写盘）。 */
let DRY_RUN = false;
function writeFile(p, c) { if (!DRY_RUN) fsWriteFileSync(p, c); }
function makeDir(p) { if (!DRY_RUN) mkdirSync(p, { recursive: true }); }
function copyFile(src, dst) { if (!DRY_RUN) cpSync(src, dst); }

/** 全局写锁：mkdir 原子语义。拿不到锁 → 失败退出（不静默覆盖）。 */
function acquireLock(projectRoot) {
  const lockPath = join(projectRoot, LOCK_PATH);
  if (existsSync(lockPath)) {
    abort(`another arch-merge in progress (${LOCK_PATH} exists) — 串行化回写，稍后重试`);
  }
  mkdirSync(lockPath);
  return lockPath;
}

function releaseLock(lockPath) {
  try { rmdirSync(lockPath); } catch { /* ignore */ }
}

/* ============ 当前态 upsert（mergeArchitecture） ============ */

/**
 * Step 2: ARCHITECTURE.md 当前态幂等 upsert + 演进日志去重。
 * 全局文档维护 marker 区（当前态：BC/聚合注册表）+ 演进日志段。
 * marker 区重建 = 所有已合并 change 增量的投影（按聚合 id upsert，非原地编辑）。
 */
function mergeArchitecture(changeDir, archDir, globalArchDir, changeName) {
  const srcPath = join(archDir, 'architecture.md');
  const dstPath = join(globalArchDir, 'ARCHITECTURE.md');
  if (!existsSync(srcPath)) return { merged: false, reason: 'no-source' };

  const srcContent = readFileSync(srcPath, 'utf-8');
  const fm = readFrontmatter(srcContent);

  // 结构化提取聚合清单（唯一事实源，聚合注册表）
  const aggregates = extractAggregates(srcContent);
  // 关键门禁：声明 required 但解析到 0 聚合 → abort（禁止静默）
  if (fm.arch_design_decision === 'required' && aggregates.length === 0) {
    abort('architecture.md 聚合注册表解析为空（arch_design_decision=required）——检查模板 §2 是否输出聚合行');
  }

  const existing = existsSync(dstPath) ? readFileSync(dstPath, 'utf-8') : '';
  const currentStateSection = buildCurrentStateSection(aggregates, changeName);

  // marker 区替换（代码独占写）：存在则替换，缺失则插入
  let updated;
  if (existing.includes(MARKER_BEGIN) || existing.includes(MARKER_END)) {
    // marker 成对校验（硬门禁）
    const beginCount = (existing.match(new RegExp(escapeRegExp(MARKER_BEGIN), 'g')) || []).length;
    const endCount = (existing.match(new RegExp(escapeRegExp(MARKER_END), 'g')) || []).length;
    if (beginCount !== 1 || endCount !== 1) {
      abort(`marker 不成对（begin=${beginCount}, end=${endCount}）— 禁止写盘，需手工修复全局 ARCHITECTURE.md`);
    }
    updated = existing.replace(
      new RegExp(`${escapeRegExp(MARKER_BEGIN)}[\\s\\S]*?${escapeRegExp(MARKER_END)}`),
      `${MARKER_BEGIN}\n${currentStateSection}\n${MARKER_END}`
    );
  } else {
    updated = existing + `\n\n${MARKER_BEGIN}\n${currentStateSection}\n${MARKER_END}\n`;
  }

  // 演进日志去重（changeName 唯一锚：不同 change 可能同版本号）
  updated = upsertEvolutionLog(updated, srcContent, changeName);

  writeFile(dstPath, updated, 'utf-8');
  return { merged: true, file: 'ARCHITECTURE.md', aggregates: aggregates.map(a => a.id) };
}

/** 构建当前态 marker 区内容（BC 表 + 聚合注册表，厚锚点一句话级；聚合注册表带来源列）。 */
function buildCurrentStateSection(aggregates, changeName) {
  const bcMap = new Map();
  for (const a of aggregates) {
    if (!bcMap.has(a.context)) bcMap.set(a.context, []);
    bcMap.get(a.context).push(a);
  }
  const lines = ['## 当前态', ''];
  lines.push('### 限界上下文');
  lines.push('| 上下文 | 聚合数 |', '|--------|--------|');
  for (const [bc, aggs] of bcMap) {
    lines.push(`| ${bc} | ${aggs.length} |`);
  }
  lines.push('', '### 聚合注册表');
  // v0.36.3 §62.1 首轮特例：全局聚合全部来自已合并 change（=已落地态）；状态列标注
  lines.push('| 聚合ID | 上下文 | 根实体 | 来源 | 状态 | 关键不变量 |', '|--------|--------|--------|------|------|-----------|');
  for (const a of aggregates) {
    lines.push(`| ${a.id} | ${a.context} | ${a.root} | change:${changeName} | 已落地 | ${a.invariants || '—'} |`);
  }
  return lines.join('\n');
}

/** 演进日志 upsert：按 changeName 锚定位既有块，存在则替换、否则追加。 */
function upsertEvolutionLog(globalContent, srcContent, changeName) {
  // 从 change 源提取演进日志条目（标题 + 正文）
  const logStart = srcContent.search(/^#{2,3}\s*\d*\.?\s*(演进日志|Evolution Log)/m);
  if (logStart < 0) return globalContent;
  const logSection = srcContent.slice(logStart).trim();
  const anchorRe = /^#{3,4}\s*.*change[:\s].*$/mi;
  const anchor = `### change:${changeName}`;
  const logBlock = `${anchor}\n${logSection.replace(/^#{2,3}\s*\d*\.?\s*(演进日志|Evolution Log)/m, '').trim()}`;

  // 已存在 → 替换；否则追加到演进日志段末尾
  const logHeadingRe = /^#{2,3}\s*\d*\.?\s*(演进日志|Evolution Log)/m;
  if (new RegExp(`^### change:${escapeRegExp(changeName)}\\s*$`, 'm').test(globalContent)) {
    return globalContent.replace(
      new RegExp(`^### change:${escapeRegExp(changeName)}[\\s\\S]*?(?=^### change:|^## |^\\n$|$)`, 'm'),
      logBlock
    );
  }
  if (logHeadingRe.test(globalContent)) {
    return globalContent.replace(logHeadingRe, `$&\n${logBlock}`);
  }
  return globalContent + `\n\n## 演进日志\n\n${logBlock}\n`;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ============ schema-baseline 幂等追加 ============ */

/**
 * Step 4: schema-baseline.sql 幂等追加。
 * 追加前检查 `-- === <filename> (change: <name>) ===` 是否已存在（CI 重跑/change 重开不重复）。
 */
function syncSchemaBaseline(changeDir, archDir, globalArchDir, changeName) {
  const sqlDir = join(archDir, 'sql', 'ddl');
  const dstPath = join(globalArchDir, 'schema-baseline.sql');
  if (!existsSync(sqlDir)) return { synced: false, reason: 'no-ddl-dir' };

  const ddlFiles = readdirSync(sqlDir).filter(f => f.endsWith('.sql'));
  if (ddlFiles.length === 0) return { synced: false, reason: 'no-ddl-files' };

  let baseline = existsSync(dstPath) ? readFileSync(dstPath, 'utf-8')
    : `-- Schema Baseline\n-- Auto-maintained by arch-merge (generated, do not edit)\n\n`;
  let added = 0;

  for (const f of ddlFiles) {
    const marker = `-- === ${f} (change: ${changeName}) ===`;
    if (baseline.includes(marker)) continue; // 幂等：已存在跳过
    const content = readFileSync(join(sqlDir, f), 'utf-8');
    baseline += `\n${marker}\n${content}\n`;
    added++;
  }

  writeFile(dstPath, baseline, 'utf-8');
  return { synced: true, file: 'schema-baseline.sql', ddlCount: ddlFiles.length, added };
}

/* ============ 生成式产物：PHYSICAL-MODEL / DATABASE / API-INDEX ============ */

/** Step 3: PHYSICAL-MODEL.md 生成式（从 schema-baseline.sql 反向生成，禁改）。 */
function generatePhysicalModel(globalArchDir, schemaPath) {
  const dstPath = join(globalArchDir, 'PHYSICAL-MODEL.md');
  const header = '# Physical Model（generated by arch-merge, do not edit）\n\n';
  if (!existsSync(schemaPath)) {
    writeFile(dstPath, header + '> schema-baseline.sql 不存在，暂无物理模型。\n', 'utf-8');
    return { generated: true, file: 'PHYSICAL-MODEL.md', tables: 0 };
  }
  const sql = readFileSync(schemaPath, 'utf-8');
  const tables = extractTablesFromSql(sql);
  const lines = [header, '> 从 schema-baseline.sql 自动生成（P2 机器管结构，DDL 为事实源）。\n'];
  for (const t of tables) {
    lines.push(`### ${t}`, '', '| 字段 | 类型 | 约束 |', '|------|------|------|', '', '');
  }
  writeFile(dstPath, lines.join('\n'), 'utf-8');
  return { generated: true, file: 'PHYSICAL-MODEL.md', tables: tables.length };
}

/** Step 3b: DATABASE.md 生成式（从 schema-baseline + PHYSICAL-MODEL 再生成，禁改）。 */
function generateDatabase(globalArchDir, schemaPath) {
  const dstPath = join(globalArchDir, 'DATABASE.md');
  const header = '# Database（generated by arch-merge, do not edit）\n\n';
  if (!existsSync(schemaPath)) {
    writeFile(dstPath, header + '> schema-baseline.sql 不存在，暂无库表说明。\n', 'utf-8');
    return { generated: true, file: 'DATABASE.md', tables: 0 };
  }
  const sql = readFileSync(schemaPath, 'utf-8');
  const tables = extractTablesFromSql(sql);
  const lines = [header, '> 从 schema-baseline.sql + PHYSICAL-MODEL.md + changelog/ 再生成（v0.14 §62.2，构造上消除漂移）。\n'];
  lines.push('| 表名 | 来源 | 状态 |', '|------|------|------|');
  for (const t of tables) {
    lines.push(`| ${t} | schema-baseline.sql | 实际落地 |`);
  }
  writeFile(dstPath, lines.join('\n'), 'utf-8');
  return { generated: true, file: 'DATABASE.md', tables: tables.length };
}

/** v0.36.3 §62.4：判断 change 是否已关闭（读 .team-flow.yaml state）。 */
function isChangeClosed(changeRoot) {
  const stateFile = join(changeRoot, '.team-flow.yaml');
  if (!existsSync(stateFile)) return false;
  const m = readFileSync(stateFile, 'utf-8').match(/^state:\s*(.*)$/m);
  const state = m ? m[1].trim() : '';
  return state === 'closed' || state === 'closing';
}

/**
 * Step 6: API-INDEX.md 生成式（api-scan 核心）。
 * 扫描项目根下所有已关闭 change 的 architecture/api.md + domains/，归一化端点重建。
 * 保护：①重建结果为空 → 拒绝覆盖（防历史手工端点被抹）；②只扫已关闭 change（v0.36.3，在途半成品端点不得入全局）。
 */
function generateApiIndex(projectRoot, globalArchDir, changeName) {
  const changesDir = join(projectRoot, 'changes');
  const dstPath = join(globalArchDir, 'API-INDEX.md');
  const header = '# API Index（generated by arch-merge, do not edit）\n\n';

  const endpoints = [];
  if (existsSync(changesDir)) {
    for (const changeDirName of readdirSync(changesDir)) {
      const changeRoot = join(changesDir, changeDirName);
      if (!isChangeClosed(changeRoot)) continue; // v0.36.3：只扫已关闭 change
      const apiPath = join(changeRoot, 'architecture', 'api.md');
      if (!existsSync(apiPath)) continue;
      const ep = extractEndpoints(readFileSync(apiPath, 'utf-8'));
      for (const e of ep) endpoints.push({ ...e, source: changeDirName });
    }
  }

  // 空结果拒绝覆盖（数据丢失保护）
  if (endpoints.length === 0 && existsSync(dstPath)) {
    return { generated: false, reason: 'empty-scan-skip-overwrite', file: 'API-INDEX.md', endpoints: 0 };
  }

  const lines = [header, '> 扫描 changes/**/api.md + domains/* 归一化端点重建（v0.14 §62.4）。\n'];
  lines.push('| 方法 | 路径 | 分流 | 来源 |', '|------|------|------|------|');
  for (const e of endpoints) {
    lines.push(`| ${e.method || '—'} | ${e.path} | ${e.kind} | ${e.source} |`);
  }
  writeFile(dstPath, lines.join('\n'), 'utf-8');
  return { generated: true, file: 'API-INDEX.md', endpoints: endpoints.length };
}

/* ============ 冲突预检 ============ */

/**
 * Step 1b: 冲突预检（落地 v0.10 §28.4 三个 TODO 的一部分）。
 * 端点冲突：新端点 vs 全局 API-INDEX 已有（同 path 不同 method/kind）。
 * 聚合重定义：新聚合 id vs 全局 ARCHITECTURE.md 当前态注册表（已存在则阻断 + 提示转产品级）。
 */
function conflictCheck(changeDir, archDir, globalArchDir, changeName) {
  const conflicts = [];
  const apiPath = join(archDir, 'api.md');
  const archPath = join(archDir, 'architecture.md');

  if (existsSync(apiPath)) {
    const newEndpoints = extractEndpoints(readFileSync(apiPath, 'utf-8'));
    const indexPath = join(globalArchDir, 'API-INDEX.md');
    if (existsSync(indexPath)) {
      // 全局端点带来源（API-INDEX 生成格式列3=来源）；排除本 change 自身的（幂等重复不冲突）
      const existingByKey = new Map();
      for (const line of readFileSync(indexPath, 'utf-8').split('\n')) {
        if (!line.trim().startsWith('|')) continue;
        const cells = line.trim().slice(1, -1).split('|').map(c => c.trim().replace(/`/g, ''));
        if (cells.length < 4) continue;
        const method = cells[0], path = cells[1], source = cells[3];
        if (!/^\/[\w\-/{}.]+$/.test(path)) continue;
        existingByKey.set(`${method}:${path}`, source);
      }
      for (const e of newEndpoints) {
        const key = `${e.method}:${e.path}`;
        if (existingByKey.has(key) && existingByKey.get(key) !== changeName) {
          conflicts.push(`端点 ${e.method} ${e.path} 已被 change ${existingByKey.get(key)} 占用 → 阻断`);
        }
      }
    }
  }

  if (existsSync(archPath)) {
    const newAggregates = extractAggregates(readFileSync(archPath, 'utf-8'));
    const dstPath = join(globalArchDir, 'ARCHITECTURE.md');
    if (existsSync(dstPath)) {
      const existingAggregates = extractAggregates(readFileSync(dstPath, 'utf-8'));
      for (const a of newAggregates) {
        const existing = existingAggregates.find(e => e.id === a.id);
        // 排除本 change 自身的聚合（幂等重复不冲突）；其他 change 声明所有权 → 阻断转产品级
        if (existing && existing.source && existing.source !== `change:${changeName}`) {
          conflicts.push(`聚合 ${a.id} 已被 ${existing.source} 声明所有权 → 阻断，转产品级架构修订决策门（v0.14 §61.3）`);
        }
      }
    }
  }

  return { conflicts };
}

/* ============ INDEX 确定性统计 ============ */

/** Step 7: INDEX.md 确定性统计（表数解析 schema-baseline，端点数解析 API-INDEX 结构，非垃圾进垃圾出）。 */
function updateIndex(globalArchDir, changeName) {
  const indexPath = join(globalArchDir, 'INDEX.md');
  const date = new Date().toISOString().slice(0, 10);

  const bcCount = (() => {
    const p = join(globalArchDir, 'ARCHITECTURE.md');
    if (!existsSync(p)) return null;
    const agg = extractAggregates(readFileSync(p, 'utf-8'));
    return new Set(agg.map(a => a.context)).size;
  })();

  const tableCount = (() => {
    const p = join(globalArchDir, 'schema-baseline.sql');
    if (!existsSync(p)) return null;
    return extractTablesFromSql(readFileSync(p, 'utf-8')).length;
  })();

  const endpointCount = (() => {
    const p = join(globalArchDir, 'API-INDEX.md');
    if (!existsSync(p)) return null;
    return extractEndpoints(readFileSync(p, 'utf-8')).length;
  })();

  const lines = [
    `# Architecture Index`,
    ``,
    `> 本文件始终加载，各产物按需 Read。`,
    `> Last updated: change=${changeName}, ${date}`,
    ``,
    `## 统计（确定性源）`,
    `- 限界上下文: ${bcCount ?? 0}`,
    `- 表数量: ${tableCount ?? 0}`,
    `- 端点数量: ${endpointCount ?? 0}`,
    ``,
  ];

  for (const f of ['ARCHITECTURE.md', 'PHYSICAL-MODEL.md', 'DATABASE.md', 'API-INDEX.md', 'schema-baseline.sql']) {
    if (existsSync(join(globalArchDir, f))) {
      lines.push(`- ${f}: ✅`);
    }
  }

  writeFile(indexPath, lines.join('\n') + '\n', 'utf-8');
  return { updated: true };
}

/* ============ Step 1: 预检 ============ */

function preCheck(changeDir, archDir, projectRoot) {
  const conflicts = [];
  if (!existsSync(archDir)) {
    return { pass: false, conflicts: ['architecture/ directory not found in change'] };
  }
  for (const f of ['architecture.md', 'database.md', 'api.md']) {
    const fp = join(archDir, f);
    if (!existsSync(fp)) conflicts.push(`architecture/${f} missing`);
    else if (readFileSync(fp, 'utf-8').trim().length === 0) conflicts.push(`architecture/${f} empty`);
  }
  return { pass: conflicts.length === 0, conflicts };
}

/* ============ Step 5: 变更脚本归档（保留） ============ */

function archiveChangeScripts(changeDir, archDir, globalArchDir, changeName) {
  const report = { ddl: 0, migration: 0, files: [] };
  for (const subDir of ['ddl', 'migration']) {
    const srcDir = join(archDir, 'sql', subDir);
    const dstDir = join(globalArchDir, 'changelog', subDir);
    if (!existsSync(srcDir)) continue;
    if (!existsSync(dstDir)) makeDir(dstDir);
    const files = readdirSync(srcDir).filter(f => f.endsWith('.sql'));
    for (const f of files) {
      copyFile(join(srcDir, f), join(dstDir, f));
      report.files.push(join(dstDir, f)); // v0.36.3：changelog 文件入白名单（防自我制造脏文件告警）
    }
    report[subDir] += files.length;
  }
  return report;
}

/* ============ Step 8: 白名单 git commit ============ */

function gitCommit(projectRoot, globalArchDir, touchedFiles, changeName, dryRun) {
  const commitMsg = `arch-merge: ${changeName} — sync architecture artifacts to global docs/architecture/`;
  if (dryRun) {
    console.log(`  [DRY-RUN] Would commit: ${commitMsg}`);
    return { committed: false, dryRun: true };
  }
  try {
    // 白名单：只 add 本次 touch 的文件（防卷走他人未提交工作）
    for (const f of touchedFiles) {
      execSync(`git add "${f}"`, { stdio: 'pipe' });
    }
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'pipe' });
    return { committed: true, message: commitMsg };
  } catch (e) {
    return { committed: false, error: e.message };
  }
}

/** 检测 docs/architecture/ 下非本次 touch 的脏文件（团队协作安全底线）。 */
function detectUntouchedDirtyFiles(globalArchDir, touchedFiles) {
  try {
    const status = execSync(`git status --porcelain -- ${globalArchDir}`, { stdio: 'pipe' }).toString();
    const dirty = status.split('\n').filter(Boolean)
      .map(line => line.replace(/^\S+\s+/, '').trim())
      .filter(p => p && !touchedFiles.includes(resolve(p)) && !touchedFiles.includes(p));
    return dirty;
  } catch {
    return [];
  }
}

/* ============ run ============ */

export function run(args = {}) {
  if (Array.isArray(args)) {
    const parsed = { _: [] };
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--project-root' && args[i + 1] && !args[i + 1].startsWith('--')) parsed.projectRoot = args[++i];
      else if (args[i] === '--dry-run') parsed.dryRun = true;
      else if (!args[i].startsWith('--')) parsed._.push(args[i]);
    }
    args = parsed;
  }

  const changeDir = args._?.[0] || args.changeDir;
  const dryRun = args.dryRun || false;
  if (!changeDir) {
    console.error('Usage: tf arch-merge <change-dir> [--project-root <path>] [--dry-run]');
    process.exit(1);
  }

  let projectRoot = args.projectRoot;
  if (!projectRoot) {
    const abs = resolve(changeDir);
    const changesIdx = abs.lastIndexOf(sep + 'changes' + sep);
    projectRoot = changesIdx > 0 ? abs.slice(0, changesIdx) : process.cwd();
  }

  const changeName = basename(changeDir.replace(/\/$/, ''));
  const archDir = join(changeDir, 'architecture');
  const globalArchDir = join(projectRoot, 'docs', 'architecture');
  const schemaPath = join(globalArchDir, 'schema-baseline.sql');

  DRY_RUN = dryRun;

  console.log(`\narch-merge: ${changeName}`);
  console.log(`  Source: ${archDir}`);
  console.log(`  Target: ${globalArchDir}`);
  if (dryRun) console.log(`  Mode: DRY-RUN`);

  // 写锁（硬门禁 3）
  const lockPath = acquireLock(projectRoot);
  try {
    if (!existsSync(globalArchDir)) makeDir(globalArchDir);

    // Step 1: 预检
    const preCheckResult = preCheck(changeDir, archDir, projectRoot);
    if (!preCheckResult.pass) {
      console.error('  Pre-check FAILED:');
      for (const c of preCheckResult.conflicts) console.error(`    - ${c}`);
      return { merged: false, reason: 'pre-check-failed', conflicts: preCheckResult.conflicts };
    }

    // Step 1b: 冲突预检
    const conflictResult = conflictCheck(changeDir, archDir, globalArchDir, changeName);
    if (conflictResult.conflicts.length > 0) {
      console.error('  Conflict check FAILED:');
      for (const c of conflictResult.conflicts) console.error(`    - ${c}`);
      return { merged: false, reason: 'conflict', conflicts: conflictResult.conflicts };
    }

    // Step 2: ARCHITECTURE.md（当前态 upsert）
    const archResult = mergeArchitecture(changeDir, archDir, globalArchDir, changeName);

    // Step 4: schema-baseline.sql（幂等追加）——先同步 DDL，供 PHYSICAL-MODEL/DATABASE 生成消费
    const schemaResult = syncSchemaBaseline(changeDir, archDir, globalArchDir, changeName);

    // Step 3: PHYSICAL-MODEL.md（生成式，从 schema-baseline.sql）
    const pmResult = generatePhysicalModel(globalArchDir, schemaPath);

    // Step 3b: DATABASE.md（生成式，从 schema-baseline.sql）
    const dbResult = generateDatabase(globalArchDir, schemaPath);

    // Step 5: 归档
    const archiveResult = archiveChangeScripts(changeDir, archDir, globalArchDir, changeName);

    // Step 6: API-INDEX.md（生成式）
    const apiResult = generateApiIndex(projectRoot, globalArchDir, changeName);

    // Step 7: INDEX.md
    const indexResult = updateIndex(globalArchDir, changeName);

    // Step 8: 白名单 git commit
    const touchedFiles = [
      join(globalArchDir, 'ARCHITECTURE.md'),
      join(globalArchDir, 'PHYSICAL-MODEL.md'),
      join(globalArchDir, 'DATABASE.md'),
      join(globalArchDir, 'schema-baseline.sql'),
      join(globalArchDir, 'API-INDEX.md'),
      join(globalArchDir, 'INDEX.md'),
      ...(archiveResult.files || []),  // v0.36.3：changelog/ 复制文件入白名单
    ].filter(p => existsSync(p));
    const dirty = detectUntouchedDirtyFiles(globalArchDir, touchedFiles);
    if (dirty.length > 0) {
      console.warn(`  [WARN] docs/architecture/ 存在非本次 touch 的脏文件（${dirty.length} 个）：${dirty.slice(0, 5).join(', ')} — 白名单 git add 不卷走它们，但请确认是否他人未提交工作`);
    }
    const commitResult = gitCommit(projectRoot, globalArchDir, touchedFiles, changeName, dryRun);

    console.log('\narch-merge complete.');
    return {
      merged: true,
      changeName,
      steps: {
        architecture: archResult, physicalModel: pmResult, database: dbResult,
        schema: schemaResult, archive: archiveResult, apiIndex: apiResult,
        index: indexResult, commit: commitResult,
      },
    };
  } finally {
    releaseLock(lockPath);
  }
}

// 支持直接执行（仅当被 node 直接运行，非被 import——node --test 加载时 process.argv[1] 可能含文件名片段）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project-root' && args[i + 1]) parsed.projectRoot = args[++i];
    else if (args[i] === '--dry-run') parsed.dryRun = true;
    else if (!args[i].startsWith('--')) parsed._.push(args[i]);
  }
  run(parsed);
}
