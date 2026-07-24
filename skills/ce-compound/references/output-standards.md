# Output Standards & Common Mistakes

## What It Captures

- **Problem symptom**: Exact error messages, observable behavior
- **Investigation steps tried**: What didn't work and why
- **Root cause analysis**: Technical explanation
- **Working solution**: Step-by-step fix with code examples
- **Prevention strategies**: How to avoid in future
- **Cross-references**: Links to related issues and docs

## Categories (auto-detected from problem)

Bug track:
- build-errors/
- test-failures/
- runtime-errors/
- performance-issues/
- database-issues/
- security-issues/
- ui-bugs/
- integration-issues/
- logic-errors/

Knowledge track:
- architecture-patterns/ — architectural or structural patterns (agent/skill/pipeline/workflow shape decisions)
- design-patterns/ — reusable non-architectural design approaches (content generation, interaction patterns, prompt shapes)
- tooling-decisions/ — language, library, or tool choices with durable rationale
- conventions/ — team-agreed way of doing something, captured so it survives turnover
- workflow-issues/
- developer-experience/
- documentation-gaps/
- best-practices/ — fallback only, use when no narrower knowledge-track value applies

## Common Mistakes to Avoid

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| Subagents write product files into `docs/` or edit tracked paths | Subagents write only scratch artifacts under `<run-dir>/` and return the path; orchestrator writes the one final doc |
| Subagent returns a long prose body only as its inline response | Subagent writes full output to its run artifact; orchestrator Reads it back (inline return is fallback only) |
| Research and assembly run in parallel | Research completes → then assembly runs |
| Multiple files created during workflow | One solution doc written or updated: `docs/solutions/[category]/[filename].md` (plus optional maintenance writes: a `CONCEPTS.md` create/update from Phase 2.4, and — interactive Full only, after consent — a small instruction-file edit for discoverability) |
| Headless Discoverability Check edits AGENTS.md/CLAUDE.md | Headless Full reports `Instruction-file edit: gap noted, not applied`; headless Lightweight emits a discoverability tip; only interactive Full applies the edit after consent |
| Creating a new doc when an existing doc covers the same problem | Check overlap assessment; update the existing doc when overlap is high |
| Asserting code behavior or merge-state from conversation memory | Read the defining source line before asserting; cite PR numbers over SHAs; soften unverifiable claims (Phase 1 extractor rules, re-checked in Phase 2.45) |
| Batching several learnings through one run and stitching cross-references between drafts | One learning per run; run the skill sequentially for each additional learning |

## Success Output — Headless Mode

Emit a structured terminal report and end the turn. No "What's next?" question, no blocking prompt. End with `Documentation complete` as the terminal signal so callers can detect completion.

For `depth:lightweight`, use this lower-overhead report after the Lightweight Mode workflow:

```
✓ Documentation complete (headless lightweight mode)

File: docs/solutions/<category>/<filename>.md  (created | updated)
Track: <bug | knowledge>
Category: <category>
Grounding: <mechanical check clean | N flags adjudicated>
Discoverability: <no gap | gap noted — instruction-file tip emitted | not applicable — no active project instructions>
CONCEPTS.md: <not present | scanned, no qualifying terms | updated — N added, N refined>
CONCEPTS.md discoverability: <not checked — CONCEPTS.md not refined | no gap | gap noted — instruction-file tip emitted | not applicable — no active project instructions>
Refresh recommendation: <none | scope hint for /ce-compound-refresh>

Documentation complete
```

For `depth:full` or backward-compatible headless calls with no depth token, use the Full report:

```
✓ Documentation complete (headless mode)

File: docs/solutions/<category>/<filename>.md  (created | updated)
Track: <bug | knowledge>
Category: <category>
Overlap: <none | low | moderate — see <path> | high — existing doc updated>
Grounding: <clean | N flags adjudicated (X fixed, Y annotated, Z confirmed) | N claims softened or corrected | degraded — merge-state claims unverified offline>
Instruction-file edit: <none needed | gap noted, not applied>
CONCEPTS.md: <scanned, no qualifying terms | created with N entries (M seeded from the learning's area) | updated — N added, N refined>
Refresh recommendation: <none | scope hint for /ce-compound-refresh>

Documentation complete
```

