#!/usr/bin/env node
/**
 * test-merge — change 完成后将测试增量合并回全局 docs/test-ledger/
 *
 * v0.12 §43.3 定义，v0.31.0 实现为 CLI 子命令
 * 用法：tf test-merge <change-dir> [--project-root <path>] [--dry-run]
 *
 * 功能（6 步流程）：
 * 1. preCheck — 校验 test-matrix.md 存在且非空
 * 2. mergeBaselines — 按模块提取 case，增量合并到 baselines/{module}.md
 * 3. resolveDeferred — 新 case 覆盖了旧 deferred 项 → 从 Deferred Items 移除
 * 4. appendChangelog — 归档 test-matrix.md → changelog/{change-id}.md
 * 5. rewriteIndex — 统计模块数/case 数/deferred 数，重写 INDEX.md
 * 6. gitCommit — 单次原子提交
 *
 * 回写顺序：arch-merge → prototype-sync → test-merge → compound promotion
 */

import { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename, relative, resolve } from 'node:path';
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
 * Step 1: 预检 — 校验 test-matrix.md 存在且非空
 */
function preCheck(changeDir) {
  const matrixPath = join(changeDir, 'test-matrix.md');
  if (!existsSync(matrixPath)) {
    return { pass: false, reason: 'test-matrix.md not found — skipping test-merge' };
  }
  const content = readFileSync(matrixPath, 'utf-8');
  if (content.trim().length === 0) {
    return { pass: false, reason: 'test-matrix.md is empty — skipping test-merge' };
  }
  return { pass: true, content };
}

/**
 * 从 test-matrix.md 提取 Summary 统计信息
 */
function extractSummary(content) {
  const summary = { totalCases: 0, modules: 0, unitCases: 0, integrationCases: 0, deferred: 0 };
  const lines = content.split('\n');
  for (const line of lines) {
    const totalMatch = line.match(/Total cases:\s*(\d+)/i);
    if (totalMatch) summary.totalCases = parseInt(totalMatch[1], 10);
    const modulesMatch = line.match(/Modules covered:\s*(\d+)/i);
    if (modulesMatch) summary.modules = parseInt(modulesMatch[1], 10);
    const unitMatch = line.match(/Unit cases:\s*(\d+)/i);
    if (unitMatch) summary.unitCases = parseInt(unitMatch[1], 10);
    const intMatch = line.match(/Integration cases:\s*(\d+)/i);
    if (intMatch) summary.integrationCases = parseInt(intMatch[1], 10);
    const defMatch = line.match(/Deferred items:\s*(\d+)/i);
    if (defMatch) summary.deferred = parseInt(defMatch[1], 10);
  }
  return summary;
}

/**
 * 从 test-matrix.md 提取模块分段（## Cases 下的 ### 子段）
 * 返回 { moduleName: sectionContent } 映射
 */
function extractModuleSections(content) {
  const sections = {};
  const lines = content.split('\n');
  let currentModule = null;
  let currentLines = [];

  for (const line of lines) {
    if (line.startsWith('### ') && !line.startsWith('### #')) {
      if (currentModule) {
        sections[currentModule] = currentLines.join('\n');
      }
      currentModule = line.replace(/^###\s+/, '').trim();
      currentLines = [line];
    } else if (currentModule) {
      currentLines.push(line);
    }
  }
  if (currentModule) {
    sections[currentModule] = currentLines.join('\n');
  }
  return sections;
}

/**
 * 从 test-matrix.md 提取 Candidate Coverage Ledger
 */
function extractCandidateLedger(content) {
  const candidates = [];
  const lines = content.split('\n');
  let inLedger = false;

  for (const line of lines) {
    if (line.match(/## Candidate Coverage Ledger/i)) {
      inLedger = true;
      continue;
    }
    if (inLedger && line.startsWith('## ')) {
      break;
    }
    if (inLedger && line.startsWith('|') && !line.match(/^\|\s*[-:]+/)) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3 && cells[0] !== 'candidate') {
        candidates.push({
          candidate: cells[0],
          category: cells[1] || 'unknown',
          decision: cells[2] || 'unknown',
          caseIds: cells[3] || '',
          reason: cells[4] || '',
        });
      }
    }
  }
  return candidates;
}

