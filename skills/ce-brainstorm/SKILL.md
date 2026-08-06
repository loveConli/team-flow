---
name: ce-brainstorm
description: 'Explore vague or ambitious ideas into a structured PRD document. For NEW product-level requirements, prefer workflow-orchestrator (which calls this skill internally with baseline check, compounding injection, and PRD version management). Use this skill directly ONLY when: (a) focused brainstorm on a specific topic without full orchestration, (b) resuming an existing brainstorm/PRD, (c) called by workflow-orchestrator internally. Also use when the user must scope work in territory they say they do not know ("I know nothing about X but need to...") or asks for a blindspot pass. Not for executing already-specified work. Not for a decisive verdict on whether to adopt or switch to a specific external technology, library, or platform.'
argument-hint: "[feature idea or problem to explore] [output:html]"
---

# Brainstorm a Feature or Improvement

**Note: The current year is 2026.** Use this when dating PRD documents.

Brainstorming answers **WHAT** to build through collaborative dialogue, producing a **PRD document** (产品需求文档). It precedes `/ce-plan` (**HOW** to build). In compound engineering, write under `prd/vN/prd.md`. The PRD template is configurable via `prd.template` config (default: `templates/prd.md`). This skill explores, clarifies, and documents — it does not implement code.

## 调用模式（v0.7 新增）

| 模式 | 触发条件 | Phase 3.5 行为 |
|------|---------|---------------|
| `standalone`（默认） | 用户直接调用 /ce-brainstorm | Phase 3.5 原型循环正常执行 |
| `orchestrated` | 被 workflow-orchestrator 内部调用（传入 mode: orchestrated） | Phase 3.5 **跳过**，原型循环由 orchestrator 编排 |

> **显式参数规约**：orchestrator 调用时必须传入 `mode: orchestrated`。ce-brainstorm 检测到该参数即跳过 Phase 3.5 并在输出中回执"原型循环已委托编排层"。未收到该参数时默认为 standalone 模式。
>
> **重要：`orchestrated` 模式仅跳过 Phase 3.5（原型内循环）。Phase 0（含 PRD 模板选择）、Phase 1（含 1.4/1.5/1.6）、Phase 2、Phase 3、QA-4、Phase 3.6、版本归档均正常执行，不可跳过。**

## Core Principles

1. **Assess scope first** — Match ceremony to size and ambiguity.
2. **Be a thinking partner** — Suggest alternatives, challenge assumptions.
3. **Resolve product decisions here** — User-facing behavior, scope, success criteria. Implementation belongs in planning.
4. **Keep implementation out** — No libraries, schemas, endpoints, file layouts unless the brainstorm is about a technical change.
5. **Right-size the artifact** — Simple work gets compact PRD; larger work gets fuller PRD.
6. **YAGNI on carrying cost, not coding effort** — Simplest approach that delivers value; low-cost polish is worth including.
7. **Don't turn coverage into decomposition** — Named devices/providers are coverage requirements, not separate workstreams.

## Interaction Rules

1. **One question at a time** — Pick the single most useful one.
2. **Prefer single-select multiple choice** — When choosing one direction.
3. **Use multi-select rarely** — Only for compatible sets (goals, constraints).
4. **Default to blocking question tool** — `AskUserQuestion`, `request_user_input`, etc. Fall back to numbered options only when no blocking tool exists.
5. **Open-ended only when genuinely open** — When you can't write 3-4 distinct options without padding.
6. **Specific open-ended questions** — Give something concrete to anchor on. Not "What's your take?"

## Output Guidance

Prioritize decision-relevant detail. Preserve facts, tradeoffs, caveats; trim introductions and repetition.

## Model Tiers

Sub-agent dispatch is tiered by task shape. Read `references/model-tiers.md` for tier definitions and degradation rules.

## Optional Inputs

- `docs/ideation/*.md`（可选）：如果 ce-ideate 已产出 ideation artifact，读取作为 brainstorm 的起点。

## Feature Description

If no feature description was provided, ask the user. If `docs/ideation/*.md` exists, read it first. Read `references/settled-decisions.md` before classifying conversation-carried decisions. Do not proceed until you have a feature description.

## Execution Flow

### Phase 0: Resume, Assess, and Route

#### 0.0 Resolve Output Mode + PRD Template

> **⛔ GUARDRAIL：禁止写入 skill 源码目录**
>
> 项目级制品（PRD 模板、配置文件等）只在**项目工作区**创建/修改：
> - 模板文件：`.team-flow/templates/`
> - 配置文件：`.team-flow/team-flow.config.json`
>
> **绝不写入 skill 源码目录**（`skills/ce-brainstorm/` 等）。

Determine `OUTPUT_FORMAT` (md or html). For the full 5-level precedence, read `references/output-format.md`.

**Resolve PRD template — MANDATORY STEP, DO NOT SKIP.**

