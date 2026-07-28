# <项目名>数据库物理模型

> 生成时间: YYYY-MM-DD
> 最后更新: change=<change-name>, YYYY-MM-DD

---

## <业务域名1>（限界上下文）

### 1. <表中文名> (<表名>)

| ID | | 表名 | <表名> | | | | | | | | |
| ---- | ---- | -------------- | ------------ | ---- | ---- | ----------- | ------ | ---- | ---- | ---- | ---- |
| No | 字段名 | 字段ID | NOTN | UNIQ | 属性 | 字节数 | PK | EK | 索引 | 索引 | 索引 | 说明 |
| 1 | 主键ID | id | N | | bigint | | Y | | | | | auto_increment |
| 2 | <字段中文名> | <field_id> | N | | <type> | | | | | | | <说明> |
| 3 | 创建者 | create_by | Y | | bigint | | | | | | | |
| 4 | 创建时间 | create_time | Y | | datetime | | | | | | | |
| 5 | 更新者 | update_by | Y | | bigint | | | | | | | |
| 6 | 更新时间 | update_time | Y | | datetime | | | | | | | 默认CURRENT_TIMESTAMP |
| 7 | 删除标识 | del_flag | Y | | tinyint(1) | | | | | | | 默认0:未删除 1已删除 |
| 8 | 备注 | remark | Y | | varchar(500) | | | | | | | |

---

### 2. <表中文名> (<表名>)

| ID | | 表名 | <表名> | | | | | | | | |
| ---- | ---- | -------------- | ------------ | ---- | ---- | ----------- | ------ | ---- | ---- | ---- | ---- |
| No | 字段名 | 字段ID | NOTN | UNIQ | 属性 | 字节数 | PK | EK | 索引 | 索引 | 索引 | 说明 |
| 1 | 主键ID | id | N | | bigint | | Y | | | | | auto_increment |
| 2 | <关联表>ID | <fk_field_id> | N | | bigint | | | Y | Y | | | FK→<关联表名> |
| 3 | <字段中文名> | <field_id> | N | | <type> | | | | | | | <说明> |
| 4 | <JSON字段中文名> | <json_field_id> | Y | | json | | | | | | | 条件必填 |
| 5 | 创建者 | create_by | Y | | bigint | | | | | | | |
| 6 | 创建时间 | create_time | Y | | datetime | | | | | | | |
| 7 | 更新者 | update_by | Y | | bigint | | | | | | | |
| 8 | 更新时间 | update_time | Y | | datetime | | | | | | | 默认CURRENT_TIMESTAMP |
| 9 | 删除标识 | del_flag | Y | | tinyint(1) | | | | | | | 默认0:未删除 1已删除 |
| 10 | 备注 | remark | Y | | varchar(500) | | | | | | | |

---

## <业务域名2>（限界上下文）

### 3. <表中文名> (<表名>)

| ID | | 表名 | <表名> | | | | | | | | |
| ---- | ---- | -------------- | ------------ | ---- | ---- | ----------- | ------ | ---- | ---- | ---- | ---- |
| No | 字段名 | 字段ID | NOTN | UNIQ | 属性 | 字节数 | PK | EK | 索引 | 索引 | 索引 | 说明 |
| 1 | 主键ID | id | N | | bigint | | Y | | | | | auto_increment |
| 2 | <字段中文名> | <field_id> | N | | varchar(100) | | | | | | | <说明> |
| 3 | <枚举字段中文名> | <enum_field_id> | N | | char | 1 | | | | | | <枚举说明，如 1:是 0:否> |
| 4 | 创建者 | create_by | Y | | bigint | | | | | | | |
| 5 | 创建时间 | create_time | Y | | datetime | | | | | | | |
| 6 | 更新者 | update_by | Y | | bigint | | | | | | | |
| 7 | 更新时间 | update_time | Y | | datetime | | | | | | | 默认CURRENT_TIMESTAMP |
| 8 | 删除标识 | del_flag | Y | | tinyint(1) | | | | | | | 默认0:未删除 1已删除 |
| 9 | 备注 | remark | Y | | varchar(500) | | | | | | | |

---

## 附录：物理模型图例说明

| 标识 | 含义 |
|------|------|
| **NOTN** | NOT NULL，Y=可为空，N=不可为空 |
| **UNIQ** | UNIQUE，Y=唯一约束 |
| **PK** | Primary Key，主键 |
| **EK** | External Key，外键（关联其他表） |
| **索引** | 该字段上有索引 |
| **属性** | 数据类型，如 bigint、varchar(50)、decimal(15,4) 等 |
| **说明** | 字段业务含义、枚举值、默认值等说明 |

### 通用字段说明

所有表均包含以下标准字段（审计字段）：

| 字段名 | 字段ID | 属性 | 说明 |
|--------|--------|------|------|
| 创建者 | create_by | bigint | 创建人ID |
| 创建时间 | create_time | datetime | |
| 更新者 | update_by | bigint | 更新人ID |
| 更新时间 | update_time | datetime | 默认CURRENT_TIMESTAMP，自动更新 |
| 删除标识 | del_flag | tinyint(1) | 默认0:0未删除 1已删除（逻辑删除） |
| 备注 | remark | varchar(500) | |

### 枚举字段速查

| 表名 | 字段名 | 枚举值 |
|------|--------|--------|
| <表中文名1> | <字段中文名1> | <枚举值说明> |
| <表中文名2> | <字段中文名2> | <枚举值说明> |