/**
 * 从 test-matrix.md 提取 Deferred Items
 */
function extractDeferredItems(content) {
  const items = [];
  const lines = content.split('\n');
  let inDeferred = false;

  for (const line of lines) {
    if (line.match(/## Deferred Items/i)) {
      inDeferred = true;
      continue;
    }
    if (inDeferred && line.startsWith('## ')) {
      break;
    }
    if (inDeferred && line.startsWith('|') && !line.match(/^\|\s*[-:]+/)) {
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3 && cells[0] !== 'case_id') {
        items.push({
          caseId: cells[0],
          behavior: cells[1] || '',
          designMethod: cells[2] || '',
          reason: cells[3] || '',
          deferredSince: cells[4] || new Date().toISOString().slice(0, 10),
        });
      }
    }
  }
  return items;
}

/**
 * Step 2: mergeBaselines — 增量合并到 baselines/{module}.md
 */
function mergeBaselines(ledgerDir, changeName, moduleSections, candidateLedger, deferredItems) {
  const baselinesDir = join(ledgerDir, 'baselines');
  if (!existsSync(baselinesDir)) {
    mkdirSync(baselinesDir, { recursive: true });
  }

  const results = {};
  const today = new Date().toISOString().slice(0, 10);

  for (const [moduleName, sectionContent] of Object.entries(moduleSections)) {
    const safeName = moduleName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const baselinePath = join(baselinesDir, `${safeName}.md`);
    const moduleCandidates = candidateLedger.filter(c =>
      c.candidate.toLowerCase().includes(moduleName.toLowerCase())
    );
    const moduleDeferred = deferredItems.filter(d =>
      d.caseId.toLowerCase().startsWith(moduleName.toLowerCase().slice(0, 3))
    );

    if (existsSync(baselinePath)) {
      // 增量合并：读取现有 baseline，追加新 case
      const existing = readFileSync(baselinePath, 'utf-8');
      const updated = mergeExistingBaseline(existing, sectionContent, changeName, today, moduleCandidates, moduleDeferred);
      if (!updated) continue; // no changes
      writeFileSync(baselinePath, updated, 'utf-8');
      results[moduleName] = 'updated';
    } else {
      // 新建 baseline
      const newBaseline = createNewBaseline(moduleName, sectionContent, changeName, today, moduleCandidates, moduleDeferred);
      writeFileSync(baselinePath, newBaseline, 'utf-8');
      results[moduleName] = 'created';
    }
  }
  return results;
}

/**
 * 创建新 baseline 文件
 */
function createNewBaseline(moduleName, sectionContent, changeName, date, candidates, deferred) {
  const lines = [];
  lines.push(`# ${moduleName} Test Baseline`);
  lines.push('');
  lines.push(`> schema_version: 1`);
  lines.push(`> last_updated_by_change: ${changeName}`);
  lines.push(`> last_updated: ${date}`);
  lines.push('');
  lines.push('## Current Cases（当前态 — 覆盖式）');
  lines.push('');
  lines.push('| case_id | behavior | design_method | test_kind | test_tier | work_mode | test_file | test_method_name | source_change |');
  lines.push('|---|---|---|---|---|---|---|---|---|');

  // 从 sectionContent 提取 case 行并添加 source_change 列
  const caseLines = sectionContent.split('\n').filter(l =>
    l.startsWith('|') && !l.match(/^\|\s*[-:]+/) && !l.match(/\|\s*case_id/)
  );
  for (const line of caseLines) {
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 10) {
      lines.push(`| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[5]} | ${cells[6]} | ${cells[8]} | ${cells[9]} | ${cells[10]} | ${changeName} |`);
    }
  }

  if (deferred.length > 0) {
    lines.push('');
    lines.push('## Deferred Items');
    lines.push('');
    lines.push('| case_id | behavior | design_method | reason | deferred_since |');
    lines.push('|---|---|---|---|---|');
    for (const d of deferred) {
      lines.push(`| ${d.caseId} | ${d.behavior} | ${d.designMethod} | ${d.reason} | ${d.deferredSince} |`);
    }
  }

  lines.push('');
  lines.push('## Evolution Log（append-only）');
  lines.push('');
  const caseCount = caseLines.length;
  lines.push(`- **${date}** [${changeName}]: 新增 ${caseCount} case, defer ${deferred.length}`);

  return lines.join('\n') + '\n';
}

