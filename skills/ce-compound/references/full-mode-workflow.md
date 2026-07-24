# Full Mode — Detailed Workflow

<critical_requirement>
**The primary deliverable is ONE file - the final documentation.**

Phase 1 subagents write their full structured output to a per-run scratch artifact under `<run-dir>/` and return only a compact confirmation containing the artifact path. The orchestrator Reads those artifacts back in Phase 2 assembly. This is scratch space, identical in spirit to `ce-code-review`'s per-reviewer run artifacts; it does not make the scratch files additional deliverables. **Only the orchestrator writes product files** — the final solution doc and the maintenance side effects below. Subagents must not touch `docs/`, project instruction files, or any tracked path. Beyond the Phase 2 solution doc, the orchestrator may also write maintenance side effects — not additional deliverables, and creating one when absent is expected, not a violation of this rule. There are three write-target classes; only the first two are unconditional:
- **`docs/solutions/...`** — the primary deliverable (always).
- **`CONCEPTS.md`** — create or update in Phase 2.4 (Vocabulary Capture) when a qualifying domain term surfaces (Full mode; every mode that reaches vocabulary capture may refine an existing file).
- **A project instruction file** (AGENTS.md or CLAUDE.md) — a small edit when the Discoverability Check finds a gap, **only in interactive Full mode after consent**. Headless and lightweight never apply this edit (they report or tip instead). Callers that hand off headless after an approval gate must not see an unreviewed change to the repo's operating contract.

`CONCEPTS.md` and the instruction-file edit ensure future agents can discover and ground in the knowledge store; neither makes the documentation any less the single deliverable.

