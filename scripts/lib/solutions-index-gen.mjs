#!/usr/bin/env node
/**
 * solutions-index-gen — 扫描 docs/solutions/<phase>/ 各阶段目录，重建 INDEX.md
 *
 * v0.5 复利贯穿机制脚本
 * 用法：tf solutions index-gen [--dir <solutions-dir>]
 *
 * 功能：
 * 1. 扫描 docs/solutions/ 下所有子目录中的 .md 文件
 * 2. 解析每个文件的 frontmatter（phase/domain/type/severity/date/summary）
 * 3. 按 severity 降序、date 降序排列
 * 4. 重建 INDEX.md（≤150 行硬上限）
 * 5. 超出 150 条时，淘汰 low severity 且 date 最早的条目
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const PHASES = ['prd', 'plan', 'prototype', 'spec', 'build', 'review', 'cross-phase'];
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
const MAX_INDEX_LINES = 150;

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      fm[key] = val;
    }
  }
  return fm;
}

function extractSummary(content) {
  // 取 frontmatter 后第一个非空行作为摘要
  const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '');
  const lines = body.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  return lines[0]?.trim().slice(0, 80) || '(no summary)';
}

export function run(args = {}) {
  const dir = args.dir || 'docs/solutions';
  const indexPath = join(dir, 'INDEX.md');

  if (!existsSync(dir)) {
    console.error(`Solutions directory not found: ${dir}`);
    process.exit(1);
  }

  const entries = [];

  for (const phase of PHASES) {
    const phaseDir = join(dir, phase);
    if (!existsSync(phaseDir) || !statSync(phaseDir).isDirectory()) continue;

    for (const file of readdirSync(phaseDir)) {
      if (!file.endsWith('.md')) continue;
      const filePath = join(phaseDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatter(content);
      if (!fm) continue;

      entries.push({
        date: fm.date || '1970-01-01',
        phase: fm.phase || phase,
        domain: fm.domain || 'general',
        type: fm.type || 'insight',
        severity: fm.severity || 'low',
        summary: extractSummary(content),
        file: `${phase}/${file}`,
      });
    }
  }

  // 排序：severity 降序，date 降序
  entries.sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
    if (sevDiff !== 0) return sevDiff;
    return b.date.localeCompare(a.date);
  });

  // 截断到 150 条
  const kept = entries.slice(0, MAX_INDEX_LINES);
  const dropped = entries.slice(MAX_INDEX_LINES);

  // 生成 INDEX.md
  let index = '# Solutions Index\n';
  index += '<!-- 每条一行，按 severity 降序，≤150 行硬上限 -->\n';
  index += '| date | phase | domain | type | severity | summary | file |\n';
  index += '|------|-------|--------|------|----------|---------|------|\n';
  for (const e of kept) {
    index += `| ${e.date} | ${e.phase} | ${e.domain} | ${e.type} | ${e.severity} | ${e.summary} | ${e.file} |\n`;
  }

  writeFileSync(indexPath, index, 'utf-8');
  console.log(`INDEX.md rebuilt: ${kept.length} entries (${dropped.length} dropped)`);
  if (dropped.length > 0) {
    console.log(`Dropped ${dropped.length} low-priority entries (files preserved in directories)`);
  }
}

// CLI 直接执行
if (process.argv[1]?.includes('solutions-index-gen')) {
  const args = {};
  const dirIdx = process.argv.indexOf('--dir');
  if (dirIdx > -1 && process.argv[dirIdx + 1]) args.dir = process.argv[dirIdx + 1];
  run(args);
}