/**
 * 合并现有 baseline（增量更新 Current Cases + 追加 Evolution Log）
 */
function mergeExistingBaseline(existing, sectionContent, changeName, date, candidates, deferred) {
  const lines = [];
  const existingLines = existing.split('\n');

  // 更新 frontmatter
  let inFrontmatter = false;
  let frontmatterDone = false;
  for (const line of existingLines) {
    if (line.startsWith('> last_updated_by_change:')) {
      lines.push(`> last_updated_by_change: ${changeName}`);
    } else if (line.startsWith('> last_updated:')) {
      lines.push(`> last_updated: ${date}`);
    } else if (line.startsWith('## Current Cases')) {
      // 插入 Current Cases header，然后用新数据替换表格
      lines.push(line);
      lines.push('');
      lines.push('| case_id | behavior | design_method | test_kind | test_tier | work_mode | test_file | test_method_name | source_change |');
      lines.push('|---|---|---|---|---|---|---|---|---|');
      inFrontmatter = true;
      // 跳过旧表格
      continue;
    } else if (inFrontmatter && (line.startsWith('## ') || line.startsWith(''))) {
      inFrontmatter = false;
      // 插入新的 case 行
      const caseLines = sectionContent.split('\n').filter(l =>
        l.startsWith('|') && !l.match(/^\|\s*[-:]+/) && !l.match(/\|\s*case_id/)
      );
      for (const cl of caseLines) {
        const cells = cl.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 10) {
          lines.push(`| ${cells[0]} | ${cells[1]} | ${cells[2]} | ${cells[5]} | ${cells[6]} | ${cells[8]} | ${cells[9]} | ${cells[10]} | ${changeName} |`);
        }
      }
      lines.push(line);
    } else if (inFrontmatter && line.startsWith('|')) {
      // 跳过旧表格行（已替换）
      continue;
    } else if (line.startsWith('## Evolution Log')) {
      lines.push(line);
      lines.push('');
      const caseCount = sectionContent.split('\n').filter(l =>
        l.startsWith('|') && !l.match(/^\|\s*[-:]+/) && !l.match(/\|\s*case_id/)
      ).length;
      lines.push(`- **${date}** [${changeName}]: 新增 ${caseCount} case, defer ${deferred.length}`);
      frontmatterDone = true;
    } else if (frontmatterDone && line.startsWith('- **')) {
      // 保留旧的 evolution log entries
      lines.push(line);
    } else if (!inFrontmatter) {
      lines.push(line);
    }
  }

  return lines.join('\n') + '\n';
}

/**
 * Step 3: resolveDeferred — 新 case 覆盖了旧 deferred 项
 */
function resolveDeferred(ledgerDir, changeName, newCaseIds) {
  const baselinesDir = join(ledgerDir, 'baselines');
  if (!existsSync(baselinesDir)) return { resolved: 0 };

  let resolved = 0;
  for (const file of readdirSync(baselinesDir)) {
    if (!file.endsWith('.md')) continue;
    const fp = join(baselinesDir, file);
    let content = readFileSync(fp, 'utf-8');
    let changed = false;

    // 移除 Deferred Items 中被新 case 覆盖的行
    for (const caseId of newCaseIds) {
      const regex = new RegExp(`\\|\\s*${escapeRegex(caseId)}\\s*\\|[^\\n]*\\n`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, '');
        changed = true;
        resolved++;
      }
    }

    if (changed) {
      writeFileSync(fp, content, 'utf-8');
    }
  }
  return { resolved };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Step 4: appendChangelog — 归档 test-matrix.md
 */
