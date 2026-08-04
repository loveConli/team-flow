# Integration Test Isolation（集成测试隔离分级）

> 来源：glaf4-test h2-rabbitmq-redis.md 的隔离策略（v0.13 §59）
> 用途：集成测试的分层策略，write-integration-worker 参考

---

## 一、核心原则

**测试隔离**：每个测试独立运行，不依赖其他测试的状态，不污染共享资源。

**隔离级别**：
- **L1：进程内隔离**（最严格）：H2、embedded-redis、rabbitmq-mock
- **L2：事务隔离**：@Transactional 自动回滚
- **L3：手动清理**：@AfterEach 手动清理资源
- **L4：无隔离**（最宽松）：共享真实基础设施（仅限开发环境）

---

## 二、基础设施隔离策略

### 1. 数据库（MySQL/PostgreSQL）

| 策略 | 适用场景 | 实现方式 | 优缺点 |
|------|---------|---------|--------|
| **H2 内存库** | Repository 层测试 | `@DataJpaTest` + H2 依赖 | ✅ 快速、隔离 ❌ SQL 兼容性差异 |
| **@Transactional** | Service 层测试 | 测试类加 `@Transactional` | ✅ 自动回滚 ❌ 异步操作不适用 |
| **Testcontainers** | 需要真实数据库 | Docker 容器 | ✅ 真实环境 ❌ 慢、需要 Docker |

**推荐**：
- Repository 层：H2 内存库
- Service 层：@Transactional（同步操作）
- API 层：@Transactional 或 Testcontainers

**H2 配置示例**：
```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=MySQL;DATABASE_TO_UPPER=false
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
```

### 2. 消息队列（RabbitMQ/Kafka）

| 策略 | 适用场景 | 实现方式 | 优缺点 |
|------|---------|---------|--------|
| **rabbitmq-mock** | MQ 生产者测试 | `MockConnectionFactory` | ✅ 快速、隔离 ❌ 不测试真实 MQ |
| **embedded broker** | MQ 消费者测试 | embedded-rabbitmq | ✅ 真实协议 ❌ 慢、资源占用 |
| **Testcontainers** | 端到端测试 | Docker 容器 | ✅ 真实环境 ❌ 慢、需要 Docker |

**推荐**：
- 生产者：rabbitmq-mock
- 消费者：embedded broker 或 Testcontainers

**rabbitmq-mock 配置示例**：
```java
@Configuration
public class RabbitMockConfig {
    @Bean
    public ConnectionFactory connectionFactory() {
        return new MockConnectionFactory();
    }
}
```

### 3. 缓存（Redis）

| 策略 | 适用场景 | 实现方式 | 优缺点 |
|------|---------|---------|--------|
| **embedded-redis** | 缓存测试 | embedded-redis（port 6378） | ✅ 真实协议 ❌ ARM64 兼容问题 |
| **mock** | 简单缓存逻辑 | Mockito mock | ✅ 快速 ❌ 不测试真实 Redis |
| **Testcontainers** | 端到端测试 | Docker 容器 | ✅ 真实环境 ❌ 慢、需要 Docker |

**推荐**：
- 简单缓存逻辑：mock
- 复杂缓存逻辑：embedded-redis

**embedded-redis 配置示例**：
```java
@Configuration
public class RedisTestConfig {
    @Bean
    public RedisServer redisServer() throws IOException {
        RedisServer server = new RedisServer(6378);
        server.start();
        return server;
    }
}
```

### 4. 外部 HTTP（第三方 API）

| 策略 | 适用场景 | 实现方式 | 优缺点 |
|------|---------|---------|--------|
| **MockWebServer** | HTTP 客户端测试 | OkHttp MockWebServer | ✅ 真实 HTTP 协议 ❌ 只测试客户端 |
| **WireMock** | 复杂 API 模拟 | WireMock | ✅ 强大的模拟能力 ❌ 学习成本 |
| **@MockBean** | Spring Cloud Feign | Mockito mock | ✅ 简单 ❌ 不测试真实 HTTP |

**推荐**：
- 简单 HTTP 客户端：MockWebServer
- 复杂 API 模拟：WireMock
- Feign 客户端：@MockBean

**MockWebServer 配置示例**：
```java
@Test
void testCallExternalApi() throws Exception {
    MockWebServer server = new MockWebServer();
    server.enqueue(new MockResponse()
        .setBody("{\"status\":\"ok\"}")
        .setHeader("Content-Type", "application/json"));

    // 调用被测方法
    String result = externalService.callApi();

    // 验证请求
    RecordedRequest request = server.takeRequest();
    assertEquals("/api/data", request.getPath());
    assertEquals("ok", result);

    server.shutdown();
}
```

---

## 三、分层隔离策略

### Repository 层

**策略**：H2 内存库 + @Transactional

