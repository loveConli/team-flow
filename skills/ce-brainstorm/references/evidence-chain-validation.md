# Evidence Chain Validation — Phase 3.6 + QA-4 + Version Archiving

This reference covers three connected operations after PRD generation: QA-4 quality check, bidirectional evidence chain validation, and version archiving. They execute in strict sequence: QA-4 → validation → archive.

## QA-4: PRD Quality Checker (prd-quality-checker)

**Trigger:** PRD document written (Phase 3 complete), before Phase 3.6 validation.
**Route:** PASS → enter Phase 3.6; FAIL → return to Phase 3 to fix PRD.

| ID | Category | Check | Severity |
|----|----------|-------|----------|
| C1 | Completeness | PRD §2 includes a business process overview table (L1–L4)? | Error |
| C2 | Completeness | PRD §3 includes a flowchart + activity table for each confirmed process? | Error |
| C3 | Completeness | Every feature in PRD §7 carries REQ-xxx + SC-xxx + BP-xxx triple-ID linkage? | Error |
| C4 | Completeness | PRD §8 feature modules organized by process (BP-xxx grouping)? | Error |
| C5 | Consistency | PRD §2 process overview table matches business-analysis.md process list? | Error |
| C6 | Consistency | PRD §3 process descriptions match business-analysis.md process details? | Error |
| C7 | Metadata | PRD frontmatter complete (title / project_name / iteration_version / date / prd_template)? | Warning |
| C8 | Format | §8.4 feature extraction preserves original requirements detail (not over-summarized)? | Warning |

**Verdict rule:** All Error-level checks pass → PASS. Any Error fails → FAIL. Warnings are reported but do not block.

## Phase 3.6: Bidirectional Validation

**Trigger:** QA-4 verdict = PASS.
**Nature:** Automatic validation + user confirmation.

### Inputs

- `requirement/vN/prd.md` — the generated PRD
- `requirement/ledger.md` — the master requirements ledger

### Five Validation Dimensions

**V1 — Scenario Coverage Completeness**
Every scenario marked ✅ in the ledger must have functional coverage in PRD §7/§8. Check: for each ledger SC-xxx row with status ✅, find at least one PRD §7 feature referencing that SC-xxx ID.

**V2 — Process Coverage Completeness**
Every process marked ✅ in the ledger must appear in PRD §3. Check: for each ledger BP-xxx row with status ✅, find a corresponding PRD §3 section describing that process.

**V3 — Step-to-Function Mapping**
Each step of each confirmed process must map to a PRD §7 feature. Check: for every BP-xxx step listed in the ledger, find a PRD §7 feature whose triple-ID includes that BP-xxx and a matching step description.

**V4 — Function Traceability Completeness**
Every PRD §7 feature must carry a valid REQ-xxx + SC-xxx + BP-xxx triple. Check: parse each feature's ID block; verify each ID resolves to an existing ledger row. Flag orphan IDs or missing links.

**V5 — Process Description Consistency**
PRD §3 process descriptions must be consistent with business-analysis.md. Check: compare process name, step count, step names, and actor assignments between the two documents. Semantic equivalence is sufficient; verbatim match is not required.

### Validation Verdict and Routing

| Verdict | Condition | Next Step |
|---------|-----------|-----------|
| PASS | V1–V5 all pass | Proceed to version archiving, then Phase 4 |
| CONDITIONAL_PASS | Failures in V1–V5 are explicitly marked "defer this iteration" by user | User annotates exempt items with justification → proceed to archiving |
| FAIL | Unresolvable gaps remain | Return to Phase 3 to fix PRD, or return to Phase 1.5/1.6 to supplement requirements |

## Version Archiving

**Trigger:** Phase 3.6 verdict = PASS or CONDITIONAL_PASS.
**Tier:** All tiers.
**Nature:** Atomic, automated, no user interaction.

### Pre-Checks (all must hold)

1. Current-version business-analysis.md: all REQ status = ✅
2. Current-version business-analysis.md: all SC status = ✅
3. Current-version business-analysis.md: all BP status = ✅
4. Phase 3.6 verdict = PASS or CONDITIONAL_PASS

### Processing Steps

**Step 1 — Ledger batch write/refresh**

For every item in the current version's business-analysis.md:

- New item → append a row to ledger.md
- Modified item → refresh the existing row's `last_modified_version` and `directory` fields
- Reverse references → refresh the `linked_processes` field in scenario/requirement ledger rows

**Step 2 — Append archive record**

Append one row to ledger.md's "Version Archive" section:

| archive_version | archive_date | included_requirements | included_scenarios | included_processes | prd_path | status |

**Step 3 — Mark business-analysis.md archived**

Set frontmatter field `archived: true` in the current version's business-analysis.md.

**Step 4 — Update active registry**

Update `doc/active-registry/active-items.md` to reflect the newly archived items and retire any superseded entries.

### Outputs

- `requirement/ledger.md` — batch update complete
- `requirement/vN/business-analysis.md` — archived flag set
- `doc/active-registry/active-items.md` — updated

### Exit

Archiving complete → ready to enter `ce-plan` (development phase).

## Compound Interest Archive Sync

When archiving completes, the compound interest (复利) system should also update:

1. Append a row to the ledger's "Release Records" table
2. Fill the `release_version` field on relevant items
3. Update PRD frontmatter metadata (mark published version)
4. Item statuses remain unchanged (stay ✅ confirmed)

This reference documents the trigger relationship only. Compound interest automation is owned by the `ce-compound` skill.