function appendChangelog(ledgerDir, changeName, matrixContent) {
  const changelogDir = join(ledgerDir, 'changelog');
  if (!existsSync(changelogDir)) {
    mkdirSync(changelogDir, { recursive: true });
  }
  const destPath = join(changelogDir, `${changeName}.md`);
  writeFileSync(destPath, matrixContent, 'utf-8');
  return destPath;
}

/**
 * Step 5: rewriteIndex — 重写 INDEX.md
 */
function rewriteIndex(ledgerDir) {
  const baselinesDir = join(ledgerDir, 'baselines');
  const indexPath = join(ledgerDir, 'INDEX.md');
  const today = new Date().toISOString().slice(0, 10);

  const modules = [];
  if (existsSync(baselinesDir)) {
    for (const file of readdirSync(baselinesDir)) {
      if (!file.endsWith('.md')) continue;
      const content = readFileSync(join(baselinesDir, file), 'utf-8');
      const moduleName = file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      // 统计 case 数
      const caseMatches = content.match(/\|\s*\S+-\S+-\S+-\d+/g) || [];
      const caseCount = caseMatches.length;

      // 统计 deferred 数
      const deferredSection = content.split('## Deferred Items')[1] || '';
      const deferredMatches = deferredSection.match(/\|\s*\S+-\S+-\S+-\d+/g) || [];
      const deferredCount = deferredMatches.length;

      // 提取 last_updated_by_change
      const changeMatch = content.match(/last_updated_by_change:\s*(.+)/);
      const lastChange = changeMatch ? changeMatch[1].trim() : 'unknown';
      const dateMatch = content.match(/last_updated:\s*(.+)/);
      const lastDate = dateMatch ? dateMatch[1].trim() : 'unknown';

      // coverage_status
      let status = '✅ baseline';
      if (deferredCount > 0) status = '⚠️ partial';
      if (caseCount === 0) status = '⏭️ not_applicable';

      // test_tier_breakdown
      const unitCount = (content.match(/unit/gi) || []).length;
      const intCount = (content.match(/integration/gi) || []).length;

      modules.push({ moduleName, caseCount, deferredCount, lastChange, lastDate, status, unitCount, intCount });
    }
  }

  const totalCases = modules.reduce((sum, m) => sum + m.caseCount, 0);
  const totalDeferred = modules.reduce((sum, m) => sum + m.deferredCount, 0);

  const lines = [];
  lines.push('# Test Ledger Index');
  lines.push('');
  lines.push('> Auto-generated by `tf test-merge`. Do not edit manually.');
  lines.push('');
  lines.push(`**Modules**: ${modules.length} | **Total Cases**: ${totalCases} | **Deferred**: ${totalDeferred} | **Last Updated**: ${today}`);
  lines.push('');
  lines.push('| module | test_tier_breakdown | case_count | deferred | last_change | last_date | coverage_status |');
  lines.push('|---|---|---|---|---|---|---|');

  for (const m of modules) {
    lines.push(`| ${m.moduleName} | unit:${m.unitCount}, integration:${m.intCount} | ${m.caseCount} | ${m.deferredCount} | ${m.lastChange} | ${m.lastDate} | ${m.status} |`);
  }

  writeFileSync(indexPath, lines.join('\n') + '\n', 'utf-8');
  return { modules: modules.length, totalCases, totalDeferred };
}

/**
 * Step 6: gitCommit — 原子性提交
 */
