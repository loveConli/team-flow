// scripts/guard/checks/compound-captured.mjs — compound engineering capture guard
// v0.24.0: 复利贯穿强制化——executing:closing 增加 compound-captured 维度
//
// 规则：
// - learnings.md 存在且非空 → pass（已记录经验）
// - compound_skipped === true → pass（显式豁免，用户主动跳过）
// - workflow === 'tweak' → 不进入本检查器（由 WORKFLOW_TRANSITION_CHECKS 豁免）
// - 其他情况 → fail（提示用户执行 tf solutions capture 或显式 skip）
//
// 设计原则：
// - 与 arch-design 检查器同属"产物存在性"维度，不涉及内容质量评审
// - 只检查 learnings.md 存在，不验证 frontmatter 格式（advisory 由 ce-compound 保证）
// - 显式 skip 必须通过 state 字段（`tf state set compound_skipped true`），防止遗忘

import fs from 'node:fs';
import path from 'node:path';

/**
 * 从 .team-flow.yaml 提取顶层字段值（与 arch-design.mjs 同源模式）
 */
function extractYamlField(content, field) {
  for (const line of content.split('\n')) {
    const match = line.match(new RegExp(`^${field}:\\s*(.*)`));
    if (match) {
      const val = match[1].trim();
      return val === 'null' || val === '' ? null : val;
    }
  }
  return null;
}

/**
 * Check compound engineering capture for the executing:closing transition.
 *
 * @param {string} changeDir - change directory path
 * @returns {{ pass: boolean, failures: string[] }}
 */
export function checkCompoundCaptured(changeDir) {
  const failures = [];

  // 1. 检查 learnings.md 存在且非空
  const learningsPath = path.join(changeDir, 'learnings.md');
  if (fs.existsSync(learningsPath)) {
    const content = fs.readFileSync(learningsPath, 'utf-8').trim();
    if (content.length > 0) {
      return { pass: true, failures: [] };
    }
    // 文件存在但为空，视为未捕获
    failures.push('learnings.md exists but is empty — run `tf solutions capture` or populate with session learnings');
    return { pass: false, failures };
  }

  // 2. 检查显式豁免（compound_skipped === true）
  const stateFile = path.join(changeDir, '.team-flow.yaml');
  if (fs.existsSync(stateFile)) {
    const raw = fs.readFileSync(stateFile, 'utf-8');
    const skipped = extractYamlField(raw, 'compound_skipped');
    if (skipped === 'true') {
      return { pass: true, failures: [] };
    }
  }

  // 3. 未捕获且未豁免 → fail
  failures.push(
    'Compound capture missing: no learnings.md found in change directory. ' +
    'Run `tf solutions capture --phase review --domain <d> --type insight --severity medium --summary "..."` ' +
    'to document session learnings, or `tf state set compound_skipped true` to explicitly skip.'
  );
  return { pass: false, failures };
}
