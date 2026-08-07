---
name: workflow-bootstrap
description: 既有项目接入初始化器。在首次使用 team-flow 时执行一次性"侦察 + 基线建立"：代码库侦察 → 架构基线文档化 → 领域词汇提取 → 目录初始化 → 路径判断。完成后进入 workflow-orchestrator。不适用于：全新项目（无代码库，直接用 workflow-orchestrator）、已建立基线的项目（baseline.md 已存在）。
---

# Workflow Bootstrap（既有项目接入初始化器，v0.6 新增）

在首次使用 team-flow 时执行一次性"侦察 + 基线建立"，为既有项目建立架构基线、领域词汇和目录结构，然后进入正常产品级流程。

## 定位

```
workflow-bootstrap（一次性，手动触发）
  → B1 代码库侦察 → B1.5 conventions → B2 架构基线 → B3 领域词汇 → B4 目录初始化
  → B4.5 CLAUDE.md 初始化 → B5 路径判断
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
- 已在 team-flow change 内 → 用 `/workflow-start`
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

### B1: Codebase Reconnaissance（代码侦察，v0.15.0 重构：脚本 + 并行子代理）

> **硬原则**：主代理只编排（派发 + 汇总 + 写 baseline.md），侦察执行下沉子代理（§18.1 交接协议）。先跑确定性脚本固定化采集基底，再派子代理做语义增强——**可复现、可横展对比**。

- **模式**（询问用户）：Quick（默认，技术栈+模块+架构模式+测试文档，~2 分钟）/ Deep（+数据模型+API 表面，~10 分钟）。
- **B1.1 脚本采集**：`bash ${CLAUDE_PLUGIN_ROOT}/skills/workflow-bootstrap/scripts/recon-probe.sh --root <根> --out /tmp/recon-<slug>.json`（固定化，两次接入结果一致）。
- **B1.2 并行子代理**：读 `references/agents/codebase-recon-analyst.md`，把 JSON 路径作 `recon_json` 入参，按维度并行派发（§18.1 返回）。
- **B1.3 主代理汇总**：只汇总不重新侦察，整合已有文档（合并而非覆盖，标注来源），写 `docs/architecture/baseline.md`。**维度闭合校验（v0.41.0）**：汇总前核对已派发维度 vs 已返回 handoff（status 非未返回 + deliverable 非空），缺失维度在 baseline.md 顶部标记 INCOMPLETE（advisory 不阻断，Success Output 警告）。

详细流程（脚本采集项、子代理维度表、侦察内容树、已有文档处理）见 `references/b1-reconnaissance.md`。

### B1.5: Conventions Generator（测试规范生成，v0.34.0 新增）

> 来源：test-capability-enhancement-design v1.0 §四
> 目的：根据项目技术栈自动生成测试规范 conventions，符合 glaf4-test 要求

**触发条件**：B1 侦察完成后，检查 `.team-flow/conventions/` 是否存在

**存量项目路径**：
1. 读取 B1 侦察结果中的技术栈信息（从 baseline.md 提取）
2. 根据技术栈选择 conventions 模板
3. 复制到项目 `.team-flow/conventions/` 目录
4. 更新 `.team-flow/conventions/.versions.json`
5. 更新 `team-flow.config.json` 的 conventions 字段

**全新项目路径**（未检测到技术栈特征）：
1. 交互式引导用户选择技术栈
   - 编程语言：Java / JavaScript / Python
   - 构建工具：Maven / Gradle / npm / yarn / pip / poetry
   - 测试框架：JUnit 5 + Mockito / Jest / Pytest
   - 应用框架：Spring Boot / Express / Django / 无框架
2. 根据用户选择选择 conventions 模板
3. （可选）生成项目骨架（pom.xml / package.json / requirements.txt）
4. 生成 conventions 文件

**conventions 模板来源**：
- plugin 内置模板：`${CLAUDE_PLUGIN_ROOT}/templates/conventions/`
- 符合 glaf4-test 要求的模板：`${CLAUDE_PLUGIN_ROOT}/templates/conventions/glaf4-compliant/`

**产出**：
- `.team-flow/conventions/*.md` — 测试规范文件
- `.team-flow/conventions/.versions.json` — 版本信息
- `.team-flow/team-flow.config.json` — conventions 路径映射（更新）

**跳过条件**：
- `.team-flow/conventions/` 已存在 → 提示用户"conventions 已存在，是否更新？"
- 用户拒绝 → 跳过

### B2: Architecture Baseline（架构基线文档化）

**条件**：如果 B1 侦察发现项目有一定复杂度（≥5 个模块或 ≥10 个源文件），执行此阶段。否则跳过。

**B2 成果物导入（v0.23.0 新增，v0.24.0 模板初始化补强）**：

```
Step 0: 目录+模板初始化（v0.24.0 新增）
  ├── mkdir -p docs/architecture/
  ├── 从 ${CLAUDE_PLUGIN_ROOT}/skills/architecture-design/templates/ 复制模板：
  │     architecture.md → docs/architecture/ARCHITECTURE.md
  │     database.md     → docs/architecture/DATABASE.md
  │     physical-model.md → docs/architecture/PHYSICAL-MODEL.md
  │     api.md          → docs/architecture/API-INDEX.md
  │     index.md        → docs/architecture/INDEX.md
  └── 已存在的文件不覆盖（只补缺失）

Step 1: 询问用户是否有既有成果物
  ├── 有 SQL DDL 脚本 → 导入到 docs/architecture/schema-baseline.sql
  ├── 有物理模型文档 → 转换为 docs/architecture/PHYSICAL-MODEL.md（对齐标准格式）
  ├── 有 API 文档/Swagger 导出 → 提取端点生成 docs/architecture/API-INDEX.md
  └── 无既有成果物 → Step 2 兜底

Step 2: 确定性提取（兜底）
  ├── recon-probe.sh DDL 提取能力（v0.24.0 已实现：SQL 文件 / Java Entity / 占位）
  │   bash ${CLAUDE_PLUGIN_ROOT}/skills/workflow-bootstrap/scripts/recon-probe.sh --root <根> --ddl-out docs/architecture/schema-baseline.sql
  ├── 从 schema-baseline.sql 反向生成 PHYSICAL-MODEL.md
  └── 扫描 Controller/Router 类 → 生成 API-INDEX.md

优先级原则：用户既有成果物 > 确定性提取 > LLM 推断
```

产出：
- `docs/architecture/ARCHITECTURE.md` — 分层、模块边界、技术选型（瘦锚点格式）
- `docs/architecture/DATABASE.md` — 数据模型（如适用）
- `docs/architecture/PHYSICAL-MODEL.md` — 物理模型（v0.23.0 新增）
- `docs/architecture/schema-baseline.sql` — DDL 基线脚本（v0.23.0 新增）
- `docs/architecture/API-INDEX.md` — API 端点索引（v0.23.0 新增）
- `docs/architecture/INDEX.md` — 架构文档索引（v0.23.0 新增）
- `docs/architecture/<bc>/` — 每个有界上下文的目录（如能识别）

**轻量 vs 完整**：
- bootstrap 产出的是**基线快照**（As-Is 当前态），不是完整的 4A+DDD 设计
- 完整的架构演进：既有代码库的**逆向重建**走 workflow-orchestrator 的 ARCH 阶段（S3.5 reconstruction 模式，`arch-reverse-analyst`，v0.36.0）；全新架构设计走 ARCH 正向设计
- 如果用户需要完整架构设计，B2 结束后建议："基线已建立。如需完整架构设计（逆向重建或正向设计），请进入 workflow-orchestrator 的 ARCH 阶段"（v0.36.3 修正——原指引导向 change 级 skill 已过时）

**已有架构文档处理**：
- 如果 `docs/architecture/ARCHITECTURE.md` 已存在 → 读取并整合，不覆盖
- 如果项目有其他格式的架构文档 → 提取关键信息，整合进 team-flow 格式

### B3: Domain Vocabulary Bootstrap（领域词汇种子）

从代码命名中提取领域词汇，创建或更新 `docs/architecture/CONCEPTS.md`。

> **v0.23.0 变更**：`CONCEPTS.md` 已迁移至 `docs/architecture/CONCEPTS.md`（原根目录位置已弃用）。如根目录存在旧文件，应迁移至新路径。

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
- 如果 `docs/architecture/CONCEPTS.md` 已存在（由之前的 ce-compound 运行创建）→ **合并**而非覆盖
- 读取已有词汇，补充从代码中新发现的术语
- 标注来源："workflow-bootstrap B3 补充"

**与 ce-compound 的关系**：ce-compound 是"遇到问题后被动记录"，B3 是"主动从代码提取"——B3 建种子词汇表，ce-compound 后续持续补充。

### B4: Directory Initialization（目录初始化）

创建 team-flow 目录结构：`mkdir -p prd/ prototype/ docs/architecture/ docs/solutions/ changes/`。已有目录不覆盖不删除，只补缺失；目录中有文件保留不改。**Discoverability 检查**：若 `AGENTS.md`/`CLAUDE.md` 未暴露 `docs/architecture/` 和 `prototype/`，advisory 建议用户添加（不自动改）。

### B4.5: CLAUDE.md 初始化（v0.41.0 新增，参考 Claude Code /init）

将项目基本信息（参考 /init）和 team-flow 产物索引写入工作区 CLAUDE.md。维护原则：**索引级 + 结构级，简明扼要**——目标是每次开启会话对项目空间有全局认识，不长篇大论。

**触发条件**：CLAUDE.md 存在但不含 `## 产物结构` 章节（追加模式），或不存在（新建模式）。

**执行流程**：

1. 检查 CLAUDE.md 是否已存在
2. **不存在（新建模式）**：从 `templates/claude-md-team-flow.md` 复制模板，填入 B1 侦察结果：
   - 项目概况（语言/框架/构建工具/数据库，2-3 行）← B1 technology 维度
   - 开发命令（构建/测试/lint，只列非标准的）← B1 侦察 + README
   - 工作区结构（简化目录树 ≤3 层）← B1 directory_tree
   - Git 仓库结构（子仓库清单 + 类型 + 用途）← B1 git-structure 维度
   - 产物结构（索引级：产物表 + 路径，详细内容引用 baseline.md）← 标准化模板
   - Git 管理规则（提交/推送顺序约束 + 子仓库操作规则）← 标准化框架
3. **已存在（追加模式）**：检查是否含 `## 产物结构` 章节
   - 含 → 跳过（不覆盖用户已有内容）
   - 不含 → 追加产物结构索引章节；**仅当缺 `## Git 管理规则` 时**一并追加，避免重复章节
4. 若模板有占位符未填（如侦察缺失的维度），保留 `{{PLACEHOLDER}}` 并提示用户补充

**不做的事**：不写 SOP 流程（由 skill 负责）、不写变更级状态机（由 workflow skill 负责）、不列可自动发现的文件清单。

### B5: Path Decision（路径判断，v0.42.0 重构：降级路径设计）

询问用户。**分组展示**——用户先决定"要不要把地基打牢"（第一组），再决定"打完地基做什么"（第二组）：

> **第一组：确保 bootstrap 产物可信**
> - A) 逆向重建完整架构（**复杂项目强推 / 简单项目弱推**；→ 进入 workflow-orchestrator ARCH 阶段 reconstruction 模式，arch-reverse-analyst，重建 PASS 后 `tf arch init --mode reconstruction --baseline-ref prd/vN/` 打戳，全量命令见 b5-path-decision.md）
> - B) 交叉验证与对齐 bootstrap 产物（→ 主代理机械比对，产出 `docs/architecture/cross-check-report.md` 疑点清单）
> - C) 真实性核对（→ 针对 B 疑点清单（跟随 B）或 baseline.md 语义结论抽查（独立），用户逐条确认，修正 baseline.md）
>
> **第二组：直接进入 team-flow 流程**
> - D) 我有一个具体的功能需求（→ 进入 workflow-orchestrator S1，S3 后进 ARCH 产品级架构设计）
> - E) 我有一个模糊的产品方向（→ ce-brainstorm）
> - F) 我只是想建立架构基线，暂不开发新需求（→ 结束）

**A 分级推荐判据**（基于 B1 侦察结果）：
- 复杂项目（≥5 模块 或 ≥10 源文件，复用 B2 触发判据）→ 提示"建议优先重建完整架构"
- 简单项目（<5 模块 且 <10 源文件）→ 提示"项目较简单，可直接进入流程，重建为可选项"

**B/C 串联闭环**：选 B → 主代理产出疑点清单 → 提示是否进入 C（是 → 逐条 AskUserQuestion 核对并修正 baseline.md；否 → 疑点留档标记 deferred，不阻断）。

**逆向重建衔接（v0.36.3）**：ARCH 阶段 reconstruction 模式复用本 bootstrap 的 recon-probe.sh（--ddl-out）+ codebase-recon-analyst，并派发 `arch-reverse-analyst` 补 BC/状态/指令事件维度（见 `references/agents/arch-reverse-analyst.md`）。

**上下文传递**：
- 将 `docs/architecture/baseline.md` 和 `docs/architecture/CONCEPTS.md` 的路径传递给 workflow-orchestrator S1
- 作为后续流程的架构上下文

详细流程（分组展示模板、A 复杂度判据来源、B 7 类比对清单 + report 格式、C 核对协议）见 `references/b5-path-decision.md`。

## Guardrails

- **一次性**：bootstrap 只在首次接入时执行。如果 `docs/architecture/baseline.md` 已存在，提示用户"基线已建立，是否要重新侦察？"
- **不修改代码**：bootstrap 只读取代码、产出文档，不修改任何源代码。
- **不创建 change**：bootstrap 不创建 `changes/` 下的 change 目录，那是 workflow-orchestrator S4 的职责。
- **advisory 级**：所有 bootstrap 操作为 advisory 级，不阻断后续流程。
- **已有文档不覆盖**：如果目标文件已存在，合并而非覆盖。
- **不替代 architecture-design**：bootstrap 产出基线快照，不是完整的 4A+DDD 设计。

## Output Standard

每次交互结束时说明：
1. 已完成的阶段（B1-B1.5-B2-B3-B4-B4.5-B5）
2. 已产出的制品（baseline.md / conventions / ARCHITECTURE.md / PHYSICAL-MODEL.md / schema-baseline.sql / API-INDEX.md / INDEX.md / CONCEPTS.md / CLAUDE.md / cross-check-report.md（如执行 B）/ 目录结构）
3. 下一步建议（调用哪个 skill）

## Success Output

接入结束时输出：侦察模式、产出清单（baseline.md / conventions / ARCHITECTURE.md / DATABASE.md / PHYSICAL-MODEL.md / schema-baseline.sql / API-INDEX.md / INDEX.md / docs/architecture/CONCEPTS.md / CLAUDE.md / cross-check-report.md（如执行 B）/ 目录结构）、关键发现（技术栈/模块数/架构模式/测试覆盖）、下一步建议。完整模板见 `references/b1-reconnaissance.md`「Success Output 模板」。
