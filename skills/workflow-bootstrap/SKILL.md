---
name: workflow-bootstrap
description: 既有项目接入初始化器。在首次使用 team-flow 时执行一次性"侦察 + 基线建立"：代码库侦察 → 架构基线文档化 → 领域词汇提取 → 目录初始化 → 路径判断。完成后进入 workflow-orchestrator。不适用于：全新项目（无代码库，直接用 workflow-orchestrator）、已建立基线的项目（baseline.md 已存在）。
---

# Workflow Bootstrap（既有项目接入初始化器，v0.6 新增）

在首次使用 team-flow 时执行一次性"侦察 + 基线建立"，为既有项目建立架构基线、领域词汇和目录结构，然后进入正常产品级流程。

## 定位

```
workflow-bootstrap（一次性，手动触发）
  → B1 代码库侦察 → B2 架构基线 → B3 领域词汇 → B4 目录初始化 → B5 路径判断
  → 进入 workflow-orchestrator S1（注入 baseline 上下文）
```

- **一次性**：只在首次接入 team-flow 时执行。
- **手动触发**（`/workflow-bootstrap`）：侦察可能耗时较长，架构基线需要用户确认。
- **不替代 workflow-orchestrator**：bootstrap 管"从哪里开始"，orchestrator 管"做什么"。
- **对全新项目可跳过**：无代码库时，直接进入 workflow-orchestrator。

## Use This Skill When

- 用户在一个**既有代码库**中首次使用 team-flow
- 用户说"帮我初始化 team-flow"、"这个项目怎么接入 team-flow"、"先分析一下这个代码库"
- 需要建立架构基线、领域词汇、目录结构

Do NOT invoke for:
- 全新项目（无代码库）→ 直接用 `/workflow-orchestrator`
- 已建立基线的项目（`docs/architecture/baseline.md` 已存在）→ 提示用户"基线已建立"
- 已在 spec-superflow change 内 → 用 `/workflow-start`
- 纯架构设计 → 用 `/architecture-design`

## Pre-check

执行任何操作前，先检查：

1. **baseline.md 是否已存在**：
   ```bash
   test -f docs/architecture/baseline.md
   ```
   - 存在 → 提示用户："基线已建立（docs/architecture/baseline.md）。是否要重新侦察？"
   - 用户确认重新侦察 → 继续（备份旧 baseline.md 为 baseline.md.bak）
   - 用户拒绝 → 退出，建议直接进入 `/workflow-orchestrator`

2. **代码库是否存在**：
   - 检查是否有源代码文件（`src/`、`lib/`、`app/`、`*.java`、`*.py`、`*.ts` 等）
   - 无代码 → 提示用户："这是全新项目，建议直接使用 `/workflow-orchestrator`"
   - 用户坚持 → 继续（但 B1 侦察结果会很简单）

## Execution Flow

### B1: Codebase Reconnaissance（代码侦察）

自动分析既有代码库，产出结构化摘要。

**两种模式**（询问用户选择）：
- **Quick**（默认）：只分析目录结构 + 技术栈 + 模块边界，~2 分钟
- **Deep**：读取核心代码、提取领域模型、分析 API 表面，~10 分钟

**侦察内容**：

```
├── 技术栈识别（语言、框架、构建工具、数据库）
│   ├── 检查 package.json / pom.xml / build.gradle / requirements.txt / go.mod 等
│   ├── 识别框架（Spring Boot / Express / Vue / React / Django 等）
│   └── 识别构建工具和数据库
├── 模块结构（包/目录分层、模块边界）
│   ├── 分析顶层目录结构
│   ├── 识别模块/服务/包
│   └── 推断分层（controller/service/repository 等）
├── 已有架构模式
│   ├── DDD 分层？MVC？微服务？单体？
│   └── 是否有明确的领域层/应用层/基础设施层
├── 数据模型（Deep 模式）
│   ├── 扫描实体类 / 数据库迁移文件 / schema 定义
│   ├── 识别聚合根候选
│   └── 推断实体关系
├── API 表面（Deep 模式）
│   ├── 扫描 REST endpoints / gRPC services / CLI commands
│   └── 列出主要 API
├── 测试现状
│   ├── 有无测试目录和测试文件
│   ├── 测试框架
│   └── 粗略覆盖率
└── 已有文档
    ├── README.md
    ├── docs/ 目录
    └── 注释密度
```

**已有文档处理**：
- 如果项目已有 `README.md`、`docs/`、`ARCHITECTURE.md` 等，**读取并整合**
- **不覆盖**，而是**合并**——已有文档作为输入，team-flow 格式作为输出
- 标注信息来源（代码分析 vs 原有文档）

**产出**：`docs/architecture/baseline.md`（格式见 §19.4 设计文档）

### B2: Architecture Baseline（架构基线文档化）