1. **检查 tf CLI 是否可用**：运行 `which tf`
   - ✅ 可用：继续执行 `tf runtime config --get prd.template`
   - ❌ 不可用：走降级逻辑（见下方）

2. **降级逻辑（tf 不可用时）**：
   - 通知用户：`tf` 命令不可用，将使用默认配置
   - **询问用户**：默认模板 or 自定义路径？
     - 默认模板：**直接 cp skill 内置模板到项目目录**（见下方步骤）
     - 自定义路径：验证文件存在，在项目工作区记录配置
   - **维护配置文件**：在 `.team-flow/team-flow.config.json` 中记录配置（如文件不存在则创建）

3. **默认模板处理步骤（重要）**：
   - **源文件**：skill 内置 `templates/prd.md`（相对于 skill 基础目录）
   - **目标目录**：`.team-flow/templates/`（项目工作区）
   - **操作**：直接 `cp` 源文件到目标目录，**不要自行创建简化版本**
   - **验证**：检查目标文件是否存在且包含完整的11个章节

Built-in `templates/prd.md` is relative to the skill's base directory. Custom paths are relative to project root.

**⛔ 关键约束**：
- **错误行为**：自行创建简化版本的PRD模板
- **正确行为**：直接 cp 原始 PRD 模板到项目目录，保持模板完整性

**Resolve brainstorm profile.** After template resolution, look for `<template-name>-brainstorm-profile.md` in the same directory. Store as `BRAINSTORM_PROFILE_PATH`. Fall back to built-in `templates/prd-brainstorm-profile.md`.

#### 0.1–0.5 Routing Sub-phases

For detailed routing logic, read `references/phase0-routing.md`. Summary:

- **0.1 Resume**: scan `prd/` for existing work; confirm before resuming
- **0.1b Classify**: software → continue; non-software → `references/universal-brainstorming.md`; neither → respond directly
- **0.1c Verdict**: verdict-shaped requests → offer `/ce-pov` handoff via `references/verdict-routing.md`
- **0.2 Assess**: clear requirements → skip to Phase 2.5; ambiguous → full brainstorm
- **0.3 Scope**: Lightweight / Standard / Deep (+ feature vs product); arm visual-probe and blindspot tripwires
- **0.4 Spine**: create 5-task tracking spine for Standard/Deep
- **0.5 Iteration**: resolve `ITERATION_VERSION` from `prd/` directory

### Phase 1: Understand the Idea

**1.1 Context Scan** — For Standard/Deep, dispatch grounding scout sub-agent (extraction-tier) to produce a grounding dossier. For the scout prompt, scratch directory setup, and Slack routing, read `references/grounding.md`. Two rules: **verify before claiming** (check infrastructure exists) and **defer design to planning**.

**1.2 Pressure Test** — Scan opening for rigor gaps (evidence, specificity, counterfactual, attachment). Read `references/product-pressure-test.md` for per-tier lens catalog. Session-settled decisions count as already-probed.

**1.3 Dialogue** — Follow Interaction Rules. Fire blindspot gate (if tripwire armed) and visual-probe gate (before first shape decision). Rigor probes fire as open-ended questions before Phase 2. Before exit: integration check for non-obvious consequences. **Exit when**: primary actor, outcome, scope, success criteria all known or recorded as assumptions.

**1.4 Dialogue Log Persistence** — Automated step, no user interaction. Trigger: Phase 1.3 dialogue exits. Traverse each Q&A round extracting original text + decisions, generate dialogue summary and decision summary table. Write to `requirement/vN/dialogue-log.md` (create or append). No ledger update.

**1.5 Business Scenario Analysis** — Read `references/business-scenarios.md` for methodology. Trigger: Phase 1.4 completed. Extract business scenarios from dialogue and context, produce QA-1 quality check, then **blocking question** for user confirmation. Output: `requirement/vN/business-analysis.md` (requirements + scenarios sections). Status marked 🔵 pending confirmation, ✅ confirmed on user approval. No ledger update at this stage.

**1.6 Business Process Analysis** — Read `references/business-processes.md` for methodology. Trigger: Phase 1.5 confirmed (✅). Extract business processes, produce QA-2 quality check, then **blocking question** for user confirmation. Output: update `requirement/vN/business-analysis.md` (processes section + scenario/requirement association fields). Status marked 🔵 pending, ✅ confirmed on approval. No ledger update at this stage.

### Phase 2: Explore Approaches

**Load brainstorm profile.** If `BRAINSTORM_PROFILE_PATH` is set, read it. Each approach must address core thinking dimensions; note irrelevant dimensions.

If `CLAUDECODE=1`, read `references/reasoning-elevation.md` for optional model elevation.

Propose **2-3 approaches** (or recommend directly if one is clearly best). Use non-obvious angles (inversion, constraint removal, analogy). Present all before recommending. For each: description, pros/cons, risks, when suited.