When no doc was written (e.g., headless invoked on a session where the problem is not yet solved), emit a structured failure instead and end with `Documentation skipped` so callers can distinguish success from no-op:

```
✗ Documentation skipped (headless mode)

Reason: <one-sentence explanation — e.g., "no solved problem detected in
conversation history" or "solution not yet verified">

Documentation skipped
```

## Success Output — Interactive Mode

```
✓ Documentation complete

Ran Full mode.
Auto memory: 2 relevant entries used as supplementary evidence

Subagent Results:
  ✓ Context Analyzer: Identified performance_issue in brief_system, category: performance-issues/
  ✓ Solution Extractor: 3 code fixes, prevention strategies
  ✓ Related Docs Finder: 2 related issues
  ✓ Session History: 3 prior sessions on same branch, 2 failed approaches surfaced

Grounding Validation:
  ✓ Mechanical check: 14 paths, 2 SHAs, 3 links checked — 1 flag annotated as historical
  ✓ Semantic validator: 9 claims verified, 1 merge-state claim softened to pending

Specialized Agent Reviews (Auto-Triggered):
  ✓ performance-oracle: Validated query optimization approach
  ✓ Code simplification review: Code examples are appropriately minimal

Files written:
- docs/solutions/performance-issues/n-plus-one-brief-generation.md (created)
- CONCEPTS.md (created with 3 entries: BriefSystem, EmailQueue, Brief Status)

This documentation will be searchable for future reference when similar
issues occur in the Email Processing or Brief System modules.

Refresh recommendation: none
```

**End the turn after the summary — `ce-compound` does not present a "What's next?" menu.** The doc is written and any cross-references the workflow found are already in it. Cross-doc maintenance (fixing references in *other* docs, consolidation) is deferred to `ce-compound-refresh` via the `Refresh recommendation` line above — the skill designed for it — not auto-applied here, which would edit tracked docs beyond the one deliverable. If the user wants to view the file or take a follow-up action, they will ask. (Interactive mode only.)

**Alternate interactive output (when updating an existing doc due to high overlap):** in headless mode, this case is communicated via the `Overlap: high — existing doc updated` line of the headless terminal report above, not as a separate output block.

```
✓ Documentation updated (existing doc refreshed with current context)

Overlap detected: docs/solutions/performance-issues/n-plus-one-queries.md
  Matched dimensions: problem statement, root cause, solution, referenced files
  Action: Updated existing doc with fresher code examples and prevention tips

File updated:
- docs/solutions/performance-issues/n-plus-one-queries.md (added last_updated: 2026-03-24)
```

## The Compounding Philosophy

This creates a compounding knowledge system:

1. First time you solve "N+1 query in brief generation" → Research (30 min)
2. Document the solution → docs/solutions/performance-issues/n-plus-one-briefs.md (5 min)
3. Next time similar issue occurs → Quick lookup (2 min)
4. Knowledge compounds → Team gets smarter

The feedback loop:

```
Build → Test → Find Issue → Research → Improve → Document → Validate → Deploy
    ↑                                                                      ↓
    └──────────────────────────────────────────────────────────────────────┘
```

**Each unit of engineering work should make subsequent units of work easier—not harder.**

## Applicable Specialized Local Prompts

Based on problem type, these local prompt assets can enhance documentation:

### Code Quality & Review
- **Read-only code simplification review**: Checks solution examples and documentation claims for unnecessary complexity without mutating product code
- **references/agents/pattern-recognition-specialist.md**: Identifies anti-patterns or repeating issues

### Specific Domain Experts
- **references/agents/performance-oracle.md**: Analyzes performance_issue category solutions
- **references/agents/security-sentinel.md**: Reviews security_issue solutions for vulnerabilities
- **references/agents/data-integrity-guardian.md**: Reviews database_issue migrations and queries

### Enhancement & Research
- **references/agents/best-practices-researcher.md**: Enriches solution with industry best practices
- **references/agents/framework-docs-researcher.md**: Links to framework/library documentation references

### When to Invoke
- **Auto-triggered** (optional): Generic subagents seeded with local prompts can run post-documentation for enhancement
- **Manual trigger**: User can run surviving skills such as `ce-simplify-code` after `/ce-compound` completes for deeper code review and mutation
