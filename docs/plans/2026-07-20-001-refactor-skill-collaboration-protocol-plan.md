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

**Objective：** 为 team-flow 的 17 个 skill 建立统一协作协议层，解决四套子系统（team-flow / compound-engineering / architecture-design / prototype）之间的数据流转、跨系统衔接和决策点交互体验问题。第一优先级修复 ce-brainstorm 产物与 PRD 体系的不匹配。

**Product Authority：** LT

**Open Blockers：** 无阻塞项。

## Product Contract

### Summary

分三阶段实施：**P1 PRD 对齐** — 改造 ce-brainstorm 使其读取可配置的 PRD 模板、输出 PRD 格式到 `prd/vN/prd.md`、支持迭代版本自动检测+用户确认；**P2 Schema 协议层** — 每个 skill 声明 input/output schema，建立机器可解析的工件契约；**P3 Handoff + DP 优化** — 标准化 skill 间 handoff 文件，优化决策点信息展示。

### Problem Frame

**P1 根因（已验证）：** ce-brainstorm 是从 compound-engineering 复制过来的 skill，其产物契约（`ce-unified-plan/v1`、Goal Capsule + Product Contract 章节结构）是 compound 自己的设计。team-flow 设计要求 ce-brainstorm 产出 PRD 文档到 `prd/vN/prd.md`，支持可配置模板（`prd.template` 配置字段已设计但未落地）。实际验证发现：产出格式不对（ce-unified-plan vs PRD）、产出路径不对（`docs/plans/` vs `prd/`）、模板文件不存在、迭代版本（vN）无感知。

**P2-P3 根因：** 四套体系拼合后协作依赖隐式约定，缺少机器可解析的契约定义和标准化 handoff 协议。

### Key Decisions

1. **改造 ce-brainstorm 输出 PRD 格式**（session-settled: user-directed — chosen over 路由层适配/新建 skill: 直接改造，保持 skill 数量不变）

2. **PRD 模板外部可配置**（session-settled: user-directed — 不同项目/团队的 PRD 模板不同，通过 `prd.template` 配置字段指定模板路径，`tf runtime config --get prd.template` 读取）

3. **迭代版本 vN = 产品迭代版本**（session-settled: user-directed — `prd/vN` 中的 vN 是项目不同迭代版本（如 v1=MVP, v2=扩展），不是同一 PRD 的文档版本）

4. **迭代版本自动检测 + 用户确认**（session-settled: user-directed — ce-brainstorm 扫描 `prd/` 目录检测已有迭代，建议最新迭代或新迭代，用户确认）

5. **Schema 声明式协议 + Handoff 模板混合策略**（session-settled: user-directed — chosen over 中间件总线模式: 非侵入式、增量可部署）

6. **保留全部 8 个决策点，优化信息展示**（session-settled: user-directed — chosen over 合并同类 DP: 保留决策粒度）

### Requirements

**Phase 1：PRD 对齐**

R1. 创建默认 PRD 模板 `templates/prd.md`（已完成），包含 11 个一级章节：版本修订记录、业务流程一览、D7.1 业务流程、D7.2 画面原型及设计、D7.3 报表清单、D7.4 业务术语字典、D7.5 系统功能清单、D7.6 系统功能处理说明书、D7.7 要件定义自查报告、D7.8 要件定义完成报告、D7.9 评审会议纪。

R2. 改造 ce-brainstorm SKILL.md，使其读取 `prd.template` 配置（`tf runtime config --get prd.template`），如未配置则使用默认模板 `templates/prd.md`。

R3. ce-brainstorm 产出 PRD 文档写入 `prd/vN/prd.md`（N 为迭代版本号），而非 `docs/plans/` 目录。

R4. ce-brainstorm 在启动时扫描 `prd/` 目录检测已有迭代版本，自动建议最新迭代或创建新迭代，用户确认后继续。

R5. ce-brainstorm 的产物元数据适配 PRD 体系：移除 `artifact_contract: ce-unified-plan/v1`，替换为 PRD 相关元数据（项目名称、迭代版本、文档状态等，对齐模板 §1.1 版本信息表）。

R6. ce-brainstorm 的章节结构从 "Goal Capsule + Product Contract" 改为 PRD 模板的 11 章结构。brainstorm 对话中收集的信息填充到对应 PRD 章节。

