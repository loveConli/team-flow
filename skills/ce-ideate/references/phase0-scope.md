# Phase 0: Resume and Scope

Detailed routing logic for Phase 0 sub-phases. When subject, mode, and format are already clear from the prompt, resolve in one pass and move on.

## 0.0 Resolve Output Mode

Determine `OUTPUT_FORMAT` for the ideation artifact. Output mode is **exclusive** — HTML (`.html`) OR markdown (`.md`), never both. Unlike `ce-plan` and `ce-brainstorm` (which default to `md`), ce-ideate defaults to **`html`** — ideation artifacts are read mainly by humans weighing candidate directions.

Precedence: in-prompt request > user-stated preference > config > default (`html`), with a hard pipeline-mode override.

**Read config.** Resolve `<repo-root>` via `git rev-parse --show-toplevel`. Then read `<repo-root>/.compound-engineering/config.local.yaml`. If unavailable, fall through to defaults.

Resolution steps:

1. **In-prompt request.** Match `output:` shorthand or plain language to `md`/`html` case-insensitively. Distinguish doc-format request from subject matter: "ideate on an HTML export feature" is the work, not a format request.
   - `output:` alone (no value) → no-op, fall through to step 2.
   - `output:<unknown>` (e.g., `output:pdf`) → drop the token, fall through, remember to emit a one-line note after final resolution.

2. **User-stated preference.** Honor a preference established earlier in session/memory/instructions. A remembered preference overrides config. Do not search instruction files.

3. **Config.** If config has an **active (non-commented)** `ideate_output:` key matching `md` or `html`, use it. Critical: lines starting with `#` are YAML comments and must be ignored.

4. **Default.** `OUTPUT_FORMAT=html`.

5. **Pipeline override.** Force `OUTPUT_FORMAT=md` in any pipeline or `disable-model-invocation` context.

**Token-parsing convention:** only literal-prefix flag tokens (`output:`, `mode:`) are consumed and stripped. Other `<word>:<word>` tokens pass through verbatim.

**Defer loading the format-rendering reference.** The deliverable is written at Phase 4, so `references/ideation-sections.md` and rendering references are only needed then.

The `output:` preference does NOT auto-propagate to `ce-brainstorm` on handoff.

## 0.1 Check for Recent Ideation Work

Look in `docs/ideation/` for ideation documents (`*.md` or `*.html`) created within the last 30 days.

