# Completion Contract and Interaction Rules

## Mandatory Completion Contract

Every normal interactive `ce-plan` branch that produces a plan artifact or checkpoint is incomplete until its owning handoff question is presented. For software implementation-plan runs that continue past Phase 0.1b, that boundary is Phase 5.4's post-generation handoff menu. Non-software plan-seeking and approach-altitude branches use the terminal handoff in the reference workflow they route to; do not force those branches through Phase 5.4 after they have been told to skip subsequent phases. Answer-seeking is the exception: it may end after delivering the answer unless the universal-planning reference says to offer save/share.

For software implementation-plan runs, writing the plan file, running the confidence check, and running or skipping `ce-doc-review` are intermediate milestones, not completion. This remains true when the user's prompt says only "create a plan", "write the doc", "run `ce-doc-review`", or similar. The only exception is pipeline mode (LFG or any `disable-model-invocation` context), where the caller owns the next step after the plan file, confidence check, and headless document review are complete.

Before any response that could end a software implementation-plan run, verify that the plan path is known, the headless review state or documented skip state is summarized, and the user has been asked: "Plan ready at `<absolute path to plan>`. What would you like to do next?" If the menu fits the platform's blocking-question tool, ask it there; otherwise render the numbered handoff options in chat and wait. If the user selects an action, execute the Phase 5.4 routing for that selection before treating the skill as complete.

## Interaction Method

When asking the user a question, use the platform's blocking question tool: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex, `ask_question` in Antigravity CLI (`agy`), `ask_user` in Pi (requires the `pi-ask-user` extension). Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors (e.g., Codex edit modes) — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

## Final Pre-Response Checklist

Before sending any response that could end `ce-plan`, verify:
- Plan file exists on disk
- Confidence check ran or was intentionally skipped by the interactive re-deepen no-accepted-findings path
- `ce-doc-review` ran in headless mode, or the documented HTML format gate / `skill_unreachable` state / interactive re-deepen no-accepted-findings path skipped it
- Headless review state or documented skip state was summarized above the menu
- Phase 5.4 menu was presented for software implementation-plan runs, even if the user only asked to create the plan or run doc review, unless pipeline mode returned control to the caller
- If the user selected an action, the selected routing was executed

**Completion check:** This skill is not complete until the post-generation menu above has been presented, the user has selected an action, and the inline routing for that selection has been executed. Presenting the menu and stopping at the user's selection is not completion — fire the routed action.

Incorrect final response: "Created the plan and ran doc review."

Correct terminal handoff: "Created the plan and ran doc review. Plan ready at `<absolute path to plan>`. What would you like to do next?" followed by the numbered handoff options or the platform's blocking question.

**Pipeline mode exception:** In LFG or any `disable-model-invocation` context, skip the interactive menu and return control to the caller after the plan file is written, confidence check has run, and `ce-doc-review` has run in headless mode or `ce-plan` has recorded the documented `skill_unreachable` envelope (per `references/plan-handoff.md`). Pipeline mode forces `OUTPUT_FORMAT=md` at Phase 0.0, so the 5.3.8 format gate never selects the HTML skip path in pipeline runs.
