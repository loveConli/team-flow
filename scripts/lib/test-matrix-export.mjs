#!/usr/bin/env node
/**
 * test-matrix-export — glaf4 test-matrix.json → team-flow test-matrix.md 格式转换
 *
 * v0.12 §46.1 定义，v0.31.0 实现为 CLI 子命令
 * 用法：tf test-matrix-export <input.json> <output.md> [--change-id <id>] [--batch-id <id>]
 *
 * 功能：
 * - 读取 glaf4 的 test-matrix.json
 * - 保留全部 14 字段 + 包装 team_flow_context
 * - 从 test_kind 派生 test_tier（unit/integration）
 * - 输出 team-flow 格式的 test-matrix.md
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

/**
 * 解析 CLI 参数
 */
function parseArgv(argv) {
  const parsed = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--change-id' && argv[i + 1]) {
      parsed.changeId = argv[++i];
    } else if (argv[i] === '--batch-id' && argv[i + 1]) {
      parsed.batchId = argv[++i];
    } else if (argv[i] === '--ledger-ref' && argv[i + 1]) {
      parsed.ledgerRef = argv[++i];
    } else if (!argv[i].startsWith('--')) {
      parsed._.push(argv[i]);
    }
  }
  return parsed;
}

/**
 * test_kind → test_tier 映射（v0.12 §42.4）
 */
const TEST_KIND_TO_TIER = {
  // unit tier
  pure_unit: 'unit',
  mockito_unit: 'unit',
  spring_assisted_unit: 'unit',
  vitest_unit: 'unit',
  vue_test_utils_mount: 'unit',
  // integration tier
  api_mockmvc_standalone: 'integration',
  api_mockmvc_slice: 'integration',
  api_mockmvc_boot: 'integration',
  service_social: 'integration',
  repository_h2: 'integration',
  rabbitmq_social: 'integration',
  redis_social: 'integration',
  external_api_stub: 'integration',
  test_infrastructure: 'integration',
  // e2e tier (v0.38.0，对齐 e2e skill 的 prototype/integration 两 project)
  playwright_prototype: 'e2e',
  playwright_integration: 'e2e',
};

/**
 * 从 glaf4 case 派生 test_tier
 */
function deriveTestTier(testKind) {
  return TEST_KIND_TO_TIER[testKind] || 'unit';
}

/**
 * 转义 markdown 表格单元格
 */
