---
name: build-executor
description: Govern implementation from an approved execution contract. Invoke when execution-contract.md is approved and the user wants disciplined build work, TDD execution, or guarded batch-by-batch implementation.
---

# Build Executor

Controls the implementation phase. Uses `execution-contract.md` as the workflow authority.

## Required Inputs

Read: `execution-contract.md`, `tasks.md`, relevant `specs/`, relevant `design.md`. (Skip contract/spec requirements when workflow is `tweak`.)

When `architecture/sql/` exists, also read:
- `architecture/sql/ddl/*.sql` — executable DDL scripts; reference directly for DB schema change tasks instead of hand-writing DDL
- `architecture/sql/migration/*.sql` — data migration scripts; execute as-is for data transformation tasks

Check workflow mode first: `tf state get <change-dir> workflow`. If `tweak` → direct edit mode. If `hotfix` or `full` → standard contract-first discipline.

**conventions 注入（v0.11 §33）**：
- 通过 `tf runtime config --get conventions` 获取 conventions 配置
- 按 phase 过滤：`backend` / `api`
- 注入为实施约束（代码产出时遵循）

Branch/worktree preflight before ANY implementation edit (mandatory — do not skip):
1. Run the isolation check:
   ```bash
   tf isolate <change-dir>
   ```
   This script enforces git isolation. In a **multi-repo workspace** (a workspace root
   whose direct subdirectories are independent code repositories, e.g. `bff-*`/`ui-*`/
   `prototype/`, while the root itself is often a near-empty git repo), it creates one git
   worktree per code repo under `<workspace>/.worktrees/<change>/<repo>` — each based on
   that repo's current branch — so the implementation subagent enters that aggregated
   directory and sees reference code from every repo with the same layout as the main
   workspace. In a **single code repository** it falls back to creating one git worktree
   (preferred) or a new branch. It exits non-zero if it cannot isolate and you have not
   approved `--force`.
2. If `tf isolate` exits non-zero: STOP. Do not edit `main`/`master` in place.
   Ask the user for explicit approval (and re-run with `tf isolate <change-dir> --force`
   only after they approve).
3. If it succeeds, report the chosen branch/worktree — in a multi-repo workspace, the
   aggregated `<workspace>/.worktrees/<change>/` directory — and make all implementation
   edits there.

### UI Contract Prototype Location (v0.37.0 §68.5)

When implementing UI tasks, the UI contract source is the **prototype version worktree**, not the change worktree's prototype copy:
- **定位**：读 `change-brief.md` 的 `upstream_plan_ref: requirement/vN/plan.md`（或 change 目录名 `v{N}-` 前缀）→ PRD 版本 vN → 原型 worktree = `<workspace>/.worktrees/prd-vN/prototype/`
- **回退**：该 worktree 不存在时用 `<workspace>/prototype/`，并提示 `tf prototype branch <prd-vN>` 创建
- **引用**：execution-contract / design.md 中引用的原型页面（`prototype/pages/<page>.html` 等）以此为基准定位；**禁止**引用主干上其他版本的旧原型

## Core Laws

### Law 0: State Field Boundary (v0.30.0)
本 skill 仅通过 `tf state set` 写自己的 `dp_5_*` 决策字段；**MUST NOT** 修改 `.team-flow.yaml` 的 `state`/`workflow` 核心字段——状态转换是主代理（workflow-start）经 `tf state transition` 的专有职责（来源：workflow-feedback 2026-08-01）。

### Law 1: Contract First
The execution contract is the approved handoff artifact, not chat history.

### Law 2: TDD Iron Law — No Production Code Without a Failing Test First
RED (write test, see it fail) → GREEN (write minimal code, see it pass) → REFACTOR (clean up, suite stays green).

**Red Flags**: "Quick implementation first, test later" / "Skip the test, manually verify" / "I already know it works" / "Just this one time without tests." ALL mean STOP and write the test first.

### Law 3: Review Before Drift
Block on: logic defects, spec violations, missing required tests, unintended scope expansion.

