# Change Splitting

## Overview (v0.5)

Break the work into logical **changes** (spec-superflow change units). Each change represents one meaningful scope that can be independently implemented through the spec-superflow 8-state workflow.

**v0.5 关键变化**：ce-plan 不再产出文件级 Implementation Units（Files/Approach/Test scenarios）。这些由 spec-writer 在每个 change 内产出。ce-plan 只定"做什么、什么顺序"。

## Good Changes

Good changes are:
- Focused on one bounded context or one coherent feature area
- Independently implementable and verifiable
- Ordered by dependency (DAG)
- Concrete enough for spec-writer to produce proposal/specs/design/tasks

## Anti-Patterns

Avoid:
- Changes that span multiple unrelated bounded contexts
- Changes so large that spec-writer cannot produce a coherent spec
- Changes so small that the spec-superflow ceremony overhead exceeds the work

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
