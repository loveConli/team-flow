# Change Splitting

## Overview (v0.5, v0.9 增强)

Break the work into logical **changes** (spec-superflow change units). Each change represents one meaningful scope that can be independently implemented through the spec-superflow 8-state workflow.

**v0.5 关键变化**：ce-plan 不再产出文件级 Implementation Units（Files/Approach/Test scenarios）。这些由 spec-writer 在每个 change 内产出。ce-plan 只定"做什么、什么顺序"。

**v0.9 认知声明**：一个迭代版本的 PRD 通常是**多个用户故事或多个功能模块的合集**——ce-plan 拆分 change 时必须认识到这一点，拆分应**跟着用户故事 / 功能模块走**，而不是跟着接口、文件或任务走。产品阶段的 change 粒度目标是"一个用户故事 / 一个内聚功能模块"，这是变更阶段能**并行设计与实施**的前提。不要拆得更细——变更阶段的 spec-writer 还有 proposal / specs / design / tasks 四层产物 + 实施 task 拆分，产品阶段拆到接口 / 任务级 = 越界做变更级设计 + 重复劳动。

## Good Changes

**拆分维度（v0.9 正向定义）**：每个 change 的 scope 必须是**一个用户故事**（角色-动作-价值）或**一个内聚功能模块**（如"下单""报表导出""权限体系"）。这与 DDD 的 bounded context 话语对齐——一个 bounded context 内的一个内聚功能域 = 一个 change。

Good changes are:
- **按用户故事或功能模块拆分**（v0.9 硬约束）——scope 以故事/模块命名，内部可含多个接口/文件/任务（这些留给 spec-writer 在 tasks.md 拆）
- Focused on one bounded context or one coherent feature area
- Independently implementable and verifiable
- Ordered by dependency (DAG)
- Concrete enough for spec-writer to produce proposal/specs/design/tasks

## Anti-Patterns

Avoid:
- Changes that span multiple unrelated bounded contexts
- Changes so large that spec-writer cannot produce a coherent spec
- Changes so small that the spec-superflow ceremony overhead exceeds the work
- **按实现单元拆 change**（v0.9 新增，硬约束）：scope 主体是单个接口路径（`/api/xxx`）、单个文件、单个方法/函数、单条 SQL、单个 task 动作（"添加字段""写校验"）→ 这是实现单元，不是用户故事/功能模块。change-split-auditor D5 会判 Critical/FAIL。反例：scope="实现 `/api/order/create` 接口"→ FAIL；scope="订单下单用户故事（含创建接口+库存校验+下单页）"→ PASS

## C-ID Convention

Each change carries a stable **C-ID** (`C1`, `C2`, …). C-IDs follow the same stability rule as U-IDs: never renumbered, gaps from deletion are fine.

## Defining Each Change

Each change is a level-3 heading carrying a stable C-ID prefix: `### C1. [Name]`.

For each change, include:
- **Scope** - what this change covers (bounded context, feature area)
- **Requirements** - which PRD requirements it advances (cite PRD section numbers)
- **Dependencies** - what must exist first (cite by C-ID)
- **Priority** - P0 (must-have for vN) / P1 (should-have) / P2 (nice-to-have)
- **Estimated complexity** - S/M/L (guides spec-writer depth)
- **Prototype reference** - which `prototype/pages/` are relevant (if prototype exists)

**不再包含**：Files 列表、Approach 细节、Test scenarios、Execution note、Patterns to follow、Verification——这些由 spec-writer 在 change 内产出。

## Depth Guidance for Change Counts

- **Lightweight** plans: usually 2-4 implementation units
- **Standard** plans: usually 2-5 changes
- **Deep** plans: usually 3-6 changes; group units into phases when that improves clarity
