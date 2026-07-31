// scripts/guard/checks/test-matrix-complete.mjs — verify test matrix exists and is consistent
import fs from 'node:fs';
import path from 'node:path';
import { readState } from '../../lib/state-loader.mjs';
import { computeTestMatrixHash } from '../../lib/hash.mjs';

/**
 * Check that test-matrix.md exists and its hash is consistent with state.
 *
 * Exemption paths (v0.12 §45.3):
 * 1. Legacy: execution-contract.md has no "## Test Matrix" section → PASS
 * 2. Explicit skip: test_matrix_skipped === 'true' → PASS
 * 3. test-matrix.md exists and hash matches → PASS
 * 4. test-matrix.md missing or hash mismatch → FAIL
 *
 * Returns { pass, failures[], reason? }.
 */
export function checkTestMatrixComplete(changeDir) {
  const state = readState(changeDir);

  // Exemption 1: explicit skip
  if (state.test_matrix_skipped === 'true') {
    return { pass: true, failures: [], reason: 'explicitly skipped via test_matrix_skipped' };
  }

  // Exemption 2: legacy contract without Test Matrix section
  const contractPath = path.join(changeDir, 'execution-contract.md');
  if (fs.existsSync(contractPath)) {
    const contract = fs.readFileSync(contractPath, 'utf-8');
    if (!contract.includes('## Test Matrix')) {
      return { pass: true, failures: [], reason: 'legacy contract — no test matrix section' };
    }
  } else {
    // No contract at all — nothing to check
    return { pass: true, failures: [], reason: 'no execution contract — skipping test matrix check' };
  }

  // Check test-matrix.md exists and is non-empty
  const matrixPath = path.join(changeDir, 'test-matrix.md');
  if (!fs.existsSync(matrixPath)) {
    return {
      pass: false,
      failures: ['test-matrix.md is missing — contract declares ## Test Matrix but no matrix file found'],
    };
  }

  const content = fs.readFileSync(matrixPath, 'utf-8');
  if (content.trim().length === 0) {
    return {
      pass: false,
      failures: ['test-matrix.md is empty — must contain at least a Summary section and Cases table'],
    };
  }

  // Hash consistency check
  const computed = computeTestMatrixHash(changeDir);
  if (state.test_matrix_hash && state.test_matrix_hash !== computed) {
    return {
      pass: false,
      failures: [
        `test-matrix.md has been modified since last hash — stored: ${state.test_matrix_hash}, current: ${computed}. Run 'tf state rebuild' to update.`,
      ],
    };
  }

  return { pass: true, failures: [] };
}
