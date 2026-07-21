# 架构 / API / DB 设计增强方案 · v0.3（全量修订版 + 原型设计能力）

> 版本：v0.3 · 全量修订 + 原型设计能力
> 底座：**architecture-design skill**（book-to-skill 蒸馏自 LT 知识库 4A/DDD 培训材料，含 F1–F8 框架）
> 修订依据：v0.2 四方专家会审意见全部吸收；v0.3 新增「第十五章 原型设计能力」（第 13–16 轮调研沉淀）——五方案对比结论 + 本地 HTML 原型 skill（零外部依赖）+ 配置驱动（插件通用 + 项目 config 注入）+ 两层产物层级模型（全局 PRD 有版本 / 原型·代码各一份 git 分支隔离 / 变更层一份 PRD 拆多 change）+ 完整原型目录维护 + 衔接架构/API/开发 + 复利回写设计系统 + I/O 钉死三处未定义。
> 相较 v0.2 的关键修正：① 设计目标补原型条目；② 第三节闭环图补全局原型层与 change 引用全局原型；③ 第四节产物结构补全局层（prd/、prototype/、design-system.md）；④ 第七节复利回写补设计系统复利；⑤ 第十节原型合规改为全局原型机制（不复用 spec-superflow per-change handoff overlay 作主机制）；⑥ 第十一章补 prototype-sync 脚本；⑦ 第十二章补 prototype skill 资产；⑧ 第十四章补原型 skill 落地；⑨ 新增第十五章原型设计能力；⑩ 决策落实状态补原型决策（原十五→十六）。

---

## 一、设计目标（用户原话落地）
1. 架构设计：每需求做"增强"——对**当前现状 + 需求对应架构变更**做设计；**复利环节回写全局架构设计**。
2. DB 设计：与架构**同样模式**（每变更增量 + 复利回写全局）。
3. API 设计：主要在**每变更需求内**设计（不进全局层）。
4. 架构方法：**DDD**（领域驱动设计）。
5. 借鉴 compound-engineering（复利工程）可补充本块的好经验。
6. **原型设计（v0.3 新增）**：全局一份、与 PRD 同级、随 PRD 版本 git 分支演进；change 引用全局原型作 UI 契约；change 完成增量回写全局原型/架构/API；设计系统由项目 config 注入、复利回写（详见第十五章）。

## 二、方法论底座（architecture-design skill）
- **F1 4A 分叉依赖**：`BA→(IA∥AA)→TA`，BA 先行、IA/AA 并行双向对齐、TA 最后。
- **F2 跨域一致性**：AA 功能≥1 IA 实体支撑，IA 实体≥1 AA 功能消费；结构+语义双对齐（发布门禁）。
- **F3 变更分叉级联**：直接/间接/隐式三层次必覆盖。
- **F4 DDD 聚合四要素**：实体+值对象+聚合根+事务边界；仅业务服务有聚合。
- **F5 限界上下文/Context Map**：语义边界=L3 应用服务；映射 Shared Kernel/ACL/OHS。
- **F6 CQRS 写读模型**：事务型→写模型，分析型→读模型；Command/Read→写模型，Query 经阻断测试分流。
- **F7 三维判定**：失忆(归属)+阻断(类型)+孤岛(层级)。
- **F8 增量设计+复利回写闭环**：As-Is 冻结+版本锚点 → To-Be → 全局锚点复利。

## 三、总体闭环（SOP 步骤）
```
模糊需求
 └─[ce-brainstorm→ce-plan 就地 enrich]→ prd/vN（PRD 有版本，requirements-only → implementation-ready）
       │  注：演进是 ce-brainstorm→ce-plan 的"就地 enrich"，PRD 完备态在 enrich 之后
       │       PRD 升版→新 git 分支；原型/代码各一份，git 分支隔离版本
       ▼
全局 prototype/（一份，与 PRD 同级，UI 契约真相源）◀── 增量回写 ──┐
       │                                                       │
spec-superflow change（一份 PRD 可拆多 change）：               │
  exploring→specifying→bridging→approved-for-build→executing→closing
  每变更 specs/<cap>/ 内：
   ①(LLM) 读全局 ARCHITECTURE.md grounding → 活动对象矩阵识别聚合/上下文
   ②(LLM) To-Be: 聚合+Context Map+CQRS+4A 跨域对齐
   ③【As-Is 冻结】复制全局相关章节当前原文 + 版本锚点(ARCHITECTURE.md@<change_id>#<章节>)，变更内不可变
   ④(脚本) 填 frontmatter + advisory 校验
   ⑤(LLM) 写 ADR；api.md 标 Command/Read/Query + 阻断测试归属
   ⑥(LLM) 引用全局 prototype/ 作 UI 契约 → 写 execution-contract.md
   ⑦(脚本) 回写全局 architecture.md/database.md/api.md + 原型 UX 增量 → prototype/
       ▼
[复利环节 · 独立 arch-compound skill/overlay，不进状态机硬矩阵]
   把每变更 architecture.md/database.md 的 delta 合并进 docs/architecture/ARCHITECTURE.md + DATABASE.md
   把每变更 prototype/ UX 增量 + design-system.md 迭代合并回全局 prototype/ + design-system.md
       ▼
全局作为下一 change 的 grounding → 闭环
```
**原型合规路径（v0.3 修正）**：原型是**全局产物**（与 PRD 同级、一份、git 分支隔离），由「本地 HTML 原型 skill」产出维护进 `prototype/`；spec-superflow 的 `handoff --type prototype` 仅作可选可行性草图旁路，**不复用**其 per-change overlay 作为主机制（详见第十五章 §15.1–§15.3）。原型的 UX 增量经 change 完成后增量回写全局 `prototype/` 与 `design-system.md`，并流入 `execution-contract.md` 驱动开发；design.md 保持不可变。

