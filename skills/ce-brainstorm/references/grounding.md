# Phase 1.1 — Existing Context Scan

Detailed context scanning logic for Phase 1.1. The main SKILL.md describes the high-level approach; this reference contains the grounding scout prompt and Slack routing.

## Scan Depth by Scope

**Lightweight** — Search for the topic, check if something similar already exists, and move on.

**Standard and Deep** — Two passes:

*Constraint Check (inline)* — Use the project's active instructions and conventions already in your context. Read `STRATEGY.md` if it exists for product direction and `CONCEPTS.md` if it exists for canonical vocabulary. Use canonical names in dialogue, approaches, and the Product Contract.
- **Solutions index (v0.5)**: Read `docs/solutions/INDEX.md` if it exists. Filter entries where `phase = prd OR phase = cross-phase` and `domain` matches the current topic. Inject top-5 summaries as context constraints. If INDEX.md does not exist or is empty, skip silently.

## Topic Scan (Grounding Scout)

Create and retain the absolute scratch directory:

```bash
SCRATCH_ROOT="/tmp/compound-engineering-$(id -u)";
if [ -L "$SCRATCH_ROOT" ]; then echo "unsafe scratch root symlink: $SCRATCH_ROOT" >&2; exit 1; fi;
install -d -m 700 "$SCRATCH_ROOT" || exit 1;
if [ -L "$SCRATCH_ROOT" ] || [ ! -O "$SCRATCH_ROOT" ]; then echo "scratch root is not owned by the current user: $SCRATCH_ROOT" >&2; exit 1; fi;
chmod 700 "$SCRATCH_ROOT" || exit 1;
SCRATCH_DIR="$SCRATCH_ROOT/ce-brainstorm/<run-id>";
(umask 077; mkdir -p "$SCRATCH_DIR") || exit 1; chmod 700 "$SCRATCH_DIR" || exit 1;
echo "$SCRATCH_DIR";
```

Dispatch one extraction-tier sub-agent. In harnesses that support background dispatch, proceed to Phase 1.2/1.3 **without waiting**. Scout prompt:

> Gather grounding for a requirements brainstorm about **{topic}** in this repo. Search first with the native file-search and content-search tools, then read targeted sections — budget ~20 reads, preferring ranges over whole files. Find: whether something similar already exists, the most relevant existing artifacts (brainstorms, plans, specs, feature docs), adjacent examples of similar behavior, and the current state of anything the topic would touch (tables, routes, config, dependencies). Write a **grounding dossier** to `{scratch-dir}/grounding.md`: at most 150 lines of verbatim quotes and short code snippets, each with a `file:line` pointer. Extraction only — quote what the repo says; do not interpret or propose. If the topic has little footprint, write less rather than padding. Return only a gist: 3-5 lines summarizing what the dossier holds, plus its absolute path.

Carry only the gist in the dialogue. When the conversation needs specifics, read the dossier on demand. Downstream consumers (Phase 2.6 verifier, ce-plan handoff) receive the dossier path, not its contents.

## Two Rules During Scan

1. **Verify before claiming** — When the brainstorm touches checkable infrastructure (database tables, routes, config files, dependencies, model definitions), read the relevant source files to confirm what actually exists. Any claim that something is absent must be verified against the codebase first; if not verified, label it as an unverified assumption.

2. **Defer design decisions to planning** — Implementation details like schemas, migration strategies, endpoint structure, or deployment topology belong in planning, not here — unless the brainstorm is itself about a technical or architectural decision.

## Slack Context (opt-in, Standard and Deep only)

Never auto-dispatch. Route by condition:

- **Tools available + user asked**: Read `references/agents/slack-researcher.md` and dispatch a generic subagent seeded with that local prompt plus a brief summary of the brainstorm topic. Incorporate findings into constraint and context awareness.
- **Tools available + user didn't ask**: Note in output: "Slack tools detected. Ask me to search Slack for organizational context at any point."
- **No tools + user asked**: Note in output: "Slack context was requested but no Slack tools are available."
