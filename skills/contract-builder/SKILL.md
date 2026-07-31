---
name: contract-builder
description: Convert approved planning artifacts into an execution contract. Invoke when the user wants to start building, asks to move from planning to implementation, or when execution-contract.md is missing or stale.
---

# Contract Builder

Converts planning artifacts into a single execution handshake: `execution-contract.md`. Load the baseline with `tf runtime asset read templates/execution-contract.md`.

Read before generating: `proposal.md`, `specs/`, `design.md`, `tasks.md`, then load `docs/artifact-contract.md` with `tf runtime asset read docs/artifact-contract.md`.

**Architecture Design Outputs (v0.9 §26)**: 若 `architecture/` 目录存在，同时读取 `architecture/architecture.md` / `database.md` / `api.md`，作为执行契约的架构约束补充输入——确保 execution-contract.md 的 Implementation Constraints 段包含架构设计的关键约束（聚合边界/CQRS 分流/API 契约/schema 变更）。`architecture/` 不存在时跳过。

**Test Ledger Injection (v0.12 §43.5)**: 若 `docs/test-ledger/` 存在，读取：
1. `docs/test-ledger/INDEX.md` → 获取相关模块的测试覆盖概览（coverage_status）
2. `docs/test-ledger/baselines/{module}.md` → 获取已有 case，避免重复设计；读取 Deferred Items → 评估本次是否可解决
3. 将已有 baseline 和 deferred 项作为 test-matrix.md 生成的增量输入

`docs/test-ledger/` 不存在时跳过（首次使用或无历史数据）。

## Artifact Mapping

| Source | Extract |
|--------|---------|
| `proposal.md` → `## Why` + `## What Changes` | Intent Lock (problem + scope) |
| `proposal.md` → `## Scope > ### Out of Scope` | Scope Fence |
| `specs/` → each `### Requirement:` | Approved Requirements, Scenarios, Test Obligations |
| `design.md` → `## Decisions` | Architecture, Interface, Dependency Constraints |
| `architecture/` → `architecture.md` / `database.md` / `api.md` (v0.9 §26) | Architecture Constraints (聚合边界/CQRS/API契约/schema变更) |
| `tasks.md` → numbered task groups | Execution Batches, Completion Definitions, Review Timing |

## Cross-Check: Requirement Coverage

Before finalizing:
1. List every SHALL/MUST from `specs/`
2. Verify each is reflected in Approved Behavior, has a test obligation, and appears in at least one batch
3. Flag unmapped requirements in Escalation Rules
4. Note cross-batch dependencies

## Contract Structure

Must make obvious: approved behavior, out-of-scope, constraints, batches, test obligations, review gates, and conditions that force a rewind to planning. Prefer compression over repeating planning details.

## Test Matrix Generation (v0.12 §42)

`test-matrix.md` 是 `execution-contract.md` 的**附属产物**（不是独立第 6 核心产物），在 contract 的 `## Test Matrix` 段引用。

### Generation Protocol

1. **输入来源**：specs/（Scenario + Unit/Integration 标签）、tasks.md（batch + file structure）、test-strategy skill（design_method 规则）、test-ledger baselines（增量输入）
2. **按模块分组**：为每个有业务逻辑的模块（Service/Controller/Repository 等）生成 case 列表
3. **复杂度分级**：每个模块标注 trivial/medium/complex，作为用例数下限判据（test-strategy §2）
4. **design_method 覆盖**：每个模块至少 1 个 `{boundary, equivalence}` case + 1 个 `{error, exception, reject}` case（test-strategy §6 schema 强制覆盖）
5. **对抗验证**：矩阵生成后执行三招回检（test-strategy §4），缺失则追加 adversarial case
6. **候选覆盖台账**：列出所有被测候选（方法/类），标注 decision（covered/deferred/not_applicable）

### 12-Column Format

| case_id | behavior | design_method | input | expected | test_kind | test_tier | mock | work_mode | test_file | test_method_name | run_command |
|---|---|---|---|---|---|---|---|---|---|---|---|

