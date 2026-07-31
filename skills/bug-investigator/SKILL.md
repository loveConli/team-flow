---
name: bug-investigator
description: Use when encountering any bug, test failure, or unexpected behavior during team-flow execution, before proposing fixes. Invoked automatically when build-executor hits a blockage.
---

# Bug Investigator

**Core principle:** Find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law

No fixes without root cause investigation first. If you haven't completed Phase 1, you cannot propose fixes.

## When to Use

Use for ANY technical issue: test failures, bugs, unexpected behavior, performance problems, build failures, integration issues. Especially when under time pressure, "one quick fix" seems obvious, you've already tried multiple fixes, or you don't fully understand the issue.

Don't skip because issue "seems simple" or you're "in a hurry" — systematic debugging is faster than thrashing.

## The Four Phases

Complete each phase before proceeding.

### Phase 1: Root Cause Investigation

1. **Read error messages carefully**: stack traces, line numbers, file paths, error codes — they often contain the exact solution
2. **Reproduce consistently**: exact steps, every time? If not reproducible → gather more data, don't guess
3. **Check recent changes**: git diff, recent commits, new dependencies, config changes, environment differences
4. **Multi-component systems**: add diagnostic instrumentation at each component boundary. Log what enters and exits each layer. Run once to gather evidence, then analyze which component fails
5. **Trace data flow**: backward tracing — where does the bad value originate? Keep tracing up until you find the source. Fix at source, not symptom

### Phase 2: Pattern Analysis

1. Find working examples of similar code in the same codebase
2. Compare against references — read reference implementation completely
3. Identify every difference between working and broken, however small
4. Understand dependencies: other components, settings, config, environment, assumptions

### Phase 3: Hypothesis and Testing

Scientific method: form a single hypothesis ("I think X is the root cause because Y"), test with the smallest possible change (one variable at a time), verify before continuing. If it didn't work, form a NEW hypothesis — don't add more fixes. When you don't know, say so and ask for help.

### Phase 4: Implementation

1. **Create failing test case** — simplest reproduction, automated if possible. Follow TDD rules from build-executor
2. **Implement single fix** — address root cause, one change at a time, no "while I'm here" improvements
3. **Verify fix** — test passes? no regressions? issue resolved?
4. **If fix doesn't work**: count attempts. < 3 → return to Phase 1. **≥ 3 → STOP and question architecture (DP-5)**

### DP-5: Debug Escalation (3+ Failures)

3+ failed fixes = architectural problem. Each fix revealing new problems elsewhere = wrong architecture. Record: `tf state set <change-dir> dp_5_result <decision>`. Discuss with user before attempting more fixes.

## Report Format

Write the investigation report with this structure:

```markdown
# Bug Investigation Report

## Summary
[One-paragraph description of the bug and investigation outcome]

## Symptom
- **What happens:** [Exact observed behavior]
- **Expected behavior:** [What should happen]
- **Reproduction:** [Exact steps, commands, or conditions]
- **Frequency:** [Always / intermittent / specific conditions]

## Investigation Trail
[Chronological record of what you investigated, in order]

### Phase 1: Root Cause Investigation
- Error messages analyzed: [details]
- Recent changes checked: [git log summary, relevant commits]
- Data flow traced: [path from symptom to source]
- Component boundaries tested: [if applicable]

### Phase 2: Pattern Analysis
- Working examples found: [file references]
- Key differences identified: [list]

### Phase 3: Hypotheses Tested
| # | Hypothesis | Test | Result |
|---|-----------|------|--------|
| 1 | [hypothesis] | [what you did] | Confirmed / Rejected |
| 2 | ... | ... | ... |

## Root Cause
[Clear, specific statement of the root cause with evidence]
- **Location:** [file:line]
- **Mechanism:** [How the bug works, step by step]
- **Evidence:** [What proves this is the cause]

## Recommended Fix
[Suggested approach — describe what to change and why, but do NOT implement it]
- **Fix location:** [where to change]
- **Fix approach:** [what to change]
- **Test to add:** [regression test suggestion]
- **Risk assessment:** [what could go wrong with this fix]

## DP-5 Escalation
[Only if 3+ hypotheses failed — architectural concern details]
```

## Writing Investigation Notes

During investigation, you may write intermediate notes to track your progress:
- Use a working file (e.g., `investigation-notes.md`) for scratch work
- Record each hypothesis, test, and result as you go
- This protects against losing your train of thought on complex investigations
- Clean up or consolidate into the final report when done

## Red Flags — Return to Phase 1

"Quick fix, investigate later" / "Just try changing X" / "Skip the test, I'll verify manually" / "It's probably X, let me fix that" / "I don't fully understand but this might work" / "One more fix attempt" (after 2+) / Proposing solutions before tracing data flow.

**All of these mean: STOP. Return to Phase 1.** If 3+ fixes failed, question the architecture.

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| 1. Root Cause | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| 2. Pattern | Find working examples, compare | Identify differences |
| 3. Hypothesis | Form theory, test minimally | Confirmed or new hypothesis |
| 4. Implementation | Create test, fix, verify | Bug resolved, tests pass |

## When No Root Cause Found

If truly environmental/timing-dependent/external: document what you investigated, implement appropriate handling (retry, timeout, error message), add monitoring. But 95% of "no root cause" cases are incomplete investigation.

## Exception Handling

- **Parse failures**: Report raw output, ask for clarification — don't guess
- **Missing files**: Escalate immediately — not a normal debugging scenario
- **User interruption**: Re-read investigation report on resume, continue from last completed phase

## Quality Standards

1. **Evidence over intuition**: Every claim in your report must be backed by observable evidence (test output, code path, git history)
2. **Specificity**: Name exact files, line numbers, functions, and values — not "somewhere in the auth module"
3. **Completeness**: Document what you ruled OUT, not just what you found. Negative results are valuable.
4. **Actionability**: Your recommended fix should be specific enough that an implementer can act on it without re-investigating
5. **Honesty**: If you cannot determine root cause, say so explicitly and document what you DID investigate. 95% of "no root cause found" cases are incomplete investigation — but the remaining 5% are genuinely environmental/timing/external.

## Edge Cases

- **Environmental issues**: If the bug is environment-specific, document the environment differences and suggest environment normalization
- **Timing/race conditions**: Document the timing window, suggest synchronization or defensive handling
- **External dependencies**: If the root cause is in a third-party library, document the version, the specific behavior, and suggest workarounds or upstream issues
- **Cannot reproduce**: Document everything you tried. Suggest monitoring/instrumentation for the next occurrence. Do NOT guess at a cause you cannot verify.
