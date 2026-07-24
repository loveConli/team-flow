# AGENTS.md · team-flow

> team-flow 统一插件 = **spec-superflow**（spec 驱动开发）+ **compound-engineering 核心子集**（全局复利）+ **architecture-design**（4A+DDD 增量设计）+ **prototype**（本地 HTML 原型）+ **e2e**（AC 驱动 Playwright E2E）+ **workflow-orchestrator**（产品级编排）+ **workflow-bootstrap**（既有项目接入）。一次安装，七套能力协同（20 skills），支持 9 安装面（Claude Code, Cursor, OpenAI Codex CLI/App, GitHub Copilot CLI, Gemini CLI, OpenCode, WorkBuddy, Trae, ima-copilot）。

## What This Is

基于 spec-superflow 底座，并入 compound 核心子集（6 skills）+ architecture-design（1 skill）+ prototype（1 skill）+ e2e（1 skill）+ workflow-orchestrator（1 skill）+ workflow-bootstrap（1 skill），形成"既有项目接入 → 需求探索 → PRD（含原型内循环）→ 架构增量 → 本地原型 → spec 驱动实现 → E2E 验证 → 全局复利回写"的统一工作流插件。

- 零运行时依赖（spec-superflow 底座）
- prototype 额外 **零外部依赖、可离线**（自包含 HTML + 页面内 Tweaks 控件，无 CDN）
- 插件保持通用，所有风格由项目 `design-system.md` / `prd.template` 注入，不固化任何公司/产品风格

### 身份与依赖关系

- **team-flow**（本插件）：Claude Code / Cursor 等宿主的插件实体（`plugin.json` name = `team-flow`），包含 20 个 skills + hooks + templates
- **spec-superflow**（npm 底座包）：team-flow 的 CLI 工具层（`package.json` name = `spec-superflow`，bin = `ssf`），提供状态机、校验、复利 CLI 等运行时能力
- 关系：team-flow **包含** spec-superflow 作为底座（同一仓库、同一版本）。skills 中的 `npx --yes --package spec-superflow@x.y.z ssf ...` 调用的是已发布的 npm 底座包，版本号必须与当前 `package.json` version 一致

## Commands

```bash
# Build TypeScript（spec-superflow 底座）
npm run build

# Run integration tests
npm test

# Run single test (Node 20+ native test runner)
node --test tests/e2e.test.mjs --test-name-pattern="parseDeltaSpec"

# Validate artifacts (uses docs/examples/ data)
npm run validate
```

## 能力概览（七套合一，20 skills）

### 1. spec-superflow（底座，9 skills）
spec 驱动开发过程。8 态变更机：`exploring → specifying → bridging → approved-for-build → executing → closing`（另有 `debugging` 侧路径 + `abandoned` 终态）。
- `workflow-start` 启动 / `need-explorer` 需求探索 / `spec-writer` 写 spec / `contract-builder` 构建执行契约 / `build-executor` TDD 实现 / `code-reviewer` 代码审查 / `spec-merger` 合并 delta spec / `release-archivist` 发布归档 / `bug-investigator` bug 调查

### 2. compound-engineering 核心子集（6 skills，全局复利）
- `ce-brainstorm` 需求头脑风暴 / `ce-plan` PRD 规划 / `ce-compound` 全局复利回写 / `ce-strategy` 策略锚点(`STRATEGY.md`) / `ce-ideate` 设计创意 / `ce-proof` 验证证明
- 变更后由 `ce-compound` / `ce-strategy` 将结论复利回写全局 `STRATEGY.md` / `CONCEPTS.md`

### 3. architecture-design（1 skill，4A+DDD 增量设计）
- 4A 企业架构 + DDD 领域驱动；识别聚合/限界上下文、CQRS 读写模型、API 指令映射
- 每 change 增量设计，经 `arch-merge` 顺序提交回写全局 `docs/architecture/`（ARCHITECTURE.md / DATABASE.md / `<bc>/`），复利真相源

### 4. prototype（1 skill，本地 HTML 原型）
- 全局一份 `prototype/`（与 PRD 同级，git 分支隔离），零外部依赖、可离线
- 设计系统渲染：读取项目 `design-system.md`（9 段 schema + 5 方向调色板）
- change 完成经 `prototype-sync` 回写全局 `prototype/` + `design-system.md`

### 5. e2e（1 skill，v0.10.0 新增）
- AC 驱动 Playwright E2E 测试：从 spec 验收场景生成测试、执行并审计覆盖率
- 用法：`/e2e [原型|集成|验收] [spec路径]`

