import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { computeArtifactsHash, computeContractHash } from './hash.mjs';
import { getOverlayPaths } from './sdd-overlay.mjs';
import { readState } from './state-loader.mjs';
import { detectWorkspaceRoot, findSubRepo } from './git-utils.mjs';

export const EXECUTION_MODES = ['inline', 'batch-inline', 'sdd'];

const WAVE_STRATEGIES = new Set(['parallel', 'serial']);
const REVIEW_STATUSES = new Set(['pass', 'fail']);

export function createPlan(changeDir, input) {
  const state = readState(changeDir);
  const plan = {
    mode: input?.mode,
    source: input?.source,
    rationale: input?.rationale,
    waves: input?.waves,
    artifacts_hash: computeArtifactsHash(changeDir),
    contract_hash: computeContractHash(changeDir),
    workflow: state.workflow,
    revision: input?.revision ?? state.revision ?? 1,
  };
  if (input?.recommendation !== undefined) plan.recommendation = input.recommendation;
  if (input?.recommendationReceipt !== undefined) plan.recommendation_receipt = input.recommendationReceipt;
  if (input?.selection !== undefined) plan.selection = input.selection;
  const failures = validateStructure(plan);
  if (failures.length > 0) throw new Error(`Invalid execution plan: ${failures.join('; ')}`);
  plan.hash = hashPlan(plan);
  return plan;
}

