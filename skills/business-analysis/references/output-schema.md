# business-analysis.md 输出格式

本文件定义 `requirement/vN/business-analysis.md` 的精确格式。业务分析 skill 只能输出此格式，不得写入 `ledger.md`、PRD、流程或架构等下游制品。

## 文件定位

- 路径：`requirement/vN/business-analysis.md`
- 作用：承接对话沉淀，为 PRD 提供需求与场景数据
- 不直接写入 `requirement/ledger.md`；版本归档由 orchestrator 统一处理

## Frontmatter

```yaml
---
version: vN
status: draft | confirmed
last_updated: YYYY-MM-DD
source: business-analysis skill
---
```

## 必须包含的两大板块

1. **需求列表（Requirements List）**
2. **业务场景列表（Scenario List）**

可选追加板块：

3. **Open Questions / TODOs** —— 仅用于记录用户暂时无法回答的问题

## 需求列表格式

每个需求一行，字段如下：

| 字段 | 要求 |
|------|------|
| ID | `REQ-xxx`，版本内顺序编号 |
| Description | 一句话意图，用 SHALL/MUST 表达 |
| Related Scenarios | `SC-xxx` 列表，逗号分隔 |
| Status | 🔵 pending / ✅ confirmed |
| Change History | `[vN.M YYYY-MM-DD create/modify 摘要]` |

## 业务场景格式

每个场景一行，字段如下：

| 字段 | 要求 |
|------|------|
| ID | `SC-xxx` |
| Role | 具体角色，禁止泛化 "user" |
| Goal | 角色目标 |
| Trigger | 触发事件/条件 |
| Precondition | 前置条件 |
| Constraint | 规则/限制/策略 |
| Acceptance | 可测试成功条件，必须含具体阈值/字段/结果 |
| Related Requirements | `REQ-xxx` 列表 |
| Status | 🔵 pending / ✅ confirmed |
| Change History | `[vN.M YYYY-MM-DD create/modify 摘要]` |

## Open Questions / TODOs 格式

| 字段 | 要求 |
|------|------|
| ID | `TODO-xxx` |
| Question | 未能回答的问题原文 |
| Recorded At | YYYY-MM-DD |
| Status | pending / answered / dropped |
| Related REQ/SC | 可选 |

## 状态管理

- 仅两种状态：🔵 pending、✅ confirmed
- 状态转换只能经由用户阻塞确认
- 确认前必须先通过 QA 检查

## 与 PRD 的映射

| PRD 章节 | 来源内容 |
|---------|---------|
| §7 D7.5_系统功能清单 | 需求列表 + 场景关联（REQ / SC） |
| §8 D7.6_系统功能处理说明书 | 按场景分组的功能模块 |

## 禁止事项

- 禁止在 `business-analysis.md` 中直接写入 `ledger.md`
- 禁止用泛化角色如 "user" 替代具体业务角色
- 禁止 Acceptance 写成不可测试的模糊描述
- 禁止写入业务流程详情（L1-L4、Mermaid、活动表等）
