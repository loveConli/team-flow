#!/usr/bin/env node
/**
 * arch-merge — change 完成后将架构增量合并回全局 docs/architecture/
 *
 * v0.10 §28.4 定义，v0.23.0 实现为 CLI 子命令
 * 用法：tf arch-merge <change-dir> [--project-root <path>] [--dry-run]
 *
 * 功能（8 步流程）：
 * 1. 一致性预检（结构冲突 / 语义冲突 / 跨域一致性）
 * 2. ARCHITECTURE.md 回写（当前态覆盖 + 演进日志 append）
 * 3. PHYSICAL-MODEL.md 增量合并（变更涉及的表字段级合并）
 * 4. schema-baseline.sql 同步（追加新 DDL，保持完整可执行）
 * 5. 变更脚本归档（sql/ddl/ + sql/migration/ → changelog/）
 * 6. API-INDEX.md 增量更新
 * 7. INDEX.md 更新（摘要统计）
 * 8. 单次 git commit（原子性提交）
 *
 * 回写顺序：arch-merge → prototype-sync（同一 change closing 内，顺序提交）
 */

import { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, basename, relative, dirname, resolve, sep } from 'node:path';
import { execSync } from 'node:child_process';

/**
 * 解析 CLI 参数数组为结构化对象
 */
function parseArgv(argv) {
  const parsed = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project-root' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      parsed.projectRoot = argv[++i];
    } else if (argv[i] === '--dry-run') {
      parsed.dryRun = true;
    } else if (!argv[i].startsWith('--')) {
      parsed._.push(argv[i]);
    }
  }
  return parsed;
}

/**
 * 从 change 目录提取 change name
 */
function extractChangeName(changeDir) {
  return basename(changeDir.replace(/\/$/, ''));
}

/**
 * 读取 markdown 文件中的 frontmatter
 */
function readFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return fm;
}

/**
 * Step 1: 一致性预检
 */
function preCheck(changeDir, archDir, projectRoot) {
  const conflicts = [];

  // 检查 architecture/ 目录是否存在
  if (!existsSync(archDir)) {
    return { pass: false, conflicts: ['architecture/ directory not found in change'] };
  }

  // 检查必要文件
  const requiredFiles = ['architecture.md', 'database.md', 'api.md'];
  for (const f of requiredFiles) {
    const fp = join(archDir, f);
    if (!existsSync(fp)) {
      conflicts.push(`architecture/${f} missing`);
    } else if (readFileSync(fp, 'utf-8').trim().length === 0) {
      conflicts.push(`architecture/${f} empty`);
    }
  }

  // TODO: 结构冲突检测（重复 BC/聚合 key）
  // TODO: 语义冲突检测（同义异名）
  // TODO: 跨域一致性检测（AA ≥ 1 IA 实体）

  return { pass: conflicts.length === 0, conflicts };
}

/**
 * Step 2: ARCHITECTURE.md 回写
 * 当前态覆盖 + 演进日志 append
 */