Treat a prior ideation doc as relevant when:
- the topic matches the requested focus
- the path or subsystem overlaps the requested focus
- the request is open-ended and there is an obvious recent open ideation doc
- the issue-grounded status matches (don't mix issue-tracker and non-issue ideation)

If a relevant doc exists, ask whether to continue from it or start fresh. If continuing: read the document, summarize what has been explored, preserve previous ideas and rejection summary, update the existing file.

**Write the update back in the existing file's format**, overriding the Phase 0.0 baseline. Format precedence on resume: explicit `output:` arg > resumed file's extension > config > default (`html`); pipeline runs still force `md`.

## 0.2 Subject-Identification Gate

Check whether the subject of ideation is identifiable. If the subject is ambiguous enough that reasonable sub-agents would diverge, output will be scattered.

**Questioning principles (apply in this phase and in 0.4):**
- Questions exist only to supply what sub-agents need: an identifiable subject (this phase) and enough context for the agent to say something specific (0.4).
- Never ask about solution direction, constraints, audience, tone, success criteria.
- Always keep "Surprise me" as a real option.
- Stop as soon as the subject is identifiable or delegated to "Surprise me." More than 3 total questions is a smell — consider suggesting `ce-brainstorm`.

**Detection — issue-tracker intent (repo mode only).** Trigger only when the prompt uses phrases like `github issues`, `open issues`, `issue patterns`, `what users are reporting`, `bug reports`. Do NOT trigger on `bug in auth`, `fix the login issue` — these are focus hints.

**Detection — subject identifiability.** Test: would a reader, seeing only this prompt, know what subject the agent should ideate on? Vagueness is about what the words *refer to*, not phrase length: `browser sniff` names a feature (identifiable); `quick wins` names only a quality (vague).

**Being inside a repo does not settle vagueness.** `improvements` in any repo is still scattered. The repo provides material for grounding *after* a subject is settled, not the subject itself.

**Genuine ambiguity (repo mode).** When real doubt remains, Glob for the phrase in filenames, or Grep for it in README/docs. Any repo footprint → identifiable; none and still vague → ask.

**The scope question.** Ask via blocking question tool:
- Stem: "What should the agent ideate about?"
- Options: "Specify a subject" / "Surprise me" / "Cancel"

Routing:
- **Specify** → accept the user's follow-up as the subject. Re-apply identifiability check once.
- **Surprise me** → mark as **surprise-me mode**. Agent discovers subjects from Phase 1 material. CWD inside git repo → route to repo-grounded; otherwise elsewhere-software (require Phase 0.4 to collect substance). Skip Decision 1/2 in Phase 0.3.
- **Cancel** → exit cleanly.

## 0.3 Mode Classification

Classify the **subject of ideation** (settled in 0.2) into one of three modes:

**Surprise-me short-circuit.** Skip the two-decision classification. Use deterministic rule from 0.2: repo-grounded when CWD is inside git repo, elsewhere-software otherwise. State chosen mode in one sentence and proceed.

For specified subjects, make two sequential binary decisions:

**Decision 1 — repo-grounded vs elsewhere.** Weigh prompt content first, topic-repo coherence second, CWD repo presence as supporting evidence only.

- Positive signals for **repo-grounded**: prompt references repo files, code, architecture, modules, tests, workflows. Issue-tracker intent is always repo-grounded.
- Negative signals (push toward **elsewhere**): prompt names things absent from the repo (pricing, naming, narrative, business model, personal decisions, brand).

**Decision 2 (only fires if Decision 1 = elsewhere) — software vs non-software.** Classify by whether the *subject* of ideation is a software artifact or system. If the topic concerns a product, app, SaaS, web/mobile UI, feature, it is **elsewhere-software** — even when ideas are about copy, UX, CRO, pricing for that software product. **Elsewhere-non-software** is reserved for topics with no software surface: company naming, narrative writing, personal decisions, non-digital business strategy, physical products.

State the inferred mode in one sentence using plain language. Never print internal taxonomy labels.

**Active confirmation on mode ambiguity.** Only fire when classification is genuinely ambiguous. Ask one confirmation question via blocking tool with two self-contained labels.

**Routing rule (non-software mode).** Run Phase 1 Elsewhere-mode grounding. Load `references/universal-ideation.md` and follow it in place of Phase 2 and Phase 5 menu. Do not run repo-specific codebase scan.

## 0.4 Context-Substance Gate (Elsewhere Modes Only)

Skip in repo mode. In elsewhere modes, Phase 1 agents depend on user-supplied context. A bare prompt leaves agents with nothing to synthesize.

Apply discrimination test: would swapping one piece of the user's stated context for a contrasting alternative materially change which ideas survive? If yes, context is load-bearing — proceed. If no, ask 1-3 narrowly chosen questions focused on **supplying substance**:
- A URL or file to read
- A brief description of the current state
- A paste of an existing draft or brief

**Surprise-me exception.** In surprise-me + elsewhere-software, at least one piece of substance is required. Dismissive responses are not acceptable — tell them the run needs material and end cleanly.

When user provides rich context up front, confirm understanding in one line and skip.

If this step materially changes the topic, re-run 0.2 and 0.3 before dispatching Phase 1.

## 0.5 Interpret Focus and Volume

Infer two things from the argument:
- **Focus context** — concept, path, constraint, or open-ended
- **Volume override** — any hint that changes candidate or survivor counts

Default volume: each ideation frame yields ~6-8 ideas (~36-48 raw across six frames; ~25-30 survivors after dedupe); keep top 5-7 survivors.

Honor clear overrides: `top 3`, `100 ideas`, `raise the bar`.

**Depth override.** `go deep` opts into maximum depth: every ideation agent moves to ceiling tier, Phase 2 verification read budget doubles, Phase 3 adds a second critic.

**Tactical scope detection.** Parse focus hint for: `polish`, `typo`, `quick wins`, `small improvements`, `cleanup`. When present, lower Phase 2 ambition floor.

## 0.6 Cost Transparency Notice

Before dispatching Phase 1, surface the agent count and cost shape for the inferred mode in one short line.

Compute the count: 1 grounding-context agent + 1 learnings (skip in elsewhere-non-software) + 1 web researcher + evidence scouts (repo mode only, max 5) + user-research distillers + ideation fleet (5 default: 3 generation + 2 ceiling; 6 all-ceiling in surprise-me or `go deep`; 4 in issue-tracker mode) + 1 basis verifier.

Examples (defaults, no skips):
- **Repo mode, specified subject:** "Will dispatch ~13 agents, most on cheap tiers."
- **Repo mode, surprise-me:** "Will dispatch ~10 agents (surprise-me mode: deeper exploration per agent)."
- **Elsewhere-software:** "Will dispatch ~9 agents."
- **Elsewhere-non-software:** "Will dispatch ~8 agents."
