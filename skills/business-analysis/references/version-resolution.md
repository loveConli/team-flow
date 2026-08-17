# 业务分析版本解析规则

本规则定义业务分析 skill 如何确定目标版本 `vN`。

## 解析顺序

按以下优先级依次解析：

1. **显式参数**：用户在调用 skill 时传入的版本，如 `business-analysis v2`
2. **运行时配置**：`tf runtime config --get active.requirement`（若返回有效值）
3. **目录扫描**：读取 `requirement/` 下已有的 `vN` 目录，取最大 N
4. **默认回退**：以上皆无时使用 `v1`

## 目录扫描规则

- 只识别 `requirement/vN/` 形式目录，其中 N 为正整数
- 忽略非版本目录（如 `archived/`、`draft/`）
- 若存在 `v1`、`v2`、`v3`，则取 `v3`

## 模式判断

解析出版本后，判断当前是 Create 还是 Update 模式：

| 条件 | 模式 | 行为 |
|---|---|---|
| `requirement/vN/business-analysis.md` 不存在 | Create | 新建文件 |
| 文件已存在 | Update | 读取现有条目，追加或修订 |

## 已存在文件的处理

检测到文件已存在时，必须向用户询问以下三者之一：

- **继续完善**：在当前版本基础上追加/修改条目
- **新建版本**：创建 `v(N+1)/business-analysis.md`，旧版本保持 archived
- **覆盖**：清空当前版本重新生成（不推荐，需用户明确确认）

## 版本号输出

- 最终输出的 `business-analysis.md` frontmatter 中必须包含 `version: vN`
- Change History 中的版本号采用 `vN.M` 形式，其中 M 为本次编辑的次要版本（同一 vN 内递增）
- 首次创建使用 `vN.1`，后续补充依次递增
