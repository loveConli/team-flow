# Core Principles, Quality Bar, and Task Visibility

## Core Principles

1. **Use the PRD as the source of truth** - If `ce-brainstorm` produced a PRD document, planning should read it as the primary input and produce an **independent implementation plan** (not modify the PRD). The PRD defines WHAT; the plan defines HOW. Both are separate artifacts in the same `requirement/vN/` directory.
2. **Decisions, not code** - Capture approach, boundaries, files, dependencies, risks, and test scenarios. Do not pre-write implementation code or shell command choreography. Pseudo-code sketches or DSL grammars that communicate high-level technical design are welcome when they help a reviewer validate direction — but they must be explicitly framed as directional guidance, not implementation specification.
3. **Research before structuring** - Explore the codebase, institutional learnings, and external guidance when warranted before finalizing the plan.
4. **Right-size the artifact** - Small work gets a compact plan. Large work gets more structure. The philosophy stays the same at every depth.
5. **Separate planning from execution discovery** - Resolve planning-time questions here. Explicitly defer execution-time unknowns to implementation.
6. **Keep the plan portable** - The plan should work as a living document, review artifact, or issue body without embedding tool-specific executor instructions.
7. **Carry execution direction lightly when it matters** - If the request, origin document, or repo context clearly implies test-first proof, characterization coverage, smoke-first verification, or another non-default execution direction, reflect that in the plan as a lightweight natural-language signal. Do not encode it as a finite enum or turn the plan into step-by-step execution choreography.
8. **Honor user-named resources** - When the user names a specific resource — a CLI, MCP server, URL, file, doc link, or prior artifact — treat it as authoritative input, not a suggestion. Discover it if unknown (`command -v`, fetch, read) before assuming it's unavailable. Use it in place of generic alternatives. If it fails or doesn't exist, say so explicitly rather than silently substituting.

## Plan Quality Bar

Every plan should contain:
- A clear problem frame and scope boundary
- Concrete requirements traceability back to the request or origin document
- Repo-relative file paths for the work being proposed (never absolute paths — see Planning Rules)
- Explicit test file paths for feature-bearing implementation units
- Decisions with rationale, not just tasks
- Existing patterns or code references to follow
- Enumerated test scenarios for each feature-bearing unit, specific enough that an implementer knows exactly what to test without inventing coverage themselves
- Clear dependencies and sequencing

A plan is ready when an implementer can start confidently without needing the plan to write the code for them.

## Task Visibility

After intake determines that `ce-plan` will perform a material multi-stage run, use the platform's task-tracking capability when available to show a short user-facing view derived from the selected route and remaining planning work. Track meaningful outcomes, not every phase, tool call, or microstep; add conditional work only when its gate fires, and update the view at meaningful transitions. Use short, outcome-led names. If no task-tracking capability is available, continue normally without simulating a task list in chat.

## Feature Description

The **feature description** is the input this skill was invoked with — what to plan, present in the current prompt or conversation, whether the user provided it directly or a calling skill passed it (e.g. `lfg` in `mode:pipeline`).

**If no feature description was provided, ask the user:** "What would you like to plan? Describe the task, goal, or project you have in mind." Then wait for their response before continuing.

If the input is present but unclear or underspecified, do not abandon — ask one or two clarifying questions, or proceed to Phase 0.4's planning bootstrap to establish enough context. The goal is always to help the user plan, never to exit the workflow.

**IMPORTANT: All file references in the plan document must use repo-relative paths (e.g., `src/models/user.rb`), never absolute paths (e.g., `/Users/name/Code/project/src/models/user.rb`). This applies everywhere — implementation unit file lists, pattern references, origin document links, and prose mentions. Absolute paths break portability across machines, worktrees, and teammates.**
