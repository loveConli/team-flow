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

**分层原则**：本 skill 管「做什么、什么顺序」（产品级策略），workflow-start 管「怎么做」（变更级执行）。二者通过 change 目录 + `.team-flow.yaml` 衔接。

**设计哲学（v0.7）**：编排层**只编排**（状态判断、路由、阶段转换、用户确认），执行委托 subagent/会话 skill；从「固定管道」升级为「默认路径 + 任意时刻可重规划」；PRD vN = 一次迭代版本，迭代内变更不升版。

## Use This Skill When

- 用户提出新的产品级需求：「我有个想法」「做一个 XX 功能」「从头开始」、模糊需求
- 需要编排多个阶段（brainstorm → plan → 拆 change）或管理 PRD 版本与 change 拆分策略
- 续版需求（已有 PRD vN 要加功能）、重新计划、继续执行已拆分的 changes

Do NOT invoke for:
- 已在 team-flow change 内的流转控制（用 `/workflow-start`）
- 单一 change 的实施（用 `/build-executor`）
- 独立工具操作（`/ce-ideate`、`/ce-strategy`、`/prototype`、`/architecture-design` 等）

## Execution Flow（S1-S5）

### S1: 路径路由器
**先做需求选择**（v0.15.0 多需求）：读 `.team-flow/registry.yaml`，确定 `active_requirement`（多需求则询问操作哪个/新建）。再判断 7 种入口路径之一；检查 baseline.md / CONCEPTS.md 并注入；复利注入（INDEX.md top-5）。**路由结果必须向用户显式确认**（路由是建议非决定）。详见 `references/s1-path-router.md`。

**conventions 注入（v0.11 §33）**：
- 读取 conventions 配置，注入为需求分析上下文

### S2: PRD + 原型阶段

**⛔ MANDATORY：执行S2阶段前，必须先读取 `references/s2-prd-prototype-loop.md`**

**S2阶段状态管理（关键规则，必须遵守）**：
```
prd_draft → user_review → prototype_loop → prd_frozen → completed
```

| 子阶段 | 说明 | 是否阻塞 |
|--------|------|---------|
| `prd_draft` | PRD草稿生成完成 | ⛔ 是（等待用户确认） |
| `user_review` | 用户查看PRD文档 | ⛔ 是（等待用户确认） |
| `prototype_loop` | 原型循环（如需要） | 否（自动执行） |
| `prd_frozen` | PRD冻结 | 否（自动执行） |
| `completed` | S2阶段完成 | 否（自动执行） |

**⛔ 关键约束**：
- `prd_draft` 完成后**必须等待用户确认**，不能自动进入 `prototype_loop`
- 只有用户确认后，才能进入原型循环
- PRD冻结后，才能进入S3阶段
- **错误行为**：PRD草稿完成后直接标记S3阶段完成
- **正确行为**：PRD草稿完成后等待用户查看，确认后继续S2阶段的后续步骤

调用 `/ce-brainstorm`（mode: orchestrated）产出 PRD 草稿；**冻结前派 `prd-completeness-reviewer` 子代理做 PRD 完整性评审**（v0.15.0，管"说得全不全"）；原型循环由编排层直接编排（prototype skill 内部编排产出 → prototype-reviewer 自动评审 → 人工评审 → 冻结）；冻结语义为 `frozen_downstream`（迭代内变更不升版）。反馈环路检查点：scope 是否合理。详见 `references/s2-prd-prototype-loop.md`。

### S3: 计划阶段
**入口一次性问定计划模式**（业务/一人公司），调用 `/ce-plan`（`pipeline_mode: orchestrator` + `plan_mode: business|solo`，跳过仪式开销、保留 repo research + change splitting + 依赖 DAG + 技术方向）产出 `prd/vN/plan.md`。plan 只到产品级策略 + 高阶技术设计，**不含接口清单**（属各 change 的 spec-writer）。反馈环路检查点：plan 是否暴露 PRD scope 问题（是→回退 S2）。详见 `references/s3-plan-pipeline.md`。

### S4: 拆分验证与分发

**⛔ MANDATORY：执行S4阶段前，必须先读取 `references/s4-split-validate.md`**

**S4 步骤清单（必须按顺序执行，不可跳过）**：

- [ ] **Step 1: 拆分质量审计**（必选门禁，不可跳过）
  - 调用 `change-split-auditor` agent 对 plan.md 做拆分质量审计
  - 质量维度：覆盖矩阵 / DAG 无环 / 粒度均衡 / 字段完整 / 拆分维度合规（D5 硬门禁）
  - **verdict = PASS 是后续步骤的硬前置条件**
  - verdict = FAIL → 必须回退 S3 调整拆分后重新审计，**不可绕过直接创建 change**

