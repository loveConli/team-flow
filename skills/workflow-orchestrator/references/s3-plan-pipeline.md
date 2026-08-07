# S3 计划阶段（v0.7 修订，pipeline 快速路径）

> 调用 ce-plan 产出 `requirement/vN/plan.md`，使用 `pipeline_mode: orchestrator` 减少仪式开销。设计依据：设计增强方案 v0.7 §17.2 / §17.5。

## 调用方式

调用 `/ce-plan`，传递：
- PRD 路径：`requirement/vN/prd.md`
- 原型路径：`prototype/`（如存在）
- 显式参数：`pipeline_mode: orchestrator`

## 保留 / 跳过清单

ce-plan 在 orchestrator pipeline 上下文中减少仪式开销，但**保留核心价值**：

| 保留（核心价值） | 跳过（仪式开销） |
|-----------------|-----------------|
| Phase 1 repo research（代码库侦察） | output format 解析（强制 md） |
| Phase 3 change splitting + 依赖 DAG | handoff 菜单（Proof/Issue/Browser） |
| 技术方向决策（一人公司模式） | confidence check 降级为 Lightweight |
| 风险与约束分析 | ce-doc-review 降级为 headless |
| 里程碑计划 | 独立调用时的 scoping synthesis 确认 |

## plan.md 聚焦内容

- **Change 拆分方案**：每 change 的 scope + 依赖 + 优先级（C-ID 稳定编号）
- **Change 间依赖图（DAG）**
- **整体技术方向**（一人公司模式，避免各 change 各自为政）

## S3 不可取消的理由（调研确认）

1. **Change 拆分无替代源**：PRD 不包含 change 概念，S4 的输入只能来自 ce-plan
2. **技术方向需全局视角**：避免各 change 的 spec-writer 各自为政
3. **Repo Research 不可重复**：代码库侦察做一次，不能每个 change 重复 N 次

## 复利

- **注入**：读取 `docs/solutions/INDEX.md`，过滤 `phase = plan OR cross-phase`，取 top-5 摘要
- **捕获**：检测可复利时刻（技术方向决策、拆分权衡等）

## 反馈环路检查点

- plan 是否暴露了 PRD 的范围问题？
  - **是** → 回退 S2，触发 PRD vN 内修订（记录变更原因）。详见 feedback-loops.md「S3 → S2」
  - **否** → 进 ARCH（architecture 阶段，v0.35.0 产品级架构设计，见 state-model.md「architecture 阶段」）

## 完成条件

- `requirement/vN/plan.md` 已产出，含 change 拆分 + 依赖 DAG + 技术方向
- `.team-flow/requirements/<req-id>/orchestrator.yaml` 中 S3 状态 = completed
- 下一步：进入 ARCH 阶段，产出 `docs/architecture/iterations/vN/architecture.md` 后进 S4（v0.35.0）
