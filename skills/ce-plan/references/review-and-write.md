# Phase 5: Review, Write, and Confidence Check

Detailed review, writing, and confidence-check logic for Phase 5.

## Review Checklist

Before finalizing, check:
- The plan does not invent product behavior that should have been defined in `ce-brainstorm`
- If there was no origin document, the bounded planning bootstrap established enough product clarity to plan responsibly
- Every major decision is grounded in the origin document or research
- Each implementation unit is concrete, dependency-ordered, and implementation-ready
- If test-first proof, characterization coverage, smoke-first verification, or another execution direction was explicit or strongly implied, the relevant units carry it forward with a lightweight natural-language `Execution note`
- Each feature-bearing unit has test scenarios from every applicable category (happy path, edge cases, error paths, integration) — right-sized to the unit's complexity, not padded or skimped
- Test scenarios name specific inputs, actions, and expected outcomes without becoming test code
- Feature-bearing units with blank or missing test scenarios are flagged as incomplete — the `Test expectation: none -- [reason]` annotation is only valid for non-feature-bearing units (pure config, scaffolding, styling)
- Deferred items are explicit and not hidden as fake certainty
- Every implementation unit that implements a session-settled decision cites the labeled KTD in its Requirements or Approach
- **High-Level Technical Design presence audit (load-bearing).** For each architecture trigger in Phase 3.4 that the plan content satisfies (3+ components with directed relationships, 3+ protocol steps, 3+ state machine states, lifecycle, 3+ decision points, 3+ data-flow stages, mode/flag combinations, DSL/API surface design, non-obvious single-component shape), verify a corresponding sketch/diagram is present in the High-Level Technical Design section. Count the firing triggers; count the sketches; the sketch count must be at least the count of distinct trigger categories that fired. Missing the section when a trigger fired, OR including the section but skipping a triggered sketch within it, is incomplete — return to Phase 3.4 and add the missing sketch. Token cost is not a valid reason to fail this check.
- If a High-Level Technical Design section is included, it uses the right medium for the work, carries the non-prescriptive framing, and does not contain implementation code
- Per-unit technical design fields, if present, are concise and directional rather than copy-paste-ready
- If the plan creates a new directory structure, would an Output Structure tree help reviewers see the overall shape?
- If Scope Boundaries lists items that are planned work for a separate PR, issue, or repo, are they under `### Deferred to Follow-Up Work` rather than mixed with true non-goals?
- U-IDs are unique within the plan and follow the stability rule — no two units share an ID; reordering or splitting did not renumber existing units; gaps from deletions are preserved
- Would a visual aid (dependency graph, interaction diagram, comparison table) help a reader grasp the plan structure faster than scanning prose alone?

If the plan originated from a requirements document, re-read that document and verify:
- The chosen approach still matches the product intent
- Scope boundaries and success criteria are preserved
- Blocking questions were either resolved, explicitly assumed, or sent back to `ce-brainstorm`
- Every section of the origin document is addressed in the plan — scan each section to confirm nothing was silently dropped
- If origin supplies A/F/AE IDs: every origin R/F/AE that *affects implementation* is referenced in Requirements, a U-ID unit, test scenarios, verification, scope boundaries, or explicitly deferred. Actors are carried forward when they affect behavior, permissions, UX, orchestration, handoff, or verification. The standard is preservation of product intent, not mandatory ID spam — irrelevant origin IDs may be omitted
- If origin was Deep-product (origin contains an `Outside this product's identity` subsection): the plan's Scope Boundaries preserves the three-way split — `Deferred for later` and `Outside this product's identity` carried verbatim from origin, `Deferred to Follow-Up Work` reserved for plan-local implementation sequencing

## Brainstorm-Sourced Scoping Synthesis (5.1.5)

Surface plan-time call-outs to the user before Phase 5.2 commits the plan to disk — the latest cheap moment to catch plan-time scope errors. The brainstorm already validated WHAT to build; this phase surfaces HOW the plan will execute on the forks that matter.

Fires **whenever Phase 0.2 resolved an upstream PRD source** — a PRD document (`requirement/vN/prd.md`) **or** a legacy `*-requirements.{md,html}` brainstorm doc — AND not on Phase 0.1 fast paths. Skip Phase 5.1.5 only in solo invocation (no upstream source found) — solo plans handled their synthesis in Phase 0.7.

**Read `references/synthesis-summary.md` before composing the scoping synthesis.**

**Required gate output — do not skip; silent proceeding is not allowed.** Compose an internal three-bucket scope draft (Stated / Inferred / Out of scope). Derive call-outs, run the pre-emit scans, then emit the **brainstorm-sourced** synthesis and **wait for user confirmation before continuing to Phase 5.2.** Its summary is two parts — a 1-2 sentence restatement of the brainstorm's scope in the brainstorm's own vocabulary, then the plan-specific scoping decisions the brainstorm did not make — each affirmable without reading code, and never an enumeration of Implementation Units, file paths, or PR/sequencing shape.

**Blocking decision:** auto-proceed only when plan depth is **Lightweight AND zero call-outs survive**. Standard and Deep always fire the confirmation gate.

**Headless / opt-in skip:** in headless mode, or when `SKIP_SCOPING_CONFIRM` resolved to skip, do not block — compose the internal draft, skip the chat-time confirmation, and route Inferred bets to a `## Assumptions` section at plan-write.

## Write Plan File (5.2)

