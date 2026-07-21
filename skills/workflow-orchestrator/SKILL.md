---
name: workflow-orchestrator
description: 产品级工作流编排器。编排 ce-brainstorm→原型内循环→ce-plan→拆change→分发到 spec-superflow。当用户提出模糊需求、需要从头开始产品级流程时使用。不替代 workflow-start（变更级 8 态状态机），而是其上游编排层。不适用于：已在 spec-superflow change 内的流转控制（用 workflow-start）、单一 change 的实施（用 build-executor）。
---

# Workflow Orchestrator（产品级工作流编排器，v0.5 新增）

编排产品级工作流：从模糊需求到 PRD（含原型内循环）→ 计划 → 拆 change → 分发到 spec-superflow。

## 定位

| 层级 | 编排器 | 管辖范围 |
|------|--------|---------|
| 产品级 | **workflow-orchestrator**（本 skill） | ce-brainstorm → 原型内循环 → ce-plan → 拆 change → 分发 |
| 变更级 | workflow-start（不变） | exploring → ... → closing（8 态状态机） |

**分层原则**：本 skill 管"做什么、什么顺序"（产品级策略），workflow-start 管"怎么做"（变更级执行）。二者通过 change 目录 + `.spec-superflow.yaml` 衔接。

## Use This Skill When

- 用户提出模糊需求，需要从头开始产品级流程
- 用户要求"做一个新需求"、"从头开始"、"我有个想法"
- 需要编排多个阶段（brainstorm → plan → 拆 change）
- 需要管理 PRD 版本和 change 拆分策略

Do NOT invoke for:
- 已在 spec-superflow change 内的流转控制（用 `/workflow-start`）
- 单一 change 的实施（用 `/build-executor`）
- 纯架构设计（用 `/architecture-design`）
- 纯原型设计（用 `/prototype`）

## Execution Flow

### S1: 需求接收与路径判断

1. 接收用户的模糊需求描述
2. 判断路径：
   - 需求模糊、范围不清 → 调用 `/ce-brainstorm`（完整头脑风暴）
   - 需求较清晰、有 PRD → 检查 `prd/` 目录是否有现有 PRD，有则询问是否续用
   - 需求非常清晰、只需计划 → 调用 `/ce-plan`（跳过 brainstorm）
3. **复利注入**：读取 `docs/solutions/INDEX.md`（如存在），过滤 `phase = prd OR cross-phase` 且 domain 匹配的经验，取 top-5 摘要注入为上下文约束
4. 使用平台阻塞问题工具确认路径选择

### S2: PRD 阶段（含原型内循环）

1. 调用 `/ce-brainstorm`，传递需求描述
2. ce-brainstorm 内部执行原型内循环（Phase 3.5）：
   - 判断是否需要原型
   - 如需要：产出原型 → 审查 → 修正循环 → 冻结
   - 如不需要：PRD 直接冻结
3. 确认 PRD 已冻结（frontmatter `frozen: true`）
4. **复利捕获**：检测本阶段是否出现可复利时刻（需求矛盾、原型返工等），如有则调用 `ssf solutions capture --phase prd --domain <domain> --type <type> --severity <sev> --summary "<summary>"`

### S3: 计划阶段

1. 调用 `/ce-plan`，传递 PRD 路径（`prd/vN/prd.md`）和原型路径（`prototype/`，如存在）
2. ce-plan 产出 `prd/vN/plan.md`，聚焦：
   - Change 拆分方案（每 change 的 scope + 依赖 + 优先级）
   - Change 间依赖图（DAG）
   - 整体技术方向（一人公司模式时）
3. **复利注入**：读取 `docs/solutions/INDEX.md`，过滤 `phase = plan OR cross-phase`
4. **复利捕获**：检测可复利时刻

### S4: 拆分与分发

1. 按 plan 中的 change 拆分方案，为每个 change 创建目录：
   ```bash
   mkdir -p changes/<change-name>
   ```
2. 为每个 change 初始化 `.spec-superflow.yaml`：
   ```bash
   npx --yes --package spec-superflow@0.10.2 ssf state init changes/<change-name>
   ```
3. 记录 change 间依赖和优先级（在 plan.md 中已有）
4. 告知用户各 change 已就绪，可以逐个进入 spec-superflow：
   - "Change C1 已就绪，运行 `/workflow-start` 进入变更级流程"
   - 按依赖顺序建议执行顺序

### S5: 全局监控（可选）

当多个 change 并行执行时：
1. 跟踪各 change 进度（通过 `.spec-superflow.yaml` 状态）
2. 检测跨 change 一致性：
   - 共享聚合/实体的变更是否冲突
   - API 变更是否影响其他 change
3. **复利晋升**：change closing 时检查经验晋升
   ```bash
   npx --yes --package spec-superflow@0.10.2 ssf solutions promote <change-dir>
   ```

## Guardrails

- 不替代 workflow-start：本 skill 不管理 8 态状态机流转
- 不直接实施代码：本 skill 只编排，实施由 build-executor 执行
- 不跳过 PRD 冻结：PRD 必须经过原型内循环（或显式跳过）后才能进入 ce-plan
- 不阻断流程：所有复利操作为 advisory 级，INDEX.md 读取失败时静默跳过
- PRD 升版需走完整内循环：下游发现 PRD 有问题，不回改 PRD，触发升版 vN+1

## Output Standard

每次交互结束时说明：
1. 当前所处阶段（S1-S5）
2. 已产出的制品（PRD/原型/plan/changes）
3. 下一步建议（调用哪个 skill）
