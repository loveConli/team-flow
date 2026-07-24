---
name: ce-plan
description: "Create structured implementation plans based on PRD documents. Use when asked to plan, break down implementation, plan from requirements, or deepen an existing plan; prefer ce-brainstorm for exploratory framing."
argument-hint: "[optional: feature description, PRD doc path, plan path to deepen, or any task to plan] [output:html]"
---

# Create Implementation Plan

**Note: The current year is 2026.** Use this when dating plans and searching for recent documentation.

## Purpose

`ce-plan` produces an **independent implementation plan** (实施方案) from a PRD or any input, defining **HOW** to build what `ce-brainstorm` scoped as **WHAT**. The PRD and plan are separate documents in the same `prd/vN/` directory. `ce-work` executes implementation-ready plans. A prior brainstorm is useful context but never required.

**v0.5 scope**: ce-plan focuses on **product-level strategy** — change splitting (scope + dependencies + priority per change), inter-change dependency graph (DAG), and overall technical direction. It does NOT produce file-level Implementation Units, Files lists, or Test scenarios — those belong to spec-writer within each change.

## When to Use

- User asks to plan, break down implementation, or plan from requirements
- User wants to deepen an existing plan
- A PRD exists and the next step is implementation planning
- **When directly invoked, always plan.** Never abandon the workflow. If input is unclear, ask or bootstrap — but stay in planning.

This workflow does **not** implement code, run tests, or learn from execution results.

## Planning Modes

Two modes, selected at Phase 0.2:
- **业务模式 (Business Mode)** — business-oriented roadmap: task breakdown, acceptance criteria, non-functional requirements. No technical architecture.
- **一人公司模式 (Solo-Founder Mode)** — business mode **plus** tech stack, architecture, data model, API design.

See `references/planning-modes.md` for mode selection logic and PRD chapter mapping.

## Core Workflow

### Phase 0: Resume, Source, and Scope

1. Resolve `OUTPUT_FORMAT` (md/html) and `SKIP_SCOPING_CONFIRM`. See `references/intake-routing.md` § Output Mode Resolution.
2. If an existing plan is referenced, resume or deepen it. "Deepen" → fast path to Phase 5.3. See `references/intake-routing.md` § Resume and Deepen.
3. Recognize approach-altitude requests → read `references/approach-altitude.md`.
4. Classify task domain: software → continue; non-software → route to `references/universal-planning.md` and skip all subsequent phases.
5. Find upstream PRD (explicit path → scan `prd/` → legacy `docs/brainstorms/`). Select planning mode.
6. Read PRD as primary input; carry forward business requirements. See `references/planning-modes.md` § PRD Input.
7. If no requirements doc, run the planning bootstrap. See `references/intake-routing.md` § Bootstrap.
8. Classify outstanding questions; surface true product blockers before proceeding.
9. Assess plan depth: Lightweight / Standard / Deep.
10. Solo invocation (no PRD source): run scoping synthesis, wait for confirmation. See `references/synthesis-summary.md`.

### Phase 1: Gather Context

1. Prepare a planning context summary. Run local research in parallel: `references/agents/repo-research-analyst.md` + `references/agents/learnings-researcher.md`. Conditionally dispatch agent-native planning strategist.
2. Detect execution direction signals (TDD, characterization-first, smoke-first).
3. Decide on external research via 3-stage logic (explicit request → intent classification → implicit signals). Dispatch by intent. See `references/research-workflow.md`.
4. Consolidate findings. Land external findings in decisions, not an appendix. Read `docs/solutions/INDEX.md` if it exists (filter `phase = plan | cross-phase`).
5. Reclassify Lightweight → Standard if external contract surfaces are touched. For Standard/Deep, run flow analysis via `references/agents/spec-flow-analyzer.md`.

### Phase 2: Resolve Planning Questions

