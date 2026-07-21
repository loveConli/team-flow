# AGENTS.md · team-flow

> team-flow 统一插件 = **spec-superflow**（spec 驱动开发）+ **compound-engineering 核心子集**（全局复利）+ **architecture-design**（4A+DDD 增量设计）+ **prototype**（本地 HTML 原型）。一次安装，四套能力协同，支持 9 安装面（Claude Code, Cursor, OpenAI Codex CLI/App, GitHub Copilot CLI, Gemini CLI, OpenCode, WorkBuddy, Trae, ima-copilot）。

## What This Is

基于 spec-superflow 底座，并入 compound 核心子集（6 skills）+ architecture-design（1 skill）+ prototype（1 skill），形成"需求探索 → PRD → 架构增量 → 本地原型 → spec 驱动实现 → 全局复利回写"的统一工作流插件。

- 零运行时依赖（spec-superflow 底座）
- prototype 额外 **零外部依赖、可离线**（自包含 HTML + 页面内 Tweaks 控件，无 CDN）
- 插件保持通用，所有风格由项目 `design-system.md` / `prd.template` 注入，不固化任何公司/产品风格

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

## 能力概览（四套合一）

### 1. spec-superflow（底座，9 skills）
spec 驱动开发过程。8 态变更机：`exploring → specifying → bridging → approved-for-build → executing → closing`（另有 `onboarding` / `archived`）。
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

## 全局产物结构（Discoverability —— 设计/开发前先检索）

```
prd/                    PRD（有版本 v1→v2→v3，git 分支隔离）
prototype/             全局原型系统（UI 契约真相源）：index.html / pages / components / assets / design-system.md / flow.md
docs/architecture/     全局架构锚点：ARCHITECTURE.md / DATABASE.md / <bc>/（限界上下文目录）
specs/<cap>/            每变更设计/任务/契约：spec.md / design.md / tasks.md / execution-contract.md / architecture.md / database.md / api.md
STRATEGY.md CONCEPTS.md 产品策略(BA) / 领域词汇
```

## 标准工作流（SOP）

```
模糊需求
  → [ce-brainstorm → ce-plan 就地 enrich] → prd/vN
  → 拆 change（一份 PRD 可拆多 change）
  → spec-superflow: exploring → … → closing
       每 change：引用全局 prototype/ 作 UI 契约（进 execution-contract.md）
                 architecture-design 增量（As-Is 冻结 → To-Be → 复利回写）
                 api.md 经 execution-contract.md 被 build-executor 硬消费
  → change 完成：arch-merge → prototype-sync（顺序提交）复利回写全局
```

## Skills 索引（17 个）

| Skill | 归属 | 用途 |
|---|---|---|
| workflow-start | spec-superflow | 启动工作流 |
| need-explorer | spec-superflow | 需求探索 |
| spec-writer | spec-superflow | 写 spec |
| contract-builder | spec-superflow | 构建执行契约 |
| build-executor | spec-superflow | TDD 实现 |
| code-reviewer | spec-superflow | 代码审查 |
| spec-merger | spec-superflow | 合并 delta spec |
| release-archivist | spec-superflow | 发布归档 |
| bug-investigator | spec-superflow | bug 调查 |
| ce-brainstorm | compound | 需求头脑风暴 |
| ce-plan | compound | PRD 规划 |
| ce-compound | compound | 全局复利回写 |
| ce-strategy | compound | 策略锚点 |
| ce-ideate | compound | 设计创意 |
| ce-proof | compound | 验证证明 |
| architecture-design | architecture-design | 4A+DDD 增量设计 |
| prototype | prototype | 本地 HTML 原型 |

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
