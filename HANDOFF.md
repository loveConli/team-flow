# team-flow · Handoff 文档（Claude Code 继续开发用）

> 本文件用于把「team-flow 统一插件」的当前状态、设计决策、安装方式、剩余待办一次性交接清楚，
> 以便后续在 **Claude Code** 中直接打开 `team-flow/` 目录继续开发，无需回看历史对话。
> 最后更新：2026-07-20

---

## 0. 这是什么 / 目标

`team-flow` 是一个**统一插件**，把四套能力合并进一个 `plugin.json`，一次安装即加载全部 17 个 skill，覆盖
「需求探索 → PRD → 架构增量 → 本地原型 → spec 驱动实现 → 全局复利回写」的完整工作流。

| 来源 | 并入范围 | skill 数 |
|---|---|---|
| **team-flow**（底座，v0.10.0） | 全部 9 个 spec 驱动开发 skill | 9 |
| **compound-engineering 核心子集（C 方案）** | ce-brainstorm / ce-plan / ce-compound / ce-strategy / ce-ideate / ce-proof | 6 |
| **architecture-design**（4A+DDD 增量设计） | 整个 skill | 1 |
| **prototype**（本地 HTML 原型，新建） | 整个 skill（含脚手架） | 1 |
| **合计** | | **17** |

- 零运行时外部依赖（team-flow 底座自包含）。
- prototype 额外**零外部依赖、可离线**（自包含 HTML + 页面内 Tweaks 控件，无 CDN）。
- 插件保持通用：所有风格由项目 `design-system.md` / `prd.template` 注入，不固化任何公司/产品风格。
- 支持 9 安装面：Claude Code、Cursor、OpenAI Codex CLI/App、GitHub Copilot CLI、Gemini CLI、OpenCode、WorkBuddy、Trae、ima-copilot。

---

## 1. 当前状态

### ✅ 已完成
- [x] 以 `team-flow` 工程为底座复制出 `team-flow/`（目录、`.claude-plugin/`、scripts、dist、hooks 等齐全）。
- [x] **统一插件名 `team-flow`**：所有插件清单（顶层 `plugin.json`、`.claude-plugin/`、`marketplace.json`、`.cursor-plugin/`、`gemini-extension.json`、`.github/plugin/marketplace.json`、`.agents/plugins/marketplace.json`）的 `name` 已改为 `team-flow`，作者改为 `LT`，homepage/repository 指向 `https://github.com/LT/team-flow`。
- [x] **compound 核心子集（C 方案 6 个）** 已复制到 `team-flow/skills/`，architecture-design 一并复制（排除 ima 嵌套冗余副本）。
- [x] **新建 `prototype` skill**：`skills/prototype/SKILL.md` + `references/prototype-scaffold/`（6 文件：index.html / design-system.md / flow.md / assets/design-tokens.css / components/button.html / pages/index.html）。
- [x] **统一 `AGENTS.md`**：合并 team-flow 8 态机 + compound 核心 6 skill + architecture-design（4A/DDD）+ prototype 四套机制、全局产物结构、SOP、配置注入、关键约束。
- [x] `README.md` / `INSTALL.md` 已改写为 team-flow 顶层说明。
- [x] **版本一致性检查通过**：`node scripts/check-version-consistency.mjs` → ✅ all files at 0.10.0。
- [x] 两份权威设计文档已归入 `docs/`（`architecture-api-db-design-enhancement-v0.3.md`、`prototype-design-research.md`）。

### ⏳ 待办（详见 §6）
- 品牌重命名残留（package.json name、GEMINI.md/phase-guard 头部、INSTALL.md marketplace URL、`npx team-flow@0.10.0` 调用、CHANGELOG）。
- 实测 `tf runtime config --get prototype.designSystem`（v0.3 修正 A）。
- 跑通 `npm test` / `npm run validate`（开发期尚未执行）。
- 验证 17 个 skill 在 Claude Code/各宿主被正确加载。

---

## 2. 目录结构与关键文件

