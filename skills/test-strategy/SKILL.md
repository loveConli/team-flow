---
name: test-strategy
description: 测试设计方法论 skill——design_method 选择、分层策略、对抗验证、复杂度分级。build-executor / contract-builder 通过 skills 字段预加载。
user-invocable: false
---

# Test Strategy

测试设计方法论的硬规则。build-executor 通过 `skills: [test-strategy]` 预加载。
详细说明见 `references/design-methods-detail.md`、`references/complexity-grading.md`、`references/adversarial-patterns.md`。

## 1. Design Method 选择规则（三级分层）

### 基础级（必选——每个被测目标必须覆盖）
- **equivalence**: 输入域有有效/无效分类
- **boundary**: 数字/长度/日期/金额/分页存在边界（6 值法：min-1/min/min+1/max-1/max/max+1）
- **error**: 业务异常、空值、外部依赖失败

### 扩展级（条件触发）
- **path**: 方法存在多分支（圈复杂度 M = 判定节点+1，用例数 ≥ M）
- **state**: 对象状态改变或业务规则依赖状态迁移
- **exception**: 显式覆盖异常类型/消息/框架异常映射
- **reject**: 业务拒绝、准入失败、权限拒绝

### 高级（场景触发）
- **permission**: API 权限、租户、用户上下文
- **idempotency**: 重复调用、重复消息、补偿逻辑
- **concurrency**: 锁、事务、异步消息、并发更新
- **contract**: 跨模块/跨服务接口契约（Feign、MQ 消息格式、领域事件字段）

## 2. 复杂度分级用例数

| 复杂度 | 判据 | 最少用例 |
|--------|------|---------|
| trivial | is_trivial=true（enum/constant/POJO） | ≥3（仅 equivalence + error，boundary 可省） |
| medium | 默认（无判据命中） | ≥5 |
| complex | public_methods>15 或 lines>800 或 圈复杂度>10 或 param_count>6 | ≥7 |

保守默认：事实是估算非实测 → 强制 medium 档(≥5)。

## 3. 分层策略（测试金字塔比例）

- unit（test_tier=unit）：70-80% 的 case
- integration（test_tier=integration）：≤30% 的 case
- e2e：由 e2e skill 独立覆盖，不计入本矩阵

## 4. 对抗验证三招（矩阵生成后必检）

1. **恶意输入**：至少 1 个 case 覆盖 null/空串/超大值/特殊字符
2. **并发场景**：涉及锁/事务/异步 → 至少 1 个 concurrency case
3. **依赖失败**：涉及外部依赖 → 至少 1 个 dependency_failure case（超时/熔断/返回空）

## 5. 自检门口诀

每个方法至少：**1 正常 + 1 边界 + 1 异常 + 1 null/空**

## 6. Schema 强制覆盖（test-matrix.md 校验）

1. cases 必须包含至少 1 个 `design_method ∈ {boundary, equivalence}` 的 case
2. cases 必须包含至少 1 个 `design_method ∈ {error, exception, reject}` 的 case
3. `complexity_tier=trivial` 时降级：允许只覆盖 equivalence + error
4. 对抗验证段必须存在（恶意输入/并发/依赖失败三类之一，视目标而定）

## 7. work_mode 三种模式

| work_mode | 适用场景 | TDD 节奏 |
|---|---|---|
| **TDD** | 新功能/新行为 | RED→GREEN→REFACTOR |
| **CHARACTERIZATION** | 遗留代码行为捕获 | 只写不改（不改生产代码） |
| **REGRESSION** | 缺陷复现+修复 | 先复现再修 |
