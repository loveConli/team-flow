# Skill 推荐规则（基于触发域分层）

> 本文件定义 session-handoff Step 4 的 skill 推荐逻辑。
> 基于 AGENTS.md 触发域分层表，根据当前工作流阶段推荐新会话应调用的 skills。

## 推荐矩阵

| 当前阶段 | 推荐 Skill（优先级 1） | 推荐 Skill（优先级 2） | 说明 |
|---------|---------------------|---------------------|------|
| Bootstrap（无 baseline.md） | workflow-bootstrap | — | 继续完成接入初始化 |
| S1 路径路由 | workflow-orchestrator | — | 继续需求选择/路径判断 |
| S2 PRD + 原型 | workflow-orchestrator | ce-brainstorm / prototype | 继续 PRD 编写或原型迭代 |
| S3 计划 | workflow-orchestrator | ce-plan | 继续实施方案制定 |
| S4 拆分分发 | workflow-orchestrator | — | 继续 change 拆分 |
| S5 全局监控 | workflow-orchestrator | — | 继续跨 change 监控 |
| change: exploring | workflow-start | need-explorer | 继续需求探索 |
| change: specifying | workflow-start | spec-writer | 继续规划制品编写 |
| change: bridging | workflow-start | contract-builder | 继续执行契约构建 |
| change: executing | workflow-start | build-executor | 继续实现 |
| change: debugging | workflow-start | bug-investigator | 继续调试 |
| change: closing | workflow-start | release-archivist | 继续收尾 |
| 无工作流上下文 | （根据用户 argument 推断） | ce-compound | 通用模式 |

## 附加推荐

无论处于哪个阶段，以下 skills 可作为附加推荐：

| 条件 | 附加推荐 | 理由 |
|------|---------|------|
| 本次会话有值得沉淀的经验 | ce-compound | 捕获经验到 docs/solutions/ |
| 本次会话发现工作流问题 | workflow-feedback | 记录问题供 plugin 优化 |
| 涉及架构设计决策 | architecture-design | 4A+DDD 增量设计 |
| 涉及 E2E 测试 | e2e | AC 驱动 Playwright 测试 |

## 推荐输出格式

在交接文档 §8 和终端输出中，按以下格式呈现：

```
建议 Skills（新会话应调用）：
1. workflow-orchestrator — 当前在 S2 阶段，需继续 PRD 编写
2. ce-compound — 本次会话有值得沉淀的经验（XX 问题的解决方案）
```
