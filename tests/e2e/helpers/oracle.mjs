// tests/e2e/helpers/oracle.mjs
// team-flow e2e runner：结构化 oracle（用 tf CLI 自带门禁作断言源，替代 grep 文件）。
// 退出码/字段语义经 Phase 0 核查（见设计文档 §六 oracle 速查表）。
import { tf, tfJson, shellQuote } from './tf.mjs';

/**
 * 相位转换门禁 oracle（最权威）。
 * `tf runtime guard check <dir> <from> <to> --json [--workflow <mode>]`
 * 返回 {exitCode, pass, checks:[{dimension,pass,failures}], error?}。
 * error 仅在 unknown-transition 分支出现；exit 1 = 业务失败与运行时异常同码。
 */
export function guardCheck(dir, from, to, { workflow } = {}) {
  const wf = workflow ? ` --workflow ${workflow}` : '';
  const r = tfJson(`runtime guard check ${shellQuote(dir)} ${from} ${to} --json${wf}`);
  return {
    exitCode: r.exitCode,
    pass: r.json?.pass === true,
    checks: r.json?.checks || [],
    error: r.json?.error || null,
    stdout: r.stdout,
    stderr: r.stderr,
  };
}

/** 读单个状态字段。未知字段也 exit 0/value=null，故不能用退出码判字段合法性。 */
export function stateGet(dir, field) {
  const r = tfJson(`state get ${shellQuote(dir)} ${field} --json`);
  return { exitCode: r.exitCode, value: r.json?.value ?? null };
}

/** 执行状态转换（内含 guard + 落盘）。成功 {ok:true,from,to} exit 0；guard 失败/非法状态 exit 1。 */
export function stateTransition(dir, to) {
  const r = tfJson(`state transition ${shellQuote(dir)} ${to} --json`);
  return { exitCode: r.exitCode, ok: r.json?.ok === true, from: r.json?.from, to: r.json?.to, stderr: r.stderr };
}

/** 写可设字段（SETTABLE_FIELDS 白名单）。state/workflow 不可 set（set state → exit 1）。 */
export function stateSet(dir, field, value) {
  const r = tf(`state set ${shellQuote(dir)} ${field} ${shellQuote(value)}`);
  return { exitCode: r.exitCode, stderr: r.stderr };
}

/** 初始化状态文件（计算 artifacts_hash/contract_hash/test_matrix_hash）。 */
export function stateInit(dir) {
  const r = tfJson(`state init ${shellQuote(dir)} --json`);
  return { exitCode: r.exitCode, json: r.json, stderr: r.stderr };
}

/**
 * 产物 schema 校验（无 --json，靠退出码）。0=valid；1=有 ERROR（含 dist 缺失走 catch）；2=用法错误。
 * 注意：依赖 dist/index.js（schema-valid 引擎），缺失会 exit 1。
 */
export function validate(dir) {
  const r = tf(`validate ${shellQuote(dir)}`);
  return { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr };
}

/**
 * 仓库隔离（无 --json）。exit 0=成功/已隔离/--force；1=失败需人工。
 * Case A 确定性证据用文件系统断言 <root>/.worktrees/<change>/<repo>/.git（见 fixture/workspace helper）。
 * 隐藏前置：worktree 只对保护分支(main/master)仓库创建。
 */
export function isolate(dir, name, { force } = {}) {
  const f = force ? ' --force' : '';
  const n = name ? ` ${shellQuote(name)}` : '';
  const r = tf(`isolate ${shellQuote(dir)}${n}${f}`);
  return { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr };
}

/** build-executor 阶段 oracle。{ok,current,valid,plan,waves[],failures}；current→exit 0，非 current/无 plan→exit 1。 */
export function executionShow(dir) {
  const r = tfJson(`execution show ${shellQuote(dir)} --json`);
  return { exitCode: r.exitCode, json: r.json, stderr: r.stderr };
}

/** workflow 模式推断（恒输出 JSON）。{mode,explicit,reason}。 */
export function infer(dir) {
  const r = tfJson(`runtime infer ${shellQuote(dir)}`);
  return { exitCode: r.exitCode, json: r.json, stderr: r.stderr };
}

/**
 * 非法 state 巡检（doctor 退出码恒 0，必须 import 具名函数拿结构化结果）。
 * root 为含 changes/ 的工作区根；扫描 changes 下各 change 的 .team-flow.yaml 的 state 合法性。
 * 返回 {pass, message}。
 */
export async function doctorChangeStates(root) {
  const mod = await import('../../../scripts/lib/cmd-doctor.mjs');
  return mod.checkChangeStates(root);
}
