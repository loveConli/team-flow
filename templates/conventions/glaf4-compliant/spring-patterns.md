---
name: spring-patterns
version: 1.0.0
updated_at: 2026-08-04
source: team-flow plugin (glaf4-test compliant)
description: Spring Boot 测试规范，符合 glaf4-test 要求
tech_stack: [java, spring-boot]
glaf4_compliant: true
---

# Spring Boot 测试规范（glaf4-test 兼容）

> 本规范符合 glaf4-test 的 Spring Boot 测试要求

---

## 1. MockMvc 三模式

### standaloneSetup（推荐用于 Controller 单元测试）

```java
class UserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(new UserController(userService)).build();
    }

    @Test
    void testGetUser() throws Exception {
        when(userService.getUser(1L)).thenReturn(new User("John"));

        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("John"));
    }
}
```

**适用场景**：
- 只测试 Controller 层
- 不加载 Spring 上下文
- 速度快，隔离性好

### @WebMvcTest（推荐用于 Controller 集成测试）

```java
@WebMvcTest(UserController.class)
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void testGetUser() throws Exception {
        when(userService.getUser(1L)).thenReturn(new User("John"));

        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("John"));
    }
}
```

**适用场景**：
- 测试 Controller + Spring MVC 配置
- 自动配置 MockMvc
- 只加载 Web 层

### @SpringBootTest + @AutoConfigureMockMvc（全上下文测试）

```java
@SpringBootTest
@AutoConfigureMockMvc
class UserControllerE2ETest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testGetUser() throws Exception {
        // Arrange
        User user = userRepository.save(new User("John"));

        // Act & Assert
        mockMvc.perform(get("/api/users/" + user.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("John"));
    }
}
```

**适用场景**：
- 端到端测试
- 加载完整 Spring 上下文
- 速度慢，但测试最全面

### 选择指南

| 模式 | 加载范围 | 速度 | 适用场景 |
|------|---------|------|---------|
| standaloneSetup | 只加载 Controller | 最快 | Controller 单元测试 |
| @WebMvcTest | Web 层 | 快 | Controller 集成测试 |
| @SpringBootTest | 全上下文 | 慢 | 端到端测试 |

---

## 2. @Transactional 测试

### 同步操作

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

### 异步操作（不适用 @Transactional）

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

---

## 3. 测试隔离

### Repository 层：H2 内存库

```java
@DataJpaTest
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
}
```

**H2 配置**（application-test.yml）：
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;MODE=MySQL;DATABASE_TO_UPPER=false
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
```

### Service 层：@Transactional 或手动清理

**同步操作**：
```java
@SpringBootTest
@Transactional
class UserServiceTest {
    // ...
}
```

**异步操作**：
```java
@SpringBootTest
class UserServiceAsyncTest {
    @AfterEach
    void cleanup() {
        // 手动清理消息队列、缓存等
    }
}
```

### API 层：MockMvc + @Transactional

```java
@WebMvcTest(UserController.class)
@Transactional
class UserControllerTest {
    // ...
}
```

---

## 4. Mock 规范

### @MockBean 使用规范

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @MockBean
    private UserService userService;

    @MockBean
    private EmailService emailService;

    // ...
}
```

**规则**：
- ✅ 只 mock 外部依赖（外部 API、第三方服务）
- ✅ 内部依赖尽量用真实实现
- ❌ 不要过度 mock（会导致测试失去意义）

### @SpyBean 使用规范

```java
@SpringBootTest
class UserServiceTest {

    @SpyBean
    private UserService userService;

    @Test
    void testCreateUser() {
        // Arrange
        doReturn(new User("John")).when(userService).generateUser(any());

        // Act
        User user = userService.createUser(new CreateUserRequest("John"));

        // Assert
        assertEquals("John", user.getName());
        verify(userService).generateUser(any());
    }
}
```

**适用场景**：
- 需要部分 mock（只 mock 某个方法）
- 需要验证方法调用次数

---

## 5. 测试配置

### application-test.yml

```yaml
spring:
  # 数据库
  datasource:
    url: jdbc:h2:mem:testdb;MODE=MySQL;DATABASE_TO_UPPER=false
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop

  # 消息队列
  rabbitmq:
    host: localhost
    port: 5672
    username: guest
    password: guest

  # Redis
  redis:
    host: localhost
    port: 6378

# 日志
logging:
  level:
    root: INFO
    com.example: DEBUG
```

### 测试 Profile

```java
@SpringBootTest
@ActiveProfiles("test")
class UserServiceTest {
    // ...
}
```

---

## 6. 常见问题

### 1. @Transactional 不回滚

**原因**：
- 异步操作（@Async、消息队列）
- 多数据源
- 自定义事务管理器

**解决方案**：
- 异步操作：手动清理
- 多数据源：@Transactional("transactionManagerName")
- 自定义事务管理器：确保测试使用正确的管理器

### 2. @MockBean 影响其他测试

**原因**：
- @MockBean 会重新加载 Spring 上下文
- 大量使用 @MockBean 会导致测试变慢

**解决方案**：
- 使用 standaloneSetup 替代 @WebMvcTest
- 使用 @SpyBean 替代 @MockBean（部分 mock）
- 合并相似的测试用例

### 3. 测试数据污染

**原因**：
- 测试数据泄漏到其他测试
- 数据库状态不一致

**解决方案**：
- 使用 @Transactional 自动回滚
- 使用 @DirtContexts 标记需要重新加载上下文的测试
- 每个测试独立数据（Builder 模式）

---

## 7. 与 glaf4-test 的关系

本规范参考了 glaf4-test 的以下要求：
- MockMvc 三模式：standaloneSetup / @WebMvcTest / @SpringBootTest
- H2 内存库：`MODE=MySQL;DATABASE_TO_UPPER=false`
- @Transactional 测试：同步操作自动回滚
- @MockBean 规范：只 mock 外部依赖

**注意**：glaf4-test 的部分配置是 GLAF4 框架专用的（如 `gtmc.glaf4.*` 配置键），本规范已抽象为通用模式。

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-08-04 | v1.0 | 初始版本，符合 glaf4-test 要求 |