- [ ] **Step 2: 反馈环路检查点**
  - 依赖图是否可执行？粒度是否合理？
  - **否** → 回退 S3 调整拆分策略（详见 `references/feedback-loops.md`）
  - **是** → 继续

- [ ] **Step 3: 创建 change 脚手架**
  - 为每个 change 执行 `tf state init changes/<change-name>`
  - 验证 `.team-flow.yaml` 已创建在 `changes/<change-name>/` 下
  - ⚠️ 路径约束：项目根 `changes/`，非 `.team-flow/` 或 `specs/`

- [ ] **Step 3.5: 落盘 change-brief.md**（产品级→变更级交接物）
  - 为每个 change 写 `changes/<change-name>/change-brief.md`（已存在则覆盖更新）
  - 必须包含 YAML frontmatter（见下方规范）
  - 验证文件存在且格式正确

- [ ] **Step 4: 写入 change_dag**
  - 更新 `.team-flow/requirements/<req-id>/orchestrator.yaml` 的 `change_dag` 字段
  - 格式规范：`[{id, change_dir, state_file, depends_on, priority, parallel_group, status}]`
  - **同步更新** orchestrator.yaml 顶层 `workflow_phase` 为 `s4_split`（单一真相源）

- [ ] **Step 5: 分发**
  - 告知用户各 change 已就绪及执行顺序建议
  - 示例：`Change C1 已就绪，运行 /workflow-start 进入变更级流程。执行顺序：C1 → (C2 ∥ C3) → C4`

**S4 完成校验（必须全部通过才能标记 completed）**：

1. ✅ change-split-auditor verdict = PASS（审计报告已生成）
2. ✅ 所有 change 目录存在于 `changes/` 下（非 `.team-flow/`）
3. ✅ 每个 change 目录包含 `.team-flow.yaml`（`tf state init` 已执行）
4. ✅ 每个 change 目录包含 `change-brief.md`（含 YAML frontmatter）
5. ✅ orchestrator.yaml 的 `change_dag` 已填充（格式正确）
6. ✅ orchestrator.yaml 顶层 `workflow_phase` 已更新为 `s4_split`

**change-brief.md 规范（v0.27.0 强化）**：

必要字段（YAML frontmatter）：
```yaml
upstream_source: orchestrator          # orchestrator | manual | null
upstream_req_id: <req-id>              # 对应 requirement ID
upstream_plan_ref: prd/vN/plan.md      # hotfix/快速通道为 null
upstream_change_id: C2                 # 对应 change_dag.id
plan_hash: sha256:<plan.md 内容摘要>    # 检测产品层改动后变更层未同步
```

内容段：Scope / 约束 / AC 列表（取自 auditor 报告 Dim1 覆盖矩阵）/ 全局技术方向（指针，非完整设计）/ PRD & plan 引用

**⛔ 反模式（禁止）**：
- 使用 CLAUDE.md 替代 change-brief.md（team-flow 从不读取 CLAUDE.md）
- 在 change-brief 中写完整文件清单（这是 spec-writer 的职责，不属于编排层）
- 省略 YAML frontmatter

**workflow_phase 同步规则**：
- **单一真相源**：`orchestrator.yaml` 顶层 `workflow_phase` 字段
- **阶段转换时**：必须同步更新顶层 `workflow_phase` + 对应 phase 子节点的 `status`
- **registry.yaml**：引用 `orchestrator.yaml` 的 `workflow_phase`，不独立维护

### S5: 全局监控（change ≥ 2 必选）
跟踪各 change 进度；cross-change-consistency-checker 检测跨 change 冲突；change closing 时复利晋升；必要时触发动态重规划。详见 `references/s5-monitoring.md`。

## 反馈环路（保守策略：只允许相邻回退）

- **S3 → S2**：plan 暴露 PRD scope 问题 → PRD vN 内修订（非升版）+ 变更履历，plan.md 归档为 .revN
- **S4 → S3**：依赖图不可执行/粒度不合理 → 调整拆分策略，已建 change 目录保留增量调整
- **S5 → S4**：跨 change 冲突需重新拆分 → 按在途 change 红/绿/灰区处置

振荡上限：S2↔S3 回退 ≤2 次，超过升级人工介入。详见 `references/feedback-loops.md`。

## 增量入口（S1 路由的 7 种路径）

