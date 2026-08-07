# team-flow · Handoff 文档（Claude Code 继续开发用）

> 本文件用于把「team-flow 统一插件」的当前状态、设计决策、安装方式、剩余待办一次性交接清楚，
> 以便后续在 **Claude Code** 中直接打开 `team-flow/` 目录继续开发，无需回看历史对话。
> 最后更新：2026-07-28

---

## 0. 这是什么 / 目标

`team-flow` 是一个**统一插件**，把九套能力合并进一个 `plugin.json`，一次安装即加载全部 23 个 skill + 15 个 agent，覆盖
「需求探索 → PRD → 架构增量 → 本地原型 → spec 驱动实现 → 复利回写 → e2e 测试 → session 交接 → 反馈闭环」的完整工作流。

| 来源 | 并入范围 | skill 数 |
|---|---|---|
| **team-flow**（底座，v0.10.0） | 全部 9 个 spec 驱动开发 skill | 9 |
| **compound-engineering 核心子集** | ce-brainstorm / ce-plan / ce-compound / ce-strategy / ce-ideate / ce-proof | 6 |
| **architecture-design**（4A+DDD 增量设计） | 整个 skill | 1 |
| **prototype**（本地 HTML 原型） | 整个 skill | 1 |
| **design-system**（设计系统管理） | 整个 skill | 1 |
| **workflow-orchestrator**（产品级编排） | 整个 skill | 1 |
| **workflow-bootstrap**（项目接入） | 整个 skill | 1 |
| **e2e**（端到端测试） | 整个 skill | 1 |
| **session-handoff**（session 交接） | 整个 skill | 1 |
| **workflow-feedback**（反馈闭环） | 整个 skill | 1 |
| **合计** | | **24 skills + 15 agents** |

- 零运行时外部依赖（team-flow 底座自包含）。
- prototype 额外**零外部依赖、可离线**（自包含 HTML + 页面内 Tweaks 控件，无 CDN）。
- 插件保持通用：所有风格由项目 `design-system.md` / `prd.template` 注入，不固化任何公司/产品风格。
- 支持 11 安装面：Claude Code、Cursor、OpenAI Codex CLI/App、GitHub Copilot CLI、Gemini CLI、OpenCode、WorkBuddy、Trae、ima-copilot、ZCode、RooCode、Amazon Q、Windsurf、Continue、Kiro、Pi、Qwen、Qoder。

---

## 1. 当前状态（v0.22.4，2026-07-28）

### ✅ 已完成
- [x] **品牌重命名 + 身份统一全部完成**（P1-6 三阶段全部收口）：
  - 第一阶段 v0.15.0：产品级状态文件 `.team-flow/` 化
  - 第二阶段 v0.22.3：`spec-superflow → team-flow` 全量迁移（721+ 处）
    - 包名 `spec-superflow → team-flow`
    - CLI `ssf → tf`
    - 状态文件 `.spec-superflow.yaml → .team-flow.yaml`
    - 配置文件 `spec-superflow.config.json → team-flow.config.json`
    - 脚本 `spec-superflow.mjs → team-flow.mjs`
  - 第三阶段 v0.22.4：npm 包 scope 化（解决 publish 权限冲突）
    - 包名 `team-flow → @xulthekl/team-flow`
    - author `MageByte → xulthekl`
    - 所有 npx 引用 179 处更新为 `@xulthekl/team-flow@`
- [x] **npm 发布**：`@xulthekl/team-flow@0.22.4` 已上线公共 registry
- [x] **统一插件名 `team-flow`**：所有插件清单（`plugin.json`、`.claude-plugin/`、`marketplace.json` 等 9 个安装面）已统一
- [x] **compound 核心子集（C 方案 6 个）** + architecture-design + prototype + design-system + workflow-* 等已并入
- [x] **统一 `AGENTS.md`**：合并 9 套能力、全局产物结构、SOP、配置注入、关键约束
- [x] **版本一致性检查通过**：`check-version-consistency.mjs` ✅ all files at 0.22.4
- [x] **测试全过**：`npm test` ✅ 421/421
- [x] **权威设计文档**：`docs/architecture-api-db-design-enhancement-v0.9.md`（当前 v0.9，含 §27 身份统一章节）

### ⏳ 待办（详见 §6）
- [ ] **实测 `tf runtime config --get prototype.designSystem`**（v0.3 修正 A，仍是设计假设）。
- [ ] **v1.0.0 GA 发布标准**：规划正式发布里程碑。
- [ ] **pre-commit hook 检测未发布版本**：§27.3 step 9 设计，防止本地版本领先 npm。

---

## 2. 目录结构与关键文件