export function readPlan(changeDir) {
  const filePath = getOverlayPaths(changeDir).executionPlan;
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read execution plan: ${error.message}`);
  }
}

export function writePlan(changeDir, plan) {
  const failures = validateStructure(plan);
  const expectedHash = tryHashPlan(plan);
  if (expectedHash === null) failures.push('execution plan content cannot be hashed');
  else if (plan?.hash !== expectedHash) failures.push('execution plan content hash mismatch');
  if (failures.length > 0) throw new Error(`Invalid execution plan: ${failures.join('; ')}`);

  const paths = getOverlayPaths(changeDir);
  mkdirSync(paths.root, { recursive: true });
  const previousPlan = readPlan(changeDir);
  if (previousPlan && (previousPlan.revision !== plan.revision || previousPlan.hash !== plan.hash)) {
    // v0.35.0: Review receipts are RETAINED across revisions — readCurrentReview
    // validates plan_hash/plan_revision matching, so stale receipts are
    // automatically invalidated without losing evidence (base/head/report SHA).
    // This prevents legitimate artifact updates (e.g., design.md 横展结论) from
    // causing cascading receipt loss. See workflow-feedback 20260805.
    //
    // Recommendation receipt is revision-scoped and must be cleaned:
    const recommendationFile = paths.executionRecommendation;
    if (recommendationFile && existsSync(recommendationFile)) {
      rmSync(recommendationFile, { force: true });
    }
  }
  atomicWrite(paths.executionPlan, `${JSON.stringify(plan, null, 2)}\n`);
  writeExecutionPlanSummary(changeDir, plan);
  return readPlan(changeDir);
}

export function validatePlan(changeDir, plan) {
  const failures = validateStructure(plan);
  const actualHash = tryHashPlan(plan);
  if (actualHash === null) failures.push('execution plan content cannot be hashed');
  else if (plan?.hash !== actualHash) failures.push('execution plan content hash mismatch');

  const state = readState(changeDir);
  if (state.execution_plan_hash !== plan?.hash) {
    failures.push('execution plan summary does not match state');
  }
  if (state.execution_mode !== plan?.mode) {
    failures.push('execution plan mode does not match state');
  }
  if (plan?.artifacts_hash !== computeArtifactsHash(changeDir)) {
    const actual = computeArtifactsHash(changeDir);
    const planPrefix = plan?.artifacts_hash?.slice(0, 12) ?? 'null';
    const actualPrefix = actual?.slice(0, 12) ?? 'null';
    failures.push(`execution plan is stale: artifacts hash mismatch (plan: ${planPrefix}…, current: ${actualPrefix}…)`);
  }
  if (plan?.contract_hash !== computeContractHash(changeDir)) {
    const actual = computeContractHash(changeDir);
    const planPrefix = plan?.contract_hash?.slice(0, 12) ?? 'null';
    const actualPrefix = actual?.slice(0, 12) ?? 'null';
    failures.push(`execution plan is stale: contract hash mismatch (plan: ${planPrefix}…, current: ${actualPrefix}…)`);
  }
  if (plan?.workflow !== state.workflow) {
    failures.push('execution plan workflow does not match state');
  }
  if (state.execution_plan_revision !== plan?.revision) {
    failures.push('execution plan revision does not match state');
  }
  if (state.revision != null && plan?.revision !== state.revision) {
    failures.push('execution plan revision does not match state');
  }
  if (plan?.workflow !== 'tweak') {
    if (plan?.recommendation === undefined) failures.push('execution plan recommendation is required for full/hotfix');
    if (plan?.recommendation_receipt === undefined) failures.push('execution plan recommendation receipt is required for full/hotfix');
    if (plan?.selection === undefined) failures.push('execution plan selection is required for full/hotfix');
  }
  if (plan?.recommendation_receipt !== undefined) {
    if (plan.recommendation_receipt.artifacts_hash !== plan.artifacts_hash) failures.push('execution plan recommendation receipt artifacts hash does not match plan');
    if (plan.recommendation_receipt.contract_hash !== plan.contract_hash) failures.push('execution plan recommendation receipt contract hash does not match plan');
    if (plan.recommendation_receipt.workflow !== plan.workflow) failures.push('execution plan recommendation receipt workflow does not match plan');
    if (stableJson(plan.recommendation_receipt.waves) !== stableJson(plan.waves)) failures.push('execution plan recommendation receipt waves do not match plan');
    if (stableJson(plan.recommendation_receipt.recommendation) !== stableJson(plan.recommendation)) failures.push('execution plan recommendation receipt does not match plan recommendation');
    const expectedRecommendationPlanRevision = plan.source === 'user-confirmed-revision'
      ? plan.revision - 1
      : null;
    if (plan.recommendation_receipt.execution_plan_revision_at_recommendation !== expectedRecommendationPlanRevision) {
      failures.push('execution plan recommendation receipt does not match the immediately prior plan revision');
    }
  }
  if (plan?.selection !== undefined && plan?.recommendation?.recommendation?.mode) {
    const followedRecommendation = plan.mode === plan.recommendation.recommendation.mode;
    if (plan.selection.followed_recommendation !== followedRecommendation) failures.push('execution plan selection does not match recommended mode');
    if (plan.selection.acknowledged_non_recommendation !== !followedRecommendation) failures.push('execution plan selection acknowledgement does not match recommended mode');
  }
  return { valid: failures.length === 0, failures, plan };
}

export function recordReview(changeDir, waveId, receipt, repoPath) {
  const plan = readPlan(changeDir);
  const validation = validatePlan(changeDir, plan);
  if (!validation.valid) throw new Error(`Cannot record a review for an invalid execution plan: ${validation.failures.join('; ')}`);
  const wave = Array.isArray(plan?.waves) && plan.waves.find(candidate => candidate?.id === waveId);
  if (!wave) throw new Error(`Review receipt references unknown wave '${waveId}'`);
  const blockedBy = blockedDependencies(changeDir, plan, wave);
  if (blockedBy.length > 0) {
    throw new Error(`Wave '${waveId}' cannot be reviewed before dependencies have passing receipts: ${blockedBy.join(', ')}`);
  }
  if (!REVIEW_STATUSES.has(receipt?.status)) {
    throw new Error("Review receipt status must be 'pass' or 'fail'");
  }
  for (const field of ['base', 'head']) requireText(receipt?.[field], `receipt.${field}`);
  const report = validateReviewReportEvidence(changeDir, receipt?.report);
  const { base, head, subRepoPath } = validateReviewRange(changeDir, receipt.base, receipt.head, repoPath);
  // v0.13 §51.2：测试统计为可选证据字段（提供时必须为非负整数）。
  // 硬门禁在入口（test-matrix-ready）与 closing（tests-passing），此处只沉淀证据，
  // 避免单 wave 零测试造成 BUG-A 式过严死锁（DDL/脚手架类 wave 可能合理无测试）。
  let tests;
  if (receipt?.tests !== undefined) {
    if (!isObject(receipt.tests)) throw new Error('receipt.tests must be an object');
    for (const key of ['total', 'passed', 'failed']) {
      if (!Number.isInteger(receipt.tests[key]) || receipt.tests[key] < 0) {
        throw new Error(`receipt.tests.${key} must be a non-negative integer`);
      }
    }
    tests = { total: receipt.tests.total, passed: receipt.tests.passed, failed: receipt.tests.failed };
  }

  const savedReceipt = {
    status: receipt.status,
    base,
    head,
    report,
    ...(tests ? { tests } : {}),
    // Persist repo path when SHA was resolved in a sub-repository, so
    // readCurrentReview can re-validate without re-scanning.
    ...(subRepoPath ? { repo: relative(changeDir, subRepoPath) } : {}),
    plan_hash: plan.hash,
    plan_revision: plan.revision,
    recorded_at: new Date().toISOString(),
  };
  const paths = getOverlayPaths(changeDir);
  mkdirSync(paths.reviews, { recursive: true });
  atomicWrite(join(paths.reviews, `${safeFileName(waveId)}.json`), `${JSON.stringify(savedReceipt, null, 2)}\n`);
  return savedReceipt;
}

/**
 * Returns the current plan's receipt for one wave. Receipts from a previous
 * revision/hash are never evidence for the current plan.
 */
export function readCurrentReview(changeDir, waveId, plan = readPlan(changeDir)) {
  if (!plan) return null;
  const filePath = join(getOverlayPaths(changeDir).reviews, `${safeFileName(waveId)}.json`);
  if (!existsSync(filePath)) return null;
  try {
    const receipt = JSON.parse(readFileSync(filePath, 'utf8'));
    if (receipt?.plan_hash !== plan.hash || receipt?.plan_revision !== plan.revision) return null;
    // When the receipt records a repo path (sub-repo scenario), use it for
    // SHA re-validation.  Otherwise fall back to the default main-repo path.
    const repoPath = receipt?.repo ? resolve(changeDir, receipt.repo) : undefined;
    const range = validateReviewRange(changeDir, receipt?.base, receipt?.head, repoPath);
    if (receipt.base !== range.base || receipt.head !== range.head) return null;
    // A passing receipt is current evidence only while its referenced report
    // remains safe and readable. Recheck it here because reports can be
    // deleted or replaced after the receipt was recorded.
    if (receipt?.status === 'pass') validateReviewReportEvidence(changeDir, receipt.report);
    return receipt;
  } catch {
    return null;
  }
}

/**
 * Machine-readable execution status used by `tf execution show`. A wave is
 * eligible when it has no current receipt, or its current receipt failed and
 * is therefore retryable, and all declared dependencies have passing receipts.
 */
export function describeWaves(changeDir, plan = readPlan(changeDir)) {
  if (!plan || !Array.isArray(plan.waves)) return [];
  return plan.waves.map(wave => {
    const receipt = readCurrentReview(changeDir, wave.id, plan);
    const blockers = blockedDependencies(changeDir, plan, wave);
    const retryable = receipt?.status === 'fail';
    return {
      id: wave.id,
      strategy: wave.strategy,
      tasks: wave.tasks,
      depends_on: wave.depends_on,
      eligible: (receipt === null || retryable) && blockers.length === 0,
      retryable,
      receipt,
      blockers,
    };
  });
}

function validateReviewReportEvidence(changeDir, report) {
  requireText(report, 'receipt.report');
  if (/[\p{Cc}\p{Zl}\p{Zp}]/u.test(report)) {
    throw new Error('Review report evidence path is unsafe');
  }

  const { changeRoot, reviewsDir } = getPhysicalReviewsDirectory(changeDir);
  const reportPath = isAbsolute(report) ? resolve(report) : resolve(changeRoot, report);

  let metadata;
  try {
    metadata = lstatSync(reportPath);
  } catch (error) {
    throw new Error(`Review report evidence cannot be read: ${error.message}`);
  }
  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    throw new Error('Review report evidence must be a regular file');
  }
  if (metadata.size === 0) {
    throw new Error('Review report evidence must be non-empty');
  }
  const realReportPath = realpathSync(reportPath);
  const realOverlayRelativePath = relative(reviewsDir, realReportPath);
  if (realOverlayRelativePath === '' || realOverlayRelativePath === '..' || realOverlayRelativePath.startsWith(`..${sep}`) || isAbsolute(realOverlayRelativePath)) {
    throw new Error('Review report evidence must resolve inside the change review overlay');
  }
  return relative(changeRoot, realReportPath);
}

function getPhysicalReviewsDirectory(changeDir) {
  let changeRoot;
  try {
    changeRoot = realpathSync(changeDir);
  } catch (error) {
    throw new Error(`Review report evidence cannot resolve the change directory: ${error.message}`);
  }

  let directory = changeRoot;
  for (const component of ['.superpowers', 'sdd', 'reviews']) {
    directory = join(directory, component);
    let metadata;
    try {
      metadata = lstatSync(directory);
    } catch (error) {
      throw new Error(`Review report evidence cannot read the ${component} overlay directory: ${error.message}`);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error('Review report evidence requires physical .superpowers/sdd/reviews overlay directories');
    }
  }
  return { changeRoot, reviewsDir: directory };
}

function validateReviewRange(changeDir, base, head, repoPath) {
  const gitRoot = resolveGitRoot(changeDir, repoPath);

  let resolvedBase, resolvedHead, subRepoPath;
  try {
    resolvedBase = resolveGitCommit(gitRoot, base, 'base');
    resolvedHead = resolveGitCommit(gitRoot, head, 'head');
  } catch (primaryError) {
    // Sub-repo fallback: when SHA is not in the main repo, scan workspace
    // children for a sub-repository that contains it (e.g. bff/, ui/).
    // Only attempt when --repo was not explicitly provided.
    if (repoPath) throw primaryError;

    const workspaceRoot = detectWorkspaceRoot(changeDir);
    if (!workspaceRoot) throw primaryError;

    const subRoot = findSubRepo(workspaceRoot, head);
    if (!subRoot) throw primaryError;

    resolvedBase = resolveGitCommit(subRoot, base, 'base');
    resolvedHead = resolveGitCommit(subRoot, head, 'head');
    subRepoPath = subRoot;
  }

  // Track when SHA was resolved outside the changeDir's own repo.
  // This happens either through automatic fallback (subRepoPath set above)
  // or through explicit --repo pointing to a different repository.
  if (!subRepoPath && repoPath) {
    const defaultRoot = resolveGitRoot(changeDir);
    if (gitRoot !== defaultRoot) subRepoPath = gitRoot;
  }

  const effectiveRoot = subRepoPath || gitRoot;
  const result = validateResolvedRange(effectiveRoot, resolvedBase, resolvedHead);
  return { ...result, subRepoPath };
}

/**
 * Resolve the git root for SHA verification. Honors an explicit --repo path;
 * otherwise uses the changeDir's own git repository.
 */
function resolveGitRoot(changeDir, repoPath) {
  if (repoPath) {
    const absRepo = isAbsolute(repoPath) ? repoPath : resolve(changeDir, repoPath);
    try {
      return execFileSync('git', ['-C', absRepo, 'rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
    } catch {
      throw new Error(`--repo path '${repoPath}' is not inside a Git work tree`);
    }
  }
  try {
    return execFileSync('git', ['-C', changeDir, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new Error('Review receipts require the change directory to be inside a Git work tree');
  }
}

/**
 * Validate a resolved SHA range: base must differ from head, and base must
 * be an ancestor of head. Shared by both primary and sub-repo paths.
 */
function validateResolvedRange(gitRoot, resolvedBase, resolvedHead) {
  // v0.13 §51.1：禁止空 diff review（base === head）。
  // C1-domain-policy 现场曾出现 6 个 receipt 全部 base==head==初始 commit，
  // 即 review 对空 diff 进行。本校验同时强制"每 wave 落 commit"的纪律。
  if (resolvedBase === resolvedHead) {
    throw new Error(
      'Review receipt base must differ from head — head must contain new commits over base; '
      + 'commit the wave changes before recording a review'
    );
  }
  try {
    execFileSync('git', ['-C', gitRoot, 'merge-base', '--is-ancestor', resolvedBase, resolvedHead], {
      stdio: 'ignore',
    });
  } catch {
    throw new Error('Review receipt base must be an ancestor of head');
  }
  return { base: resolvedBase, head: resolvedHead };
}

function resolveGitCommit(gitRoot, revision, field) {
  try {
    return execFileSync('git', ['-C', gitRoot, 'rev-parse', '--verify', `${revision}^{commit}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new Error(`Review receipt ${field} must name an existing Git commit`);
  }
}

