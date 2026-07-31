// scripts/lib/cmd-state.mjs — tf state subcommand handler
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path, { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// VALID_STATES 统一从 state-loader.mjs 引入(状态机合法值唯一真相源),不再本地硬编码。
// 来源:workflow-feedback 2026-08-01,#100005。
import { readState, writeState, updateField, rebuildState, VALID_STATES } from './state-loader.mjs';
import { computeArtifactsHash, computeContractHash } from './hash.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SETTABLE_FIELDS = [
  'workflow', 'test_result', 'batches_completed', 'spec_merged',
  'dp_0_decisions', 'dp_0_confirmed', 'dp_0_timestamp', 'dp_0_result',
  'dp_1_result', 'dp_1_timestamp', 'dp_1_decisions', 'dp_1_confirmed',
  'dp_2_result', 'dp_2_timestamp', 'dp_2_decisions', 'dp_2_confirmed',
  'dp_3_result', 'dp_3_timestamp', 'dp_3_decisions', 'dp_3_confirmed',
  'dp_5_result', 'dp_5_timestamp', 'dp_5_decisions', 'dp_5_confirmed',
  'dp_6_result', 'dp_6_timestamp', 'dp_6_decisions', 'dp_6_confirmed',
  'dp_7_result', 'dp_7_timestamp', 'dp_7_decisions', 'dp_7_confirmed',
  // Architecture design gate (v0.9 §26, v0.22.5 评审修复 F02)
  'arch_design_decision', 'arch_design_reason',
  'arch_design_timestamp', 'arch_design_artifacts',
  // Architecture review (v0.28.1 §36 审查增强)
  'arch_review_verdict', 'arch_review_rounds', 'arch_review_report',
  // DP-A user confirmation gate (v0.29.0 §37)
  'dp_a_result', 'dp_a_timestamp', 'dp_a_adjustments',
  // Compound engineering capture gate (v0.24.0 复利贯穿强制化)
  'compound_skipped',
];