### Law 4: Rewind on Contract Break
Return to `specifying` or `bridging` if: new behavior appears, interfaces change materially, design assumptions fail, artifacts no longer define intended implementation.

## Execution Mode Selection

For `full`/`hotfix`, generate proposed waves from the approved contract, then use the recommendation as a decision aid rather than silently defaulting a mode:

```bash
tf execution recommend <change-dir> \
  --wave <wave-id>:<parallel|serial>:<task,...>[:<depends-on,...>] --json
# Show every available mode, the observed facts, and the recommendation to the user.
# The command writes a receipt tied to the artifacts, contract, and waves. After the user chooses, record that explicit confirmation:
tf execution plan <change-dir> \
  --mode <selected-mode> --confirm --reason "user-selected execution mode" \
  --wave <wave-id>:<parallel|serial>:<task,...>[:<depends-on,...>]
# Add --acknowledge-recommendation when the selection differs from the recommendation.
tf execution show <change-dir> --json
```

The optional fourth `--wave` segment names prerequisite wave IDs. `execution show --json` reports `current`, plus each wave's `depends_on`, `receipt`, `blockers`, `retryable`, and `eligible` status. A wave with `retryable: true` has a current `fail` receipt and is eligible only for its focused repair and re-review; its dependents remain blocked until its replacement `pass` receipt. Report the saved plan revision, selected mode, ordered waves, dependencies, and whether every `parallel` wave can actually be dispatched concurrently on the current platform. If concurrency is unavailable, state the capability and reason plainly; retain the planned `parallel` strategy and do not silently execute it as a serial or Batch Inline plan.

The recommendation uses task count, configured `execution.inlineThreshold`, and declared wave strategy. It never auto-selects: present every available mode and the recommendation to the user. `--confirm` records any user-selected mode; a choice that differs from the recommendation requires `--acknowledge-recommendation` so the plan captures an informed risk decision.

| Mode | Criteria |
|------|----------|
| **SDD** | Recommended for parallel waves, multiple waves, or work beyond the inline threshold |
| **Inline** | Recommended for a single sequential task; always available for a user-confirmed choice |
| **Batch Inline** | Recommended for a bounded sequential batch; it remains serial and is never presented as parallel |

Do not transition to `executing` until `execution show` reports `current: true` and the phase guard passes. A revised plan must repeat `tf execution recommend` and use `tf execution revise --confirm`; it creates a new revision and invalidates receipts from the prior revision.

## Batch Inline Execution

Only when the user explicitly confirms `batch-inline` after seeing the recommendation. Current agent executes directly and serially. TDD Iron Law still applies.

Procedure: announce mode → write failing test → confirm failure → implement → run suite → refactor → lightweight checkpoint (files exist, no placeholders, test passed, no unintended changes) → report.

Boundaries: if any task touches >1 module, involves schema/API/config changes, or has open questions → downgrade to Inline or SDD.

## SDD Workflow

For full/hotfix by default. Execute waves as dispatched by workflow-start.

**v0.39.0 主动串行编排**：build-executor 不再负责安排 code-reviewer。workflow-start 会主动串行编排：每个 wave 完成后，workflow-start 会 dispatch code-reviewer 审查。build-executor 只需执行当前 wave，完成后通知 workflow-start。

### Test Infrastructure Check (v0.43.1, before first wave)

开始实施前检测项目测试基础设施，避免测试静默跳过（设计增强方案 v0.18 §76，来源：workflow-feedback 2026-08-06——surefire 2.22.2 不支持 JUnit 5 `@Nested`，64% 测试从未执行但报告 "91 tests pass"）：

1. **Java 项目**：读 `pom.xml` 的 maven-surefire-plugin 版本 + JUnit 版本。
2. **兼容性判断**：surefire < 2.22.2 且测试计划含 JUnit 5 `@Nested` → 警告"@Nested 自动发现不兼容，建议 flatten 测试类或升级 surefire"。
3. **沉淀 conventions**：检测结果写入 `.team-flow/conventions/`（项目级测试基础设施约束，v0.11 §33 机制），供后续 change 复用。写入方式沿用下方「阶段转换前规范建议」协议——YAML frontmatter（name/description/date）+ 正文约束，用户确认后追加，更新 date 字段。

