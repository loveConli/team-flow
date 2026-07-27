#!/usr/bin/env node
/**
 * solutions-capture — 写入一条经验到 INDEX.md + 对应目录
 *
 * v0.5 复利贯穿机制脚本
 * 用法：tf solutions capture --phase <p> --domain <d> --type <t> --severity <s> --summary "<text>"
 *
 * 功能：
 * 1. 在对应阶段目录下创建经验文件
 * 2. 在 INDEX.md 中追加一行摘要
 * 3. INDEX.md 超过 150 行时触发 index-gen 重建
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const PHASES = ['prd', 'plan', 'prototype', 'spec', 'build', 'review', 'cross-phase'];
const MAX_INDEX_LINES = 150;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export function run(args = {}) {
  const phase = args.phase || 'cross-phase';
  const domain = args.domain || 'general';
  const type = args.type || 'insight';
  const severity = args.severity || 'medium';
  const summary = args.summary || '(no summary)';
  const source = args.source || '';
  const dir = args.dir || 'docs/solutions';

  if (!PHASES.includes(phase)) {
    console.error(`Invalid phase: ${phase}. Valid: ${PHASES.join(', ')}`);
    process.exit(1);
  }

  // 确保目录存在
  const phaseDir = join(dir, phase);
  if (!existsSync(phaseDir)) mkdirSync(phaseDir, { recursive: true });
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // 生成文件名
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(summary);
  const fileName = `${date}-${slug}.md`;
  const filePath = join(phaseDir, fileName);

  // 写经验文件
  const content = `---
phase: ${phase}
domain: ${domain}
type: ${type}
severity: ${severity}
date: ${date}
source: ${source}
---

## 问题描述
${summary}

## 根因/模式
（待补充）

## 预防措施/应用方式
（待补充）
`;
  writeFileSync(filePath, content, 'utf-8');

  // 追加 INDEX.md
  const indexPath = join(dir, 'INDEX.md');
  if (!existsSync(indexPath)) {
    writeFileSync(indexPath, '# Solutions Index\n<!-- 每条一行，按 severity 降序，≤150 行硬上限 -->\n| date | phase | domain | type | severity | summary | file |\n|------|-------|--------|------|----------|---------|------|\n', 'utf-8');
  }
  appendFileSync(indexPath, `| ${date} | ${phase} | ${domain} | ${type} | ${severity} | ${summary.slice(0, 80)} | ${phase}/${fileName} |\n`, 'utf-8');

  // 检查是否超过 150 行
  const indexContent = readFileSync(indexPath, 'utf-8');
  const dataLines = indexContent.split('\n').filter(l => l.startsWith('|') && !l.startsWith('| date') && !l.startsWith('|--'));
  if (dataLines.length > MAX_INDEX_LINES) {
    console.log(`INDEX.md exceeded ${MAX_INDEX_LINES} lines, consider running: tf solutions index-gen`);
  }

  console.log(`Captured: ${phase}/${fileName} (${severity}/${type})`);
  return { file: `${phase}/${fileName}`, phase, domain, type, severity };
}

if (process.argv[1]?.includes('solutions-capture')) {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].replace('--', '');
      const val = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true;
      args[key] = val;
    }
  }
  run(args);
}
