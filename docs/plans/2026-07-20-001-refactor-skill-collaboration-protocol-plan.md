---
title: Skill 协作协议层设计 - Plan
type: refactor
date: 2026-07-20
topic: skill-collaboration-protocol
artifact_contract: ce-unified-plan/v1
artifact_readiness: requirements-only
product_contract_source: ce-brainstorm
execution: code
---

# Skill 协作协议层设计 - Plan

## Goal Capsule

**Objective：** 为 team-flow 的 17 个 skill 建立统一协作协议层，解决四套子系统（spec-superflow / compound-engineering / architecture-design / prototype）之间的数据流转、跨系统衔接和决策点交互体验问题。

**Product Authority：** LT

**Open Blockers：** 无阻塞项。

## Product Contract

### Summary

在现有 17 个 skill 之上叠加 Schema 声明式协议层 + Handoff 模板机制。每个 skill 通过 JSON Schema 声明其输入输出契约，skill 之间通过标准化 handoff 文件传递结构化上下文。四套子系统的衔接点定义明确的桥接协议。全部 8 个决策点保留，通过结构化信息提取优化展示效率。分三阶段实施。

### Problem Frame

team-flow 由四套独立体系拼合而成（spec-superflow 9 skills + compound-engineering 6 skills + architecture-design 1 skill + prototype 1 skill）。拼合后的协作依赖隐式约定：skill 之间通过共享工件文件传递数据，但缺少机器可解析的契约定义；四套子系统间的衔接点（如 ce-plan → spec-writer、architecture-design → build-executor、prototype → execution-contract）靠人工约定而非协议；用户在 8 个决策点面临信息过载或信息不足。随着 skill 数量增长和协作路径复杂化，隐式约定已不可持续。

### Key Decisions

1. **Schema 声明式协议 + Handoff 模板混合策略**（session-settled: user-directed — chosen over 中间件总线模式: 非侵入式、增量可部署，不改现有 skill 内部结构）

2. **全覆盖分阶段实施**（session-settled: user-directed — chosen over 核心链路优先: 确保四套体系最终统一，避免遗留衔接缺口）

3. **保留全部 8 个决策点，优化信息展示**（session-settled: user-directed — chosen over 合并同类 DP: 保留每个 DP 的独立决策语义，通过结构化信息提取降低用户负担）

4. **Schema 定义粒度：引用级为主 + 关键衔接点字段级**（session-settled: user-approved — chosen over 全字段级: 平衡精准度与维护成本；核心衔接点（如 execution-contract.md 的 intent lock、proposal.md 的 scope fence）定义字段级 schema，其他工件仅定义引用级）

5. **Handoff 格式：YAML 结构化数据 + 自动 Markdown 摘要**（session-settled: user-approved — chosen over 纯 Markdown: YAML 驱动机器消费，Markdown 摘要驱动人类理解和 DP 展示）

### Requirements

**Schema 协议层**

R1. 每个 skill 的 SKILL.md frontmatter 增加 `input_schema` 和 `output_schema` 字段，声明该 skill 消费和产出的工件列表及结构约束。

R2. `input_schema` 中每个工件条目包含：`artifact`（工件文件名）、`required`（是否必须）、`schema_ref`（可选，指向 JSON Schema 定义文件）。引用级 schema 只需 `artifact` + `required`；字段级 schema 额外需要 `schema_ref`。

R3. `output_schema` 格式与 `input_schema` 对称，额外增加 `consumed_by` 字段声明下游消费者 skill 列表。

R4. 在 `team-flow/schemas/` 目录下维护关键衔接点的 JSON Schema 定义文件，包括：`execution-contract.schema.json`、`proposal.schema.json`、`handoff.schema.json`。

**Handoff 机制**

R5. 每个 skill 完成时生成标准 handoff 文件（`handoff.yaml`），存放在变更目录的 `.superpowers/sdd/handoffs/` 下（复用现有 checkpoint/handoff 目录结构）。

R6. handoff 文件包含以下标准字段：`from_skill`、`to_skill`、`timestamp`、`artifacts`（产出工件引用列表）、`context_summary`（关键决策和约束的结构化摘要）、`dp_digest`（如经过 DP，用户的决策摘要）。

