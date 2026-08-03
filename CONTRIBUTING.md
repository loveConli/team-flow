# Contributing

Thanks for considering a contribution to `team-flow`.

This repository is not just a collection of prompt files. It is a workflow system.

Contributions should preserve three core properties:

- spec-first planning
- guarded handoff through `execution-contract.md`
- one visible workflow owner

## Contribution Areas

Good contributions include:

- improving skill trigger clarity
- strengthening workflow guardrails
- adding or refining templates
- adding realistic example change sets
- improving installation or publishing docs
- clarifying artifact contracts or state transitions

## Before You Change Anything

Read these files first:

- `README.md`
- `INSTALL.md`
- `docs/artifact-contract.md`
- `docs/state-machine.md`
- `docs/release-checklist.md`

If your change affects workflow behavior, also read:

- `skills/workflow-start/SKILL.md`
- `skills/contract-builder/SKILL.md`

## Repository Conventions

### 1. Preserve self-contained ownership

Do not turn `team-flow` into a runtime wrapper that depends on separately installed OpenSpec or Superpowers packages.

It can learn from those systems, but this repository should remain self-contained.

### 2. Keep planning and execution distinct

Planning artifacts define the change.

`execution-contract.md` is the formal bridge into implementation.

Do not blur these roles.

### 3. Examples must be complete

If you add an example under `docs/examples/<change-name>/`, include:

- `README.md`
- `proposal.md`
- `specs/`
- `design.md`
- `tasks.md`
- `execution-contract.md`

### 4. Repository Artifact Boundaries

`docs/examples/` is the public location for complete example change sets.
The following root-local paths are working artifacts and must remain local and
uncommitted:

- `changes/`
- `.superpowers/`
- `docs/superpowers/`
- `contest-2026/`
- `scripts/sdd-workspace/`

### 5. Prefer operational wording

Skill text should help an agent decide:

- when to trigger
- what to inspect
- what to block
- what to do next

Avoid vague motivational language when an operational rule would be clearer.

### 6. Agent file design spec (v0.33.0+)

Background: before v0.33.0, every agent's YAML frontmatter was invalid (an
`<example>` block at column 0 inside the `description` field). Claude Code
degrades SILENTLY on invalid frontmatter — `skills:` preload and `tools:`
restrictions are dropped with no warning, and the agent body alone is kept.
The defect survived the entire plugin lifetime. `tests/lib/frontmatter-lint.test.mjs`
(npm test) is the machine gate; this spec is the human gate.

Copy `templates/agent-template.md` when creating a new agent. Hard rules:

1. **`description` is a single-line string.** No `>-` block scalars, no
   `<example>` blocks — the official Anthropic plugin-dev agents use that
   pattern and it is a trap (it breaks YAML indentation and silently disables
   the whole frontmatter). If the text must contain an ASCII `: `, wrap the
   entire value in double quotes. team-flow agents are dispatched explicitly
   by `workflow-start`, so example-driven auto-triggering buys nothing.
2. **`name` must equal the file name** (minus `.md`). On degraded parsing the
   registry falls back to the file name — a mismatch means silent mislabeling.
3. **Declare `tools` explicitly.** Since v0.33.0 the restriction is enforced;
   the subagent holds ONLY the declared tools (no MCP tools unless listed).
4. **`skills` entries must resolve.** Each entry must match an existing
   `skills/<name>/SKILL.md` (bare name, same as glaf4-test's proven pattern).
   A dangling entry means a silent no-preload.
5. **Body ≤ 100 lines, WHO/WHAT only.** No SOP/methodology in the body — that
   belongs to the preloaded Skill. If the body says "Your preloaded Skill
   contains the detailed methodology", the `skills:` field MUST declare it.

Anti-patterns (forbidden):

- `<example>` blocks anywhere in frontmatter
- Unquoted ASCII `: ` inside `description` values
- Copying frontmatter style from other plugins without running the lint

Verification (mandatory for new/changed agents):

1. `npm test` — the frontmatter-lint gate must pass.
2. **Empirical probe** — dispatch the agent once and verify with a BEHAVIORAL
   probe (ask it to recite a rule that exists only in the preloaded Skill or
   the agent body). Do NOT rely on exact-string introspection questions — they
   produce false negatives. Do not write "mechanism works" claims into any doc
   without this probe. See design doc §54.6 (workspace-level
   `docs/architecture-api-db-design-enhancement-v0.13.md`).

## Pull Request Guidance

When opening a change, explain:

- what problem you are solving
- which workflow stage or artifact is affected
- whether any behavior, trigger logic, or guardrails changed
- whether docs and examples were updated to match

## Quality Checklist

Before submitting:

- remove placeholder text like `TODO` or `TBD`
- verify all markdown links still make sense
- keep README and README.zh-CN aligned when behavior changes
- keep example indexes aligned with actual example folders
- update `CHANGELOG.md` for user-visible repository changes
- review `docs/release-checklist.md` if the change affects release readiness

## Large Changes

If you want to make a major workflow or architecture change, start by writing a design note in:

- `docs/`

Then update the relevant skills, templates, and examples together so the repository stays coherent.
