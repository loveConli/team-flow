// scripts/lib/test-record.mjs — tf test record：程序化测试证据记录（v0.13 §50）
//
// 设计增强方案 v0.13 §50（BUG-A 政策修正）：tests-passing 门禁锚定客观证据，
// 不再锚定 LLM 自述。本命令解析主流测试 runner 的输出，把结构化结果写入
// state.test_result（recorded-by=tf-test-record），并把原始输出落盘为证据文件。
// 不提供手工自述通道（--manual）：确无自动化测试的 change 的合法出路是
// 显式 skip（test_matrix_skipped=true + test_matrix_skip_reason），可审计、可巡检。
//
// 扩展性：新增 runner 只需在 PARSERS 注册表加一个解析器（零依赖）。
import { parseArgs } from 'node:util';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { readState, writeState } from './state-loader.mjs';

export const SUPPORTED_RUNNERS = ['maven-surefire', 'jest', 'pytest'];

// ── 解析器（全部返回 { total, passed, failed, skipped } 或 null）────────────

/** maven surefire 控制台汇总行（多模块累加）："Tests run: 42, Failures: 0, Errors: 0, Skipped: 2" */
export function parseMavenSurefire(text) {
  const re = /Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/g;
  let m;
  let total = 0; let failures = 0; let errors = 0; let skipped = 0;
  let found = false;
  while ((m = re.exec(text)) !== null) {
    found = true;
    total += parseInt(m[1], 10);
    failures += parseInt(m[2], 10);
    errors += parseInt(m[3], 10);
    skipped += parseInt(m[4], 10);
  }
  if (!found) return null;
  return { total, passed: total - failures - errors - skipped, failed: failures + errors, skipped };
}

/** maven surefire XML 报告目录（target/surefire-reports）：累加 <testsuite> 属性。 */
export function parseSurefireReportDir(dir) {
  let total = 0; let failures = 0; let errors = 0; let skipped = 0;
  let found = false;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.xml')) continue;
    const content = readFileSync(join(dir, name), 'utf-8');
    for (const tag of content.matchAll(/<testsuite\b[^>]*>/g)) {
      const attrs = tag[0];
      const pick = (key) => {
        const am = attrs.match(new RegExp(`\\b${key}="(\\d+)"`));
        return am ? parseInt(am[1], 10) : 0;
      };
      found = true;
      total += pick('tests');
      failures += pick('failures');
      errors += pick('errors');
      skipped += pick('skipped');
    }
  }
  if (!found) return null;
  return { total, passed: total - failures - errors - skipped, failed: failures + errors, skipped };
}

/** jest --json 输出。 */
export function parseJest(text) {
  let data;
  try { data = JSON.parse(text); } catch { return null; }
  if (typeof data?.numTotalTests !== 'number') return null;
  const total = data.numTotalTests;
  const failed = data.numFailedTests ?? 0;
  const passed = data.numPassedTests ?? 0;
  const skipped = (data.numPendingTests ?? 0) + (data.numTodoTests ?? 0);
  return { total, passed, failed, skipped };
}

/** pytest terminal summary："== 5 passed, 2 failed, 1 skipped in 3.21s ==" */
export function parsePytest(text) {
  const lines = text.split('\n');
  const summaryLine = [...lines].reverse().find(l => /=+\s.*(passed|failed|error|no tests ran)/.test(l));
  if (!summaryLine) return null;
  const pick = (label) => {
    const m = summaryLine.match(new RegExp(`(\\d+)\\s+${label}`));
    return m ? parseInt(m[1], 10) : 0;
  };
  if (/no tests ran/.test(summaryLine)) return { total: 0, passed: 0, failed: 0, skipped: 0 };
  const passed = pick('passed') + pick('xpassed');
  const failed = pick('failed') + pick('error');
  const skipped = pick('skipped') + pick('xfailed');
  const total = passed + failed + skipped;
  if (total === 0) return null;
  return { total, passed, failed, skipped };
}

const PARSERS = {
  'maven-surefire': parseMavenSurefire,
  jest: parseJest,
  pytest: parsePytest,
};