function blockedDependencies(changeDir, plan, wave) {
  if (!Array.isArray(wave?.depends_on)) return [];
  return wave.depends_on.filter(dependency => readCurrentReview(changeDir, dependency, plan)?.status !== 'pass');
}

function validateStructure(plan) {
  const failures = [];
  if (!isObject(plan)) return ['execution plan must be an object'];
  if (!EXECUTION_MODES.includes(plan.mode)) failures.push('execution plan mode is invalid');
  if (typeof plan.source !== 'string' || !plan.source.trim()) failures.push('execution plan source is required');
  if (!isNonEmptyText(plan.rationale)) failures.push('execution plan rationale is required');
  if (plan.recommendation !== undefined) {
    if (!isObject(plan.recommendation)) {
      failures.push('execution plan recommendation must be an object');
    } else {
      if (!isObject(plan.recommendation.recommendation) || !EXECUTION_MODES.includes(plan.recommendation.recommendation.mode)) {
        failures.push('execution plan recommendation mode is invalid');
      }
      if (!Array.isArray(plan.recommendation.recommendation?.reasons) || plan.recommendation.recommendation.reasons.some(reason => !isNonEmptyText(reason))) {
        failures.push('execution plan recommendation reasons must be non-empty strings');
      }
      if (!isObject(plan.recommendation.facts)) failures.push('execution plan recommendation facts must be an object');
      if (!Array.isArray(plan.recommendation.available_modes) || plan.recommendation.available_modes.some(mode => !EXECUTION_MODES.includes(mode))) {
        failures.push('execution plan recommendation available_modes are invalid');
      }
    }
  }
  if (plan.recommendation_receipt !== undefined) {
    if (!isObject(plan.recommendation_receipt)) {
      failures.push('execution plan recommendation receipt must be an object');
    } else {
      if (!isObject(plan.recommendation_receipt.recommendation)) failures.push('execution plan recommendation receipt payload is required');
      if (!Array.isArray(plan.recommendation_receipt.waves)) failures.push('execution plan recommendation receipt waves must be an array');
      if (!isNullableHash(plan.recommendation_receipt.artifacts_hash)) failures.push('execution plan recommendation receipt artifacts hash is invalid');
      if (!isNullableHash(plan.recommendation_receipt.contract_hash)) failures.push('execution plan recommendation receipt contract hash is invalid');
      if (!isNonEmptyText(plan.recommendation_receipt.workflow)) failures.push('execution plan recommendation receipt workflow is invalid');
      if (plan.recommendation_receipt.execution_plan_revision_at_recommendation !== null
        && (!Number.isInteger(plan.recommendation_receipt.execution_plan_revision_at_recommendation)
          || plan.recommendation_receipt.execution_plan_revision_at_recommendation < 1)) {
        failures.push('execution plan recommendation receipt plan revision is invalid');
      }
      if (!isNonEmptyText(plan.recommendation_receipt.created_at)) failures.push('execution plan recommendation receipt timestamp is invalid');
      if (typeof plan.recommendation_receipt.hash !== 'string' || !plan.recommendation_receipt.hash.startsWith('sha256:')) failures.push('execution plan recommendation receipt hash is invalid');
    }
  }
  if (plan.selection !== undefined) {
    if (!isObject(plan.selection)) {
      failures.push('execution plan selection must be an object');
    } else {
      if (plan.selection.confirmed !== true) failures.push('execution plan selection must be confirmed');
      if (typeof plan.selection.followed_recommendation !== 'boolean') failures.push('execution plan selection must record recommendation alignment');
      if (typeof plan.selection.acknowledged_non_recommendation !== 'boolean') failures.push('execution plan selection must record non-recommendation acknowledgement');
      if (plan.selection.followed_recommendation === plan.selection.acknowledged_non_recommendation) {
        failures.push('execution plan selection acknowledgement conflicts with recommendation alignment');
      }
    }
  }
  if (!Array.isArray(plan.waves)) {
    failures.push('execution plan waves must be an array');
    return failures;
  }

  const ids = new Set();
  const taskOwners = new Map();
  for (const [index, wave] of plan.waves.entries()) {
    const label = `wave ${index + 1}`;
    if (!isObject(wave)) {
      failures.push(`${label} must be an object`);
      continue;
    }
    if (!isNonEmptyText(wave.id)) failures.push(`${label} id is required`);
    else if (ids.has(wave.id)) failures.push(`duplicate wave id '${wave.id}'`);
    else ids.add(wave.id);
    if (!WAVE_STRATEGIES.has(wave.strategy)) failures.push(`${label} strategy is invalid`);
    if (!Array.isArray(wave.tasks) || wave.tasks.length === 0) {
      failures.push(`${label} must include at least one task`);
    } else {
      if (wave.tasks.some(task => !isNonEmptyText(task))) failures.push(`${label} tasks must be non-empty strings`);
      for (const task of wave.tasks.filter(isNonEmptyText)) {
        const priorWaveId = taskOwners.get(task);
        if (priorWaveId !== undefined) {
          failures.push(`duplicate task id '${task}' appears in waves '${priorWaveId}' and '${wave.id}'`);
        } else {
          taskOwners.set(task, wave.id);
        }
      }
      if (wave.strategy === 'parallel' && new Set(wave.tasks).size !== wave.tasks.length) {
        failures.push(`parallel wave '${wave.id}' contains duplicate tasks`);
      }
    }
    if (!Array.isArray(wave.depends_on)) failures.push(`${label} depends_on must be an array`);
    else if (wave.depends_on.some(id => !isNonEmptyText(id))) failures.push(`${label} dependencies must be non-empty strings`);
  }

  for (const wave of plan.waves.filter(isObject)) {
    if (!Array.isArray(wave.depends_on) || !isNonEmptyText(wave.id)) continue;
    for (const dependency of wave.depends_on) {
      if (dependency === wave.id) failures.push(`wave '${wave.id}' cannot depend on itself`);
      else if (isNonEmptyText(dependency) && !ids.has(dependency)) {
        failures.push(`wave '${wave.id}' depends on unknown wave '${dependency}'`);
      }
    }
  }
  const canCheckCycles = plan.waves.every(wave => isObject(wave)
    && isNonEmptyText(wave.id) && Array.isArray(wave.depends_on));
  if (canCheckCycles && !failures.some(failure => /duplicate wave id|unknown wave|cannot depend on itself/.test(failure))
    && hasDependencyCycle(plan.waves)) {
    failures.push('execution plan waves contain a dependency cycle');
  }
  return failures;
}

