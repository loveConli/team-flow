# Phase 0: Intake Routing

Detailed routing logic for Phase 0 (Resume, Source, and Scope).

## Output Mode Resolution

Determine `OUTPUT_FORMAT` before any other phase fires. Output mode is **exclusive** — the plan is written as either markdown (`.md`) OR HTML (`.html`), never both. Precedence: in-prompt request > user-stated preference > config > default (`md`), with a hard pipeline-mode override.

**Read config.** Resolve `<repo-root>` at runtime by running `git rev-parse --show-toplevel` with the shell tool. Then read `<repo-root>/.compound-engineering/config.local.yaml` with the native file-read tool. If the root cannot be resolved (not a git repo) or the file does not exist, fall through to the defaults below.

Resolution steps:

1. **In-prompt request.** Reason over the user's prompt for this run for a request about *this document's* output format, expressed either as the `output:` shorthand or in plain language ("make the plan a webpage", "I want this in HTML"). On an explicit format, match it case-insensitively to `md`/`html`, and ignore the `output:` shorthand token when reading the rest of the prompt as the feature description. Distinguish a request about the document's format from a format named as subject matter: "add an HTML export feature" or "plan the CSV importer" is the work, not a doc-format request — do not switch on it.
   - `output:` alone (no value) → no-op, fall through to step 2.
   - `output:<unknown>` (e.g., `output:pdf`) → drop the token, fall through to step 2, and remember to emit a one-line note above the post-generation menu after final resolution: `Ignored unknown output: value '<value>' — using <resolved_format> instead.` where `<resolved_format>` is the value `OUTPUT_FORMAT` actually resolved to after the remaining precedence steps. Do not hardcode `md` in the note — that misleads users when config has set HTML.
2. **User-stated preference.** If this prompt holds no format request, honor an output-format preference (markdown vs HTML) the user established earlier — earlier in this session, in your memory, or written into their active instructions — that is already in your context (match `md`/`html` case-insensitively). A remembered preference is more current than the rarely-edited config, so it **overrides** the config in step 3. Do not open or search instruction files to find it — act only on a preference already present in your context; if none is, fall through to the config.
3. **Config.** If steps 1-2 did not resolve and the config file read above has an **active (non-commented)** `plan_output:` key whose value matches `md` or `html` (case-insensitive), use it. Missing, invalid, or commented values fall through silently. Critical: lines starting with `#` are YAML comments and must be ignored — the shipped config template includes commented examples like `# plan_output: html` to document the option, and matching those as active settings would silently force HTML mode on every run without the user having opted in.
4. **Default.** Otherwise `OUTPUT_FORMAT=md`.
5. **Pipeline override.** When invoked from LFG or any `disable-model-invocation` context, force `OUTPUT_FORMAT=md` regardless of steps 1-4. `ce-work` and other automated downstream consumers parse markdown reliably; HTML in pipeline runs is unnecessary friction.

**Token-parsing convention:** only literal-prefix flag tokens (`output:`, `mode:`, the exact `confirm:auto`/`confirm:ask` forms, `delegate:` where applicable) are consumed and stripped. Other `<word>:<word>` tokens — including conventional commit prefixes like `feat:`, `fix:`, `chore:`, and any unrecognized `confirm:<value>` (e.g., a `confirm: delete-account modal` feature description) — pass through verbatim.

**Load the format-rendering reference based on the resolved value.** Section content is the same in either format; presentation differs. Both references are paired with `references/plan-sections.md`, which describes what the plan contains regardless of format.

- When `OUTPUT_FORMAT=md`, read `references/markdown-rendering.md` for format principles.
- When `OUTPUT_FORMAT=html`, read `references/html-rendering.md` for format principles.

## Scoping-Confirmation Setting

Also before any gate fires, determine `SKIP_SCOPING_CONFIRM` (boolean, default `false`) — whether the pre-plan scoping-synthesis confirmation gates (Phase 0.7 solo, Phase 5.1.5 brainstorm-sourced) proceed without waiting for the user. This skips **only** that scoping confirmation; it never suppresses genuine blocking questions (Phase 0.4 routing, Phase 0.5 product blockers, Phase 2 architecture questions, source-doc disambiguation) or the Phase 5.4 post-generation menu. Precedence mirrors output mode:

1. **In-prompt request.** `confirm:auto` skips the gate for this run; `confirm:ask` forces it on for this run. Honor an equivalent plain-language instruction the same way ("just write it, don't ask me to confirm" → skip; "ask me before writing the plan" → ask). Consume and strip the token **only** for the two recognized values `confirm:auto` and `confirm:ask`. A bare `confirm:` or any other value (e.g., `confirm:delete-account`) is **not** a flag — leave it verbatim in the feature description and fall through (this is narrower than `output:`, which strips unknown values: `confirm` has only two valid values, and a description can legitimately begin with a word like "confirm:").
2. **User-stated preference.** Honor a scoping-confirmation preference the user established earlier — earlier in this session, in your memory, or written into their active instructions — that is already in your context (e.g., a remembered "stop asking me to confirm plan scope"). A remembered preference overrides the config key. Do not open or search instruction files to find it — act only on a preference already present in your context.
3. **Config.** An **active (non-commented)** `plan_skip_scoping_confirm:` key matching `true`/`false`. Commented (`#`-prefixed) or invalid values fall through silently.
4. **Default.** Otherwise `ask` — the gate fires per the existing tier rules.

Pipeline / `disable-model-invocation` runs already skip the chat confirmation (headless mode), so this setting is moot there.

## Resume and Deepen

### Resume Existing Plan Work

If the user references an existing plan file or there is an obvious recent matching plan in `prd/vN/plan.md`:
- Read it
- Confirm whether to update it in place or create a new plan
- If updating, revise only the still-relevant sections. Plans do not carry per-unit progress state — progress is derived from git by `ce-work`, so there is no progress to preserve across edits

**A PRD document is not a resume target.** A `prd/vN/prd.md` file is a *PRD input*, not an existing plan to resume — do **not** fire the update-or-create confirm for it. Fall through to Phase 0.2, which reads it as input for creating a new plan. This matters most for the hands-off `ce-brainstorm` -> `lfg` flow: `lfg` hands `ce-plan` the PRD path in `disable-model-invocation` pipeline mode, where no user is present to answer a resume prompt.

### Deepen Intent

The word "deepen" (or "deepening") in reference to a plan is the primary trigger for the deepening fast path. When the user says "deepen the plan", "deepen my plan", "run a deepening pass", or similar, the target document is a **plan** in `prd/vN/plan.md`, not a PRD document. Use any path, keyword, or context the user provides to identify the right plan. If a path is provided, verify it is actually a plan document. If the match is not obvious, confirm with the user before proceeding.

Words like "strengthen", "confidence", "gaps", and "rigor" are NOT sufficient on their own to trigger deepening. These words appear in normal editing requests ("strengthen that section about the diagram", "there are gaps in the test scenarios") and should not cause a holistic deepening pass. Only treat them as deepening intent when the request clearly targets the plan as a whole and does not name a specific section or content area to change — and even then, prefer to confirm with the user before entering the deepening flow.

Once the plan is identified and appears complete (all major sections present, implementation units defined):
- **Routing is keyed on file extension first, then frontmatter.** HTML plans (`.html`) are always software plans — the html-rendering invariant forbids YAML frontmatter, so frontmatter absence is not a non-software signal for HTML. Treat the visible-header metadata (title, date) as the frontmatter equivalent.
  - **`.html` plan:** short-circuit to Phase 5.3 (Confidence Check and Deepening) in **interactive mode**. Never route to `references/universal-planning.md` based on missing YAML.
  - **`.md` plan WITH YAML frontmatter:** short-circuit to Phase 5.3 in **interactive mode**.
  - **`.md` plan WITHOUT YAML frontmatter** (non-software plans use a simple `# Title` heading with `Created:` date instead): route to `references/universal-planning.md` for editing or deepening instead of Phase 5.3. Non-software plans do not use the software confidence check.

The Phase 5.3 short-circuit avoids re-running the full planning workflow and gives the user control over which findings are integrated.

Normal editing requests (e.g., "update the test scenarios", "add a new implementation unit", "strengthen the risk section") should NOT trigger the fast path — they follow the standard resume flow.

If the plan already has a `deepened: YYYY-MM-DD` frontmatter field and there is no explicit user request to re-deepen, the fast path still applies the same confidence-gap evaluation — it does not force deepening.

