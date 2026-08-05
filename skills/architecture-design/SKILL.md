---
name: architecture-design
description: 基于 4A 企业架构 + DDD 领域驱动设计的架构/API/DB 设计 skill。当用户需要做架构设计、识别聚合与限界上下文、划分写/读模型(CQRS)、设计 API 指令映射，或在 team-flow / compound-engineering 工作流中做每变更架构增量设计与全局复利回写时使用。在 workflow-start 编排中作为子代理调用，承担判断+执行一体化职责（五项检查判定是否涉及架构变更，涉及则执行完整增量设计，不涉及则返回 skip）。不适用于：纯业务逻辑编码、与架构无关的需求分析、非 DDD 语境的数据库建模。
---

# Architecture Design (4A + DDD)

把企业架构(4A)与领域驱动设计(DDD)的 crystallized 方法，转化为每变更可执行的架构/API/DB 设计动作，并与 team-flow(开发过程) + compound-engineering(全局复利) 衔接。

## Core Frameworks

### F1 · 4A 分叉依赖
`BA → (IA ∥ AA) → TA`。BA 先行且未稳前不并行；IA 与 AA 同步并行、双向对齐；二者共同汇聚 TA。定义不可逆（先选技术再补流程是反模式）。

### F2 · 跨域一致性（双对齐，质量门禁）
每个 AA 功能 ≥1 个 IA 数据实体支撑；每个 IA 实体 ≥1 个 AA 功能消费（多对多，无孤立节点）。检查两类缺一不可：结构一致（"有没有"）+ 语义一致（"对不对"，命名统一，用户/客户/consumer 不能并存）。

### F3 · 变更分叉级联（三层次必覆盖）
直接依赖（BA→AA/IA 同变）→ 间接依赖（AA/IA→TA、IA↔AA 对齐调整）→ 隐式依赖（表面无关却牵动，最危险）。无架构管理=上线才暴露(10×成本)。

### F4 · DDD 聚合四要素
实体(唯一标识)+值对象(无标识)+聚合根(唯一入口)+事务边界(聚合内一事务)。聚合仅存于业务服务；数据服务/技术服务无聚合。

### F5 · 限界上下文(Context Map)
语义边界=L3 应用服务；同术语异义须显式映射(Shared Kernel / Anti-Corruption Layer / Open Host Service)。

### F6 · CQRS 写读模型
事务型对象→写模型(聚合，Command/Read 操作)；分析型对象→读模型(查询模型，Query 派生，无事务)。Command/Read→写模型；Query 经阻断测试分流。

### F7 · 三维判定（验证工具）
失忆测试(清空业务记忆还能工作?→TA) → 阻断测试(阻断1h下游能继续?不能→业务服务/能→数据服务) → 孤岛测试(谁调用? 私有/领域共通/企业共通)。

### F8 · 增量设计 + 复利回写闭环（工作流衔接）
每变更：As-Is 冻结复制+版本锚点(change_id+章节+commit)→ To-Be(DDD)+ 全局 ARCHITECTURE.md 锚点。复利回写：one change per run，append 当前态+演进日志，Discoverability 在 AGENTS.md 暴露 docs/architecture/，下游检索复用。API 仅每变更内设计；技术架构(IA/AA/TA)与产品策略(BA/STRATEGY.md)分离对齐。

## Chapter Index
- ch01-4a-domains — 4A 四域定义与分叉依赖
- ch02-change-cascade — 变更级联与跨域一致性门禁
- ch03-architecture-outputs — 架构产出三层 + 治理三支柱
- ch04-entity-to-aggregate — 业务实体→聚合→限界上下文
- ch05-cqrs — 写/读模型、指令分流、三维判定
- ch06-integration — 与 team-flow / compound-engineering 的集成

