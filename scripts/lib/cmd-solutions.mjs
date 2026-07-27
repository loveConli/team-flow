// scripts/lib/cmd-solutions.mjs - tf solutions 复利贯穿机制命令组（v0.5）
//
// 设计说明（v0.5 / 2026-07-21）：
// - 与 checkpoint / handoff / execution 一致，采用「单 COMMANDS key + 内部子命令分发」模式。
// - 4 个底层脚本 solutions-{index-gen,inject,capture,promote}.mjs 的 run(args) 接收「对象」参数，
//   而 CLI 入口传入的是「字符串数组」。本分发器用 parseArgs 把数组解析成各脚本需要的对象后再调用，
//   完成 数组 → 对象 的桥接。
import { parseArgs } from 'node:util';

const USAGE = 'Usage: tf solutions <index-gen|inject|capture|promote> [options]';

export async function run(args) {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      dir: { type: 'string' },
      phase: { type: 'string' },
      domain: { type: 'string' },
      type: { type: 'string' },
      severity: { type: 'string' },
      summary: { type: 'string' },
      source: { type: 'string' },
    },
  });

  const subcommand = positionals[0];
  if (!subcommand) usage();

  if (subcommand === 'index-gen') {
    const mod = await import('./solutions-index-gen.mjs');
    mod.run({ dir: values.dir });
    return;
  }

  if (subcommand === 'inject') {
    const mod = await import('./solutions-inject.mjs');
    mod.run({ phase: values.phase, domain: values.domain, dir: values.dir });
    return;
  }

  if (subcommand === 'capture') {
    const mod = await import('./solutions-capture.mjs');
    mod.run({
      phase: values.phase,
      domain: values.domain,
      type: values.type,
      severity: values.severity,
      summary: values.summary,
      source: values.source,
      dir: values.dir,
    });
    return;
  }

  if (subcommand === 'promote') {
    const changeDir = positionals[1];
    if (!changeDir) usage('Usage: tf solutions promote <change-dir> [--dir <solutions-dir>]');
    const mod = await import('./solutions-promote.mjs');
    mod.run({ _: [changeDir], changeDir, dir: values.dir });
    return;
  }

  console.error(`Unknown solutions subcommand: ${subcommand}. Valid: index-gen, inject, capture, promote`);
  process.exit(2);
}

function usage(message = USAGE) {
  console.error(message);
  process.exit(2);
}
