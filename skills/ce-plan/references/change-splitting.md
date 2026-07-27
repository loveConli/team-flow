# Change Splitting

## Overview (v0.5, v0.9 重写：所有权自包含判据)

Break the work into logical **changes** (team-flow change units). Each change represents one meaningful scope that can be independently implemented through the team-flow 8-state workflow.

**v0.5 关键变化**：ce-plan 不再产出文件级 Implementation Units（Files/Approach/Test scenarios）。这些由 spec-writer 在每个 change 内产出。ce-plan 只定"做什么、什么顺序"。

**v0.9 根因判据（所有权自包含）**：change 的边界 = **所有权边界**。一个 change 当且仅当它对应**一个所有权自包含的架构设计单元**——即该 change 能独立做一次架构增量设计（`architecture-design` skill 的核心动作：识别聚合 / 限界上下文 / 读写模型 / API 映射），且该设计不依赖其它 change 去重新定义同一聚合/上下文/读模型/契约的所有权。

**认知声明**：一个迭代版本的 PRD 通常涵盖**多个所有权自包含的设计单元**（每个可对应一个用户故事或功能模块）。产品级 change 拆分的首要动作是识别这些**所有权单元**——不是识别"视角""页面""接口""层"等实现组织。用户故事 / 功能模块 / 视角 / 层 / 页面，都是 **change 内部** spec-writer / build-executor 的实现组织启发式，**不提级**为 change 边界。

**为何如此**：变更级 `architecture-design` 对每个 change 做"架构增量设计"。若两个 change 共享同一聚合/读模型/契约的所有权，则两家的增量设计互相重叠、复利回写打架、所有权不自包含——这是产品阶段"拆太细"的真正病根。反过来说，一个所有权单元内部按视角/层/页面组织 specs 和 tasks，是变更级实现组织，**完全正确且推荐**。

**启发式近似**（与根因判据冲突时以根因为准）：
- 一个用户故事（角色-动作-价值）通常对应一个所有权单元 → 通常 = 一个 change
- 一个内聚功能模块（如"下单""权限体系"）通常对应一个所有权单元 → 通常 = 一个 change
- 但"一个用户故事"不等于"一个 change"的充要条件——若多个故事共享同一所有权单元（如看板多视角共享同一读模型），它们应合为一个 change

## Good Changes

**根因判据**：每个 change 的 scope 必须对应**一个所有权自包含的架构设计单元**——持有不被其它 change 分享的聚合/上下文/读模型/契约所有权，且该设计能在本 change 内闭合。

Good changes are:
- **所有权自包含**（v0.9 根因硬约束）——change 内的 architecture-design 能独立完成，不依赖其它 change 去定义同一聚合/上下文的所有权
- **不被切碎**（v0.9 硬约束）——不存在 ≥2 个 change 瓜分同一聚合/上下文/读模型/契约的所有权
- **不跨所有权单元臃肿**（v0.9 硬约束）——一个 change 不横跨多个互不相关的限界上下文/所有权单元（否则增量设计无法聚焦）
- Independently implementable and verifiable
- Ordered by dependency (DAG)
- Concrete enough for spec-writer to produce proposal/specs/design/tasks

## Anti-Patterns

Avoid:
- **切碎所有权**（v0.9 核心反模式，Critical）：把一个所有权单元按"视角/层/页面/前后端/DB"切成多个 change，每个碎片都不自包含。例：看板 4 个视角 + 读侧基座 + 页面骨架 共享同一看板读模型/契约 → 应合为 **1 个 change**，而非 6 个。又如：把"下单"按 C-后端 + C-前端 + C-读模型 切 3 个 change → 三家瓜分"下单"聚合所有权 → FAIL
- **跨无关节所有权单元**（Critical）：一个 change 的 scope 横跨多个互不相关的限界上下文，导致一次 architecture-design 无法聚焦
- **细到无所有权单元**（Critical）：scope 是单接口/单文件/单方法/单 SQL/单 task → 无设计单元可识别，属变更级实现组织
- Changes so large that spec-writer cannot produce a coherent spec
- Changes so small that the team-flow ceremony overhead exceeds the work

> change-split-auditor D5 检查上述前三条（所有权粒度合规）。

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
