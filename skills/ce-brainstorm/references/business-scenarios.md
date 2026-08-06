# Phase 1.5 — Business Scenario Analysis

Detailed scenario extraction and validation logic for Phase 1.5. Triggered after Phase 1.4 completes; applies to all tiers. This phase is analytical with user confirmation — loops until the user confirms.

## Trigger & Input

**Trigger**: Phase 1.4 completed.

**Input files**:
- `requirement/vN/dialogue-log.md` — conversation evidence
- `requirement/ledger.md` — archived scenario entries (read-only during this phase)
- `requirement/vN/business-analysis.md` — current version scenarios (if any exist)

## Step 1: Extract Candidate Scenarios

Read `dialogue-log.md` and identify all business scenarios implied by the conversation. A candidate scenario is a discrete business activity involving one or more roles pursuing a goal under specific conditions. Extract:

- The roles mentioned or implied
- The goals each role pursues
- Triggering conditions and preconditions
- Constraints and acceptance criteria mentioned

Output a raw candidate list — one entry per distinct business activity. Do not merge or deduplicate yet.

## Step 2: Compare with Existing Scenarios

Read two sources:

1. **Archived entries** — `requirement/ledger.md` (scenarios from previous versions that have been archived)
2. **Current version** — `requirement/vN/business-analysis.md` (scenarios already drafted in this version)

For each candidate from Step 1, classify:

| Classification | Action |
|---|---|
| **New** — no matching entry in either source | Create entry with status 🔵 pending |
| **Optimized** — existing entry needs revision per new evidence | Create a revised version in current `business-analysis.md`, mark change type |
| **Unchanged** — existing entry already covers it | Skip |

Matching criteria: same business activity (role + goal overlap), not merely same domain.

## Step 3: Six-Dimension Structuring

For each new or optimized scenario, fill all six dimensions:

| Dimension | Description |
|---|---|
| **Role** | Who performs this activity (specific role, not generic "user") |
| **Goal** | What the role aims to achieve |
| **Trigger** | What event or condition initiates this scenario |
| **Precondition** | What must be true before the scenario can start |
| **Constraint** | Rules, limits, or policies that bound the scenario |
| **Acceptance** | Testable conditions that prove the scenario succeeded |

**Entry metadata**:

| Field | Value |
|---|---|
| Scenario ID | `SC-xxx` (sequential within version) |
| Status | 🔵 pending |
| Related requirements | `REQ-xxx` references |
| Related process | Process name or ID if applicable |
| Change history | Version, date, change type (create/modify), summary |

## Step 3.5: QA-1 Quality Check

Dispatch `scenario-quality-checker` sub-agent after structuring completes.

**Check items**:

| ID | Category | Check | Level |
|---|---|---|---|
| C1 | Completeness | All roles from dialogue-log have corresponding scenario coverage | Error |
| C2 | Completeness | Every scenario has all six dimensions filled | Error |
| C3 | Consistency | Related requirement IDs (`REQ-xxx`) exist in the requirement list | Error |
| C4 | Consistency | New scenarios do not overlap/conflict with archived ledger entries | Warning |
| C5 | Accuracy | Each scenario has traceable evidence in dialogue-log (not fabricated) | Error |
| C6 | Accuracy | Acceptance criteria are testable (specific conditions, not vague) | Warning |
| C7 | Completeness | Optimized scenarios include a change reason | Warning |

**Routing**:

- **PASS** (0 Errors) → proceed to Step 4
- **FAIL** (≥1 Error) → return to Step 3, fix flagged items, re-check
- **Maximum 3 rounds** — if still failing after round 3, escalate to user for decision

Warnings are reported but do not block progression.

## Step 4: Present & Confirm (Blocking Question)

Display all scenarios (new + optimized) with full six-dimension detail. Ask the user for formal confirmation:

- **✅ Confirm** → upgrade status to ✅ confirmed, write to `requirement/vN/business-analysis.md`, exit phase
- **✏️ Adjust** → apply user feedback, return to Step 3, re-run QA-1

This is a blocking question — do not proceed until the user explicitly confirms.

## Write Rules

On confirmation:

1. Write confirmed scenarios to `requirement/vN/business-analysis.md` (requirements list + scenario list sections)
2. **Do not update `ledger.md`** — ledger is batch-updated during version archival (Phase 3.6), not during scenario confirmation

## Deprecation Handling

When a scenario is deprecated (user explicitly requests removal):

1. Delete the entry from `requirement/ledger.md`
2. Delete the entry detail from the version's `business-analysis.md`
3. Update `doc/active-registry/active-items.md` to reflect the current active set

## Status Lifecycle

Only two states exist:

| State | Meaning |
|---|---|
| 🔵 pending | Drafted, awaiting QA-1 pass and user confirmation |
| ✅ confirmed | User confirmed, written to business-analysis.md |

No other states. Scenarios transition from 🔵 to ✅ only via Step 4 user confirmation.
