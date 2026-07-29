---
name: spec-writer
description: Create or refine team-flow planning artifacts. Invoke when the change is understood well enough to write proposal.md, specs/, design.md, and tasks.md.
---

# Spec Writer

Create or refine planning artifacts when the change has moved beyond exploration.

## Required Inputs

Read `.team-flow.yaml` (especially `dp_0_decisions`, `dp_0_confirmed`) and any existing planning artifacts. If `dp_0_confirmed` is not `true`, stop and route back to `workflow-start` for DP-0.

### Global Prototype Reading (v0.5)

Before generating artifacts, check if a global prototype exists:
1. Read `prototype/flow.md` if it exists — this defines page navigation and user flows
2. List `prototype/pages/` directory — these are the UI contract pages
3. Read `prototype/design-system.md` if it exists — component and token definitions
4. Store as UI contract context for design.md and tasks.md generation

If `prototype/` does not exist or is empty, skip silently — not all projects have prototypes.

### Solutions Index (v0.5)

Read `docs/solutions/INDEX.md` if it exists. Filter entries where `phase = spec OR phase = cross-phase` and `domain` matches the current change's domain. Inject top-5 summaries as context constraints for artifact generation. If INDEX.md does not exist or is empty, skip silently.

### Change Brief (v0.9)

若 `change-brief.md` 存在（本 change 由 workflow-orchestrator S4 分发），读取其 Scope / 约束 / AC 列表 / 全局技术方向：
- **Scope** 作为 proposal.md 的 scope 边界基线——不静默超出 brief scope。
- **AC 列表** 作为 specs/ 的 AC 覆盖上限——brief 列出的 AC 必须在 specs/ 中体现，**不**静默丢弃；若认为 brief AC 有误或与 plan.md 冲突，以 `prd/vN/plan.md` / PRD 为准并在 proposal 注明，而非静默改写。
- brief 不存在时（手动新建 / 快速通道）跳过本段，按原流程从 `dp_0_decisions` 取意图。

### Plan Technical Direction (v0.9)

若产品级 `prd/vN/plan.md` 存在，读取其**高阶技术设计段**（模块边界 / 技术选型 / 数据流方向 / 关键聚合与上下文划分），作为 design.md 的 `## Decisions` 约束输入——保证各 change 的技术方案与全局方向一致，避免各自为政。**禁止**反向要求 plan.md 提供接口清单 / 字段定义 / 方法签名（这些是 spec-writer / architecture-design 在本 change 内的产出，plan.md 不含，见 ce-plan 作用边界与 v0.8 §18.7.2）。plan.md 不存在时跳过本段。

### Architecture Design Outputs (v0.9 §26)

若 `architecture/` 目录存在（本 change 经 workflow-start 的 architecture-design 判断门判定为 `required` 并产出了架构设计），读取以下文件作为 design.md / tasks.md 的架构约束输入：

- `architecture/architecture.md` → design.md `## Decisions` 的架构约束（聚合/限界上下文/CQRS 决策）
- `architecture/database.md` → design.md + tasks.md 的数据层约束（实体/读写模型/schema 变更）；注意 database.md 引用 `architecture/sql/` 路径而非内嵌 DDL
- `architecture/api.md` → tasks.md 的接口路由约束（**架构路由表**：Command/Read/Query 分类，非详细 API 规格——详细规格由 Swagger 管理）
- `architecture/sql/ddl/*.sql` → tasks.md 数据层任务的 DDL 脚本约束（可执行建表/改表脚本）
- `architecture/sql/migration/*.sql` → tasks.md 数据层任务的数据迁移约束

**约束传递规则**：
- design.md 的 `## Decisions` 段必须**引用** architecture/ 中的架构决策，不得与之矛盾
- tasks.md 的接口定义（Interfaces 段）必须与 `architecture/api.md` 的架构路由表（Command/Read/Query 分类）对齐——详细 API 规格由 Swagger 管理，api.md 不含
- tasks.md 的数据层任务必须与 `architecture/database.md` 的 schema 变更对齐，并引用 `architecture/sql/ddl/*.sql` 和 `architecture/sql/migration/*.sql` 作为可执行脚本路径

`architecture/` 目录不存在时（判定为 `skipped`）跳过本段。

## Config Check

Run: `npx --yes --package @xulthekl/team-flow@0.26.1 tf runtime config --get artifacts.order` — generate in configured order (default: proposal → specs → design → tasks). Run with `artifacts.skip` — skip any listed artifacts.

## Artifact Roles

- `proposal.md`: why and scope
- `specs/`: required behavior (testable)
- `design.md`: architecture decisions and trade-offs (not line-by-line)
- `design.md` (v0.5 addition): When the change involves UI features, the Context section MUST reference the global prototype as UI contract source. Cite specific prototype pages (e.g., `prototype/pages/login.html`) and flow definitions (e.g., `prototype/flow.md#login-flow`). Do NOT redefine UI interactions in design.md — reference the prototype as the single source of truth for UI behavior.
- `tasks.md`: dependency-aware implementation steps

## Working Rules

**Honor DP-0**: Read `dp_0_decisions`, respect confirmed constraints, don't silently expand scope. Pause on unconfirmed decisions.

