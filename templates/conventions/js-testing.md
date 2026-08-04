---
name: js-testing
version: 1.0.0
updated_at: 2026-08-04
source: team-flow plugin
description: JavaScript 测试规范（Jest/Vitest）
tech_stack: [javascript, jest, vitest]
glaf4_compliant: false
---

# JavaScript 测试规范

---

## 1. 测试结构

### Jest / Vitest

```javascript
describe('UserService', () => {
  describe('getUser', () => {
    it('should return user when id exists', async () => {
      // Arrange
      const userId = 1;
      const expectedUser = { id: 1, name: 'John' };
      userRepository.findById.mockResolvedValue(expectedUser);

      // Act
      const user = await userService.getUser(userId);

      // Assert
      expect(user).toEqual(expectedUser);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw error when id not found', async () => {
      // Arrange
      const userId = 999;
      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUser(userId)).rejects.toThrow('User not found');
    });
  });
});
```

---

## 2. Mock 规范

### Jest

```javascript
// 自动 mock
jest.mock('./userRepository');

// 手动 mock
const mockUserRepository = {
  findById: jest.fn(),
  save: jest.fn(),
};

// mock 实现
mockUserRepository.findById.mockResolvedValue({ id: 1, name: 'John' });

// 验证调用
expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
expect(mockUserRepository.findById).toHaveBeenCalledTimes(1);
```

### Vitest

```javascript
import { vi } from 'vitest';

// 自动 mock
vi.mock('./userRepository');

// 手动 mock
const mockUserRepository = {
  findById: vi.fn(),
  save: vi.fn(),
};

// mock 实现
mockUserRepository.findById.mockResolvedValue({ id: 1, name: 'John' });

// 验证调用
expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
expect(mockUserRepository.findById).toHaveBeenCalledTimes(1);
```

---

## 3. 断言规范

### expect 常用方法

```javascript
// 相等
expect(value).toBe(expected);
expect(value).toEqual(expected);

// 真假
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// 数字
expect(value).toBeGreaterThan(0);
expect(value).toBeLessThan(100);

// 字符串
expect(value).toMatch(/pattern/);
expect(value).toContain('substring');

// 数组
expect(array).toContain(item);
expect(array).toHaveLength(3);

// 对象
expect(object).toHaveProperty('key', 'value');

// 异常
expect(() => fn()).toThrow('error message');
await expect(promise).rejects.toThrow('error message');
```

### 禁止无意义断言

```javascript
// ❌ 违规
test('test something', () => {
  expect(true).toBe(true);
});

// ✅ 正确
test('should return user', () => {
  const user = getUser(1);
  expect(user).toEqual({ id: 1, name: 'John' });
});
```

---

## 4. 异步测试

### async/await

```javascript
test('should fetch user', async () => {
  const user = await userService.getUser(1);
  expect(user).toEqual({ id: 1, name: 'John' });
});

test('should throw error', async () => {
  await expect(userService.getUser(999)).rejects.toThrow('User not found');
});
```

### 回调

test('should call callback', (done) => {
  userService.getUser(1, (user) => {
    expect(user).toEqual({ id: 1, name: 'John' });
    done();
  });
});
```

---

## 5. 测试数据

### Builder 模式

```javascript
const userBuilder = (overrides = {}) => ({
  id: 1,
  name: 'John',
  email: 'john@example.com',
  ...overrides,
});

test('should create user', () => {
  const userData = userBuilder({ name: 'Jane' });
  const user = await userService.createUser(userData);
  expect(user.name).toBe('Jane');
});
```

### Fixture

```javascript
// fixtures/users.json
[
  { "id": 1, "name": "John" },
  { "id": 2, "name": "Jane" }
]

// test
import users from './fixtures/users.json';

test('should return all users', () => {
  const result = userService.getAllUsers();
  expect(result).toEqual(users);
});
```

---

## 6. 测试隔离

### 每个测试独立

```javascript
describe('UserService', () => {
  let userService;
  let mockUserRepository;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    userService = new UserService(mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return user', async () => {
    mockUserRepository.findById.mockResolvedValue({ id: 1, name: 'John' });
    const user = await userService.getUser(1);
    expect(user).toEqual({ id: 1, name: 'John' });
  });
});
```

---

## 7. 测试质量规则

参见 `references/test-quality-rules.md`，主要包括：

1. 断言质量规则（missing-meaningful-assertion、weak-assertion-only）
2. 调试代码残留规则（console.log）
3. 测试状态规则（test.skip、test.todo）
4. 测试数据规则（hardcoded-sample-like-value、real-external-url）
5. 测试结构规则（large-test-file、generic-test-name）

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-08-04 | v1.0 | 初始版本 |
