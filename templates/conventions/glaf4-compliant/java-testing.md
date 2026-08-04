---
name: java-testing
version: 1.0.0
updated_at: 2026-08-04
source: team-flow plugin (glaf4-test compliant)
description: Java 测试规范（JUnit 5 + Mockito），符合 glaf4-test 要求
tech_stack: [java, junit5, mockito]
glaf4_compliant: true
---

# Java 测试规范（glaf4-test 兼容）

> 本规范符合 glaf4-test 的 Java 测试要求，适用于 JUnit 5 + Mockito 技术栈

---

## 1. 测试结构

### 3-section（基础）

```java
@Test
void shouldXxx_whenYyy() {
    // Arrange - 准备测试数据
    // Act - 执行被测方法
    // Assert - 验证结果
}
```

### 5-section（需要验证过程参数时）

```java
@Test
void shouldXxx_whenYyy() {
    // Arrange
    // Act
    // Assert
    // Capture - 使用 ArgumentCaptor 捕获参数
    // Assert captured - 验证捕获的参数
}
```

### 命名规范

- 测试方法：`should[预期结果]_[条件]` 或 `test[方法名]_[场景]`
- 测试类：`[被测类]Test`（如 `UserServiceTest`）
- @DisplayName：中文描述，清晰说明测试场景

```java
@DisplayName("UserService.createUser 测试")
class UserServiceTest {

    @Test
    @DisplayName("创建用户成功：输入有效数据，返回用户对象")
    void shouldCreateUser_whenInputValid() {
        // ...
    }

    @Test
    @DisplayName("创建用户失败：邮箱已存在，抛出异常")
    void shouldThrowException_whenEmailExists() {
        // ...
    }
}
```

---

## 2. TDD 铁律

### RED → GREEN → REFACTOR

1. **RED**：写失败测试，运行，看到失败
2. **GREEN**：写最小实现，运行，看到通过
3. **REFACTOR**：清理代码，保持绿色

### 禁止行为（Red Flags）

- ❌ "先写代码后补测试"
- ❌ "跳过 RED 确认"
- ❌ "同时写生产代码和测试代码"

### TDD 证据链

implementer 必须在报告中提供：
- **RED**：执行的命令 + 失败输出 + 为什么预期失败
- **GREEN**：执行的命令 + 通过输出

---

## 3. Mock 规范（Mockito）

### 单元测试

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void testGetUser() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(new User("John")));

        // Act
        User user = userService.getUser(1L);

        // Assert
        assertEquals("John", user.getName());
        verify(userRepository).findById(1L);
    }
}
```

**规则**：
- ✅ 使用 `@Mock` + `@InjectMocks`
- ✅ 只 mock 协作者，不 mock 被测类
- ✅ 使用 `@ExtendWith(MockitoExtension.class)`
- ❌ 禁止 `@SpringBootTest`（单元测试不启动容器）
- ❌ 禁止 `@MockBean`（单元测试不用 Spring）

### 集成测试

```java
@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @Test
    void testCreateUser() throws Exception {
        // Arrange
        when(userService.createUser(any())).thenReturn(new User("John"));

        // Act & Assert
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"John\"}"))
                .andExpect(status().isOk());
    }
}
```

**规则**：
- ✅ 使用 `@WebMvcTest` / `@SpringBootTest`
- ✅ 可以使用 `@MockBean` mock 外部依赖
- ✅ 使用 MockMvc 测试 HTTP 请求

---

## 4. 断言规范

### 必须有有效断言

```java
// ❌ 违规：没有断言
@Test
void testGetUser() {
    userService.getUser(1L);
}

// ❌ 违规：只有弱断言
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    assertNotNull(user);
}

// ✅ 正确：有有效断言
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    assertNotNull(user);
    assertEquals("John", user.getName());
    assertEquals(25, user.getAge());
}
```

### 禁止调试代码

```java
// ❌ 违规
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    System.out.println("User: " + user);  // 调试代码
    assertNotNull(user);
}