**Honor Brief (v0.9)**: 若 `change-brief.md` 存在，尊重其 scope 边界与 AC 列表（见 Required Inputs「Change Brief」）——不静默丢弃 brief AC、不静默超出 brief scope；与 plan.md 冲突时以 plan.md 为准并注明。

**Honor Architecture (v0.9 §26, v0.10 §28-§31)**: 若 `architecture/` 目录存在，design.md 的 Decisions 段必须引用其架构决策（聚合/限界上下文/CQRS/API/DB），tasks.md 的接口定义（对齐 api.md 架构路由表）和数据层任务（引用 sql/ddl/ + sql/migration/ 脚本路径）必须与 architecture/ 产出对齐——不得静默忽略或矛盾架构设计产出。

### proposal.md
Must state: problem, what changes, capabilities affected, impact areas.

### specs/
Every requirement must be testable. Use SHALL or MUST. Every requirement must have at least one `#### Scenario:` with WHEN/THEN. Group under ADDED/MODIFIED/REMOVED Requirements headers.

Optional structured AC tags under a Scenario are supported for E2E extraction (v0.4, design spec ch.16): `##### Exception:` (→ EX AC, ×2), `##### State:` (→ ST AC, ×2), `##### Boundary:` (→ BND AC, ×1). These are **OPTIONAL** — omitting them does NOT fail validation. The `e2e` skill applies dimension-conditional gating (absent dimension = N/A, not 0%) plus keyword fallback (error/invalid/fail/边界), so no spec is forced to add tags.

### design.md
Must have: Context (current state, constraints, stakeholders), Goals, Decisions (Choice + Rationale + Alternatives considered), Risks And Trade-Offs.

**Prototype reference (v0.5)**: For UI-related changes, include a `## UI Contract` section in design.md that:
- References the prototype entry point (`prototype/index.html`)
- Lists affected prototype pages with their paths
- References relevant flow definitions from `prototype/flow.md`
- Notes any prototype components used (`prototype/components/`)
- States: "UI behavior is defined by the global prototype. This design does not redefine UI interactions."

### tasks.md
Must include:
- **File Structure**: all files with one-sentence responsibility (Create/Modify)
- **Interfaces**: cross-batch Consumes/Produces with exact types
- **Per-task**: exact file paths, expanded TDD phases (5 steps), Interfaces block
- **Granularity**: each step 2-5 min, atomic
- **Zero placeholders**: no TBD, TODO, "figure out", "add appropriate"
- **Dependency ordering**: depends only on prior tasks, explicit "Depends on: Batch N"

**Prototype-aware tasks (v0.5)**: For UI-related tasks, include prototype references:
- File paths in `**Files:**` should reference prototype pages when the task implements a UI page
- Add `**Prototype:** prototype/pages/<page>.html` field for UI implementation tasks
- Test scenarios for UI tasks should reference prototype flow definitions

## Artifact Generation

Generate one at a time. Confirm each before next. This prevents scope drift — if proposal has errors, downstream artifacts are wrong.

1. `proposal.md` → present summary → wait for confirm
2. `specs/` → present requirement list → wait for confirm
3. `design.md` → present key decisions → wait for confirm
4. `tasks.md` → present batch breakdown → wait for confirm

## Validation Checklist

### proposal.md
- `## Why` > 50 chars, `## What Changes`, `## Scope` (In/Out), `## Impact`, `## Capabilities`, no TBD/TODO

### specs/
- SHALL/MUST for required behavior, `#### Scenario:` with WHEN/THEN per requirement, grouped under delta headers, no contradictions; optional `##### Exception:/State:/Boundary:` sub-tags allowed but NOT required (absent dimension = N/A, not 0%). Regression: a spec containing `##### Exception:` must still pass `npm run validate` (validateDeltaSpec must not reject unknown sub-headings).

### design.md
- `## Context`, `## Goals`, `## Decisions` (≥1, with Choice+Rationale+Alternatives), `## Risks And Trade-Offs`
- **Architecture alignment (v0.9 §26, v0.10 §28-§31)**: 若 `architecture/` 存在，`## Decisions` 必须引用架构设计产出中的关键决策（聚合/限界上下文/CQRS/API/DB）；tasks.md 数据层任务须引用 `architecture/sql/` 脚本路径，接口定义须对齐 api.md 架构路由表

### tasks.md
- `## File Structure`, `## Interfaces`, numbered tasks, exact file paths, TDD phases, ≤5 min steps, no placeholders, every requirement mapped, explicit dependencies

**If any artifact fails validation, fix before handing off to contract-builder.**

## DP-2: Artifact Review Gate

Present summary of all 4 artifacts (2-3 sentences each). Ask user for adjustments. After approval:
```bash
npx --yes --package @xulthekl/team-flow@0.26.1 tf state set <change-dir> dp_2_result "approved: <summary>"
npx --yes --package @xulthekl/team-flow@0.26.1 tf state set <change-dir> dp_2_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```

## Handoff Rule

Do not start implementation after writing planning artifacts. Once stable, validated, and DP-2 is recorded, hand off to `contract-builder`.

## Exception Handling

- **Parse failures**: Report specific file/error; don't generate from corrupted templates
- **Missing templates**: Fall back to artifact structure defined in this skill
- **User interruption**: Artifacts on disk are the recovery checkpoint; resume from first missing/incomplete one
- **Validation failure**: Fix before handoff — do not hand off broken artifacts