**条件**：如果 B1 侦察发现项目有一定复杂度（≥5 个模块或 ≥10 个源文件），执行此阶段。否则跳过。

产出：
- `docs/architecture/ARCHITECTURE.md` — 分层、模块边界、技术选型（瘦锚点格式）
- `docs/architecture/DATABASE.md` — 数据模型（如适用）
- `docs/architecture/<bc>/` — 每个有界上下文的目录（如能识别）

**轻量 vs 完整**：
- bootstrap 产出的是**基线快照**（As-Is 当前态），不是完整的 4A+DDD 设计
- 完整的架构演进仍走 `/architecture-design` 的标准增量流程
- 如果用户需要完整架构设计，B2 结束后建议："基线已建立。如需完整架构设计，请运行 `/architecture-design`"

**已有架构文档处理**：
- 如果 `docs/architecture/ARCHITECTURE.md` 已存在 → 读取并整合，不覆盖
- 如果项目有其他格式的架构文档 → 提取关键信息，整合进 team-flow 格式

### B3: Domain Vocabulary Bootstrap（领域词汇种子）

从代码命名中提取领域词汇，创建或更新 `CONCEPTS.md`。

**提取策略**：
1. 扫描实体类名、服务类名、模块名
2. 提取核心领域名词（Order, User, Cart, Payment 等）
3. 推断定义（基于类注释、字段名、方法名）
4. 记录出处（文件路径）

**CONCEPTS.md 格式**：

```markdown
# Concepts

> 从既有代码库提取的核心领域词汇 — 基于代码命名和模块结构自动推断（workflow-bootstrap B3 产出）

| 术语 | 定义 | 出处 |
|------|------|------|
| Order | 订单聚合根 | src/domain/order/Order.java |
| Cart | 购物车，下单前的临时状态 | src/domain/cart/Cart.java |
```

**已有 CONCEPTS.md 处理**：
- 如果 `CONCEPTS.md` 已存在（由之前的 ce-compound 运行创建）→ **合并**而非覆盖
- 读取已有词汇，补充从代码中新发现的术语
- 标注来源："workflow-bootstrap B3 补充"

**与 ce-compound 的关系**：
- ce-compound 是"等待遇到问题后被动记录"
- B3 是"主动从代码中提取"
- 两者互补——B3 建立种子词汇表，ce-compound 在后续开发中持续补充

### B4: Directory Initialization（目录初始化）

创建 team-flow 需要的目录结构：

```bash
mkdir -p prd/
mkdir -p prototype/
mkdir -p docs/architecture/
mkdir -p docs/solutions/
mkdir -p changes/
```

**已有目录处理**：
- 如果目录已存在 → 不覆盖、不删除，只创建缺失的目录
- 如果目录中有文件 → 保留，不修改

**Discoverability 检查**：
- 检查 `AGENTS.md` 或 `CLAUDE.md` 是否暴露了 `docs/architecture/` 和 `prototype/`
- 如果没有 → 建议用户添加（advisory，不自动修改）

### B5: Path Decision（路径判断）

询问用户：

> 您希望从哪个需求开始使用 team-flow？
> - A) 我有一个具体的功能需求（→ 进入 workflow-orchestrator S1）
> - B) 我有一个模糊的产品方向（→ ce-brainstorm）
> - C) 我只是想建立架构基线，暂不开发新需求（→ 结束）

**上下文传递**：
- 将 `docs/architecture/baseline.md` 和 `CONCEPTS.md` 的路径传递给 workflow-orchestrator S1
- 作为后续流程的架构上下文

## Guardrails

- **一次性**：bootstrap 只在首次接入时执行。如果 `docs/architecture/baseline.md` 已存在，提示用户"基线已建立，是否要重新侦察？"
- **不修改代码**：bootstrap 只读取代码、产出文档，不修改任何源代码。
- **不创建 change**：bootstrap 不创建 `changes/` 下的 change 目录，那是 workflow-orchestrator S4 的职责。
- **advisory 级**：所有 bootstrap 操作为 advisory 级，不阻断后续流程。
- **已有文档不覆盖**：如果目标文件已存在，合并而非覆盖。
- **不替代 architecture-design**：bootstrap 产出基线快照，不是完整的 4A+DDD 设计。

## Output Standard

每次交互结束时说明：
1. 已完成的阶段（B1-B5）
2. 已产出的制品（baseline.md / ARCHITECTURE.md / CONCEPTS.md / 目录结构）
3. 下一步建议（调用哪个 skill）

## Success Output

```
✓ 既有项目接入完成

侦察模式：Quick | Deep

产出：
- docs/architecture/baseline.md（项目基线画像）
- docs/architecture/ARCHITECTURE.md（架构锚点，如适用）
- docs/architecture/DATABASE.md（数据模型，如适用）
- CONCEPTS.md（领域词汇，N 个术语）
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