```
team-flow/
├── HANDOFF.md                 # 本文件
├── plugin.json                # 顶层插件清单（name=team-flow, version=0.10.0）
├── .claude-plugin/
│   ├── plugin.json            # ★ Claude Code 实际读取的清单（name=team-flow）
│   └── marketplace.json
├── .cursor-plugin/  .codex-plugin/  .github/plugin/  .agents/plugins/  .opencode/plugins/
│                             # 各宿主安装面清单（均已统一为 team-flow）
├── AGENTS.md                  # 插件级机制说明（四套合一 + SOP + 配置注入）
├── README.md / INSTALL.md     # 顶层说明 / 9 安装面安装指南
├── package.json               # npm 包（name 仍为 team-flow，见 §6 品牌残留）
├── scripts/                   # tf 运行时 + 各宿主安装器 + 版本一致性检查
│   └── check-version-consistency.mjs   # CI 守卫：所有 manifest 版本须=package.json
├── src/ dist/                 # team-flow TypeScript 底座（schema/parsing/validation）
├── skills/                    # ★ 17 个 skill（开发重点目录）
│   ├── workflow-start … bug-investigator   # team-flow 9 个
│   ├── ce-brainstorm … ce-proof            # compound 核心 6 个（含 references/agents/*）
│   ├── architecture-design                 # 4A+DDD 增量设计
│   └── prototype                            # 本地 HTML 原型（新建）
├── docs/                      # 设计文档 + 上游 team-flow 文档
│   ├── architecture-api-db-design-enhancement-v0.3.md  # ★ 权威设计规格（含原型章）
│   ├── prototype-design-research.md                    # 原型方案调研
│   ├── state-machine.md / artifact-contract.md / decision-points.md …
├── hooks/  templates/  tests/  assets/  llms.txt  GEMINI.md  .claude/  .codex/
```

**设计权威来源**（改方案前必读）：
- `docs/architecture-api-db-design-enhancement-v0.3.md` —— v0.3 终稿，含第十五章原型设计能力（§15.0–§15.8：五方案对比 / 两层层级模型 / 迭代模型 / 完整目录 / 配置驱动 / 本地 HTML 原型 skill / 衔接 / I/O 钉死 / 设计系统复利）。用户已于第 16 轮通过并采纳 3 条专家评审修正。
- `docs/prototype-design-research.md` —— 原型五方案事实对比与「零外部依赖」结论。

---

## 3. 关键设计决策（ADR 速记）

1. **插件名 = `team-flow`**（用户拍板）。
2. **compound 范围 = 核心子集（C 方案，6 个）**，非全量 33。理由：避免 27 个嵌套 agent 全部并入导致膨胀；6 个核心已覆盖「头脑风暴→PRD→全局复利→策略→创意→验证」主链路。
3. **compound 的 agent 随所属 skill 自动并入**：~27 个 agent 全部嵌套在各 skill 内部的 `skills/<name>/references/agents/*.md`，作为运行时子代理/研究员参考，**非独立顶层 agents**，复制 skill 目录即带入，无需单独注册。6 个核心 skill 携带 agents 数：ce-plan 15 / ce-compound 7 / ce-ideate 4 / ce-brainstorm 1 / ce-strategy 0 / ce-proof 0。
4. **版本保持 `0.10.0`**（对齐 team-flow base），不擅自 bump。理由：① `check-version-consistency.mjs` 强制所有 manifest 版本=package.json；② 运行时 `tf` 与 `npx team-flow@0.10.0` 仍指向 team-flow base，bump 需先发布 team-flow 到 npm。见 §6。
5. **配置扩展字段为插件层（非 team-flow 原生 schema）**：原生仅 `artifacts.order` / `artifacts.skip`；`prd.template` / `prototype.designSystem` / `prototype.entry` 是我们在 `team-flow.config.json` 上扩展的字段，由插件层自读（`tf runtime config --get <key>`）。

### v0.3 三条专家评审修正（已采纳）
- **修正 A（§15.4）**：明确上述扩展字段非原生 schema，需实测 `tf runtime config --get prototype.designSystem` 是否真能读。
- **修正 B（§11）**：`arch-merge` → `prototype-sync` **顺序提交**（同一 change closing 内）。
- **修正 C（§15.3）**：原型膨胀防控（components/ 复用 design-system，禁内联漂移）+ 分支约定（原型随 PRD 当前版本分支维护）。

