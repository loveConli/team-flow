# Brainstorm Sections

This reference describes what makes a great PRD document (产品需求文档)
produced by `ce-brainstorm`.
It does NOT prescribe how the doc looks on the page — rendering is handled by
the format-specific references (`markdown-rendering.md`, `html-rendering.md`).

## The outcome

A great brainstorm produces the PRD document (业务要件) that defines **WHAT** to build.
`ce-plan` then reads the PRD and produces an **independent implementation plan** (实施方案) that defines **HOW** to build it.
The PRD and plan are separate documents in the same `prd/vN/` directory.

The PRD enables three audiences to act:

- **The planning agent** (`ce-plan` or a human) produces an implementation
  plan based on the PRD, without inventing user behavior, scope boundaries, or success
  criteria — the brainstorm answered those.
- **The reviewer** sees the framing choices, distinguishes pinned from open,
  and catches scope gaps before planning.
- **The future reader** traces why the proposed thing matters, who it's for,
  and what success looks like.

Sections earn their place by serving one of these audiences. Omit padding.

## PRD skeleton contract

New `ce-brainstorm` outputs follow the PRD artifact contract:

- **Path:** `prd/vN/prd.md` (N is the iteration version number, e.g., v1, v2).
- **Metadata:** `project_name`, `iteration_version`, `prd_template` (template path).
- **Template source:** read `prd.template` from project configuration, or use
  the default `templates/prd.md`.
- **Structure:** the PRD contains 11 chapters as defined by the PRD template:
  1. 版本修订记录
  2. 业务流程一览
  3. D7.1_业务流程
  4. D7.2_画面原型及设计
  5. D7.3_报表清单
  6. D7.4_业务术语字典
  7. D7.5_系统功能清单
  8. D7.6_系统功能处理说明书
  9. D7.7_要件定义自查报告
  10. D7.8_要件定义完成报告
  11. D7.9_评审会议纪

- **Filling rule:** the brainstorm phase fills chapters where information is
  available from the dialogue; chapters without dialogue content retain
  template placeholders. Do not fabricate content for empty chapters —
  they belong to later BA processes or will be addressed by `ce-plan` in its
  implementation plan.

A brainstorm-produced PRD is kept **light and standalone-readable**. It
includes only chapters that carry real information from the brainstorm
dialogue, leaving the rest as template placeholders. Empty chapters serve
as a reminder of what still needs to be defined.

Historical `docs/brainstorms/*-requirements.*` files remain valid legacy
inputs. Do not migrate or rewrite them when creating new artifacts.

## Decide whether a doc is warranted at all

Brainstorm dialogue does not always need to produce a PRD document.
Skip document creation when **both** hold:

- The user only needs brief alignment — no exploration produced novel scope,
  framing, or decisions worth preserving in IDed shape.
- Any durable decisions made during the dialogue can flow naturally to
  downstream artifacts (`ce-plan`, the commit message, `docs/solutions/`)
  without a PRD document as an intermediary.

The trigger for creating a doc is when the dialogue surfaced enough
structural decisions, scope boundaries, or acceptance criteria that
downstream consumers (planner, reviewer, future reader) need them in a
durable, IDed form — not just as conversational artifacts.

