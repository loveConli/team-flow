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
- **B1.1 脚本采集**：`bash scripts/recon-probe.sh --root <根> --out /tmp/recon-<slug>.json`（固定化，两次接入结果一致）。
- **B1.2 并行子代理**：读 `references/agents/codebase-recon-analyst.md`，把 JSON 路径作 `recon_json` 入参，按维度并行派发（§18.1 返回）。
- **B1.3 主代理汇总**：只汇总不重新侦察，整合已有文档（合并而非覆盖，标注来源），写 `docs/architecture/baseline.md`。

详细流程（脚本采集项、子代理维度表、侦察内容树、已有文档处理）见 `references/b1-reconnaissance.md`。

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

**与 ce-compound 的关系**：ce-compound 是"遇到问题后被动记录"，B3 是"主动从代码提取"——B3 建种子词汇表，ce-compound 后续持续补充。

### B4: Directory Initialization（目录初始化）

创建 team-flow 目录结构：`mkdir -p prd/ prototype/ docs/architecture/ docs/solutions/ changes/`。已有目录不覆盖不删除，只补缺失；目录中有文件保留不改。**Discoverability 检查**：若 `AGENTS.md`/`CLAUDE.md` 未暴露 `docs/architecture/` 和 `prototype/`，advisory 建议用户添加（不自动改）。

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

接入结束时输出：侦察模式、产出清单（baseline.md / ARCHITECTURE.md / DATABASE.md / CONCEPTS.md / 目录结构）、关键发现（技术栈/模块数/架构模式/测试覆盖）、下一步建议。完整模板见 `references/b1-reconnaissance.md`「Success Output 模板」。
