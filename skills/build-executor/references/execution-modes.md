# Execution Modes Reference

> 从 build-executor SKILL.md 提取的详细执行模式说明。

## Mode Selection Flow

For `full`/`hotfix`, generate proposed waves from the approved contract, then use the recommendation as a decision aid:

```bash
npx --yes --package @xulthekl/team-flow@0.26.1 tf execution recommend <change-dir> \
  --wave <wave-id>:<parallel|serial>:<task,...>[:<depends-on,...>] --json
# Show every available mode, the observed facts, and the recommendation to the user.
npx --yes --package @xulthekl/team-flow@0.26.1 tf execution plan <change-dir> \
  --mode <selected-mode> --confirm --reason "user-selected execution mode" \
  --wave <wave-id>:<parallel|serial>:<task,...>[:<depends-on,...>]
# Add --acknowledge-recommendation when the selection differs from the recommendation.
npx --yes --package @xulthekl/team-flow@0.26.1 tf execution show <change-dir> --json
```

The optional fourth `--wave` segment names prerequisite wave IDs. `execution show --json` reports `current`, plus each wave's `depends_on`, `receipt`, `blockers`, `retryable`, and `eligible` status.

## Mode Criteria

| Mode | Criteria |
|------|----------|
| **SDD** | Recommended for parallel waves, multiple waves, or work beyond the inline threshold |
| **Inline** | Recommended for a single sequential task; always available for a user-confirmed choice |
| **Batch Inline** | Recommended for a bounded sequential batch; it remains serial and is never presented as parallel |

## SDD Workflow

Dispatch according to the persisted plan, review each planned wave, and run a final broad review after all waves.

### Planned-Wave Loop
1. Read the current plan with `tf execution show <change-dir> --json`; only waves with `current: true` and `eligible: true` may start.
2. A `parallel` wave may dispatch independent tasks simultaneously only when the platform supports concurrent dispatch.
3. A `serial` wave dispatches one task at a time in listed order.
4. After every wave, write a review report, then record one receipt:
   ```bash
   npx --yes --package @xulthekl/team-flow@0.26.1 tf execution review <change-dir> \
     --wave <wave-id> --base <sha> --head <sha> --report <review-report-path> --verdict <pass|fail>
   ```
5. Critical/Important findings require a `fail` receipt, focused repair, re-review, then replacement `pass` receipt.

### Per-Task Loop
1. **Dispatch implementer**: Load template with `tf runtime asset read skills/build-executor/implementer-prompt.md`. Extract task brief with `scripts/task-brief PLAN_FILE N`.
2. **Handle response**: DONE → review. DONE_WITH_CONCERNS → assess. NEEDS_CONTEXT → provide. BLOCKED → re-dispatch or escalate.
3. **Review**: Load `tf runtime asset read skills/build-executor/task-reviewer-prompt.md`.
4. **Fix**: If Critical/Important, write `fail` receipt, dispatch fix, re-review, write `pass` receipt.
5. **Mark complete**: Append to `.superpowers/sdd/progress.md`.

## Batch Inline Execution

Only when user explicitly confirms `batch-inline`. Current agent executes directly and serially. TDD Iron Law still applies.

Procedure: announce mode → write failing test → confirm failure → implement → run suite → refactor → lightweight checkpoint → report.

Boundaries: if any task touches >1 module, involves schema/API/config changes, or has open questions → downgrade to Inline or SDD.

## Inline Execution Mode

Only after user-confirmed `inline` selection is recorded. Executes in current session, writes one review receipt per planned wave.

Per-task: extract brief → write failing test → confirm failure → implement → confirm green → checkpoint review → commit → save recovery checkpoint → append to progress ledger.

## Model Selection

```bash
npx --yes --package @xulthekl/team-flow@0.26.1 tf runtime config --resolve-model <profile>
```

| Profile | Role |
|---|---|
| `mechanical` | Cheap, routine edits |
| `standard` | Integration and judgment work |
| `strong` | Architecture, design, and final review |
| `review` | Review that matches the diff |

## Recovery Checkpoint

```bash
npx --yes --package @xulthekl/team-flow@0.26.1 tf checkpoint save <change-dir> \
  --task <completed-task-id> --next "<next task>" --completed "<completed work>" \
  --verification "<verification report path>" --review "<review report path>" \
  --risk "<open risk or None>" --commit-start <base-sha> --commit-end <head-sha>
```
