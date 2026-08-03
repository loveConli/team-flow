#!/usr/bin/env node
// tests/e2e/scripts/plugin-sync.mjs
// Tier2 前置：插件经 GitHub 安装/更新（LT 决策⑤）。闭环：发布新版本 → push GitHub → update 插件 → 测试。
// 本脚本 update 插件到被测版本并校验已安装版本，不符则告警（fail-fast 由 Tier2 用例的版本前置承担）。
// 更新命令可用 TF_E2E_PLUGIN_UPDATE_CMD 覆盖；被测版本可用 TF_E2E_VERSION 覆盖（默认读源 plugin.json）。
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PKG_ROOT = process.cwd();
const sourceVersion = JSON.parse(readFileSync(join(PKG_ROOT, '.claude-plugin', 'plugin.json'), 'utf-8')).version;
const expected = process.env.TF_E2E_VERSION || sourceVersion;
const updateCmd = process.env.TF_E2E_PLUGIN_UPDATE_CMD || 'claude plugin update team-flow';

console.log(`[plugin-sync] 被测目标版本: ${expected}（源 plugin.json）`);
console.log(`[plugin-sync] 执行更新: ${updateCmd}`);
try {
  execSync(updateCmd, { stdio: 'inherit', timeout: 180000 });
} catch (e) {
  console.warn(`[plugin-sync] ⚠️ 更新命令失败（可手动更新，或设 TF_E2E_PLUGIN_UPDATE_CMD 指定正确命令）: ${e.message}`);
}

// 校验已安装版本（best-effort）
try {
  const list = execSync('claude plugin list', { encoding: 'utf-8', timeout: 60000 });
  if (list.includes(expected)) {
    console.log(`[plugin-sync] ✅ 已安装插件确认含目标版本 ${expected}`);
  } else {
    console.warn(`[plugin-sync] ⚠️ 未在 plugin list 确认版本 ${expected}，请人工核对已安装插件版本后再跑 Tier2`);
    console.log(list);
  }
} catch (e) {
  console.warn(`[plugin-sync] ⚠️ 无法读取 plugin list: ${e.message}（请人工确认已安装插件版本 == ${expected}）`);
}
