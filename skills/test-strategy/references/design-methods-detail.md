# Design Methods Detail

10+1 种测试设计方法的详细说明。SKILL.md §1 的扩展参考。

---

## 基础级（必选）

### equivalence（等价类划分）

**触发条件**：输入域有有效/无效分类。

**方法**：
1. 识别输入参数的有效等价类和无效等价类
2. 每个等价类取 1 个代表值
3. 有效类 → 验证正常行为；无效类 → 验证拒绝/异常

**示例（Java）**：
```java
// 有效等价类：validOrderId (正整数)
// 无效等价类：null, 0, -1, 超过 MAX_LONG
@Test void shouldFindOrder_whenValidId() { ... }
@Test void shouldThrow_whenNullId() { ... }
@Test void shouldThrow_whenNegativeId() { ... }
```

### boundary（边界值分析）

**触发条件**：数字/长度/日期/金额/分页存在边界。

**6 值法**：对每个边界取 min-1 / min / min+1 / max-1 / max / max+1

| 边界类型 | 示例（金额 0.01 ~ 999999.99） |
|---|---|
| min-1 | 0.00 → 拒绝 |
| min | 0.01 → 接受（最小合法） |
| min+1 | 0.02 → 接受 |
| max-1 | 999999.98 → 接受 |
| max | 999999.99 → 接受（最大合法） |
| max+1 | 1000000.00 → 拒绝 |

**日期边界特殊处理**：
- 闰年：2024-02-29 / 2025-02-28
- 月末/月初：1月31日 → 2月1日
- 时区切换：UTC+8 的 23:59 vs UTC 的 15:59

### error（错误/异常路径）

**触发条件**：业务异常、空值、外部依赖失败。

**必须覆盖的三类**：
1. **参数校验错误**：null、空串、格式错误
2. **业务规则违反**：库存不足、余额不够、重复操作
3. **外部依赖失败**：DB 连接超时、HTTP 5xx、MQ 消费失败

**示例**：
```java
@Test void shouldThrowBizException_whenInsufficientStock() { ... }
@Test void shouldReturnEmpty_whenDbReturnsNull() { ... }
@Test void shouldRetry_whenExternalApiTimeout() { ... }
```

---

## 扩展级（条件触发）

### path（路径覆盖）

**触发条件**：方法存在多分支。

**圈复杂度计算**：M = 判定节点数 + 1
- `if` → +1
- `else if` → +1
- `switch` 每个 `case` → +1
- `for` / `while` → +1
- `&&` / `||` 短路运算 → +1

**用例数 ≥ M**。示例：M=4（1 个 if + 1 个 switch 3-case）→ ≥4 个 case。

### state（状态迁移）

**触发条件**：对象状态改变或业务规则依赖状态迁移。

**方法**：
1. 画出状态迁移图（初始态 → 中间态 → 终态）
2. 每条迁移边至少 1 个 case
3. 非法迁移（如 CLOSED → PROCESSING）→ 1 个 reject case

**示例（订单状态机）**：
```
CREATED → PAID → SHIPPED → DELIVERED → CLOSED
  ↓                      ↑
CANCELLED ←──────────────┘ (仅 PAID 前可取消)
```

### exception（异常覆盖）

**触发条件**：显式覆盖异常类型/消息/框架异常映射。

**必须验证**：
1. 异常类型是否正确（BusinessException vs SystemException）
2. 异常消息是否包含上下文（errorCode + 参数值）
3. 框架异常映射（Spring 的 `@ResponseStatus` → HTTP 状态码）

### reject（业务拒绝）

**触发条件**：业务拒绝、准入失败、权限拒绝。

**与 error 的区别**：error 是"系统出了问题"，reject 是"系统正确地拒绝了"。

**示例**：
```java
@Test void shouldReject_whenOrderAlreadyClosed() { ... }
@Test void shouldReject_whenUserNotInWhitelist() { ... }
@Test void shouldReject_whenDuplicateRequest() { ... }
```

---

## 高级（场景触发）

### permission（权限控制）

**触发条件**：API 权限、租户、用户上下文。

**覆盖维度**：
1. 角色权限：ADMIN / USER / GUEST / ANONYMOUS
2. 租户隔离：租户 A 不能访问租户 B 的数据
3. 数据权限：只能操作自己创建的资源

### idempotency（幂等性）

**触发条件**：重复调用、重复消息、补偿逻辑。

**验证模式**：
1. 调用 N 次 → 效果等同于调用 1 次
2. MQ 重复消费 → 不重复处理
3. 补偿操作 → 正向 + 逆向 = 无净效果

**示例**：
```java
@Test void shouldNotDuplicateOrder_whenRetryCreate() {
  var first = orderService.create(request);
  var second = orderService.create(request);
  assertThat(second.getId()).isEqualTo(first.getId());
}
```

### concurrency（并发安全）

**触发条件**：锁、事务、异步消息、并发更新。

**验证模式**：
1. 乐观锁冲突 → 重试或拒绝
2. 分布式锁 → 同一时刻只有一个执行者
3. 事务隔离 → 读未提交 / 读已提交 / 可重复读
4. 异步消息 → 最终一致性

### contract（接口契约）

**触发条件**：跨模块/跨服务接口契约。

**覆盖维度**：
1. Feign 客户端：请求/响应格式与 provider 一致
2. MQ 消息：字段名/类型/必填项
3. 领域事件：事件名/载荷/版本

---

## 派生字段：test_tier

从 `test_kind` 派生 `test_tier`（语言无关的粗粒度分类）：

| test_kind 值 | test_tier |
|---|---|
| pure_unit, mockito_unit, spring_assisted_unit | unit |
| vitest_unit, vue_test_utils_mount | unit |
| api_mockmvc_standalone, api_mockmvc_slice, api_mockmvc_boot | integration |
| service_social, repository_h2 | integration |
| rabbitmq_social, redis_social | integration |
| external_api_stub, test_infrastructure | integration |
| playwright_prototype, playwright_integration（v0.38.0） | e2e |

**用途**：test_tier 用于统计和 CI 分级；test_kind 用于路由到正确的编写模板。
