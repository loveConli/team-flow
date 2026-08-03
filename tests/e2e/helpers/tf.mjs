// tests/e2e/helpers/tf.mjs
// team-flow e2e runner：tf CLI 子进程包装。
// 复用 tests/lib/cmd-state.test.mjs 的 {exitCode,stdout,stderr} 归一化模式，补充 JSON 解析。
// 来源：v0.31.0 e2e runner 重构（设计：~/.claude/plans/enumerated-conjuring-avalanche.md）。
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// helpers/ -> tests/e2e -> tests -> team-flow（包根）
export const PKG_ROOT = join(__dirname, '..', '..', '..');
export const CLI_PATH = join(PKG_ROOT, 'scripts', 'team-flow.mjs');

export function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

/**
 * 执行 `tf <args>`，归一化为 {exitCode, stdout, stderr}。
 * 退出码语义（经核查）：0=成功/通过；1=业务失败/运行时异常（同码）；2=用法错误。
 */
export function tf(args, options = {}) {
  try {
    const result = execSync(
      `${shellQuote(process.execPath)} ${shellQuote(CLI_PATH)} ${args}`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...options }
    );
    return { exitCode: 0, stdout: result.trim(), stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status || 1,
      stdout: err.stdout?.trim() || '',
      stderr: err.stderr?.trim() || err.message,
    };
  }
}

/**
 * 执行带 --json 的 tf 命令并解析 stdout。
 * 返回 {exitCode, stdout, stderr, json}；json 解析失败为 null（保留 stdout 供诊断）。
 * 注意：guard 的 unknown-transition 分支输出紧凑 JSON、正常路径 pretty JSON，均为合法 JSON。
 */
export function tfJson(args, options = {}) {
  const r = tf(args, options);
  let json = null;
  if (r.stdout) {
    try {
      json = JSON.parse(r.stdout);
    } catch {
      json = null;
    }
  }
  return { ...r, json };
}
