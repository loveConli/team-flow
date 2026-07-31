// scripts/lib/state-loader.mjs — lightweight .team-flow.yaml state file reader/writer
import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = '.team-flow.yaml';

// 状态机合法值唯一真相源 (来源:workflow-feedback 2026-08-01,#100005)。
// 所有状态枚举校验统一引用此常量,禁止在各处硬编码状态字符串数组,避免多处定义漂移。
// cmd-state.mjs(transition 校验 / set 报错)、cmd-doctor.mjs(非法 state 巡检)均从这里 import。
export const VALID_STATES = [
  'exploring', 'specifying', 'bridging', 'approved-for-build',
  'executing', 'debugging', 'closing', 'abandoned',
];

const BUILTIN_DEFAULTS = {
  state: 'exploring',
  workflow: 'auto',
  revision: null,
  artifacts_hash: null,
  contract_hash: null,
  execution_mode: null,
  execution_plan_hash: null,
  execution_plan_revision: null,
  batches_completed: 0,
  test_result: null,
  spec_merged: false,
  change_name: null,
  last_transition: null,
  last_transition_from: null,
  last_transition_to: null,
  dp_0_decisions: null,
  dp_0_result: null,
  dp_0_confirmed: null,
  dp_0_timestamp: null,
  dp_1_result: null,
  dp_1_timestamp: null,
  dp_2_result: null,
  dp_2_timestamp: null,
  dp_3_result: null,
  dp_3_timestamp: null,
  dp_4_result: null,
  dp_4_timestamp: null,
  dp_5_result: null,
  dp_5_timestamp: null,
  dp_6_result: null,
  dp_6_timestamp: null,
  dp_7_result: null,
  dp_7_timestamp: null,
  // Architecture design gate (v0.9 §26, v0.22.5 评审修复 F02)
  arch_design_decision: null,
  arch_design_reason: null,
  arch_design_timestamp: null,
  arch_design_artifacts: null,
  // Architecture review (v0.28.1 §36 审查增强)
  arch_review_verdict: null,
  arch_review_rounds: null,
  arch_review_report: null,
  // DP-A user confirmation gate (v0.29.0 §37)
  dp_a_result: null,
  dp_a_timestamp: null,
  dp_a_adjustments: null,
  // Compound engineering capture gate (v0.24.0 复利贯穿强制化)
  compound_skipped: null,
};

/**
 * Read state file, merging with built-in defaults.
 * Returns a complete state object even if the file doesn't exist.
 */
