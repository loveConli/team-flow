# S5 全局监控（v0.7 修订，多 change 时必选）

> v0.7 变更：change 数量 ≥ 2 时 S5 由「可选」升级为「必选」。设计依据：设计增强方案 v0.7 §17.2 / §17.3 / §17.8 / §17.9。

## 必选条件

- change 数量 = 1 → S5 自然跳过
- change 数量 ≥ 2 → **S5 必选**

## 编排层 vs 执行层

| 编排层（orchestrator 自己做） | 执行层（委托） |
|------------------------------|---------------|
| 读状态文件 | 跨 change 一致性检查（`cross-change-consistency-checker` agent） |
| 触发时机判断 | 单 change 合并门禁（复用 `code-reviewer` agent） |
| 冲突处置路由 | 重规划评估（`replan-analyst`，种子提示，只评估不决策） |
| 用户确认 | — |

## 监控职责

### 1. 进度跟踪

通过各 change 的 `.spec-superflow.yaml` 状态同步到 `.team-flow/requirements/<req-id>/orchestrator.yaml` 的 `change_dag[].status`。

### 2. 跨 change 一致性检测

调用 `cross-change-consistency-checker` agent（插件 agent，跨 skill 复用价值）检测：
- 共享聚合/实体的变更是否冲突
- API 变更是否影响其他 change
- 原型漂移（change 实现与全局 prototype/ 是否一致）

### 3. 复利晋升

change closing 时检查经验晋升（change 内经验 → 产品级经验）：

```bash
npx --yes --package spec-superflow@0.21.0 ssf solutions promote <change-dir>
```

### 4. 动态重规划触发

S5 是动态重规划的主要触发点。当检测到需要重新拆分（跨 change 冲突）时，触发 S5 → S4 回退。重规划评估流程与红/绿/灰区边界详见 state-model.md「动态重规划」。

## S5 → S4 回退的在途 change 处置（A3）

回退前必须评估在途 change 状态（前置条件分区）：

| 区域 | 条件 | 处置 |
|------|------|------|
| **绿区** | 所有 change 未 executing | 可直接回退重新拆分 |
| **灰区** | 有 change executing | 逐个确认：暂停 / 废弃 / 保持 |
| **红区** | 已 closing/closed | 只能新 change 修正（hotfix 路径），delta 已合并不可回退 |

在途 change 的处置决策记入 `replan_log`。已 closing/closed 的 change 其 delta 已合并，只能通过新 change 修正。详见 feedback-loops.md「S5 → S4」。

## 完成条件

- 所有 change closed
- 复利晋升已完成
- 跨 change 一致性已确认（无未解决冲突）
- S5 状态 = completed