// ── Failure Analysis 分类法（v0.13 §57，来自 glaf4-test analyze-surefire-failures.py）────────

/** 测试失败分类：assertion_failure / runtime_error / framework_error / compile_error / dependency_blocker / unknown */
export function classifyFailure(text) {
  const lower = text.toLowerCase();

  // 1. 编译错误
  if (lower.includes('compilation error') || lower.includes('cannot find symbol') ||
      lower.includes('incompatible types') || lower.includes('method does not override') ||
      lower.includes('syntaxerror') || lower.includes('indentationerror')) {
    return 'compile_error';
  }

  // 2. 依赖阻塞
  if (lower.includes('connection refused') || lower.includes('connection timed out') ||
      lower.includes('unknownhostexception') || lower.includes('could not resolve host') ||
      lower.includes('no such file or directory') || lower.includes('module not found') ||
      lower.includes('package does not exist') || lower.includes('dependency') && lower.includes('failed')) {
    return 'dependency_blocker';
  }

  // 3. 框架错误
  if (lower.includes('applicationcontextexception') || lower.includes('beandefinitionstoreexception') ||
      lower.includes('nosuchbeandefinitionexception') || lower.includes('unsatisfieddependencyexception') ||
      lower.includes('spring') && lower.includes('failed to load') ||
      lower.includes('contextconfiguration') || lower.includes('testcontext')) {
    return 'framework_error';
  }

  // 4. 运行时异常
  if (lower.includes('nullpointerexception') || lower.includes('illegalargumentexception') ||
      lower.includes('indexoutofboundsexception') || lower.includes('classcastexception') ||
      lower.includes('numberformatexception') || lower.includes('stackoverflowerror') ||
      lower.includes('outofmemoryerror') || lower.includes('runtimeerror') ||
      lower.includes('typeerror') || lower.includes('referenceerror')) {
    return 'runtime_error';
  }

  // 5. 断言失败
  if (lower.includes('assertionerror') || lower.includes('expected') && lower.includes('but was') ||
      lower.includes('assertionfailederror') || lower.includes('expected :') && lower.includes('actual :') ||
      lower.includes('expect(') || lower.includes('assert') && lower.includes('failed')) {
    return 'assertion_failure';
  }

  // 6. 未知
  return 'unknown';
}

/** auto 识别：按内容特征匹配 runner。 */
export function detectRunner(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && parseJest(trimmed)) return 'jest';
  if (/Tests run:\s*\d+,\s*Failures:/.test(trimmed)) return 'maven-surefire';
  if (parsePytest(trimmed)) return 'pytest';
  return null;
}

// ── CLI ─────────────────────────────────────────────────────────────────────

