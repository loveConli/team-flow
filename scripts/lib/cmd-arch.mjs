// scripts/lib/cmd-arch.mjs — tf arch init/show：项目级架构基线打戳（v0.35.0，v0.14 §59.4/§63.1）
//
// arch_baseline 完全复刻 v0.13 §48.1 schema_version 防污染模式：
// 仅 `tf arch init` 打戳（项目级 .team-flow/arch-state.json），缺失 = 存量信号。
// 防污染：已打戳则拒绝重复 init（不覆盖）；rebuild/doctor/set 一律不追加。
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const ARCH_STATE_FILE = '.team-flow/arch-state.json';

export async function run(args) {
  const { positionals, values } = parseArgs({
    args,
    options: {
      'project-root': { type: 'string' },
      mode: { type: 'string', default: 'reconstruction' },
      'baseline-ref': { type: 'string', default: 'prd/vN/' },
    },
    allowPositionals: true,
  });

  const sub = positionals[0];
  if (sub === 'init') return init(values);
  if (sub === 'show') return show(values);
  console.error('Usage: tf arch init [--mode reconstruction|design] [--baseline-ref <prd/vN/>] | tf arch show');
  process.exit(2);
}

function findRoot(rootOpt) {
  if (rootOpt) return path.resolve(rootOpt);
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.team-flow'))) return dir;
    dir = path.dirname(dir);
  }
  return dir;
}

function readState(root) {
  const target = path.join(root, ARCH_STATE_FILE);
  if (!fs.existsSync(target)) return null;
  try { return JSON.parse(fs.readFileSync(target, 'utf-8')); }
  catch { return null; }
}

function init(values) {
  const root = findRoot(values['project-root']);
  const target = path.join(root, ARCH_STATE_FILE);
  const mode = values.mode === 'design' ? 'design' : 'reconstruction';

  const existing = readState(root);
  if (existing?.arch_baseline) {
    console.error(
      `arch-state.json already established (arch_baseline=${existing.arch_baseline}, mode=${existing.mode})`
      + ' — 防污染规则：不重复打戳。如需重建，先手工处理旧标记。'
    );
    process.exit(1);
  }

  const state = {
    arch_baseline: 'v0',
    established_at: new Date().toISOString(),
    mode,
    snapshot_root: 'iterations/',
    baseline_prd_ref: values['baseline-ref'],
  };

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(state, null, 2) + '\n');
  console.log(`arch-state.json written: ${target}`);
  console.log(JSON.stringify(state, null, 2));
  console.log('项目架构基线已打戳，进入 design 模式。重建快照位于 docs/architecture/iterations/v0/。');
}

function show(values) {
  const root = findRoot(values['project-root']);
  const state = readState(root);
  if (!state) {
    console.log('arch_baseline: <unset>（存量/未建立，S3.5 reconstruction pending）');
    return;
  }
  console.log(JSON.stringify(state, null, 2));
}