### 6. workflow-orchestrator（1 skill，产品级编排）
- 编排产品级工作流：ce-brainstorm → 原型内循环 → ce-plan → 拆 change → 分发到 spec-superflow
- 与 workflow-start 分层：orchestrator 管"做什么、什么顺序"（产品级策略），workflow-start 管"怎么做"（变更级执行）

### 7. workflow-bootstrap（1 skill，既有项目接入）
- 一次性"侦察 + 基线建立"：代码库侦察 → 架构基线文档化 → 领域词汇提取 → 目录初始化 → 进入 workflow-orchestrator
- 仅首次使用时执行；`docs/architecture/baseline.md` 已存在则跳过

## 全局产物结构（Discoverability —— 设计/开发前先检索）

```
prd/                    PRD（有版本 v1→v2→v3，git 分支隔离）
  └── vN/
      ├── prd.md              # 业务要件（ce-brainstorm 产出）
      ├── plan.md             # 实施方案（ce-plan 产出，产品级策略）
      └── prototype-review.md # 原型审查记录（PRD 内循环产出）
prototype/             全局原型系统（UI 契约真相源）：index.html / pages / components / assets / design-system.md / flow.md
docs/
  ├── architecture/    全局架构锚点：ARCHITECTURE.md / DATABASE.md / <bc>/（限界上下文目录）/ baseline.md（v0.6 新增）
  └── solutions/       复利经验库（v0.5 新增，三层索引）
      ├── INDEX.md     # L1 轻量索引（≤150行，每条一行摘要+标签）
      ├── prd/ plan/ prototype/ spec/ build/ review/ cross-phase/  # L2 分阶段目录
      └── <file>.md    # L3 经验文件（YAML frontmatter: phase/domain/type/severity）
specs/<cap>/            每变更设计/任务/契约：spec.md / design.md / tasks.md / execution-contract.md / architecture.md / database.md / api.md / learnings.md
STRATEGY.md CONCEPTS.md 产品策略(BA) / 领域词汇
```

## 标准工作流（SOP，v0.6 修订）

```
模糊需求
  │
  ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  既有项目接入层（workflow-bootstrap，一次性，baseline.md 已存在则跳过）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  B1 代码库侦察 → B2 架构基线文档化 → B3 领域词汇提取 → B4 目录初始化
  │
  ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  产品级编排层（workflow-orchestrator）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  S1 ce-brainstorm → PRD(vN) 草稿
     ├─ 原型内循环（可选）：prototype skill → 原型审查 → 修正 → PRD+原型冻结
     └─ 不需要原型 → PRD 直接冻结
  S2 ce-plan → plan(vN)（产品级策略：change 拆分 + 依赖 + 技术方向）
  S3 拆 change → change-1, change-2, ...
  S4 分发 → 各 change 进入 spec-superflow（workflow-start）
  │
  [复利贯穿层] ← 每个阶段转换点：检测→捕获→索引→注入
  │
  ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  变更级执行层（workflow-start，8 态状态机）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  exploring → specifying → bridging → approved-for-build → executing → closing
  （debugging 侧路径 + abandoned 终态）
  每 change：引用全局 prototype/ 作 UI 契约（进 execution-contract.md）
            architecture-design 增量（As-Is 冻结 → To-Be → 复利回写）
            api.md 经 execution-contract.md 被 build-executor 硬消费
  │
  ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  复利回写层（closing 期）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  arch-merge → prototype-sync（顺序提交）
  复利晋升：change 内经验 → 全局 docs/solutions/
  全局 ARCHITECTURE.md / DATABASE.md / prototype/ / design-system.md
  │
  ▼
  全局作为下一 change / 下一 PRD 版本的 grounding → 闭环
```

## Skills 索引（20 个）

| Skill | 归属 | 用途 |
|---|---|---|
| workflow-start | spec-superflow | 启动工作流（8 态状态机入口） |
| need-explorer | spec-superflow | 需求探索 |
| spec-writer | spec-superflow | 写 spec |
| contract-builder | spec-superflow | 构建执行契约 |
| build-executor | spec-superflow | TDD 实现 |
| code-reviewer | spec-superflow | 代码审查 |
| spec-merger | spec-superflow | 合并 delta spec |
| release-archivist | spec-superflow | 发布归档 |
| bug-investigator | spec-superflow | bug 调查 |
| ce-brainstorm | compound | 需求头脑风暴 |
| ce-plan | compound | PRD 规划（产品级策略） |
| ce-compound | compound | 全局复利回写（三层索引） |
| ce-strategy | compound | 策略锚点 |
| ce-ideate | compound | 设计创意 |
| ce-proof | compound | 验证证明 |
| architecture-design | architecture-design | 4A+DDD 增量设计 |
| prototype | prototype | 本地 HTML 原型 |
| e2e | e2e | AC 驱动 Playwright E2E 测试（v0.10.0） |
| workflow-orchestrator | 产品级编排 | 产品级工作流编排（v0.5） |
| workflow-bootstrap | 既有项目接入 | 既有项目侦察+基线建立（v0.6） |