| 入口 | 条件 | 跳转 |
|------|------|------|
| 全新需求 | 无 PRD，需求模糊 | → S2 |
| 续版需求 | 有 PRD vN，要加功能 | → S2（vN+1） |
| 重新计划 | PRD 已冻结，plan 需调整 | → S3 |
| 继续执行 | changes 已拆分，继续下一个 | → S4/S5（先输出状态恢复简报） |
| 单 change 快速通道 | 需求极清晰、无 UI、无跨模块依赖的极小变更 | → 直接建 change → workflow-start |
| 紧急修复（Hotfix） | bug/生产问题，最小范围修复 | → 建 change（type: hotfix）→ workflow-start |
| **原型补跑/重跑**（v0.20.0） | PRD 已冻结（`frozen_downstream`）∧ `prototype/` 缺失/为空，或用户显式要求重做原型 | → 部分重入 S2 原型循环（S2 步骤 2→3→4）；PRD 不动，保留有效 S3/S4，闭环后恢复原 phase |

## 状态模型

**多需求并行（v0.15.0）**：`.team-flow/registry.yaml`（需求注册表 + `active_requirement` 活跃指针）+ 每需求一份 `.team-flow/requirements/<req-id>/orchestrator.yaml`（持久化记忆 / checkpointer）。各需求状态天然隔离，支持并行。单需求 orchestrator.yaml 含 requirement_id / workflow_phase / phases / replan_log / change_dag / prd_version。双层冻结（frozen_downstream / frozen_absolute），frozen 以 PRD frontmatter 为单一真相源。迁移兼容：检测旧 `<root>/.workflow-orchestrator.yaml` 自动迁入。动态重规划（三级意图分类器 + 红/绿/灰区 + DP-R 确认）见 `references/state-model.md`。

## Guardrails

- **不替代 workflow-start**：本 skill 不管理 8 态状态机流转
- **不直接实施代码**：只编排，实施由 build-executor 执行
- **后台子代理等待范式（v0.20.0）**：派发后台子代理（prototype-builder / reviewer / architecture-design 等长任务）后**依赖完成通知（`<task-notification>`）再行动**，**禁止反复 `TaskOutput(block=true)` 阻塞轮询**——其对长任务超时返回会倾泻完整子代理 transcript，撑爆主上下文、抵消"只编排"的轻上下文优势。长任务派发后可先处理可并行工作或结束本轮等待通知，**不空转死等**；确需中途观察用 `block=false` 轻量查询（仍返转录，尽量不用）。（设计 §22.2）
- **不跳过 PRD 冻结**：PRD 必须经原型循环（或显式跳过）后才能进 ce-plan
- **不跳过拆分审计**：change-split-auditor 审计 verdict = PASS 是创建 change 脚手架的前置条件（S4 必选门禁）
- **路由是建议非决定**：S1 路由判断必须用户确认；重规划必须 DP-R 阻塞确认
- **回退必写 replan_log**：active → pending 回退必须记录；受影响制品归档为 .revN，重入不读旧制品
- **不阻断流程**：所有复利操作为 advisory 级，INDEX.md 读取失败时静默跳过

## Output Standard

每次交互结束时说明：
1. 当前所处阶段（S1-S5）与 `.team-flow/requirements/<req-id>/orchestrator.yaml` 状态
2. 已产出的制品（PRD/原型/plan/changes）
3. 下一步建议（调用哪个 skill / 进入哪个 change）

## 阶段转换前规范建议（v0.11 §33，被动式自动沉淀）

workflow-orchestrator S1 阶段即将结束、进入 S2 之前，执行以下规范沉淀协议：

1. **回顾本阶段工作**：扫描本阶段所有用户纠正、CC 观察到的项目既有模式、踩坑记录
2. **生成规范建议列表**：提取跨 change 可复用的规范条目（排除仅适用于本次 change 的特定业务逻辑）
3. **去重检查**：对比已有 convention 文件，排除已存在的条目
4. **向用户展示建议**：

```
📋 需求编排阶段规范建议
┌───┬──────────────────────────────────────────────────┐
│ # │ 规范条目                                          │
├───┼──────────────────────────────────────────────────┤
│ 1 │ [条目描述]                                        │
│   │   来源：[来源说明]                                  │
│   │   建议写入：.team-flow/conventions/[目标文件]       │
└───┴──────────────────────────────────────────────────┘

请逐条确认（接受/拒绝/修改），或输入「全部接受」：
```

5. **用户确认后写入**：接受的条目追加到对应 convention 文件，更新 YAML frontmatter 的 date 字段
6. **无建议时静默跳过**：如果本阶段没有可沉淀的规范，不弹出确认，直接进入下一阶段
