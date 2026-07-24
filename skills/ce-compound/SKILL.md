---
name: ce-compound
description: Document a recently solved problem or durable project vocabulary in docs/solutions/ or CONCEPTS.md. Use when capturing a learning after work.
argument-hint: "[optional: brief context] [mode:headless] [depth:lightweight|full]"
---

# /ce-compound

Coordinate multiple subagents working in parallel to document a recently solved problem.

See `references/v0.5-upgrade.md` for the v0.5 复利贯穿引擎 upgrade details and auto-invoke scenarios.

## Purpose

Capture problem solutions while context is fresh, creating structured documentation in `docs/solutions/` with YAML frontmatter. Each documented solution compounds your team's knowledge — the first fix takes research; document it, and the next occurrence takes minutes. See `references/three-tier-index.md` for the three-tier index architecture. See `references/write-flow.md` for write flow and eviction rules. See `references/promotion-rules.md` for change→product promotion rules.

## When to Use

```bash
/ce-compound                            # Document the most recent fix
/ce-compound [brief context]            # Provide additional context hint
/ce-compound mode:headless              # Non-interactive run for automations
/ce-compound mode:headless depth:lightweight [context]
/ce-compound mode:headless depth:full [context]
```

**One learning per run.** Run the skill once per learning, sequentially. Do not batch several learnings through one run.

If invoked to bootstrap `CONCEPTS.md` from scratch, redirect to `ce-compound-refresh` and exit.

## Mode Detection

Enter headless mode when the arguments contain `mode:headless`, or the invocation makes non-interactive intent unmistakable. `depth:lightweight` routes to Lightweight Mode; `depth:full` or no depth token routes to Full Mode. Strip `mode:` and `depth:` tokens before treating the remainder as context.

| Mode | When | Behavior |
|------|------|----------|
| **Interactive** (default) | No headless signal | Auto-pick Full vs Lightweight; prompt for Discoverability Check consent; end with plain summary |
| **Headless** | `mode:headless` or clear non-interactive intent | No blocking questions; default to Full; report gaps without editing instruction files; structured terminal report |

**Mode selection (Full vs Lightweight) — decide it, don't ask it.** Default to Full. Choose Lightweight only under real context pressure. State the chosen mode in the first line of output.

## Session Context

Before Phase 1, resolve: **Git branch** (`git rev-parse --abbrev-ref HEAD`) and **Repo root** (`git rev-parse --show-toplevel`). Non-zero exits are normal — skip branch filtering or fall back to working directory.

## Support Files

Read on-demand at the step that needs them — do not bulk-load at skill start.

- `references/schema.yaml` — canonical frontmatter fields and enum values
- `references/yaml-schema.md` — category mapping from problem_type to directory
- `references/concepts-vocabulary.md` — CONCEPTS.md format and inclusion rules
- `references/grounding-validation.md` — flag adjudication rules and semantic validator prompt
- `references/agents/session-historian.md` — session-history synthesis prompt
- `references/v0.5-upgrade.md` — v0.5 upgrade table and auto-invoke scenarios
- `references/three-tier-index.md` — three-tier index architecture and file format
- `references/write-flow.md` — write flow, eviction rules, CLI commands
- `references/promotion-rules.md` — promotion check rules (change→product)
- `references/full-mode-workflow.md` — **Full Mode detailed phases (0.5→1→2→2.4→2.45→2.5→Discoverability→3)**
- `references/lightweight-mode.md` — **Lightweight Mode detailed steps**
- `references/output-standards.md` — success output formats, categories, common mistakes, specialized prompts
- `assets/resolution-template.md` — section structure for new docs
- `scripts/session-history/` — session discovery and extraction scripts
- `scripts/validate-frontmatter.py` — frontmatter parser-safety validator
- `scripts/validate-doc-claims.py` — mechanical claims validator

When spawning subagents, pass the relevant file contents into the task prompt.

## Core Workflow

**Read `references/full-mode-workflow.md` (Full) or `references/lightweight-mode.md` (Lightweight) before executing.** The steps below are the imperative summary; the references contain the complete operational detail.

### Full Mode

1. **Phase 0.5 — Auto Memory Scan**: Check auto-memory block for relevant notes; pass as supplementary context.
2. **Phase 1 — Research**: Generate run dir. Launch Context Analyzer, Solution Extractor, Related Docs Finder in parallel. Then run session-history probe (automatic, two-stage: cheap discovery always runs; expensive synthesis only on relevance hit). Each subagent writes to `{run_dir}/` artifact and returns only the path.
3. **Phase 2 — Assembly & Write**: Wait for all Phase 1 inputs. Collect artifacts. Check overlap (high→update existing, moderate/low→create new). Incorporate session history. Assemble doc from `assets/resolution-template.md`. Validate YAML frontmatter. Write file. Run `scripts/validate-frontmatter.py`.
4. **Phase 2.4 — Vocabulary Capture**: Read `references/concepts-vocabulary.md`. Scan for qualifying domain terms. Create/update `CONCEPTS.md` silently.
5. **Phase 2.45 — Grounding Validation**: Run `scripts/validate-doc-claims.py` (mechanical). Dispatch semantic grounding validator subagent (Full only). Adjudicate flags per `references/grounding-validation.md`.
6. **Phase 2.5 — Selective Refresh Check**: Decide whether to invoke/recommend `ce-compound-refresh` with narrow scope. Never a default follow-up.
7. **Discoverability Check**: Assess whether instruction files surface `docs/solutions/` (and `CONCEPTS.md` if it exists). Interactive Full: edit after consent. Headless: report gap only.
8. **Phase 3 — Optional Enhancement**: Dispatch specialized reviewers by problem type (skip in headless). See `references/output-standards.md` for prompt list.

### Lightweight Mode

Single-pass, no subagents. Read `references/lightweight-mode.md` for the full 8-step sequence: extract → classify → write minimal doc → vocabulary capture (update-only) → read-only discoverability → mechanical claims check → frontmatter check → skip Phase 3.

## Guardrails

- **One deliverable**: `docs/solutions/[category]/[filename].md`. Subagents write only scratch artifacts under `<run-dir>/`; only the orchestrator writes product files.
- **Ground claims in source**: Read the defining line before asserting code behavior. Cite PR numbers over SHAs. Soften unverifiable claims.
- **Overlap before create**: High overlap → update existing doc. Do not create duplicates.
- **Headless never edits instruction files**: Report gaps; do not apply edits.
- **No "What's next?" menu**: End the turn after the summary.

## Preconditions

Problem has been solved (not in-progress). Solution has been verified working. Non-trivial problem (not simple typo or obvious error).

## Output

See `references/output-standards.md` for complete output formats (headless lightweight, headless full, interactive, failure), categories, common mistakes table, and the compounding philosophy.

**Headless**: structured terminal report ending with `Documentation complete` (or `Documentation skipped`).
**Interactive**: subagent results, grounding validation, files written, refresh recommendation. End the turn.

## Auto-Invoke

Trigger phrases: "that worked", "it's fixed", "working now", "problem solved". Manual override: `/ce-compound [context]`.

## Related Commands

- `/research [topic]` — deep investigation (searches docs/solutions/ for patterns)
- `/ce-plan` — planning workflow (references documented solutions)