## 四、产物结构（全量）
```
项目根/
├── prd/                    # 【全局层，与 prototype 同级】PRD，有版本 v1→v2→v3（git 分支隔离）
│   └── vN/prd.md
├── prototype/              # 【全局层，一份，git 分支隔离】原型系统（见第十五章 §15.3）
│   ├── index.html          # 入口 / 全局导航
│   ├── pages/              # 多页面（首页/列表/详情/设置…）
│   ├── components/         # 可复用组件（统一设计系统）
│   ├── assets/             # style.js / design-tokens.css
│   ├── design-system.md    # 本项目设计系统（项目 config 注入，9 段 schema）
│   └── flow.md             # 页面跳转 / 用户流
├── STRATEGY.md              # 产品/BA 锚点（compound，不动）
├── CONCEPTS.md              # 领域词汇（追加 DDD 术语，复利累积）
├── AGENTS.md                # 追加一节暴露 docs/architecture/ 与 prototype/（Discoverability）
├── docs/architecture/       # 【技术锚点层，独立于 STRATEGY.md，起步即按 bounded context 分目录】
│   ├── ARCHITECTURE.md      # 瘦锚点总览：Context Map + 各 bc 链接 + 关键决策（覆盖式当前态）
│   ├── DATABASE.md          # 全局 DB 总览（实体+读写模型+OLTP/OLAP，覆盖式）
│   ├── <bc>/                # 每个限界上下文一目录（天然扩展点）
│   │   ├── context.md       # 该 bc 的聚合/实体/服务/读写模型/事务边界
│   │   └── evolution.md     # 该 bc 演进日志（append-only，含 change_id+来源）
│   └── API-INDEX.md         # 脚本生成（扫描所有 specs/*/api.md），非手写
├── specs/<cap>/             # 【变更层，一份 PRD 可拆多 change】
│   ├── spec.md / design.md / tasks.md / execution-contract.md   # spec-superflow 原产物
│   ├── architecture.md      # 【每变更 DDD 增量】
│   ├── database.md          # 【每变更 DB 增量】
│   └── api.md               # 【每变更 API 设计】
```
> **两层归属说明**：`prd/` 与 `prototype/` 在**全局层**（产品级，与 PRD 同级），各一份，版本演进靠 git 分支/标签隔离；`specs/<cap>/` 在**变更层**，一份 PRD（某版本）可拆多个 change，change 是 spec-superflow 实施单位，引用全局 `prototype/` 作 UI 契约。

## 五、每变更增量模板
### 5.1 architecture.md
```yaml
---
cap_id: <cap>
date: YYYY-MM-DD
change_type: new | modify
bounded_contexts: [<上下文>]
aggregates_affected: [<聚合>]
cqrs: [write:<x>, read_model:<y>]   # 注：read_model 承载 Read 指令与 Query
tags: [ddd, <领域>]
---
```
- **## 现状快照(As-Is，冻结基线)**：复制 `docs/architecture/ARCHITECTURE.md` 相关章节**当前原文**，记录来源锚点 `ARCHITECTURE.md@<change_id>#<章节>`。**本变更内不可变**，不得用"见全局第 X 节"活引用。
- **## 本次架构变更(To-Be)**：新增/调整限界上下文与 Context Map 关系；聚合(实体+值对象+聚合根+事务边界)；CQRS 写读模型；4A 跨域对齐(IA/AA/TA，结构+语义双对齐)。
- **## 架构决策(ADR)**：决策与理由（复用 design.md 的 ADR 风格）。
- **硬规则**：聚合仅存业务服务（数据/技术服务无聚合）；Query 经阻断测试分流。

### 5.2 database.md
```yaml
---
cap_id: <cap>
date: YYYY-MM-DD
change_type: new | modify
entities_affected: [<实体>]
cqrs: [write:<x>, read_model:<y>]
oltp_olap: [oltp:<t>, olap:<a>]
tags: [db, <领域>]
---
```
- **现状快照(As-Is，冻结)**：同上机制。
- **本次 DB 变更(To-Be)**：实体+生命周期；聚合对应表/事务边界；写模型(OLTP) vs 读模型(OLAP，派生自写模型)。
- **迁移策略**：前向兼容/双写/回填。

### 5.3 api.md（仅每变更）
- **API 清单**：端点/方法/职责。
- **指令映射(L6)**：每端点标 Command/Read/Query；Query 标阻断测试归属(业务/数据服务)。
- **契约**：请求/响应 schema、错误码、幂等。
- 下游脚本扫所有 api.md 生成 `API-INDEX.md`（消除跨 change 一致性留债，近零成本）。
- **硬消费钉死（v0.3）**：api.md 经 `execution-contract.md` 被 build-executor **硬消费**（TDD 实现），不得仅作参考；跨 change 一致性由 `API-INDEX.md` 脚本兜底。