---

## 4. 在 Claude Code 中安装 / 继续开发

### 4.1 本地安装（开发态）
```bash
# 进入 team-flow 目录，用 Claude Code 加载为插件
cd team-flow
claude  # 启动 Claude Code
/plugin add /absolute/path/to/team-flow   # 本地路径安装
# 或从仓库
git clone <your-repo> && cd team-flow && claude
/plugin add ./team-flow
```
> Claude Code 实际读取 `.claude-plugin/plugin.json`（已统一为 team-flow）。安装后自动加载 `hooks/hooks.json`，新会话注入上下文。

### 4.2 项目级配置注入
项目根 `team-flow.config.json`（注意：文件名仍沿用 team-flow，因为 `tf` 运行时只读此名，见 §6）：
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
读取：`tf runtime config --get prototype.designSystem`（插件层自读，字段命名避开原生 key 冲突）。

### 4.3 初始化本地原型（首次）
```bash
cp -r skills/prototype/references/prototype-scaffold/ <project>/prototype/
# 随后按 prototype/design-system.md 填 token；prototype/ 与 prd/ 同级、git 分支隔离版本
```

### 4.4 开发与验证命令
```bash
npm install
npm run build          # tsc 编译 src/ → dist/
npm test               # node --test 集成测试
npm run validate       # 校验 artifacts（用 docs/examples 数据）
npm run check-versions # 版本一致性守卫（当前应 ✅ 全 0.10.0）
```

---

## 5. 关键机制与 SOP

### 5.1 全局产物结构（Discoverability：设计/开发前先检索）
```
prd/                    PRD（有版本 v1→v2→v3，git 分支隔离）
prototype/             全局原型系统（UI 契约真相源）：index.html / pages / components / assets / design-system.md / flow.md
docs/architecture/     全局架构锚点：ARCHITECTURE.md / DATABASE.md / <bc>/（限界上下文目录）
specs/<cap>/            每变更设计/任务/契约：spec.md / design.md / tasks.md / execution-contract.md / architecture.md / database.md / api.md
STRATEGY.md CONCEPTS.md 产品策略(BA) / 领域词汇
```

### 5.2 标准工作流（SOP）
```
模糊需求
  → [ce-brainstorm → ce-plan 就地 enrich] → prd/vN
  → 拆 change（一份 PRD 可拆多 change）
  → team-flow: exploring → … → closing
       每 change：引用全局 prototype/ 作 UI 契约（进 execution-contract.md）
                 architecture-design 增量（As-Is 冻结 → To-Be → 复利回写）
                 api.md 经 execution-contract.md 被 build-executor 硬消费
  → change 完成：arch-merge → prototype-sync（顺序提交）复利回写全局
```

### 5.3 关键约束
- **原型全局一份**、与 PRD 同级、git 分支隔离版本；change 不直接拥有原型文件（引用全局 `prototype/` 作 UI 契约）。
- **design.md 不可变**：架构增量经 `arch-merge` 回写全局 `ARCHITECTURE.md`，不就地改 change 的 design.md。
- **顺序提交**：`arch-merge` → `prototype-sync`（同一 change closing 内），避免全局文档半更新态。
- **膨胀防控**：`prototype/components/` 必须复用 `design-system.md`，禁止页面内联样式漂移；新增组件先沉淀进 design-system 再引用。
- **分支约定**：原型随 PRD 当前版本分支维护；change 引用其所在 PRD 版本分支的 `prototype/`。

### 5.4 team-flow 8 态状态机
`exploring → specifying → bridging → approved-for-build → executing → closing`（另有 `onboarding` / `archived`）。
`workflow-start` 做内容级状态检测与非法跳变拦截；详见 `docs/state-machine.md`。

---

## 6. 剩余待办 / 已知项（按优先级）