### Planned-Wave Loop
1. Read the current plan with `tf execution show <change-dir> --json`; only waves shown with `current: true` and `eligible: true` may start. A `retryable: true` wave may only be repaired and re-reviewed; do not dispatch its dependents until its replacement receipt is `pass`. The CLI encodes dependencies in `--wave <id>:<strategy>:<tasks>[:<depends-on,...>]` and rejects a review receipt for a wave whose prerequisites lack current `pass` receipts.
2. A `parallel` wave may dispatch independent tasks simultaneously only when the platform supports concurrent dispatch. If it does not, disclose the unavailable capability and execute the same wave one task at a time without changing its stored strategy.
3. A `serial` wave dispatches one task at a time in listed order.
4. After every wave, notify workflow-start via SendMessage that the wave is complete and needs review. Include:
   - Wave ID
   - Worktree path
   - Branch
   - Repositories and commit SHAs (base + head)
   - Summary of changes
5. **Do not** attempt to dispatch code-reviewer or write review receipts — that is workflow-start's responsibility.
6. Critical/Important findings require a `fail` receipt, a focused repair, re-review, then a replacement `pass` receipt. Never advance or close with a missing or failed receipt.

### Wave Verify: Actual Test Count (v0.43.1)

每个 wave 完成、通知 workflow-start 审查前，验证测试**实际执行**的数量（设计增强方案 v0.18 §76，来源：workflow-feedback 2026-08-06——64% 测试静默跳过但报告全绿）：

1. 运行测试套件后，用 `tf test record <change-dir> --from <runner-output-file>` 解析**实际执行数量**（`Tests run: N`）。
2. 对照 test-matrix 当前 wave 覆盖的用例数（**分母排除 `test_tier=e2e`**——E2E case 由 Playwright 执行，不进入 `mvn test`/`npm test` 的 `Tests run: N`，口径与 code-reviewer Step 5b / release-archivist Step 2b 一致）：实际执行数明显低于预期（< 70%）→ **警告 + 调查**（@Nested 静默跳过、测试未被发现、编译期跳过等），未查明前不得报告 "N tests pass"。
3. 报告引用实际执行数（`Tests run: N`），而非 BUILD SUCCESS 或编译通过数量。

### Per-Task Loop
1. **Dispatch implementer**: Load the template with `tf runtime asset read skills/build-executor/implementer-prompt.md`. Extract task brief with `scripts/task-brief PLAN_FILE N`. Include: where task fits, brief path, interfaces from prior tasks, report file path.
2. **Handle response**: DONE → generate review package + dispatch reviewer. DONE_WITH_CONCERNS → assess. NEEDS_CONTEXT → provide context. BLOCKED → re-dispatch with better model or escalate.
3. **Verify task output（v0.43.1）**：任务标记完成前验证产物——**前置到审查前**（源头校验：文件存在性是审查的前提，让 reviewer 专注质量而非兜底）。设计增强方案 v0.18 §75，来源：workflow-feedback 2026-08-06——Task 标记 [x] 但文件未创建）：
   - Create 任务：目标文件必须存在且非空（`test -s <path>`）
   - Modify 任务：目标文件必须有变更（相对 wave base 的 `git diff --name-only` 包含该文件）
   - 验证失败 → 不标记完成，先补创建/修改——"标记完成"与"文件存在"绑定，杜绝任务状态失真
4. **Review**（task 级轻量审查；wave 级 code-reviewer 由 workflow-start 主动编排，v0.39.0）: Load `tf runtime asset read skills/build-executor/task-reviewer-prompt.md`. Reviewer returns spec compliance + code quality verdicts with the wave ID, git range, report path, and `pass`/`fail` receipt command.
5. **Fix**: If Critical or Important issues, write the `fail` receipt, dispatch fix subagent, re-review, and write the replacement `pass` receipt.
6. **Mark complete**: Append to `.superpowers/sdd/progress.md`: `Task N: complete (commits <base7>..<head7>, review clean)`

