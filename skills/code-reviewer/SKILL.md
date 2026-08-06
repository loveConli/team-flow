---
name: code-reviewer
description: Review completed implementation batches for spec compliance and code quality. Invoke after execution batches complete, before merging, or when a review gate is reached in the workflow.
---

# Code Reviewer

Two responsibilities: requesting review (dispatching a reviewer subagent) and receiving review (acting on feedback with technical rigor). **Review early, review often. Verify before implementing feedback.**

## Part 1: Requesting Review

**Mandatory after**: each task in SDD, each planned execution wave, each major feature, before merge.
**Optional**: when stuck, before refactoring, after fixing complex bugs.

### Procedure
1. Get SHAs: `BASE_SHA=$(git rev-parse HEAD~1)` and `HEAD_SHA=$(git rev-parse HEAD)`
2. Dispatch `general-purpose` subagent using template at `skills/code-reviewer/code-reviewer-prompt.md`
3. Fill placeholders: `[DESCRIPTION]` (what was built), `[PLAN_OR_REQUIREMENTS]` (contract/spec reference), `[BASE_SHA]`, `[HEAD_SHA]`, `[WAVE_ID]`, and a distinct `[REVIEW_REPORT_FILE]`.
4. Require the reviewer to write a non-empty persisted review report at `[REVIEW_REPORT_FILE]`, then record that exact path in the wave receipt: `tf execution review <change-dir> --wave <id> --base <sha> --head <sha> --report <review-report-path> --verdict <pass|fail>`.
5. Act on feedback: Critical/Important findings require a `fail` receipt, focused repair, re-review, and replacement `pass` receipt before a dependent wave or closing can proceed. Note Minor for later, push back with reasoning if reviewer is wrong.

### Minimality And Scope

For unrequested complexity, cite the missing task requirement and diff line.
Use Important for merge-blocking complexity and Minor for safe,
behavior-neutral redundancy; never score by line count.

## Part 2: Receiving Review Feedback

### The Response Pattern
1. READ feedback without reacting
2. UNDERSTAND and restate requirement
3. VERIFY against codebase reality
4. EVALUATE: technically sound for THIS codebase?
5. RESPOND: technical acknowledgment or reasoned pushback
6. IMPLEMENT: one item at a time, test each

### Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| Critical | Bugs, security, data loss, broken functionality | Fix immediately |
| Important | Architecture problems, missing features, poor error handling, test gaps | Fix before next batch |
| Minor | Code style, optimization, documentation polish | Note for later |

### Architecture Cross-Domain Consistency (v0.10 §28-§31)

When `architecture/api.md` exists, verify the implementation against its **cross-domain consistency** section — specifically the API↔data entity alignment (Command/Read/Query routing vs actual DB entity usage). Flag mismatches as Important.

### Forbidden Responses
Never: performative agreement ("You're right!", "Great point!"), blind implementation before verification, thanking the reviewer. Instead: restate the requirement, ask clarifying questions, push back with reasoning, or just fix it (actions > words).

### Handling Unclear Feedback
If any item is unclear → STOP. Do not implement anything yet. Ask for clarification on unclear items. Partial understanding = wrong implementation.

### Source-Specific Rules

**From user**: Trusted — implement after understanding. Still ask if scope unclear. No performative agreement.

**From external reviewer**: Before implementing, check: technically correct for this codebase? breaks existing functionality? reason for current implementation? works on all platforms? reviewer understands full context? If suggestion seems wrong, push back with technical reasoning.

### When to Push Back
Suggestion breaks existing functionality, reviewer lacks context, violates YAGNI, technically incorrect for this stack, legacy/compatibility reasons, conflicts with user's architectural decisions. Push back with technical reasoning, not defensiveness.

### Implementation Order
1. Clarify unclear items first
2. Fix blocking issues (breaks, security)
3. Fix simple issues (typos, imports)
4. Fix complex issues (refactoring, logic)
5. Test each fix individually, verify no regressions

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Proceeding without a wave receipt | Record `pass`/`fail` via `tf execution review` before the next dependent wave |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |

## Exception Handling

- **Parse failures**: Report specific file, request regenerated review package
- **Missing files**: Regenerate via `scripts/review-package`. Empty diff = nothing to review
- **User interruption**: Re-read review report on resume, continue from next unreviewed batch

---

## Review Process (Agent Methodology)

The code-reviewer agent follows this 6-step process:

### Step 1: Gather Context

1. Read `change-brief.md` to understand scope and constraints
2. Read `specs/*.md` to understand requirements
3. Read `design.md` to understand architectural decisions
4. Get the list of changed files: `git diff --name-only BASE..HEAD` or from the change directory

