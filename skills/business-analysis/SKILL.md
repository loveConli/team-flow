---
name: business-analysis
description: "独立业务分析 skill：将任意用户输入整理为结构化 requirement/vN/business-analysis.md，产出 Requirements List 与 Scenario List，支持多轮单问澄清、待办记录、新增/更新模式，写入前必须阻塞用户确认。不写入 ledger.md，不替代 workflow-orchestrator/ce-brainstorm。"
argument-hint: "[需求/会议/文档描述] [vN 可选]"
---

# Business Analysis

把任意输入（一句话、文档、会议纪要）整理成 `requirement/vN/business-analysis.md`，只含需求列表与业务场景列表两大板块。

## Primary Goal

- 提取并结构化需求（REQ-xxx）与业务场景（SC-xxx）
- 通过多轮单问澄清补全缺失维度
- 用户无法回答的问题记录为 TODO
- 最终经用户阻塞确认后落盘

## Inputs

| 参数 | 说明 |
|---|---|
| `user_input` | 用户原始输入 |
| `version` | 目标版本，如 `v1`；未提供时自动解析 |

## Mode

- **Create**：`requirement/vN/business-analysis.md` 不存在时新建
- **Update**：已存在时读取现有条目，追加或修订

## Process

### 1. Resolve Version

按 `references/version-resolution.md` 解析目标 `vN`，判断 Create / Update 模式。若文件已存在，询问用户「继续完善 / 新建版本 / 覆盖」。

### 2. First-Pass Extraction

从 `user_input` 中提取候选 REQ 与 SC，识别缺失维度。先以 🔵 pending 状态写入内部草案。

### 3. One Question at a Time

每次只问 1 个问题，优先选择题，其次开放题。问题应针对当前最大缺失：角色、目标、触发条件、前置条件、约束、可测试验收标准。

### 4. TODO Handling

用户答不上来时，立即在 `## Open Questions / TODOs` 段落记录 `TODO-xxx`，状态 `pending`。相关 REQ/SC 保持 🔵 pending。

### 5. QA Check

每轮更新后运行 `references/qa-checklist.md` 的 5 项 Error 检查。未通过则继续提问，最多 3 轮自修正。

### 6. Final Confirmation

展示完整文档预览，用户选择：
- **Confirm**：写入文件，所有 🔵 翻转为 ✅ confirmed
- **Adjust**：返回对话循环
- **Abort**：保持 pending，不写入最终确认

## Output Contract

只写 `requirement/vN/business-analysis.md`。输出格式见 `references/output-schema.md`。

严格禁止：
- 写入 `ledger.md`
- 写入 PRD、流程、架构等下游制品
- 修改 `.team-flow.yaml`

## Anti-Patterns

- 一次问多个问题
- 使用泛化角色如 "user"
- Acceptance 写成不可测试的模糊描述
- 未确认直接落盘

## References

- `references/output-schema.md` — 输出文档格式
- `references/qa-checklist.md` — QA 检查标准
- `references/interaction-rules.md` — 多轮交互与确认规则
- `references/version-resolution.md` — 版本解析规则
