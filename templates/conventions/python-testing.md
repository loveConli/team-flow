---
name: python-testing
version: 1.0.0
updated_at: 2026-08-04
source: team-flow plugin
description: Python 测试规范（Pytest）
tech_stack: [python, pytest]
glaf4_compliant: false
---

# Python 测试规范

---

## 1. 测试结构

### Pytest

```python
class TestUserService:
    def test_get_user_returns_user_when_id_exists(self):
        # Arrange
        user_id = 1
        expected_user = {"id": 1, "name": "John"}
        mock_user_repository.find_by_id.return_value = expected_user

        # Act
        user = user_service.get_user(user_id)

        # Assert
        assert user == expected_user
        mock_user_repository.find_by_id.assert_called_once_with(user_id)

    def test_get_user_raises_error_when_id_not_found(self):
        # Arrange
        user_id = 999
        mock_user_repository.find_by_id.return_value = None

        # Act & Assert
        with pytest.raises(UserNotFoundError, match="User not found"):
            user_service.get_user(user_id)
```

### 命名规范

- 测试文件：`test_[module].py`（如 `test_user_service.py`）
- 测试类：`Test[ClassName]`（如 `TestUserService`）
- 测试方法：`test_[method]_[scenario]`（如 `test_get_user_returns_user`）

---

## 2. Mock 规范

### unittest.mock

```python
from unittest.mock import Mock, patch, MagicMock

# 创建 Mock
mock_user_repository = Mock()
mock_user_repository.find_by_id.return_value = {"id": 1, "name": "John"}

# 验证调用
mock_user_repository.find_by_id.assert_called_once_with(1)
mock_user_repository.find_by_id.assert_called()

# patch 装饰器
@patch('app.services.user_service.UserRepository')
def test_get_user(mock_repo_class):
    mock_repo = mock_repo_class.return_value
    mock_repo.find_by_id.return_value = {"id": 1, "name": "John"}

    user = user_service.get_user(1)

    assert user == {"id": 1, "name": "John"}
    mock_repo.find_by_id.assert_called_once_with(1)
```

### pytest-mock

```python
def test_get_user(mocker):
    mock_repo = mocker.patch('app.services.user_service.UserRepository')
    mock_repo.find_by_id.return_value = {"id": 1, "name": "John"}

    user = user_service.get_user(1)

    assert user == {"id": 1, "name": "John"}
    mock_repo.find_by_id.assert_called_once_with(1)
```

---

## 3. 断言规范

### assert 常用方法

```python
# 相等
assert value == expected
assert value != unexpected

# 真假
assert value is True
assert value is False
assert value is None
assert value is not None

# 包含
assert item in collection
assert substring in string

# 异常
with pytest.raises(ExceptionType, match="message"):
    function_that_raises()

# 近似
assert value == pytest.approx(expected, rel=1e-2)

# 类型
assert isinstance(value, str)
```

### 禁止无意义断言

```python
# ❌ 违规
def test_something():
    assert True

# ✅ 正确
def test_get_user():
    user = get_user(1)
    assert user == {"id": 1, "name": "John"}
```

---

## 4. Fixture

### 定义 Fixture

```python
import pytest

@pytest.fixture
def user_repository():
    return Mock()

@pytest.fixture
def user_service(user_repository):
    return UserService(user_repository)

@pytest.fixture
def sample_user():
    return {"id": 1, "name": "John", "email": "john@example.com"}
```

### 使用 Fixture

```python
def test_get_user(user_service, user_repository, sample_user):
    user_repository.find_by_id.return_value = sample_user

    user = user_service.get_user(1)

    assert user == sample_user
```

### Fixture 作用域

```python
@pytest.fixture(scope="session")
def database():
    # 整个测试会话只创建一次
    db = create_test_database()
    yield db
    db.drop_all()

@pytest.fixture(scope="function")
def user_service(user_repository):
    # 每个测试函数创建一次
    return UserService(user_repository)
```

---

## 5. 参数化测试

### @pytest.mark.parametrize

```python
@pytest.mark.parametrize("input,expected", [
    (1, "one"),
    (2, "two"),
    (3, "three"),
])
def test_number_to_word(input, expected):
    assert number_to_word(input) == expected

@pytest.mark.parametrize("user_id,expected_name", [
    (1, "John"),
    (2, "Jane"),
    (3, "Bob"),
])
def test_get_user(user_id, expected_name, user_service, user_repository):
    user_repository.find_by_id.return_value = {"id": user_id, "name": expected_name}

    user = user_service.get_user(user_id)

    assert user["name"] == expected_name
```

---

## 6. 异步测试

### pytest-asyncio

```python
import pytest

@pytest.mark.asyncio
async def test_get_user_async():
    user = await user_service.get_user_async(1)
    assert user == {"id": 1, "name": "John"}

@pytest.mark.asyncio
async def test_get_user_async_raises_error():
    with pytest.raises(UserNotFoundError):
        await user_service.get_user_async(999)
```

---

## 7. 测试数据

### Factory 模式

```python
import factory

class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.Sequence(lambda n: n + 1)
    name = factory.Faker('name')
    email = factory.Faker('email')

# 使用
def test_get_user():
    user = UserFactory(name="John")
    assert user.name == "John"
```

### Fixture

```python
@pytest.fixture
def sample_user():
    return User(id=1, name="John", email="john@example.com")

@pytest.fixture
def sample_users():
    return [
        User(id=1, name="John", email="john@example.com"),
        User(id=2, name="Jane", email="jane@example.com"),
    ]
```

---

## 8. 测试隔离

### 数据库测试

```python
@pytest.fixture
def database():
    # 创建测试数据库
    db = create_test_database()
    yield db
    # 清理
    db.drop_all()

@pytest.fixture
def session(database):
    # 创建事务
    session = database.session()
    session.begin()
    yield session
    # 回滚
    session.rollback()

def test_create_user(session, user_repository):
    user = User(name="John", email="john@example.com")
    user_repository.save(user)

    found = user_repository.find_by_id(user.id)
    assert found.name == "John"
    # 测试结束后自动回滚
```

### 外部服务 Mock

```python
@pytest.fixture
def mock_external_api(mocker):
    mock = mocker.patch('app.services.external_api_client.ExternalApiClient')
    mock.get_data.return_value = {"status": "ok"}
    return mock
```

---

## 9. 测试质量规则

参见 `references/test-quality-rules.md`，主要包括：

1. 断言质量规则（missing-meaningful-assertion、weak-assertion-only）
2. 调试代码残留规则（print）
3. 测试状态规则（pytest.mark.skip、pytest.mark.xfail）
4. 测试数据规则（hardcoded-sample-like-value、real-external-url）
5. 测试结构规则（large-test-file、generic-test-name）

---

## 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-08-04 | v1.0 | 初始版本 |
