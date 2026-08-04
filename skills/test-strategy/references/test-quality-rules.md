# Test Quality Rules（测试质量规则）

> 来源：glaf4-test scan-generated-tests.py 的通用规则（v0.13 §56）
> 用途：code-reviewer 在测试审查时参考，build-executor 在生成测试后自检

---

## 一、断言质量规则

### 1. missing-meaningful-assertion

**描述**：测试没有有效断言

**检查**：
- 测试方法中没有 `assert*`、`verify*`、`expect*` 等断言语句
- 只有被测方法调用，没有验证结果

**示例（违规）**：
```java
@Test
void testGetUser() {
    userService.getUser(1L);  // 没有断言
}
```

**修正**：
```java
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    assertNotNull(user);
    assertEquals("John", user.getName());
}
```

### 2. weak-assertion-only

**描述**：只有弱断言（assertNotNull/isNotNull）

**检查**：
- 只有 `assertNotNull`、`assertThat(x).isNotNull()`
- 没有验证具体属性值

**示例（违规）**：
```java
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    assertNotNull(user);  // 只验证非空，不验证内容
}
```

**修正**：
```java
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    assertNotNull(user);
    assertEquals("John", user.getName());
    assertEquals(25, user.getAge());
}
```

### 3. verify-only-without-assertion

**描述**：只有 mock verify，没有状态断言

**检查**：
- 只有 `verify(mock).method()`
- 没有验证返回值或状态变化

**示例（违规）**：
```java
@Test
void testCreateUser() {
    userService.createUser("John");
    verify(userRepository).save(any());  // 只验证调用，不验证结果
}
```

**修正**：
```java
@Test
void testCreateUser() {
    User user = userService.createUser("John");
    assertNotNull(user);
    assertEquals("John", user.getName());
    verify(userRepository).save(any());
}
```

---

## 二、调试代码残留规则

### 4. system-out / print-stack-trace

**描述**：测试中有调试代码残留

**检查**：
- `System.out.println`
- `System.err.println`
- `e.printStackTrace()`
- `console.log`（JavaScript）
- `print()`（Python，非断言）

**示例（违规）**：
```java
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    System.out.println("User: " + user);  // 调试代码
    assertNotNull(user);
}
```

**修正**：
```java
@Test
void testGetUser() {
    User user = userService.getUser(1L);
    assertNotNull(user);
    // 如需调试，使用日志框架或断点
}
```

---

## 三、测试状态规则

### 5. disabled-test / unfinished-test-todo

**描述**：禁用或未完成的测试

**检查**：
- `@Disabled`、`@Ignore`
- `// TODO`、`// FIXME`
- `pending`、`skip`（JavaScript/Python）

**处理**：
- 禁用的测试必须有注释说明原因
- 未完成的测试不应提交到主分支

---

## 四、测试数据规则

### 6. hardcoded-sample-like-value

**描述**：检测到样本数据

**检查**：
- 手机号：`13xxxxxxxxx`、`15xxxxxxxxx`
- 身份证：`110101199001011234`
- 邮箱：`test@example.com`、`xxx@test.com`
- 姓名：`张三`、`李四`、`John`、`Doe`
- 地址：`北京市朝阳区xxx`
- 数字：`123456`、`111111`、`000000`

**处理**：
- 使用有意义的测试数据（如业务相关的名称）
- 或使用测试数据工厂（Builder/Fixture）

### 7. real-external-url

**描述**：测试中包含真实外部 URL

**检查**：
- `http://api.example.com`
- `https://third-party-service.com`
- 任何非 localhost/127.0.0.1 的 URL

**处理**：
- 使用 mock/stub 替代真实外部服务
- 或使用 `@MockBean` / `WireMock`

---

## 五、测试结构规则

### 8. large-test-class

**描述**：测试类过大

**检查**：
- 测试方法数 > 20
- 测试类行数 > 500

**处理**：
- 按功能拆分测试类
- 使用 `@Nested` 分组

### 9. generic-test-class-name

**描述**：类名过于泛化

**检查**：
- `Test`、`Tests`、`TestSuite`
- `ServiceTest`、`ControllerTest`（无具体功能描述）

**示例（违规）**：
```java
class ServiceTest { ... }
```

**修正**：
```java
class UserServiceGetUserTest { ... }
class UserServiceCreateUserTest { ... }
```

---

## 六、矩阵对账规则

### 10. case-method-not-found

**描述**：矩阵中的 case 引用了不存在的测试方法

**检查**：
- test-matrix.md 中声明的 `test_method_name` 在测试代码中不存在

### 11. case-test-file-mismatch

**描述**：矩阵中的 case 与测试文件不匹配

**检查**：
- case 声明的 `test_tier` 与实际测试文件不符（如 unit case 写到了集成测试文件）

### 12. evidence-not-in-method

**描述**：矩阵中的 evidence 在测试方法中找不到

**检查**：
- case 声明的 `design_method` 对应的代码模式在测试方法中不存在

### 13. extra-test-methods

**描述**：测试文件中有未在矩阵中声明的方法

**检查**：
- 测试文件中的方法数 > 矩阵中的 case 数

---

## 七、语言特定规则

### 14. Java 特定

- 禁止 `throws Exception`（应显式捕获和断言异常）
- 禁止 `System.out.println` 替代断言
- 单元测试禁止 `@SpringBootTest`
- 集成测试禁止只 mock 不验证

### 15. JavaScript 特定

- 禁止 `console.log` 替代断言
- 禁止 `expect(true).toBe(true)`（无意义断言）
- async 测试必须 await

### 16. Python 特定

- 禁止 `print()` 替代断言
- 禁止 `assert True`（无意义断言）
- 测试函数必须以 `test_` 开头

---

## 八、使用方式

### build-executor 自检

implementer 子代理生成测试后，按此规则自检：
1. 检查断言质量（规则 1-3）
2. 检查调试代码残留（规则 4）
3. 检查测试数据（规则 6-7）
4. 检查测试结构（规则 8-9）

### code-reviewer 审查

code-reviewer 在审查测试代码时，按此规则检查：
1. 矩阵对账（规则 10-13）
2. 语言特定规则（规则 14-16）
3. 测试状态（规则 5）

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-08-04 | v1.0 | 从 glaf4-test scan-generated-tests.py 抽取 15 条通用规则 |
