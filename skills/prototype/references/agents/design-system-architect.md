# Design System Architect — 已迁移（v0.19.0）

> **本文件是迁移指针，不是可执行 agent prompt。**
>
> v0.19.0 起，design-system-architect 从 prototype skill 的内部种子代理
> 升级为独立的 `/team-flow:design-system` skill 的内部执行引擎。
>
> **权威版本**：`skills/design-system/references/agents/design-system-architect.md`
>
> prototype skill 需要创建/迭代设计系统时，调用 `/team-flow:design-system`（独立入口），
> 不再直接派发本 agent。详见 `references/orchestration-flow.md` 步骤 ①b。
