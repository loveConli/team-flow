# B1 代码侦察详细流程（v0.15.0：脚本 + 并行子代理）

> 硬原则：主代理只编排（派发 + 汇总 + 写 baseline.md），侦察执行下沉子代理（§18.1 交接协议）。先用确定性脚本固定化采集基底，再由子代理做语义增强——**可复现、可横展对比**。

## 两种模式（询问用户选择）

- **Quick**（默认）：技术栈 + 模块结构 + 架构模式 + 测试/文档，~2 分钟
- **Deep**：Quick + 数据模型 + API 表面，~10 分钟

## B1.1 确定性脚本采集（先跑，固定化探查）

```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/workflow-bootstrap/scripts/recon-probe.sh --root <项目根> --out /tmp/recon-<slug>.json
```

固定采集（不依赖 LLM，两次接入结果一致）：目录树（限深 4 层）、依赖清单（pom/package.json/requirements/go.mod/build.gradle）、LOC 与文件类型分布、测试文件计数（含 `.test.mjs`/`.spec.mjs`）、DB 迁移文件清单、README/docs 探测。输出结构化 JSON 供子代理消费。脚本只做确定性机械采集（§17.8 第四类载体），语义判断交给子代理 LLM。

## B1.1a DDL 提取能力（v0.23.0 设计，v0.24.0 已实现）

`recon-probe.sh` 已实现 DDL 提取能力（v0.24.0），用于 B2 成果物导入阶段的兜底提取：

- **策略 1：SQL 文件提取**（优先级最高）：扫描 `*.sql` 文件中的 `CREATE TABLE` 语句，直接提取完整 DDL
- **策略 2：Java Entity 类解析**：扫描 `@Entity`、`@Table` 注解的 Java 类，提取表名、字段名、字段类型（正则映射：String→varchar(255)、Long/int→bigint、Boolean→tinyint(1)、LocalDateTime→datetime、BigDecimal→decimal(15,4)）
- **策略 3：占位兜底**：以上均无时生成带注释的空 `schema-baseline.sql`，提示用户手动补充

**用法**：
```bash
bash ${CLAUDE_PLUGIN_ROOT}/skills/workflow-bootstrap/scripts/recon-probe.sh --root <根> --ddl-out docs/architecture/schema-baseline.sql --out /tmp/recon-<slug>.json
```

**JSON 输出字段**：`ddl_extraction.source`（sql_files / java_entity / none）、`ddl_extraction.table_count`、`ddl_extraction.tables[]`、`ddl_extraction.ddl_statements`

**未实现**：SHOW CREATE TABLE（需数据库连接，留待用户手动配置）、Flyway/Liquibase 迁移脚本解析（需语义判断，由侦察子代理处理）。

## B1.2 并行派发侦察子代理（语义增强）

读 `references/agents/codebase-recon-analyst.md`，把 B1.1 的 JSON 路径作为 `recon_json` 入参，按维度**并行派发**子代理（每个子代理消费 JSON 基底 + 按需补读源码，按 §18.1 返回结构化摘要）：

| 子代理任务 | Quick | Deep |
|-----------|:---:|:---:|
| 技术栈识别（语言/框架/构建/DB） | ✓ | ✓ |
| 模块结构（分层/边界） | ✓ | ✓ |
| 已有架构模式（DDD/MVC/微服务/单体） | ✓ | ✓ |
| 测试现状 + 已有文档 | ✓ | ✓ |
| 数据模型（实体/迁移/聚合根候选） | — | ✓ |
| API 表面（REST/gRPC/CLI） | — | ✓ |

子代理非阻断疑问按默认假设继续（记入 `outstanding_questions`）；阻断（如代码库不可读）返回 `blocked`，主代理裁决。

## B1.3 主代理汇总

主代理收集各子代理摘要 + 脚本 JSON，**只汇总不重新侦察**，整合已有文档（见下），写 `docs/architecture/baseline.md`。

## 侦察内容维度（子代理产出，供 baseline.md 组织）

```
├── 技术栈识别（语言、框架、构建工具、数据库）
├── 模块结构（包/目录分层、模块边界、推断分层）
├── 已有架构模式（DDD 分层？MVC？微服务？单体？）
├── 数据模型（Deep：实体/迁移/聚合根候选/实体关系）
├── API 表面（Deep：REST/gRPC/CLI 主要清单）
├── 测试现状（测试目录/框架/粗略覆盖）
└── 已有文档（README/docs/注释密度）
```

## 已有文档处理

- 如果项目已有 `README.md`、`docs/`、`ARCHITECTURE.md` 等，**读取并整合**
- **不覆盖**，而是**合并**——已有文档作为输入，team-flow 格式作为输出
- 标注信息来源（代码分析 vs 原有文档）

**产出**：`docs/architecture/baseline.md`（格式见 §19.4 设计文档）

## Success Output 模板

```
✓ 既有项目接入完成

侦察模式：Quick | Deep

产出：
- docs/architecture/baseline.md（项目基线画像）
- docs/architecture/ARCHITECTURE.md（架构锚点，如适用）
- docs/architecture/DATABASE.md（数据模型，如适用）
- docs/architecture/PHYSICAL-MODEL.md（物理模型，v0.23.0）
- docs/architecture/schema-baseline.sql（DDL 基线脚本，v0.23.0）
- docs/architecture/API-INDEX.md（API 端点索引，v0.23.0）
- docs/architecture/INDEX.md（架构文档索引，v0.23.0）
- docs/architecture/CONCEPTS.md（领域词汇，N 个术语）
- 目录结构：prd/ prototype/ docs/ changes/

关键发现：
- 技术栈：Java 17 + Spring Boot 3 + MySQL 8
- 模块数：5（user-service, order-service, ...）
- 架构模式：微服务 + DDD 分层
- 测试覆盖：约 60%（JUnit 5 + Mockito）

下一步：
→ 运行 /workflow-orchestrator 开始产品级流程
→ 或运行 /architecture-design 进行完整架构设计
```
