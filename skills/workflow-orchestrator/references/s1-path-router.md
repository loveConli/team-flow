# S1 路径路由器（v0.7 重写）

> 原 v0.5「需求接收」。S1 是 orchestrator 的唯一入口，负责把任意时刻的用户输入路由到正确的阶段。设计依据：设计增强方案 v0.7 §17.2 / §17.4 / §17.9.1。

## 职责边界

S1 只做编排动作（需求选择、存在性检查、路径判断、阻塞式用户确认），上下文简报组装委托 `kickoff-context-assembler`（种子提示，建议做）。S1 不产出任何业务制品。

## 需求选择（v0.15.0 新增，多需求并行第一步）

读 `.team-flow/registry.yaml`：
- **无注册表 / 无需求** → 新建需求：询问需求短码（`<req-id>`）与标题，创建 `.team-flow/requirements/<req-id>/orchestrator.yaml` + 登记 registry，设为 `active_requirement`。
- **单个需求** → 直接采用为活跃需求。
- **多个需求** → 用阻塞问题工具询问 LT 操作哪个（列出各需求 title/phase/prd_version），或选择「新建需求」；选中者设为 `active_requirement`。

后续阶段读写的 `orchestrator.yaml` 一律指 `active_requirement` 对应的那份。迁移兼容：检测到旧 `<root>/.workflow-orchestrator.yaml` → 自动迁入 `.team-flow/requirements/<req-id>/orchestrator.yaml` 并登记 registry（一次性，提示用户）。

## 7 种入口路径

| 入口 | 判断条件 | 跳转 | 说明 |
|------|---------|------|------|
| **全新需求** | 无现有 PRD，需求模糊 | → S2 | 完整流程 |
| **续版需求** | 有 PRD vN，用户要加功能 | → S2（PRD vN+1） | 新版本迭代 |
| **重新计划** | PRD 已冻结，plan 需调整 | → S3 | 跳过 brainstorm |
| **继续执行** | changes 已拆分，继续下一个 | → S4/S5 | 先输出状态恢复简报，用户确认后继续 |
| **单 change 快速通道** | 需求极清晰，无需 PRD（仅限单一功能点、无 UI、无跨模块依赖的极小变更） | → 直接创建 change → workflow-start | 最轻量路径，无 PRD 锚点，**不可触发 S3→S2 回退** |
| **紧急修复（Hotfix）** | bug/生产问题，需最小范围修复 | → 直接创建 change（type: hotfix，注入 bug 描述替代 PRD）→ workflow-start | closing 时强制补录复利 |
| **原型补跑/重跑**（v0.20.0） | PRD 已冻结（`frozen_downstream`）∧ `prototype/` 缺失/为空，或用户显式要求重做/重跑原型 | → 部分重入 S2 原型循环（S2 步骤 2→3→4） | PRD 不动，保留有效 S3 plan / S4 changes，闭环后恢复原 phase；`replan_log` 记往返 |

**判断顺序**：先查活跃需求的 `orchestrator.yaml`（`.team-flow/requirements/<req-id>/orchestrator.yaml`，如存在 → 多半是「继续执行」或「重新计划」），再查 `prd/` 目录（有 PRD → 「续版」候选），最后落到「全新需求」。Hotfix 由用户语义（bug/生产/紧急修复）显式触发。

**原型补跑/重跑判据（v0.20.0，与「重新计划」「续版」区分）**：当 PRD 已冻结时，按用户意图三分：
- 用户要**重做/补做原型**（「重新跑一遍原型」「prototype 没有了」「原型重做」）∧ `prototype/` 缺失/为空或用户明确不满现有原型 → **原型补跑/重跑**（部分重入 S2 原型循环，**PRD/plan/changes 不动**）。
- 用户要**调整 plan**（拆分/依赖/技术方向）→ **重新计划**（→ S3）。
- 用户要**加功能/扩 scope** → **续版需求**（→ S2，PRD vN+1 升版）。
- 判别关键：原型补跑**不升 PRD 版、不重做 plan**，仅原型循环重入；若原型循环暴露 scope 问题，再升级为 S3→S2 回退修订（脱离本路径）。

## 项目基线与词汇检查

- 检查 `docs/architecture/baseline.md`：
  - 存在 → 注入为架构上下文（技术栈/模块/数据模型），替代「从零侦察」
  - 不存在 → advisory 提示「建议先运行 `/workflow-bootstrap` 建立项目基线」（**不阻断**）
- 检查 `CONCEPTS.md`：存在 → 注入领域词汇表

## 复利注入（advisory 级）

读取 `docs/solutions/INDEX.md`（如存在），过滤 `phase = prd OR cross-phase` 且 domain 匹配的经验，取 top-5（按 severity 降序）摘要注入为上下文约束。读取失败时静默跳过，不阻断。

工作流模式复利（L2）：S1 路由时额外注入历史 `workflow_pattern` top-3（confidence ≥ 0.5）。详见 state-model.md「工作流模式复利 L2」。

## 路由结果显式呈现（强制，B3）

路由判断后**必须**向用户确认，路由是建议而非决定：

```
我判断你当前处于【续版需求】路径（已有 PRD v1，将创建 v2），确认？[Y / 选择其他路径]
```

使用平台阻塞问题工具等待用户确认。用户可改判任意路径。

## 「继续执行」状态恢复简报

读取活跃需求的 `orchestrator.yaml` 的 `change_dag`，汇总各 change 状态（从各 change 的 `.team-flow.yaml` 同步），输出简报后由用户选择下一步（**支持跳过被阻塞的 change**）：

```
状态恢复简报：
- change-1 [closed]    已完成
- change-2 [executing] 进行中（state: building）
- change-3 [pending]   依赖 change-2，未开始
建议下一步：继续 change-2（/workflow-start）。确认？
```

**幂等恢复**：通过 yaml + 制品实际存在性双重校验重建状态。yaml 与实际不一致时，以制品实际存在性为准并修正 yaml。详见 state-model.md。

## 完成条件

- 活跃需求已确定（`active_requirement` 已设置，registry 已登记）
- 入口路径已确认（用户确认）
- baseline/CONCEPTS 已注入（或 advisory 提示）
- 复利经验已注入（或静默跳过）
- 活跃需求的 `orchestrator.yaml`（`.team-flow/requirements/<req-id>/orchestrator.yaml`）已初始化/更新 `workflow_phase` 与 S1 阶段状态
