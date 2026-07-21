#!/usr/bin/env node
/**
 * solutions-inject — 按 phase+domain 过滤 INDEX.md，输出 top-5 摘要
 *
 * v0.5 复利贯穿机制脚本
 * 用法：ssf solutions inject --phase <p> --domain <d>
 *
 * 功能：
 * 1. 读取 docs/solutions/INDEX.md
 * 2. 过滤：phase = 指定阶段 OR phase = cross-phase，且 domain 匹配
 * 3. 按 severity 降序取 top-5
 * 4. 输出摘要（供各 skill 注入上下文）
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export function run(args = {}) {
  const phase = args.phase || 'cross-phase';
  const domain = args.domain || '';
  const dir = args.dir || 'docs/solutions';
  const indexPath = join(dir, 'INDEX.md');

  if (!existsSync(indexPath)) {
    console.log('<!-- No solutions index found, skipping injection -->');
    return { entries: [] };
  }

  const content = readFileSync(indexPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.startsWith('|') && !l.startsWith('| date') && !l.startsWith('|--'));

  const entries = [];
  for (const line of lines) {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 7) continue;
    const [date, ePhase, eDomain, type, severity, summary, file] = cols;

    // 过滤：phase 匹配或 cross-phase
    const phaseMatch = ePhase === phase || ePhase === 'cross-phase';
    // 过滤：domain 匹配（空 domain 表示通用）
    const domainMatch = !domain || !eDomain || eDomain === 'general' || eDomain === domain;

    if (phaseMatch && domainMatch) {
      entries.push({ date, phase: ePhase, domain: eDomain, type, severity, summary, file });
    }
  }

  // 按 severity 降序排序，取 top-5
  entries.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));
  const top5 = entries.slice(0, 5);

  if (top5.length === 0) {
    console.log('<!-- No matching solutions found -->');
    return { entries: [] };
  }

  console.log(`## Solutions Context (phase=${phase}, domain=${domain || 'any'})`);
  console.log('');
  for (const e of top5) {
    console.log(`- [${e.severity}] ${e.summary} (${e.phase}/${e.domain}, ${e.date}) → ${e.file}`);
  }
  console.log('');

  return { entries: top5 };
}

if (process.argv[1]?.includes('solutions-inject')) {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i]?.replace('--', '');
    const val = process.argv[i + 1];
    if (key && val) args[key] = val;
  }
  run(args);
}