R7. 四套子系统的衔接点使用专用 handoff 变体，通过 `bridge_type` 字段区分：`compound-to-spec`（ce-plan → spec-writer）、`arch-to-exec`（architecture-design → build-executor）、`prototype-to-exec`（prototype → execution-contract）、`spec-to-compound`（closing → ce-compound 复利回写）。

R8. handoff 文件同时生成人类可读的 Markdown 摘要版本（`handoff-summary.md`），用于 DP 展示和用户审查。

**决策点优化**

R9. 每个 DP 的触发 skill 从上游 handoff 文件中自动提取结构化摘要，生成 DP 展示信息。用户看到的是精炼的决策上下文而非原始工件全文。

R10. DP 展示遵循统一模板：`决策背景`（1-2 句，从 context_summary 提取）、`关键选项`（如有）、`推荐/默认`（如有）、`原始工件链接`（完整信息的降级入口）。

R11. 保持全部 8 个 DP（DP-0 至 DP-7）的门禁完整性，不合并不精简。

**跨系统衔接**

R12. 定义四套子系统的衔接点清单和每个衔接点的数据契约：ce-brainstorm → ce-plan（需求 → PRD）、ce-plan → spec-writer（PRD → change）、architecture-design → build-executor（架构增量 → 执行约束）、prototype → execution-contract（UI 契约 → 执行契约）、build-executor → ce-compound（实现结果 → 复利回写）。

R13. 每个衔接点的 handoff 必须携带上游 skill 的核心产出引用，确保下游 skill 无需重新扫描上游工件。

R14. workflow-start 路由时检查 handoff 链完整性：从当前状态回溯到最近的 handoff 文件，确认上游 skill 的产出可消费。

### Scope Boundaries

**Deferred for later：**

- Schema 校验引擎的自动化实现（运行时校验、CI 集成）— 属于 ce-plan 实现阶段
- DP 展示的 UI/UX 细节设计（交互控件、布局、动画）— 需要具体宿主环境上下文
- handoff 文件的版本演进和向后兼容策略 — 稳定运行后再议

**Outside this scope：**

- 不重构现有 skill 的内部逻辑和产物结构
- 不改状态机的 8 态定义和转换规则
- 不涉及 spec-superflow 底座（TypeScript 解析引擎）的代码改动

### Dependencies / Assumptions

- 现有 `.superpowers/sdd/checkpoints/` 和 `.superpowers/sdd/handoffs/` 目录结构可复用
- `ssf runtime config --get` 机制可扩展读取 schema 相关配置
- 所有 skill 的 SKILL.md frontmatter 支持扩展字段（当前 frontmatter 已有 `name`、`description`、`version` 等字段）

### Outstanding Questions

**Deferred to Planning：**

- `handoff.yaml` 是否需要与现有的 `checkpoint` JSON 格式保持结构一致性？（现有 checkpoint 在 `execution-plan.json` 中使用 JSON，handoff 用 YAML 是否造成格式分裂？）
- `schemas/` 目录下的 JSON Schema 文件是否需要纳入 `check-version-consistency.mjs` 的版本守卫？
- 17 个 skill 的 input/output schema 逐一定义的具体字段清单
- handoff 文件的命名规范（时间戳 vs skill 名 vs 序号）
- bridge_type 变体的具体结构差异

### Acceptance Examples

**AE1.** **When** workflow-start 路由到 need-explorer，**then** need-explorer 的 `input_schema` 声明了对 `workflow-context` 的依赖，workflow-start 自动将变更意图和约束写入 handoff 文件供 need-explorer 消费。

**AE2.** **When** ce-plan 完成 PRD 后需要交给 spec-writer 启动 change，**then** ce-plan 生成 `bridge_type: compound-to-spec` 的 handoff 文件，spec-writer 从中读取 PRD 引用和关键决策摘要，无需用户手动转述。

**AE3.** **When** 用户到达 DP-2（工件审查），**then** DP 展示从上游 handoff 自动提取 4 个工件的结构化摘要（每个工件 1-2 句话），用户基于摘要快速决策，需要详情时可展开原始工件链接。

**AE4.** **When** build-executor 需要 architecture-design 的架构增量信息，**then** `bridge_type: arch-to-exec` 的 handoff 携带聚合根、限界上下文、API 映射的结构化引用，build-executor 的 `input_schema` 声明了对这些引用的消费契约。