## 六、全局架构/DB 文档（分目录 + 瘦锚点 + 双视图）
- **总览层（覆盖式当前态）**：`docs/architecture/ARCHITECTURE.md` 瘦锚点总览 = Context Map（各 bc 链接）+ 关键决策；`DATABASE.md` = 全局 DB 总览（实体+读写模型+OLTP/OLAP）。
- **每上下文层（分目录，起步即建）**：`docs/architecture/<bc>/context.md` 承载该 bc 的聚合/实体/服务/读写模型/事务边界（元素+制品层）；`docs/architecture/<bc>/evolution.md` 承载该 bc 演进日志（append-only，含 change_id+来源）。
- **三层内容（来自 F 产出三层）**：
  - 元素层：BA 活动 / IA 数据实体 / AA 功能与聚合 / TA 技术服务（四域一等元素，命名注册表防漂移）。
  - 制品层：Context Map、业务流程图(功能→聚合映射)、CQRS 读写模型。
  - 交付件层：架构评审文档（**生成视图**，非手写巨著）。
- **双视图（防多版本矛盾）**：总览 `ARCHITECTURE.md` 当前态覆盖式更新；各 `<bc>/evolution.md` append-only 保留历史。

### 6.1 技术锚点定性的设计影响与高质量可拓展保障（决策 3）
用户确认：技术架构(IA/AA/TA)独立于产品策略(BA/STRATEGY.md)，ARCHITECTURE.md 作为"瘦锚点"而非评审巨著。这一定性对后续设计的**具体约束与保障**如下：
- **两份独立文档、互相链接不混写**：STRATEGY.md 答"做什么/为什么"(BA)，ARCHITECTURE.md 答"怎么建"(IA/AA/TA)；改业务不重写技术，改技术不污染策略。这是 compound "Anchor not plan" 延伸到技术域。
- **分目录 = 天然扩展点（决策 1 落地）**：每新增限界上下文 = 新增 `docs/architecture/<bc>/` 目录，不膨胀单文件，检索粒度与一致性检查随规模线性可控 → 高质量可拓展的结构前提。
- **命名注册表防语义漂移**：元素层标准化命名（用户/客户/consumer 不并存）是跨上下文可拓展的术语基础；新增 bc 时强制对照注册表，避免概念分裂。
- **双视图保证当前真相清晰**：总览覆盖式当前态 + 各 bc 演进日志 append-only，任何时刻能确定"现在是什么"与"怎么来的"，扩展时不丢失历史。
- **跨域一致性门禁保障扩展质量**：每次回写跑 AA≥1 IA 实体（结构+语义双对齐），新 bc 接入不破坏既有对齐 → 可拓展不以一致性妥协为代价。
- **瘦锚点保障可持续**：避免评审交付巨著，单人也能维护，使架构资产随项目长期复利而非一次性文档。

## 七、复利回写机制（借 ce-compound，已正名）
1. **结构化 frontmatter（原则借鉴）**：架构专用 schema（cap_id/date/change_type/bounded_contexts/aggregates/cqrs），非直接复用 schema.yaml（那是 learnings 专用）。
2. **one change per run**：一次回写一个变更 delta（变更可追溯、不混杂多变更）。
3. **双视图回写**：当前态覆盖 + 演进日志追加。
4. **架构一致性/漂移检查（独立机制，非 Discoverability）**：①结构冲突（重复 BC/聚合 key）②语义冲突（同义异名，如客户vs用户，按命名注册表）③跨域一致性门禁（AA≥1 IA 实体，反之亦然）。
5. **Discoverability 正名（compound 原义）**：在 AGENTS.md/CLAUDE.md 暴露 `docs/architecture/` 与 `prototype/`（存在/结构/何时检索），使代理设计前"发现并查阅"；仅在未暴露时追加一节。
6. **下游检索复用**：下一 change 设计前从 `docs/architecture/` 检索相关上下文/聚合，grounding 用 CONCEPTS.md（已含 DDD 术语）。
7. **设计系统复利（v0.3 新增）**：change 完成回写的 UX 增量若涉及设计系统迭代（新组件/新 token/新 anti-pattern），合并进全局 `prototype/design-system.md`，作为项目级风格唯一真相源复利累积；design-system.md 是项目资产（config 注入），回写发生在项目内，不污染插件通用性。

## 八、全局文档组织（已定：起步即分目录）
用户决策：**起步即按 bounded context 分目录** `docs/architecture/<bc>/`（非单文件分节）。这是 compound `problem_type→directory` 的真类比，也是高质量可拓展基础——每新增限界上下文=新增目录，不膨胀单文件，检索粒度与一致性检查随规模线性可控。结构见第四节与第六节。

## 九、compound-engineering 经验借鉴（修正后清单）
| # | 经验 | 本方案映射（修正） |
|---|---|---|
| 1 | 全局锚点（STRATEGY.md, Anchor not plan） | → `docs/architecture/` 作**技术架构单一事实源**；业务策略(BA/STRATEGY.md)与技术架构(IA/AA/TA)是两份独立文档、互相链接不混写——填补 compound 无技术架构产物的缺位（非"修正其错误"）；ARCHITECTURE.md 是**瘦锚点**(短稳 what&why)，非评审交付巨著 |
| 2 | 结构化复利回写 | → 架构专用 frontmatter + 双视图回写（原则借鉴，非套用 schema.yaml） |
| 3 | requirements-only→implementation-ready | → **ce-brainstorm→ce-plan 就地 enrich** 演进（PRD 完备态在 enrich 后） |
| 4 | one learning per run + 并行 | → 一次一变更 delta 回写 |
| 5 | pulse 大环 | → （增强项）架构健康度脉冲，后续 |

