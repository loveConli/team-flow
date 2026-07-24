# Lightweight Mode — Detailed Workflow

<critical_requirement>
**Single-pass alternative — same artifact type, reduced research and validation.**

This mode skips parallel subagents entirely. The orchestrator performs all work in a single pass and writes the same solution-doc artifact type, but omits cross-referencing, duplicate detection, session-history research, and semantic grounding validation.

Headless mode enters Lightweight only when explicitly invoked with `depth:lightweight`; otherwise it defaults to Full for backward compatibility.
</critical_requirement>

The orchestrator (main conversation) performs ALL of the following in one sequential pass:

1. **Extract from conversation**: Identify the problem and solution from conversation history. Also scan the "user's auto-memory" block injected into your system prompt, if present (Claude Code only) -- use any relevant notes as supplementary context alongside conversation history. Tag any memory-sourced content incorporated into the final doc with "(auto memory [claude])". Before asserting how code behaves (enum values, status semantics, limits, defaults), Read the defining line at the current tree — soften or attribute any claim you cannot verify. Cite PR numbers over bare commit SHAs, and phrase unmerged fixes as pending
2. **Classify**: Read `references/schema.yaml` and `references/yaml-schema.md`, then determine track (bug vs knowledge), category, and filename
3. **Write minimal doc**: Before writing, check whether the exact proposed `docs/solutions/[category]/[filename].md` path exists. If it exists, read it: update it only when it covers the same problem, preserving its path and frontmatter structure and adding `last_updated: YYYY-MM-DD`; otherwise choose a distinct, descriptive filename and re-check that exact path is absent before writing. This is exact-path collision handling only — do not run Full mode's semantic overlap research or dispatch subagents. Create or update the doc using the appropriate track template from `assets/resolution-template.md`, with:
   - YAML frontmatter with track-appropriate fields, applying the YAML-safety quoting rule for array items (see `references/yaml-schema.md` > YAML Safety Rules)
   - Bug track: Problem, root cause, solution with key code snippets, one prevention tip
   - Knowledge track: Context, guidance with key examples, one applicability note
4. **Vocabulary capture (update-only)**: if `CONCEPTS.md` exists at repo root, read `references/concepts-vocabulary.md`, then scan the new doc and the conversation for qualifying terms and add/refine entries silently (same criteria as Phase 2.4). Do **not** bootstrap or seed in lightweight mode — if `CONCEPTS.md` does not exist, defer creation to a Full run, which owns seeding. Record the outcome in the output (e.g., "Vocabulary: 1 entry refined" or "scanned, no qualifying terms"). If you refined `CONCEPTS.md` and the project's active instructions and conventions already in your context do not surface it, add the discoverability tip to the output below — lightweight **tips**, it does not edit instruction files (an interactive Full run owns that edit after consent; headless Full also tips/reports only).
5. **Read-only discoverability check**: Using the project's active instructions and conventions already in your context, assess whether they surface `docs/solutions/` against the three criteria under **Discoverability Check** in `references/full-mode-workflow.md`. Do not open, offer to edit, or edit instruction files; Lightweight only reports the result. Record one of:
   - `no gap` when active project instructions surface the knowledge store
   - `gap noted — instruction-file tip emitted` when active project instructions exist but do not surface it
   - `not applicable — no active project instructions` when no project instructions are active; emit no discoverability tip
6. **Mechanical claims check**: run `scripts/validate-doc-claims.py` against the written doc exactly as in Phase 2.45 step 1 (same `SKILL_DIR` anchor, same adjudicate-not-auto-fix rule — read `references/grounding-validation.md` for the adjudication table when it flags anything). Lightweight skips only the semantic validator subagent, not this deterministic check.
7. **Frontmatter parser-safety check**: validate the written doc exactly as in Phase 2 step 8, using the same bundled-script existence guard and manual fallback checklist. Fix any violation and repeat the check; do not report success until the written frontmatter is parser-safe.
8. **Skip specialized agent reviews** (Phase 3) and the semantic grounding validator (Phase 2.45 step 2) to conserve context

## Lightweight Completion Output

In headless Lightweight, do not emit this interactive block; use the depth-specific report under `references/output-standards.md` > `Headless mode` instead. In interactive Lightweight, emit:

```
✓ Documentation complete (lightweight mode)

File created:
- docs/solutions/[category]/[filename].md

[If discoverability check found instruction files don't surface the knowledge store:]
Tip: Your AGENTS.md/CLAUDE.md doesn't surface docs/solutions/ to agents —
a brief mention helps all agents discover these learnings.

[If CONCEPTS.md was refined this run and isn't surfaced in the instruction files:]
Tip: Your AGENTS.md/CLAUDE.md doesn't surface CONCEPTS.md —
a one-line mention helps agents find the shared vocabulary.

Note: This was created in lightweight mode. For richer documentation
(cross-references, detailed prevention strategies, specialized reviews,
semantic grounding validation), re-run /ce-compound in a fresh session.
```

**No subagents are launched. No parallel tasks. The solution doc is the one deliverable** (Phase 2.4's update-only vocabulary capture may also refine an existing `CONCEPTS.md`).

In lightweight mode, the overlap check is skipped (no Related Docs Finder subagent). This means lightweight mode may create a doc that overlaps with an existing one. That is acceptable — `ce-compound-refresh` will catch it later. Only suggest `ce-compound-refresh` if there is an obvious narrow refresh target. Do not broaden into a large refresh sweep from a lightweight session.