export function readState(changeDir) {
  const filePath = path.join(changeDir, STATE_FILE);
  if (!fs.existsSync(filePath)) {
    return { ...BUILTIN_DEFAULTS, change_name: path.basename(changeDir) };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(raw);
  return { ...BUILTIN_DEFAULTS, ...parsed };
}

/**
 * Write state object to .team-flow.yaml.
 */
export function writeState(changeDir, state) {
  // Defense-in-depth 状态合法性校验 (来源:workflow-feedback 2026-08-01,#100004)。
  // 主修复是子代理 prompt 禁令(禁止绕过 CLI 直接 Edit .team-flow.yaml);此处是最后一道防线,
  // 拦截任何非法 state 落盘。init/transition/rebuild/updateField 等 CLI 路径产生的 state 均合法
  // (缺失时回退 'exploring'),不会误伤;仅当出现非法值时抛错,提示用 tf doctor 排查。
  const effectiveState = state.state || 'exploring';
  if (!VALID_STATES.includes(effectiveState)) {
    throw new Error(
      `Refusing to write illegal state '${effectiveState}' to ${path.join(changeDir, STATE_FILE)}. ` +
      `Legal states: ${VALID_STATES.join(', ')}. ` +
      `This is usually caused by a subagent bypassing the CLI and editing .team-flow.yaml directly — ` +
      `restore a legal value or run 'tf doctor' to diagnose.`
    );
  }

  const filePath = path.join(changeDir, STATE_FILE);
  const lines = [];
  lines.push('# .team-flow.yaml — lightweight state machine');
  lines.push('# Derived data. Always rebuildable from artifacts. Lost/corrupt → fall back to content-level detection.');
  lines.push('');
  lines.push('# === Core state ===');
  lines.push(`state: ${state.state || 'exploring'}`);
  lines.push(`workflow: ${state.workflow || 'auto'}`);
  lines.push(`revision: ${state.revision ?? 'null'}`);
  lines.push('');
  lines.push('# === Hashes (fast staleness detection) ===');
  lines.push(`artifacts_hash: ${state.artifacts_hash ?? 'null'}`);
  lines.push(`contract_hash: ${state.contract_hash ?? 'null'}`);
  lines.push('');
  lines.push('# === Execution progress ===');
  lines.push(`execution_mode: ${state.execution_mode ?? 'null'}`);
  lines.push(`execution_plan_hash: ${state.execution_plan_hash ?? 'null'}`);
  lines.push(`execution_plan_revision: ${state.execution_plan_revision ?? 'null'}`);
  lines.push(`batches_completed: ${state.batches_completed ?? 0}`);
  lines.push(`test_result: ${state.test_result ?? 'null'}`);
  lines.push(`spec_merged: ${state.spec_merged ?? false}`);
  lines.push('');
  lines.push('# === Metadata ===');
  lines.push(`change_name: ${state.change_name ?? path.basename(changeDir)}`);
  lines.push(`last_transition: ${state.last_transition ?? 'null'}`);
  lines.push(`last_transition_from: ${state.last_transition_from ?? 'null'}`);
  lines.push(`last_transition_to: ${state.last_transition_to ?? 'null'}`);
  lines.push('');
  lines.push('# === Decision points ===');
  lines.push(`dp_0_decisions: ${state.dp_0_decisions ?? 'null'}`);
  lines.push(`dp_0_result: ${state.dp_0_result ?? 'null'}`);
  lines.push(`dp_0_confirmed: ${state.dp_0_confirmed ?? 'null'}`);
  lines.push(`dp_0_timestamp: ${state.dp_0_timestamp ?? 'null'}`);
  lines.push(`dp_1_result: ${state.dp_1_result ?? 'null'}`);
  lines.push(`dp_1_timestamp: ${state.dp_1_timestamp ?? 'null'}`);
  lines.push(`dp_2_result: ${state.dp_2_result ?? 'null'}`);
  lines.push(`dp_2_timestamp: ${state.dp_2_timestamp ?? 'null'}`);
  lines.push(`dp_3_result: ${state.dp_3_result ?? 'null'}`);
  lines.push(`dp_3_timestamp: ${state.dp_3_timestamp ?? 'null'}`);
  lines.push(`dp_4_result: ${state.dp_4_result ?? 'null'}`);
  lines.push(`dp_4_timestamp: ${state.dp_4_timestamp ?? 'null'}`);
  lines.push(`dp_5_result: ${state.dp_5_result ?? 'null'}`);
  lines.push(`dp_5_timestamp: ${state.dp_5_timestamp ?? 'null'}`);
  lines.push(`dp_6_result: ${state.dp_6_result ?? 'null'}`);
  lines.push(`dp_6_timestamp: ${state.dp_6_timestamp ?? 'null'}`);
  lines.push(`dp_7_result: ${state.dp_7_result ?? 'null'}`);
  lines.push(`dp_7_timestamp: ${state.dp_7_timestamp ?? 'null'}`);
  lines.push('');
  lines.push('# === Architecture design gate (v0.9 §26) ===');
  lines.push(`arch_design_decision: ${state.arch_design_decision ?? 'null'}`);
  lines.push(`arch_design_reason: ${state.arch_design_reason ?? 'null'}`);
  lines.push(`arch_design_timestamp: ${state.arch_design_timestamp ?? 'null'}`);
  lines.push(`arch_design_artifacts: ${state.arch_design_artifacts ?? 'null'}`);
  lines.push('');
  lines.push('# === Architecture review (v0.28.1 §36) ===');
  lines.push(`arch_review_verdict: ${state.arch_review_verdict ?? 'null'}`);
  lines.push(`arch_review_rounds: ${state.arch_review_rounds ?? 'null'}`);
  lines.push(`arch_review_report: ${state.arch_review_report ?? 'null'}`);
  lines.push('');
  lines.push('# === DP-A user confirmation gate (v0.29.0 §37) ===');
  lines.push(`dp_a_result: ${state.dp_a_result ?? 'null'}`);
  lines.push(`dp_a_timestamp: ${state.dp_a_timestamp ?? 'null'}`);
  lines.push(`dp_a_adjustments: ${state.dp_a_adjustments ?? 'null'}`);
  lines.push('');
  lines.push('# === Compound engineering capture gate (v0.24.0) ===');
  lines.push(`compound_skipped: ${state.compound_skipped ?? 'null'}`);

  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/**
 * Update a single field in the state file.
 */
export function updateField(changeDir, field, value) {
  const state = readState(changeDir);
  state[field] = value;
  writeState(changeDir, state);
}

/**
 * Rebuild state file from artifacts — recomputes hashes.
 * Requires hash functions to be passed in (avoids circular dependency).
 */
export function rebuildState(changeDir, { computeArtifactsHash, computeContractHash }) {
  const state = readState(changeDir);
  state.artifacts_hash = computeArtifactsHash(changeDir);
  state.contract_hash = computeContractHash(changeDir);
  writeState(changeDir, state);
  return state;
}

// Minimal YAML parser — top-level fields only, zero dependencies.
// Handles strings, null, integers. No nested structures needed.
function parseYaml(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^(\w[\w_]*):\s*(.*)/);
    if (match) {
      const val = match[2].trim();
      if (val === 'null' || val === '') {
        result[match[1]] = null;
      } else if (/^\d+$/.test(val)) {
        result[match[1]] = parseInt(val, 10);
      } else {
        result[match[1]] = val;
      }
    }
  }
  return result;
}
