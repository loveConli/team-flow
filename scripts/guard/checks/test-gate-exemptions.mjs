// scripts/guard/checks/test-gate-exemptions.mjs — shared exemption logic for v0.13 test gates
//
// v0.13 §48/§49（设计增强方案 v0.13，C1-domain-policy 事件修复）：
// test-matrix-complete / test-matrix-ready / tests-passing 三个测试门禁共享同一套
// legacy/skip 豁免语义，抽取到本模块作为唯一真相源，防止三处判定漂移。
//
// 豁免键修正背景（RC-1）：v0.12 §45.3 的"存量兼容"豁免以 contract 内容为键
//（无 '## Test Matrix' 段即放行），无法区分"真存量"与"新 change 漏生成矩阵"，
// 导致 v0.31.0 发布当天 C1-domain-policy 零测试通过全部门禁。v0.13 将豁免键改为
// state 初始化版本标记（schema_version），内容型豁免整体删除。
import fs from 'node:fs';
import path from 'node:path';

/**
 * v0.13 §48.1：legacy = v0.32.0 之前创建的 change（状态文件无 schema_version 打戳）。
 * 打戳只发生在 `tf state init` 创建 change 时；rebuild/doctor/set 一律不追加，
 * 因此"字段缺失"是可靠的存量信号，不会被新 CLI 重写状态文件而污染。
 */
export function isLegacyChange(state) {
  return state?.schema_version == null;
}

/** v0.13 §48.2：显式 skip 必须附理由（可审计豁免）。 */
export function hasExplicitSkip(state) {
  return state?.test_matrix_skipped === 'true'
    && typeof state?.test_matrix_skip_reason === 'string'
    && state.test_matrix_skip_reason.trim().length > 0;
}

/** skip 已置但理由缺失 → 门禁拒绝并引导补理由。 */
export function skipMissingReason(state) {
  return state?.test_matrix_skipped === 'true' && !hasExplicitSkip(state);
}

export const SKIP_REASON_HINT =
  "test_matrix_skipped=true requires test_matrix_skip_reason — record it: "
  + "tf state set <dir> test_matrix_skip_reason '<why this change needs no test matrix>'";

/** contract 是否声明 '## Test Matrix' 段（不存在时 exists=false）。 */
export function contractDeclaresTestMatrix(changeDir) {
  const contractPath = path.join(changeDir, 'execution-contract.md');
  if (!fs.existsSync(contractPath)) return { exists: false, declares: false };
  const contract = fs.readFileSync(contractPath, 'utf-8');
  return { exists: true, declares: contract.includes('## Test Matrix') };
}

/** test-matrix.md 存在性与非空性。 */
export function readTestMatrixFile(changeDir) {
  const matrixPath = path.join(changeDir, 'test-matrix.md');
  if (!fs.existsSync(matrixPath)) return { exists: false, empty: true };
  const content = fs.readFileSync(matrixPath, 'utf-8');
  return { exists: true, empty: content.trim().length === 0 };
}
