// tests/e2e/deterministic/state-machine.test.mjs
// Tier 1 确定性：状态机转换 + state 字段防护（v0.30.0 RC-C/RC-A）。
// 来源：workflow-feedback 2026-08-01 #100004 #100005；设计 §七 Tier1 矩阵。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { guardCheck, stateGet, stateTransition, stateSet, doctorChangeStates } from '../helpers/oracle.mjs';
import { makeChange, patchStateField } from '../helpers/fixture.mjs';
import { tf } from '../helpers/tf.mjs';

// guard recognized 的合法转换（full workflow）：error 字段为 null（即使因缺产物 pass=false）。
const VALID_TRANSITIONS = [
  ['exploring', 'specifying'], ['specifying', 'bridging'], ['bridging', 'approved-for-build'],
  ['approved-for-build', 'executing'], ['executing', 'closing'], ['executing', 'debugging'],
  ['debugging', 'executing'],
  // 回退（空维度）
  ['specifying', 'exploring'], ['bridging', 'specifying'], ['approved-for-build', 'specifying'],
  ['approved-for-build', 'bridging'], ['executing', 'specifying'], ['executing', 'bridging'], ['closing', 'specifying'],
  // 放弃（空维度）
  ['exploring', 'abandoned'], ['specifying', 'abandoned'], ['bridging', 'abandoned'],
  ['approved-for-build', 'abandoned'], ['executing', 'abandoned'], ['debugging', 'abandoned'],
];
// 非法转换：guard 返回 error "Unknown transition"。
const INVALID_TRANSITIONS = [
  ['exploring', 'closing'], ['exploring', 'executing'], ['specifying', 'executing'],
  ['specifying', 'closing'], ['bridging', 'executing'], ['closing', 'executing'],
];

describe('T1: state machine transitions（guard 转换表）', () => {
  let fix;
  before(() => { fix = makeChange({ state: 'exploring' }); });
  after(() => { if (fix) rmSync(fix.root, { recursive: true, force: true }); });

  it('T1-state-full-table: 全部合法转换被 guard 识别（error=null）', () => {
    for (const [from, to] of VALID_TRANSITIONS) {
      const r = guardCheck(fix.changeDir, from, to);
      assert.equal(r.error, null, `${from}->${to} 应为合法转换，却得 error: ${r.error}`);
    }
  });

  it('T1-state-full-table: 非法转换被 guard 拒（Unknown transition, exit 1）', () => {
    for (const [from, to] of INVALID_TRANSITIONS) {
      const r = guardCheck(fix.changeDir, from, to);
      assert.equal(r.exitCode, 1, `${from}->${to} 应 exit 1`);
      assert.match(r.error || '', /Unknown transition/i, `${from}->${to} 应报 Unknown transition`);
    }
  });

  it('T1-valid-transition: exploring->specifying 产物齐时 guard pass', () => {
    const r = guardCheck(fix.changeDir, 'exploring', 'specifying');
    assert.equal(r.pass, true, `exploring->specifying 应 pass，失败维度: ${JSON.stringify(r.checks.filter(c => !c.pass))}`);
  });

  it('T1-relative-path: 相对路径 tf state transition 正常工作（#100005 修复）', () => {
    // cwd=fixture root，传相对 change 路径；修复前 guard 以包根 cwd 解析相对路径找不到产物而失败。
    const rel = join('changes', fix.name);
    const r = tf(`state transition ${rel} specifying --json`, { cwd: fix.root });
    assert.equal(r.exitCode, 0, `相对路径转换应 exit 0（#100005 修复），got ${r.exitCode}: ${r.stderr}`);
    const st = stateGet(fix.changeDir, 'state');
    assert.equal(st.value, 'specifying', '转换后 state 应为 specifying');
  });
});

describe('T1: state field protection（#100004）', () => {
  let fix;
  before(() => { fix = makeChange({ state: 'exploring' }); });
  after(() => { if (fix) rmSync(fix.root, { recursive: true, force: true }); });

  it('T1-set-state-blocked: tf state set state 被拒（exit 1，含 transition 提示）', () => {
    const r = stateSet(fix.changeDir, 'state', 'executing');
    assert.equal(r.exitCode, 1, 'set state 应 exit 1');
    assert.match(r.stderr, /transition/i, '报错应提示用 transition');
  });

  it('T1-dp-fields: dp_1/2/3 决策字段可独立写入并回读（DP 编号映射载体）', () => {
    assert.equal(stateSet(fix.changeDir, 'dp_1_result', 'confirmed: need-explorer').exitCode, 0);
    assert.equal(stateSet(fix.changeDir, 'dp_2_result', 'approved: spec-writer').exitCode, 0);
    assert.equal(stateSet(fix.changeDir, 'dp_3_result', 'approved: contract-builder').exitCode, 0);
    assert.match(stateGet(fix.changeDir, 'dp_1_result').value, /need-explorer/);
    assert.match(stateGet(fix.changeDir, 'dp_2_result').value, /spec-writer/);
    assert.match(stateGet(fix.changeDir, 'dp_3_result').value, /contract-builder/);
  });

  it('T1-writestate-rejects: writeState 写非法 state 抛错（defense-in-depth，throw 先于落盘不污染 fixture）', async () => {
    const { writeState, readState } = await import('../../../scripts/lib/state-loader.mjs');
    const state = readState(fix.changeDir);
    state.state = 'planning'; // 非法值
    assert.throws(() => writeState(fix.changeDir, state), /Legal states/i, 'writeState 应拒绝非法 state');
  });

  // 破坏性用例：直改 state 为非法值（模拟子代理绕过 CLI Edit），用独立 fixture 避免污染上面的共享 fixture。
  it('T1-doctor-illegal-state: 非法 state 被 checkChangeStates 巡检命中', async () => {
    const own = makeChange({ state: 'exploring' });
    try {
      patchStateField(own.changeDir, 'state', 'planning'); // 绕过 CLI 直改
      const r = await doctorChangeStates(own.root);
      assert.equal(r.pass, false, 'checkChangeStates 应报非法 state');
      assert.match(r.message, /planning/, '巡检信息应点名非法值 planning');
    } finally {
      rmSync(own.root, { recursive: true, force: true });
    }
  });
});
