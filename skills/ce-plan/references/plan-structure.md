# Plan Structure and Writing Rules

Detailed structuring and writing logic for Phases 3 and 4.

## 3.1 Title and File Naming

- Draft a clear title matching the PRD's project name: `{项目名称} - 实施方案`
- Determine the plan type: `feat`, `fix`, or `refactor`
- Build the filename: `requirement/{ITERATION_VERSION}/plan.md`
  - Use the same iteration version as the PRD (resolved at Phase 0.2)
  - The plan lives in the same directory as the PRD: `requirement/vN/prd.md` (PRD) and `requirement/vN/plan.md` (plan)
  - Create the directory if it does not exist
  - If a plan already exists at this path, confirm whether to update it or create a new one

## 3.2 Stakeholder and Impact Awareness

For **Standard** or **Deep** plans, briefly consider who is affected by this change — end users, developers, operations, other teams — and how that should shape the plan. For cross-cutting work, note affected parties in the System-Wide Impact section.

## 3.4 High-Level Technical Design

When the plan's technical approach has shape that prose alone doesn't carry well — architecture across components, sequencing across processes, state machines, branching gates, lifecycles, quantitative comparisons — include a High-Level Technical Design section that conveys the shape. The exact form (component diagram, sequence, swim lane, flowchart, state machine, decision matrix, pseudo-code grammar, bar chart for sizing concerns) is the agent's call per artifact — pick what makes the content land fastest for the reader.

See `references/plan-sections.md` for the section catalog including HTD's "include when material" criterion. See the format-rendering reference loaded at Phase 0.0 for how visualizations render in the target format (mermaid in markdown, inline SVG in HTML — with the layout-legibility principles around halo, contrast, and label placement when in HTML).

When the plan's approach is a one-paragraph pattern application that prose conveys directly, skip the section. The presence of HTD should earn its keep with content that genuinely benefits from visualization.

Plan diagrams render authoritative content alongside the prose — they are not "directional sketches." Do not add hedging captions like *"directional guidance for review, not implementation specification"* to plan diagrams; the prose-is-authoritative rule already governs disagreement, and the hedging weakens the diagram unnecessarily.

## 3.4b Output Structure (Optional)

For greenfield plans that create a new directory structure (new plugin, service, package, or module), include an `## Output Structure` section with a file tree showing the expected layout.

**When to include it:**
- The plan creates 3+ new files in a new directory hierarchy
- The directory layout itself is a meaningful design decision

**When to skip it:**
- The plan only modifies existing files
- The plan creates 1-2 files in an existing directory — the per-unit file lists are sufficient

The tree is a scope declaration showing the expected output shape. It is not a constraint — the implementer may adjust the structure if implementation reveals a better layout.

## 3.6 Planning-Time and Implementation-Time Unknowns

If something is important but not knowable yet, record it explicitly under deferred implementation notes rather than pretending to resolve it in the plan.

Examples:
- Exact method or helper names
- Final SQL or query details after touching real code
- Runtime behavior that depends on seeing actual test failures
- Refactors that may become unnecessary once implementation starts

## 3.7 Anti-Expansion: Tangential Cleanup and Scope Creep

Distinct from 3.6 (which is about *unknowns* at plan time): 3.7 is about *known but tangential* work that the agent notices while planning but that falls outside the user's confirmed scope. When research surfaces an adjacent refactor, a "while we're here" cleanup, or a scope-adjacent nice-to-have ("we could also add rate limiting"), route it to the existing `### Deferred to Follow-Up Work` subsection in Scope Boundaries, not into active Implementation Units.

This reinforces the synthesis discipline established at Phase 0.7 / Phase 5.1.5 — the user's confirmed scope is what the active plan executes; everything else is deferred. Does NOT impose architectural bias on extend-vs-invent decisions within confirmed scope. The user's explicit ask overrides this default — if the user explicitly requested a refactor, it's in-scope, not deferred.

---

## Writing Rules

### 4.1 Plan Depth Guidance