function escapeCell(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * 转换单个 case 为 markdown 行
 */
function caseToRow(c) {
  const tier = deriveTestTier(c.test_kind);
  return [
    c.case_id || '',
    escapeCell(c.behavior || c.display_name || ''),
    c.design_method || '',
    escapeCell(typeof c.input === 'object' ? JSON.stringify(c.input) : (c.input || '')),
    escapeCell(typeof c.expected === 'object' ? JSON.stringify(c.expected) : (c.expected || '')),
    c.test_kind || '',
    tier,
    escapeCell(Array.isArray(c.required_stubs) ? c.required_stubs.join(', ') : (c.mock || '')),
    c.work_mode || 'TDD',
    c.test_file || '',
    c.test_method_name || '',
    c.run_command || '',
  ].join(' | ');
}

/**
 * 提取模块名（从 target 或 case_id 前缀）
 */
function extractModuleName(matrix) {
  if (matrix.target) {
    // e.g., "com.example.service.OrderService" → "OrderService"
    const parts = matrix.target.split('.');
    return parts[parts.length - 1];
  }
  // fallback: from first case_id
  if (matrix.cases?.[0]?.case_id) {
    const id = matrix.cases[0].case_id;
    const match = id.match(/^([A-Z][a-zA-Z]+)/);
    if (match) return match[1];
  }
  return 'Unknown';
}

/**
 * 转换 glaf4 matrix → team-flow markdown
 */
export function convert(matrix, options = {}) {
  const moduleName = extractModuleName(matrix);
  const cases = matrix.cases || [];

  // 统计
  const unitCases = cases.filter(c => deriveTestTier(c.test_kind) === 'unit');
  const integrationCases = cases.filter(c => deriveTestTier(c.test_kind) === 'integration');
  const e2eCases = cases.filter(c => deriveTestTier(c.test_kind) === 'e2e');

  // 提取 complexity
  const complexity = matrix.target_complexity || {};
  let complexityTier = 'medium';
  if (complexity.is_trivial) complexityTier = 'trivial';
  else if ((complexity.public_methods || 0) > 15 || (complexity.lines || 0) > 800 || (complexity.param_count || 0) > 6) {
    complexityTier = 'complex';
  }

  // 提取 candidate ledger
  const candidateLedger = matrix.source_candidate_ledger || [];

  // 构建 markdown
  const lines = [];
  lines.push(`# Test Matrix — ${options.changeId || 'unknown'}`);
  lines.push('');
  lines.push('## Summary');
  lines.push(`- Total cases: ${cases.length}`);
  lines.push(`- Modules covered: 1 (${moduleName}, complexity: ${complexityTier})`);
  lines.push(`- Unit cases: ${unitCases.length} (${Math.round(unitCases.length / cases.length * 100) || 0}%)`);
  lines.push(`- Integration cases: ${integrationCases.length} (${Math.round(integrationCases.length / cases.length * 100) || 0}%)`);
  lines.push(`- E2E cases: ${e2eCases.length} (${Math.round(e2eCases.length / cases.length * 100) || 0}%)`);
  lines.push(`- Deferred items: ${candidateLedger.filter(c => c.decision === 'deferred').length}`);
  lines.push(`- Matrix revision: 1`);
  lines.push('');

  // Candidate Coverage Ledger
  if (candidateLedger.length > 0) {
    lines.push('## Candidate Coverage Ledger');
    lines.push('');
    lines.push('| candidate | category | decision | case_ids | reason |');
    lines.push('|---|---|---|---|---|');
    for (const c of candidateLedger) {
      lines.push(`| ${escapeCell(c.candidate)} | ${c.category || ''} | ${c.decision} | ${escapeCell(Array.isArray(c.case_ids) ? c.case_ids.join(', ') : (c.case_ids || ''))} | ${escapeCell(c.reason || '')} |`);
    }
    lines.push('');
  }

  // Cases
  lines.push('## Cases');
  lines.push('');
  lines.push(`### ${moduleName}`);
  lines.push('');
  lines.push('| case_id | behavior | design_method | input | expected | test_kind | test_tier | mock | work_mode | test_file | test_method_name | run_command |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const c of cases) {
    lines.push(`| ${caseToRow(c)} |`);
  }
  lines.push('');

  // Deferred Items
  const deferred = candidateLedger.filter(c => c.decision === 'deferred');
  if (deferred.length > 0) {
    lines.push('## Deferred Items');
    lines.push('');
    lines.push('| case_id | behavior | design_method | reason | deferred_since |');
    lines.push('|---|---|---|---|---|');
    for (const d of deferred) {
      lines.push(`| ${escapeCell(Array.isArray(d.case_ids) ? d.case_ids[0] : (d.case_ids || ''))} | ${escapeCell(d.candidate)} | — | ${escapeCell(d.reason || '')} | ${new Date().toISOString().slice(0, 10)} |`);
    }
    lines.push('');
  }

  // team_flow_context footer
  lines.push('---');
  lines.push('');
  lines.push('<!-- team_flow_context:');
  lines.push(`  change_id: ${options.changeId || 'unknown'}`);
  if (options.batchId) lines.push(`  batch_id: ${options.batchId}`);
  lines.push(`  closing_stage: test-merge`);
  if (options.ledgerRef) lines.push(`  ledger_ref: ${options.ledgerRef}`);
  lines.push(`  source: glaf4-tests-export`);
  lines.push('-->');

  return lines.join('\n') + '\n';
}

/**
 * CLI entry point
 */
export async function run(args) {
  const argv = parseArgv(args || process.argv.slice(2));
  const inputFile = argv._[0];
  const outputFile = argv._[1];

  if (!inputFile) {
    console.error('Usage: tf test-matrix-export <input.json> <output.md> [--change-id <id>] [--batch-id <id>]');
    process.exit(2);
  }

  if (!outputFile) {
    console.error('Usage: tf test-matrix-export <input.json> <output.md>');
    process.exit(2);
  }

  try {
    const raw = readFileSync(resolve(inputFile), 'utf-8');
    const matrix = JSON.parse(raw);
    const md = convert(matrix, {
      changeId: argv.changeId || basename(inputFile, '.json'),
      batchId: argv.batchId,
      ledgerRef: argv.ledgerRef,
    });
    writeFileSync(resolve(outputFile), md, 'utf-8');
    console.log(`✅ test-matrix-export: ${inputFile} → ${outputFile}`);
  } catch (err) {
    console.error(`❌ test-matrix-export error: ${err.message}`);
    process.exit(1);
  }
}
