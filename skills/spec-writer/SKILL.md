---
name: spec-writer
description: Create or refine spec-superflow planning artifacts. Invoke when the change is understood well enough to write proposal.md, specs/, design.md, and tasks.md.
---

# Spec Writer

Create or refine planning artifacts when the change has moved beyond exploration.

## Required Inputs

Read `.spec-superflow.yaml` (especially `dp_0_decisions`, `dp_0_confirmed`) and any existing planning artifacts. If `dp_0_confirmed` is not `true`, stop and route back to `workflow-start` for DP-0.

### Global Prototype Reading (v0.5)

Before generating artifacts, check if a global prototype exists:
1. Read `prototype/flow.md` if it exists — this defines page navigation and user flows
2. List `prototype/pages/` directory — these are the UI contract pages
3. Read `prototype/design-system.md` if it exists — component and token definitions
4. Store as UI contract context for design.md and tasks.md generation

If `prototype/` does not exist or is empty, skip silently — not all projects have prototypes.

### Solutions Index (v0.5)

Read `docs/solutions/INDEX.md` if it exists. Filter entries where `phase = spec OR phase = cross-phase` and `domain` matches the current change's domain. Inject top-5 summaries as context constraints for artifact generation. If INDEX.md does not exist or is empty, skip silently.

## Config Check

Run: `npx --yes --package spec-superflow@0.17.0 ssf runtime config --get artifacts.order` — generate in configured order (default: proposal → specs → design → tasks). Run with `artifacts.skip` — skip any listed artifacts.

## Artifact Roles

- `proposal.md`: why and scope
- `specs/`: required behavior (testable)
- `design.md`: architecture decisions and trade-offs (not line-by-line)
- `design.md` (v0.5 addition): When the change involves UI features, the Context section MUST reference the global prototype as UI contract source. Cite specific prototype pages (e.g., `prototype/pages/login.html`) and flow definitions (e.g., `prototype/flow.md#login-flow`). Do NOT redefine UI interactions in design.md — reference the prototype as the single source of truth for UI behavior.
- `tasks.md`: dependency-aware implementation steps

## Working Rules

**Honor DP-0**: Read `dp_0_decisions`, respect confirmed constraints, don't silently expand scope. Pause on unconfirmed decisions.

### proposal.md
Must state: problem, what changes, capabilities affected, impact areas.

### specs/
Every requirement must be testable. Use SHALL or MUST. Every requirement must have at least one `#### Scenario:` with WHEN/THEN. Group under ADDED/MODIFIED/REMOVED Requirements headers.

Optional structured AC tags under a Scenario are supported for E2E extraction (v0.4, design spec ch.16): `##### Exception:` (→ EX AC, ×2), `##### State:` (→ ST AC, ×2), `##### Boundary:` (→ BND AC, ×1). These are **OPTIONAL** — omitting them does NOT fail validation. The `e2e` skill applies dimension-conditional gating (absent dimension = N/A, not 0%) plus keyword fallback (error/invalid/fail/边界), so no spec is forced to add tags.

### design.md
Must have: Context (current state, constraints, stakeholders), Goals, Decisions (Choice + Rationale + Alternatives considered), Risks And Trade-Offs.

**Prototype reference (v0.5)**: For UI-related changes, include a `## UI Contract` section in design.md that:
- References the prototype entry point (`prototype/index.html`)
- Lists affected prototype pages with their paths
- References relevant flow definitions from `prototype/flow.md`
- Notes any prototype components used (`prototype/components/`)
- States: "UI behavior is defined by the global prototype. This design does not redefine UI interactions."

### tasks.md
Must include:
- **File Structure**: all files with one-sentence responsibility (Create/Modify)
- **Interfaces**: cross-batch Consumes/Produces with exact types
- **Per-task**: exact file paths, expanded TDD phases (5 steps), Interfaces block
- **Granularity**: each step 2-5 min, atomic
- **Zero placeholders**: no TBD, TODO, "figure out", "add appropriate"
- **Dependency ordering**: depends only on prior tasks, explicit "Depends on: Batch N"

**Prototype-aware tasks (v0.5)**: For UI-related tasks, include prototype references:
- File paths in `**Files:**` should reference prototype pages when the task implements a UI page
- Add `**Prototype:** prototype/pages/<page>.html` field for UI implementation tasks
- Test scenarios for UI tasks should reference prototype flow definitions

## Artifact Generation

Generate one at a time. Confirm each before next. This prevents scope drift — if proposal has errors, downstream artifacts are wrong.

1. `proposal.md` → present summary → wait for confirm
2. `specs/` → present requirement list → wait for confirm
3. `design.md` → present key decisions → wait for confirm
4. `tasks.md` → present batch breakdown → wait for confirm

## Validation Checklist

### proposal.md
- `## Why` > 50 chars, `## What Changes`, `## Scope` (In/Out), `## Impact`, `## Capabilities`, no TBD/TODO

### specs/
- SHALL/MUST for required behavior, `#### Scenario:` with WHEN/THEN per requirement, grouped under delta headers, no contradictions; optional `##### Exception:/State:/Boundary:` sub-tags allowed but NOT required (absent dimension = N/A, not 0%). Regression: a spec containing `##### Exception:` must still pass `npm run validate` (validateDeltaSpec must not reject unknown sub-headings).

### design.md
- `## Context`, `## Goals`, `## Decisions` (≥1, with Choice+Rationale+Alternatives), `## Risks And Trade-Offs`

### tasks.md
- `## File Structure`, `## Interfaces`, numbered tasks, exact file paths, TDD phases, ≤5 min steps, no placeholders, every requirement mapped, explicit dependencies

**If any artifact fails validation, fix before handing off to contract-builder.**

## DP-2: Artifact Review Gate

Present summary of all 4 artifacts (2-3 sentences each). Ask user for adjustments. After approval:
```bash
npx --yes --package spec-superflow@0.17.0 ssf state set <change-dir> dp_2_result "approved: <summary>"
npx --yes --package spec-superflow@0.17.0 ssf state set <change-dir> dp_2_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```

## Handoff Rule

Do not start implementation after writing planning artifacts. Once stable, validated, and DP-2 is recorded, hand off to `contract-builder`.

## Exception Handling

- **Parse failures**: Report specific file/error; don't generate from corrupted templates
- **Missing templates**: Fall back to artifact structure defined in this skill
- **User interruption**: Artifacts on disk are the recovery checkpoint; resume from first missing/incomplete one
- **Validation failure**: Fix before handoff — do not hand off broken artifacts