export async function run(args) {
  const { positionals, values } = parseArgs({
    args,
    options: {
      from: { type: 'string' },
      runner: { type: 'string', default: 'auto' },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const usageMsg = 'Usage: tf test record <change-dir> --from <runner-output-file|surefire-report-dir> [--runner auto|maven-surefire|jest|pytest] [--json]';
  if (positionals[0] !== 'record') {
    console.error(usageMsg);
    process.exit(2);
  }
  const changeDirArg = positionals[1];
  if (!changeDirArg) {
    console.error(usageMsg);
    process.exit(2);
  }
  const changeDir = path.resolve(changeDirArg);
  if (!existsSync(join(changeDir, '.team-flow.yaml'))) {
    console.error(`No state file at ${join(changeDir, '.team-flow.yaml')}. Run 'tf state init <change-dir>' first.`);
    process.exit(1);
  }
  if (!values.from) {
    console.error(usageMsg);
    process.exit(2);
  }
  const fromPath = path.resolve(values.from);
  if (!existsSync(fromPath)) {
    console.error(`Runner output not found: ${fromPath}`);
    process.exit(1);
  }
  const validRunners = ['auto', ...SUPPORTED_RUNNERS];
  if (!validRunners.includes(values.runner)) {
    console.error(`--runner must be one of: ${validRunners.join(', ')}`);
    process.exit(2);
  }

  // 解析 runner 输出
  let stats = null;
  let runner = values.runner;
  const fromStat = statSync(fromPath);
  if (fromStat.isDirectory()) {
    if (runner !== 'auto' && runner !== 'maven-surefire') {
      console.error('Directory input is only supported for maven-surefire XML report directories');
      process.exit(1);
    }
    runner = 'maven-surefire';
    stats = parseSurefireReportDir(fromPath);
  } else {
    const text = readFileSync(fromPath, 'utf-8');
    if (runner === 'auto') {
      runner = detectRunner(text);
      if (!runner) {
        console.error(
          `Could not auto-detect a supported test runner in ${fromPath}.\n`
          + `Supported runners: ${SUPPORTED_RUNNERS.join(', ')} (or pass --runner explicitly).\n`
          + '手工自述通道已关闭（v0.13 §50）：确无自动化测试的 change 请显式跳过：\n'
          + "  tf state set <dir> test_matrix_skipped true + test_matrix_skip_reason '<理由>'"
        );
        process.exit(1);
      }
    }
    stats = PARSERS[runner](text);
  }
  if (!stats) {
    console.error(`Could not parse ${runner} output in ${fromPath} — no recognizable test summary found.`);
    process.exit(1);
  }

  // 判定：failed==0 且 total>0 才算 pass（total=0 空真拒绝，v0.13 §50.2）
  const verdict = stats.failed === 0 && stats.total > 0 ? 'pass' : 'fail';
  const ts = new Date().toISOString();

  // Failure Analysis 分类（v0.13 §57，来自 glaf4-test）
  let failureClass = null;
  if (verdict === 'fail') {
    const rawText = fromStat.isFile()
      ? readFileSync(fromPath, 'utf-8')
      : '';
    failureClass = classifyFailure(rawText);
  }

  const failureInfo = failureClass ? ` failure_class=${failureClass}` : '';
  const record = `${verdict}: total=${stats.total} passed=${stats.passed} failed=${stats.failed} skipped=${stats.skipped} runner=${runner} recorded-by=tf-test-record ts=${ts}${failureInfo}`;

  // 原始证据落盘（tests-passing 门禁与 doctor 巡检都要求该文件存在）
  const evidenceDir = join(changeDir, '.superpowers', 'test-evidence');
  mkdirSync(evidenceDir, { recursive: true });
  const safeTs = ts.replace(/[:.]/g, '-');
  const evidenceRel = join('.superpowers', 'test-evidence', `${safeTs}-${runner}.txt`).split(path.sep).join('/');
  const raw = fromStat.isFile()
    ? readFileSync(fromPath, 'utf-8')
    : `(maven-surefire XML report directory: ${fromPath})`;
  const MAX_EVIDENCE = 512 * 1024;
  writeFileSync(join(changeDir, evidenceRel), raw.length > MAX_EVIDENCE ? `${raw.slice(0, MAX_EVIDENCE)}\n...[truncated]` : raw, 'utf-8');

  // 程序化写入状态（test_result 不在 SETTABLE_FIELDS，只能经本命令写入）
  const state = readState(changeDir);
  state.test_result = record;
  state.test_evidence_path = evidenceRel;
  writeState(changeDir, state);

  if (values.json) {
    const jsonResult = { ok: true, verdict, ...stats, runner, test_result: record, test_evidence_path: evidenceRel };
    if (failureClass) jsonResult.failure_class = failureClass;
    console.log(JSON.stringify(jsonResult));
  } else {
    console.log(`${verdict === 'pass' ? '✅' : '❌'} test_result recorded (${runner}): total=${stats.total} passed=${stats.passed} failed=${stats.failed} skipped=${stats.skipped}`);
    console.log(`   evidence: ${evidenceRel}`);
    if (verdict === 'fail') {
      console.log(`   failure_class: ${failureClass}`);
      console.log('   closing 将被 tests-passing 门禁阻断：修复失败后重新运行测试套件并再次 tf test record。');
    }
  }
  process.exit(verdict === 'pass' ? 0 : 1);
}
