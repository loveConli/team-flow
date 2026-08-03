// scripts/guard/checks/test-matrix-complete.mjs — verify test matrix exists and is consistent
//
// v0.13 §48 重写（C1-domain-policy 事件修复，RC-1/RC-3）：
// 豁免键由 contract 内容改为 state schema_version；删除 v0.12 的两条结构性豁免：
//   ✗ "contract 无 '## Test Matrix' 段 → PASS"（内容型豁免，新 change 漏生成矩阵同样命中）
//   ✗ "stored hash 为 null 时短路跳过一致性校验"（矩阵生成后未 rebuild 即无保护）
// 判定顺序见设计增强方案 v0.13 §48.3。
import { readState } from '../../lib/state-loader.mjs';
import { computeTestMatrixHash } from '../../lib/hash.mjs';
import {
  isLegacyChange,
  skipMissingReason,
  SKIP_REASON_HINT,
  contractDeclaresTestMatrix,
  readTestMatrixFile,
} from './test-gate-exemptions.mjs';

/**
 * Returns { pass, failures[], reason? }.
 */
export function checkTestMatrixComplete(changeDir) {
  const state = readState(changeDir);

  // Step 1 — legacy：v0.32.0 之前初始化的 change（无 schema_version 打戳）保留旧行为。
  if (isLegacyChange(state)) {
    return { pass: true, failures: [], reason: 'legacy change — initialized before v0.32.0' };
  }

  // Step 2 — 显式 skip：必须附理由（可审计豁免）。
  if (state.test_matrix_skipped === 'true') {
    if (skipMissingReason(state)) {
      return { pass: false, failures: [SKIP_REASON_HINT] };
    }
    return { pass: true, failures: [], reason: `explicitly skipped: ${state.test_matrix_skip_reason}` };
  }

  // Step 3 — 非存量 change 的契约必须声明矩阵（v0.13：内容型豁免删除）。
  const contract = contractDeclaresTestMatrix(changeDir);
  if (!contract.exists) {
    return {
      pass: false,
      failures: ['execution-contract.md is missing — a non-legacy change must have a contract declaring ## Test Matrix'],
    };
  }
  if (!contract.declares) {
    return {
      pass: false,
      failures: [
        'non-legacy contract must declare ## Test Matrix — return to bridging so contract-builder generates test-matrix.md, '
        + 'or explicitly skip (test_matrix_skipped=true + test_matrix_skip_reason)',
      ],
    };
  }

  // Step 4 — test-matrix.md 存在且非空。
  const matrix = readTestMatrixFile(changeDir);
  if (!matrix.exists) {
    return {
      pass: false,
      failures: ['test-matrix.md is missing — contract declares ## Test Matrix but no matrix file found'],
    };
  }
  if (matrix.empty) {
    return {
      pass: false,
      failures: ['test-matrix.md is empty — must contain at least a Summary section and Cases table'],
    };
  }

  // Step 5 — hash 必须已记录（v0.13：删除 state.test_matrix_hash && 的空值短路）。
  // 矩阵在 bridging 阶段生成（晚于 state init），contract-builder 生成后必须 tf state rebuild 捕获 hash。
  const computed = computeTestMatrixHash(changeDir);
  if (!state.test_matrix_hash) {
    return {
      pass: false,
      failures: ["test_matrix_hash not recorded — run 'tf state rebuild' after generating test-matrix.md"],
    };
  }

  // Step 6 — hash 一致性。
  if (state.test_matrix_hash !== computed) {
    return {
      pass: false,
      failures: [
        `test-matrix.md has been modified since last hash — stored: ${state.test_matrix_hash}, current: ${computed}. Run 'tf state rebuild' to update.`,
      ],
    };
  }

  return { pass: true, failures: [] };
}
