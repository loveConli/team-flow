# API Design (Command/Read/Query 增量)

> **变更 ID**: <change-id>
> **基线版本**: <commit-hash>
> **设计日期**: YYYY-MM-DD

## 1. As-Is 基线（冻结复制）

> 从全局 `docs/architecture/API-INDEX.md`（若有）复制当前状态，标注版本锚点。

### 1.1 现有 Command API
<列出本 change 涉及的现有 Command API，若无则写"无">

### 1.2 现有 Read API
<列出本 change 涉及的现有 Read API，若无则写"无">

### 1.3 现有 Query API
<列出本 change 涉及的现有 Query API，若无则写"无">

---

## 2. To-Be 增量设计

### 2.1 Command API（写操作）

> **五项检查 #4**: 是否涉及 API 新增/变更（端点、方法签名、请求响应 schema）？

#### 新增 Command
| 端点 | 方法 | 所属聚合 | 事务边界 | 说明 |
|------|------|---------|---------|------|
| `<endpoint>` | `POST` / `PUT` / `DELETE` | `<Aggregate>` | `<boundary>` | `<description>` |

#### 修改 Command
<列出修改的 Command 及变更内容，若无则写"无">

#### 删除 Command
<列出删除的 Command，若无则写"无">

### 2.2 Read API（读操作）

#### 新增 Read
| 端点 | 方法 | 所属聚合 | 数据来源 | 说明 |
|------|------|---------|---------|------|
| `<endpoint>` | `GET` | `<Aggregate>` | `<source>` | `<description>` |

#### 修改 Read
<列出修改的 Read 及变更内容，若无则写"无">

#### 删除 Read
<列出删除的 Read，若无则写"无">

### 2.3 Query API（查询操作）

> **阻断测试分流**: Query API 经阻断测试判断是否属于数据服务

#### 新增 Query
| 端点 | 方法 | 查询模型 | 阻断测试结果 | 说明 |
|------|------|---------|--------------|------|
| `<endpoint>` | `GET` / `POST` | `<QueryModel>` | `业务服务` / `数据服务` | `<description>` |

#### 修改 Query
<列出修改的 Query 及变更内容，若无则写"无">

#### 删除 Query
<列出删除的 Query，若无则写"无">

---

## 3. 端点详细设计

### 3.1 Command API 详细设计

#### `<METHOD> <endpoint>`
**说明**: `<description>`

**请求 Schema**:
```json
{
  "field1": "<type>",
  "field2": "<type>"
}
```

**响应 Schema**:
```json
{
  "success": true,
  "data": {
    "id": "<type>"
  }
}
```

**错误码**:
| 错误码 | 说明 | 处理方式 |
|--------|------|---------|
| `<code>` | `<description>` | `<handling>` |

### 3.2 Read API 详细设计

#### `GET <endpoint>`
**说明**: `<description>`

**查询参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `<param>` | `<type>` | `是` / `否` | `<description>` |

**响应 Schema**:
```json
{
  "items": [
    {
      "id": "<type>",
      "field": "<type>"
    }
  ],
  "total": "<int>"
}
```

### 3.3 Query API 详细设计

#### `<METHOD> <endpoint>`
**说明**: `<description>`

**请求 Schema**:
```json
{
  "filters": {
    "field1": "<type>"
  },
  "pagination": {
    "page": "<int>",
    "pageSize": "<int>"
  }
}
```

**响应 Schema**:
```json
{
  "items": [
    {
      "id": "<type>",
      "field": "<type>"
    }
  ],
  "total": "<int>",
  "page": "<int>",
  "pageSize": "<int>"
}
```

---

## 4. 跨域一致性检查

> **F2 · 跨域一致性**

### 4.1 API ↔ 数据实体对齐
| API 端点 | 支撑的数据实体 | 一致性 |
|---------|---------------|--------|
| `<endpoint>` | `<entity>` | ✅ / ❌ |

### 4.2 术语命名统一性
| 术语 | 定义位置 | 命名统一性 |
|------|---------|-----------|
| `<term>` | `<location>` | ✅ / ❌ |

---

## 5. 演进日志

| 日期 | 变更 ID | 变更内容 | 影响范围 |
|------|---------|---------|---------|
| YYYY-MM-DD | `<change-id>` | `<summary>` | `<scope>` |
