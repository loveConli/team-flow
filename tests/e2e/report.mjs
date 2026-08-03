// tests/e2e/report.mjs
// team-flow e2e runner：结构化报告（JSON + markdown 汇总 + 覆盖台账核对 + 退出码聚合）。
// Tier1 用 node:test 内建报告即可；本模块主要服务 Tier2 的成本/耗时聚合与矩阵覆盖核对。
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** 创建结果收集器。record(caseId, {tier, pass, duration_ms, cost_usd, attempts, note})。 */
export function createCollector() {
  const results = [];
  return {
    results,
    record(caseId, info = {}) {
      results.push({
        case_id: caseId,
        tier: info.tier || 'deterministic',
        pass: info.pass === true,
        duration_ms: info.duration_ms ?? 0,
        cost_usd: info.cost_usd ?? 0,
        attempts: info.attempts ?? 1,
        note: info.note || '',
      });
    },
  };
}

/** 聚合统计：总数/通过/失败/分层/总成本/总耗时。 */
export function summarize(collector) {
  const rs = collector.results;
  const byTier = {};
  let totalCost = 0;
  let totalDuration = 0;
  for (const r of rs) {
    byTier[r.tier] ??= { total: 0, pass: 0, fail: 0 };
    byTier[r.tier].total += 1;
    byTier[r.tier][r.pass ? 'pass' : 'fail'] += 1;
    totalCost += r.cost_usd;
    totalDuration += r.duration_ms;
  }
  return {
    total: rs.length,
    pass: rs.filter((r) => r.pass).length,
    fail: rs.filter((r) => !r.pass).length,
    byTier,
    total_cost_usd: Number(totalCost.toFixed(4)),
    total_duration_ms: totalDuration,
    allPass: rs.every((r) => r.pass),
  };
}

/**
 * 覆盖台账核对：检查候选行为是否都被某用例覆盖。
 * candidates: [{candidate, decision}]（来自 test-matrix.md ledger）；coveredCaseIds: 已实现的 case_id 集合。
 * 返回未覆盖（decision=covered 但无对应用例）的候选清单。
 */
export function coverageGaps(candidates, coveredCaseIds) {
  return candidates
    .filter((c) => c.decision === 'covered')
    .filter((c) => !(c.case_ids || []).some((id) => coveredCaseIds.has(id)))
    .map((c) => c.candidate);
}

/** 写出 JSON + markdown 汇总报告。返回 summary（含 allPass，供 process.exitCode）。 */
export function writeReport(collector, outPath) {
  const summary = summarize(collector);
  const lines = [];
  lines.push('# E2E Test Report');
  lines.push('');
  lines.push(`- Total: ${summary.total} | Pass: ${summary.pass} | Fail: ${summary.fail} | ${summary.allPass ? '✅ ALL PASS' : '❌ HAS FAILURES'}`);
  lines.push(`- Cost: $${summary.total_cost_usd} | Duration: ${(summary.total_duration_ms / 1000).toFixed(1)}s`);
  for (const [tier, s] of Object.entries(summary.byTier)) {
    lines.push(`- [${tier}] ${s.pass}/${s.total} pass`);
  }
  lines.push('');
  lines.push('| case_id | tier | result | attempts | duration_ms | cost_usd | note |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const r of collector.results) {
    lines.push(`| ${r.case_id} | ${r.tier} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.attempts} | ${r.duration_ms} | ${r.cost_usd} | ${r.note} |`);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n') + '\n');
  writeFileSync(outPath.replace(/\.md$/, '.json'), JSON.stringify({ summary, results: collector.results }, null, 2));
  return summary;
}