## 十、与 spec-superflow 集成（软集成，保全零依赖）
- **状态机**：8 态不变；三份增量文档为**推荐产出、软提示、非阻断**（复用 `config.artifacts.skip`，不改 core guard）。
- **guard 扩展**：frontmatter 校验降级为**独立 advisory 脚本**（正则提取 key，warning 级，**不引第三方 YAML 依赖**）；全局回写经独立 `arch-compound` skill/overlay，**不进状态机硬矩阵**。
- **原型机制（v0.3 修正）**：原型为**全局产物**，由「本地 HTML 原型 skill」产出维护进 `prototype/`，**不复用** spec-superflow `handoff --type prototype` 的 per-change overlay 作为主机制（其仅作可选可行性草图旁路）；design.md 保持不可变，原型 UX 增量经 change 增量回写全局 `prototype/` 与 `design-system.md`，并流入 `execution-contract.md` 驱动开发。
- **术语正名**：IA/AA 非"技术架构"（仅 TA 是）；4A 是四域非三层；全局回写≠spec-merger（后者只合并 delta spec 进 main spec base，触发于 closing）。

## 十一、SOP 化（LLM 块 + 明确脚本）
- **LLM 负责（人守深度思考）**：限界上下文/聚合识别、Context Map 关系选型、4A 跨域对齐推理、CQRS 划分、API 指令映射、ADR 理由、架构一致性语义判定、**原型 UX 流向全局 prototype/ 与 design-system.md 的决策**。
- **明确脚本（零/低 LLM）**：
  - `validate-frontmatter`：校验三份增量 frontmatter 字段完整性（advisory）。
  - `arch-merge`：delta 以 append + 版本锚点合入全局，one change per run。
  - `discovery-check`：扫描重复/冲突 BC/聚合（机械查重；语义冲突归 LLM）。
  - `api-index-gen`：扫描所有 `specs/*/api.md` 生成 `API-INDEX.md`。
  - `asis-extract`：按版本锚点从全局抽取相关章节填入增量 As-Is（防漂移）。
  - `prototype-sync`（v0.3 新增）：change 完成 → 其 UX 增量 + design-system 迭代回写全局 `prototype/` 与 `design-system.md`（one change per run，与 `arch-merge` 同级；不引第三方依赖）。
  - **回写顺序（closing 期，评审修正 B）**：`arch-merge` → `prototype-sync` **顺序提交**（同一 change closing 内），避免全局 `docs/architecture/` 与 `prototype/` 半更新态被下一 change grounding。

## 十二、第二大脑整合（ima「LT的知识库」）
- **方法层(kb)**：存 `architecture-design` skill + `prototype` skill + 每限界上下文一个 `architecture-anchor` 资产（frontmatter: tags/bounded_contexts/aggregates 作索引键）。
- **项目层(repo)**：`docs/architecture/` 为权威源；`prototype/` 为 UI 契约权威源。设计前检索 kb skill + 读全局 ARCHITECTURE.md 与全局 prototype/ 作 grounding；回写后**批量**同步 Context Map 索引入 kb（避免每 delta 双写）。
- **人机协同闸点**：每变更设计末尾设 human gate——ADR 批准 + Context Map 关系确认 + 原型 UX 评审（LLM 出 draft，人守深度思考）。

---

## 十三、四方专家会审结论摘要（已吸收，v0.2）
- **共识**：方向正确、需修改、主体可落地；全量吸收下列硬伤。
- **DDD/4A 专家**：As-Is 漂移(R1/R2)、IA/AA 误称技术架构(R3)、4A 误称三层(R4)、Discoverability 仅查重名(R5)、聚合仅业务服务/Query 阻断测试/Read 与读模型术语消歧、元素层补 BA 活动与 AA 功能。
- **spec-superflow 专家**：原型直接改 design.md 违规（须 handoff→delta）、guard YAML 校验破零依赖（降级 advisory）、全局回写硬 gate 扭曲同步闭包（改 overlay）、design.md 已是架构一等公民（职责需划清）。
- **compound 专家**：Discoverability 误读（正名为 AGENTS.md 暴露）、problem_type→directory 未实例化（改分目录）、"技术架构折叠进 STRATEGY"误述（实为缺位）、Anchor not plan 应延伸到技术锚点、ARCHITECTURE.md 瘦锚点非评审巨著。
- **知识管理专家**：草稿是设计稿非可执行 SOP（已补第十一章）、一人创业成本（已补 MVP 章节）、第二大脑整合（已补第十二章）、API 留债（已补脚本化索引）、As-Is 版本锚点（已补第五章）。

---

## 十四、落地路线（用户决策：初期即全量铺开）
> 用户决策：**不缓步 MVP，初期即按全量蓝图落地**（决策 2）。以下 MVP-0..4 作为**全量骨架的内部结构分期参考**——骨架一次性建好、后续持续复利，而非"先验证再补"。