R7. 保留 ce-brainstorm 的对话式 brainstorm 能力（交互规则、Phase 1-4 流程），但产出格式和目标路径对齐 PRD 体系。

**Phase 2：Schema 协议层**

R8. 每个 skill 的 SKILL.md frontmatter 增加 `input_schema` 和 `output_schema` 字段，声明该 skill 消费和产出的工件列表及结构约束。

R9. `input_schema` 中每个工件条目包含：`artifact`（工件文件名）、`required`（是否必须）、`schema_ref`（可选，指向 JSON Schema 定义文件）。

R10. `output_schema` 格式与 `input_schema` 对称，额外增加 `consumed_by` 字段声明下游消费者 skill 列表。

R11. 在 `team-flow/schemas/` 目录下维护关键衔接点的 JSON Schema 定义文件。

**Phase 3：Handoff + DP 优化**

R12. 每个 skill 完成时生成标准 handoff 文件（`handoff.yaml`），包含 `from_skill`、`to_skill`、`timestamp`、`artifacts`、`context_summary`、`dp_digest` 字段。

R13. 四套子系统的衔接点使用专用 handoff 变体，通过 `bridge_type` 字段区分。

R14. 每个 DP 的触发 skill 从上游 handoff 自动提取结构化摘要，生成精炼的 DP 展示信息。

R15. 保持全部 8 个 DP（DP-0 至 DP-7）的门禁完整性。

### Scope Boundaries

**Deferred for later：**

- Schema 校验引擎的自动化实现（运行时校验、CI 集成）
- DP 展示的 UI/UX 细节设计（交互控件、布局、动画）
- handoff 文件的版本演进和向后兼容策略
- PRD 模板的多样化（不同行业/团队的模板变体）

**Outside this scope：**

- 不改状态机的 8 态定义和转换规则
- 不涉及 team-flow 底座（TypeScript 解析引擎）的代码改动
- 不改变 PRD 模板的 11 章结构（由企业模板蒸馏确定）

### Dependencies / Assumptions

- `tf runtime config --get prd.template` 机制可正常读取配置（HANDOFF.md §6 提到需要实测）
- 现有 `.superpowers/sdd/checkpoints/` 和 `.superpowers/sdd/handoffs/` 目录结构可复用
- 所有 skill 的 SKILL.md frontmatter 支持扩展字段
- PRD 模板的 11 章结构适用于大多数项目（不适用时通过 `prd.template` 配置替换）

### Outstanding Questions

**Deferred to Planning：**

- `prd.template` 配置字段在 `team-flow.config.json` 中的 schema 定义（需要扩展 config schema）
- ce-brainstorm 如何处理"需求不够完整、无法填充全部 11 章"的场景（部分章节留空 vs 分阶段填充）
- 迭代版本 vN 的编号规范（纯数字 v1/v2/v3 vs 语义化 v1.0/v1.1）
- `handoff.yaml` 是否需要与现有 `checkpoint` JSON 格式保持结构一致性
- 17 个 skill 的 input/output schema 逐一定义的具体字段清单

### Acceptance Examples

**AE1.** **When** 用户启动 ce-brainstorm 并指定"完善产品研发工作流的设计"，**then** ce-brainstorm 扫描 `prd/` 目录，检测到已有 v1，建议"在 v1 上继续"或"创建 v2"，用户确认后在对应迭代目录下工作。

**AE2.** **When** ce-brainstorm 完成 brainstorm 对话，**then** 产出 `prd/v1/prd.md`（或 `prd/v2/prd.md`），结构对齐 `templates/prd.md` 的 11 章，占位符被对话中收集的信息填充。

**AE3.** **When** 项目配置了自定义 PRD 模板（`team-flow.config.json` 中 `prd.template: ".team-flow/custom-prd.md"`），**then** ce-brainstorm 读取自定义模板而非默认模板。

**AE4.** **When** ce-plan 接手 ce-brainstorm 的 PRD 产出，**then** ce-plan 在同一 `prd/vN/prd.md` 文件上就地 enrich，将 requirements-only 状态提升为 implementation-ready。

**AE5.** **When** ce-plan 完成 PRD enrich 后需要交给 spec-writer 启动 change，**then** ce-plan 生成 handoff 文件，spec-writer 从中读取 PRD 引用，无需用户手动转述。