function mergeArchitecture(changeDir, archDir, globalArchDir, changeName) {
  const srcPath = join(archDir, 'architecture.md');
  const dstPath = join(globalArchDir, 'ARCHITECTURE.md');

  if (!existsSync(srcPath)) return { merged: false, reason: 'no-source' };

  const srcContent = readFileSync(srcPath, 'utf-8');

  // 提取 To-Be 增量设计段
  const toBeMatch = srcContent.match(/## 2\. To-Be 增量设计[\s\S]*?(?=\n## 3\.|\n---|\n$)/);
  const toBeContent = toBeMatch ? toBeMatch[0] : '';

  // 提取演进日志
  const logMatch = srcContent.match(/## 5\. 演进日志[\s\S]*?(?=\n## |\n---|\n$)/);
  const logEntries = logMatch ? logMatch[0] : '';

  if (existsSync(dstPath)) {
    const existing = readFileSync(dstPath, 'utf-8');

    // 追加演进日志（append-only）
    if (logEntries) {
      writeFileSync(dstPath, existing + '\n\n' + logEntries, 'utf-8');
    }
  } else {
    // 首次创建：直接使用 To-Be 段作为当前态
    const header = `# Architecture Baseline\n\n> Last updated: change=${changeName}, ${new Date().toISOString().slice(0, 10)}\n\n`;
    writeFileSync(dstPath, header + toBeContent + '\n\n' + logEntries, 'utf-8');
  }

  return { merged: true, file: 'ARCHITECTURE.md' };
}

/**
 * Step 3: PHYSICAL-MODEL.md 增量合并
 * 仅合并变更涉及的表，未涉及的保持不变
 */
function mergePhysicalModel(changeDir, archDir, globalArchDir, changeName) {
  const dbPath = join(archDir, 'database.md');
  const dstPath = join(globalArchDir, 'PHYSICAL-MODEL.md');

  if (!existsSync(dbPath)) return { merged: false, reason: 'no-source' };

  const dbContent = readFileSync(dbPath, 'utf-8');

  // 提取 Schema 变更表中的目标表名
  const tableMatches = dbContent.matchAll(/\|\s*`(?:CREATE|ALTER)\s+TABLE`?\s*\|\s*(\w+)/gi);
  const affectedTables = new Set();
  for (const m of tableMatches) {
    affectedTables.add(m[1]);
  }

  // TODO: 完整的字段级增量合并逻辑
  // 当前实现：追加变更记录到演进日志段

  if (existsSync(dstPath) && affectedTables.size > 0) {
    const existing = readFileSync(dstPath, 'utf-8');
    const footer = `\n\n<!-- arch-merge: change=${changeName}, ${new Date().toISOString().slice(0, 10)}, tables=${[...affectedTables].join(',')} -->\n`;
    writeFileSync(dstPath, existing + footer, 'utf-8');
  }

  return { merged: true, file: 'PHYSICAL-MODEL.md', tables: [...affectedTables] };
}

/**
 * Step 4: schema-baseline.sql 同步
 */
function syncSchemaBaseline(changeDir, archDir, globalArchDir, changeName) {
  const sqlDir = join(archDir, 'sql', 'ddl');
  const dstPath = join(globalArchDir, 'schema-baseline.sql');

  if (!existsSync(sqlDir)) return { synced: false, reason: 'no-ddl-dir' };

  const ddlFiles = readdirSync(sqlDir).filter(f => f.endsWith('.sql'));
  if (ddlFiles.length === 0) return { synced: false, reason: 'no-ddl-files' };

  let baseline = '';
  if (existsSync(dstPath)) {
    baseline = readFileSync(dstPath, 'utf-8');
  } else {
    baseline = `-- Schema Baseline\n-- Auto-maintained by arch-merge\n-- Last updated: change=${changeName}, ${new Date().toISOString().slice(0, 10)}\n\n`;
  }

  // 追加新 DDL
  for (const f of ddlFiles) {
    const content = readFileSync(join(sqlDir, f), 'utf-8');
    baseline += `\n-- === ${f} (change: ${changeName}) ===\n${content}\n`;
  }

  writeFileSync(dstPath, baseline, 'utf-8');
  return { synced: true, file: 'schema-baseline.sql', ddlCount: ddlFiles.length };
}

/**
 * Step 5: 变更脚本归档
 */
function archiveChangeScripts(changeDir, archDir, globalArchDir, changeName) {
  const report = { ddl: 0, migration: 0 };

  for (const subDir of ['ddl', 'migration']) {
    const srcDir = join(archDir, 'sql', subDir);
    const dstDir = join(globalArchDir, 'changelog', subDir);

    if (!existsSync(srcDir)) continue;

    if (!existsSync(dstDir)) {
      mkdirSync(dstDir, { recursive: true });
    }

    const files = readdirSync(srcDir).filter(f => f.endsWith('.sql'));
    for (const f of files) {
      cpSync(join(srcDir, f), join(dstDir, f));
      report[subDir]++;
    }
  }

  return report;
}

/**
 * Step 6: API-INDEX.md 增量更新
 */
function mergeApiIndex(changeDir, archDir, globalArchDir, changeName) {
  const apiPath = join(archDir, 'api.md');
  const dstPath = join(globalArchDir, 'API-INDEX.md');

  if (!existsSync(apiPath)) return { merged: false, reason: 'no-source' };

  const apiContent = readFileSync(apiPath, 'utf-8');

  // 提取 To-Be 增量中的端点表格
  const endpointMatches = apiContent.matchAll(/\|\s*(\/api\/[^\s|]+)\s*\|\s*(\w+)\s*\|/g);
  const endpoints = [];
  for (const m of endpointMatches) {
    endpoints.push({ path: m[1], method: m[2] });
  }

  // TODO: 完整的增量合并逻辑（新增/修改/删除端点）
  // 当前实现：追加记录

  if (existsSync(dstPath) && endpoints.length > 0) {
    const existing = readFileSync(dstPath, 'utf-8');
    const footer = `\n\n<!-- arch-merge: change=${changeName}, ${new Date().toISOString().slice(0, 10)}, endpoints=${endpoints.length} -->\n`;
    writeFileSync(dstPath, existing + footer, 'utf-8');
  } else if (!existsSync(dstPath)) {
    const header = `# API Index\n\n> Last updated: change=${changeName}, ${new Date().toISOString().slice(0, 10)}\n\n`;
    const sections = `## Command API\n\n| 端点 | 方法 | 聚合 | 事务边界 | 说明 |\n|------|------|------|---------|------|\n\n## Read API\n\n| 端点 | 方法 | 聚合 | 数据来源 | 说明 |\n|------|------|------|---------|------|\n\n## Query API\n\n| 端点 | 方法 | 查询模型 | 阻断测试 | 说明 |\n|------|------|---------|---------|------|\n`;
    writeFileSync(dstPath, header + sections, 'utf-8');
  }

  return { merged: true, file: 'API-INDEX.md', endpoints: endpoints.length };
}

/**
 * Step 7: INDEX.md 更新
 */
function updateIndex(globalArchDir, changeName) {
  const indexPath = join(globalArchDir, 'INDEX.md');
  const date = new Date().toISOString().slice(0, 10);

  // 统计各产物
  const stats = {};

  // ARCHITECTURE.md
  if (existsSync(join(globalArchDir, 'ARCHITECTURE.md'))) {
    const content = readFileSync(join(globalArchDir, 'ARCHITECTURE.md'), 'utf-8');
    const bcMatches = content.matchAll(/### \d+\.\s+(.+)/g);
    stats.architecture = { bcs: [...bcMatches].length };
  }

  // PHYSICAL-MODEL.md
  if (existsSync(join(globalArchDir, 'PHYSICAL-MODEL.md'))) {
    const content = readFileSync(join(globalArchDir, 'PHYSICAL-MODEL.md'), 'utf-8');
    const tableMatches = content.matchAll(/^### \d+\.\s+(.+) \((\w+)\)/gm);
    stats.physicalModel = { tables: [...tableMatches].length };
  }

  // API-INDEX.md
  if (existsSync(join(globalArchDir, 'API-INDEX.md'))) {
    const content = readFileSync(join(globalArchDir, 'API-INDEX.md'), 'utf-8');
    const epMatches = content.matchAll(/\|\s*\/api\//g);
    stats.apiIndex = { endpoints: [...epMatches].length };
  }

  // 生成 INDEX.md
  const lines = [
    `# Architecture Index`,
    ``,
    `> 本文件始终加载，各产物按需 Read。`,
    `> Last updated: change=${changeName}, ${date}`,
    ``,
  ];

  if (stats.architecture) {
    lines.push(
      `## ARCHITECTURE.md`,
      `- 限界上下文: ${stats.architecture.bcs}`,
      `- 最后更新: change=${changeName}, ${date}`,
      `- 读取建议: 按 BC 段落读取`,
      ``
    );
  }

  if (stats.physicalModel) {
    lines.push(
      `## PHYSICAL-MODEL.md`,
      `- 表数量: ${stats.physicalModel.tables}`,
      `- 最后更新: change=${changeName}, ${date}`,
      `- 读取建议: 按业务域段落读取`,
      ``
    );
  }

  if (existsSync(join(globalArchDir, 'schema-baseline.sql'))) {
    lines.push(
      `## schema-baseline.sql`,
      `- 最后更新: change=${changeName}, ${date}`,
      `- 读取建议: 通常不需加载，DDL 由 sql/ 目录独立管理`,
      ``
    );
  }

  if (stats.apiIndex) {
    lines.push(
      `## API-INDEX.md`,
      `- 端点数量: ${stats.apiIndex.endpoints}`,
      `- 最后更新: change=${changeName}, ${date}`,
      `- 读取建议: 按分流区域读取`,
      ``
    );
  }

  if (existsSync(join(globalArchDir, 'CONCEPTS.md'))) {
    lines.push(
      `## CONCEPTS.md`,
      `- 最后更新: bootstrap`,
      ``
    );
  }

  writeFileSync(indexPath, lines.join('\n') + '\n', 'utf-8');
  return { updated: true, stats };
}

/**
 * Step 8: Git commit
 */
function gitCommit(globalArchDir, changeName, dryRun) {
  const commitMsg = `arch-merge: ${changeName} — sync architecture artifacts to global docs/architecture/`;

  if (dryRun) {
    console.log(`  [DRY-RUN] Would commit: ${commitMsg}`);
    return { committed: false, dryRun: true };
  }

  try {
    execSync(`git add ${globalArchDir}/`, { stdio: 'pipe' });
    execSync(`git commit -m "${commitMsg}"`, { stdio: 'pipe' });
    return { committed: true, message: commitMsg };
  } catch (e) {
    return { committed: false, error: e.message };
  }
}

/**
 * 执行 arch-merge 合并
 */
export function run(args = {}) {
  if (Array.isArray(args)) {
    args = parseArgv(args);
  }

  const changeDir = args._?.[0] || args.changeDir;
  const dryRun = args.dryRun || false;

  if (!changeDir) {
    console.error('Usage: tf arch-merge <change-dir> [--project-root <path>] [--dry-run]');
    process.exit(1);
  }

  // project-root: 显式指定 > 从 changeDir 向上推导（changes/xxx → 项目根）
  let projectRoot = args.projectRoot;
  if (!projectRoot) {
    const abs = resolve(changeDir);
    const changesIdx = abs.lastIndexOf(sep + 'changes' + sep);
    projectRoot = changesIdx > 0 ? abs.slice(0, changesIdx) : process.cwd();
  }

  const changeName = extractChangeName(changeDir);
  const archDir = join(changeDir, 'architecture');
  const globalArchDir = join(projectRoot, 'docs', 'architecture');

  console.log(`\narch-merge: ${changeName}`);
  console.log(`  Source: ${archDir}`);
  console.log(`  Target: ${globalArchDir}`);
  if (dryRun) console.log(`  Mode: DRY-RUN`);

  // Step 1: 一致性预检
  console.log('\n[Step 1] Pre-check...');
  const preCheckResult = preCheck(changeDir, archDir, projectRoot);
  if (!preCheckResult.pass) {
    console.error('  Pre-check FAILED:');
    for (const c of preCheckResult.conflicts) {
      console.error(`    - ${c}`);
    }
    return { merged: false, reason: 'pre-check-failed', conflicts: preCheckResult.conflicts };
  }
  console.log('  Pre-check passed');

  // 确保全局目录存在
  if (!existsSync(globalArchDir)) {
    mkdirSync(globalArchDir, { recursive: true });
  }

  // Step 2: ARCHITECTURE.md
  console.log('[Step 2] Merging ARCHITECTURE.md...');
  const archResult = mergeArchitecture(changeDir, archDir, globalArchDir, changeName);
  console.log(`  ${archResult.merged ? '✓' : '✗'} ${archResult.file || archResult.reason}`);

  // Step 3: PHYSICAL-MODEL.md
  console.log('[Step 3] Merging PHYSICAL-MODEL.md...');
  const pmResult = mergePhysicalModel(changeDir, archDir, globalArchDir, changeName);
  console.log(`  ${pmResult.merged ? '✓' : '✗'} ${pmResult.file || pmResult.reason}`);
  if (pmResult.tables?.length > 0) {
    console.log(`  Affected tables: ${pmResult.tables.join(', ')}`);
  }

  // Step 4: schema-baseline.sql
  console.log('[Step 4] Syncing schema-baseline.sql...');
  const schemaResult = syncSchemaBaseline(changeDir, archDir, globalArchDir, changeName);
  console.log(`  ${schemaResult.synced ? '✓' : '✗'} ${schemaResult.file || schemaResult.reason}`);

  // Step 5: 变更脚本归档
  console.log('[Step 5] Archiving change scripts...');
  const archiveResult = archiveChangeScripts(changeDir, archDir, globalArchDir, changeName);
  console.log(`  DDL: ${archiveResult.ddl}, Migration: ${archiveResult.migration}`);

  // Step 6: API-INDEX.md
  console.log('[Step 6] Merging API-INDEX.md...');
  const apiResult = mergeApiIndex(changeDir, archDir, globalArchDir, changeName);
  console.log(`  ${apiResult.merged ? '✓' : '✗'} ${apiResult.file || apiResult.reason}`);

  // Step 7: INDEX.md
  console.log('[Step 7] Updating INDEX.md...');
  const indexResult = updateIndex(globalArchDir, changeName);
  console.log(`  ${indexResult.updated ? '✓' : '✗'} Updated`);

  // Step 8: Git commit
  console.log('[Step 8] Git commit...');
  const commitResult = gitCommit(globalArchDir, changeName, dryRun);
  console.log(`  ${commitResult.committed ? '✓' : (commitResult.dryRun ? '⊘ dry-run' : '✗')} ${commitResult.message || commitResult.error || ''}`);

  console.log('\narch-merge complete.');
  return {
    merged: true,
    changeName,
    steps: { architecture: archResult, physicalModel: pmResult, schema: schemaResult, archive: archiveResult, apiIndex: apiResult, index: indexResult, commit: commitResult },
  };
}

// 支持直接执行
if (process.argv[1]?.includes('arch-merge')) {
  const args = parseArgv(process.argv.slice(2));
  run(args);
}
