// tf validate <dir> — validate artifacts in a change directory
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { loadConfig } from './config-loader.mjs';
import { validateSpecPathLayout, relativeSpecPath } from './spec-paths.mjs';
import { readState } from './state-loader.mjs';
import { computeTestMatrixHash } from './hash.mjs';

async function getValidator() {
  const mod = await import('../../dist/index.js');
  return new mod.Validator(false);
}

function printReport(label, report) {
  console.log(`\n  📋 ${label}`);
  if (report.valid) {
    console.log(`     ✅ valid (${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info)`);
  } else {
    console.log(`     ❌ invalid (${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info)`);
  }
  for (const issue of report.issues) {
    const icon = issue.level === 'ERROR' ? '🔴' : issue.level === 'WARNING' ? '🟡' : '🔵';
    console.log(`     ${icon} [${issue.level}] ${issue.path}: ${issue.message}`);
  }
}

export async function run(args) {
  if (args.length < 1) {
    console.error('Usage: tf validate <change-dir>');
    process.exit(2);
  }

  const changeDir = args[0];
  if (!existsSync(changeDir) || !statSync(changeDir).isDirectory()) {
    console.error(`Error: "${changeDir}" is not a valid directory`);
    process.exit(2);
  }

  const config = loadConfig(process.cwd());
  const changeName = basename(changeDir);
  const validator = await getValidator();

  console.log(`🔍 Validating: ${changeDir}`);
  console.log(`   Change: ${changeName}`);

  let hasErrors = false;

  // Validate proposal.md
  const proposalPath = join(changeDir, 'proposal.md');
  if (existsSync(proposalPath)) {
    const content = readFileSync(proposalPath, 'utf-8');
    const report = validator.validateChangeContent(changeName, content);
    printReport('proposal.md', report);
    if (!report.valid) hasErrors = true;
  }

  // Validate specs/*/spec.md
  const specLayout = validateSpecPathLayout(changeDir, { requireSpecs: true });
  for (const failure of specLayout.failures) {
    printReport('specs/', {
      valid: false,
      issues: [{ level: 'ERROR', path: 'specs/', message: failure }],
      summary: { errors: 1, warnings: 0, info: 0 },
    });
    hasErrors = true;
  }

  for (const specFile of specLayout.specFiles) {
    const content = readFileSync(specFile, 'utf-8');
    const report = validator.validateDeltaSpec(content);
    const rel = relativeSpecPath(changeDir, specFile);
    printReport(rel, report);
    if (!report.valid) hasErrors = true;
  }

  // Basic structural validation for design.md and tasks.md (shared pattern)
  const STRUCTURAL_CHECKS = [
    { file: 'design.md', errorMsg: 'design.md is too short (< 50 chars) — provide architecture decisions, trade-offs, and data flow', warningMsg: 'design.md has no section headings — consider adding ## Architecture, ## Data Flow, ## Error Handling' },
    { file: 'tasks.md', errorMsg: 'tasks.md is too short (< 50 chars) — provide actionable, ordered implementation tasks', warningMsg: 'tasks.md has no section headings — consider adding ## File Structure and ## Tasks' },
  ];

  for (const { file, errorMsg, warningMsg } of STRUCTURAL_CHECKS) {
    const filePath = join(changeDir, file);
    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8').trim();
    const issues = [];
    if (content.length < 50) issues.push({ level: 'ERROR', path: file, message: errorMsg });
    if (!content.includes('##')) issues.push({ level: 'WARNING', path: file, message: warningMsg });
    const report = {
      valid: issues.filter(i => i.level === 'ERROR').length === 0,
      issues,
      summary: { errors: issues.filter(i => i.level === 'ERROR').length, warnings: issues.filter(i => i.level === 'WARNING').length, info: 0 },
    };
    printReport(file, report);
    if (!report.valid) hasErrors = true;
  }

  // v0.13 §52 B1：test-matrix 双向互锁（contract '## Test Matrix' 段 ↔ test-matrix.md）
  // 非存量（有 schema_version 打戳）且未显式 skip 的 change：
  //   契约声明段 → 矩阵文件必须存在非空；矩阵文件存在 → 契约必须声明段（孤儿矩阵）。
  // 两者皆无不算错（矩阵是否必产由 test-matrix-ready 门禁在转换时强制）。
  const contractForMatrixPath = join(changeDir, 'execution-contract.md');
  if (existsSync(contractForMatrixPath)) {
    const stateForMatrix = readState(changeDir);
    const legacyChange = stateForMatrix.schema_version == null;
    const matrixSkipped = stateForMatrix.test_matrix_skipped === 'true';
    const contractContent = readFileSync(contractForMatrixPath, 'utf-8');
    const declaresMatrix = contractContent.includes('## Test Matrix');
    const matrixPath = join(changeDir, 'test-matrix.md');
    const matrixExists = existsSync(matrixPath) && readFileSync(matrixPath, 'utf-8').trim().length > 0;
    const issues = [];
    if (!legacyChange && !matrixSkipped) {
      if (declaresMatrix && !matrixExists) {
        issues.push({ level: 'ERROR', path: 'test-matrix.md', message: 'contract declares ## Test Matrix but test-matrix.md is missing or empty — generate the matrix (contract-builder) or remove the section' });
      }
      if (!declaresMatrix && matrixExists) {
        issues.push({ level: 'ERROR', path: 'execution-contract.md', message: 'test-matrix.md exists but contract does not declare ## Test Matrix — add the section or remove the orphaned matrix' });
      }
    }
    if (declaresMatrix && matrixExists) {
      const computed = computeTestMatrixHash(changeDir);
      if (!stateForMatrix.test_matrix_hash) {
        issues.push({ level: 'WARNING', path: 'test-matrix.md', message: "test_matrix_hash not recorded — run 'tf state rebuild' to capture the matrix hash" });
      } else if (stateForMatrix.test_matrix_hash !== computed) {
        issues.push({ level: 'WARNING', path: 'test-matrix.md', message: "test_matrix_hash drifted from test-matrix.md — run 'tf state rebuild'" });
      }
    }
    if (issues.length > 0) {
      printReport('test-matrix cross-lock', {
        valid: issues.filter(i => i.level === 'ERROR').length === 0,
        issues,
        summary: { errors: issues.filter(i => i.level === 'ERROR').length, warnings: issues.filter(i => i.level === 'WARNING').length, info: 0 },
      });
      if (issues.some(i => i.level === 'ERROR')) hasErrors = true;
    }
  }

  console.log('');
  if (hasErrors) {
    console.log('❌ Validation failed with errors.');
    process.exit(1);
  } else {
    console.log('✅ All artifacts validated.');
    process.exit(0);
  }
}
