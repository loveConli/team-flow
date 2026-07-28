# Database Design (CQRS 增量)

> **变更 ID**: <change-id>
> **基线版本**: <commit-hash>
> **设计日期**: YYYY-MM-DD

## 1. As-Is 基线（冻结复制）

> 从全局 `docs/architecture/DATABASE.md` 复制当前状态，标注版本锚点。

### 1.1 现有写模型
<列出本 change 涉及的现有写模型（聚合对应的事务型表），若无则写"无">

### 1.2 现有读模型
<列出本 change 涉及的现有读模型（查询模型对应的表/视图），若无则写"无">

---

## 2. To-Be 增量设计

### 2.1 写模型变更（事务型对象）

> **五项检查 #5**: 是否涉及数据库表结构、字段、索引变更？

#### 新增表
| 表名 | 所属聚合 | 主键类型 | 事务边界 | 说明 |
|------|---------|---------|---------|------|
| `<table>` | `<Aggregate>` | `<pk-type>` | `<boundary>` | `<description>` |

#### 修改表
| 表名 | 变更类型 | 变更内容 |
|------|---------|---------|
| `<table>` | `ADD COLUMN` / `MODIFY COLUMN` / `DROP COLUMN` / `ADD INDEX` | `<details>` |

#### 删除表
<列出删除的表，若无则写"无">

### 2.2 读模型变更（分析型对象）

#### 新增查询模型
| 查询模型 | 数据来源 | 派生逻辑 | 用途 |
|---------|---------|---------|------|
| `<QueryModel>` | `<source tables>` | `<derivation>` | `<usage>` |

#### 修改查询模型
<列出修改的查询模型及变更内容，若无则写"无">

#### 删除查询模型
<列出删除的查询模型，若无则写"无">

---

## 3. Schema 变更详情

### 3.1 新增表 DDL
```sql
CREATE TABLE <table_name> (
    id BIGINT PRIMARY KEY,
    -- 字段定义
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 修改表 DDL
```sql
ALTER TABLE <table_name> ADD COLUMN <column> <type>;
ALTER TABLE <table_name> ADD INDEX idx_<name> (<columns>);
```

### 3.3 索引变更
| 表名 | 索引名 | 索引类型 | 字段 | 说明 |
|------|--------|---------|------|------|
| `<table>` | `idx_<name>` | `PRIMARY` / `UNIQUE` / `INDEX` | `<columns>` | `<description>` |

---

## 4. 实体关系变更

### 4.1 新增实体
| 实体名称 | 所属聚合 | 实体类型 | 唯一标识 | 说明 |
|---------|---------|---------|---------|------|
| `<Entity>` | `<Aggregate>` | `实体` / `值对象` | `<identifier>` | `<description>` |

### 4.2 修改实体
<列出修改的实体及变更内容，若无则写"无">

### 4.3 删除实体
<列出删除的实体，若无则写"无">

---

## 5. 数据迁移脚本

> 若涉及数据迁移，提供迁移脚本（幂等、可回滚）

### 5.1 迁移脚本
```sql
-- 迁移描述：<description>
-- 执行顺序：<order>
-- 回滚方式：<rollback>

BEGIN;
-- 迁移逻辑
COMMIT;
```

---

## 6. 演进日志

| 日期 | 变更 ID | 变更内容 | 影响范围 |
|------|---------|---------|---------|
| YYYY-MM-DD | `<change-id>` | `<summary>` | `<scope>` |
