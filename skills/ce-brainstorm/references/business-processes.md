# Phase 1.6 — Business Process Analysis

Detailed process derivation and structured output logic for Phase 1.6. The main SKILL.md describes the high-level flow; this reference contains step-level methodology, output formats, QA checks, and ledger rules.

## Trigger & Input

**Trigger**: Phase 1.5 completed (all scenarios confirmed).
**Tier**: All.
**Nature**: Analysis + user confirmation loop until confirmed.

**Input**:
- `requirement/vN/business-analysis.md` — confirmed scenarios with IDs (✅ SC-xxx)
- `requirement/ledger.md` — archived process records from prior versions

## Step 1: Derive Processes from Scenarios

For each confirmed scenario, derive a step sequence using BPMN thinking:

- **Roles / swimlanes**: identify all actors (human, system, external)
- **Activities**: discrete work units each actor performs
- **Events**: start event, intermediate events, end event
- **Gateways**: decision points that branch the flow (exclusive / parallel / inclusive)

Produce one draft process per scenario. A scenario may map to one or more L4 sub-processes.

## Step 2: Compare Against Existing Processes

Read both sources:

1. `requirement/ledger.md` — archived processes from prior versions
2. `requirement/vN/business-analysis.md` — processes already documented in the current version

Classify each draft process:

| Outcome | Action |
|---------|--------|
| New process | Create entry with status 🔵 待确认 |
| Optimised process | Create a changed version in current `business-analysis.md` |
| Unchanged | Skip — no entry needed |

## Step 3: Structured Output (Three Forms)

### 3.1 L1–L4 Classification Table

Fill the business process overview table (aligns with PRD §2):

| L1 Group | L2 Category | L3 Process | L4 Sub-process | Status | Related Scenarios |
|----------|-------------|------------|----------------|--------|-------------------|

**Hierarchy**: L1 → L2 → L3 → L4. L3 is a collection of L4 sub-processes. Each ledger record corresponds to one L4. **L4 is the minimum recording unit.**

### 3.2 Process Flow Diagram

Output a mermaid flowchart for each L4 sub-process:

```mermaid
flowchart TB
  subgraph RoleA[Role A]
    A1[Step 1] --> A2[Step 2]
  end
  subgraph RoleB[Role B]
    B1[Step 3] --> B2{Decision}
    B2 -->|Yes| B3[Step 4]
    B2 -->|No| B4[Exception]
  end
```

**Rules**: Must use `flowchart TB`; must partition by role swimlanes (`subgraph`); every gateway must label all branches; exception paths must terminate explicitly.

### 3.3 Activity Table (9 Columns — Hard Constraint)

One table per L4 sub-process:

| Step | Activity | Execution Steps | Role | Trigger | Input | Output | Related Function | Exception Handling |
|------|----------|-----------------|------|---------|-------|--------|------------------|--------------------|

**All 9 columns are mandatory.** "Execution Steps" describes the concrete actions within each activity — must not be empty. "Related Function" references FUNC-xxx IDs or is marked "TBD". "Exception Handling" must cover every exception branch visible in the flow diagram.

### 3.4 Process Attribute Block

Each L4 sub-process carries a property header:

| Field | Description |
|-------|-------------|
| Process ID | BP-xxx |
| Status | 🔵 待确认 / ✅ 已确认 |
| L1 / L2 / L3 / L4 | Full classification path |
| Related Scenarios | SC-xxx IDs |
| Trigger Event | What initiates the process |
| End Condition | What terminates the process |
| Involved Roles | All actors |

## Step 4: Reverse Reference Update

After producing the three output forms, update `business-analysis.md`:

- Each scenario's "Related Process" field → list associated BP-xxx IDs
- Each requirement's "Related Process" field → list associated BP-xxx IDs

**Do not update `ledger.md`.** Ledger entries are written in bulk during version archiving, not during analysis.

## Step 4.5: QA-2 Process Quality Check

Dispatch `process-quality-checker` sub-agent. Evaluate 9 checks:

| ID | Category | Check | Severity |
|----|----------|-------|----------|
| C1 | Completeness | Every confirmed scenario (✅ SC-xxx) has ≥1 related process | Error |
| C2 | Completeness | Every process has L1–L4 fully filled (L4 non-empty) | Error |
| C3 | Completeness | Every process has a mermaid flow diagram | Error |
| C4 | Completeness | Activity table has 9 columns and every step has "Execution Steps" filled | Error |
| C5 | Consistency | Process "Related Scenarios" IDs exist in the scenario registry | Error |
| C6 | Consistency | Flow diagram steps correspond 1:1 with activity table steps | Error |
| C7 | Consistency | Reverse references complete — related scenarios' "Related Process" field updated | Warning |
| C8 | Accuracy | Exception handling covers all exception branches in the flow diagram | Warning |
| C9 | Accuracy | "Related Function" IDs are valid (FUNC-xxx exists or marked TBD) | Warning |

**Routing**: All Error checks PASS → proceed to Step 5. Any Error FAIL → return to correct (max 3 rounds). Warnings are reported but do not block.

## Step 5: Display & Confirmation

Present all three output forms to the user as a blocking question:

- ✅ **Confirmed** → upgrade status to ✅ 已确认; write into current version `business-analysis.md`; exit (no ledger update).
- ✏️ **Adjust** → apply feedback; return to Step 3; loop until confirmed.

## Write Rules

| Target | When | What |
|--------|------|------|
| `business-analysis.md` (current version) | On confirmation | Process details + reverse references |
| `ledger.md` | Never during Phase 1.6 | Bulk-written at version archiving only |

## Deprecation Handling

When a process is deprecated, execute all three steps:

1. Delete the record from `ledger.md`
2. Delete the detail block from the version's `business-analysis.md`
3. Update `doc/active-registry/active-items.md`