```
team-flow/
├── HANDOFF.md                 # 本文件（最后更新 2026-07-28）
├── plugin.json                # 顶层插件清单（name=team-flow, version=0.22.4）
├── package.json               # npm 包（name=@xulthekl/team-flow）
├── .claude-plugin/
│   ├── plugin.json            # ★ Claude Code 实际读取的清单
│   └── marketplace.json
├── .cursor-plugin/  .codex-plugin/  .github/plugin/  .agents/plugins/  .opencode/plugins/
│                             # 各宿主安装面清单（均已统一为 team-flow）
├── AGENTS.md                  # 插件级机制说明（九套合一 + SOP + 配置注入）
├── README.md / INSTALL.md     # 顶层说明 / 多安装面安装指南
├── scripts/                   # tf 运行时 + 各宿主安装器 + 版本一致性检查
│   ├── team-flow.mjs          # ★ CLI 入口（bin: tf / team-flow）
│   └── check-version-consistency.mjs   # CI 守卫：所有 manifest 版本须=package.json
├── src/ dist/                 # team-flow TypeScript 底座（schema/parsing/validation）
├── skills/                    # ★ 23 个 skill（开发重点目录）
│   ├── workflow-start … bug-investigator    # 底座 9 个
│   ├── ce-brainstorm … ce-proof             # compound 核心 6 个
│   ├── architecture-design                  # 4A+DDD 增量设计
│   ├── prototype                            # 本地 HTML 原型
│   ├── design-system                        # 设计系统管理
│   ├── workflow-orchestrator                # 产品级编排
│   ├── workflow-bootstrap                   # 项目接入
│   ├── e2e                                  # 端到端测试
│   ├── session-handoff                      # session 交接
│   └── workflow-feedback                    # 反馈闭环
├── agents/                    # 15 个顶层 agent
├── docs/                      # 设计文档 + 上游文档
│   ├── architecture-api-db-design-enhancement-v0.9.md  # ★ 权威设计规格（当前版本）
│   ├── prototype-design-research.md                    # 原型方案调研
│   ├── state-machine.md / artifact-contract.md / decision-points.md …
├── hooks/  templates/  tests/  assets/  llms.txt  GEMINI.md  .claude/
```

**设计权威来源**（改方案前必读）：
- `docs/architecture-api-db-design-enhancement-v0.9.md` —— v0.9 当前权威版本（含 §27 身份统一章节）
- `docs/prototype-design-research.md` —— 原型五方案事实对比与「零外部依赖」结论

---

## 3. 关键设计决策（ADR 速记）

1. **插件名 = `team-flow`**（用户拍板）。
2. **npm 包名 = `@xulthekl/team-flow`**（scoped，解决 publish 权限冲突；author = `xulthekl`）。
3. **compound 范围 = 核心子集（C 方案，6 个）**，非全量 33。理由：避免 27 个嵌套 agent 全部并入导致膨胀；6 个核心已覆盖「头脑风暴→PRD→全局复利→策略→创意→验证」主链路。
4. **compound 的 agent 随所属 skill 自动并入**：嵌套在各 skill 内部的 `references/agents/*.md`，作为运行时子代理，非独立顶层 agents。
5. **CLI = `tf`**（bin 同时暴露 `team-flow` 别名）。CLI 调用统一用 `tf <subcmd>`（全局安装后直接可用，版本由 session-start hook 自动同步）。
6. **状态文件 = `.team-flow.yaml`**（扁平，每 change 一份）。
7. **配置文件 = `team-flow.config.json`**（插件层扩展字段：`prd.template` / `prototype.designSystem` / `prototype.entry`）。
8. **版本同步机制**：`npm run version <x.y.z>` 自动更新 package.json + 所有 manifest + 所有 skill npx 引用 + phase-guard.md / llms.txt / GEMINI.md 版本戳。

### v0.3 三条专家评审修正（已采纳）
- **修正 A（§15.4）**：明确扩展字段非原生 schema，需实测 `tf runtime config --get prototype.designSystem` 是否真能读。
- **修正 B（§11）**：`arch-merge` → `prototype-sync` **顺序提交**（同一 change closing 内）。
- **修正 C（§15.3）**：原型膨胀防控（components/ 复用 design-system，禁内联漂移）+ 分支约定。

---

## 4. 在 Claude Code 中安装 / 继续开发

### 4.1 本地安装（开发态）
```bash
cd team-flow
claude  # 启动 Claude Code
/plugin add /absolute/path/to/team-flow   # 本地路径安装
```

### 4.2 项目级配置注入
项目根 `team-flow.config.json`：
```json
{
  "artifacts": { "order": ["proposal","specs","design","tasks"], "skip": [] },
  "prd": { "template": ".team-flow/prd.template.md" },
  "prototype": {
    "designSystem": "prototype/design-system.md",
    "entry": "prototype/index.html"
  }
}
```
读取：`tf runtime config --get prototype.designSystem`

