# Brainstorm → PRD 章节映射

ce-brainstorm 的对话流程收集的信息需要映射到 PRD 模板的 11 个章节。

## 映射关系

| PRD 章节 | 信息来源 | 填充策略 |
|---|---|---|
| 一、版本修订记录 | 元数据（日期、作者、版本、状态） | **自动填充**：从对话上下文提取日期、用户信息；版本/状态按下方「版本格式规范」填充，**文档状态必须与 frontmatter `frozen` 一致** |
| 二、业务流程一览 | Phase 1.3 对话 + `requirement/vN/business-analysis.md`（业务流程一览表） + `requirement/ledger.md`（流程台账 L1~L4 分组） | **对话+台账填充**：优先从 business-analysis.md 的业务流程一览表（L1 分组 ~ L4 子流程）提取；对话补充未落账的流程信息 |
| 三、D7.1_业务流程 | Phase 1.3 对话 + `requirement/vN/business-analysis.md`（流程详情：流程图 + 活动一览表） | **对话+台账填充**：优先从 business-analysis.md 的流程详情（流程图 + 活动一览表）提取；对话补充 Key Flows 中未落账的细节 |
| 四、D7.2_画面原型及设计 | Phase 1.3 对话：UI/交互需求 | **对话填充**：如涉及 UI，从对话中收集原型信息 |
| 五、D7.3_报表清单 | Phase 1.3 对话 | **占位保留**：brainstorm 不涉及报表细节，保留模板占位符 |
| 六、D7.4_业务术语字典 | Phase 1.3 对话 + CONCEPTS.md | **部分填充**：从对话中提取的领域术语，其余保留占位符 |
| 七、D7.5_系统功能清单 | Phase 1.3 对话 + `requirement/ledger.md`（需求台账 + 场景台账） + `requirement/vN/business-analysis.md` | **对话+台账填充**：每个功能标注关联需求 ID、关联场景 ID、关联流程步骤；从需求台账和场景台账提取关联关系 |
| 八、D7.6_系统功能处理说明书 | Phase 1.3 对话 + `requirement/vN/business-analysis.md`（按流程组织的功能模块） + `requirement/ledger.md`（流程台账） | **部分填充**：按流程组织，每个功能模块标注所属流程；权限/交互/异常从对话收集，硬件/网络保留占位符 |
| 九、D7.7_要件定义自查报告 | 自动 | **占位保留**：这是 BA 自查工具，brainstorm 阶段不填充 |
| 十、D7.8_要件定义完成报告 | 自动 | **占位保留**：这是完成态产物，brainstorm 阶段不填充 |
| 十一、D7.9_评审会议纪 | 自动 | **占位保留**：这是评审产物，brainstorm 阶段不填充 |

## 关键映射规则

1. **brainstorm 对话中没有信息的章节保留模板占位符**，不硬填
2. **版本修订记录（§1）** 从元数据自动填充：日期、撰写人（如可获取）
3. **业务流程（§2-§3）** 优先从 `business-analysis.md` 提取（§2 ← 业务流程一览表，§3 ← 流程详情），对话中的 Key Flows 和 Actors 作为补充
4. **画面原型（§4）** 仅在 brainstorm 涉及 UI 时填充
5. **业务术语（§6）** 从对话中提取已定义的领域术语
6. **系统功能（§7-§8）** 从 Requirements 和 Key Decisions 映射；§7 每个功能标注关联需求 ID + 场景 ID + 流程步骤（来源：`ledger.md`），§8 按流程组织并标注所属流程（来源：`business-analysis.md` + `ledger.md`）
7. **自查/完成/评审（§9-§11）** 全部保留占位符，由后续流程填充

## 台账与业务分析文档映射（v0.38 新增）

当 `requirement/` 目录下存在台账和业务分析文档时，ce-brainstorm 应优先从中提取结构化数据填充 PRD，而非仅依赖对话收集。

### 输入文件与职责

| 文件 | 路径 | 职责 |
|------|------|------|
| 需求/场景/流程台账 | `requirement/ledger.md` | 全量条目和关联关系（需求 ID、场景 ID、流程 ID 及交叉引用） |
| 修订记录 | `requirement/vN/dialogue-log.md` | §1.2 修订记录的引用路径（指向具体对话日志） |
| 业务分析文档 | `requirement/vN/business-analysis.md` | §2/§3/§7/§8 的结构化数据来源 |

### 章节级映射规则

| PRD 章节 | 台账/文档来源 | 提取内容 |
|----------|-------------|---------|
| §1.2 修订记录 | `requirement/vN/dialogue-log.md` | 修订记录引用路径（文件名 + 日期） |
| §2 业务流程一览 | `ledger.md` 流程台账 + `business-analysis.md` | L1 分组 ~ L4 子流程的业务流程一览表 |
| §3 D7.1_业务流程 | `business-analysis.md` | 流程详情：流程图 + 活动一览表 |
| §7 D7.5_系统功能清单 | `ledger.md` 需求台账 + 场景台账 | 每个功能标注：关联需求 ID + 关联场景 ID + 关联流程步骤 |
| §8 D7.6_系统功能处理说明书 | `business-analysis.md` + `ledger.md` 流程台账 | 按流程组织，每个功能模块标注所属流程 |

### 缺失降级策略