**理由**：
- Repository 层只测试 SQL 和映射逻辑
- H2 内存库提供快速、隔离的测试环境
- @Transactional 确保测试后数据回滚

**示例**：
```java
@DataJpaTest
@Transactional
class UserRepositoryTest {
    @Autowired
    private UserRepository userRepository;

    @Test
    void testFindByEmail() {
        // Arrange
        User user = new User("John", "john@example.com");
        userRepository.save(user);

        // Act
        Optional<User> found = userRepository.findByEmail("john@example.com");

        // Assert
        assertTrue(found.isPresent());
        assertEquals("John", found.get().getName());
    }
    // 测试结束后自动回滚
}
```

### Service 层

**策略**：@Transactional（同步操作）或手动清理（异步操作）

**理由**：
- Service 层测试业务逻辑，需要真实依赖
- 同步操作用 @Transactional 自动回滚
- 异步操作需要手动清理（消息队列、缓存）

**示例（同步）**：
```java
@SpringBootTest
@Transactional
class UserServiceTest {
    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testCreateUser() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest("John", "john@example.com");

        // Act
        User user = userService.createUser(request);

        // Assert
        assertNotNull(user.getId());
        assertEquals("John", user.getName());
    }
    // 测试结束后自动回滚
}
```

**示例（异步）**：
```java
@SpringBootTest
class UserServiceAsyncTest {
    @Autowired
    private UserService userService;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @AfterEach
    void cleanup() {
        // 手动清空消息队列
        rabbitTemplate.execute(channel -> {
            channel.queuePurge("user-events");
            return null;
        });
    }

    @Test
    void testCreateUserSendsEvent() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest("John", "john@example.com");

        // Act
        User user = userService.createUser(request);

        // Assert
        assertNotNull(user.getId());

        // 验证消息发送
        Message message = rabbitTemplate.receive("user-events", 1000);
        assertNotNull(message);
    }
}
```

### API 层

**策略**：MockMvc + @Transactional 或 Testcontainers

**理由**：
- API 层测试 HTTP 请求和响应
- 使用 MockMvc 模拟 HTTP 请求
- 数据库用 @Transactional 或 Testcontainers

**示例**：
```java
@WebMvcTest(UserController.class)
@Transactional
class UserControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void testCreateUser() throws Exception {
        // Arrange
        User user = new User(1L, "John", "john@example.com");
        when(userService.createUser(any())).thenReturn(user);

        // Act & Assert
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"John\",\"email\":\"john@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("John"));
    }
}
```

---

## 四、隔离级别选择指南

| 测试类型 | 隔离级别 | 推荐策略 |
|---------|---------|---------|
| **Repository 层** | L1 | H2 内存库 |
| **Service 层（同步）** | L2 | @Transactional |
| **Service 层（异步）** | L3 | 手动清理 |
| **API 层（简单）** | L2 | MockMvc + @Transactional |
| **API 层（复杂）** | L1 | MockMvc + H2 |
| **端到端** | L1 | Testcontainers |

---

## 五、常见问题和解决方案

### 1. 异步操作测试

**问题**：@Transactional 不适用于异步操作（消息队列、异步方法）

**解决方案**：
- 使用 @AfterEach 手动清理
- 使用 Awaitility 等待异步操作完成
- 使用 embedded broker 替代 mock

### 2. 外部依赖测试

**问题**：外部 API 不可用或不稳定

**解决方案**：
- 使用 MockWebServer/WireMock 模拟外部 API
- 使用 @MockBean mock Feign 客户端
- 使用 Testcontainers 运行真实服务

### 3. 测试数据污染

**问题**：测试数据泄漏到其他测试

**解决方案**：
- 每个测试独立数据（Builder 模式）
- 使用 @Transactional 自动回滚
- 使用 @DirtContexts 标记需要重新加载上下文的测试

### 4. 测试速度慢

**问题**：Testcontainers 启动慢

**解决方案**：
- 使用 @Testcontainers 的 reuse 模式
- 使用 H2 替代真实数据库（Repository 层）
- 使用 mock 替代真实外部服务

---

## 六、与 glaf4-test 的关系

本隔离策略参考了 glaf4-test 的以下规范：
- **H2 替代 MySQL**：`MERGE INTO ... KEY(id)` 幂等写法、`MODE=MySQL;DATABASE_TO_UPPER=false`
- **rabbitmq-mock**：`MockConnectionFactory → CachingConnectionFactory → firstRabbitTemplate`
- **embedded-redis**：端口 6378、`@AutoConfigureBefore` Redisson config

**注意**：glaf4-test 的部分配置是 GLAF4 框架专用的（如 `gtmc.glaf4.*` 配置键），本规范已抽象为通用模式。

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-08-04 | v1.0 | 从 glaf4-test h2-rabbitmq-redis.md 抽取通用隔离策略 |