## Topic Index
- 4A / BA / IA / AA / TA → ch01
- 分叉依赖 / 跨域一致性 → ch01, ch02
- 变更级联(直接/间接/隐式) → ch02
- 架构产出三层(元素/制品/交付件) → ch03
- 治理三支柱 → ch03
- 业务实体 / 活动对象矩阵 → ch04
- 聚合 / 聚合根 / 值对象 / 事务边界 → ch04
- 限界上下文 / Context Map → ch04
- 写模型 / 读模型 / CQRS → ch05
- Command / Read / Query → ch05
- 阻断测试 / 三维判定 → ch05
- 增量设计 / As-Is 冻结 / 复利回写 / 全局锚点 → ch06

## Workflow Integration: 判断+执行一体化（v0.9 §26）

本 skill 在 workflow-start 编排下作为子代理调用，承担**判断+执行一体化**职责。

### 调用入口

由 workflow-start 在 `exploring` 完成后、`specifying` 之前调用。

### 输入

- `change-brief.md`（scope / AC / 技术方向）
- `prd/vN/plan.md` 高阶技术设计段（模块边界/技术选型/数据流/关键聚合划分）
- `docs/architecture/iterations/vN/architecture.md`（产品级架构快照，**主输入**，v0.35.0）——BC 边界/聚合所有权/全局契约的唯一事实源
- 全局 `docs/architecture/`（As-Is 实际态基线，已落地部分）
- 现有 `specs/`（若有）

### 五项检查（架构变更判定）

依次检查以下五项，**全部为否** → `decision: skipped`；**任一为是** → `decision: required`：

1. **聚合变更**：是否新增/修改聚合（aggregate）或聚合根
2. **限界上下文变更**：是否涉及限界上下文（bounded context）边界变化或新增上下文映射关系
3. **读写模型变更**：是否涉及 CQRS 写模型或读模型变化
4. **API 变更**：是否涉及 API 新增/变更（端点、方法签名、请求响应 schema）
5. **DB schema 变更**：是否涉及数据库表结构、字段、索引变更

### 路由分流（v0.35.0 新增）

当产品级架构快照存在时（已建档项目），判定结果再按"产品级决策 vs change 内实现细节"分流：

- 触及**产品级决策**（BC 边界变更 / 聚合所有权变更 / 全局契约变更）→ 引用快照 + 走**架构修订决策门**（不硬阻断，显式确认 + 登记 deviation，P3）
- 仅 **change 内实现细节**（字段 / 端点 / 状态增量）→ 增量设计，不触发产品级变更

变更级聚合动作限三类：`extend`（既有聚合加字段/指令/事件/状态）、`new`（新增聚合，flag 登记待产品级晋升）、`refactor`（需决策门）。聚合 id 一律引用产品级注册表，不重定义（防重发明，v0.14 §61.3）。

### 架构修订决策门（v0.36.3 定义，v0.14 §61.3/§61.4）

**触发**：change 级设计触及产品级决策（BC 边界变更 / 聚合所有权变更 / 全局契约变更），或 arch-merge 冲突预检阻断聚合重定义。

**流程**（不硬阻断，显式确认 + 登记 deviation）：
1. **呈现变更摘要**：涉及的产品级决策 + 影响范围（引用快照章节）
2. **用户确认**（阻塞问题工具）：接受 → 执行变更；拒绝 → 保持产品级定义，change 内走增量
3. **登记 deviation**：确认后写入 `orchestrator.yaml` 的 `replan_log`（`seq/trigger: arch-deviation/before/after/approved_by`）+ 在 `iterations/vN/architecture.md` 演进日志追加修订记录（迭代收尾 S3.5 确认晋升）
4. **`new` 聚合 flag**：在 `iterations/vN/architecture.md` 聚合注册表标注 `[pending-promotion]`，待下一迭代产品级晋升

### 执行流程

```
1. 读取输入（brief + plan + specs + 全局 ARCHITECTURE.md）
2. 执行五项检查
3. 全部为否：
   → decision: skipped
   → reason: 简述不涉及架构变更的理由
   → 返回结构化输出
4. 任一为是：
   → decision: required
   → reason: 简述涉及的架构变更项
   → 执行完整 4A+DDD 增量设计（F1-F8）
   → 产出 architecture/architecture.md + database.md + api.md
   → artifacts: 产出路径列表
   → 返回结构化输出
```