**全量骨架一次性建立（初期即启用）**：
- `architecture-design` skill 已蒸馏（底座）。
- `prototype` skill（v0.3 新增，待定稿后并入统一插件）：本地 HTML 原型内核（零外部依赖）+ 配置驱动读取项目 design-system.md。
- `docs/architecture/` **分目录**建好（ARCHITECTURE.md 总览 + DATABASE.md + 每个已知 bc 的 `<bc>/context.md`+`<bc>/evolution.md`）。
- `specs/<cap>/` 三份增量（architecture/database/api）全量启用。
- 全局 `prd/`（v1 基线）+ 全局 `prototype/`（随 PRD v1 初始化，含 design-system.md 由项目 config 注入）建好。
- 4+1 脚本落地：`validate-frontmatter` / `arch-merge` / `discovery-check` / `api-index-gen`（+ `asis-extract`）+ `prototype-sync`（v0.3）。
- `AGENTS.md` 暴露 `docs/architecture/` 与 `prototype/`（Discoverability）。

**分期参考（能力启用节奏，非强制缓步）**：
- MVP-0 方法论+脚本底座 → 已随全量一并建立。
- MVP-1 架构单轨 / MVP-2 加 DB / MVP-3 加 API 索引 → 全量初期即启用，非按需后加。
- MVP-4 硬化 → `discovery-check` 语义规则随语料增长持续硬化（分目录已就绪，无需后期重构）。

---

## 十五、原型设计能力（新增，第 13–16 轮调研）

> 本章为 v0.3 新增原型章，回应 LT 第 12 轮（I/O 钉死 + 原型闭环）、第 13–14 轮（设计系统方案调研 + 迭代/维护/衔接）、第 15 轮（配置驱动 + 完整原型）、第 16 轮（全局层 vs 变更层产物层级）。调研原文见 `prototype-design-research.md`。

### 15.0 五方案对比结论（调研事实）
| 方案 | 形态 | 对"纯 CLI 插件"可用性 | 结论 |
|---|---|---|---|
| Claude Design（Anthropic, 2026-04 beta） | 对话生成设计/交互原型/幻灯片；组织设计系统自动继承 | 强依赖 web/desktop 画布，无纯 CLI；唯一非 GUI 通道是 MCP（底层仍依赖 api.anthropic.com） | **不适合内嵌** |
| Open Design（nexu-io, Apache-2.0） | 本地优先开源替代；71 品牌级 DESIGN.md + 5 方向调色板 | 需本地 daemon + Vite React 前端 + 浏览器预览，非纯 CLI | **不内嵌；但其 DESIGN.md 概念值得借鉴** |
| Trae Work Design（字节） | 生成/迭代界面设计，导出 Figma/HTML/ZIP | 强依赖 GUI 画布/可视化编辑器 | **不适合内嵌** |
| spec-superflow handoff --type prototype | 验证变更设计可行性的 overlay | 纯 CLI 但仅草图，无设计系统、无闭环、非主流 | **仅作可选草图旁路** |
| **本地 HTML 原型 skill（本方案）** | 自包含 HTML 原型系统 + 内嵌 Tweaks + 项目设计系统板 | 纯 CLI 产出、零外部依赖、可离线 | **最优** |

- **结论**：对"无应用、纯 CLI 插件"，最优原型 = **本地 HTML 原型 skill（零外部依赖）+ 借鉴 Open Design 的 DESIGN.md 概念**（内化，非调用产品）。
- **硬约束**：不安装/不调用任何 GUI 设计软件（Claude Design / Open Design / Trae 均不安装）。spec-superflow 的 `handoff --type prototype` 仅作可选可行性草图旁路，**不复用**其 per-change overlay 作为主机制。

### 15.1 两层产物层级模型（全局层 vs 变更层，第 16 轮确认）
必须先厘清 PRD / 原型 / 代码 / change 的层级关系，否则原型归属会错（此前误把原型放 change 维度）。

**全局层（产品级，与 PRD 同级）：**
- `prd/`：PRD，**有版本迭代** v1→v2→v3…，每个版本是完整需求基线。
- `prototype/`：原型，**全局一份**，与 PRD 同级；随 PRD 版本演进，物理一份，git 分支隔离版本。
- `design-system.md`：全局一份，config 注入。
- `architecture.md`（即 `docs/architecture/`）：全局架构，复利回写目标。
- `api.md`（即 `docs/architecture/API-INDEX.md` 聚合）：全局 API 索引，复利回写目标。
- `src/`：代码，全局一份，git 分支隔离。

**变更层（spec-superflow change，从 PRD 拆解）：**
- `specs/<cap>/`：spec.md / design.md / tasks.md / execution-contract.md / architecture.md / database.md / api.md。
- 每个 change 走 spec-superflow 8 状态机。
- **一份 PRD（某版本）可拆出多个 change**；change 是实施工作单位，不是产品基线。

**关系链：**
```
PRD(vN) ──拆解──┬─▶ change-1 ─▶ spec-superflow（exploring→…→closing）
                ├─▶ change-2 ─▶ spec-superflow
                └─▶ change-3 ─▶ spec-superflow
全局 prototype/ ──（UI 契约参考）──▶ 各 change 的 build-executor
各 change 完成 ──（增量合并）──▶ 全局 architecture.md / api.md / prototype / src
```
**核心准则**：原型不是 per-change 的 overlay，而是全局一份、与 PRD 同级；版本演进靠 git 分支，不靠 change 内 v1/v2 目录。

