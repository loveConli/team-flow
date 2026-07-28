// scripts/guard/checks/arch-design.mjs — architecture-design artifacts guard
// v0.23.0 §30: 架构设计门控——exploring:specifying 增加 arch 维度
//
// 规则：
// - arch_design_decision == "required" → architecture/*.md 必须存在且非空
// - arch_design_decision == "skipped" → arch_design_reason 非空（advisory，不阻断）
// - arch_design_decision == null → 未执行 architecture-design，不阻断（向后兼容）

import fs from 'node:fs';
import path from 'node:path';

/**
 * 从 .team-flow.yaml 提取顶层字段值（简单正则，与 state-loader 兼容）
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
 * Check architecture-design artifacts for the exploring:specifying transition.
 *
 * @param {string} changeDir - change directory path
 * @returns {{ pass: boolean, failures: string[] }}
 */
export function checkArchDesign(changeDir) {
  const failures = [];
  const stateFile = path.join(changeDir, '.team-flow.yaml');

  // 无状态文件 → 不阻断（向后兼容存量 change）
  if (!fs.existsSync(stateFile)) {
    return { pass: true, failures: [] };
  }

  const raw = fs.readFileSync(stateFile, 'utf-8');
  const decision = extractYamlField(raw, 'arch_design_decision');

  // 未执行 architecture-design（null）→ 不阻断，向后兼容
  if (!decision) {
    return { pass: true, failures: [] };
  }

  // skipped → 检查 reason 非空（advisory，不阻断）
  if (decision === 'skipped') {
    const reason = extractYamlField(raw, 'arch_design_reason');
    if (!reason) {
      // advisory: 输出 warning 但不加入 failures
      console.warn('  [WARN] arch-design: arch_design_decision=skipped but arch_design_reason is empty');
    }
    return { pass: true, failures: [] };
  }

  // required → 检查 architecture/*.md 存在且非空
  if (decision === 'required') {
    const archDir = path.join(changeDir, 'architecture');
    if (!fs.existsSync(archDir)) {
      failures.push('architecture/: directory missing (arch_design_decision=required)');
      return { pass: false, failures };
    }

    const requiredFiles = ['architecture.md', 'database.md', 'api.md'];
    for (const f of requiredFiles) {
      const fp = path.join(archDir, f);
      if (!fs.existsSync(fp)) {
        failures.push(`architecture/${f}: missing (arch_design_decision=required)`);
      } else if (fs.readFileSync(fp, 'utf-8').trim().length === 0) {
        failures.push(`architecture/${f}: empty (arch_design_decision=required)`);
      }
    }
  }

  return { pass: failures.length === 0, failures };
}