### P0 —— 不影响安装，但建议尽快收口
- [ ] **品牌重命名残留**（当前仅 manifest 的 `name` 改了，以下仍写 `team-flow`）：
  - `package.json` 的 `"name": "team-flow"`（npm 包名；bin 暴露 `tf` 与 `team-flow`）。建议保留 bin `tf`，包名可改 `team-flow`。
  - `GEMINI.md` 第 1/3/5 行、`llms.txt` 第 1/3-5 行、`.claude/always/phase-guard.md` 第 1 行头部 `# team-flow v0.10.0 |`（**注意**：`check-version-consistency.mjs` 的 GEMINI/phase-guard 版本正则硬编码了 `team-flow`，若改头部须同步改该脚本的正则，否则一致性检查会失败）。
  - `INSTALL.md` 的 marketplace 命令 `MageByte-Zero/team-flow`、`/plugin install team-flow@team-flow`（第 44-45、53 行等）—— 要发布到 Claude Code marketplace 前必须替换。
  - 各 team-flow skill 内 `npx --yes --package @xulthekl/team-flow@0.10.0 tf`（由 `check-version-consistency.mjs` 的 RUNTIME_FILES 校验，必须保持 `team-flow@0.10.0` 直到 team-flow 发布到 npm）。
- [ ] **实测 v0.3 修正 A**：验证 `tf runtime config --get prototype.designSystem` 真能读到扩展字段（当前未跑，是设计假设）。

### P1 —— 质量与发布
- [ ] 跑通 `npm test` 与 `npm run validate`（开发期尚未执行，确认底座未因复制/改名损坏）。
- [ ] 验证 17 个 skill 被 Claude Code 与各宿主正确发现加载（`.claude-plugin/plugin.json` 的 `skills: "./skills/"` 路径）。
- [ ] 更新 `CHANGELOG.md`（当前仍为 team-flow 历史）。
- [ ] 补一张团队 flow 图（可选）。

### P2 —— 语义与发布决策
- [ ] **版本语义**：当前 0.10.0 对齐 base。要 bump 到 team-flow 自有 semver（如 0.1.0）时，须：① `npm run version <x.y.z>`（会跑 `tf version` + `check-version-consistency` + 改所有 manifest + 文本戳）；② 同步改 README/INSTALL/`docs/README_en.md`/`hooks/session-start`/`llms.txt`/GEMINI.md/phase-guard.md 里的版本戳；③ 把 `npx team-flow@` 改 `npx team-flow@`（需先 `npm publish`）。
- [ ] **注册到平台**：`ima_skill_create` 仅注册单个 skill（非插件）；team-flow 作为 plugin.json 插件通过宿主 `/plugin add` 安装，不通过 ima 平台注册。不要在未明需求时调用 `ima_skill_create`。

---

## 7. 继续开发的最小路径（Claude Code）

1. 打开 `team-flow/` 目录启动 Claude Code。
2. `/plugin add ./`（或绝对路径）加载插件；新会话会注入 `AGENTS.md` + `GEMINI.md` 上下文。
3. 读 `HANDOFF.md` + `docs/architecture-api-db-design-enhancement-v0.3.md` 建立全局认知。
4. 想改能力 → 改 `skills/<name>/SKILL.md`（或 `references/`）；想改运行时 → 改 `src/` 后 `npm run build`。
5. 改完跑 `npm run check-versions` 与 `npm test` 守门。
6. 按 §6 清单逐项收口品牌与验证。

---

## 8. 交付物清单（本次 workspace）

- `team-flow/` —— 统一插件工程（本 handoff 的载体）。
- `architecture-api-db-design-enhancement-v0.3.md` / `prototype-design-research.md` —— 权威设计文档（已复制进 `team-flow/docs/`）。
- `team-flow/`、`compound-engineering/`、`team-flow-main/`、`compound-engineering-plugin-main/` —— 上游源工程（参考/溯源用）。
- `ce.zip` / `team-flow.zip` —— 上游源 zip（溯源用）。
- `skills/architecture-design/`、`architecture-design-source/` —— 蒸馏源（已并入 team-flow/skills/architecture-design）。