### 4.3 开发与验证命令
```bash
npm install
npm run build          # tsc 编译 src/ → dist/
npm test               # node --test 集成测试（421 个）
npm run validate       # 校验 artifacts
npm run check-versions # 版本一致性守卫（当前应 ✅ 全 0.22.4）
```

---

## 5. 关键机制与 SOP

### 5.1 全局产物结构
```
requirement/            PRD + 台账（有版本 v1→v2→v3，git 分支隔离）
prototype/             全局原型系统（UI 契约真相源）
docs/architecture/     全局架构锚点
specs/<cap>/            每变更设计/任务/契约
STRATEGY.md CONCEPTS.md 产品策略(BA) / 领域词汇
```

### 5.2 标准工作流（SOP）
```
模糊需求
  → [workflow-bootstrap]（一次性，已有 baseline.md 则跳过）
  → [workflow-orchestrator]
  → S1 路径路由器 → 需求选择 + 判断入口路径
  → S2 PRD + 原型 → ce-brainstorm + prd-completeness-reviewer + prototype
  → S3 计划 → ce-plan → plan.md
  → S4 拆分验证与分发 → change-split-auditor 审计
  → S5 全局监控（change≥2 必选）
  → 每个 change：team-flow 8 态状态机
       exploring → specifying → bridging → approved-for-build → executing → closing
  → change 完成：arch-merge → prototype-sync → 复利晋升
```

### 5.3 关键约束
- **原型全局一份**、与 PRD 同级、git 分支隔离版本
- **design.md 不可变**：架构增量经 `arch-merge` 回写全局
- **顺序提交**：`arch-merge` → `prototype-sync`（同一 change closing 内）
- **膨胀防控**：`prototype/components/` 必须复用 `design-system.md`
- **分支约定**：原型随 PRD 当前版本分支维护

### 5.4 team-flow 8 态状态机
`exploring → specifying → bridging → approved-for-build → executing → closing`（另有 `onboarding` / `archived`）。
详见 `docs/state-machine.md`。

---

## 6. 剩余待办 / 已知项（按优先级）

### P1 —— 质量与验证
- [ ] **实测 v0.3 修正 A**：验证 `tf runtime config --get prototype.designSystem` 真能读到扩展字段
- [ ] **验证 23 个 skill 被各宿主正确发现加载**（`.claude-plugin/plugin.json` 的 `skills: "./skills/"` 路径）

### P2 —— 发布与治理
- [ ] **pre-commit hook 检测未发布版本**：防止本地版本领先 npm 公共源（§27.3 step 9 设计）
- [ ] **v1.0.0 GA 发布标准规划**：里程碑定义、稳定性标准、正式发布公告
- [ ] **marketplace.json 注册**：Claude Code / Cursor / GitHub 等 plugin marketplace 如需注册项，确认包名与元数据

### P3 —— 可选
- [ ] **用户文档迁移指引**：给已安装旧版用户一个迁移说明（`tf doctor` 自动迁移已有，评估是否足够）
- [ ] **外部文档同步**：GitHub repo README、npm 主页描述同步新包名

---

## 7. 继续开发的最小路径（Claude Code）

1. 打开 `team-flow/` 目录启动 Claude Code。
2. `/plugin add ./`（或绝对路径）加载插件；新会话会注入 `AGENTS.md` + `GEMINI.md` 上下文。
3. 读 `HANDOFF.md` + `docs/architecture-api-db-design-enhancement-v0.9.md` 建立全局认知。
4. 想改能力 → 改 `skills/<name>/SKILL.md`（或 `references/`）；想改运行时 → 改 `src/` 后 `npm run build`。
5. 改完跑 `npm run check-versions` 与 `npm test` 守门。

---

## 8. 身份统一历史（P1-6 三阶段）

| 阶段 | 版本 | 时间 | 内容 |
|------|------|------|------|
| 第一阶段 | v0.15.0 | 2026-07 | 产品级状态文件 `.team-flow/` 化 |
| 第二阶段 | v0.22.3 | 2026-07-27 | spec-superflow → team-flow 全量迁移（721+ 处）|
| 第三阶段 | v0.22.4 | 2026-07-27 | npm 包 scope 化 `@xulthekl/team-flow`，发布 npm |

详细记录见 `CHANGELOG.md` 与 `docs/architecture-api-db-design-enhancement-v0.9.md` §27。

---

## 9. 交付物清单（本次 workspace）

- `team-flow/` —— 统一插件工程（本 handoff 的载体）。
- `architecture-api-db-design-enhancement-v0.9.md` / `prototype-design-research.md` —— 权威设计文档。
- `skills/` —— 23 个 skill 全部就位。
- `agents/` —— 15 个顶层 agent。
- `@xulthekl/team-flow@0.22.4` —— 已发布 npm 公共源。