### 结构化输出契约

返回给 workflow-start 的结果**必须**包含以下字段：

```yaml
decision: required | skipped
reason: "..."                    # skipped 时：不涉及架构变更的理由
                                 # required 时：涉及的变更项摘要
artifacts:                       # required 时必填，skipped 时为空
  - architecture/architecture.md
  - architecture/database.md
  - architecture/api.md
```

**职责边界**：architecture-design 负责**判断+产出**（五项检查判断是否涉及架构变更，涉及则产出架构设计文档），workflow-start 负责**reasonableness check + 状态写入**（确认判断合理性后写入 yaml）。

### 产出目录

架构设计产出放在 change 目录下的独立 `architecture/` 子目录：

```
changes/<name>/
└── architecture/                # ★ 架构设计独立一等产物
    ├── architecture.md          # DDD 增量（聚合/限界上下文/CQRS/Context Map）
    ├── database.md              # DB 增量（实体/读写模型/schema 变更）
    ├── api.md                   # 架构路由表（Command/Read/Query 分流 + 聚合归属 + 阻断测试结果）
    └── sql/                     # DDL / Migration 脚本（独立可执行文件，不嵌入 markdown）
        ├── ddl/                 # 表结构定义脚本
        └── migration/           # 增量迁移脚本
```

**语义分离**：架构设计与行为规格（`specs/`）是不同专业领域，独立目录避免混杂。

**api.md 定位——架构路由表**：
- 记录内容：Command/Read/Query 分类、聚合归属（哪个聚合拥有该操作）、阻断测试结果（写模型 vs 读模型分流依据）
- **不**重复 Swagger 管理的内容：请求/响应 schema、错误码定义、参数明细等由 Swagger/OpenAPI 规范承载
- frontmatter 须声明 `api_contract_manager: swagger`，表明详细契约由 Swagger 工具链管理
- sql/ 目录中的 DDL 和 migration 脚本为独立可执行 `.sql` 文件，不嵌入 markdown 文档
- **PRD 功能清单 → API 端点映射表（v0.29.0 §37 新增）**：在 api.md 中增加独立章节，逐条对照 `prd/vN/prd.md` 功能清单（如 F001_P0_P1 ~ P0_PN），映射每个功能点到对应的 API 端点。对于涉及子实体（明细/子项）的功能，必须确保独立 CRUD 端点存在——仅查询端点不覆盖"新增/编辑"功能。此映射表供 architecture-reviewer A4 交叉验证使用

**下游消费**：
- `architecture/architecture.md` → spec-writer：design.md Decisions 约束
- `architecture/database.md` → spec-writer：design.md + tasks.md 数据层约束
- `architecture/api.md` → spec-writer：tasks.md 接口路由与分流约束（详细 schema 由 Swagger 提供）
- `architecture/sql/` → build-executor：直接执行 DDL/migration 脚本
- 全部 → release-archivist → `tf arch-merge` → 全局 `docs/architecture/` 回写

### 架构制品合并（arch-merge）

change 进入 closing 阶段时，由 release-archivist 调用 `tf arch-merge` CLI 命令，将 `changes/<name>/architecture/` 下的增量制品合并回全局 `docs/architecture/`，完成 As-Is → To-Be 基线更新。architecture-design 本身不执行合并，只负责产出增量制品。

### 调用模式（v0.35.0：变更级 / 产品级）

| 模式 | 编排入口 | 判定 | 产出 | owner |
|------|---------|------|------|-------|
| 变更级（默认） | workflow-start（exploring→specifying） | 五项检查 | `changes/<name>/architecture/` 三件套 + sql/ | architecture-design 子代理 |
| 产品级（product 模式） | workflow-orchestrator S3.5（architecture 阶段） | 8 步全系统结构级设计（无五项检查） | `docs/architecture/iterations/vN/architecture.md`（6 产物快照） | architecture-design product 模式子代理（唯一 owner） |

