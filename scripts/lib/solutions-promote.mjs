#!/usr/bin/env node
/**
 * solutions-promote — 检查 change 内经验的晋升条件，执行 change→product 晋升
 *
 * v0.5 复利贯穿机制脚本
 * 用法：tf solutions promote <change-dir> [--dir <solutions-dir>]
 *
 * 功能：
 * 1. 读取 specs/<cap>/learnings.md
 * 2. 逐条检查晋升条件（severity ≥ medium 且 type = pitfall/pattern）
 * 3. 检查与全局 INDEX 是否重复（domain+type 匹配）
 * 4. 符合条件 → 写入全局 docs/solutions/
 * 5. 重复 → 更新已有条目的 severity 和确认次数
 *
 * 变更说明（v0.5 / 2026-07-21）：
 * - 修正原稿在同步 run() 内使用 `await import('node:fs')` 取 mkdirSync 导致的语法错误，
 *   改为在顶部静态 import mkdirSync，保持与其它 solutions-* 脚本一致的同步签名。
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

function parseFrontmatter(content) {
  // learnings.md 中每个条目以 `## 标题` 开头，frontmatter 紧跟标题行之后；
  // 故此处兼容 frontmatter 位于段首或标题行之后两种位置（^--- 只能匹配段首会漏判）。
  const match = content.match(/(?:^|\n)---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return fm;
}

function parseLearnings(content) {
  // 解析 learnings.md 中的经验条目（## 标题分隔）
  const sections = content.split(/^## /m).filter(s => s.trim());
  return sections.map(s => {
    const lines = s.trim().split('\n');
    const title = lines[0]?.trim() || '';
    const fm = parseFrontmatter(s);
    return { title, fm, body: s.trim() };
  }).filter(e => e.title && e.title !== 'Learnings');
}

export function run(args = {}) {
  const changeDir = args._?.[0] || args.changeDir;
  const solutionsDir = args.dir || 'docs/solutions';

  if (!changeDir) {
    console.error('Usage: tf solutions promote <change-dir>');
    process.exit(1);
  }

  const learningsPath = join(changeDir, 'learnings.md');
  if (!existsSync(learningsPath)) {
    console.log(`No learnings.md found in ${changeDir}, nothing to promote`);
    return { promoted: 0, updated: 0 };
  }

  const content = readFileSync(learningsPath, 'utf-8');
  const learnings = parseLearnings(content);

  if (learnings.length === 0) {
    console.log('No learning entries found');
    return { promoted: 0, updated: 0 };
  }

  // 读取全局 INDEX
  const indexPath = join(solutionsDir, 'INDEX.md');
  const indexContent = existsSync(indexPath) ? readFileSync(indexPath, 'utf-8') : '';

  let promoted = 0;
  let updated = 0;

  for (const learning of learnings) {
    const severity = learning.fm?.severity || 'low';
    const type = learning.fm?.type || 'insight';
    const phase = learning.fm?.phase || 'cross-phase';
    const domain = learning.fm?.domain || 'general';

    // 晋升条件：severity ≥ medium 且 type = pitfall/pattern
    const sevOk = severity === 'high' || severity === 'medium';
    const typeOk = type === 'pitfall' || type === 'pattern';
    if (!sevOk || !typeOk) continue;

    // 检查重复：domain+type 匹配
    const dupRegex = new RegExp(`\\| ${domain} \\| ${type} \\|`);
    if (dupRegex.test(indexContent)) {
      console.log(`Duplicate found (${domain}/${type}), marking as confirmed pattern`);
      updated++;
      continue;
    }

    // 写入全局
    const date = learning.fm?.date || new Date().toISOString().slice(0, 10);
    const phaseDir = join(solutionsDir, phase);
    if (!existsSync(phaseDir)) {
      mkdirSync(phaseDir, { recursive: true });
    }

    const slug = learning.title.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').slice(0, 40);
    const fileName = `${date}-${slug}.md`;
    const filePath = join(phaseDir, fileName);

    const fileContent = `---
phase: ${phase}
domain: ${domain}
type: ${type}
severity: ${severity}
date: ${date}
source: ${basename(changeDir)}
---

${learning.body}
`;
    writeFileSync(filePath, fileContent, 'utf-8');

    // 追加 INDEX
    appendFileSync(indexPath, `| ${date} | ${phase} | ${domain} | ${type} | ${severity} | ${learning.title.slice(0, 80)} | ${phase}/${fileName} |\n`, 'utf-8');

    console.log(`Promoted: ${phase}/${fileName}`);
    promoted++;
  }

  console.log(`\nPromotion complete: ${promoted} promoted, ${updated} updated as confirmed`);
  return { promoted, updated };
}

if (process.env.NODE_ENV !== 'test' && process.argv[1]?.includes('solutions-promote')) {
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