**Reasoning elevation (Claude Code only).** Before authoring the plan, if positively Claude Code (`CLAUDECODE=1`, not Cursor/Codex), load `references/reasoning-elevation.md` and follow it. On any non-Claude host, skip it entirely.

**REQUIRED: Write the plan file to disk before presenting any options.**

HTML note: `ce-doc-review` is markdown-only today. HTML plans still render the unified artifact, but the Phase 5.3.8 document-review autofix pass is skipped for HTML by the format gate in `references/plan-handoff.md`.

Use the Write tool to save the complete plan:

```text
requirement/{ITERATION_VERSION}/plan.md
```

The plan is always written to the same `requirement/vN/` directory as the PRD, using the iteration version resolved at Phase 0.2. The plan is always markdown (`.md`).

Compose the plan using the content from `templates/plan.md` (the plan template) and the format-specific principles from the rendering reference loaded at Phase 0.0.

**Session-settled KTDs.** Author each settled decision as a labeled Key Technical Decision carrying the annotation `(session-settled: user-directed — chosen over <alternative>: <one-line reason>)` (class per `references/settled-decisions.md`: `user-directed` or `user-approved`). A KTD that instantiates a labeled Key Decision from a brainstorm-sourced Product Contract inherits the label and cites the source decision.

**HTML composition timing.** When `OUTPUT_FORMAT=html`, Phase 5.3 deepening runs before this write completes its final form, but `ce-doc-review` is skipped in HTML mode.

Confirm (use absolute path so the reference is clickable in modern terminals):

```text
Plan written to <absolute path to plan>
```

**Pipeline mode:** If invoked from an automated workflow such as LFG or any `disable-model-invocation` context, skip interactive questions. Make the needed choices automatically and proceed to writing the plan. Pipeline mode forces `OUTPUT_FORMAT=md` at Phase 0.0. Exception: when research produced invalidating evidence against any session-settled decision — do not write the plan and do not resolve silently — return a blocked report to the caller containing the token `settled-decision-invalidated`, the decision, and the reason.

**CONCEPTS.md gap-fill (only if the file already exists):** If the plan body uses a domain term whose definition is missing from `CONCEPTS.md`, add the entry. **Domain entities, named processes, and status concepts with project-specific meaning only** — not file paths, class names, function signatures, or implementation decisions. Follow the format set by existing entries. Apply silently. Skip entirely if `CONCEPTS.md` does not exist.

## Confidence Check (5.3)

After writing the plan file, automatically evaluate whether the plan needs strengthening.

**Two deepening modes:**

- **Auto mode** (default during plan generation): Runs without asking the user for approval. Sub-agent findings are synthesized directly into the plan.
- **Interactive mode** (activated by the re-deepen fast path in Phase 0.1): The user explicitly asked to deepen an existing plan. Sub-agent findings are presented individually for review before integration. The user can accept, reject, or discuss each agent's findings.

`ce-doc-review` and this confidence check are different:
- Use `ce-doc-review` when the document needs clarity, simplification, completeness, or scope control
- This confidence check strengthens rationale, sequencing, risk treatment, and system-wide thinking

**Pipeline mode:** This phase always runs in auto mode in pipeline/disable-model-invocation contexts.

### 5.3.1 Classify Plan Depth and Topic Risk

Determine the plan depth from the document:
- **Lightweight** - small, bounded, low ambiguity, usually 2-4 implementation units
- **Standard** - moderate complexity, some technical decisions, usually 3-6 units
- **Deep** - cross-cutting, high-risk, or strategically important work, usually 4-8 units or phased delivery

Build a risk profile. Treat these as high-risk signals:
- Authentication, authorization, or security-sensitive behavior
- Payments, billing, or financial flows
- Data migrations, backfills, or persistent data changes
- External APIs or third-party integrations
- Privacy, compliance, or user data handling
- Cross-interface parity or multi-surface behavior
- Significant rollout, monitoring, or operational concerns

### 5.3.2 Gate: Decide Whether to Deepen

- **Lightweight** plans usually do not need deepening unless they are high-risk
- **Standard** plans often benefit when one or more important sections still look thin
- **Deep** or high-risk plans often benefit from a targeted second pass
- **Thin local grounding override:** If Phase 1.2 triggered external research because local patterns were thin (fewer than 3 direct examples or adjacent-domain match), always proceed to scoring regardless of how grounded the plan appears.
- **Load-bearing external research override:** If Phase 1.4 marked external research as load-bearing, always proceed to scoring — **even when local implementation patterns are strong**.

If the plan already appears sufficiently grounded and neither override applies, report "Confidence check passed — no sections need strengthening", then **load `references/plan-handoff.md` now and execute 5.3.8 → 5.3.9 → 5.4 in sequence**. Document review is mandatory for markdown plans — do not skip it because the confidence check passed.

### 5.3.3–5.3.7 Deepening Execution

When deepening is warranted, read `references/deepening-workflow.md` for confidence scoring checklists, section-to-agent dispatch mapping, execution mode selection, research execution, interactive finding review, and plan synthesis instructions. Execute steps 5.3.3 through 5.3.7 from that file, then return for 5.3.8.

### 5.3.8–5.4 Document Review, Final Checks, and Post-Generation Options

**Load `references/plan-handoff.md` now before continuing.** It carries the full instructions for 5.3.8 (document review), 5.3.9 (final checks and cleanup), and 5.4 (post-generation handoff, including the Publish to Proof flow and Issue Creation branching). **This load is non-optional.**
