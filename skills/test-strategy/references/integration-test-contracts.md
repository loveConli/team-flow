# Integration Test Contracts（集成测试契约）

> 来源：glaf4-test social-test-contracts.md 的通用模式（v0.13 §58）
> 用途：集成测试的组织方法论，contract-builder 生成矩阵时参考

---

## 一、核心概念

**社交测试（Social Test）**：跨类/跨层交互的测试，需要声明式契约来明确测试边界和依赖。

**契约的作用**：
- 明确测试的输入和输出
- 声明依赖的真实/mock/stub
- 定义测试隔离和清理策略
- 确保测试可重复和可维护

---

## 二、五种契约类型

### 1. 入口契约（Entry Contract）

**定义**：系统边界入口声明

**内容**：
- API 端点（URL、HTTP 方法、请求格式）
- 消息队列（exchange、routingKey、消息格式）
- 定时任务（cron 表达式、触发条件）

**示例**：
```markdown
## 入口契约

- API: `POST /api/users`
- Content-Type: application/json
- 请求体: `{ "name": "string", "email": "string" }`
- 认证: Bearer Token
```

### 2. 协作者契约（Collaborator Contract）

**定义**：依赖分级声明

**分级**：
| 级别 | 说明 | 使用场景 |
|------|------|---------|
| **真实（Real）** | 使用真实实现 | Repository 层、内部 Service |
| **Mock** | 使用 mock 框架创建 | 外部 API、第三方服务 |
| **Stub** | 使用固定返回值 | 简单依赖、配置服务 |

**示例**：
```markdown
## 协作者契约

| 协作者 | 级别 | 理由 |
|--------|------|------|
| UserRepository | Real | 测试真实持久化逻辑 |
| EmailService | Mock | 外部服务，避免真实发送 |
| ConfigService | Stub | 返回固定配置值 |
```

### 3. 数据契约（Data Contract）

**定义**：测试数据规格声明

**内容**：
- 输入数据格式和约束
- 输出数据格式和验证点
- 测试数据准备方式

**示例**：
```markdown
## 数据契约

### 输入
- name: string, 1-50 字符
- email: string, 有效邮箱格式

### 输出
- User 对象，包含 id、name、email、createdAt
- id: 雪花算法生成，非空
- createdAt: 当前时间，非空

### 准备方式
- 使用 Builder 模式构建测试数据
- 每个测试独立数据，避免共享状态
```

### 4. 中间件契约（Middleware Contract）

**定义**：基础设施交互规格

**内容**：
| 中间件 | 交互方式 | 测试策略 |
|--------|---------|---------|
| **数据库** | SQL 查询/写入 | H2 内存库 / @Transactional 回滚 |
| **消息队列** | 发送/接收消息 | rabbitmq-mock / embedded broker |
| **缓存** | 读写 Redis | embedded-redis / mock |
| **外部 HTTP** | 调用第三方 API | MockWebServer / WireMock |

**示例**：
```markdown
## 中间件契约

| 中间件 | 交互 | 测试策略 |
|--------|------|---------|
| MySQL | INSERT/SELECT | H2 内存库，@Transactional 回滚 |
| RabbitMQ | 发送用户创建事件 | rabbitmq-mock |
| Redis | 缓存用户信息 | embedded-redis (port 6378) |
| 支付网关 | 调用支付 API | MockWebServer |
```

### 5. 清理契约（Cleanup Contract）

**定义**：测试隔离清理声明

**原则**：
- 每个测试独立，不共享状态
- 测试后清理所有创建的数据
- 异步操作需要等待完成

**策略**：
| 场景 | 清理方式 |
|------|---------|
| **同步操作** | @Transactional 自动回滚 |
| **异步操作** | 手动清理（@AfterEach） |
| **消息队列** | 清空队列 |
| **缓存** | 清空 key |

**示例**：
```markdown
## 清理契约

- 数据库：@Transactional 自动回滚
- 消息队列：@AfterEach 清空队列
- 缓存：@AfterEach 清空测试 key
- ThreadLocal：@AfterEach 清理 TraceIdHolder
```

---

## 三、契约声明格式

在 test-matrix.md 的集成测试 case 中，使用以下格式声明契约：

```markdown
| ID | work_mode | test_tier | design_method | description | priority | mock |
|----|-----------|-----------|---------------|-------------|----------|------|
| TC-010 | TDD | integration | equivalence | [contract] 创建用户：POST /api/users | P0 | entry:POST /api/users, collaborator:EmailService=Mock, data:User{name,email}, cleanup:@Transactional |
```

**字段说明**：
- `entry`: 入口契约
- `collaborator`: 协作者契约（Real/Mock/Stub）
- `data`: 数据契约
- `middleware`: 中间件契约
- `cleanup`: 清理契约

---

## 四、矩阵生成指南

### contract-builder 生成集成测试矩阵时：

1. **识别入口**：从 specs/*.md 中提取 API 端点、消息队列、定时任务
2. **分析依赖**：从代码中识别所有依赖，按真实/mock/stub 分级
3. **定义数据**：明确输入输出数据格式
4. **选择中间件**：识别涉及的基础设施，选择测试策略
5. **设计清理**：根据操作类型（同步/异步）设计清理策略

### 示例：用户注册功能

```markdown
## 集成测试矩阵

### TC-010: 创建用户成功
- 入口：POST /api/users
- 协作者：UserRepository=Real, EmailService=Mock
- 数据：{name:"John", email:"john@example.com"}
- 中间件：MySQL=H2
- 清理：@Transactional

### TC-011: 创建用户失败（邮箱已存在）
- 入口：POST /api/users
- 协作者：UserRepository=Real（预先插入重复数据）
- 数据：{name:"John", email:"existing@example.com"}
- 中间件：MySQL=H2
- 清理：@Transactional
- 预期：409 Conflict

### TC-012: 创建用户后发送欢迎邮件
- 入口：POST /api/users
- 协作者：UserRepository=Real, EmailService=Mock
- 数据：{name:"John", email:"john@example.com"}
- 中间件：MySQL=H2, RabbitMQ=rabbitmq-mock
- 清理：@Transactional + 清空队列
- 验证：EmailService.sendWelcomeEmail() 被调用
```

---

## 五、最佳实践

### 1. 契约最小化
- 只声明必要的契约
- 避免过度 mock（内部依赖尽量用真实实现）

### 2. 契约可读性
- 使用表格格式，清晰易读
- 提供理由说明（为什么选择 Mock/Stub）

### 3. 契约可维护性
- 契约与测试代码同步更新
- 定期审查契约的有效性

### 4. 契约复用
- 相似功能的契约可以复用
- 提取公共契约模板

---

## 六、与 test-strategy 的关系

集成测试契约是 test-strategy §1（Design Method 选择规则）的补充：
- **基础级**（equivalence/boundary/error）：适用于所有测试
- **扩展级**（path/state/exception/reject）：条件触发
- **高级**（permission/idempotency/concurrency/contract）：场景触发
  - **contract**：跨模块/跨服务接口契约，需要声明集成测试契约

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-08-04 | v1.0 | 从 glaf4-test social-test-contracts.md 抽取通用模式 |
