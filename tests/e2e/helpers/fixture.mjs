// tests/e2e/helpers/fixture.mjs
// team-flow e2e runner：合成 fixture 生成器（Tier1 确定性用例的夹具，与活工作区解耦）。
// 产物内容按 schema-valid 校验要求构造（proposal ## Why≥50字符+## What Changes；
// specs delta 头 + ### Requirement 含 SHALL/MUST + #### Scenario 含 WHEN/THEN）。
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { stateInit, stateSet } from './oracle.mjs';

// ── schema-valid 合规产物模板 ──────────────────────────────────────────────

export function proposalContent() {
  return [
    '## Why',
    '',
    'This change adds the policy management capability to the VRM system, requiring new',
    'aggregates and API endpoints for domain policy administration and cascading selection.',
    '',
    '## What Changes',
    '',
    '- Add DomainPolicy aggregate root with detail entries',
    '- Add policy CRUD API endpoints (Command/Query)',
    '- Add t_domain_policy and t_domain_policy_detail tables',
    '',
    '## Scope',
    '',
    '### In Scope',
    '- Domain policy creation, query, update, deletion',
    '',
    '### Out of Scope',
    '- Reporting and analytics',
  ].join('\n');
}

export function specContent(capability = 'policy-main') {
  return [
    '## ADDED Requirements',
    '',
    `### Requirement: ${capability} creation`,
    '',
    'The system SHALL allow creating a domain policy with a unique policy number and MUST',
    'reject duplicate policy numbers.',
    '',
    '#### Scenario: Create policy successfully',
    '',
    'WHEN the user submits a valid policy creation request',
    'THEN the system persists the policy and returns the generated policy number',
    '',
    '#### Scenario: Reject duplicate policy number',
    '',
    'WHEN the user submits a policy creation request with an existing policy number',
    'THEN the system rejects the request with a duplicate error',
  ].join('\n');
}

export function designContent() {
  return [
    '## Context',
    '',
    'The current VRM system lacks policy management. This design adds the DomainPolicy',
    'aggregate following the existing DDD layered patterns (web/application/domain/infrastructure).',
    '',
    '## Goals',
    '',
    '- Add policy management capability consistent with existing aggregates',
    '',
    '## Decisions',
    '',
    '- Use a dedicated DomainPolicy aggregate root; persist via a repository abstraction.',
    '',
    '## Risks And Trade-Offs',
    '',
    '- Cascading selection depends on upstream published policy numbers.',
  ].join('\n');
}

export function tasksContent({ allChecked = true } = {}) {
  const mark = allChecked ? '[x]' : '[ ]';
  return [
    '## Batch 1: Foundation',
    '',
    `- ${mark} Task 1.1: Create DomainPolicy entity and value objects`,
    `- ${mark} Task 1.2: Create DomainPolicyRepository interface and implementation`,
    '',
    '## Batch 2: API',
    '',
    `- ${mark} Task 2.1: Add DomainPolicyController with CRUD endpoints`,
  ].join('\n');
}

// ── 产物落盘 ────────────────────────────────────────────────────────────────

/** 写入核心 4 件规划产物（proposal/specs/design/tasks）。 */
export function writePlanningArtifacts(dir, { capability = 'policy-main', allChecked = true, specs = true } = {}) {
  writeFileSync(join(dir, 'proposal.md'), proposalContent());
  if (specs) {
    mkdirSync(join(dir, 'specs', capability), { recursive: true });
    writeFileSync(join(dir, 'specs', capability, 'spec.md'), specContent(capability));
  }
  writeFileSync(join(dir, 'design.md'), designContent());
  writeFileSync(join(dir, 'tasks.md'), tasksContent({ allChecked }));
}

/** 写入架构三件套（arch_design_decision=required 时 arch-design 维度需要）。 */
export function writeArchitectureArtifacts(dir) {
  mkdirSync(join(dir, 'architecture'), { recursive: true });
  writeFileSync(join(dir, 'architecture', 'architecture.md'), '# Architecture\n\nDomainPolicy aggregate, policy-management bounded context, CQRS write/read model.\n');
  writeFileSync(join(dir, 'architecture', 'database.md'), '# Database\n\nt_domain_policy + t_domain_policy_detail.\n');
  writeFileSync(join(dir, 'architecture', 'api.md'), '---\napi_contract_manager: swagger\n---\n# API Routing Table\n\nCommand: createPolicy; Query: getPolicy.\n');
}