- 台账或业务分析文档不存在时，退回对话填充策略（即原有行为），不阻断 brainstorm 流程
- 台账存在但某章节对应字段为空时，该章节保留模板占位符并在备注中标注"台账数据待补充"
- 复利归档后，PRD frontmatter 应更新已发布版本标记，与台账中的`发布版本`字段保持一致

## 迭代版本（vN）

- `prd/vN/` 或 `requirement/vN/` 中的 N 是产品迭代版本（v1=MVP, v2=扩展），不是文档版本
- ce-brainstorm 启动时扫描 `prd/` 和 `requirement/` 目录检测已有迭代（`requirement/` 优先）
- 自动建议最新迭代或创建新迭代，用户确认后继续
- 每个迭代目录下只有一个 `prd.md` 文件

## 版本格式规范（v0.8 新增，修复格式不统一 BUG）

> **背景**：曾出现 frontmatter `iteration_version: v1`/`frozen: true`，正文却写「产品版本 v1.0」「文档状态 编辑中」——格式两套且状态自相矛盾。本节钉死格式，写入时自检。

**两层版本号，分工明确**：

| 字段 | 位置 | 格式 | 含义 | 递增时机 |
|------|------|------|------|---------|
| `iteration_version` | frontmatter | `vN`（v1/v2/…） | **产品迭代版本** | 仅新迭代/新用户故事（vN+1）|
| 产品版本 | 正文 §1.1 版本信息 | `vN.M`（v1.0/v1.1/…） | **文档修订次版本** | vN 内每次修订递增 M（呼应反馈环路「vN 内修订不升版」）|

- vN 内修订（S3→S2 回退修订）→ 只递增正文 `vN.M` 的 M，**frontmatter `iteration_version` 不变**，并在 §1.2 修订记录追加一行 + 「决策与变更履历」章节记录。
- 新迭代 → frontmatter `iteration_version` 升 vN+1，正文产品版本重置为 `v(N+1).0`，新建 `prd/v(N+1)/` 目录。

**文档状态枚举（§1.1）——必须与 frontmatter `frozen` 一致**：

| 文档状态 | frontmatter | 含义 |
|---------|-------------|------|
| `编辑中` | 无 `frozen` 或 `frozen: false` | 仍在编写/对话中 |
| `已冻结-下游` | `frozen: true`（默认）| `frozen_downstream`：下游不可直接改，可经 S3→S2 回退在 vN 内修订 |
| `已冻结-绝对` | `frozen: absolute` | `frozen_absolute`：任何修改必须升版 vN+1 |

> **一致性硬约束**：frontmatter `frozen: true` 时，正文文档状态**不得**为「编辑中」。PRD 写入/冻结时自检，不一致即修正。

## 冻结声明（v0.8 新增，修复冻结措辞 BUG）

PRD 冻结时（`frozen_downstream`），在正文标题下方插入冻结声明 blockquote。**措辞必须区分双层冻结，不得写"升版 v2"**（那是 `frozen_absolute` 语义，违反反馈环路设计）：

```markdown
> **本文档已于 {YYYY-MM-DD} 冻结**（`frozen_downstream`，经原型循环验证 + 人工评审通过）。
> 下游阶段（plan/spec/build）**不可直接修改**；如 plan 或实施暴露 scope 问题，经 **S3→S2 回退在 vN 内修订**并记录「决策与变更履历」（不升版）。
> 仅当**启动新迭代 vN+1** 或**用户显式绝对冻结**（`frozen_absolute`）时，才需升版。
```

## Brainstorm Profile 机制（v0.25 新增）

每个 PRD 模板应配套一个 **brainstorm profile** 文件，定义 Phase 2 方案探索的产品维度锚点，确保需求阶段聚焦产品方案而非技术决策。

### 文件命名规则

`<模板名>-brainstorm-profile.md`，与模板同目录：

| PRD 模板 | Brainstorm Profile |
|----------|-------------------|
| `templates/prd.md` | `templates/prd-brainstorm-profile.md` |
| `my-project/prd-template.md` | `my-project/prd-template-brainstorm-profile.md` |
| `.team-flow/custom-prd.md` | `.team-flow/custom-prd-brainstorm-profile.md` |

### 查找优先级

1. 自定义模板同目录的 profile 文件（按命名规则推导）
2. 内置默认 `templates/prd-brainstorm-profile.md`（相对 skill 基目录）

### Profile 三段结构

| 段落 | 作用 | Phase 2 中的行为 |
|------|------|-----------------|
| **核心思考维度** | 每个方案必须覆盖的产品维度 | 每个方案按维度展开，未覆盖需说明原因 |
| **扩展思考维度** | 按需触发的补充维度 | 根据需求特征决定是否覆盖 |
| **反例边界** | 禁止越界的技术决策类型 | 方案探索中不得包含这些内容 |

### 自定义 Profile

创建新 PRD 模板时，**必须同步创建**对应的 brainstorm profile。未配套 profile 的模板将使用内置默认的 GTMC D7 profile——维度可能与模板结构不匹配。

自定义 profile 应包含：
1. 核心维度表：维度名、对应 PRD 章节、引导问题
2. 扩展维度表：维度名、触发条件、对应 PRD 章节、引导问题
3. 反例边界列表：Phase 2 不应包含的技术决策类型
4. 正向示例：正确的产品方案输出 + 错误的技术方案输出