// ✅ 正确
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    assertNotNull(user);
    assertEquals("John", user.getName());
}
```

---

## 5. 测试数据规范

### 禁止硬编码样本数据

```java
// ❌ 违规
@Test
void testCreateUser() {
    User user = new User("张三", "13800138000", "test@example.com");
}

// ✅ 正确：使用有意义的测试数据
@Test
void testCreateUser() {
    User user = new User("John Doe", "+1-555-0123", "john.doe@company.com");
}

// ✅ 正确：使用 Builder 模式
@Test
void testCreateUser() {
    User user = UserBuilder.create()
        .withName("John Doe")
        .withPhone("+1-555-0123")
        .withEmail("john.doe@company.com")
        .build();
}
```

### 禁止真实外部 URL

```java
// ❌ 违规
@Test
void testCallApi() {
    String url = "https://api.third-party.com/data";
}

// ✅ 正确：使用 mock
@Test
void testCallApi() {
    MockWebServer server = new MockWebServer();
    server.enqueue(new MockResponse().setBody("{\"data\":\"test\"}"));
    // ...
}
```

---

## 6. 异常测试规范

### 显式捕获和断言异常

```java
// ❌ 违规：throws Exception
@Test
void testGetUser() throws Exception {
    userService.getUser(999L);
}

// ✅ 正确：显式捕获和断言
@Test
void testGetUser_NotFound() {
    when(userRepository.findById(999L)).thenReturn(Optional.empty());

    assertThrows(UserNotFoundException.class, () -> {
        userService.getUser(999L);
    });
}

// ✅ 正确：使用 assertThrows 验证异常消息
@Test
void testGetUser_NotFound() {
    when(userRepository.findById(999L)).thenReturn(Optional.empty());

    UserNotFoundException exception = assertThrows(UserNotFoundException.class, () -> {
        userService.getUser(999L);
    });
    assertEquals("User not found: 999", exception.getMessage());
}
```

---

## 7. 组合覆盖声明

当目标方法满足以下条件时，矩阵中必须声明组合覆盖策略：

### 多参数方法（param_count > 1）

声明 `pairwise`，要求至少一个 equivalence/boundary 用例覆盖参数组合

```java
// findByPage(int page, int size) 有两个参数
// 需要声明 pairwise，覆盖 page×size 组合
@Test
void testFindByPage_Normal() { ... }  // page=1, size=10
@Test
void testFindByPage_PageZero() { ... }  // page=0, size=10
@Test
void testFindByPage_SizeZero() { ... }  // page=1, size=0
```

### 有分支逻辑（if/case/switch）

声明 `branch`，要求至少一个 state/path 用例覆盖各分支

```java
// if (user.getStatus() == ACTIVE) { ... } else { ... }
// 需要声明 branch，覆盖 ACTIVE 和非 ACTIVE 分支
@Test
void testGetUser_ActiveUser() { ... }  // status = ACTIVE
@Test
void testGetUser_InactiveUser() { ... }  // status = INACTIVE
```

---

## 8. 测试质量规则

参见 `references/test-quality-rules.md`，主要包括：

1. 断言质量规则（missing-meaningful-assertion、weak-assertion-only、verify-only-without-assertion）
2. 调试代码残留规则（system-out、print-stack-trace）
3. 测试状态规则（disabled-test、unfinished-test-todo）
4. 测试数据规则（hardcoded-sample-like-value、real-external-url）
5. 测试结构规则（large-test-class、generic-test-class-name）
6. 矩阵对账规则（case-method-not-found、case-test-file-mismatch）

---

## 9. 测试隔离

参见 `references/integration-test-isolation.md`，主要包括：

- Repository 层：H2 内存库
- Service 层（同步）：@Transactional
- Service 层（异步）：手动清理
- API 层：MockMvc + @Transactional

---

## 10. 集成测试契约

参见 `references/integration-test-contracts.md`，主要包括：

- 入口契约：API 端点、消息队列、定时任务
- 协作者契约：真实/mock/stub 分级
- 数据契约：输入输出数据格式
- 中间件契约：数据库、消息队列、缓存、外部 HTTP
- 清理契约：测试隔离清理策略

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-08-04 | v1.0 | 初始版本，符合 glaf4-test 要求 |