**Why the scratch artifact (issue #956):** a subagent asked to return a long prose body as its inline response intermittently returns an executive summary instead ("Doc body complete — six sections filled. Returning above."), and the original prose is then unrecoverable from the orchestrator side. Writing to disk first means the full output always survives; the inline confirmation is just a pointer, and the orchestrator falls back to whatever the subagent did return inline only when the artifact is missing.
</critical_requirement>

---

## Phase 0.5: Auto Memory Scan

Before launching Phase 1 subagents, check the auto-memory block injected into your system prompt for notes relevant to the problem being documented.

1. Look for a block labeled "user's auto-memory" (Claude Code only) already present in your system prompt context — MEMORY.md's entries are inlined there
2. If the block is absent, empty, or this is a non-Claude-Code platform, skip this step and proceed to Phase 1 unchanged
3. Scan the entries for anything related to the problem being documented -- use semantic judgment, not keyword matching
4. If relevant entries are found, prepare a labeled excerpt block:

```
## Supplementary notes from auto memory
Treat as additional context, not primary evidence. Conversation history
and codebase findings take priority over these notes.

[relevant entries here]
```

5. Pass this block as additional context to the Context Analyzer and Solution Extractor task prompts in Phase 1. If any memory notes end up in the final documentation (e.g., as part of the investigation steps or root cause analysis), tag them with "(auto memory [claude])" so their origin is clear to future readers.

If no relevant entries are found, proceed to Phase 1 without passing memory context.

---

## Phase 1: Research

Launch research subagents. Each writes its full output to a per-run scratch artifact and returns only the artifact path to the orchestrator.

**Run ID and run dir (before dispatching any subagent):** generate a unique run identifier and create the run directory. This scopes every Phase 1 artifact file to the same directory so the orchestrator can Read them back in Phase 2.

```bash
SCRATCH_ROOT="/tmp/compound-engineering-$(id -u)";
if [ -L "$SCRATCH_ROOT" ]; then echo "unsafe scratch root symlink: $SCRATCH_ROOT" >&2; exit 1; fi;
install -d -m 700 "$SCRATCH_ROOT" || exit 1;
if [ -L "$SCRATCH_ROOT" ] || [ ! -O "$SCRATCH_ROOT" ]; then echo "scratch root is not owned by the current user: $SCRATCH_ROOT" >&2; exit 1; fi;
chmod 700 "$SCRATCH_ROOT" || exit 1;
RUN_ID=$(date +%Y%m%d-%H%M%S)-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' ');
RUN_DIR="$SCRATCH_ROOT/ce-compound/$RUN_ID";
(umask 077; mkdir -p "$RUN_DIR") || exit 1; chmod 700 "$RUN_DIR" || exit 1;
echo "$RUN_DIR";
```

**Resolve current vocabulary and conventions before dispatching subagents.** Use the project's active instructions and conventions already in your context. If `CONCEPTS.md` exists, read its relevant terms and pass them to the Context Analyzer.

**CRITICAL — glob `docs/solutions/` fresh every run.** The current vocabulary and conventions above do not substitute for the live-tree search in step 3.

Pass `{run_id}` and the resolved absolute `{run_dir}` into every Phase 1 subagent prompt. Each subagent **writes its full structured output** to its own file under `{run_dir}/`, **confirms the write succeeded** (the file exists and is non-empty), and then **returns only a one-line confirmation containing the artifact path** — not the prose body inline. Artifact filenames by subagent:

- **Context Analyzer** → `{run_dir}/context.json` (frontmatter skeleton, category path, filename, track)
- **Solution Extractor** → `{run_dir}/solution.md` (the full doc-body prose sections)
- **Related Docs Finder** → `{run_dir}/related.json` (links, refresh candidates, overlap assessment)
- **Session History** synthesis subagent (when run) → `{run_dir}/session-history.md` (prose findings)

**Return the full output inline whenever the artifact write did not succeed.** This covers both cases where the orchestrator's Phase 2 inline fallback would otherwise have nothing to read: (a) `{run_id}` is empty or did not resolve (non-Claude-Code platforms where the pre-resolution failed), so there is no path to write to; and (b) `{run_id}` resolved but the write itself failed — tool permission denied, absolute-path writes unavailable, disk error, or the post-write existence check came back empty. In either case the subagent must return its complete structured output inline instead of a path, because the path would point at a file that does not exist. Return only the bare path when — and only when — the write is confirmed on disk. The artifact pattern is a reliability improvement, not a hard requirement; the orchestrator handles a missing artifact in Phase 2 by using the inline return.

**Dispatch order:**
- Launch `Context Analyzer`, `Solution Extractor`, and `Related Docs Finder` in parallel (background)
- **Then** run the internal session-history discovery/extraction/synthesis flow (see step 4 below) in Full mode, including headless — skipped only in lightweight. Its cheap discovery+metadata probe always runs; it escalates to extraction+synthesis only on a relevance hit (see step 4's Escalation gate). This flow is synchronous from this orchestrator's main-context turn, but the already-dispatched background subagents continue running in parallel underneath, so the wall-clock benefit is preserved (`max(session-history, slowest background subagent)`, not their sum). Running session history before the parallel block would serialize it in front of the research subagents and regress wall-clock time.

<parallel_tasks>

### 1. Context Analyzer
   - Extracts conversation history
   - Reads `references/schema.yaml` for enum validation and **track classification**
   - Determines the track (bug or knowledge) from the problem_type
   - Identifies problem type, component, and track-appropriate fields:
     - **Bug track**: symptoms, root_cause, resolution_type
     - **Knowledge track**: applies_when (symptoms/root_cause/resolution_type optional)
   - Incorporates auto memory excerpts (if provided by the orchestrator) as supplementary evidence
   - Reads `references/yaml-schema.md` for category mapping into `docs/solutions/`
   - Suggests a filename using the pattern `[sanitized-problem-slug].md` — no date suffix, even if existing files in the target directory have one; the `date:` frontmatter field is the canonical creation date
   - Writes to `context.json`: YAML frontmatter skeleton (must include `category:` field mapped from problem_type), category directory path, suggested filename, and which track applies. Returns only the artifact path.
   - Does not invent enum values, categories, or frontmatter fields from memory; reads the schema and mapping files above
   - Does not force bug-track fields onto knowledge-track learnings or vice versa

### 2. Solution Extractor
   - Reads `references/schema.yaml` for track classification (bug vs knowledge)
   - Adapts output structure based on the problem_type track
   - **Writes the full doc-body prose** (all track-appropriate sections below) to `solution.md` and returns only the artifact path. This is the subagent most prone to the issue #956 summary-collapse, so its prose must land on disk rather than only in the inline return.
   - Incorporates auto memory excerpts (if provided by the orchestrator) as supplementary evidence -- conversation history and the verified fix take priority; if memory notes contradict the conversation, note the contradiction as cautionary context
   - **Grounds code-behavior claims in source, not conversation memory.** Before asserting how code behaves (enum values, status semantics, limits, defaults), Read the defining line at the current tree and cite `file:line` alongside the claim. A claim that cannot be verified against the tree is softened or attributed ("per this session's conclusion…"), never stated as fact
   - **Writes merge-state claims for time.** Cite PR numbers rather than bare commit SHAs — SHAs are rewritten by rebase/squash merges and may not exist on other checkouts. A "fixed in X" claim requires the fix to be reachable from the current tree; otherwise phrase it as pending ("fix opened in #1608, unmerged as of this writing")

   **Bug track output sections:**

   - **Problem**: 1-2 sentence description of the issue
   - **Symptoms**: Observable symptoms (error messages, behavior)
   - **What Didn't Work**: Failed investigation attempts and why they failed
   - **Solution**: The actual fix with code examples (before/after when applicable)
   - **Why This Works**: Root cause explanation and why the solution addresses it
   - **Prevention**: Strategies to avoid recurrence, best practices, and test cases. Include concrete code examples where applicable (e.g., gem configurations, test assertions, linting rules)

   **Knowledge track output sections:**

   - **Context**: What situation, gap, or friction prompted this guidance
   - **Guidance**: The practice, pattern, or recommendation with code examples when useful
   - **Why This Matters**: Rationale and impact of following or not following this guidance
   - **When to Apply**: Conditions or situations where this applies
   - **Examples**: Concrete before/after or usage examples showing the practice in action

### 3. Related Docs Finder
   - Searches `docs/solutions/` for related documentation
   - Identifies cross-references and links
   - Finds related GitHub issues
   - Flags any related learning or pattern docs that may now be stale, contradicted, or overly broad
   - **Assesses overlap** with the new doc being created across five dimensions: problem statement, root cause, solution approach, referenced files, and prevention rules. Score as:
     - **High**: 4-5 dimensions match — essentially the same problem solved again
     - **Moderate**: 2-3 dimensions match — same area but different angle or solution
     - **Low**: 0-1 dimensions match — related but distinct
   - Writes to `related.json`: Links, relationships, refresh candidates, and overlap assessment (score + which dimensions matched). Returns only the artifact path.

   **Search strategy (grep-first filtering for efficiency):**

   1. Extract keywords from the problem context: module names, technical terms, error messages, component types
   2. If the problem category is clear, narrow search to the matching `docs/solutions/<category>/` directory
   3. Use the native content-search tool (e.g., Grep in Claude Code) to pre-filter candidate files BEFORE reading any content. Run multiple searches in parallel, case-insensitive, targeting frontmatter fields. These are template patterns -- substitute actual keywords:
      - `title:.*<keyword>`
      - `tags:.*(<keyword1>|<keyword2>)`
      - `module:.*<module name>`
      - `component:.*<component>`
   4. If search returns >25 candidates, re-run with more specific patterns. If <3, broaden to full content search
   5. Read only frontmatter (first 30 lines) of candidate files to score relevance
   6. Fully read only strong/moderate matches
   7. Return distilled links and relationships, not raw file contents

   **GitHub issue search:**

   Prefer the `gh` CLI for searching related issues: `gh issue list --search "<keywords>" --state all --limit 5`. If `gh` is not installed, fall back to the GitHub MCP tools (e.g., `unblocked` data_retrieval) if available. If neither is available, skip GitHub issue search and note it was skipped in the output.

</parallel_tasks>

### 4. Session History (internal flow after launching the parallel block — automatic in Full mode, including headless)
   - **Skip entirely** in lightweight mode. In Full mode (including headless) it always runs as a two-stage probe: the cheap discovery+metadata pass (below) always executes, and the expensive extraction+synthesis executes only when the probe clears the relevance gate (see **Escalation gate** below).
   - Run session discovery, branch/keyword filtering, scan-window selection, deep-dive selection, and per-session extraction directly inside this skill using `scripts/session-history/`.
   - Read the skill-local synthesis prompt at `references/agents/session-historian.md`, then dispatch a generic subagent using that prompt content. Do not dispatch a standalone agent by type/name.

   **Session-history payload — keep tight.** A long, keyword-rich payload licenses widening. Use this shape:

   - **Session context** (only if the values resolved cleanly above; otherwise omit): repo name, current git branch.
   - **Time window**: explicit `7 days` unless the documented problem clearly spans a longer arc.
   - **Problem topic**: one sentence naming the concrete issue — error message, module name, what broke and how it was fixed. Not a paragraph; not a bullet list of related topics.
   - **Filter rule (one line)**: "Only surface findings directly relevant to this specific problem. Ignore unrelated work from the same sessions or branches."
   - **Output schema**:

     ```
     Structure your response with these sections (omit any with no findings):
     - What was tried before
     - What didn't work
     - Key decisions
     - Related context
     ```

   Do not append additional context blocks, exclusion lists, or topic-keyword bullets — verbose payloads give the session-history flow license to keep widening the search and rapidly compound wall time. If keyword search is needed, the internal flow owns that decision based on the topic.
   - Returns: structured digest of findings from prior sessions, or "no relevant prior sessions" if none found.
   - **Session history is the final Phase 1 input, not a workflow stop.** When it returns, proceed directly to Phase 2 with its output as the last input — do not emit a summary and do not pause for the user. A "no relevant prior sessions" return is still a valid input; the documentation gets written without session context.

   **Script resolution.** Set `SKILL_DIR` to the absolute path of the directory containing the SKILL.md you just read, and run the bundled scripts from `"$SKILL_DIR/scripts/session-history/"`. Set `SKILL_DIR` inline in each bash block below (shell state does not persist between commands). If the bundled scripts are genuinely not present on disk under `"$SKILL_DIR/scripts/session-history/"`, skip session history visibly with: "Session history bundled scripts were not found in this skill's directory; skipping the session-history probe for this run." Continue Phase 2 without session context.

   **Discovery pipeline.** Infer the scan window from the problem topic, starting with 7 days. Run discovery and metadata extraction:

   ```bash
   SKILL_DIR="<absolute path of the directory containing the SKILL.md you just read>";
   if [ -f "$SKILL_DIR/scripts/session-history/discover-sessions.sh" ] && [ -f "$SKILL_DIR/scripts/session-history/extract-metadata.py" ]; then REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd); REPO_NAME=$(basename "$REPO_ROOT"); SCAN_DAYS="7"; bash "$SKILL_DIR/scripts/session-history/discover-sessions.sh" "$REPO_NAME" "$SCAN_DAYS" --cwd "$REPO_ROOT" | tr '\n' '\0' | xargs -0 python3 "$SKILL_DIR/scripts/session-history/extract-metadata.py" --cwd-filter "$REPO_ROOT"; else echo "Session history bundled scripts were not found in this skill's directory; skipping the session-history probe for this run."; fi
   ```

   Pi sessions are included when present under `~/.pi/agent/sessions/`; they carry `cwd` like Codex but no git branch. If `_meta.files_processed` is `0`, return `no relevant prior sessions`. If the first pass finds no relevant branch matches, or if processing Codex or Pi sessions, derive 2-4 keywords from the topic and re-run metadata extraction with `--keyword K1,K2,...`. Keep at most 5 sessions across Claude Code, Codex, Cursor, and Pi, ranked by branch match, keyword match count, file size over 30KB, and recency. Exclude the current session.

   **Escalation gate.** The discovery+metadata pass above is the cheap probe and always runs in Full mode. Escalate to the extraction and synthesis stages below **only** when at least one retained candidate clears the relevance bar: a current-branch match, or ≥2 topic-keyword matches. If no candidate clears the bar (including the `_meta.files_processed` is `0` case), stop here, record `no relevant prior sessions` as the session-history input, and skip extraction and synthesis. This gate is what keeps the always-on probe cheap — the expensive synthesis is paid for only when a prior session is genuinely relevant.

   **Extraction pipeline.** Create `SCRATCH=$(mktemp -d -t ce-compound-sessions-XXXXXX)`. For each selected session, write extracted content to scratch files:

   ```bash
   SKILL_DIR="<absolute path of the directory containing the SKILL.md you just read>";
   if [ -f "$SKILL_DIR/scripts/session-history/extract-skeleton.py" ]; then python3 "$SKILL_DIR/scripts/session-history/extract-skeleton.py" --output "$SCRATCH/<session-id>.skeleton.txt" < <session-file>; else echo "Session history bundled scripts were not found in this skill's directory; skipping the session-history probe for this run."; fi
   ```

   Use `extract-errors.py` selectively when dead ends or recurring errors are likely useful. Pass only the scratch file paths and metadata to the synthesis subagent.

   **Synthesis dispatch.** Build a generic subagent prompt containing:
   - the full content of `references/agents/session-historian.md`
   - `problem_topic`
   - `scratch_dir`
   - a `sessions` array with extracted file paths and metadata
   - the output schema above
   - the filter rule above

   The subagent reads only the scratch paths, **writes its prose findings to `{run_dir}/session-history.md`, and returns only that artifact path once the write is confirmed** (same #956 reliability rationale — session-history findings are long-form prose prone to summary-collapse). If `{run_id}` did not resolve or the artifact write failed, it returns the prose inline instead (per the inline-fallback rule above). If synthesis fails, note the failure and continue without session context.

---

## Phase 2: Assembly & Write

<sequential_tasks>

**WAIT for all Phase 1 inputs to complete before proceeding** — the three parallel subagents and, in Full mode, the internal session-history flow (which may have stopped at the probe with `no relevant prior sessions`). Session history is a Phase 1 input even though it runs in the orchestrator rather than as a public skill.

The orchestrating agent (main conversation) performs these steps:

1. **Collect Phase 1 results from the run artifacts.** For each Phase 1 subagent, `Read` its artifact file under `{run_dir}/` (`context.json`, `solution.md`, `related.json`, and `session-history.md` when session history ran). The artifact holds the subagent's full output. **Fall back to the subagent's inline return only when its artifact file is absent or empty** (e.g., `{run_id}` did not resolve, or the subagent failed to write). The artifact is authoritative when present — this is what makes the workflow resilient to the issue #956 summary-collapse, where the inline return is only an executive summary.
2. **Check the overlap assessment** from the Related Docs Finder before deciding what to write:

   | Overlap | Action |
   |---------|--------|
   | **High** — existing doc covers the same problem, root cause, and solution | **Update the existing doc** with fresher context (new code examples, updated references, additional prevention tips) rather than creating a duplicate. The existing doc's path and structure stay the same. |
   | **Moderate** — same problem area but different angle, root cause, or solution | **Create the new doc** normally. Flag the overlap for Phase 2.5 to recommend consolidation review. |
   | **Low or none** | **Create the new doc** normally. |

   The reason to update rather than create: two docs describing the same problem and solution will inevitably drift apart. The newer context is fresher and more trustworthy, so fold it into the existing doc rather than creating a second one that immediately needs consolidation.

   When updating an existing doc, preserve its file path and frontmatter structure. Update the solution, code examples, prevention tips, and any stale references. Add a `last_updated: YYYY-MM-DD` field to the frontmatter. Do not change the title unless the problem framing has materially shifted.

3. **Incorporate session history findings** (if available). When the internal session-history flow returned relevant prior-session context:
   - Fold investigation dead ends and failed approaches into the **What Didn't Work** section (bug track) or **Context** section (knowledge track)
   - Use cross-session patterns to enrich the **Prevention** or **Why This Matters** sections
   - Tag session-sourced content with "(session history)" so its origin is clear to future readers
   - If findings are thin or "no relevant prior sessions," proceed without session context
4. Assemble complete markdown file from the collected pieces, reading `assets/resolution-template.md` for the section structure of new docs
5. Validate YAML frontmatter against `references/schema.yaml`, including the YAML-safety quoting rule for array items (see `references/yaml-schema.md` > YAML Safety Rules)
6. Create directory if needed: `mkdir -p docs/solutions/[category]/`
7. Write the file: either the updated existing doc or the new `docs/solutions/[category]/[filename].md`
8. **Validate parser-safety of the written frontmatter** to catch silent-corruption issues the prose rules miss: malformed `---` delimiter lines, unquoted ` #` in scalar values (silent comment truncation), and unquoted `: ` in scalar values (silent mapping confusion). The bundled validator ships **inside the skill bundle**; on Claude Code `${CLAUDE_SKILL_DIR}` resolves to the skill directory, but the runtime Bash tool's CWD is the user's project, so a project-relative path (without the `${CLAUDE_SKILL_DIR}` prefix) would miss. Run it through an existence guard so platforms that cannot locate the script (e.g. native Codex/Gemini installs, where `${CLAUDE_SKILL_DIR}` is unset) fall back to a manual check instead of silently skipping the protection:

   ```bash
   if [ -n "${CLAUDE_SKILL_DIR}" ] && [ -f "${CLAUDE_SKILL_DIR}/scripts/validate-frontmatter.py" ]; then
     python3 "${CLAUDE_SKILL_DIR}/scripts/validate-frontmatter.py" <output-path>;
   else
     echo "Bundled validate-frontmatter.py not resolvable on this platform; applying the parser-safety checklist manually.";
   fi
   ```

   - **If the script ran:** exit 0 means parser-safe; exit 1 means stderr names the offending field(s) — quote the value(s), re-write the doc, and re-run until exit 0. Do not declare success while validation fails.
   - **If the script did not run** (else branch): apply the validator's checks by hand, matching its exact scope — checking more broadly risks edits the validator would not require. Fix any violation by quoting the whole value before continuing:
     1. The opening and closing frontmatter delimiters are each a line whose content is `---` (trailing whitespace is fine; `----` or `---extra` is not a valid delimiter).
     2. For each **top-level** mapping entry (`key: value`, no leading indentation) whose value is **not already quoted or structured** (does not start with `"`, `'`, `[`, `{`, `|`, or `>`): the value must contain no unquoted ` #` (space-then-hash — YAML treats it as a comment and silently truncates) and no unquoted `: ` (colon-then-space — strict YAML may read it as a nested mapping). Quote the whole value if either appears.
     Nested values, array items, and already-quoted values are out of scope here (array-item quoting is handled by the schema/YAML-safety step above). Then state in the completion output that the bundled script validator was unavailable on this platform and the checks were applied manually.

   The validator does not enforce schema rules and does not flag YAML reserved-indicator characters (those produce loud parser errors downstream rather than silent corruption — out of scope). Uses Python 3 stdlib only (no PyYAML or other deps).

When creating a new doc, preserve the section order from `assets/resolution-template.md` unless the user explicitly asks for a different structure.

</sequential_tasks>

---

## Phase 2.4: Vocabulary Capture

**First, read `references/concepts-vocabulary.md`.** This is unconditional. Do not pre-judge from memory that nothing qualifies — the reference's criteria are non-obvious and qualifying terms often live in the surrounding conversation rather than the new doc itself. Reading the reference is what makes the rest of the phase possible.

Then, applying those criteria, scan the new doc **and** the surrounding conversation for qualifying domain terms. If `CONCEPTS.md` exists at repo root, add missing qualifying terms and refine existing entries when new precision surfaced. If it does not exist and at least one qualifying term surfaced, create it.

**Verify behavior assertions against source before writing them.** When an entry asserts how code behaves (states, transitions, limits, semantics), Read the defining source at the current tree first — an entry drafted from a session-level summary is exactly how wrong semantics enter the glossary. Phase 2.45 re-checks these entries, but the cheap fix is to not write the error.

**Seed the learning's area at creation — don't write a lone term.** When `CONCEPTS.md` does not yet exist, alongside the surfaced term also seed the core domain nouns of the area this learning touched, following the **Seed goal** and **Scope of a seed** rules in `references/concepts-vocabulary.md`. The seed is scoped to the learning's area (the modules and domain the fix touched) and defines only terms investigated here — it does not reach for repo-wide nouns. This anchors the surfaced term so it does not dangle against undefined siblings. A repo-wide concept map is `ce-compound-refresh`'s bootstrap path, not this one.

**At creation, hold the qualifying bar conservatively for borderline terms.** A borderline term, or a class/table/file name dressed up as an entity, defers to a later run — clear core nouns are seeded, borderline ones wait. The conservatism is about quality, not count; updates to an existing file follow the normal criteria.

**When bootstrapping the file, start with this preamble under the `# Concepts` heading**, then add the qualifying entries below it:

> Shared domain vocabulary for this project — entities, named processes, and status concepts with project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or catch-all.

**Refresh the coherence neighborhood of any entry you touch.** When adding or editing an entry, also inspect its *coherence neighborhood* — its cluster siblings and the terms it cross-references or that reference it. Within that neighborhood, do two things: fix glossary violations (implementation specifics — file paths, class names, function signatures, current-config values), and refresh entries the learning's own evidence shows have drifted. Bounds: neighborhood only, never a full-file audit; refresh only on evidence already in hand; if judging a neighbor would require investigation this learning did not do, flag it for `ce-compound-refresh` rather than editing on a guess. The test: after the edit, would a reader find the touched entry's siblings or referenced terms inconsistent with it? Broader audit is `ce-compound-refresh`'s job.

If no terms qualified after applying the reference's criteria, record that outcome explicitly in the success output (e.g., "Vocabulary capture: scanned, no qualifying terms"). Do not silently skip — the visible scan-and-no-result record is the audit signal that the reference was consulted.

**Apply edits silently in every mode — no user prompt in interactive, lightweight, or headless.** Vocabulary capture is a side effect of compounding, not a decision the user makes per run. Lightweight mode reaches this through its own single-pass step (see Lightweight Mode), and runs an **update-only** version — it refines an existing `CONCEPTS.md` but defers creation/seeding to a Full run.

---

## Phase 2.45: Grounding Validation

The doc (and any `CONCEPTS.md` entries from Phase 2.4) is about to become permanent, trusted knowledge. Validate its claims against the tree before it compounds. **Read `references/grounding-validation.md` now** — it holds the adjudication rules and the validator prompt; the steps below are only the trigger.

1. **Mechanical claims check (every mode, including headless).** Optionally run `git fetch --quiet` first (best-effort — skip silently offline; the network is never a correctness dependency). Then run the bundled validator against the written doc:

   ```bash
   SKILL_DIR="<absolute path of the directory containing the SKILL.md you just read>";
   python3 "$SKILL_DIR/scripts/validate-doc-claims.py" <doc-path>
   ```

   Exit 0 means nothing flagged. Exit 1 means flags to **adjudicate, not auto-fix** — each flagged path, SHA, link, or scaffold pattern is fixed, annotated as historical, or confirmed intentional per the reference's adjudication table. A doc may legitimately cite a path deleted by the very fix it documents; a flag is a question, not a failure. If the script cannot be resolved on this platform, apply the reference's manual checklist and say so in the output — never silently skip.

2. **Semantic grounding validator (Full mode, including headless Full; lightweight skips it).** Dispatch one read-only generic subagent built from the prompt template in the reference, covering the written doc plus any `CONCEPTS.md` entries added or edited this run. It verifies code-behavior claims by quoting the defining source line, merge-state claims against remote truth (`gh` primary, git reachability fallback), and internal completeness of countable assertions. Apply its verdicts per the reference (fix contradicted claims from the quoted evidence; soften or drop unverifiable ones; mark offline merge-state checks as degraded), then re-run the mechanical check if the body changed.

---

## Phase 2.5: Selective Refresh Check

After writing the new learning, decide whether this new solution is evidence that older docs should be refreshed.

`ce-compound-refresh` is **not** a default follow-up. Use it selectively when the new learning suggests an older learning or pattern doc may now be inaccurate.

It makes sense to invoke `ce-compound-refresh` when one or more of these are true:

1. A related learning or pattern doc recommends an approach that the new fix now contradicts
2. The new fix clearly supersedes an older documented solution
3. The current work involved a refactor, migration, rename, or dependency upgrade that likely invalidated references in older docs
4. A pattern doc now looks overly broad, outdated, or no longer supported by the refreshed reality
5. The Related Docs Finder surfaced high-confidence refresh candidates in the same problem space
6. The Related Docs Finder reported **moderate overlap** with an existing doc — there may be consolidation opportunities that benefit from a focused review

It does **not** make sense to invoke `ce-compound-refresh` when:

1. No related docs were found
2. Related docs still appear consistent with the new learning
3. The overlap is superficial and does not change prior guidance
4. Refresh would require a broad historical review with weak evidence

Use these rules:

- If there is **one obvious stale candidate**, invoke `ce-compound-refresh` with a narrow scope hint after the new learning is written
- If there are **multiple candidates in the same area**, ask the user whether to run a targeted refresh for that module, category, or pattern set
- If context is already tight or you are in lightweight mode, do not expand into a broad refresh automatically; instead recommend `ce-compound-refresh` as the next step with a scope hint
- **In headless mode**, never invoke `ce-compound-refresh` and never ask the user. Surface the recommended scope hint in the terminal report's "Refresh recommendation" line and let the caller decide

When invoking or recommending `ce-compound-refresh`, be explicit about the argument to pass. Prefer the narrowest useful scope:

- **Specific file** when one learning or pattern doc is the likely stale artifact
- **Module or component name** when several related docs may need review
- **Category name** when the drift is concentrated in one solutions area
- **Pattern filename or pattern topic** when the stale guidance lives in `docs/solutions/patterns/`

Examples:

- `/ce-compound-refresh plugin-versioning-requirements`
- `/ce-compound-refresh payments`
- `/ce-compound-refresh performance-issues`
- `/ce-compound-refresh critical-patterns`

A single scope hint may still expand to multiple related docs when the change is cross-cutting within one domain, category, or pattern area.

Do not invoke `ce-compound-refresh` without an argument unless the user explicitly wants a broad sweep.

Always capture the new learning first. Refresh is a targeted maintenance follow-up, not a prerequisite for documentation.

---

## Discoverability Check

After the learning is written and the refresh decision is made, check whether the project's instruction files would lead an agent to discover and search `docs/solutions/` before starting work in a documented area. This runs every time — the knowledge store only compounds value when agents can find it.

1. Identify which root-level instruction files exist (AGENTS.md, CLAUDE.md, or both). Read the file(s) and determine which holds the substantive content — one file may just be a shim that `@`-includes the other (e.g., `CLAUDE.md` containing only `@AGENTS.md`, or vice versa). The substantive file is the assessment and edit target; ignore shims. If neither file exists, skip this check entirely.
2. Assess whether an agent reading the instruction files would learn three things:
   - That a searchable knowledge store of documented solutions exists
   - Enough about its structure to search effectively (category organization, YAML frontmatter fields like `module`, `tags`, `problem_type`)
   - When to search it (before implementing features, debugging issues, or making decisions in documented areas — learnings may cover bugs, best practices, workflow patterns, or other institutional knowledge)

   This is a semantic assessment, not a string match. The information could be a line in an architecture section, a bullet in a gotchas section, spread across multiple places, or expressed without ever using the exact path `docs/solutions/`. Use judgment — if an agent would reasonably discover and use the knowledge store after reading the file, the check passes.

3. If the spirit is already met, no action needed — move on.
4. If not:
   a. Based on the file's existing structure, tone, and density, identify where a mention fits naturally. Before creating a new section, check whether the information could be a single line in the closest related section — an architecture tree, a directory listing, a documentation section, or a conventions block. A line added to an existing section is almost always better than a new headed section. Only add a new section as a last resort when the file has clear sectioned structure and nothing is even remotely related.
   b. Draft the smallest addition that communicates the three things. Match the file's existing style and density. The addition should describe the knowledge store itself, not the plugin — an agent without the plugin should still find value in it.

      Keep the tone informational, not imperative. Express timing as description, not instruction — "relevant when implementing or debugging in documented areas" rather than "check before implementing or debugging." Imperative directives like "always search before implementing" cause redundant reads when a workflow already includes a dedicated search step. The goal is awareness: agents learn the folder exists and what's in it, then use their own judgment about when to consult it.

      Examples of calibration (not templates — adapt to the file):

      When there's an existing directory listing or architecture section — add a line:
      ```
      docs/solutions/  # documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (module, tags, problem_type)
      ```

      When nothing in the file is a natural fit — a small headed section is appropriate:
      ```
      ## Documented Solutions

      `docs/solutions/` — documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when implementing or debugging in documented areas.
      ```
   c. In full interactive mode, explain to the user why this matters — agents working in this repo (including fresh sessions, other tools, or collaborators without the plugin) won't know to check `docs/solutions/` unless the instruction file surfaces it. Show the proposed change and where it would go, then use the platform's blocking question tool to get consent before making the edit: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex, `ask_question` in Antigravity CLI (`agy`), `ask_user` in Pi (requires the `pi-ask-user` extension). Fall back to presenting the proposal in chat only when no blocking tool exists in the harness or the call errors (e.g., Codex edit modes) — not because a schema load is required. Never silently skip the question. In lightweight mode (interactive or headless), output a one-liner note and move on. In full headless mode, **do not edit instruction files** — surface the gap in the terminal report as `Instruction-file edit: gap noted, not applied` (headless scope is documentation capture, not project-config edits; a human-invoked interactive run applies the edit with consent)

5. **If `CONCEPTS.md` exists at repo root, run a parallel discoverability check for it.** Assess whether the instruction file would lead an agent to discover the project's shared domain vocabulary. Use the same workflow as the `docs/solutions/` check above: same target file, same edit-placement judgment, same consent-then-edit interaction shape per mode. A line in an existing section is almost always better than a new headed section. Example calibration when nothing else fits:

   ```
   CONCEPTS.md  # shared domain vocabulary (entities, named processes, status concepts) — relevant when orienting to the codebase or discussing domain concepts
   ```

   **Skip this step entirely if `CONCEPTS.md` does not exist** — never nag for an artifact the project has not adopted. When skipped, this step produces no output and no edit.

---

## Phase 3: Optional Enhancement

**WAIT for Phase 2 to complete before proceeding.**

**Skip Phase 3 entirely in headless mode** to bound token usage — the caller does not have a human-in-the-loop to act on reviewer findings, and downstream automations can run specialized reviewers themselves if they want that pass.

<parallel_tasks>

Based on problem type, optionally dispatch generic subagents seeded with local prompt assets from `references/agents/` to review the documentation. Do not dispatch standalone agents by type/name.

- **performance_issue** → `references/agents/performance-oracle.md`
- **security_issue** → `references/agents/security-sentinel.md`
- **database_issue** → `references/agents/data-integrity-guardian.md`
- Any code-heavy issue → preserve code simplification as a **read-only documentation review**. Inspect the solution draft's code examples and explanatory claims inline, or dispatch a generic subagent seeded with a local prompt only to return suggestions. Do **not** invoke `ce-simplify-code` from this phase and do not mutate product code unless the user explicitly asks for a separate code-simplification pass. Do not use the deleted `code-simplicity-reviewer`.
  Example: review the solution draft's examples for speculative abstractions, redundant wrappers, dead branches, and just-in-case parameters. Apply edits only to the documentation/examples being written by `ce-compound`; leave any branch code changes untouched.

</parallel_tasks>