**产品级模式执行**：按 `references/s3.5-product-architecture.md` SOP（8 步），模板用 `references/s3.5-architecture-template.md`，加载协议用 `references/s3.5-loading-protocol.md`。产出经 architecture-reviewer product 视角评审（`review_mode: product`）PASS 才进 S4。时序遵守 P1：只写快照不写全局。

### 独立调用

除 workflow-start 编排调用外，本 skill 仍支持用户显式独立调用（`/team-flow:architecture-design`），此时不走五项检查判定门，直接执行完整 4A+DDD 设计。

## 上下文加载协议

architecture-design 执行时的上下文组装：

**conventions 注入（v0.11 §33）**：
1. 通过 `tf runtime config --get conventions` 获取 conventions 配置
2. 按 phase 过滤：`database` / `backend` / `api`
3. 读取匹配的 `.team-flow/conventions/*.md` 文件
4. 注入为架构决策约束（advisory 级）

**架构复利注入（v0.36.3，复利链路修复）**：
1. 执行 `tf solutions inject --phase architecture`（失败静默）——注入 `docs/solutions/` 中 phase=architecture 的历史架构决策经验（BC 边界取舍/聚合划分理由/事件投影设计踩坑）
2. 读取失败 / 无条目 → 静默跳过，不阻断（advisory 级，与 S1 复利注入同语义）

**始终加载**：
1. `Read docs/architecture/INDEX.md`（~50行摘要）
2. `Read changes/<name>/change-brief.md`（如有）
3. `Read changes/<name>/proposal.md`（如有）

**根据五项检查按需加载**：
4. [聚合变更] → `Read PHYSICAL-MODEL.md` 对应业务域段落 + `Read ARCHITECTURE.md` 对应 BC 段落
5. [读写模型变更] → `Read PHYSICAL-MODEL.md` 对应域段落
6. [API 变更] → `Read API-INDEX.md` 对应分流区域
7. [DB schema 变更] → `Read schema-baseline.sql` 对应表的 DDL
8. [限界上下文变更] → `Read ARCHITECTURE.md` 全文

**绝不加载**：
- `baseline.md`（项目全景，arch-design 不需要）
- 未涉及的业务域段落
- 历史变更脚本（`changelog/`）

**上下文预算**：单次执行 ~2K tokens（L1 INDEX + 1-2 个 L2 域段 + L3 变更层）

**产品级三段式加载（v0.35.0，有产品级快照时）**：按 `references/s3.5-loading-protocol.md` 三段式——① 索引层（INDEX + ARCHITECTURE §1-2 厚锚点）② 按域加载（change 触及的 `domains/<bc>.md`）③ 变更增量。迭代中读 `iterations/vN/` 快照（in-flight），迭代收尾读全局当前态（P1）。

## Scope & Limits
本 skill 覆盖 4A+DDD 架构设计方法及其与 team-flow/compound-engineering 的衔接。落地实现结合项目具体工具；超出本范围见相关 skill 或直接问 agent。

## 阶段转换前规范建议（v0.11 §33，被动式自动沉淀）

architecture-design 阶段即将结束、进入 spec-writer 之前，执行以下规范沉淀协议：

1. **回顾本阶段工作**：扫描本阶段所有用户纠正、CC 观察到的项目既有模式、踩坑记录
2. **生成规范建议列表**：提取跨 change 可复用的规范条目（排除仅适用于本次 change 的特定业务逻辑）
3. **去重检查**：对比已有 convention 文件，排除已存在的条目
4. **向用户展示建议**：

```
📋 架构设计阶段规范建议
┌───┬──────────────────────────────────────────────────┐
│ # │ 规范条目                                          │
├───┼──────────────────────────────────────────────────┤
│ 1 │ [条目描述]                                        │
│   │   来源：[来源说明]                                  │
│   │   建议写入：.team-flow/conventions/[目标文件]       │
└───┴──────────────────────────────────────────────────┘

请逐条确认（接受/拒绝/修改），或输入「全部接受」：
```

5. **用户确认后写入**：接受的条目追加到对应 convention 文件，更新 YAML frontmatter 的 date 字段
6. **无建议时静默跳过**：如果本阶段没有可沉淀的规范，不弹出确认，直接进入下一阶段
