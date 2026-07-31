# Complexity Grading

复杂度分级的详细规则。SKILL.md §2 的扩展参考。

---

## 1. 分级标准

### trivial（简单）

**判据**（命中任一）：
- 纯常量/枚举类（无方法体）
- POJO/DTO（仅 getter/setter，无业务逻辑）
- 工具方法的简单委托（`return delegate.doSomething(x)`）
- 配置文件读取（无校验逻辑）

**最少用例数**：≥3
- equivalence: 1 个正常输入
- error: 1 个 null/空值
- boundary: **可省**（trivial 降级特权）

**示例**：
```java
// ErrorCode.java — 纯枚举
// OrderDTO.java — 仅 getter/setter
// StringUtils.isBlank() — 简单委托
```

### medium（中等）— 默认

**判据**：无 trivial 或 complex 判据命中时，强制 medium。

**最少用例数**：≥5
- equivalence: ≥1 正常 + ≥1 无效
- boundary: ≥2（至少 1 个下边界 + 1 个上边界）
- error: ≥1

### complex（复杂）

**判据**（命中任一）：
- public_methods > 15
- lines > 800（含注释和空行）
- 圈复杂度 > 10
- param_count > 6（单个方法参数超过 6 个）
- 涉及 ≥3 个外部依赖交互
- 包含状态机（≥4 个状态）

**最少用例数**：≥7
- equivalence: ≥2 正常 + ≥2 无效
- boundary: ≥3（至少含 1 个 6 值法完整覆盖）
- error: ≥1
- path: ≥1（如果有分支）

---

## 2. 圈复杂度计算方法

### 手动计算

从 1 开始（方法本身的 1 条直线执行路径），每遇到以下结构 +1：

| 结构 | 增量 |
|---|---|
| `if` / `else if` | +1 |
| `switch` 每个 `case`（含 `default`） | +1 per case |
| `for` / `while` / `do-while` | +1 |
| `&&` / `||` 短路运算 | +1 per operator |
| `catch` | +1 |
| `?:`（三元表达式） | +1 |

**示例**：
```java
public void process(Order order) {            // 1
  if (order == null) { ... }                  // +1 = 2
  if (order.getStatus() == PAID               // +1 = 3
      && order.getAmount() > 1000) { ... }    // +1 = 4
  for (Item item : order.getItems()) {        // +1 = 5
    if (item.isDiscounted()) { ... }          // +1 = 6
    switch (item.getType()) {
      case PHYSICAL: ... break;              // +1 = 7
      case DIGITAL: ... break;               // +1 = 8
      default: ...                           // +1 = 9
    }
  }
}
// 圈复杂度 = 9 → medium 档（未超 10）
```

### 工具辅助

| 语言 | 工具 | 命令 |
|---|---|---|
| Java | Checkstyle / PMD | `mvn checkstyle:check` / `pmd check` |
| Java | SonarQube | 自动扫描 |
| TypeScript | complexity-report | `npx complexity-report src/` |
| Python | radon | `radon cc src/` |

---

## 3. 校准规则

### 保守默认

- 事实是估算非实测 → 不确定时强制 medium 档(≥5)
- 宁可多做不可漏做 → 边界 case 优先于 happy path

### 方法拆分时的处理

如果一个方法被拆分为多个小方法：
- 拆分前：complex（圈复杂度 12）
- 拆分后：每个子方法 medium（圈复杂度 4-6）
- **但**：拆分前的 complex 级用例数仍需保留（不因拆分而降级）

### 组合方法的计算

如果类有多个 public 方法：
- 每个方法独立计算复杂度
- 类的总复杂度 = 各方法圈复杂度之和
- 类的用例数 = 各方法用例数之和（去重共享的 setup/teardown case）

---

## 4. 与 test-matrix.md 的关联

在 test-matrix.md 的 `## Summary` 段中标注每个模块的复杂度分级：

```markdown
## Summary
- Total cases: 35
- Modules covered: 4
  - OrderService: complex (圈复杂度 14, ≥7 cases)
  - PaymentValidator: medium (圈复杂度 6, ≥5 cases)
  - ErrorCode: trivial (纯枚举, ≥3 cases)
  - OrderConverter: trivial (POJO 映射, ≥3 cases)
```

contract-builder 在生成矩阵时，必须为每个模块标注复杂度分级，作为用例数下限的判据。
