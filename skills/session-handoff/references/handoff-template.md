# 交接文档模板（10 节结构）

> 本文件是 session-handoff skill 的交接文档生成模板。
> 设计依据：v0.8 §21.1

## YAML Frontmatter

```yaml
---
type: session-handoff
version: 1
created_at: <ISO 8601>
requirement_id: <req-id | null>
workflow_phase: <S1-S5 | change-level | null>
state_machine: <8态之一 | null>
change_dir: <path | null>
---
```

## 正文结构

### §1 下一个会话的关注点

用户传入的 argument 内容，或从对话上下文推断的下一步关注点。如果用户未传入 argument，从对话最后 5 轮推断。

### §2 工作流状态（自动检测，引用不复制）

- 活跃需求：`<req-id>` — `<title>`
- 产品级阶段：`<S1-S5>`（详见 `.team-flow/requirements/<req-id>/orchestrator.yaml`）
- 变更级状态：`<state>`（详见 `<change>/.spec-superflow.yaml`）
- PRD 版本：`<vN>`，冻结状态：`<frozen_downstream | frozen_absolute | unfrozen>`

> 通用 handoff 模式下跳过本节。

### §3 本次会话进度

#### 已完成
- （列出本次会话完成的工作项）

#### 正在进行
- （列出当前卡在哪里、进展到什么程度）

#### 下一步
- （列出紧接着要做的事情）

### §4 关键决策（未写入产物的）

| 决策 | 理由 | 影响范围 |
|------|------|---------|
| （本次会话中做出的、尚未持久化到任何产物中的决策） | | |

> 已写入 PRD/plan/spec 的决策不需要重复。

### §5 未解决问题与临时假设

| 问题/假设 | 默认处理 | 需要确认？ |
|-----------|---------|-----------|
| （悬而未决的问题） | （当前按什么假设在处理） | 是/否 |

### §6 失败尝试（避免重蹈覆辙）

- 方案 X：放弃原因 → （为什么不行，避免新会话重新尝试）

### §7 用户偏好与约束（会话级）

- （不在文档中的隐性偏好，如"LT 不喜欢 X 方案"、"优先用 Y 技术"）

### §8 建议 Skills（新会话应调用）

| 优先级 | Skill | 理由 |
|--------|-------|------|
| 1 | （基于当前阶段推荐的 skill） | （为什么需要这个 skill） |
| 2 | | |

> 推荐规则详见 `skill-recommendation.md`。

### §9 关键产物引用（不复制，只引用路径）

- PRD: `prd/vN/prd.md`
- 实施方案: `prd/vN/plan.md`
- 原型: `prototype/index.html`
- 设计方案: `docs/architecture-api-db-design-enhancement-v0.8.md`
- 复利经验: `docs/solutions/INDEX.md`
- 领域词汇: `CONCEPTS.md`

> 仅列出与当前工作相关的产物，不需要全部列出。

### §10 敏感信息声明

本文档已脱敏。所有凭据以 `${PLACEHOLDER}` 表示。原始值不存在于本文档中。