**Granularity: profile-driven product thinking, not architecture.** Address profile dimensions (business process, state model, permissions, data, rules, functions). Do NOT cross into implementation specifics (tables, paths, classes, APIs).

### Phase 2.5: Synthesis Summary

**Read `references/synthesis-summary.md` before composing.** Surface scoping synthesis — user's last chance to correct scope. Fires for all tiers. Path A (announce-only) for Lightweight + no blocking questions; Path B (confirmation gate) for all others. 2.6: dispatch claim verifier during Path B confirmation wait.

**QA-3 quality check** fires after synthesis draft is complete, before the blocking question. Synthesis must reference confirmed scenario IDs (SC-xxx) and process IDs (BP-xxx) as evidence anchors. Unconfirmed (🔵) items are flagged in Call outs section.

### Phase 3: Generate PRD Document

**Inputs** (read before generating PRD):
- `requirement/ledger.md` — all requirement/scenario/process items and their associations
- `requirement/vN/dialogue-log.md` — §1.2 revision record reference path
- `requirement/vN/business-analysis.md` — data source for §2/§3/§7/§8

**⛔ MANDATORY：生成PRD文档前，必须先读取 `references/brainstorm-sections.md`**

**§8.4 功能模块提取规则（关键规则，必须遵守）**：
- **详细程度**：保留原始需求文档中的关键细节，不要过度概括
- **必须保留的内容**：
  - 页面布局（上下分栏、标准列表等）
  - 搜索模块（具体字段）
  - 表格列定义（完整字段列表）
  - 交互规则（默认选中、点击切换、筛选联动等）
  - 按领域动态字段（如有）
  - 动态列名说明
  - 操作说明（已发布/草稿状态等）
  - 级联选择逻辑（如有）
- **⛔ 错误行为**：只提取输入/输出/业务规则，丢失原始需求文档中的大量关键细节
- **⛔ 正确行为**：充分利用原始需求文档的详细内容，保持信息完整性

Read `references/brainstorm-sections.md` for doc-warranted criteria. If warranted: read template from `PRD_TEMPLATE_PATH`, fill via `references/prd-mapping.md`, write to `requirement/{ITERATION_VERSION}/prd.md`. Vocabulary capture: update `CONCEPTS.md` with resolved domain terms (only if it exists).

### Phase 3.5: Prototype Inner Loop

**`orchestrated` mode skips this phase.** For standalone: read `references/prototype-loop.md`. Trigger: PRD has UI functions. Steps: produce prototype → review vs PRD → fix loop (max 3) → completeness review → freeze PRD.

### QA-4: PRD Quality Check

Fires after Phase 3 (or Phase 3.5 if prototype loop ran). Read `references/evidence-chain-validation.md` for QA-4 criteria. Evaluates PRD completeness and traceability against business analysis artifacts.

### Phase 3.6: PRD ↔ Scenario/Process Bidirectional Validation

**Read `references/evidence-chain-validation.md` for full methodology.** Automated validation; CONDITIONAL_PASS requires user annotation of exempt items. Performs five validation dimensions (V1–V5) ensuring every requirement traces to scenarios and processes, and vice versa.

**Routing**: PASS → proceed to version archiving; CONDITIONAL_PASS → proceed with documented caveats; FAIL → return to Phase 3 for revision.

### Version Archiving

Automated step, no user interaction. Trigger: Phase 3.6 result is PASS or CONDITIONAL_PASS.

**Pre-checks** (all must pass, otherwise abort):
1. All requirements (REQ-xxx) confirmed ✅
2. All scenarios (SC-xxx) confirmed ✅
3. All processes (BP-xxx) confirmed ✅
4. Phase 3.6 result is PASS or CONDITIONAL_PASS

**Processing**: batch-write all confirmed items to `requirement/ledger.md`; add archiving record with `archived` frontmatter; update `doc/active-registry/active-items.md` with current active items. Exit → ce-plan.

### Phase 4: Handoff

Read `references/handoff.md` — option set, visibility conditions, dispatch instructions all live there. Pass PRD path + prototype path (if loop ran) to `ce-plan`.

## Artifact Structure

```
requirement/
├── ledger.md                          # Master ledger (all items, cross-version summary)
├── vN/                                # Iteration version
│   ├── prd.md                         # PRD document
│   ├── dialogue-log.md                # Dialogue log (Phase 1.4 output)
│   └── business-analysis.md           # Business analysis (requirements + scenarios + processes)
doc/
└── active-registry/
    └── active-items.md                # Current active items full view
```

## Status Management

Two statuses only: 🔵 pending confirmation / ✅ confirmed.

- Phase 1.5/1.6 confirmation: writes `business-analysis.md` only, no ledger update.
- Version archiving: batch-writes to `ledger.md`.

## Deprecation Handling

When a requirement/scenario/process is deprecated:
1. Remove the entry from `requirement/ledger.md`
2. Remove the entry details from `requirement/vN/business-analysis.md`
3. Update `doc/active-registry/active-items.md`