export async function run(args) {
  const { positionals, values } = parseArgs({
    args,
    options: {
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const sub = positionals[0];  // init | check | transition | get | rebuild | set
  let changeDir = positionals[1];
  const arg = positionals[2];  // <to-state> for transition, <field> for get

  if (!changeDir) {
    console.error('Usage: tf state <subcommand> <change-dir> [arg]');
    console.error('Subcommands: init, check, transition, get, rebuild, set');
    process.exit(2);
  }

  // 修复相对路径 bug(来源:workflow-feedback 2026-08-01,#100005)。
  // 根因:readState 用 path.join(changeDir,...) 按用户 cwd 解析,而 transition 分支 spawn guard
  // 子进程时 cwd 设为包根(join(__dirname,'..','..'))+ 原样 changeDir,两处基准不一致——用户传
  // 相对路径时 guard 在包根下找不到产物。统一在入口 resolve 为绝对路径,使后续 readState /
  // guard spawn / existsSync 全部基于同一绝对基准,消除 cwd 歧义。
  changeDir = path.resolve(changeDir);

  // Unknown subcommand: report a usage error (exit 2) BEFORE the BUG-B
  // state-file existence check, so a bad subcommand is not masked by the
  // "No state file" error (which would return exit 1 instead of exit 2).
  const KNOWN_SUBS = ['init', 'check', 'transition', 'get', 'rebuild', 'set'];
  if (!KNOWN_SUBS.includes(sub)) {
    console.error(`Unknown subcommand: ${sub}. Valid: ${KNOWN_SUBS.join(', ')}`);
    process.exit(2);
  }

  // BUG-B: every subcommand except `init` requires an existing state file.
  // Without this check, readState silently returns defaults and `set` would
  // create a phantom .team-flow.yaml in the wrong directory (state drift).
  if (sub !== 'init') {
    const STATE_FILE = '.team-flow.yaml';
    if (!existsSync(join(changeDir, STATE_FILE))) {
      console.error(`No state file at ${join(changeDir, STATE_FILE)}. Run 'tf state init <change-dir>' first.`);
      process.exit(1);
    }
  }

  switch (sub) {
    case 'init': {
      if (!existsSync(changeDir)) {
        mkdirSync(changeDir, { recursive: true });
      }
      const hash = computeArtifactsHash(changeDir);
      const ch = computeContractHash(changeDir);
      const state = readState(changeDir);
      state.artifacts_hash = hash;
      state.contract_hash = ch;
      state.last_transition = new Date().toISOString();
      writeState(changeDir, state);
      if (values.json) {
        console.log(JSON.stringify({ ok: true, artifacts_hash: hash, contract_hash: ch }));
      } else {
        console.log(`State initialized. artifacts_hash: ${hash}`);
      }
      break;
    }
    case 'check': {
      const state = readState(changeDir);
      const currentHash = computeArtifactsHash(changeDir);
      const consistent = state.artifacts_hash === currentHash;
      if (values.json) {
        console.log(JSON.stringify({
          consistent,
          stored_hash: state.artifacts_hash,
          current_hash: currentHash,
          state: state.state,
        }));
      } else {
        if (consistent) {
          console.log('State consistent with artifacts.');
        } else {
          console.log('State INCONSISTENT — artifacts have changed since last transition.');
        }
        console.log(`  State: ${state.state}, stored hash: ${state.artifacts_hash}`);
        console.log(`  Current hash: ${currentHash}`);
      }
      process.exit(consistent ? 0 : 1);
      break;
    }
    case 'transition': {
      const toState = arg;
      if (!toState) {
        console.error('Usage: tf state transition <change-dir> <to-state>');
        process.exit(2);
      }

      // Validate state name
      if (!VALID_STATES.includes(toState)) {
        console.error(`Invalid state: '${toState}'. Must be one of: ${VALID_STATES.join(', ')}`);
        process.exit(1);
      }

      const state = readState(changeDir);
      const fromState = state.state;

      // Run guard before allowing transition (H-2: enforce guard)
      const guardScript = join(__dirname, '..', 'guard', 'guard.mjs');
      const rawWorkflow = state.workflow || 'full';
      // Normalize: guard only accepts full/hotfix/tweak, not "auto"
      const workflow = rawWorkflow === 'auto' ? 'full' : rawWorkflow;
      const guardResult = spawnSync('node', [guardScript, 'check', changeDir, fromState, toState, '--json', '--workflow', workflow], {
        cwd: join(__dirname, '..', '..'),
        timeout: 10_000,
      });

      const guardOutput = guardResult.stdout?.toString() ?? '';
      const guardStderr = guardResult.stderr?.toString().trim() ?? '';
      if (guardResult.error) {
        console.error(`Guard check failed for ${fromState} -> ${toState}:`);
        console.error(`  [guard-error] ${guardResult.error.message}`);
        if (guardStderr) console.error(`  ${guardStderr}`);
        process.exit(1);
      }

      let parsed;
      try {
        parsed = JSON.parse(guardOutput);
      } catch {
        console.error(`Guard check failed for ${fromState} -> ${toState}:`);
        console.error('  [guard-error] Guard did not return valid JSON.');
        if (guardStderr) console.error(`  ${guardStderr}`);
        process.exit(1);
      }

      if (guardResult.status !== 0 || parsed.pass !== true) {
        const failures = (parsed.checks || [])
          .filter(c => !c.pass)
          .flatMap(c => (c.failures || []).map(f => `[${c.dimension}] ${f}`));
        console.error(`Guard check failed for ${fromState} -> ${toState}:`);
        for (const f of failures) console.error(`  ${f}`);
        if (parsed.error) console.error(`  ${parsed.error}`);
        if (failures.length === 0 && !parsed.error) {
          console.error('  [guard-error] Guard failed without a structured failure message.');
        }
        process.exit(1);
      }

      state.state = toState;
      state.last_transition_from = fromState;
      state.last_transition_to = toState;
      state.last_transition = new Date().toISOString();
      writeState(changeDir, state);
      if (values.json) {
        console.log(JSON.stringify({ ok: true, from: fromState, to: toState }));
      } else {
        console.log(`State transitioned: ${fromState} -> ${toState}`);
      }
      break;
    }
    case 'get': {
      const field = arg;
      if (!field) {
        console.error('Usage: tf state get <change-dir> <field>');
        process.exit(2);
      }
      const state = readState(changeDir);
      if (!Object.prototype.hasOwnProperty.call(state, field) && field in state) {
        console.error(`Field '${field}' is not a valid state field`);
        process.exit(1);
      }
      const value = state[field];
      if (values.json) {
        console.log(JSON.stringify({ field, value: value ?? null }));
      } else {
        console.log(value ?? 'null');
      }
      break;
    }
    case 'rebuild': {
      const state = rebuildState(changeDir, { computeArtifactsHash, computeContractHash });
      if (values.json) {
        console.log(JSON.stringify({ ok: true, state: state.state }));
      } else {
        console.log(`State rebuilt from artifacts. state: ${state.state}`);
      }
      break;
    }
    case 'set': {
      // tf state set <change-dir> <field> <value>
      const field = arg;
      const value = positionals[3];
      if (!field || value === undefined) {
        console.error('Usage: tf state set <change-dir> <field> <value>');
        process.exit(2);
      }
      if (!SETTABLE_FIELDS.includes(field)) {
        // 错误提示升级(来源:workflow-feedback 2026-08-01,#100005):
        // 'state' 是最常被误用 set 的字段,专门给出完整 transition 语法示例;合法状态清单
        // 引用 VALID_STATES(唯一真相源),不硬编码。保留 'not settable' 措辞以兼容既有回归测试。
        if (field === 'state') {
          console.error(
            `⛔ 'state' 不是可 set 的字段(not settable)。状态转换请用完整语法:\n` +
            `   tf state transition <change-dir 绝对路径> <目标状态>\n` +
            `   合法状态:${VALID_STATES.join('/')}`
          );
        } else {
          console.error(`⛔ Field '${field}' is not settable (use 'transition' for state, or check SETTABLE_FIELDS)`);
        }
        process.exit(1);
      }
      updateField(changeDir, field, value);
      if (values.json) {
        console.log(JSON.stringify({ ok: true, field, value }));
      } else {
        console.log(`✅ Set ${field} = ${value}`);
      }
      break;
    }
    default:
      console.error(`Unknown subcommand: ${sub}. Valid: init, check, transition, get, rebuild, set`);
      process.exit(2);
  }
}
