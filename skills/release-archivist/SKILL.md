---
name: release-archivist
description: Close out a team-flow change with verification, summary, and archive readiness. Invoke when implementation is complete, verification is underway, or the user asks for a final wrap-up.
---

# Release Archivist

Finish a team-flow change cleanly with verification evidence.

## The Iron Law: Verification Before Completion

Claiming work is complete without verification is dishonesty, not efficiency. Before claiming any status:
1. IDENTIFY the command that proves the claim
2. RUN the full command fresh
3. READ output, check exit code
4. VERIFY output confirms the claim
5. Only THEN make the claim

**Forbidden before evidence**: "should", "probably", "seems to", expressions of satisfaction without output.

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check |
| Build succeeds | Build exit 0 | Linter passing |
| Bug fixed | Original symptom passes | Code changed |
| Requirements met | Line-by-line checklist | Tests passing |

## Verification Steps

### Step 1: Test Suite
Run full test suite. Record total/passed/failed/skipped. Zero failures = PASS.

### Step 2: Completeness
Compare contract batches against actual diff. Every SHALL/MUST must have implementation evidence. Missing = Critical severity.

### Step 3: Coherence
Compare design decisions against code. Check naming consistency. Inconsistencies = IMPORTANT.

### Step 4: Unintended Scope
Check for files modified outside scope fence, new dependencies not in design. Unplanned = WARN.

### Step 5: Report

| Dimension | Status | Findings |
|-----------|--------|----------|
| Completeness | PASS/FAIL/WARN | [list] |
| Correctness | PASS/FAIL/WARN | [list] |
| Coherence | PASS/FAIL/WARN | [list] |

- **Architecture merge**: <merged architecture.md + database.md + api.md + N SQL scripts to docs/architecture/ | architecture/ absent — skipped>
- **Prototype sync**: <synced N pages / N components / design-system updated | no UX delta | conflicts: N>
- **Compound promotion**: <promoted N learnings / updated N confirmed patterns | no learnings>

**Verdict**: PASS (all PASS) / CONDITIONAL (WARN only) / FAIL (any FAIL).
- FAIL → fix issues or route back to build-executor
- CONDITIONAL → present WARNs, proceed only with user acceptance
- PASS → proceed to final checks

### Step 5b: E2E Verification (optional, v0.4)
If an `e2e/` suite exists for the change, fold its report into verification (see design spec ch.16):
- Read `docs/statistics/YYYY-MM-DD-e2e-report.md`: AC coverage / four-dimension coverage (EX/ST/BND) / type distribution / uncovered list / failure root-cause (test issue vs implementation issue).
- **4-level artifact verification** (L1 existence / L2 substance / L3 wiring / L4 dataflow → VERIFIED/HOLLOW/ORPHANED/STUB/MISSING): compare `architecture-design` outputs (API/DB design docs) against actual code; STUB/MISSING = BLOCKER, HOLLOW/ORPHANED = WARNING.
- **Graded gate**: prototype-phase AC≥80% (HP required, EX/ST/BND non-blocking if absent); integration-phase AC≥95% / EX≥80% / ST≥90% / BND≥75% (AC/EX = BLOCKER, ST/BND = WARNING).
- Add a report row: `| E2E | PASS/FAIL/WARN | [coverage summary] |`.
- Note: `ce-proof` is the Proof markdown editor — unrelated to verification; do NOT route E2E there.

## Final Checks

**⛔ 状态字段禁写（v0.30.0）**：仅写本 skill 的 `dp_6_*`/`dp_7_*` 决策字段与 `test_result`；**MUST NOT** 修改 `.team-flow.yaml` 的 `state`/`workflow` 核心字段——closing 转换由主代理经 `tf state transition` 执行（来源：workflow-feedback 2026-08-01）。

- Tests passing? (cite command and output)
- All batches complete? (cite batch status)
- Scope added without artifact updates?
- Unresolved blockers or known risks?
- Delta specs exist that need merging?
- Run `tf audit <change-dir>` — include `decision-point-audit.md` in archive

### DP-6 (Verification Outcome)
```bash
tf state set <change-dir> dp_6_result "<pass|conditional|fail>: <summary>"
tf state set <change-dir> dp_6_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```
If FAIL, do NOT proceed to DP-7. Route back or ask about abandonment.