### 15.2 原型迭代模型（全局一份，随 PRD 版本 git 分支演进）
- 原型是**全局产物**（与 PRD 同级），**物理一份**，不是某个 change 的子目录。
- **版本演进靠 git 分支**：PRD 升版（v1→v2）时，原型在对应分支上演进到该版本形态（如 `prd-v2` 分支上的 `prototype/` = v2 产品原型）；一份代码/原型，git 隔离版本。
- **PRD 有版本，原型/代码无多份**：PRD 持续迭代产生 v1/v2/v3 需求基线；原型与代码各自只有"当前形态一份"，历史版本由 git 分支/标签保留。
- **change 引用全局原型**：每个 change 实施时，把全局 `prototype/` 作为 UI 契约参考（进 execution-contract.md）；change 不直接拥有原型文件。
- change 完成 → 其 UX 增量合并回全局 `prototype/` 与 `architecture.md`/`api.md`（compound 复利回写，见 §15.8）。

### 15.3 产物维护（完整原型系统，全局一份）
原型目录位于**全局层**（与 PRD 同级），是完整原型系统，不是单页、不是 change 子目录：
```
prototype/                      # 全局，一份，git 分支隔离版本
├── index.html                  # 入口 / 全局导航
├── pages/                      # 多页面（首页 / 列表 / 详情 / 设置 …）
├── components/                 # 可复用组件（按钮 / 表单 / 卡片 …），统一设计系统
├── assets/                     # 共享 style.js / design-tokens.css
├── design-system.md            # 本项目设计系统（config 注入，9 段 schema）
└── flow.md                     # 页面跳转 / 用户流说明
```
- 版本管理：**git 分支 / 标签**隔离 PRD 版本（非 change 内 v1/v2 目录）。
- 复利回写：change 完成 → 原型结论 + 设计系统迭代回写**全局** `design-system.md` / `architecture.md` / `api.md`；design-system 是项目资产（config 注入），回写发生在项目内。
- 全局 `design-system.md` 作本项目风格唯一真相源，随 PRD 版本演进复利，防漂移。
- **原型膨胀防控（评审修正 C）**：`components/` 必须复用 `design-system.md` 定义的组件，**禁止页面内联样式漂移**；新增组件先沉淀进 design-system 再引用。
- **分支约定（评审修正 C）**：原型随 **PRD 当前版本分支**维护（如 `prd-v2` 分支的 `prototype/` = v2 产品原型）；change 引用其所在 PRD 版本分支的 `prototype/`，避免原型领先/落后于未合并代码分支。

### 15.4 配置驱动（插件通用 + 项目注入）
- **插件通用**：原型 skill 不固化任何公司/产品风格；PRD 模板与设计系统由项目级配置注入。
- **项目注入点**：基于 spec-superflow 真实的 `spec-superflow.config.json`（已 config-aware，支持 `artifacts.order`/`artifacts.skip`，由 `ssf runtime config --get <key>` 读取）。扩展注入：
  - `prd.template`：项目独特 PRD 模板路径（覆盖默认 `templates/prd.md`）。
  - `prototype.designSystem`：项目 `design-system.md` 路径（9 段 schema：color/typography/spacing/layout/components/motion/voice/brand/anti-patterns）+ 5 方向确定性调色板。
  - `prototype.entry`：原型入口（默认 `prototype/index.html`）。
- 模板走 `ssf runtime asset read templates/<name>.md`，项目可覆盖；插件保持零风格依赖、可离线。
- **⚠️ 配置字段边界（评审修正 A）**：`prd.template` / `prototype.designSystem` / `prototype.entry` 为**插件层扩展字段，非 spec-superflow 原生 schema**（原生仅证实 `artifacts.order`/`artifacts.skip`）。插件层用 `ssf runtime config --get <key>` 自读，字段命名须避开原生 key 冲突。建插件时需实测 `ssf runtime config --get prototype.designSystem` 验证读取路径可用。

### 15.5 本地 HTML 原型 skill（零外部依赖内核）
- **内核形态**：自包含 HTML 原型系统（CSS 进 `<style>`、JS 进 `<script>`，页面内 `<div>` Tweaks 控件替代云端工具栏），**avoid remote dependencies，可完全离线、零网站依赖**。
- **设计系统渲染**：原型 skill 读取项目 `design-system.md` 渲染 token（颜色/字体/间距/组件），保证风格与品牌一致。
- **产出**：`prototype/` 完整系统（多页面 + 组件 + 导航 + flow.md），纯 CLI 产出，不依赖任何 GUI 设计产品。
- **不内嵌** Claude Design / Trae / Open Design 的 GUI，只借鉴其"设计系统驱动风格"思想，内核自研为 skill。

### 15.6 与实施阶段衔接（闭环，两层）
```
PRD(vN) ──拆解──┬─▶ change-1 ─┐
                ├─▶ change-2 ─┼─▶ spec-superflow: spec-writer → contract-builder → build-executor
                └─▶ change-3 ─┘         （各 change 引用全局 prototype/ 作 UI 契约）
                                              │
        全局 prototype/ ◀── 增量合并 ────────┘（change 完成回写 UX / 架构 / API）
        compound 复利回写: design-system.md / architecture.md / api.md
```
- 原型（全局）→ 架构：原型确认的 UX 流向全局 `architecture.md` 限界上下文映射（DDD）。
- 原型 → API：原型交互 → 端点设计 → 流入 `execution-contract.md` + build-executor。
- 原型 → 开发：全局原型作 UI 契约参考进 `execution-contract.md`，build-executor 按契约 + TDD 实现。
- 闭环：PRD 版本演进 → 拆 change → spec-superflow 实施 → 增量回写全局原型/架构/API；原型随 PRD 持续迭代不腐烂。