字段说明见 test-strategy skill 的 `references/design-methods-detail.md`。`test_tier` 从 `test_kind` 派生（unit/integration）。

### Structure

```markdown
# Test Matrix — {change-name}

## Summary
- Total cases: {N}
- Modules covered: {N} (complexity: trivial×{n}, medium×{n}, complex×{n})
- Unit cases: {N} ({percent}%)
- Integration cases: {N} ({percent}%)
- Deferred items: {N}
- Matrix revision: 1

## Candidate Coverage Ledger
| candidate | category | decision | case_ids | reason |

## Cases
### {module-name}
| case_id | behavior | design_method | input | expected | test_kind | test_tier | mock | work_mode | test_file | test_method_name | run_command |

## Adversarial Cases
| case_id | behavior | design_method | input | expected | test_kind | test_tier | mock | work_mode | test_file | test_method_name | run_command |

## Deferred Items
| case_id | behavior | design_method | reason | deferred_since |
```

### Post-Generation

写入 `test-matrix.md` 后，在 `execution-contract.md` 中添加引用段：
```markdown
## Test Matrix
See `test-matrix.md` for the full test case matrix (附属产物, 独立 hash).
- Total cases: {N}, Unit: {N}, Integration: {N}, Deferred: {N}
```

然后执行 `tf state rebuild <change-dir>` 更新 `test_matrix_hash`。

### Hotfix/Tweak Exemption

hotfix/tweak workflow 不生成 test-matrix.md（guard 豁免）。设置：
```bash
tf state set <change-dir> test_matrix_skipped true
```

### GLAF4 Java 路由

当项目技术栈为 GLAF4 Java（Spring Boot / JUnit 5 / Mockito）时，提示用户是否调用 `glaf4-test:glaf4-tests` 做精细矩阵设计。用户同意后由 glaf4-tests design stage 生成 `test-matrix.json`，再转换为 team-flow 格式的 `test-matrix.md`。

## Approval Model (DP-3)

After drafting: summarize handoff rules, identify ambiguity, flag unmapped requirements, ask user to approve explicitly. After approval:
```bash
tf state set <change-dir> dp_3_result "approved: <summary>"
tf state set <change-dir> dp_3_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```
DP-3 is a hard gate — no implementation without this record.

## Stale Contract Detection

Refresh if: scope changed in proposal, requirements changed in specs, constraints changed in design, batches changed materially in tasks, or the contract no longer matches intent.

## Hotfix Mode

Generate minimal contract: Intent Lock (one sentence), Task List (numbered), Approval Gate (DP-3). Skip Scope Fence, Build Rules, Review Gates, Test Evidence. Still requires DP-3 approval.

## Guardrails

- **状态字段禁写（v0.30.0）**：仅写本 skill 的 `dp_3_*` 决策字段；**MUST NOT** 修改 `state`/`workflow` 核心字段——状态转换由主代理经 `tf state transition` 执行。`tf state init` 只创建状态文件，不改 `state` 值（来源：workflow-feedback 2026-08-01）。

- Do not continue to implementation if ambiguity remains
- Do not approve the contract on the user's behalf
- Do not skip the contract because planning docs look complete
- Flag unmapped requirements; do not silently drop them

## Post-Generation

Run `tf state init <change-dir>` to create `.team-flow.yaml` with hashes.

For hotfix, after writing the minimal contract, run `tf state init <change-dir>` or `tf state rebuild <change-dir>` so `contract_hash` is recorded. DP-3 remains mandatory before build.

## Exception Handling

- **Parse failures**: Report specific file and section. Suggest re-running `spec-writer`.
- **Missing files**: List every missing artifact. Route back to `spec-writer`.
- **User interruption**: Re-read all artifacts on resume; check contract staleness via content comparison.
- **Validation failure**: Flag unmapped requirements in Escalation Rules and approval summary.