1. Build a question list from origin gaps, research gaps, and technical decisions needed.
2. For each: resolve during planning OR defer to implementation.
3. Ask the user only when the answer materially affects architecture, scope, sequencing, or risk.
4. Never re-ask a session-settled decision (see `references/settled-decisions.md`). Scaffold questions on unfamiliar territory with options + recommended default.
5. Do **not** run tests, build the app, or probe runtime behavior.

### Phase 3: Structure the Plan

1. Title: `{项目名称} - 实施方案`. File: `prd/{ITERATION_VERSION}/plan.md`.
2. Break work into **changes** (C1, C2, …) — focused, independently implementable, dependency-ordered. See `references/change-splitting.md`.
3. Include a change dependency DAG for 2+ changes. See `references/dependency-graph.md`.
4. Define each change: Scope, Requirements (cite PRD §), Dependencies (C-ID), Priority (P0/P1/P2), Complexity (S/M/L), Prototype reference.
5. Include High-Level Technical Design when material. Separate planning-time unknowns from tangential cleanup. See `references/plan-structure.md`.

### Phase 4: Write the Plan

**NEVER CODE during this skill.**

1. Apply depth guidance (Lightweight: compact / Standard: full template / Deep: full + extensions).
2. Compose using `references/plan-sections.md` (section contract) + the format-rendering reference loaded at Phase 0.0 (`references/markdown-rendering.md` or `references/html-rendering.md`).
3. Follow planning rules: repo-relative paths, no implementation code, pseudo-code as directional guidance only. See `references/plan-structure.md` § Writing Rules.
4. Fill mode-specific sections. See `references/planning-modes.md` § Plan Composition.

### Phase 5: Review, Write, and Handoff

1. Run the pre-write review checklist. See `references/review-and-write.md` § Review Checklist.
2. Brainstorm-sourced plans: run scoping synthesis gate. See `references/synthesis-summary.md`.
3. **Write the plan file to disk** — REQUIRED before presenting any options. See `references/review-and-write.md` § Write Plan File.
4. Run confidence check (depth/risk → deepen gate). If warranted, execute deepening per `references/deepening-workflow.md`. See `references/review-and-write.md` § Confidence Check.
5. **Load `references/plan-handoff.md`** — non-optional. Execute 5.3.8 (doc review) → 5.3.9 (final checks) → 5.4 (handoff menu).
6. Present: "Plan ready at `<absolute path>`. What would you like to do next?"

## Guardrails

1. **PRD is source of truth** — plan is independent; never modify the PRD.
2. **Decisions, not code** — no implementation code, imports, or exact signatures.
3. **Research before structuring** — explore codebase, learnings, external guidance first.
4. **Right-size the artifact** — compact for small work, structured for large.
5. **Separate planning from execution discovery** — defer execution-time unknowns explicitly.
6. **Keep the plan portable** — no tool-specific executor instructions.
7. **All file paths repo-relative** — never absolute paths.
8. **Honor user-named resources** — treat named CLIs, URLs, files as authoritative; discover before assuming unavailable.

See `references/core-principles.md` for the full principle set, quality bar, and task visibility rules.

## Output Standard

Every plan must contain: clear problem frame and scope boundary; requirements traceability; repo-relative file paths; decisions with rationale; existing patterns to follow; clear dependencies and sequencing; change definitions with C-IDs, scope, priority, and complexity. A plan is ready when an implementer can start confidently.

## Interaction Method

Use the platform's blocking question tool (`AskUserQuestion` in Claude Code, `request_user_input` in Codex, `ask_question` in Antigravity CLI, `ask_user` in Pi). Ask one question at a time. Fall back to numbered options only when no blocking tool exists. Never silently skip a question.

## Completion Contract

Every software implementation-plan run is incomplete until the Phase 5.4 handoff menu is presented **and** the user's selected action is executed. Writing the plan and running reviews are intermediate milestones, not completion. Pipeline mode (LFG / `disable-model-invocation`) is the exception — the caller owns the next step. See `references/completion-contract.md` for the full contract.