### 15.7 I/O 钉死（补全前 12 轮三处未定义）
- **I/O-1：design.md ↔ architecture.md 关系**：`design.md` 是 spec-superflow 内核的**每变更架构一等公民**（per-change，随 change 状态机走，不可变）；全局 `docs/architecture/ARCHITECTURE.md` 是**跨 change 技术锚点**（复利回写目标）。change 完成 → 其 `design.md`/增量 `architecture.md` 的 delta **增量回写**全局，design.md 本身保持不可变。二者职责划清：design.md=变更内设计稿，ARCHITECTURE.md=全局锚点。
- **I/O-2：api.md 硬消费**：每变更 `api.md` 经 `execution-contract.md` 被 **build-executor 硬消费**（TDD 实现），不得仅作参考文档；跨 change 一致性由 `api-index-gen` 脚本扫所有 `specs/*/api.md` 生成 `API-INDEX.md` 兜底（消除留债）。
- **I/O-3：tasks.md 引用架构/API**：`tasks.md` 显式引用**本 change** 的 `architecture.md`/`api.md` 章节锚点（如 `architecture.md#聚合-x`），**不得活引用全局**；build-executor 按 tasks + execution-contract + 全局 `prototype/` 实现，保证任务与架构/API/原型契约一致。

### 15.8 复利回写设计系统
- 设计系统由项目 `spec-superflow.config.json` 注入的 `design-system.md`（9 段 schema + 5 方向调色板，项目资产）。
- change 完成 → 其 UX 增量若涉及设计系统迭代（新组件/新 token/新 anti-pattern）→ 经 `prototype-sync` 脚本合并回全局 `prototype/design-system.md`，作为项目级风格唯一真相源复利累积。
- design-system.md 回写发生在项目内（config 注入），插件保持通用、不固化任何风格。

---

## 十六、E2E 测试集成（v0.4 设计修订）

> 设计修订号 v0.4（打包版本 0.10.0）。详细方案、双专家评审与决策记录见 `docs/e2e-integration-design.md`。来源：gtmc `acceptance-test` SKILL.md v3.0.0 + `test-verifier.md`；spoko.space《AI & Playwright E2E Testing 2026》。

### 16.1 决策记录
| 维度 | 决策 |
|---|---|
| 原型框架 | 维持 HTML 自包含 + 强化 `data-testid` 契约（守 v0.3 零依赖/可离线） |
| E2E 挂载 | 独立 `e2e` skill（17→18；可选 overlay，不进核心状态机） |
| `data-testid` 规范 | 搬 gtmc 命名；选择器优先级统一 spoko；元素级仅关键锚点 |
| 覆盖率门禁 | 分级：原型期放宽 / 集成期严格照搬 gtmc |
| AC 提取 | 门禁按维度条件触发 + 关键字回退（解除"可选→强制"陷阱） |
| 验收证据归属 | `release-archivist`（非 `ce-proof`；`ce-proof` 是 Proof 编辑器） |

### 16.2 背景与缺口
- 现有测试纪律：`build-executor` 的 TDD Iron Law + SDD + review gate + 8 态状态机；`spec.md` 的 `#### Scenario:` 是"可测行为"源，但仅作 spec 内容校验，**未自动执行为 Playwright**。
- 核心缺口：**spec 场景 / 验收标准 → 可执行 E2E (Playwright) 的桥接未自动化**。gtmc 的 `acceptance-test` + `test-verifier` 是此桥接的完整参考实现（AC 驱动黑盒 + 机械覆盖率 + Playwright 生成）。

### 16.3 核心约束
- **零依赖/可离线**：`data-testid` 为纯 HTML 属性，不引入 JS/CSS/构建/Playwright；Playwright 仅进**用户项目**，不进插件。
- **通用不固化框架**：E2E 靠 `data-testid` 契约跨框架复用，不假设 Vue/React。

### 16.4 data-testid 契约
- **命名层级**：场景级 `S-{nn}-{slug}`、页面级 `P-{xx}-{slug}`、元素级 `{语义名}`（如 `create-btn`）。
- **选择器优先级**：`getByRole` > `data-testid` > `id` > `getByLabel` > CSS/XPath（禁用于新测试）；`data-testid` 仅用于动态/hydration 边界；禁止 `waitForTimeout`。
- **打标纪律**：场景/页面级必带；元素级仅**关键交互锚点**（提交、主操作、状态切换）带，内部优先 `getByRole`/`getByText`（避免过度打标）。
- **可选开启**：项目 config `prototype.e2e: true` 时强制；避免无测试需求项目被迫加 testid。
- **契约治理**：`execution-contract.md` 记录 UI 契约；提供 testid checker 比对原型与实际代码两侧 testid 集合，漂移即报警。

### 16.5 spec → Playwright 映射
- **提取源**：`#### Scenario:`（→ HP）/ 可选 `##### Exception:`（→ EX）/ `##### State:`（→ ST）/ `##### Boundary:`（→ BND）。
- **解除"可选→强制"陷阱**：① 维度条件触发——仅含某维度标签才考核该维度，未含标 `N/A` 不阻断；② 关键字回退——未打标签时从 Scenario 文本提取 error/invalid/fail/边界 等作 EX/ST/BND 来源。二者至少取一，保向后兼容。
- **AC 公式**：`Total = HP×1 + EX×2 + ST×2 + BND×1`（ST-invalid 若已被 EX 覆盖则去重）。
- **阶段映射**（不用 gtmc 编号）：bridging/prototype（验证可执行性）→ executing（集成）→ closing（验收，release-archivist gate）。

