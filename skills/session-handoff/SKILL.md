---
name: session-handoff
description: >
  将当前会话的工作上下文压缩为结构化交接文档，供新会话无缝继续。
  当长时间对话导致上下文腐化、产出质量下降时使用；
  也可在切换设备、交接给其他开发者时使用。
  不适用于：change 级任务委派（用 tf handoff）、
  产品级状态恢复（已由 .team-flow/ yaml 自动处理）、
  subagent 进程内交接（已由 §18.1 交接协议覆盖）。
argument-hint: "[下一个会话的关注点描述]"
---

# Session Handoff

将当前会话的隐性知识压缩为结构化交接文档，让新会话无损继续。

> **设计依据**：设计增强方案 v0.8 §21.1（P1-10，v0.16.0）

## Use This Skill When

- 长时间对话后产出质量下降（重复提问、遗忘约束、答非所问）
- 用户主动说"交接"、"换会话"、"handoff"、"上下文太长"
- 切换设备或交接给其他开发者
- 模型检测到上下文腐化迹象时**建议**用户触发（不强制）

**Do NOT use when**：
- change 级任务委派 → `tf handoff`（prototype/research/experiment）
- 产品级状态恢复 → 已由 `.team-flow/` yaml 自动处理
- subagent 进程内交接 → 已由 §18.1 交接协议覆盖

## Support Files

| 文件 | 用途 | 何时读取 |
|------|------|---------|
| `references/handoff-template.md` | 交接文档 10 节模板 | Step 3 生成文档时 |
| `references/context-extraction.md` | 上下文萃取规则（6 类隐性知识） | Step 2 萃取时 |
| `references/skill-recommendation.md` | 基于触发域分层的 skill 推荐规则 | Step 4 恢复指引时 |

**按需读取，勿批量加载。**

## Core Workflow

```
触发 → 1. 环境感知 → 2. 上下文萃取 → 3. 文档生成 → 4. 恢复指引
```

### Step 1：环境感知（自动）

检测以下状态文件，构建工作流快照：

| 检测目标 | 路径 | 提取信息 |
|---------|------|---------|
| 需求注册表 | `.team-flow/registry.yaml` | 活跃需求、需求列表 |
| 编排状态 | `.team-flow/requirements/<req-id>/orchestrator.yaml` | SOP 阶段（S1-S5） |
| 变更级状态 | `<change>/.team-flow.yaml` | 状态机 8 态中的当前态 |
| PRD 版本 | `prd/vN/prd.md` frontmatter | 迭代版本、冻结状态 |

**降级规则**：上述文件均不存在 → 通用 handoff 模式（跳过工作流状态节）。

### Step 2：上下文萃取

从当前对话中提取 6 类隐性知识（详见 `references/context-extraction.md`）：

1. **进度摘要**：已完成 / 正在进行 / 下一步
2. **关键决策**：本次会话做出的、尚未写入产物的决策
3. **未解决问题**：悬而未决的问题、临时假设
4. **用户偏好**：不在文档中的隐性偏好
5. **失败尝试**：尝试过但放弃的方案及原因
6. **敏感信息**：API Key / Token / 密码 → 替换为 `${PLACEHOLDER}`

### Step 3：文档生成

按 `references/handoff-template.md` 的 10 节结构生成：

- **有 argument** → 直接写入 §1「下一个会话的关注点」
- **无 argument** → 从对话最后 5 轮推断关注点
- **输出路径**：`.team-flow/handoffs/<YYYYMMDD-HHmmss>-<req-id|general>.md`
- **核心原则**：引用产物路径，**不复制内容**
- **敏感信息**：所有凭据以 `${PLACEHOLDER}` 表示

### Step 4：恢复指引（输出到终端，不写入文档）

1. 告诉用户新会话中的恢复操作：
   ```
   新会话中执行：
   1. 读取 .team-flow/handoffs/<文件名>.md
   2. 按文档 §8 建议的 skills 继续工作
   ```
2. 基于当前阶段推荐 skills（详见 `references/skill-recommendation.md`）

## Guardrails

1. **不复制产物内容**：PRD、plan.md、spec 等只引用路径
2. **不重复状态文件**：yaml 中已有的结构化数据只引用，不抄写
3. **必须脱敏**：所有凭据值替换为 `${PLACEHOLDER}`
4. **不替代状态恢复**：`.team-flow/` yaml 的跨 session 恢复是自动的，handoff 补充非结构化隐性知识
5. **handoffs/ 目录加入 .gitignore**：交接文档是临时性质

## Output

- 交接文档：`.team-flow/handoffs/<timestamp>-<req-id>.md`
- 终端输出：恢复指引 + 建议 skills 列表

## Exception Handling

| 异常 | 处理 |
|------|------|
| `.team-flow/` 不存在 | 降级为通用 handoff（跳过工作流状态节） |
| 对话内容过短（<5 轮对话，一问一答为一轮） | 提示用户：当前上下文尚浅，建议继续当前会话 |
| handoffs/ 目录不存在 | 自动创建 |
