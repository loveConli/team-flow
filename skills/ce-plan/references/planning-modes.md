# Planning Modes

## Overview

`ce-plan` supports two planning modes, selected at Phase 0.2:

- **业务模式 (Business Mode)** — For product managers / business teams. Focuses on task breakdown, acceptance criteria, performance/compatibility requirements, and dependencies **from a business perspective**. Does NOT include technical architecture decisions, tech stack selection, or implementation details. The plan is a business-oriented implementation roadmap.

- **一人公司模式 (Solo-Founder Mode)** — For technical leaders who are both product owner and developer. Includes everything in business mode **plus** technical architecture decisions, tech stack selection, implementation approach, data model changes, and **high-level technical design**（模块边界 + 技术选型 + 数据流方向 + 关键聚合/上下文划分）. **不含接口清单 / 字段定义 / 方法签名 / 请求响应 schema**——这些变更级详细设计属于各 change 的 spec-writer / architecture-design（见 SKILL.md「作用边界」）。The plan is a product-level technical implementation blueprint, not a per-change detailed design.

## Mode Selection Logic

After resolving the PRD source, determine the planning mode:

1. **Pipeline 显式传参优先（v0.8）**：若调用方（workflow-orchestrator）传入 `plan_mode: business | solo`（S3 入口已一次性问定），直接采用，**不再询问**。
2. **standalone 强制询问（v0.8 修订，禁止隐式默认）**：未收到 `plan_mode` 时，**必须用阻塞问题工具询问**用户选择，**不得因"看起来是技术 leader"就静默默认一人公司模式**：
   - 业务模式：从产品/业务视角制定实施方案（任务拆分、验收标准、非功能需求）
   - 一人公司模式：在业务模式基础上补充**高阶技术方案**（技术选型、架构设计、数据模型、技术方向；**不含接口清单**）
3. **Explicit mode in prompt.** If the user explicitly mentions "business mode" / "业务模式" or "solo mode" / "一人公司模式", honor it directly.
4. **异常回退**：pipeline 调用但未收到 `plan_mode` → 回退到第 2 条强制询问（不隐式默认）。

## PRD Input

### Using the PRD as Primary Input

If a relevant PRD document exists:
1. Read the PRD document thoroughly — all 11 chapters, focusing on filled chapters (业务流程, 系统功能清单, 画面原型, etc.).
   1b. Read `requirement/vN/prototype-review.md` if it exists — confirm the prototype inner loop completed and PRD is frozen. If PRD is not frozen (no `frozen: true` in frontmatter), warn the user that the PRD has not been through prototype review and recommend completing the inner loop before planning.
2. Announce the selected planning mode (业务模式 or 一人公司模式, resolved at Phase 0.2).
3. Announce that `ce-plan` will produce an independent implementation plan at `requirement/vN/plan.md` (not modify the PRD).
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

- **业务模式**: Fill sections 一~四 (需求摘要, 任务拆分, 验收标准, 风险与约束). Leave section 五 (技术方案) empty with a note: "由 team-flow 变更链在具体 change 中设计".
- **一人公司模式**: Fill all sections 一~七, including section 五 (技术方案) with tech stack, architecture, data model, and **high-level technical design**（模块边界 + 技术选型 + 数据流方向 + 关键聚合/上下文划分）. **禁止输出「接口清单」段**——接口签名/字段/请求响应 schema 属各 change 的 spec-writer / architecture-design（见 SKILL.md「作用边界」）。
- Both modes: Include section 六 (里程碑计划) and section 七 (待定事项) when applicable.
- Include a metadata block at the top: `mode` (业务模式 or 一人公司模式), `prd_reference` (path to PRD), `iteration_version`, `date`.
- Reference the PRD's requirements by chapter number (e.g., "关联 PRD §7 系统功能清单 TF-F001").
- Do not write a launch prompt into the doc. The launch prompt is generated at handoff.