### Model Selection
Use the configured profile that matches the task role. Resolve it before dispatch:

```bash
tf runtime config --resolve-model <profile>
```

| Profile | Role |
|---|---|
| `mechanical` | Cheap, routine edits |
| `standard` | Integration and judgment work |
| `strong` | Architecture, design, and final review |
| `review` | Review that matches the diff |

For platforms whose dispatch supports a `model` field, explicitly pass the resolved `model` value. If the result is `configured: false`, automatic selection is unavailable: do not invent a provider model and do not bypass the existing requirement to specify `model` explicitly. Resolution only reads configuration; it does not switch models.

### Progress Ledger
Track in `.superpowers/sdd/progress.md`. Check for existing ledger — completed tasks are done. After each batch: `tf state set <change-dir> batches_completed <N>`.

## Inline Execution Mode

Only after a user-confirmed `inline` selection is recorded by `tf execution plan --confirm`; a non-recommended selection also records `--acknowledge-recommendation`. Executes in the current session. After each wave, notify workflow-start for review (do NOT attempt to write review receipts).

Per-task: extract brief → write failing test → confirm failure → implement → confirm green → checkpoint review (done-when criteria, SHALL/MUST verification) → commit → save a task-level recovery checkpoint when another task remains → append to progress ledger.

After a task is committed and reviewed, when another task remains, save the
recovery context with real evidence:

```bash
tf checkpoint save <change-dir> \
  --task <completed-task-id> --next "<next task>" --completed "<completed work>" \
  --verification "<verification report path>" --review "<review report path>" \
  --risk "<open risk or None>" --commit-start <base-sha> --commit-end <head-sha>
```

This augments `.superpowers/sdd/progress.md`; it does not replace the progress
ledger or add a new core workflow state. Do not claim a checkpoint is current
when `tf checkpoint list` reports it as stale.

If task hits BLOCKED (3+ fix failures or changes outside declared scope), escalate to SDD.

## Tweak Mode

Skip TDD. Apply changes directly. Verify file integrity (exists, non-empty, valid syntax). No batch execution — sequential changes.

## DP Records

DP-4 is written by `tf execution plan`; do not write it with raw `state set`.
DP-5 (debug escalation): `tf state set <change-dir> dp_5_result "<resolution>"` + timestamp.

## Completion Standard

Don't report completion until: tests pass, contract obligations satisfied, and every planned wave has been notified to workflow-start for review. Review blockers are handled by workflow-start via code-reviewer dispatch.

## Exception Handling

- **Parse failures**: Stop and report exact line/format issue. Route back to `contract-builder`.
- **Missing artifacts**: Route back to appropriate upstream skill. Don't guess.
- **User interruption**: Progress ledger enables recovery. Check ledger on resume.

## 阶段转换前规范建议（v0.11 §33，被动式自动沉淀）

build-executor 阶段即将结束、进入 closing 之前，执行以下规范沉淀协议：

1. **回顾本阶段工作**：扫描本阶段所有用户纠正、CC 观察到的项目既有模式、踩坑记录
2. **生成规范建议列表**：提取跨 change 可复用的规范条目（排除仅适用于本次 change 的特定业务逻辑）
3. **去重检查**：对比已有 convention 文件，排除已存在的条目
4. **向用户展示建议**：

```
📋 构建执行阶段规范建议
┌───┬──────────────────────────────────────────────────┐
│ # │ 规范条目                                          │
├───┼──────────────────────────────────────────────────┤
│ 1 │ [条目描述]                                        │
│   │   来源：[来源说明]                                  │
│   │   建议写入：.team-flow/conventions/[目标文件]       │
└───┴──────────────────────────────────────────────────┘

请逐条确认（接受/拒绝/修改），或输入「全部接受」：
```

5. **用户确认后写入**：接受的条目追加到对应 convention 文件，更新 YAML frontmatter 的 date 字段
6. **无建议时静默跳过**：如果本阶段没有可沉淀的规范，不弹出确认，直接进入下一阶段
