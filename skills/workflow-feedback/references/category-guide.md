# 问题分类指南（10 类）

> 本文件定义 workflow-feedback 的问题分类体系。
> 每个分类对应 team-flow 的实际组件，有明确的优化责任方。

## 分类详解

### 1. skill-trigger（触发问题）

**定义**：skill 的 description 触发条件不准确。

**典型表现**：
- 用户说了某个词，不该触发的 skill 被触发了（误触发）
- 用户明确需要某 skill，但模型没有识别到（不触发）
- 两个 skill 的触发词重叠，模型选错了（触发域冲突）

**优化责任方**：skill description 文本 + AGENTS.md 触发域分层表

**示例**：
> 用户说"帮我规划一下"，触发了 ce-plan 而不是 workflow-orchestrator（产品级需求应走 orchestrator）

### 2. sop-flow（流程问题）

**定义**：SOP 阶段转换、路由、回退不顺畅。

**典型表现**：
- 阶段转换时卡壳（不知道下一步该做什么）
- 路由到错误的 skill
- 回退（mandatory rewind）触发条件不合理
- S1-S5 之间的衔接不自然

**优化责任方**：workflow-orchestrator + 设计增强方案 SOP 章节

### 3. artifact-quality（产物质量）

**定义**：生成的产物格式、内容、校验不符预期。

**典型表现**：
- PRD 缺少关键章节
- plan.md 包含了不该有的内容（如接口清单）
- spec 校验不通过
- 产物之间的不一致

**优化责任方**：对应 skill + 制品契约（artifact-contract.md）

### 4. state-management（状态管理）

**定义**：状态文件不一致、恢复失败、并发冲突。

**典型表现**：
- `.team-flow/` yaml 与实际产物状态不匹配
- 跨 session 恢复失败
- 多需求并行时状态混乱

**优化责任方**：state-model 设计 + CLI 脚本

### 5. agent-quality（子代理质量）

**定义**：subagent 的产出质量不达标。

**典型表现**：
- subagent 返回结构不符合 §18.1 协议
- subagent 产出内容质量低
- subagent 没有正确处理阻断/非阻断疑问

**优化责任方**：agent 定义文件 + §18.1 交接协议

### 6. cli-command（CLI 命令）

**定义**：ssf CLI 命令的问题。

**典型表现**：
- 命令执行报错
- 命令输出不符预期
- 缺少必要的命令

**优化责任方**：scripts/ 目录

### 7. ux-interaction（交互体验）

**定义**：交互不流畅、信息过载、确认过多/过少。

**典型表现**：
- 每个小决策都要确认，打断工作流
- 一次性输出太多信息，用户无法消化
- 该确认的时候没确认，直接做了

**优化责任方**：skill 工作流设计

### 8. performance（性能）

**定义**：token 消耗过大、响应慢。

**典型表现**：
- SKILL.md 太长，加载就消耗大量上下文
- 不必要的重复读取
- 可以用脚本做的确定性工作用了 LLM

**优化责任方**：skill 拆分 / 渐进式披露 / 脚本化

### 9. cross-platform（跨平台）

**定义**：在不同平台（Claude Code / Codex / Cursor 等）上的兼容性问题。

**典型表现**：
- 某平台不支持的功能被使用
- 安装面配置不一致
- 平台特有的限制未处理

**优化责任方**：多安装面配置（.claude-plugin/ / .codex-plugin/ 等）

### 10. documentation（文档）

**定义**：文档不一致、过时、缺失。

**典型表现**：
- AGENTS.md 与实际 skills/ 不一致
- CLAUDE.md 版本号过时
- 设计增强方案与实际实现不匹配

**优化责任方**：文档维护规范（CLAUDE.md 迭代同步清单）
