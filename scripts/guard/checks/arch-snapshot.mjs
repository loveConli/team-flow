// scripts/guard/checks/arch-snapshot.mjs — 架构快照门禁（v0.35.0，v0.14 §59.4）
// 挂 executing:closing（先于 arch-merge）：本轮迭代产品级架构快照必须已落盘（"先快照后回写"强制化）。
//
// 规则：
// - arch_baseline == null（在途/存量）→ PASS + WARN（legacy 豁免）
// - skip 已物化（iterations/vN/SKIPPED）→ PASS
// - iterations/<latest>/architecture.md 存在 → PASS
// - 否则 → FAIL
import {
  findProjectRoot, readArchState, isLegacyArch,
  findLatestIterationSnapshot, isArchSkipMaterialized, ARCH_READINESS_FAIL_HINT,
} from './arch-gate-exemptions.mjs';

/**
 * @param {string} changeDir - change directory path
 * @returns {{ pass: boolean, failures: string[] }}
 */
export function checkArchSnapshot(changeDir) {
  const root = findProjectRoot(changeDir);
  const state = readArchState(root);

  if (isLegacyArch(state)) {
    console.warn('  [WARN] arch-snapshot: project architecture baseline not established — 在途 change legacy 豁免');
    return { pass: true, failures: [] };
  }

  if (isArchSkipMaterialized(root)) {
    return { pass: true, failures: [] };
  }

  const snap = findLatestIterationSnapshot(root);
  if (snap) return { pass: true, failures: [] };

  // v0.36.3 §63.4 在途 change 兜底：快照缺失但 change 已有增量产物 → 以 change 产物为实际态（存量升级场景）
  const archDir = join(changeDir, 'architecture');
  if (existsSync(archDir) && existsSync(join(archDir, 'architecture.md'))) {
    console.warn('  [WARN] arch-snapshot: 产品级快照缺失，以 change 增量产物兜底（存量升级在途 change，快照后补为 v0）');
    return { pass: true, failures: [] };
  }

  return { pass: false, failures: [ARCH_READINESS_FAIL_HINT] };
}
