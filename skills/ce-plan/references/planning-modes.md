# Planning Modes

## Overview

`ce-plan` supports two planning modes, selected at Phase 0.2:

- **业务模式 (Business Mode)** — For product managers / business teams. Focuses on task breakdown, acceptance criteria, performance/compatibility requirements, and dependencies **from a business perspective**. Does NOT include technical architecture decisions, tech stack selection, or implementation details. The plan is a business-oriented implementation roadmap.

- **一人公司模式 (Solo-Founder Mode)** — For technical leaders who are both product owner and developer. Includes everything in business mode **plus** technical architecture decisions, tech stack selection, implementation approach, data model changes, and API design overview. The plan is a comprehensive technical implementation blueprint.

## Mode Selection Logic

After resolving the PRD source, determine the planning mode:

1. **Auto-detect from context:** If the user is clearly a technical leader / solo developer working alone, default to **一人公司模式**. If the user is clearly a product manager or business team member, default to **业务模式**.
2. **Ask when ambiguous.** If context is unclear, ask the user to choose:
   - 业务模式：从产品/业务视角制定实施方案（任务拆分、验收标准、非功能需求）
   - 一人公司模式：在业务模式基础上补充技术方案（技术选型、架构设计、数据模型、API 设计）
3. **Explicit mode in prompt.** If the user explicitly mentions "business mode" / "业务模式" or "solo mode" / "一人公司模式", honor it directly.

## PRD Input

### Using the PRD as Primary Input

If a relevant PRD document exists:
1. Read the PRD document thoroughly — all 11 chapters, focusing on filled chapters (业务流程, 系统功能清单, 画面原型, etc.).
   1b. Read `prd/vN/prototype-review.md` if it exists — confirm the prototype inner loop completed and PRD is frozen. If PRD is not frozen (no `frozen: true` in frontmatter), warn the user that the PRD has not been through prototype review and recommend completing the inner loop before planning.
2. Announce the selected planning mode (业务模式 or 一人公司模式, resolved at Phase 0.2).
3. Announce that `ce-plan` will produce an independent implementation plan at `prd/vN/plan.md` (not modify the PRD).
4. The PRD is the WHAT; the plan is the HOW. Do not rewrite or re-interpret the PRD's business requirements.
5. Carry forward all applicable information from the PRD:
   - 业务流程 (§2-§3) → informs task breakdown and dependencies
   - 系统功能清单 (§7) → maps to implementation tasks
   - 画面原型 (§4) → informs UI implementation scope
   - 功能处理说明书 (§8) → informs acceptance criteria and non-functional requirements
   - 业务术语字典 (§6) → use canonical terms in the plan
6. If the plan discovers a conflict with the PRD's business requirements, surface it as an explicit assumption or question — do not silently rewrite the PRD.

### Using a Legacy Requirements Document

If a relevant legacy requirements document exists:
1. Read it thoroughly
2. Announce that it will serve as the origin document for planning
3. Carry forward all of the following:
   - Problem frame
   - Requirements and success criteria
   - Scope boundaries
   - Key decisions and rationale
   - Dependencies or assumptions
   - Outstanding questions, preserving whether they are blocking or deferred
4. Use the source document as the primary input to planning and research
5. Reference important carried-forward decisions in the plan with `(see origin: <source-path>)`
6. Do not silently omit source content — if the origin document discussed it, the plan must address it even if briefly.

If no relevant PRD source exists, planning may proceed from the user's request directly.

**Settled decisions get the same preservation discipline as origin Product Contract decisions.** Session-settled decisions (from the conversation or a passed brief) are augmented by research, never re-asked, and never silently rewritten. Contradiction evidence routes by the severity ladder: nothing found — proceed silently; suboptimal-but-workable — proceed as settled and attach a conflict call-out to the labeled KTD at plan-write; invalidating — stop as blocked per the Phase 5.2 pipeline contract.

## Plan Composition

Write the plan following the template structure:

- **业务模式**: Fill sections 一~四 (需求摘要, 任务拆分, 验收标准, 风险与约束). Leave section 五 (技术方案) empty with a note: "由 spec-superflow 变更链在具体 change 中设计".
- **一人公司模式**: Fill all sections 一~七, including section 五 (技术方案) with tech stack, architecture, data model, and API design.
- Both modes: Include section 六 (里程碑计划) and section 七 (待定事项) when applicable.
- Include a metadata block at the top: `mode` (业务模式 or 一人公司模式), `prd_reference` (path to PRD), `iteration_version`, `date`.
- Reference the PRD's requirements by chapter number (e.g., "关联 PRD §7 系统功能清单 TF-F001").
- Do not write a launch prompt into the doc. The launch prompt is generated at handoff.
