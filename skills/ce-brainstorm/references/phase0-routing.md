# Phase 0 Routing — Sub-phases 0.1 through 0.5

Detailed routing logic for Phase 0 sub-phases. Phase 0.0 (output format + template resolution) lives in `output-format.md` and the main SKILL.md.

## 0.1 Resume Existing Work When Appropriate

If the user references an existing brainstorm topic or document, or there is an obvious recent matching PRD:
- **Scan `requirement/` first** for existing iteration versions (v1, v2, ...)
- **Legacy fallback**: if `requirement/` does not exist, scan `prd/` for existing versions
- Read the latest PRD document
- Confirm with the user before resuming: "Found an existing PRD for [topic]. Should I continue from this, or start fresh?"
- If resuming, summarize the current state briefly, continue from its existing decisions and outstanding questions, and update the existing document instead of creating a duplicate
- **Resume preserves the existing artifact's format, except pipeline mode.** Write back in whatever format the existing artifact uses — markdown if `.md`, HTML if `.html`. Explicit `output:` arguments override. Pipeline mode always forces `OUTPUT_FORMAT=md`.

**`requirement/` is the authoritative source (v0.43.0+).** Scan `requirement/` for existing iteration versions (v1, v2, …). If `requirement/ledger.md` exists, read it to understand cross-iteration context — archived versions, entry statuses, and the overall requirement trajectory. When both `requirement/` and legacy `prd/` exist, merge signals from both (dedup by version number); when only `requirement/` exists, treat it as the authoritative source for resume decisions. **Do not create `prd/` directory for new projects.**

Historical `docs/brainstorms/*-requirements.{md,html}` files remain legacy inputs for `ce-plan`. New outputs write to `requirement/{ITERATION_VERSION}/prd.md`.

## 0.1b Classify Task Domain

Before proceeding to Phase 0.2, classify whether this is a software task. The key question is: **does the task involve building, modifying, or architecting software?** — not whether the task *mentions* software topics.

**Software** (continue to Phase 0.2) — the task references code, repositories, APIs, databases, or asks to build/modify/debug/deploy software.

**Non-software brainstorming** (route to universal brainstorming) — BOTH conditions must be true:
- None of the software signals above are present
- The task describes something the user wants to explore, decide, or think through in a non-software domain

**Neither** (respond directly, skip all brainstorming phases) — the input is a quick-help request, error message, factual question, or single-step task.

**Verdict-shape carve-out — do not exit before the 0.1c gate.** A request weighing whether to **adopt / switch to / replace** a *named external technology, library, pattern, platform, or architecture* for this project is a **software** decision. Classify it as **Software** and continue so the 0.1c gate can catch it.

**If non-software brainstorming is detected:** Read `references/universal-brainstorming.md` now and follow it — it replaces Phases 0.2–4 entirely. The non-software route does **not** write a PRD document. The **Core Principles and Interaction Rules still apply unchanged**.

## 0.1c Route a Verdict Question to ce-pov

A brainstorm scopes **what to build** once a direction is chosen. Deciding **whether to adopt, switch to, or replace** a *specific named external candidate* judged against this project is `ce-pov`'s purpose.

**The verdict shape — all three hold:** a **named external candidate**; a **whether-to-commit intent** (adopt / switch to / migrate / replace / is-it-time-for / revisit); judged **against this project** (fit, migration cost, worth it here).

When the shape matches — at intake, or whenever later dialogue clarifies a request into it — read `references/verdict-routing.md` and follow it: offer the `/ce-pov` handoff interactively (never silently switch), invoke `ce-pov` on accept, drop the offer and continue unchanged on decline.

## 0.2 Assess Whether Brainstorming Is Needed

**Clear requirements indicators:**
- Specific acceptance criteria provided
- Referenced existing patterns to follow
- Described exact expected behavior
- Constrained, well-defined scope

**If requirements are already clear:**
Keep the interaction brief. Skip Phase 1.1 and 1.2 entirely — still classify tier in Phase 0.3, then go straight to Phase 1.3 or Phase 2.5 and follow `references/synthesis-summary.md`'s Path A / Path B gate exactly. Do not assume the synthesis is announce-only: a richly pre-loaded prompt classifies as Standard or Deep, which routes to Path B.

## 0.3 Assess Scope

Use the feature description plus a light repo scan to classify the work:
- **Lightweight** — small, well-bounded, low ambiguity
- **Standard** — normal feature or bounded refactor with some decisions to make
- **Deep** — cross-cutting, strategic, or highly ambiguous

If the scope is unclear, ask one targeted question to disambiguate.

**Deep sub-mode: feature vs product.** For Deep scope, also classify whether the brainstorm must establish product shape or inherit it:

- **Deep — feature** (default): existing product shape anchors decisions. The brainstorm extends or refines within that shape.
- **Deep — product**: the brainstorm must establish product shape. Primary actors, core outcome, positioning, or primary end-to-end flows are materially unresolved.

Product-tier triggers additional Phase 1.2 questions and additional Product Contract sections.

**Visual probe tripwire.** If the feature is inherently visual or spatial — drawing/canvas tools, annotation behavior, visual editors, UI layout or navigation, interaction states, charts, diagrams, animation, maps, timelines, or spatial flows — read `references/visual-probes.md` now. Loading the reference here is readiness only; it owns when the gate fires.

**Unfamiliarity tripwire.** If the user signals they lack working knowledge of the domain — "I know nothing about X", "never touched the auth modules" — read `references/blindspot-pass.md` now. Loading here is readiness only; the reference owns when the offer fires.

## 0.4 Surface the Workflow Spine

For **Standard and Deep** scope, use the platform's task-tracking capability when available. Skip for Lightweight and on the non-software route.

The spine is five tasks, in order:
1. Check what already exists
2. Ask scoping questions
3. Weigh approaches and recommend
4. Confirm scope before writing
5. Write the PRD document

**Conditional work earns a task only when its gate fires** — never at creation. A branch earns one when the user is waiting on it or would be surprised. Insert at the position where it runs.

**Name every task** verb first, five words or fewer, naming the outcome — not the phase or tool. `Verify claims against the code`, not `Phase 2.6 claim verification`.

**When a gate resolves such that a listed task will not run, record the skip** — never mark it plainly complete. Use `cancelled`/`skipped` status, or rename to name the skip, or delete. Say why in the conversation.

## 0.5 Resolve Iteration Version

**Scan `requirement/` first** to detect existing iteration versions (v1, v2, v3, ...).
- **Legacy fallback**: if `requirement/` does not exist, scan `prd/` for iteration versions.
- When both `requirement/` and legacy `prd/` exist, union the detected versions (dedup by version number) and pick the highest as baseline for the next version number.
- If only `requirement/` exists, derive the new version from its latest entry (e.g., `requirement/v2/` → suggest v3).
- If no iterations exist in either directory: suggest creating v1, ask user to confirm. **Only create `requirement/vN/` — do not create `prd/` directory.**
- If iterations exist: suggest the latest iteration, offer to continue or create new
- User confirms the target iteration version
- Store as `ITERATION_VERSION` (e.g., "v1", "v2")
- **Target PRD path: `requirement/{ITERATION_VERSION}/prd.md`**
- **Legacy `prd/` compatibility:** projects migrating from `prd/` to `requirement/` may have both directories. Treat `prd/v1` and `requirement/v1` as the same logical iteration; do not create a duplicate version number. When reading from legacy `prd/` projects, continue to read existing files there but write new outputs to `requirement/`.
- Scan `prototype/` directory to confirm prototype branch aligns with PRD iteration version (if prototype exists).
