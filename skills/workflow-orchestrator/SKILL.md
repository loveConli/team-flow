---
name: workflow-orchestrator
description: >-
  产品级工作流编排器，产品级新需求的首选入口。从模糊需求到可执行 change
  的全流程编排：需求澄清、PRD 产出（含原型验证）、实施计划、change 拆分
  与分发。作为产品级唯一入口，内部路由到各阶段 skill。
  不适用于：已有 change 内的操作（用 workflow-start）、独立工具操作
  （ce-ideate/ce-strategy/prototype 等）、纯架构设计（用 architecture-design）。
---

# Workflow Orchestrator（产品级工作流编排器）

从模糊需求到可执行 change 的产品级全流程编排：路径路由 → PRD+原型循环 → 计划 → 拆分验证 → 分发 → 监控。

## 定位

| 层级 | 编排器 | 管辖范围 |
|------|--------|---------|
| 产品级 | **workflow-orchestrator**（本 skill） | 路径路由 → PRD+原型循环 → 计划 → 拆分验证 → 分发 → 监控 |
| 变更级 | workflow-start（不变） | exploring → ... → closing（8 态状态机） |

**分层原则**：本 skill 管「做什么、什么顺序」（产品级策略），workflow-start 管「怎么做」（变更级执行）。二者通过 change 目录 + `.spec-superflow.yaml` 衔接。

**设计哲学（v0.7）**：编排层**只编排**（状态判断、路由、阶段转换、用户确认），执行委托 subagent/会话 skill；从「固定管道」升级为「默认路径 + 任意时刻可重规划」；PRD vN = 一次迭代版本，迭代内变更不升版。

## Use This Skill When

- 用户提出新的产品级需求：「我有个想法」「做一个 XX 功能」「从头开始」、模糊需求
- 需要编排多个阶段（brainstorm → plan → 拆 change）或管理 PRD 版本与 change 拆分策略
- 续版需求（已有 PRD vN 要加功能）、重新计划、继续执行已拆分的 changes

Do NOT invoke for:
- 已在 spec-superflow change 内的流转控制（用 `/workflow-start`）
- 单一 change 的实施（用 `/build-executor`）
- 独立工具操作（`/ce-ideate`、`/ce-strategy`、`/prototype`、`/architecture-design` 等）

## Execution Flow（S1-S5）

### S1: 路径路由器
接收用户输入，判断 6 种入口路径之一；检查 baseline.md / CONCEPTS.md 并注入；复利注入（INDEX.md top-5）。**路由结果必须向用户显式确认**（路由是建议非决定）。详见 `references/s1-path-router.md`。

### S2: PRD + 原型阶段
调用 `/ce-brainstorm`（mode: orchestrated）产出 PRD 草稿；原型循环由编排层直接编排（prototype skill 产出 → prototype-reviewer 自动评审 → 人工评审 → 冻结）；冻结后迭代内变更不升版。反馈环路检查点：scope 是否合理。详见 `references/s2-prd-prototype-loop.md`。

### S3: 计划阶段
调用 `/ce-plan`（pipeline_mode: orchestrator，跳过仪式开销、保留 repo research + change splitting + 依赖 DAG + 技术方向）产出 `prd/vN/plan.md`。反馈环路检查点：plan 是否暴露 PRD scope 问题（是→回退 S2）。详见 `references/s3-plan-pipeline.md`。

### S4: 拆分验证与分发
change-split-auditor 审计拆分质量（粒度/DAG 无环/并行策略/AC 预分配）；创建 change 目录 + `.spec-superflow.yaml`；写入 change_dag；按依赖顺序分发。反馈环路检查点：依赖图是否可执行（否→回退 S3）。详见 `references/s4-split-validate.md`。

### S5: 全局监控（change ≥ 2 必选）
跟踪各 change 进度；cross-change-consistency-checker 检测跨 change 冲突；change closing 时复利晋升；必要时触发动态重规划。详见 `references/s5-monitoring.md`。

## 反馈环路（保守策略：只允许相邻回退）

- **S3 → S2**：plan 暴露 PRD scope 问题 → PRD vN 内修订（非升版）+ 变更履历，plan.md 归档为 .revN
- **S4 → S3**：依赖图不可执行/粒度不合理 → 调整拆分策略，已建 change 目录保留增量调整
- **S5 → S4**：跨 change 冲突需重新拆分 → 按在途 change 红/绿/灰区处置

振荡上限：S2↔S3 回退 ≤2 次，超过升级人工介入。详见 `references/feedback-loops.md`。

## 增量入口（S1 路由的 6 种路径）

| 入口 | 条件 | 跳转 |
|------|------|------|
| 全新需求 | 无 PRD，需求模糊 | → S2 |
| 续版需求 | 有 PRD vN，要加功能 | → S2（vN+1） |
| 重新计划 | PRD 已冻结，plan 需调整 | → S3 |
| 继续执行 | changes 已拆分，继续下一个 | → S4/S5（先输出状态恢复简报） |
| 单 change 快速通道 | 需求极清晰、无 UI、无跨模块依赖的极小变更 | → 直接建 change → workflow-start |
| 紧急修复（Hotfix） | bug/生产问题，最小范围修复 | → 建 change（type: hotfix）→ workflow-start |

## 状态模型

跨阶段、跨 session 状态持久化到 `.workflow-orchestrator.yaml`（持久化记忆 / checkpointer）。含 workflow_phase / phases / replan_log / change_dag / prd_version。双层冻结（frozen_downstream / frozen_absolute），frozen 以 PRD frontmatter 为单一真相源。动态重规划（三级意图分类器 + 红/绿/灰区 + DP-R 确认）见 `references/state-model.md`。

## Guardrails

- **不替代 workflow-start**：本 skill 不管理 8 态状态机流转
- **不直接实施代码**：只编排，实施由 build-executor 执行
- **不跳过 PRD 冻结**：PRD 必须经原型循环（或显式跳过）后才能进 ce-plan
- **路由是建议非决定**：S1 路由判断必须用户确认；重规划必须 DP-R 阻塞确认
- **回退必写 replan_log**：active → pending 回退必须记录；受影响制品归档为 .revN，重入不读旧制品
- **不阻断流程**：所有复利操作为 advisory 级，INDEX.md 读取失败时静默跳过

## Output Standard

每次交互结束时说明：
1. 当前所处阶段（S1-S5）与 `.workflow-orchestrator.yaml` 状态
2. 已产出的制品（PRD/原型/plan/changes）
3. 下一步建议（调用哪个 skill / 进入哪个 change）
