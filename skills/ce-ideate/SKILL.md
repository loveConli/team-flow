---
name: ce-ideate
description: "Generate and evaluate grounded ideas. Use when the user asks for ideas, improvements, surprising options, or AI-generated directions before choosing one to develop; use ce-brainstorm to refine the user's own idea."
argument-hint: "[feature, focus area, or constraint] [output:md]"
---

# Generate Improvement Ideas

**Note: The current year is 2026.** Use this when dating ideation documents.

`ce-ideate` precedes `ce-brainstorm`.

- `ce-ideate` answers: "What are the strongest ideas worth exploring?"
- `ce-brainstorm` answers: "What exactly should one chosen idea mean?"
- `ce-plan` answers: "How should it be built?"

This workflow produces a ranked ideation artifact — written to `docs/ideation/` when present, else a CE temp path (see Phase 4). It does **not** produce requirements, plans, or code.

## Interaction Method

Use the platform's blocking question tool: `AskUserQuestion` in Claude Code, `request_user_input` in Codex, `ask_question` in Antigravity CLI, `ask_user` in Pi. Fall back to numbered options in chat only when no blocking tool exists. Never silently skip the question. Ask one question at a time. Prefer concise single-select choices when natural options exist.

## Focus Hint

The **focus hint** is any optional context this skill was invoked with — a concept (`DX improvements`), a path (`skills/`), a research artifact, a constraint (`low-complexity quick wins`), or a volume hint (`top 3`, `100 ideas`). If no argument is provided, proceed with open-ended ideation.

## Core Principles

1. **Ground before ideating** — Scan the actual codebase first. Do not generate abstract product advice detached from the repository.
2. **Generate many → critique all → explain survivors only** — Quality mechanism is explicit rejection with reasons, not optimistic ranking.
3. **Route action into brainstorming** — Ideation identifies promising directions; `ce-brainstorm` defines the selected one precisely enough for planning.

## Model Tiers

Sub-agent dispatch is tiered by task shape, never hardcoded to a model name:

- **Extraction tier** — evidence scouts and retrieval work. Use cheapest capable model.
- **Generation tier** — evidence-driven ideation frames and basis verification. Use mid-tier model.
- **Ceiling tier** — ceiling ideation frames, cross-cutting synthesis, final arbitration. Inherit orchestrator's model.

**Degradation rule.** When subagent primitive does not support per-agent model selection, dispatch everything on the inherited model and keep read budgets and dossier caps.

Two overrides raise the whole fleet to ceiling tier: surprise-me mode and the `go deep` depth override.

## Execution Flow

### Phase 0: Resume and Scope

When subject, mode, and format are already clear, resolve in one pass. For detailed routing logic, read `references/phase0-scope.md`. Summary:

- **0.0 Output Mode**: resolve `OUTPUT_FORMAT` (default `html`, pipeline forces `md`)
- **0.1 Recent Work**: scan `docs/ideation/` for recent ideation docs; offer to continue or start fresh
- **0.2 Subject Gate**: identify subject (specified / surprise-me / cancel); detect issue-tracker intent
- **0.3 Mode Classification**: repo-grounded / elsewhere-software / elsewhere-non-software
- **0.4 Context Gate** (elsewhere only): collect substance via URL, description, or paste
- **0.5 Focus & Volume**: interpret focus context, volume override, depth override, tactical scope
- **0.6 Cost Transparency**: surface agent count and cost shape before dispatching Phase 1

### Phase 1: Mode-Aware Grounding

Gather grounding before generating ideas. Dispatch set depends on Phase 0.3 mode. For detailed agent prompts, scratch directory setup, and consolidated grounding summary structure, read `references/grounding.md`.

**Repo mode**: quick context scan + learnings search + web research + issue intelligence (conditional). **Elsewhere mode**: user-context synthesis + learnings (elsewhere-software only) + web research.

**Surprise-me**: produce richer material — Phase 2 sub-agents will discover their own subjects from Phase 1 returns.

**Web research**: always-on, honor skip phrases. Reuse prior research via sidecar cache (see `references/web-research-cache.md`).

**User-supplied research artifacts**: evidence files (surveys, analytics, social-listening reports) route through distillation sub-agents, not the quick context scan.

### Phase 1.5: Topic-Surface Decomposition

Decompose the topic into 3-5 orthogonal **axes** naming *what aspects to think about*. For axis criteria, worked examples, skip conditions, and evidence scout prompts, read `references/topic-surface.md`.

Skip when: atomic subject (cannot generate 3+ orthogonal axes), surprise-me mode, or elsewhere modes.

### Phase 2: Divergent Ideation

Generate the full candidate list before critiquing any idea.

**Read `references/divergent-ideation.md` now** — before building any ideation dispatch prompt. This load is non-optional. The file contains fleet tiering, dispatch payload structure, ambition charter, six ideation frames, per-idea output contract, generation rules, issue-tracker and surprise-me variants, and post-merge synthesis — none of which appear in this main body.

After merge, synthesis, and axis-coverage steps complete — and before writing and presenting the deliverable — **load `references/post-ideation-workflow.md`**. This load is non-optional. The file contains adversarial filtering rubric, auto-write + summary flow (Phase 4), artifact section contract, quality bar, and canonical Phase 5 menu (Open / Brainstorm one idea / Discuss or refine / Done).

Do not load `post-ideation-workflow.md` before Phase 2 agent dispatch completes.
