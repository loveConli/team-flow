// scripts/guard/checks/test-matrix-ready.mjs — test preparedness gate before executing
//
// v0.13 §49（设计增强方案 v0.13，C1-domain-policy 事件修复，RC-3 声明驱动型绕过）：
// full workflow 的 approved-for-build→executing 新增本维度——进入执行前强制
// "带着矩阵开工"，缺陷在开工前暴露，而不是等 45 个文件写完才在 closing 发现。
// 与 test-matrix-complete（出口）共用 legacy/skip 豁免语义（test-gate-exemptions.mjs）。
import { readState } from '../../lib/state-loader.mjs';
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
export function checkTestMatrixReady(changeDir) {
  const state = readState(changeDir);

  // Exemption 1：legacy change（v0.32.0 之前初始化，无 schema_version 打戳）。
  if (isLegacyChange(state)) {
    return { pass: true, failures: [], reason: 'legacy change — initialized before v0.32.0' };
  }

  // Exemption 2：显式 skip（必须附理由）。
  if (state.test_matrix_skipped === 'true') {
    if (skipMissingReason(state)) {
      return { pass: false, failures: [SKIP_REASON_HINT] };
    }
    return { pass: true, failures: [], reason: `explicitly skipped: ${state.test_matrix_skip_reason}` };
  }

  // 正常路径：契约声明 ## Test Matrix 且 test-matrix.md 存在非空。
  const contract = contractDeclaresTestMatrix(changeDir);
  const matrix = readTestMatrixFile(changeDir);
  if (contract.declares && matrix.exists && !matrix.empty) {
    return { pass: true, failures: [] };
  }

  const failures = [];
  if (!contract.exists) {
    failures.push('execution-contract.md is missing — run contract-builder first');
  } else if (!contract.declares) {
    failures.push('contract does not declare ## Test Matrix — return to bridging so contract-builder generates test-matrix.md');
  }
  if (contract.declares) {
    if (!matrix.exists) {
      failures.push('test-matrix.md is missing — generate it during bridging (contract-builder Test Matrix Generation), then run tf state rebuild');
    } else if (matrix.empty) {
      failures.push('test-matrix.md is empty — must contain at least a Summary section and Cases table');
    }
  }
  failures.push(
    "if this change legitimately needs no test matrix, skip explicitly: "
    + "tf state set <dir> test_matrix_skipped true + test_matrix_skip_reason '<reason>'"
  );
  return { pass: false, failures };
}