**Lightweight**
- Keep the plan compact
- Usually 2-4 implementation units
- Omit optional sections that add little value

**Standard**
- Use the full core template, omitting optional sections (including High-Level Technical Design) that add no value for this particular work
- Usually 2-5 changes
- Include risks, deferred questions, and system-wide impact when relevant

**Deep**
- Use the full core template plus optional analysis sections where warranted
- Usually 3-6 changes
- Group units into phases when that improves clarity
- Include alternatives considered, documentation impacts, and deeper risk treatment when warranted

### 4.1b Optional Deep Plan Extensions

For sufficiently large, risky, or cross-cutting work, add the sections that genuinely help:
- **Alternative Approaches Considered**
- **Success Metrics**
- **Dependencies / Prerequisites**
- **Risk Analysis & Mitigation**
- **Phased Delivery**
- **Documentation Plan**
- **Operational / Rollout Notes**
- **Future Considerations** only when they materially affect current design

Do not add these as boilerplate. Include them only when they improve execution quality or stakeholder alignment.

**Alternatives Considered — what to vary.** When this section is included, alternatives must differ on *how* the work is built: architecture, sequencing, boundaries, integration pattern, rollout strategy. Tiny implementation variants (which hash function, which serialization format) belong in Key Technical Decisions, not Alternatives. Product-shape alternatives (different actors, different core outcome, different positioning) belong in `ce-brainstorm`, not here.

### 4.2 Section Contract and Rendering

Compose the plan using two paired references:

- `references/plan-sections.md` — the section contract. Describes what the plan contains: the outcome the plan must enable for downstream consumers, the hard floor (Summary, Problem Frame, Requirements, KTDs, Implementation Units), the include-when-material catalog (HTD, Scope Boundaries, Open Questions, System-Wide Impact, Risks & Dependencies, Acceptance Examples, Documentation/Operational Notes, Sources & Research), the agency-driven escape hatch (introduce new sections when content warrants), and the ID/content rules.
- The format-rendering reference loaded at Phase 0.0 (`markdown-rendering.md` OR `html-rendering.md`) — how to present the sections in the resolved output format.

The section catalog is the same regardless of format. Format-specific principles live in the rendering reference.

Omit "include when material" sections that don't carry information for this specific plan. Filling a section with placeholder prose is worse than omitting it.

### 4.3 Planning Rules

- **Horizontal rules (`---`) between top-level sections** in Standard and Deep plans, mirroring the `ce-brainstorm` requirements doc convention. Improves scannability of dense plans where many H2 sections sit close together. Omit for Lightweight plans where the whole doc fits on a single screen.
- **All file paths must be repo-relative** — never use absolute paths like `/Users/name/Code/project/src/file.ts`. Use `src/file.ts` instead. Absolute paths make plans non-portable across machines, worktrees, and teammates. When a plan targets a different repo than the document's home, state the target repo once at the top of the plan (e.g., `**Target repo:** my-other-project`) and use repo-relative paths throughout
- Prefer path plus class/component/pattern references over brittle line numbers
- Do not include implementation code — no imports, exact method signatures, or framework-specific syntax
- Pseudo-code sketches and DSL grammars are allowed in the High-Level Technical Design section and per-unit technical design fields when they communicate design direction. Frame them explicitly as directional guidance, not implementation specification
- Mermaid diagrams are encouraged when they clarify relationships or flows that prose alone would make hard to follow — ERDs for data model changes, sequence diagrams for multi-service interactions, state diagrams for lifecycle transitions, flowcharts for complex branching logic
- Do not include git commands, commit messages, or exact test command recipes
- Do not expand implementation units into micro-step `RED/GREEN/REFACTOR` instructions
- Do not pretend an execution-time question is settled just to make the plan look complete

**Write tight.** A section being material is not license to pad it. Lead with the decision or outcome, one idea per sentence, a requirement is intent plus at most one qualifier. Before declaring the plan written, run the named test — could the implementer find a contradiction in each section in one pass?