## 复利贯穿机制（v0.5 新增）

复利不是事后补记，是**流程内嵌机制**——贯穿产品级和变更级的每个阶段转换点。

### 三层索引架构

```
docs/solutions/
├── INDEX.md                  # L1：轻量索引（≤150行，每条一行摘要+标签，按 severity 降序）
├── prd/ plan/ prototype/ spec/ build/ review/ cross-phase/  # L2：分阶段目录
└── <date>-<summary>.md      # L3：经验文件（YAML frontmatter: phase/domain/type/severity/date/source）
```

### 四个核心动作

| 动作 | 触发时机 | CLI |
|------|---------|-----|
| **注入** | 进入每阶段时，自动加载相关经验（top-5） | `ssf solutions inject --phase <p> --domain <d>` |
| **捕获** | 阶段转换点检测到可复利时刻 | `ssf solutions capture --phase <p> --domain <d> --type <t> --severity <s> --summary "<text>"` |
| **索引重建** | INDEX.md 损坏或手动触发 | `ssf solutions index-gen` |
| **晋升** | change closing 时，经验验证后晋升为产品级 | `ssf solutions promote <change-dir>` |

### 关键约束

- 所有复利操作为 **advisory 级**，INDEX.md 读取失败时静默跳过，不阻断流程
- INDEX.md 硬上限 150 行，超限时按 severity 降序保留，淘汰 low + 最早条目
- 晋升条件：severity ≥ medium 且 type = pitfall/pattern；与全局已有条目 domain+type 匹配则标记"已确认模式"并升级 severity
- 上下文占用控制：最坏 ~6.5k token（L1 索引全量加载）

## 配置注入（插件层扩展字段）

项目 `spec-superflow.config.json` 可注入（**插件层扩展字段，非 spec-superflow 原生 schema**；原生仅 `artifacts.order` / `artifacts.skip`）：

- `prd.template`：PRD 模板路径
- `prototype.designSystem`：项目 `design-system.md` 路径
- `prototype.entry`：原型入口（默认 `prototype/index.html`）

读取方式：`ssf runtime config --get <key>`（插件层自读，字段命名避开原生 key 冲突）。

## Architecture（spec-superflow 底座，TypeScript）

### Source Code (`src/`)
TypeScript interfaces + regex-based parsers. Compiles to `dist/` (ES2022 + NodeNext + strict).
- `schema/` — Type definitions: `base.ts` (Requirement, Scenario), `change.ts` (Delta operations), `spec.ts`
- `parsing/` — `requirement-blocks.ts` parses delta spec markdown. `change-parser.ts` extracts `## Why` + `## What Changes` + delta sections.
- `validation/` — `validator.ts` validates artifacts against schema rules. `constants.ts` holds thresholds. Public API re-exported from `src/index.ts`.

### Validation Rules
- **spec.md**: Each Requirement must contain `SHALL` or `MUST`, ≥ 1 `#### Scenario:` block
- **Delta spec**: ADDED/MODIFIED must have requirement text + scenarios; cross-section conflicts blocked
- **proposal.md**: `## Why` ≥ 50 chars, `## What Changes` non-empty
- `Validator` returns `ValidationReport` with `{valid, issues, summary}`. Strict mode treats warnings as errors.

## 关键约束
- **原型全局一份**、与 PRD 同级、git 分支隔离版本；change 不直接拥有原型文件（引用全局 `prototype/` 作 UI 契约）。
- **design.md 不可变**：架构增量经 `arch-merge` 回写全局 `ARCHITECTURE.md`，不就地改 change 的 design.md。
- **顺序提交**：`arch-merge` → `prototype-sync`（同一 change closing 内），避免全局文档半更新态。
- **膨胀防控**：`prototype/components/` 必须复用 `design-system.md`，禁止页面内联样式漂移；新增组件先沉淀进 design-system 再引用。
- **分支约定**：原型随 PRD 当前版本分支维护；change 引用其所在 PRD 版本分支的 `prototype/`。