**Stress test:** a brainstorm about a tiny bug fix where the user asks "fix
this with a null check or with upstream validation?" and the agent confirms
"upstream validation, here's why" doesn't need a PRD document. The
decision flows to `ce-plan` (or directly to commit message, or to
`docs/solutions/` if it's a pattern worth carrying) without a PRD
artifact in the middle.

Conversely, a brainstorm about a multi-actor feature with contested scope
and several behavioral conditions probably does need a doc — the planning
agent needs the structured content the dialogue produced.

## Match depth to content

When a PRD IS warranted, depth matches what the dialogue produced. A
brainstorm with sparse content produces a sparse doc; one with rich content
produces a rich doc. Don't add ceremony to make a slim brainstorm look
substantial.

## Prose economy

Match-depth-to-content sizes *which* sections appear and how deep each goes.
This sizes *how the kept prose reads*. A section can be material and still be
written loosely — the failure mode is a material section padded into a wall of
text where contradictions hide and a downstream agent loses the thread. Length
that earns its place is fine; wordiness around that length is not.

Hold every kept section to these:

- **Lead with the decision or outcome.** Put the conclusion first, then the
  reason, then background; keep one claim plus its support per paragraph. Don't
  bury the chosen scope, an open blocker, or a Key Decision beneath its
  rationale.
- **One idea per sentence.** A requirement is a handful of sentences, not one
  sentence with five semicolons and four parentheticals. If a sentence needs a
  second parenthetical to stay true, split it.
- **A requirement is one sentence of intent plus at most one qualifier.** When
  a requirement would specify two outcomes ("either A or B, planning decides"),
  state the intent and send the fork to Outstanding Questions — don't write both
  arms in full inside the requirement.
- **Cut hedges and intensifiers.** "Critically", "deliberately", "explicitly",
  "genuinely", "actually", "simply" carry nothing a downstream agent acts on.
- **Prefer the verb to the nominalization.** "Demote the grid", not "the
  demotion of the grid is the deliberate change in this brief".
- **Summary and motivation serve different purposes.** When both appear in a
  chapter, the lead (summary or conclusion) is forward-looking — what is being
  proposed or decided. The supporting context is backward-looking / situational —
  why this proposal exists or why this decision was made. Don't restate the
  proposal inside the motivation paragraph; the remedy lives in the conclusion.

Precision is not padding: keep IDs, dates, actor names, domain terms,
conditionals, and exact thresholds verbatim; when a concrete anchor is knowable
from the work already done, use it instead of a vague abstraction. Economy
targets the connective tissue around precision, never the precision itself.

**Resolve in place; don't stratify.** When a later decision answers a parked
question or supersedes earlier text, rewrite or remove the original entry —
don't append a separate "resolutions" layer that leaves the superseded text
standing, and don't keep superseded prose as strikethrough. Version control
holds the history. Stacked question/resolution strata double the reading surface
and hide which text is live.

**Named test, run before the doc is declared written:** could a reader find a
contradiction in each section in one pass? A sentence carrying more than one
parenthetical, or a requirement specifying two outcomes, fails the test — split
it or defer it.

## PRD chapter contract

When a PRD is warranted, the document follows the PRD template structure. The
brainstorm dialogue fills chapters where information is available; chapters
without dialogue content retain template placeholders.

### Always filled (from dialogue or metadata)

- **§1 版本修订记录** — auto-filled from metadata (date, user, iteration
  version). §1.2 修订记录 carries the brainstorm date and a one-line summary
  of what was brainstormed.
- **§2 业务流程一览** — filled from brainstorm's Key Flows and Actors. Each
  identified business process gets a row in the flow overview table.
- **§7 D7.5_系统功能清单** — filled from brainstorm's Requirements. Each
  requirement maps to a system function entry.

### Conditionally filled (when dialogue covers the topic)

- **§3 D7.1_业务流程** — filled when brainstorm produced multi-step Key Flows
  with enough detail for process diagrams.
- **§4 D7.2_画面原型及设计** — filled when brainstorm involves UI/visual
  components. Prototype references go here.
- **§6 D7.4_业务术语字典** — filled with domain terms defined during brainstorm
  dialogue.
- **§8 D7.6_系统功能处理说明书** — partially filled: §8.2 全局说明
  (permissions, interactions, exceptions) from Key Decisions and constraints;
  §8.4 功能模块 from Requirements. Hardware/network/performance sections
  retain placeholders.

### Always placeholder (belong to later processes)

- **§5 D7.3_报表清单** — retains template placeholder. Report details are
  defined during detailed design.
- **§9 D7.7_要件定义自查报告** — retains template placeholder. Self-check
  is a BA process artifact.
- **§10 D7.8_要件定义完成报告** — retains template placeholder. Completion
  report is a closing artifact.
- **§11 D7.9_评审会议纪** — retains template placeholder. Review minutes
  are recorded during review meetings.

## PRD chapters: fill when material

The agent decides per brainstorm which PRD chapters carry information from the
dialogue. Filling a chapter with placeholder content is worse than leaving it
as template placeholder.

- **§2 业务流程一览** — fill when brainstorm identified business processes,
  user journeys, or system interactions. Each distinct process gets a row. Skip
  rows for processes not discussed.

- **§3 D7.1_业务流程** — fill when brainstorm produced detailed multi-step
  flows with enough granularity for process diagrams. Include the flow diagram
  placeholder and step-by-step descriptions. Skip when flows are high-level
  only.

- **§4 D7.2_画面原型及设计** — fill when brainstorm involves UI changes.
  Include module names, page names, and prototype references. Skip entirely
  when the brainstorm is non-visual (backend, data, API only).

- **§6 D7.4_业务术语字典** — fill with domain terms actively defined during
  dialogue. Only include terms where the conversation pinned down a precise
  meaning. Skip terms merely mentioned in passing.

- **§7 D7.5_系统功能清单** — fill from brainstorm Requirements. Each R-ID
  maps to a system function entry with the requirement's intent as the function
  description.

- **§8 D7.6_系统功能处理说明书** — partially fill §8.2 when dialogue covered
  permissions, interactions, or exception handling. Fill §8.4 from Requirements.
  Skip §8.3 (hardware/network) and §8.5 (non-functional) unless the brainstorm
  explicitly covered these.

## Agent agency

The chapter catalog is a floor, not a ceiling. When the brainstorm's content
doesn't fit any catalog chapter, introduce a new one — don't force the content
into a chapter it doesn't belong in. Content drives chapter choices, not vice
versa.

The agent also picks per artifact:

- How much depth each present chapter gets
- Whether supplementary diagrams or visuals appear inline or as appendices
- How to organize the function module details within §8.4

## PRD metadata fields

Every PRD produced by `ce-brainstorm` carries metadata in YAML frontmatter.

### Required

- **`title`** — PRD title in format `{项目名称}_D7_业务要件` (matching the H1).
- **`project_name`** — the project or product name.
- **`iteration_version`** — the iteration version (e.g., "v1", "v2"),
  corresponding to the `prd/vN/` directory.
- **`date`** — creation date in ISO 8601 (`YYYY-MM-DD`).
- **`prd_template`** — relative path to the PRD template used (e.g.,
  `templates/prd.md`).
- **`prd_readiness`** — always `requirements-only` for new `ce-brainstorm`
  outputs. `ce-plan` produces a separate `plan.md` document (not modifying the PRD).

### No status field

PRD artifacts have no `status` field. `prd_readiness` is document completeness,
not execution progress.

### Field-name stability

Field names are stable across PRD revisions. Adding new fields is fine; renaming
existing fields breaks downstream consumers.

## ID and content rules

- **Stable IDs.** PRD tables use the PRD template's numbering format
  (e.g., `X.X.X.X_a1_f1`). R-IDs in brainstorm Requirements map to this
  format when inserted into PRD tables.
- **Plain prefix.** In brainstorm dialogue, use plain prefixes (`R1.`, `F1.`)
  for readability. When rendering into PRD tables, convert to the template's
  hierarchical numbering.
- **Bold leader labels** inside Flows and Acceptance Examples
  (`**Trigger:**`, `**Covers R4, R8.**`) provide structure without deeper
  heading levels.
- **Repo-relative paths.** Always. Never absolute paths.
- **No process exhaust.** No "captured at Phase X" notes, no `## Next Steps`
  pointing to ce-plan, no italic provenance lines. Engineering process
  metadata belongs in commit messages and tool output, not the artifact.
- **No implementation details by default.** Libraries, schemas, endpoints,
  file layouts, code structure stay out unless the brainstorm itself is
  inherently about a technical or architectural change and those details are
  the subject of the decision.

## Rendering

The format-specific references describe how to render these chapters in each
output format:

- **Markdown rendering:** `references/markdown-rendering.md`
- **HTML rendering:** `references/html-rendering.md`

This reference (`brainstorm-sections.md`) is about WHAT the PRD contains;
rendering references are about HOW each format presents it. The PRD is
written in one format — markdown OR HTML, never both — based on the
resolved output mode. The chapter catalog is the same regardless of format.
