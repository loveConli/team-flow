---
name: workflow-feedback
description: >
  记录 team-flow 工作流使用过程中发现的问题和改进建议。
  当 skill 触发不准、SOP 流程不顺、产物质量不符预期、
  交互体验不好时使用；也可在 change 收尾时回顾性触发。
  不适用于：记录业务代码 bug（用 bug-investigator）、
  沉淀已解决问题的经验（用 ce-compound）。
argument-hint: "[问题简述] [--category <分类>] [--severity <P0-P3>]"
---

# Workflow Feedback

记录 team-flow 工作流使用中的问题，转化为可追踪的改进项。

> **设计依据**：设计增强方案 v0.8 §21.2（P1-10，v0.16.0）
> **与 ce-compound 的关系**：ce-compound 是"经验沉淀端"（解决方案→docs/solutions/），workflow-feedback 是"问题发现端"（痛点→结构化记录→待办输入）。

## Use This Skill When

- skill 触发不准（误触发、不触发、触发域冲突）
- SOP 流程不顺畅（阶段转换卡壳、路由错误、回退不合理）
- 产物质量不符预期（格式、内容、校验问题）
- 交互体验不好（确认过多/过少、信息过载）
- change 收尾时回顾性触发（release-archivist 联动）
- 用户主动说"记录问题"、"这个不好用"、"流程有问题"、"工作流反馈"、"流程反馈"

**Do NOT use when**：
- 业务代码 bug → `bug-investigator`
- 已解决问题的经验沉淀 → `ce-compound`
- 上下文腐化需要保存会话状态 → `session-handoff`（本 skill 记录问题，不保存上下文）
- 设计增强方案的重大变更 → 直接修订设计文档

## Support Files

| 文件 | 用途 | 何时读取 |
|------|------|---------|
| `references/feedback-template.md` | 问题记录模板（YAML frontmatter + 正文） | Step 3 记录时 |
| `references/category-guide.md` | 10 类问题分类定义与示例 | Step 1 分类时 |
| `references/review-mode.md` | 回顾模式：从会话中自动识别问题信号 | 回顾模式触发时 |

**按需读取，勿批量加载。**

## Problem Categories

> 完整定义与示例见 `references/category-guide.md`，以下为快速分类简表。

| 分类 | 说明 | 优化责任方 |
|------|------|-----------|
| `skill-trigger` | 触发不准（误触发/不触发/冲突） | skill description + 触发域分层表 |
| `sop-flow` | 阶段转换、路由、回退不顺 | orchestrator + 设计增强方案 |
| `artifact-quality` | 产物格式/内容/校验问题 | 对应 skill + 制品契约 |
| `state-management` | 状态文件不一致、恢复失败 | state-model + CLI |
| `agent-quality` | subagent 产出质量问题 | agent 定义 + §18.1 |
| `cli-command` | tf CLI 命令问题 | scripts/ |
| `ux-interaction` | 交互不流畅、确认过多/过少 | skill 工作流设计 |
| `performance` | token 消耗过大、响应慢 | skill 拆分/渐进式披露 |
| `cross-platform` | 跨平台兼容性问题 | 多安装面配置 |
| `documentation` | 文档不一致、过时、缺失 | 文档维护规范 |

## Core Workflow

```
触发 → 1. 问题采集 → 2. 上下文关联 → 3. 结构化记录 → 4. 改进建议
```

### Step 1：问题采集

**主动模式**（用户传入 argument）：直接记录用户描述的问题。

**回顾模式**（无 argument，或由 release-archivist 联动触发）：
分析当前会话，识别问题信号（详见 `references/review-mode.md`）：
- skill 被调用后用户手动纠正
- 用户表达不满（"不对"、"不是这样"、"重来"）
- 状态回退（mandatory rewind）
- 多次确认同一事项
- 工作流中断或跳过

### Step 2：上下文关联

自动检测并关联：
- 当前 SOP 阶段（`.team-flow/` yaml）
- 状态机状态（`.team-flow.yaml`）
- 涉及的 skill / agent / CLI 命令
- 涉及的产物路径

### Step 3：结构化记录

按 `references/feedback-template.md` 格式输出：

- **输出路径**：`.team-flow/feedback/<YYYYMMDD-HHmmss>-<category>.md`
- **Git 跟踪**：feedback/ 目录不加入 .gitignore（改进输入需持久化）
- **severity 判定**：未指定时根据影响范围自动建议

### Step 4：改进建议

1. 生成可直接追加到 CLAUDE.md 待办列表的条目（含优先级建议）
2. 如果问题已有解决方案 → 建议触发 `ce-compound` 沉淀经验
3. 如果问题涉及 skill description → 建议具体的 description 修改方向

## Guardrails

1. **不记录业务 bug**：业务代码问题归 bug-investigator，不是工作流问题
2. **不替代 ce-compound**：已解决问题的经验沉淀归 ce-compound
3. **不修改代码**：本 skill 只记录问题和建议，不直接修改 skill/agent/脚本
4. **severity 不虚高**：按实际影响范围判定，不为了引起重视而拔高
5. **一条一文件**：每个问题独立一个文件，便于追踪和关闭

## Output

- 问题记录：`.team-flow/feedback/<timestamp>-<category>.md`
- 终端输出：问题摘要 + 建议待办条目 + 后续建议

## Exception Handling

| 异常 | 处理 |
|------|------|
| 无法判定分类 | 询问用户，或标记为 `documentation`（最宽泛） |
| 同一问题已存在 | 扫描 `.team-flow/feedback/` 已有文件的 frontmatter category + 标题模糊匹配，提示用户已有记录，询问是否补充而非新建 |
| `.team-flow/feedback/` 不存在 | 自动创建 |
