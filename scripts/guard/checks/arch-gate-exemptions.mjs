// scripts/guard/checks/arch-gate-exemptions.mjs — shared exemption logic for v0.35.0 arch gates
//
// v0.14 §59.4/§63.1（设计增强方案 v0.14）：arch-readiness / arch-snapshot 两个架构门禁
// 共享同一套 legacy/skip 豁免语义，抽取到本模块作为唯一真相源，防止判定漂移。
//
// 豁免键背景：arch_baseline 完全复刻 v0.13 §48.1 schema_version 防污染模式——
// 仅 `tf arch init` 打戳（项目级 .team-flow/arch-state.json），缺失 = 存量信号，
// 不会被新 CLI 重写状态文件而污染。
import fs from 'node:fs';
import path from 'node:path';

/**
 * 从 change 目录向上定位项目根（含 .team-flow/ 目录的最近祖先）。
 * 找不到返回 null → 调用方按 legacy 安全降级（不阻断）。
 */
export function findProjectRoot(changeDir) {
  let dir = path.resolve(changeDir);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.team-flow'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

/** 读取项目级架构状态（.team-flow/arch-state.json）。不存在/损坏 → null。 */
export function readArchState(root) {
  if (!root) return null;
  const p = path.join(root, '.team-flow', 'arch-state.json');
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
  catch { return null; }
}

/**
 * v0.14 §59.4：legacy = 项目架构基线未建立（arch_baseline 缺失）。
 * 只有 `tf arch init` 打戳；缺失 = 存量信号。
 */
export function isLegacyArch(state) {
  return state?.arch_baseline == null;
}

/** 项目级显式 skip 是否已物化（iterations/vN/SKIPPED 标记存在）。 */
export function isArchSkipMaterialized(root) {
  const iterationsDir = root && path.join(root, 'docs', 'architecture', 'iterations');
  if (!iterationsDir || !fs.existsSync(iterationsDir)) return false;
  return fs.readdirSync(iterationsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .some(d => fs.existsSync(path.join(iterationsDir, d.name, 'SKIPPED')));
}

/** 最近一个迭代的产品级架构快照路径（iterations/<latest>/architecture.md）。不存在 → null。 */
export function findLatestIterationSnapshot(root) {
  const iterationsDir = root && path.join(root, 'docs', 'architecture', 'iterations');
  if (!iterationsDir || !fs.existsSync(iterationsDir)) return null;
  const dirs = fs.readdirSync(iterationsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
  for (let i = dirs.length - 1; i >= 0; i--) {
    const snap = path.join(iterationsDir, dirs[i], 'architecture.md');
    if (fs.existsSync(snap)) return snap;
  }
  return null;
}

export const ARCH_READINESS_FAIL_HINT =
  'iterations/vN/architecture.md missing — 回 ARCH 阶段补快照，'
  + '或显式 skip 物化（iterations/vN/<vN>/SKIPPED 标记 + 理由）';