After recording a PASS outcome, also record it as the verification gate so the
`executing → closing` transition is allowed (the guard accepts either
`test_result: pass` or a `dp_6_result` starting with `pass`):
```bash
tf state set <change-dir> test_result pass
```

### DP-7 (Archive Confirmation)
```bash
tf state set <change-dir> dp_7_result "confirmed: <archive summary>"
tf state set <change-dir> dp_7_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```
Verify DP-0 through DP-6 are recorded before DP-7.

## Archive Rule

If implementation diverged from the contract, return to `bridging` before closure.

## Post-Verification

Run `tf state transition <change-dir> closing`. If delta specs exist, route to `spec-merger`.

### Architecture Merge (v0.10 §28-§31) — MUST run first

Merge change-level architecture artifacts to the global `docs/architecture/` baseline **before** any other post-verification step:

```bash
tf arch-merge <change-dir>
```

This merges `architecture/{architecture,database,api}.md` and `architecture/sql/` into the global architecture docs. Skip silently when `architecture/` does not exist (architecture-design was `skipped`).

**Execution order (mandatory)**: `arch-merge` → `prototype-sync` → `compound promotion`. Do not parallelise — global docs must not be in a half-updated state.

### Prototype Sync (v0.5)

After `arch-merge` completes, run prototype-sync to merge UX deltas back to the global prototype:

```bash
tf prototype-sync <change-dir>
```

**Write-back order (mandatory)**: `arch-merge` → `prototype-sync` → `compound promotion` must be executed **sequentially** within the same change closing. Do not run them in parallel — the global `docs/architecture/` and `prototype/` must not be in a half-updated state when the next change grounds on them.

If `prototype-sync` reports conflicts, list them in the closing summary and flag for manual resolution. Do not block closing on prototype-sync conflicts (advisory level).

**Execution verification（v0.24.0）**：`prototype-sync` 命令执行后，检查其 stdout 输出确认合并完成（输出含 `merged`/`no UX delta`/`conflicts` 之一）。若命令未执行或执行失败，Step 5 Report 的 `Prototype sync` 行必须标注 `SKIPPED` 或 `FAILED`，并在 closing summary 中说明原因。**禁止在 prototype-sync 未执行时将 Prototype sync 行标注为已完成**。

### Compound Promotion (v0.5)

During closing, promote change-level learnings to the global solutions library:

```bash
tf solutions promote <change-dir>
```

This checks `specs/<cap>/learnings.md` for entries meeting promotion criteria:
- severity ≥ medium AND type = pitfall/pattern → promote to global `docs/solutions/`
- domain+type matches existing global entry → mark as "confirmed pattern", upgrade severity

Report promotion results in the closing summary. Promotion is advisory — failures do not block closing.

### Compound Capture Check (v0.5)

Before finalizing the closing, check if this change produced any learnable moments:

- Did the change trigger any mandatory rewind (re-specify, re-bridge)?
- Did bug-investigator find a recurring issue (same root cause as a prior change)?
- Did scope expand beyond the original proposal?
- Did execution-contract drift from proposal?

If any of the above occurred, capture the learning:
```bash
tf solutions capture \
  --phase cross-phase --domain <domain> --type pitfall \
  --severity medium --summary "<what happened and how to prevent it>"
```

This check is advisory — skip silently if no learnable moments are detected.

### Workflow Feedback Check (v0.16.0)

Before finalizing the closing, ask the user if they encountered any workflow issues during this change:

> "本次 change 过程中有遇到工作流问题吗？（skill 触发不准、流程不顺、产物质量等）如果有，可以用 `/workflow-feedback` 记录。"

This check is advisory — skip if the user declines. If the user reports issues, invoke the `workflow-feedback` skill to create structured records in `.team-flow/feedback/`.

## Lightweight Closure (hotfix/tweak)

Verify files exist and are non-empty, run `node --check` on code files, skip 5-step verification. Still record DP-6 and DP-7.

## Exception Handling

- **Parse failures**: Report exact file and section
- **Missing files**: If audit can't generate, run `tf audit` manually
- **User interruption**: Re-run verification from the beginning on resume
- **DP gaps**: Flag missing DPs during DP-6; ask user whether to proceed or return
