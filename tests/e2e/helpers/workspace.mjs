// tests/e2e/helpers/workspace.mjs
// team-flow e2e runner：基线归档隔离（LT 决策⑥）。
// 一次性把 vrm4teamflow 全量压缩为冻结基线归档；每次测试解压到独立 mkdtemp 副本，
// 测完即弃——全程不碰活工作区，彻底解耦日常使用污染（评审 #1 2c）。
import { execSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// 默认源工作区与归档路径（可用环境变量覆盖）。
export const DEFAULT_VRM_DIR = process.env.TF_E2E_VRM || '/Users/litong/Documents/work/code/gtmc/vrm4teamflow';
export const DEFAULT_BASELINE = process.env.TF_E2E_BASELINE ||
  join(process.cwd(), 'tests', 'e2e', 'baseline', 'vrm4teamflow-baseline.tar.gz');

/**
 * 一次性创建冻结基线归档：tar -czf 全量压缩源工作区（LT 要求"所有内容"，含 .git）。
 * 归档与活工作区解耦，后续 vrm 演进不影响测试可复现性。
 */
export function createBaseline({ vrmDir = DEFAULT_VRM_DIR, archivePath = DEFAULT_BASELINE } = {}) {
  if (!existsSync(vrmDir)) throw new Error(`源工作区不存在: ${vrmDir}（可用 TF_E2E_VRM 指定）`);
  mkdirSync(dirname(archivePath), { recursive: true });
  const parent = dirname(resolve(vrmDir));
  const name = basename(resolve(vrmDir));
  // -C 切到父目录再按目录名打包，解压缩后得到 <name>/ 顶层目录
  execSync(`tar -czf ${shq(archivePath)} -C ${shq(parent)} ${shq(name)}`, { stdio: 'pipe', timeout: 300000 });
  return archivePath;
}

/**
 * 解压基线归档到独立 mkdtemp 副本，返回 {tempRoot, workspace}（workspace=解压出的工作区根）。
 * 解压后 git worktree prune 清理悬空 worktree 引用（残留 worktree 是上次 tf isolate 冲突物证）。
 * 调用方负责测后调用 cleanupWorkspace(tempRoot)。
 */
export function extractBaseline({ archivePath = DEFAULT_BASELINE } = {}) {
  if (!existsSync(archivePath)) {
    throw new Error(`基线归档不存在: ${archivePath}。先运行 npm run test:e2e:baseline 生成。`);
  }
  const tempRoot = mkdtempSync(join(tmpdir(), 'tf-e2e-ws-'));
  execSync(`tar -xzf ${shq(archivePath)} -C ${shq(tempRoot)}`, { stdio: 'pipe', timeout: 300000 });
  // 解压出的工作区根 = tempRoot 下唯一顶层目录（与源工作区同名）
  const workspace = join(tempRoot, basename(resolve(DEFAULT_VRM_DIR)));
  pruneWorktrees(workspace);
  return { tempRoot, workspace };
}

/** 清理工作区内各 git 仓库的悬空 worktree 引用（best-effort，失败不抛）。 */
function pruneWorktrees(workspace) {
  const candidates = [workspace, ...(['bff-btit-vrm', 'ui-btit-vrm', 'prototype'].map((r) => join(workspace, r)))];
  for (const dir of candidates) {
    if (existsSync(join(dir, '.git'))) {
      try {
        execSync('git worktree prune', { cwd: dir, stdio: 'pipe', timeout: 15000 });
      } catch {
        /* best-effort */
      }
    }
  }
}

/** best-effort 清理临时副本（评审 #1 4d：失败不掩盖用例真实断言结果）。 */
export function cleanupWorkspace(tempRoot) {
  try {
    if (tempRoot && existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
  } catch (e) {
    console.warn(`[e2e] 清理临时工作区失败（不影响断言结果）: ${e.message}`);
  }
}

function shq(v) {
  return `'${String(v).replaceAll("'", "'\\''")}'`;
}
