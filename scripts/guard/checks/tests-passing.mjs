// scripts/guard/checks/tests-passing.mjs — verify test execution evidence is recorded
//
// v0.13 §50 重写（BUG-A 政策修正，C1-domain-policy 事件修复，RC-2 门禁锚错证据）：
// - 非存量 change 必须提供 `tf test record` 程序化写入的结构化证据
//   （recorded-by=tf-test-record + 证据文件存在 + failed=0 + total>0）；
// - 废除 dp_6_result 作为等价证据（dp_6 仍是决策点记录，但不再是门禁信号）；
// - 关闭空真：total=0 一律拒绝（除非显式 skip/legacy）；
// - 存量 change（无 schema_version 打戳）保留 v0.31 行为——BUG-A 通道仅对存量开放。
import fs from 'node:fs';
import path from 'node:path';
import { readState } from '../../lib/state-loader.mjs';
import { isLegacyChange, skipMissingReason, SKIP_REASON_HINT } from './test-gate-exemptions.mjs';

/**
 * 解析结构化 test_result：
 *   "pass: total=42 passed=42 failed=0 skipped=2 runner=maven-surefire recorded-by=tf-test-record ts=..."
 * 返回 { verdict, total, passed, failed, skipped, runner, recordedBy, ts } 或 null。
 */
export function parseStructuredTestResult(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw.trim().replace(/^["']|["']$/g, '');
  const m = text.match(/^(pass|fail):\s*(.*)$/i);
  if (!m) return null;
  const fields = {};
  for (const kv of m[2].matchAll(/([A-Za-z-]+)=(\S+)/g)) fields[kv[1]] = kv[2];
  const toInt = (key) => (fields[key] !== undefined && /^\d+$/.test(fields[key]) ? parseInt(fields[key], 10) : null);
  return {
    verdict: m[1].toLowerCase(),
    total: toInt('total'),
    passed: toInt('passed'),
    failed: toInt('failed'),
    skipped: toInt('skipped'),
    runner: fields.runner ?? null,
    recordedBy: fields['recorded-by'] ?? null,
    ts: fields.ts ?? null,
  };
}

const SKIP_OR_RECORD_HINT =
  "Run the project test suite, then record it: tf test record <dir> --from <runner-output-file>. "
  + "If this change legitimately has no automated tests, skip explicitly: "
  + "test_matrix_skipped=true + test_matrix_skip_reason='<reason>'";

/**
 * Returns { pass, failures[], reason? }.
 */
export function checkTestsPassing(changeDir) {
  const state = readState(changeDir);

  // Legacy（无 schema_version）：保留 v0.31 行为（BUG-A 通道仅对存量开放）。
  if (isLegacyChange(state)) {
    const markers = [state.test_result, state.dp_6_result];
    const passed = markers.some((v) => {
      if (typeof v !== 'string') return false;
      const normalized = v.trim().replace(/^["']|["']$/g, '');
      return normalized.toLowerCase().startsWith('pass');
    });
    if (passed) {
      return { pass: true, failures: [] };
    }
    return {
      pass: false,
      failures: [
        `verification outcome missing (legacy): test_result is '${state.test_result || 'null'}' and dp_6_result is '${state.dp_6_result || 'null'}' — expected a result starting with 'pass'. Run release-archivist verification (DP-6) first.`,
      ],
    };
  }

  // 显式 skip（必须附理由）。
  if (state.test_matrix_skipped === 'true') {
    if (skipMissingReason(state)) {
      return { pass: false, failures: [SKIP_REASON_HINT] };
    }
    return { pass: true, failures: [], reason: `explicitly skipped: ${state.test_matrix_skip_reason}` };
  }

  // 非存量：要求 tf test record 写入的结构化证据。
  const parsed = parseStructuredTestResult(state.test_result);
  if (!parsed) {
    return {
      pass: false,
      failures: [`no programmatic test evidence recorded — test_result is '${state.test_result || 'null'}'. ${SKIP_OR_RECORD_HINT}`],
    };
  }
  if (parsed.recordedBy !== 'tf-test-record') {
    return {
      pass: false,
      failures: [
        "test_result must be recorded by 'tf test record' (programmatic evidence); manually written values are not accepted (v0.13 §50)",
      ],
    };
  }
  // 证据文件必须存在（纵深防御：记录必须可追溯到落盘的 runner 输出）。
  if (!state.test_evidence_path || !fs.existsSync(path.join(changeDir, state.test_evidence_path))) {
    return {
      pass: false,
      failures: [
        'test evidence file missing — test_result must trace to a saved runner output recorded by tf test record (.superpowers/test-evidence/)',
      ],
    };
  }
  if (parsed.verdict !== 'pass' || (parsed.failed ?? 0) !== 0) {
    return {
      pass: false,
      failures: [
        `test suite reported failures (failed=${parsed.failed ?? '?'}) — fix the failures, re-run the suite, and record again via tf test record`,
      ],
    };
  }
  if (!Number.isInteger(parsed.total) || parsed.total <= 0) {
    return {
      pass: false,
      failures: [
        'test_result records total=0 — an empty suite is not evidence; add tests or skip explicitly (test_matrix_skipped=true + reason)',
      ],
    };
  }
  return { pass: true, failures: [] };
}