**Resume preserves the existing artifact's format, except pipeline mode.** When resuming an existing plan, the resume run writes back in whatever format the existing artifact uses — markdown if the existing file is `.md`, HTML if it is `.html` — so a resume doesn't silently change the artifact shape. Explicit `output:` arguments on this run override (e.g., resuming an `.html` plan with `output:md` switches the artifact to markdown). Pipeline mode (LFG, any `disable-model-invocation` context) always wins per Phase 0.0: even when resuming an existing `.html` plan, pipeline runs force `OUTPUT_FORMAT=md` so downstream automation receives the markdown shape it expects. The resume rewrites the markdown file at the parallel path (`<plan-basename>.md`) and the original `.html` is left in place untouched.

## Approach-Altitude Requests

Some requests are better answered one level up: produce a grounded **approach-plan** — a plan for *how the deliverable will be made* — and hold there, rather than zero-shotting the deliverable. This runs **after** Phase 0.1's resume and deepen fast paths and **before** Phase 0.1b's domain split.

Two entries, with very different gating:

**Explicit (always honored, ungated).** When the user asks for the approach itself — "plan for a plan", "plan the approach", "plan how you'll do X", "don't do it yet -- just plan how you'd approach it" — enter approach altitude and hold at the approach. Do NOT begin the deliverable.

**Proactive (rare, conservative).** When the user gives a plain request with no approach-language, offer an approach-plan **only when both of these are clearly high**:
- **Method uncertainty** — the *core* approach is genuinely unsettled (not merely routine sequencing/rollout variants).
- **Cost of getting it wrong** — the deliverable is expensive or slow to produce and a wrong approach wastes real effort.

If either is low, **stay silent and plan/do normally.** When borderline, stay silent. The offer is a **single dismissible line** — never a blocking question, never a ceremony.

On entry (explicit, or an accepted offer), read `references/approach-altitude.md` and follow it. Otherwise continue to Phase 0.1b unchanged.

Full distinctions: `references/approach-altitude.md`.

## Domain Classification

If the task asks to build, modify, refactor, deploy, or architect software (code, schemas, infrastructure), continue to Phase 0.2.

Classify by task-type, not topic. A request that merely *references* code, a repo, an API, or a database is not automatically software work: building or modifying code is software; investigating or analyzing it is an answer-seeking question. "How often does X star repos — is it a big deal?" or "how does our approach compare to Y?" route to `references/universal-planning.md` (answer-seeking), not the implementation-plan path.

If the domain is genuinely ambiguous (e.g., "plan a migration" with no other context), ask the user before routing.

Otherwise, read `references/universal-planning.md` and follow that workflow instead. Skip all subsequent phases. Named tools or source links don't change this routing — they're inputs, handled per Core Principle 8.

## PRD Source Resolution

Before asking planning questions, resolve the upstream PRD source in this order:

1. **Explicit path from the user.** If it points to a PRD document (`prd/vN/prd.md`), read it as the primary input. If it points to an existing plan (`prd/vN/plan.md`), treat it as a resume/deepening target. If it is a legacy `docs/brainstorms/*-requirements.{md,html}` file, use it as a legacy origin.
2. **Recent PRD documents.** Scan `prd/` directory for iteration versions (v1, v2, ...). For each version, check if `prd.md` exists. Use the latest version's PRD as input.
3. **Legacy requirements docs.** Search `docs/brainstorms/` for files matching `*-requirements.md` or `*-requirements.html`. These remain readable historical inputs; do not migrate or rewrite them.

**Relevance criteria:** A PRD source is relevant if:
- The topic semantically matches the feature description
- It was created within the last 30 days (use judgment to override if the document is clearly still relevant or clearly stale)
- It appears to cover the same user problem or scope

If multiple source documents match, ask which one to use using the platform's blocking question tool when available. Otherwise, present numbered options in chat and wait for the user's reply before proceeding.

**Session-settled decisions are an input tier alongside the document sources above.** Decisions already examined-and-chosen in the invoking conversation — or carried in a distilled brief passed as invocation input — enter planning as settled constraints, not open questions. Read `references/settled-decisions.md` before classifying conversation-carried decisions.

## Bootstrap

### Planning Bootstrap (No Requirements Doc or Unclear Input)