function hasDependencyCycle(waves) {
  const dependencies = new Map(waves.map(wave => [wave.id, wave.depends_on]));
  const visiting = new Set();
  const visited = new Set();
  const visit = id => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of dependencies.get(id) || []) {
      if (visit(dependency)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return [...dependencies.keys()].some(visit);
}

function hashPlan(plan) {
  const { hash, ...content } = plan;
  return `sha256:${createHash('sha256').update(stableJson(content)).digest('hex')}`;
}

/**
 * v0.35.0: Refresh plan's artifacts_hash and contract_hash without bumping revision.
 * Returns the updated plan (already persisted via writePlan), or null if no change needed.
 */
export function refreshPlanHash(changeDir) {
  const plan = readPlan(changeDir);
  if (!plan) return null;
  const newArtifactsHash = computeArtifactsHash(changeDir);
  const newContractHash = computeContractHash(changeDir);
  if (plan.artifacts_hash === newArtifactsHash && plan.contract_hash === newContractHash) {
    return null; // no change needed
  }
  plan.artifacts_hash = newArtifactsHash;
  plan.contract_hash = newContractHash;
  plan.hash = hashPlan(plan);
  return writePlan(changeDir, plan);
}

function tryHashPlan(plan) {
  if (!isObject(plan)) return null;
  try {
    return hashPlan(plan);
  } catch {
    return null;
  }
}

function stableJson(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (seen.has(value)) throw new Error('circular plan data');
  seen.add(value);
  if (Array.isArray(value)) {
    const result = `[${value.map(item => stableJson(item, seen)).join(',')}]`;
    seen.delete(value);
    return result;
  }
  const result = `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key], seen)}`).join(',')}}`;
  seen.delete(value);
  return result;
}

function writeExecutionPlanSummary(changeDir, plan) {
  const statePath = join(changeDir, '.team-flow.yaml');
  const state = readState(changeDir);
  const original = existsSync(statePath)
    ? readFileSync(statePath, 'utf8')
    : `state: ${state.state}\nworkflow: ${state.workflow}\n`;
  const content = [
    ['revision', plan.revision],
    ['execution_mode', plan.mode],
    ['execution_plan_hash', plan.hash],
    ['execution_plan_revision', plan.revision],
  ].reduce((current, [field, value]) => setStateField(current, field, value), original);
  atomicWrite(statePath, content);
}

function setStateField(content, field, value) {
  const line = `${field}: ${value}`;
  const expression = new RegExp(`^${field}:\\s*.*$`, 'm');
  return expression.test(content)
    ? content.replace(expression, line)
    : `${content.replace(/\n*$/, '\n')}\n${line}\n`;
}

function atomicWrite(targetPath, content) {
  const tempPath = `${targetPath}.tmp-${process.pid}-${randomUUID()}`;
  writeFileSync(tempPath, content, 'utf8');
  renameSync(tempPath, targetPath);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNullableHash(value) {
  return value === null || (typeof value === 'string' && value.startsWith('sha256:'));
}

function requireText(value, field) {
  if (!isNonEmptyText(value)) throw new Error(`${field} is required`);
}

function safeFileName(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}
