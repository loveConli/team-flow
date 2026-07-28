---
name: need-explorer
description: Change-level requirement exploration, routed by workflow-start within a team-flow change. Clarify intent, scope, constraints, and success criteria before artifact creation. NOT for product-level requirements (use workflow-orchestrator). Invoke only when inside a change context and the request is fuzzy, the user is comparing options, or the workflow needs a stable change definition before writing artifacts.
---

# Need Explorer

Turn a rough idea into a stable change definition before writing artifacts.

## Primary Goal

Agree on: problem, scope, non-goals, success criteria, whether to split before specification.

## Process

### 1. Inspect Context First

Before asking questions, understand what exists and what constraints are in place.

### 1.5 Upstream Inheritance (v0.9)

若 `change-brief.md` 存在（本 change 由 workflow-orchestrator S4 分发），**先读它再提问**：把 brief 的 Scope / 约束 / AC 列表作为提问的**默认值**，只就 brief 未覆盖或用户存疑的部分追问，**不**重新询问已被产品级定稿的意图与 scope。若 brief 不存在（手动新建 / 快速通道），按原流程从零探索。brief 与 `prd/vN/plan.md` 冲突时以 plan.md 为准。

### 2. One Question at a Time

Ask a single clear question, wait for the answer, digest, then ask the next. Never ask 3+ questions at once. Each answer informs the next question.

### 3. Prefer Multiple-Choice Questions

Present 2-3 options when reasonable answers are finite. This reduces cognitive load and surfaces unconsidered choices.

### 4. Propose 2-3 Approaches with Trade-Offs

For each approach: what it is, upside, downside, best-for. Then **recommend one** and explain why. Never present a single path — always name at least one alternative.

### 5. Validate Before Concluding

Restate what you heard: "Here's what I'm hearing: [problem, scope, non-goals, success criteria]. Does this match?" Incorporate corrections and re-validate.

### 6. DP-1: Requirement Confirmation Gate

After user confirms the summary:
```bash
npx --yes --package @xulthekl/team-flow@0.24.0 tf state set <change-dir> dp_1_result "confirmed: <one-line summary>"
npx --yes --package @xulthekl/team-flow@0.24.0 tf state set <change-dir> dp_1_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```
DP-1 confirms scope, non-goals, and success criteria before artifact creation.

### 7. Hand Off

Once DP-1 is recorded, hand off to `spec-writer`.

## Anti-Patterns

- **Skipping exploration**: "Simple" changes have scope too. Five minutes of exploration prevents two hours of rework.
- **Proposing solutions before clarifying**: If the user says "add caching," first ask what problem caching solves.
- **Exploring indefinitely**: Stop when change name, problem statement, scope, non-goals, success criteria, and decomposition decision are all clear.

## Exploration Standard

You must leave exploration with: a usable change name, a crisp problem statement, scope boundaries, non-goals, success criteria, and a decomposition decision (one change or split).

**Decomposition 默认采纳产品级拆分 (v0.9)**：当 brief 存在时，本 change 已是 PRD 经 ce-plan + change-split-auditor 拆出的独立单元，decomposition decision **默认 = 不再二次拆分**（继承产品级结论）。用户仍可显式提出再拆分，但需明确确认并说明理由——变更层不应静默推翻产品级拆分决策。

## Strong Rule

Do not produce implementation code. This skill stabilizes intent, not builds.

## Self-Review Before Handoff

1. **Placeholder scan**: No "probably", "maybe", "TBD", or "we'll figure it out later"
2. **Contradiction check**: No scope items conflicting with non-goals or constraints
3. **Scope check**: Can a developer draw a bright line between in and out?

## Exception Handling

- **Parse failures**: Report the specific file, proceed with available information
- **Missing files**: Note absent essential files as constraints, continue
- **User interruption**: Exploration is stateless — on resume, re-ask the current question