If no relevant requirements document exists, or the input needs more structure:
- Assess whether the request is already clear enough for direct technical planning — if so, continue to Phase 0.5
- If the ambiguity is mainly product framing, user behavior, or scope definition, recommend `ce-brainstorm` as a suggestion — but always offer to continue planning here as well
- If the user signals they lack working knowledge of the problem domain itself, recommend `ce-brainstorm` — its blindspot pass maps the territory's decision surface before requirements are extracted — but honor their choice to continue here; Phase 2's unfamiliar-territory scaffolding then applies
- If the user wants to continue here (or was already explicit about wanting a plan), run the planning bootstrap below

The planning bootstrap should establish:
- Problem frame
- Intended behavior
- Scope boundaries and obvious non-goals
- Success criteria
- Blocking questions or assumptions

Keep this bootstrap brief. It exists to preserve direct-entry convenience, not to replace a full brainstorm.

If the bootstrap uncovers major unresolved product questions:
- Recommend `ce-brainstorm` again
- If the user still wants to continue, require explicit assumptions before proceeding

### Route-Out Decisions

If the bootstrap reveals that a different workflow would serve the user better:

- **Bug-shaped prompt** (user describes broken behavior — "fix the bug where X", error message, regression, "doesn't work"). Surface `ce-debug` as a route-out option alongside continuing with `ce-plan` whenever the bug surface is reachable (in cwd OR named repo found at another local path). Stay in `ce-plan` silently when the named code can't be found anywhere local.

  **When the bug is at another local path (not cwd):**
  - Announce the target explicitly **before** any cross-repo investigation: which path will be read AND where plan outputs will land (default: target repo's `docs/plans/`, not cwd's).
  - Default: proceed from the target repo for both investigation and plan-write. The user can interrupt to redirect.
  - **After** announcing and proceeding, fire the standard ce-debug routing menu (continue with `ce-plan` vs switch to `ce-debug`).

  **Headless mode**: skip the ce-debug suggestion menu entirely; default to continuing with `/ce-plan`.

- **Clear task ready to execute** (known root cause, obvious fix, no architectural decisions) — suggest `ce-work` as a faster alternative alongside continuing with planning. The user decides.

## Question Classification

If the origin document contains `Resolve Before Planning` or similar blocking questions:
- Review each one before proceeding
- Reclassify it into planning-owned work **only if** it is actually a technical, architectural, or research question
- Keep it as a blocker if it would change product behavior, scope, or success criteria

If true product blockers remain:
- Surface them clearly
- Ask the user whether to:
  1. Resume `ce-brainstorm` to resolve them
  2. Convert them into explicit assumptions or decisions and continue
- Do not continue planning while true blockers remain unresolved

## Plan Depth Assessment

Classify the work into one of these plan depths:

- **Lightweight** - small, well-bounded, low ambiguity
- **Standard** - normal feature or bounded refactor with some technical decisions to document
- **Deep** - cross-cutting, strategic, high-risk, or highly ambiguous implementation work

If depth is unclear, ask one targeted question and then continue.

## Solo-Mode Scoping Synthesis

Surface call-outs to the user — the specific forks in scope or approach where user input materially changes the plan — so scope can be corrected **before Phase 1 research is spent**.

Fires **only in solo invocation** — when Phase 0.2 found no upstream PRD source AND Phase 0.4 stayed in ce-plan AND Phase 0.5 cleared AND not on Phase 0.1 fast paths. Skip Phase 0.7 entirely when any guard fails — PRD-sourced invocations defer to Phase 5.1.5 instead.

**Read `references/synthesis-summary.md` before composing the scoping synthesis.**

**Required gate output — do not skip; silent proceeding is not allowed.** Compose an internal three-bucket scope draft (Stated / Inferred / Out of scope). Derive call-outs, run the pre-emit scans, then emit the **solo-variant** synthesis and **wait for user confirmation before continuing to Phase 1.**

**Blocking decision:** auto-proceed only when plan depth is **Lightweight AND zero call-outs survive**. Standard and Deep always fire the confirmation gate.

**Headless / opt-in skip:** in headless mode, or when `SKIP_SCOPING_CONFIRM` resolved to skip, do not block — compose the internal draft, skip the chat-time confirmation, and route Inferred bets to a `## Assumptions` section at plan-write.