### Step 2: Spec Compliance Check

For each requirement in specs/:
1. Locate the corresponding implementation
2. Check if the implementation faithfully reflects the spec
3. Note any deviations (with justification or flag as Critical)
4. Build a compliance matrix: spec requirement → implementation status

### Step 3: Code Quality Review

Check for:
- **Readability**: Clear naming, appropriate comments, logical structure
- **Maintainability**: DRY principles, appropriate abstraction, no code smells
- **Error handling**: Proper exception handling, meaningful error messages
- **Performance**: No obvious N+1 queries, no unnecessary loops, appropriate caching
- **Security**: Input validation, SQL injection prevention, XSS prevention, auth checks

### Step 4: Architecture Review

Check for:
- **Separation of concerns**: Each module/class has a single responsibility
- **Dependency direction**: Dependencies flow inward (domain ← application ← infrastructure)
- **Interface design**: Clean APIs, appropriate abstraction layers
- **Scalability**: No obvious bottlenecks, appropriate use of async/queue for heavy operations
- **Consistency**: Follows established patterns in the codebase

### Step 5: Test Coverage Review

Check for:
- **Unit tests**: Each function/method has corresponding unit tests
- **Integration tests**: API endpoints have integration tests
- **Edge cases**: Tests cover boundary conditions, error cases
- **Test quality**: Tests are meaningful (not just "it works"), assertions are specific

### Step 5b: Test Matrix Compliance (v0.12 §44.3)

If `test-matrix.md` exists in the change directory, audit the implementation against it:

1. **Case-by-case verification**: For each case in the matrix:
   - Check if the test implementation exists (`test_file` + `test_method_name` match)
   - Verify assertions match the matrix's `expected` output
   - Verify `design_method` matches actual test approach (a `boundary` case must use real boundary values, not a happy-path disguised as boundary)

2. **Coverage calculation**:
   - Matrix coverage = implemented cases / total cases in matrix（**分母排除 test_tier=e2e**——E2E case 由 release-archivist Step 5b 对账，不在实施层判定）
   - Matrix coverage < 100% → **Critical finding** (test-matrix-gap)
   - List missing case_ids

3. **Candidate Coverage Ledger audit**:
   - Entries with `decision=deferred` have a reasonable `reason`?
   - Entries with `decision=covered` actually have corresponding tests?

4. **Pyramid ratio check**:
   - 分母 = unit + integration（e2e 不计入金字塔配比，v0.38.0）
   - unit cases: 70-80% of (unit+integration)
   - integration cases: ≤30% of (unit+integration)
   - Significant deviation → **Important finding** (test-pyramid-imbalance)

If `test-matrix.md` does NOT exist, skip this step silently (legacy change compatibility).

### Step 6: Documentation Review

Check for:
- **Code comments**: Complex logic is explained
- **API documentation**: Endpoints are documented (Swagger/OpenAPI)
- **README updates**: User-facing changes are documented
- **Change log**: Significant changes are noted

## Severity Levels

| Level | Meaning | Examples |
|-------|---------|----------|
| **Critical** | Must fix before merge | Spec violations, bugs, security issues, data loss risks |
| **Important** | Should fix before next batch | Architecture problems, poor error handling, missing tests |
| **Minor** | Nice to have, note for later | Code style, optimization opportunities, documentation polish |

## Verdict Criteria

| Verdict | Condition |
|---------|-----------|
| **PASS** | No Critical or Important findings |
| **PASS_WITH_WARNINGS** | No Critical, but Important findings exist |
| **FAIL** | Any Critical finding (including Test Matrix Compliance gaps — v0.12 §44.3) |

Test Matrix Compliance Critical findings carry the same weight as Spec Compliance violations — matrix gaps are always Critical, never Important.

## Calibration Rules

1. **Evidence-based**: Every finding must cite specific file:line
2. **Severity-appropriate**: Don't mark style issues as Critical
3. **Constructive**: Provide actionable suggestions, not just complaints
4. **Context-aware**: Consider the change scope and constraints
5. **Spec-grounded**: Spec violations are always Critical (unless explicitly justified)

## Critical Rules

**DO:**
- Read specs and design BEFORE reading implementation
- Build an explicit spec compliance matrix
- Cite file:line for every finding
- Distinguish Critical (spec violation/bug) from Important (architecture/quality)
- Give a clear, unambiguous verdict

**DON'T:**
- Guess at spec requirements not explicitly stated
- Mark style issues as Critical (they're Minor)
- Produce vague findings without file:line references
- Skip the spec compliance check (it's the core deliverable)
- Implement fixes (that's the implementer's job after your review)
