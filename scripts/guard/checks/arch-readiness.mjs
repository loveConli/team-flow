// scripts/guard/checks/arch-readiness.mjs — 架构就绪门禁（v0.35.0，v0.14 §59.4）
// 挂 exploring:specifying（与 arch-design 并列）：产品级架构快照必须在 change 进入 specifying 前就绪。
//
// 规则：
// - arch_baseline == null（存量/重建未完成）→ PASS + WARN（不阻断，项目级豁免，P3 留逃生舱）
// - skip 已物化（iterations/vN/SKIPPED）→ PASS
// - iterations/<latest>/architecture.md 存在 → PASS
// - 否则 → FAIL，引导回 ARCH 补快照或显式 skip
import {
  findProjectRoot, readArchState, isLegacyArch,
  findLatestIterationSnapshot, isArchSkipMaterialized, ARCH_READINESS_FAIL_HINT,
} from './arch-gate-exemptions.mjs';

/**
 * @param {string} changeDir - change directory path
 * @returns {{ pass: boolean, failures: string[] }}
 */
export function checkArchReadiness(changeDir) {
  const root = findProjectRoot(changeDir);
  const state = readArchState(root);

  // 存量/重建未完成 → WARN 不 FAIL（项目级豁免）
  if (isLegacyArch(state)) {
    console.warn('  [WARN] arch-readiness: project architecture baseline not established — S3.5 reconstruction pending');
    return { pass: true, failures: [] };
  }

  if (isArchSkipMaterialized(root)) {
    return { pass: true, failures: [] };
  }

  const snap = findLatestIterationSnapshot(root);
  if (snap) return { pass: true, failures: [] };

  return { pass: false, failures: [ARCH_READINESS_FAIL_HINT] };
}