### 16.6 门禁分级
| 指标 | 原型期（验证可执行性，静态 mock） | 集成期（实际代码） |
|---|---|---|
| AC 覆盖率 | ≥ 80%（HP 必测） | ≥ 95% |
| 异常 EX | 有则测、无则带说明（不阻断） | ≥ 80% |
| 状态 ST | 有则测、无则带说明（不阻断） | ≥ 90% |
| 边界 BND | 有则测、无则带说明（不阻断） | ≥ 75% |
| 阻断级别 | AC<80% = BLOCKER | AC/EX<门槛 = BLOCKER；ST/BND = WARNING |

门禁随被测体成熟度**单调递增**；原型 mock 结构性做不到 EX/ST 全覆盖，强行照搬会产出虚假 BLOCKER。

### 16.7 e2e skill 设计
- frontmatter：`name: e2e` / `user-invocable: true` / 用法 `/e2e [原型|集成|验收] [spec路径]`。
- **执行流程（5 步）**：① 确定测试类型；② AC 提取与分类生成矩阵（总测试数 ≥ AC×1.5）；③ 调用 `test-verifier` 生成脚本；④ 执行与报告（AC 覆盖率/四维/类型分布/未覆盖/根因）；⑤ 覆盖率审计（分级门槛判定 BLOCKER/WARNING）。
- **落盘位置（统一 `e2e/`，不放 `prototype/`）**：`playwright.config.ts` 的 `projects`（baseURL）切被测体——`prototype` project → http-server 托管 HTML；`integration` project → 真实应用。脚本一致，**仅切地址 + 少量选择器/断言适配**（高重叠复用，非零触碰；原型绿 ≠ 集成绿）。

### 16.8 test-verifier 执行层（MVP 子集）
- **保留**：AC 深度分析（4 类提取 + 分级门禁）、选择器纪律、E2E 决策矩阵（轻量）、执行与报告。
- **移交 `release-archivist`**：4 级制品验证（L1 存在→L4 数据流；设计→实现追溯）。
- **DEFER / 归 `prototype-reviewer`**：8 维健康评分、每页 7 点视觉走查（需 axe/Lighthouse，不匹配自包含原型 MVP）。

### 16.9 对现有 skill 影响面
| Skill | 改动 |
|---|---|
| `prototype` | 补 `data-testid` 产出（场景/页面级必带 + 关键锚点；config 可选开启；零依赖声明） |
| `build-executor` | 不改（TDD 管单测；E2E 独立） |
| `ce-proof` | 不改（Proof 编辑器，与验证无关） |
| `release-archivist` | 接入 e2e 报告 + 4 级制品比对（closing 验收 gate） |
| `architecture-design` | API/DB 设计文档供制品比对使用 |
| `spec-writer` | specs 规则补可选子标签说明；补回归用例 |
| `design-system`（=模板/项目 design-system.md，**非 skill**） | 不在 9 段视觉 schema 加测试段；testid 契约只置 `execution-contract.md` |

### 16.10 实施状态（v0.4）
- ✅ 新建 `skills/e2e/SKILL.md` + `skills/e2e/references/test-verifier.md`
- ✅ 改 `prototype/SKILL.md`（data-testid 契约段）
- ✅ 改 `spec-writer/SKILL.md`（可选子标签 + 回归用例）
- ✅ 改 `release-archivist/SKILL.md`（接入 e2e + 4 级制品比对）
- ✅ `plugin.json` "17 skills" → "18 skills"
- ⏳ 待用户在 Claude Code 跑 `npm test` / `npm run validate` 验证插件不因新增 skill 破损

---

## 十七、决策落实状态
1. **全局文档组织**：✅ 已定——起步即按 bounded context 分目录（第八节）。
2. **落地节奏**：✅ 已定——初期即全量铺开（第十四节）。
3. **技术锚点定性**：✅ 已定——瘦锚点、与 STRATEGY.md 分离补位；设计影响与高质量可拓展保障见 6.1。
4. **注册 skill**：✅ 已注册——`architecture-design`（id `7484551995606787`），用 ima_skill_create 注册完成。
5. **原型设计能力（v0.3 新增）**：
   - 原型内核选型（本地 HTML 原型 skill，零外部依赖）：✅ 已认可（第 13–15 轮）。
   - 配置驱动原则（插件通用 + 项目 config 注入 PRD 模板/设计系统）：✅ 已认可。
   - 产物层级模型（全局 PRD 有版本 / 原型·代码各一份 git 分支隔离 / 变更层一份 PRD 拆多 change）：✅ 已确认（第 16 轮 LT "符合"）。
   - 并入 v0.3 原型章 + 起草→评审→决策→建插件流程：✅ 已授权（第 16 轮决策点 4、5）。
   - 插件名已定：**team-flow**（v0.3 定稿后 LT 拍板）；compound 范围已定：**核心子集**（非全量 33）。本地 HTML 原型 skill 蒸馏与并入统一插件（team-flow）执行中。

---

*由 copilot(阿通) 基于 architecture-design skill + 四方专家会审（v0.2）+ 第 13–16 轮原型调研，全量修订为 v0.3；原型章见第十五章，MVP 章节见第十四节。*
