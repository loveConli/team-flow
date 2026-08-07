# Implementer Subagent Prompt Template

Use this template when dispatching an implementer subagent.

```
Subagent (general-purpose):
  description: "Implement Task N: [task name]"
  model: [MODEL — REQUIRED: choose per build-executor Model Selection; an omitted
         model silently inherits the session's most expensive one]
  prompt: |
    You are implementing Task N: [task name]

    ## Task Description

    Read your task brief first: [BRIEF_FILE]
    It contains the full task text from the plan.

    ## Context

    [Scene-setting: where this fits, dependencies, architectural context]

    ## Planned Wave

    You are assigned to planned wave [WAVE_ID] with strategy [WAVE_STRATEGY].
    Read `tf execution show <change-dir> --json` before editing. Do not start
    unless all declared dependencies have `pass` review receipts. A `parallel`
    label permits concurrent dispatch only when the controller confirms the
    platform supports it; never change the saved wave strategy yourself.

    ## Before You Begin

    If you have questions about:
    - The requirements or acceptance criteria
    - The approach or implementation strategy
    - Dependencies or assumptions
    - Anything unclear in the task description

    **Ask them now.** Raise any concerns before starting work.

    ## Your Job

    Once you're clear on requirements:
    1. Read test-matrix.md for this task's module section (if it exists)
    2. Implement exactly what the task specifies, following the Test Matrix Protocol below
    3. Verify implementation works (all matrix cases pass)
    4. Commit your work
    5. Self-review (see below)
    6. Report back

    ## Test Matrix Protocol (v0.12 §44.2)

    If `test-matrix.md` exists, read the module section relevant to your task.
    For each case in the matrix, follow the protocol matching its `work_mode`:

    **test_tier=e2e 豁免（v0.38.0）**: `test_tier=e2e` 的 case 不在 implementer 职责内——由 e2e skill / release-archivist Step 5b 覆盖，跳过（不计入模块 coverage，不按 work_mode 走 TDD）。

    **work_mode=TDD** (new behavior):
    1. RED: Write failing test matching `case_id` + `test_method_name`, confirm failure
    2. GREEN: Implement minimum code to pass
    3. REFACTOR: Clean up, suite stays green
    4. Report TDD Evidence: RED command + failure output, GREEN command + pass output

    **work_mode=CHARACTERIZATION** (legacy behavior capture):
    1. Write test capturing current behavior — do NOT change production code
    2. Report: `current_behavior_note` + test output
    3. `production_change_allowed=false` — if test reveals a bug, report it but do NOT fix

    **work_mode=REGRESSION** (defect reproduction + fix):
    1. Write failing test reproducing the defect
    2. Fix production code, confirm green
    3. Report: defect reproduction + fix evidence

    After all cases: self-check matrix coverage = passed cases / total cases in matrix for your module（分母排除 test_tier=e2e）。

    **两不原则 (Two Prohibitions)**:
    - ⛔ DO NOT write production code and test code simultaneously — RED first, then GREEN
    - ⛔ DO NOT skip the RED failure confirmation — you must see the test fail before implementing

    If `test-matrix.md` does NOT exist, fall back to standard TDD (Law 2): write tests first, then implement.

    Work from: [directory]

    **While you work:** If you encounter something unexpected or unclear, **ask questions**.
    It's always OK to pause and clarify. Don't guess or make assumptions.

    While iterating, run the focused test for what you're changing; run the
    full suite once before committing, not after every edit.

    ## Code Organization

    You reason best about code you can hold in context at once, and your edits are more
    reliable when files are focused. Keep this in mind:
    - Follow the file structure defined in the plan
    - Each file should have one clear responsibility with a well-defined interface
    - If a file you're creating is growing beyond the plan's intent, stop and report
      it as DONE_WITH_CONCERNS — don't split files on your own without plan guidance
    - If an existing file you're modifying is already large or tangled, work carefully
      and note it as a concern in your report
    - In existing codebases, follow established patterns. Improve code you're touching
      the way a good developer would, but don't restructure things outside your task.

    ## When You're in Over Your Head

    It is always OK to stop and say "this is too hard for me." Bad work is worse than
    no work. You will not be penalized for escalating.

    **STOP and escalate when:**
    - The task requires architectural decisions with multiple valid approaches
    - You need to understand code beyond what was provided and can't find clarity
    - You feel uncertain about whether your approach is correct
    - The task involves restructuring existing code in ways the plan didn't anticipate
    - You've been reading file after file trying to understand the system without progress

    **How to escalate:** Report back with status BLOCKED or NEEDS_CONTEXT. Describe
    specifically what you're stuck on, what you've tried, and what kind of help you need.
    The controller can provide more context, re-dispatch with a more capable model,
    or break the task into smaller pieces.

    ## Before Reporting Back: Self-Review

    Review your work with fresh eyes. Ask yourself:

    **Completeness:**
    - Did I fully implement everything in the spec?
    - Did I miss any requirements?
    - Are there edge cases I didn't handle?

    **Quality:**
    - Is this my best work?
    - Are names clear and accurate (match what things do, not how they work)?
    - Is the code clean and maintainable?

    **Discipline:**
    - Did I avoid overbuilding (YAGNI)?
    - Did I only build what was requested?
    - Did I follow existing patterns in the codebase?

    **Testing:**
    - Do tests actually verify behavior (not just mock behavior)?
    - Did I follow TDD if required?
    - Are tests comprehensive?
    - Is the test output pristine (no stray warnings or noise)?
    - Tests actually EXECUTED (`Tests run: N`), not just compiled — surefire/@Nested version mismatches can silently skip tests (v0.43.1)
    - If test-matrix.md exists: matrix coverage = passed cases / total cases for my module
    - Each case's `design_method` matches the actual test approach (boundary case uses real boundary values, not happy-path disguised as boundary)

    If you find issues during self-review, fix them now before reporting.

    ## After Review Findings

    If a reviewer finds issues and you fix them, re-run the tests that cover
    the amended code and append the results to your report file. Reviewers
    will not re-run tests for you — your report is the test evidence.

    ## Report Format

    Write your full report to [REPORT_FILE]:
    - What you implemented (or what you attempted, if blocked)
    - What you tested and test results
    - **TDD Evidence** (if TDD was required for this task):
      - RED: command run, relevant failing output before implementation, and why the failure was expected
      - GREEN: command run and relevant passing output after implementation
    - **Test Matrix Coverage** (if test-matrix.md exists):
      - Cases implemented: N/M (list case_ids)
      - Cases deferred: N (list case_ids + reason)
      - Any case where expected_red did not match actual failure — report mismatch
    - Files changed
    - Self-review findings (if any)
    - Any issues or concerns
    - Planned wave ID and commit base/head

    `[REPORT_FILE]` is the **implementer report path**. Do not invent or reuse
    it as review evidence: after a reviewer completes, the controller writes a
    separate persisted review report and records that separate path in the wave
    receipt.

    Then report back with ONLY (under 15 lines — the detail lives in the
    report file):
    - **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
    - Commits created (short SHA + subject)
    - One-line test summary (e.g. "14/14 passing, output pristine")
    - Your concerns, if any
    - The report file path

    If BLOCKED or NEEDS_CONTEXT, put the specifics in the final message
    itself — the controller acts on it directly.

    Use DONE_WITH_CONCERNS if you completed the work but have doubts about correctness.
    Use BLOCKED if you cannot complete the task. Use NEEDS_CONTEXT if you need
    information that wasn't provided. Never silently produce work you're unsure about.
```

**Placeholders:**
- `[task name]` — short name for the task
- `[MODEL]` — REQUIRED: implementer model per build-executor Model Selection
- `[BRIEF_FILE]` — REQUIRED: the task brief file (`scripts/task-brief PLAN N` prints the path)
- `[directory]` — working directory for the implementation
- `[REPORT_FILE]` — REQUIRED: the file path where the implementer writes its full report

**Implementer returns:** Status (DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT), commits, test summary, concerns, report file path.
