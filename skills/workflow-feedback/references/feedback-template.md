# 问题记录模板

> 本文件是 workflow-feedback skill 的结构化记录模板。
> 设计依据：v0.8 §21.2

## YAML Frontmatter

```yaml
---
type: workflow-feedback
version: 1
created_at: <ISO 8601>
category: <skill-trigger | sop-flow | artifact-quality | state-management | agent-quality | cli-command | ux-interaction | performance | cross-platform | documentation>
severity: <P0 | P1 | P2 | P3>
status: open
related_skill: <skill-name | null>
related_phase: <S1-S5 | change-level | null>
related_requirement: <req-id | null>
---
```

## Severity 判定标准

| 级别 | 标准 | 示例 |
|------|------|------|
| P0 | 阻断工作流，无法继续 | 状态文件损坏导致无法恢复 |
| P1 | 严重影响效率，有 workaround 但代价大 | skill 误触发导致每次都要手动纠正 |
| P2 | 影响体验，有合理 workaround | 确认弹窗过多，但逐个确认也能完成 |
| P3 | 锦上添花，不影响正常工作 | 输出格式可以更美观 |

## 正文结构

```markdown
# [P?] <问题标题>

## 现象
<发生了什么——客观描述，不带情绪>

## 期望
<应该怎样——正确的行为是什么>

## 复现路径
1. 在 <阶段> 使用 <skill/命令>
2. <具体操作>
3. 观察到 <问题现象>

## 影响
- 影响范围：<哪些 skill/阶段/用户>
- 频率：<首次 | 偶发 | 必现>

## 改进建议
<具体的修改方向，尽可能可操作>

## 建议待办条目
> 可直接追加到 CLAUDE.md 待办列表：
> | P?-? | <标题> | 🔲 待实施 | v?.?.? | 来源：workflow-feedback <日期> |
```

## 文件命名

`<YYYYMMDD-HHmmss>-<category>.md`

示例：`20260725-143022-skill-trigger.md`

## 状态流转

```
open → investigating → resolved → closed
                   → wontfix（注明原因）
```

> 状态变更时更新 frontmatter 的 `status` 字段。
> resolved 时建议触发 ce-compound 沉淀解决方案。