function gitCommit(projectRoot, changeName, dryRun) {
  const msg = `test-ledger: merge test results from ${changeName}`;
  if (dryRun) {
    console.log(`[DRY-RUN] Would commit: git add docs/test-ledger/ && git commit -m "${msg}"`);
    return;
  }
  try {
    execSync('git add docs/test-ledger/', { cwd: projectRoot, stdio: 'pipe' });
    execSync(`git commit -m "${msg}"`, { cwd: projectRoot, stdio: 'pipe' });
    console.log(`✅ test-ledger committed: ${msg}`);
  } catch (err) {
    // Nothing to commit is acceptable (e.g., no changes)
    if (err.message && err.message.includes('nothing to commit')) {
      console.log('ℹ️  No changes to commit in test-ledger');
    } else {
      console.error(`⚠️  git commit warning: ${err.message}`);
    }
  }
}

/**
 * CLI entry point — export as `run()` for registration
 */
export async function run(args) {
  const argv = parseArgv(args || process.argv.slice(2));
  const projectRoot = resolve(argv.projectRoot || process.cwd());

  // Delegate to main()
  await main(argv, projectRoot);
}

/**
 * 主入口
 */
async function main(argv, projectRoot) {
  const changeDir = argv._[0];
  const dryRun = argv.dryRun || false;

  if (!changeDir) {
    console.error('Usage: tf test-merge <change-dir> [--project-root <path>] [--dry-run]');
    process.exit(2);
  }

  const absChangeDir = resolve(changeDir);
  const changeName = extractChangeName(absChangeDir);
  const ledgerDir = join(projectRoot, 'docs', 'test-ledger');

  console.log(`📋 test-merge: ${changeName} → ${ledgerDir}`);

  // Step 1: preCheck
  const preCheckResult = preCheck(absChangeDir);
  if (!preCheckResult.pass) {
    console.log(`⏭️  ${preCheckResult.reason}`);
    process.exit(0);
  }
  console.log('✅ Step 1: preCheck passed');

  const matrixContent = preCheckResult.content;
  const summary = extractSummary(matrixContent);
  const moduleSections = extractModuleSections(matrixContent);
  const candidateLedger = extractCandidateLedger(matrixContent);
  const deferredItems = extractDeferredItems(matrixContent);

  console.log(`   Summary: ${summary.totalCases} cases, ${summary.modules} modules, ${summary.deferred} deferred`);

  // Ensure ledger directory exists
  if (!existsSync(ledgerDir)) {
    mkdirSync(ledgerDir, { recursive: true });
  }

  // Step 2: mergeBaselines
  const mergeResults = mergeBaselines(ledgerDir, changeName, moduleSections, candidateLedger, deferredItems);
  console.log(`✅ Step 2: mergeBaselines — ${Object.keys(mergeResults).length} modules processed`);

  // Step 3: resolveDeferred
  const newCaseIds = [];
  for (const section of Object.values(moduleSections)) {
    const lines = section.split('\n');
    for (const line of lines) {
      if (line.startsWith('|') && !line.match(/^\|\s*[-:]+/) && !line.match(/\|\s*case_id/)) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells[0]) newCaseIds.push(cells[0]);
      }
    }
  }
  const deferredResult = resolveDeferred(ledgerDir, changeName, newCaseIds);
  console.log(`✅ Step 3: resolveDeferred — ${deferredResult.resolved} items resolved`);

  // Step 4: appendChangelog
  const changelogPath = appendChangelog(ledgerDir, changeName, matrixContent);
  console.log(`✅ Step 4: appendChangelog — ${relative(projectRoot, changelogPath)}`);

  // Step 5: rewriteIndex
  const indexResult = rewriteIndex(ledgerDir);
  console.log(`✅ Step 5: rewriteIndex — ${indexResult.modules} modules, ${indexResult.totalCases} total cases`);

  // Step 6: gitCommit
  gitCommit(projectRoot, changeName, dryRun);
  console.log('✅ Step 6: gitCommit');

  console.log(`\n🎉 test-merge complete for ${changeName}`);
}

// 直接运行（v0.35.0 修复：main() 无参自调用崩溃 → 调用 run() 走正确参数解析）
if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.argv.slice(2)).catch(err => {
    console.error('test-merge error:', err.message);
    process.exit(1);
  });
}