/** 写入执行契约（contract-fresh/current 维度需要）。 */
export function writeContract(dir) {
  writeFileSync(join(dir, 'execution-contract.md'), [
    '# Execution Contract',
    '',
    '## Intent Lock',
    'Add domain policy management.',
    '',
    '## Approved Behavior',
    '- Policy CRUD per specs.',
    '',
    '## Batches',
    '- Batch 1: Foundation; Batch 2: API.',
  ].join('\n'));
}

// ── 状态文件 ────────────────────────────────────────────────────────────────

/**
 * 在已写产物的 change 目录上初始化状态（tf state init 计算正确 hash），
 * 再把 state 字段补丁为目标值（state 不可经 CLI set，直接改 yaml 行），
 * 并经 tf state set 写入 dp/可设字段。
 */
export function initChangeState(dir, { state = 'exploring', workflow, set = {} } = {}) {
  const init = stateInit(dir);
  if (init.exitCode !== 0) throw new Error(`state init failed for ${dir}: ${init.stderr}`);
  patchStateField(dir, 'state', state);
  if (workflow) patchStateField(dir, 'workflow', workflow);
  for (const [field, value] of Object.entries(set)) {
    const r = stateSet(dir, field, value);
    if (r.exitCode !== 0) throw new Error(`state set ${field} failed: ${r.stderr}`);
  }
}

/** 直接替换 .team-flow.yaml 中某个顶层字段的值（用于 state 等不可 CLI set 的字段）。 */
export function patchStateField(dir, field, value) {
  const file = join(dir, '.team-flow.yaml');
  const raw = readFileSync(file, 'utf-8');
  const re = new RegExp(`^${field}:.*$`, 'm');
  const next = re.test(raw) ? raw.replace(re, `${field}: ${value}`) : `${raw}\n${field}: ${value}`;
  writeFileSync(file, next);
}

/**
 * 删除 .team-flow.yaml 中某个顶层字段行（v0.13 测试专用：移除 schema_version
 * 把夹具降级为 legacy change，验证存量豁免路径）。
 */
export function dropStateField(dir, field) {
  const file = join(dir, '.team-flow.yaml');
  const raw = readFileSync(file, 'utf-8');
  const next = raw.split('\n').filter(line => !new RegExp(`^${field}:`).test(line)).join('\n');
  writeFileSync(file, next);
}

// ── change / workspace 组装 ─────────────────────────────────────────────────

/** 新建一个临时 change 目录（含产物 + 状态），返回 {root, changeDir, name}。 */
export function makeChange({
  name = 'C-test',
  state = 'exploring',
  workflow = 'full',
  artifacts = true,
  architecture = false,
  archDecision = null,
  contract = false,
  allChecked = true,
  set = {},
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'tf-e2e-change-'));
  const changeDir = join(root, 'changes', name);
  mkdirSync(changeDir, { recursive: true });
  if (artifacts) writePlanningArtifacts(changeDir, { allChecked });
  if (architecture) writeArchitectureArtifacts(changeDir);
  if (contract) writeContract(changeDir);
  const fields = { ...set };
  if (archDecision) fields.arch_design_decision = archDecision;
  initChangeState(changeDir, { state, workflow, set: fields });
  return { root, changeDir, name };
}

function git(dir, ...args) {
  execSync(`git -c user.email=t@t -c user.name=test ${args.join(' ')}`, { cwd: dir, stdio: 'pipe', timeout: 15000 });
}

/**
 * 构造多仓库工作区（Case A）：空壳根 git 仓库 + changes/<name> + N 个代码仓库（各 git init+commit，
 * 默认分支即保护分支 main/master）。用于 tf isolate Case A 测试。返回 {root, changeDir, repos}。
 * 复用 tests/lib/ensure-branch.test.mjs:66-110 的夹具模式。
 */
export function makeMultiRepoWorkspace({ name = 'C-multi', repos = ['repo-a', 'repo-b'] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'tf-e2e-ws-'));
  writeFileSync(join(root, '.gitignore'), 'node_modules/\n');
  git(root, 'init', '-q');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'init-workspace');
  mkdirSync(join(root, 'changes', name), { recursive: true });
  for (const repo of repos) {
    const repoDir = join(root, repo);
    mkdirSync(repoDir, { recursive: true });
    writeFileSync(join(repoDir, 'app.txt'), `${repo} reference code\n`);
    git(repoDir, 'init', '-q');
    git(repoDir, 'add', '-A');
    git(repoDir, 'commit', '-q', '-m', `init-${repo}`);
  }
  return { root, changeDir: join(root, 'changes', name), repos };
}

export { existsSync };
