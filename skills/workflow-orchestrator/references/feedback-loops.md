# 反馈环路详细规则（v0.7 新增）

> 核心原则：PRD vN = 一次迭代版本。迭代内的调整通过 vN 内修订 + 变更履历管理，**不升版**。只有新的用户故事/迭代才触发 vN+1。设计依据：设计增强方案 v0.7 §17.3。

## 回退规则（保守策略：只允许相邻回退）

| 回退路径 | 触发条件 | 操作 | 制品处置 |
|---------|---------|------|---------|
| **S3 → S2** | plan 暴露 PRD scope 问题 | PRD vN 内修订 + 记录变更履历（临时解除 frozen_downstream） | plan.md → plan.md.revN（归档），S3 重入时从零产出 |
| **ARCH → S3** | 架构设计暴露 plan 拆分问题（v0.35.0 新增） | 调整拆分策略 | plan.md → plan.md.revN（归档）；iterations/vN/ 快照未完成部分丢弃 |
| **S4 → ARCH** | 架构快照不覆盖 change 触及的 BC / 架构产物缺失（v0.35.0 新增） | 回 ARCH 阶段补快照 | iterations/vN/ 增量调整，change 拆分保留 |
| **S4 → S3** | 依赖图不可执行/粒度不合理 | 调整拆分策略 | 已创建的 change 目录保留，重新拆分后增量调整 |
| **S5 → S4** | 跨 change 冲突需要重新拆分 | 重新评估拆分方案 | 见下方「在途 change 处置」 |

## 在途 change 处置（S5 → S4，A3）

S5→S4 回退时，按在途 change 状态分区处置（前置条件）：

| 区域 | 条件 | 处置 |
|------|------|------|
| **绿区** | 所有 change 未 executing | 可直接重新拆分 |
| **灰区** | 有 change executing | 逐个确认：暂停 / 废弃 / 保持 |
| **红区** | 已 closing/closed | 只能新 change 修正（hotfix 路径） |

在途 change 的处置决策记入 `replan_log`。已 closing/closed 的 change 其 delta 已合并，只能通过新 change 修正（hotfix 路径）。

## 振荡上限（A11）

- **S2↔S3 回退 ≤ 2 次**。超过后升级为人工介入，用户三选一：
  1. 继续修订
  2. 强制 vN+1 升版
  3. 放弃

## 制品处置规则（A10）

- 回退时受影响制品重命名为 `.revN`（保留审计轨迹）
- 重新进入阶段**不读取上一轮制品**，只读取修订后的上游制品，避免旧内容锚定

## 变更履历格式

记录在 PRD 文档的「决策与变更履历」章节：

```markdown
### 决策与变更履历
| 时间 | 触发阶段 | 变更内容 | 原因 | 影响范围 |
|------|---------|---------|------|---------|
| 2026-07-24 | S3→S2 | 砍掉功能X | plan 分析发现技术不可行 | §7 功能清单、§8 处理说明 |
```

## 与双层冻结的关系

- S3→S2 回退 = **临时解除 frozen_downstream**，S2 重新完成后恢复
- 若 PRD 处于 `frozen_absolute`（用户显式确认或 vN+1 已启动），任何修改必须升版 vN+1，**不允许 vN 内修订**
- frozen 状态以 `prd/vN/prd.md` frontmatter 为单一真相源。详见 state-model.md「双层冻结」

## 复利集成

每次阶段回退触发工作流模式复利捕获（`type: workflow_pattern`，`pattern_kind` 视情况为 reorder / change-split-adjust 等）。详见 state-model.md「工作流模式复利 L2」。
