# Closing Procedures Reference

> 从 release-archivist SKILL.md 提取的详细收尾流程。

## Prototype Sync (v0.5)

After `arch-merge` completes, run prototype-sync to merge UX deltas back to the global prototype:

```bash
npx --yes --package @xulthekl/team-flow@0.25.0 tf prototype-sync <change-dir>
```

**Write-back order (mandatory)**: `arch-merge` → `prototype-sync` → `compound promotion` must be executed **sequentially** within the same change closing. Do not run them in parallel — the global `docs/architecture/` and `prototype/` must not be in a half-updated state when the next change grounds on them.

If `prototype-sync` reports conflicts, list them in the closing summary and flag for manual resolution. Do not block closing on prototype-sync conflicts (advisory level).

**Execution verification（v0.24.0）**：`prototype-sync` 命令执行后，检查其 stdout 输出确认合并完成（输出含 `merged`/`no UX delta`/`conflicts` 之一）。若命令未执行或执行失败，Step 5 Report 的 `Prototype sync` 行必须标注 `SKIPPED` 或 `FAILED`，并在 closing summary 中说明原因。**禁止在 prototype-sync 未执行时将 Prototype sync 行标注为已完成**。

## Compound Promotion (v0.5)

During closing, promote change-level learnings to the global solutions library:

```bash
npx --yes --package @xulthekl/team-flow@0.25.0 tf solutions promote <change-dir>
```

Promotion criteria:
- severity ≥ medium AND type = pitfall/pattern → promote to global `docs/solutions/`
- domain+type matches existing global entry → mark as "confirmed pattern", upgrade severity

Report promotion results in the closing summary. Promotion is advisory — failures do not block closing.

## Compound Capture Check (v0.5)

Before finalizing the closing, check if this change produced any learnable moments:

- Did the change trigger any mandatory rewind (re-specify, re-bridge)?
- Did bug-investigator find a recurring issue (same root cause as a prior change)?
- Did scope expand beyond the original proposal?
- Did execution-contract drift from proposal?

If any occurred, capture the learning:
```bash
npx --yes --package @xulthekl/team-flow@0.25.0 tf solutions capture \
  --phase cross-phase --domain <domain> --type pitfall \
  --severity medium --summary "<what happened and how to prevent it>"
```

Advisory — skip silently if no learnable moments detected.

## DP-6 (Verification Outcome)

```bash
npx --yes --package @xulthekl/team-flow@0.25.0 tf state set <change-dir> dp_6_result "<pass|conditional|fail>: <summary>"
npx --yes --package @xulthekl/team-flow@0.25.0 tf state set <change-dir> dp_6_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```

If FAIL, do NOT proceed to DP-7. Route back or ask about abandonment.

After PASS, also record the verification gate:
```bash
npx --yes --package @xulthekl/team-flow@0.25.0 tf state set <change-dir> test_result pass
```

## DP-7 (Archive Confirmation)

```bash
npx --yes --package @xulthekl/team-flow@0.25.0 tf state set <change-dir> dp_7_result "confirmed: <archive summary>"
npx --yes --package @xulthekl/team-flow@0.25.0 tf state set <change-dir> dp_7_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```

Verify DP-0 through DP-6 are recorded before DP-7.

## E2E Verification (optional, v0.4)

If an `e2e/` suite exists for the change:
- Read `docs/statistics/YYYY-MM-DD-e2e-report.md`: AC coverage / four-dimension coverage / type distribution / uncovered list / failure root-cause
- **4-level artifact verification** (L1-L4): compare architecture-design outputs against actual code
- **Graded gate**: prototype-phase AC≥80%; integration-phase AC≥95% / EX≥80% / ST≥90% / BND≥75%

## Lightweight Closure (hotfix/tweak)

Verify files exist and are non-empty, run `node --check` on code files, skip 5-step verification. Still record DP-6 and DP-7.
