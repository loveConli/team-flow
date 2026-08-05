# AGENTS.md · team-flow

> team-flow 统一插件 = **team-flow**（spec 驱动开发）+ **compound-engineering 核心子集**（全局复利）+ **architecture-design**（4A+DDD 增量设计）+ **prototype**（本地 HTML 原型）+ **e2e**（AC 驱动 Playwright E2E）+ **workflow-orchestrator**（产品级编排）+ **workflow-bootstrap**（既有项目接入）。一次安装，七套能力协同（24 skills + 15 agents），支持 9 安装面（Claude Code, Cursor, OpenAI Codex CLI/App, GitHub Copilot CLI, Gemini CLI, OpenCode, WorkBuddy, Trae, ima-copilot）。

## What This Is

基于 team-flow 底座，并入 compound 核心子集（6 skills）+ architecture-design（1 skill）+ prototype（1 skill）+ e2e（1 skill）+ workflow-orchestrator（1 skill）+ workflow-bootstrap（1 skill），形成"既有项目接入 → 需求探索 → PRD（含原型内循环）→ 架构增量 → 本地原型 → spec 驱动实现 → E2E 验证 → 全局复利回写"的统一工作流插件。

- 零运行时依赖（team-flow 底座）
- prototype 额外 **零外部依赖、可离线**（自包含 HTML + 页面内 Tweaks 控件，无 CDN）
- 插件保持通用，所有风格由项目 `design-system.md` / `prd.template`（含配套 `prd-brainstorm-profile.md`）注入，不固化任何公司/产品风格

### 身份与依赖关系

- **team-flow**（本插件）：Claude Code / Cursor 等宿主的插件实体（`plugin.json` name = `team-flow`），包含 24 个 skills + 15 个 agents + hooks + templates
- **@xulthekl/team-flow**（npm 底座包）：team-flow 的 CLI 工具层（`package.json` name = `@xulthekl/team-flow`，bin = `tf` / `team-flow`），提供状态机、校验、复利 CLI 等运行时能力
- 关系：team-flow 插件 **包含** @xulthekl/team-flow npm 包作为底座（同一仓库、同一版本）。skills 中的 `tf ...` 调用的是已全局安装的 @xulthekl/team-flow CLI，版本由 session-start hook 自动同步
- 历史身份（已废弃）：`spec-superflow`（npm 包名，0.11.0 后停止发布）/ `ssf`（CLI 前缀）/ `.spec-superflow.yaml`（状态文件）—— 详见设计增强方案 v0.9 §27

## Commands

```bash
# Build TypeScript（team-flow 底座）
npm run build

# Run integration tests
npm test

# Run single test (Node 20+ native test runner)
node --test tests/e2e.test.mjs --test-name-pattern="parseDeltaSpec"

# Validate artifacts (uses docs/examples/ data)
npm run validate
```

## 能力概览（九套合一，24 skills）

### 1. team-flow（底座，9 skills）
spec 驱动开发过程。8 态变更机：`exploring → specifying → bridging → approved-for-build → executing → closing`（另有 `debugging` 侧路径 + `abandoned` 终态）。
- `workflow-start` 启动 / `need-explorer` 需求探索 / `spec-writer` 写 spec / `contract-builder` 构建执行契约 / `build-executor` TDD 实现 / `code-reviewer` 代码审查 / `spec-merger` 合并 delta spec / `release-archivist` 发布归档 / `bug-investigator` bug 调查

### 2. compound-engineering 核心子集（6 skills，全局复利）
- `ce-brainstorm` 需求头脑风暴 / `ce-plan` PRD 规划 / `ce-compound` 全局复利回写 / `ce-strategy` 策略锚点(`STRATEGY.md`) / `ce-ideate` 设计创意 / `ce-proof` 验证证明
- 变更后由 `ce-compound` / `ce-strategy` 将结论复利回写全局 `STRATEGY.md` / `CONCEPTS.md`

### 3. architecture-design（1 skill，4A+DDD 增量设计）
- 4A 企业架构 + DDD 领域驱动；识别聚合/限界上下文、CQRS 读写模型、API 指令映射
- 每 change 增量设计，经 `arch-merge` 顺序提交回写全局 `docs/architecture/`（ARCHITECTURE.md / DATABASE.md / `<bc>/`），复利真相源

### 4. prototype（1 skill，本地 HTML 原型，v0.15.0 内部编排重构）
- 全局一份 `prototype/`（与 PRD 同级，git 分支隔离），零外部依赖、可离线
- **v0.37.0 版本 worktree 隔离**：原型独立仓库（有远程），版本分支 `prd-vN` 的 worktree 由 `tf prototype branch <prd-vN>` 创建/复用（隔离 + 团队拉取），版本收尾 `tf prototype deisolate <prd-vN> --merge --clean` merge 回主干（§68.4）；原型 worktree 布局 `<workspace>/.worktrees/<prd-vN>/prototype/`
- **内部编排器（v0.15.0）**：主代理只编排不实施——环境探查(`prototype-env-scout`)→方案/人工评审→绘制(`prototype-builder`)→评审(`prototype-reviewer`)→循环→人工路由
- **v0.20.0 产出质量闸门**：builder→reviewer 间主代理强制 `test -f && test -s` 校验入口产物落盘（不信 status=done 字面值，缺失则 resume，不空转评审）；后台子代理依赖 `<task-notification>` 完成通知，禁反复 `TaskOutput(block=true)` 轮询（设计 §22）
- **v0.21.0 决策点中继（stop-and-resume）**：子代理（无 AskUserQuestion）决策点经 `SendMessage(to: main)` 发问即停，主代理收 task-notification 代问用户、回传自动 resume 子代理续跑；主代理须维护请求-应答匹配（设计 §22.1.1，修订 §18.1.2，LT 实证确认）
- 设计系统生命周期：首次创建(`design-system-architect`)→引用→增量更新（变更履历）；设计系统渲染读取 `design-system.md`（9 段 schema + 5 方向调色板）
- change 完成经 `prototype-sync` 回写全局 `prototype/` + `design-system.md`（写入路由到子代理）

### 5. e2e（1 skill，v0.10.0 新增）
- AC 驱动 Playwright E2E 测试：从 spec 验收场景生成测试、执行并审计覆盖率
- 用法：`/e2e [原型|集成|验收] [spec路径]`

### 6. workflow-orchestrator（1 skill，产品级编排，v0.7 重设计 + v0.15.0 多需求）
- 编排产品级工作流：S1 路径路由（含需求选择）→ S2 PRD+原型（循环上提，orchestrator 直接编排，**冻结前 PRD 完整性评审**）→ S3 ce-plan（pipeline 快速路径，**入口问定 plan_mode**）→ **ARCH 产品级架构设计（v0.36.0：architecture-design product 模式 8 步 → iterations/vN/architecture.md 快照 → 评审门 PASS 才进 S4）** → S4 拆分验证+分发 → S5 全局监控
- v0.7 关键变更：原型循环从 ce-brainstorm 内部上提到 orchestrator 层直接编排；新增反馈环路（vN 内修订+变更履历，非升版）；新增增量入口（S1 路径路由器，**7 种入口路径**，v0.20.0 增「原型补跑/重跑」）；S5 多 change 并行时必选
- **v0.20.0**：S1 路由新增第 7 种入口「原型补跑/重跑」（PRD 冻结 ∧ prototype 缺失/需重做 → 部分重入 S2 原型循环，PRD 不动、保留有效 S3/S4）；后台子代理等待范式（依赖完成通知，禁 TaskOutput 轮询）（设计 §22）
- **v0.15.0 多需求并行**：`.team-flow/registry.yaml` 注册表 + 每需求一份 `.team-flow/requirements/<req-id>/orchestrator.yaml`，状态天然隔离
- 与 workflow-start 分层：orchestrator 管"做什么、什么顺序"（产品级策略），workflow-start 管"怎么做"（变更级执行）

### 7. workflow-bootstrap（1 skill，既有项目接入，v0.15.0 脚本+子代理侦察）
- 一次性"侦察 + 基线建立"：代码库侦察 → 架构基线文档化 → 领域词汇提取 → 目录初始化 → 进入 workflow-orchestrator
- **B1 侦察（v0.15.0）**：先跑确定性脚本 `scripts/recon-probe.sh`（可复现固定化采集）→ 并行派发 `codebase-recon-analyst` 子代理语义增强 → 主代理汇总写 baseline.md
- 仅首次使用时执行；`docs/architecture/baseline.md` 已存在则跳过

### 8. session-handoff（1 skill，会话交接，v0.16.0 新增）
- 上下文腐化时将当前会话压缩为结构化交接文档（10 节），供新会话无缝继续
- 自动检测 `.team-flow/` 状态文件构建工作流快照；无状态文件时降级为通用 handoff
- 输出到 `.team-flow/handoffs/`（.gitignore，临时性质）；引用产物路径，不复制内容
- 区别于 change 级 `tf handoff`（任务委派）和 `.team-flow/` yaml（结构化状态自动恢复）

### 9. workflow-feedback（1 skill，工作流反馈，v0.16.0 新增）
- 记录工作流使用中的问题（10 类分类），转化为可追踪的改进项
- 与 ce-compound 互补：ce-compound 是"经验沉淀端"，workflow-feedback 是"问题发现端"
- 输出到 `.team-flow/feedback/`（git 跟踪，改进输入持久化）
- release-archivist 收尾时联动建议触发

## 全局产物结构（Discoverability —— 设计/开发前先检索）

```
.team-flow/             状态文件（v0.15.0，原 .workflow-orchestrator.yaml 迁入）
  ├── registry.yaml             # 需求注册表（多需求并行 + active_requirement）
  ├── requirements/<req-id>/orchestrator.yaml  # 每需求产品级编排状态
  ├── handoffs/                 # 会话交接文档（v0.16.0 新增，session-handoff 产出，.gitignore）
  └── feedback/                 # 工作流问题记录（v0.16.0 新增，workflow-feedback 产出，git 跟踪）
prd/                    PRD（有版本 v1→v2→v3，git 分支隔离）
  └── vN/
      ├── prd.md              # 业务要件（ce-brainstorm 产出）
      ├── plan.md             # 实施方案（ce-plan 产出，产品级策略）
      └── prototype-review.md # 原型审查记录（PRD 内循环产出）
      ├── prototype-auto-review.md # 原型自动评审报告（prototype-reviewer agent 产出，编排层落盘，v0.7 新增）
      ├── prd-completeness-review.md # PRD 完整性评审报告（prd-completeness-reviewer 产出，v0.15.0 新增）
prototype/             全局原型系统（UI 契约真相源）：index.html / pages / components / assets / design-system.md / flow.md
docs/
  ├── architecture/    全局架构三层（v0.36.0）：L1 当前态（ARCHITECTURE.md marker 区 / PHYSICAL-MODEL.md / DATABASE.md / API-INDEX.md / INDEX.md / domains/<bc>.md / diagrams/ / schema-baseline.sql / baseline.md）+ L2 changelog/ + L3 iterations/vN/architecture.md（产品级快照，archived 退役）
  └── solutions/       复利经验库（v0.5 新增，三层索引）
      ├── INDEX.md     # L1 轻量索引（≤150行，每条一行摘要+标签）
      ├── prd/ plan/ architecture/ prototype/ spec/ build/ review/ cross-phase/  # L2 分阶段目录（v0.36.0 加 architecture）
      └── <file>.md    # L3 经验文件（YAML frontmatter: phase/domain/type/severity）
changes/<name>/        变更脚手架（S4 创建）：.team-flow.yaml（变更级状态文件）/ change-brief.md（产品级交接物，含 upstream_arch_ref）/ architecture/（变更级三件套 + sql/）
specs/<cap>/            每变更设计/任务/契约：spec.md / design.md / tasks.md / execution-contract.md / learnings.md（v0.9 起 architecture/ 三件套已迁至 changes/<name>/architecture/）
STRATEGY.md CONCEPTS.md 产品策略(BA) / 领域词汇
```

## 标准工作流（SOP，v0.7 修订，v0.15.0 增补）

```
模糊需求
  │
  ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  既有项目接入层（workflow-bootstrap，一次性，baseline.md 已存在则跳过）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  B1 代码库侦察（recon-probe.sh 脚本 + codebase-recon-analyst 并行子代理）
     → B2 架构基线文档化 → B3 领域词汇提取 → B4 目录初始化
  │
  ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  产品级编排层（workflow-orchestrator，v0.7 重设计 + v0.15.0 多需求）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  S1 路径路由器 → 需求选择（.team-flow/registry.yaml）+ 判断入口路径
     检查 baseline.md / CONCEPTS.md → 注入上下文 + 复利注入（top-5）
  S2 PRD + 原型阶段 → ce-brainstorm 产出 PRD
     冻结前 PRD 完整性评审（prd-completeness-reviewer，v0.15.0）
     原型循环由 orchestrator 直接编排（prototype skill 内部编排器，主代理只编排）：
     env-scout → builder 绘制 → reviewer 评审 → 人工评审 → 冻结
     PRD vN 内修订 + 变更履历（不升版）；反馈环路：scope 问题可回退修订
  S3 计划阶段 → ce-plan（pipeline 快速路径，入口问定 plan_mode）
     plan.md：change 拆分 + 依赖 DAG + 高阶技术方向（不含接口清单）
     反馈环路：plan 暴露 PRD 问题可回退 S2
  [ARCH 产品级架构设计（v0.36.0）] → architecture-design product 模式 8 步设计
     → docs/architecture/iterations/vN/architecture.md（6 产物快照，预测态不写全局）→ 评审门 PASS 才进 S4
     skip 须物化（iterations/vN/SKIPPED）；旧项目首轮 arch_baseline 缺失 → 逆向重建
  S4 拆分验证与分发 → arch-readiness 门（快照覆盖 change 触及 BC）→ change-split-auditor 审计（必选门禁）→ 创建 change → 进入 team-flow
     并行策略建议 + 验收标准预分配；反馈环路：依赖图不可执行可回退 S3
  S5 全局监控（change≥2 必选）→ 跨 change 一致性 + 复利晋升 + 动态重规划
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

## Skills 索引（24 个）

| Skill | 归属 | 用途 |
|---|---|---|
| workflow-start | team-flow | 启动工作流（8 态状态机入口） |
| need-explorer | team-flow | 需求探索 |
| spec-writer | team-flow | 写 spec |
| contract-builder | team-flow | 构建执行契约 |
| build-executor | team-flow | TDD 实现 |
| test-strategy | team-flow | 测试设计方法论（design_method 三级分层 + 对抗验证 + 复杂度分级，v0.12 §41） |
| code-reviewer | team-flow | 代码审查 |
| spec-merger | team-flow | 合并 delta spec |
| release-archivist | team-flow | 发布归档 |
| bug-investigator | team-flow | bug 调查 |
| ce-brainstorm | compound | 需求头脑风暴 |
| ce-plan | compound | PRD 规划（产品级策略） |
| ce-compound | compound | 全局复利回写（三层索引） |
| ce-strategy | compound | 策略锚点 |
| ce-ideate | compound | 设计创意 |
| ce-proof | compound | 验证证明 |
| architecture-design | architecture-design | 4A+DDD 增量设计 |
| prototype | prototype | 本地 HTML 原型 |
| design-system | design-system | 项目级设计系统独立创建/迭代（用户主导交互，base+变体，v0.19.0） |
| e2e | e2e | AC 驱动 Playwright E2E 测试（v0.10.0） |
| workflow-orchestrator | 产品级编排 | 产品级工作流编排（v0.7 重设计） |
| workflow-bootstrap | 既有项目接入 | 既有项目侦察+基线建立（v0.6） |
| session-handoff | 会话交接 | 上下文腐化时压缩会话为交接文档（v0.16.0） |
| workflow-feedback | 工作流反馈 | 工作流问题结构化记录（v0.16.0） |

### 触发域分层（v0.12.0 新增）

各 skill 按触发层级划分，避免触发词冲突导致误路由：

| 层级 | 入口 Skill | 触发域 | 说明 |
|------|-----------|--------|------|
| 接入层 | workflow-bootstrap | "初始化/接入/分析代码库" | 一次性，触发词独特，无冲突 |
| 产品级（唯一入口） | **workflow-orchestrator** | 新的产品级需求（"新需求/从头开始/我有个想法/做一个XX"） | 拥有所有"产品级新需求"触发词，内部路由到 ce-brainstorm/ce-plan |
| 变更级（唯一入口） | workflow-start | change 上下文内的操作（.team-flow.yaml） | 有强上下文约束，与产品级天然隔离 |
| 步骤级 - 独立工具 | ce-ideate, ce-strategy, ce-compound, ce-proof, architecture-design, prototype, e2e, session-handoff, workflow-feedback | 各自独特触发词 | 无冲突，可独立触发 |
| 步骤级 - 受限独立 | ce-brainstorm, ce-plan | 可独立触发，但产品级新需求应走 orchestrator | description 中标注路由指导 |
| 步骤级 - 仅路由 | need-explorer, spec-writer, contract-builder, build-executor, code-reviewer, spec-merger, release-archivist, bug-investigator | 仅由 workflow-start 路由 | 不独立触发 |

> **规则**：新增 skill 时必须在此表登记所属层级。产品级新需求触发词归 workflow-orchestrator 独占。

### Agents 索引（v0.7 新增，v0.30.0 增至 15 个）

> **agent 文件设计规范见 CONTRIBUTING.md §6 + `templates/agent-template.md`**（v0.33.0）：frontmatter 必须合法 YAML（非法时 Claude Code 静默降级，skills: 预加载与 tools: 限制全部失效）；description 单句、禁 `<example>` 块；新增/修改 agent 必过 frontmatter-lint + 实证探针。

| Agent | 职责 | Tools | 触发场景 |
|-------|------|-------|---------|
| architecture-design | 架构设计门控 agent——五项检查 + 三件套产出 + SQL 制品（workflow-start 子代理调用，判断+执行一体化） | Read/Bash/Grep/Glob/Write | workflow-start exploring→specifying 状态转换时（架构设计门控，v0.27.2） |
| architecture-reviewer | 架构设计自动审查 agent——6 维度审查（A1-A6）+ 只读 + 独立上下文（架构设计产出后自动审查，≤3 轮循环修正） | Read/Bash/Grep/Glob | architecture-design 三件套产出后自动触发（只读审查，v0.27.2） |
| bug-investigator | 科学方法根因调查（执行期 bug/测试失败） | Read/Bash/Grep/Glob/Write | build-executor 遇阻、DP-5 升级 |
| change-split-auditor | plan.md 拆分质量审计 | Read/Bash/Grep/Glob | orchestrator S4 脚手架前（必选门禁，PASS 方可继续） |
| code-reviewer | spec 合规审查（批次完成/合并门禁） | Read/Bash/Grep/Glob | build-executor 批次完成、release-archivist 合并前 |
| cross-change-consistency-checker | 跨 change 冲突检测 | Read/Bash/Grep/Glob | orchestrator S5 多 change 并行/closing 时 |
| prd-completeness-reviewer | PRD 完整性评审（能否支撑 plan/spec，5 维度） | Read/Bash/Grep/Glob | orchestrator S2 / ce-brainstorm 冻结前门禁（v0.15.0） |
| prototype-builder | 原型绘制执行者（种子优先：template.html+layouts.md 组合；**v0.20.0 产物落盘硬闸门**：index.html 未落盘非空禁返 done + 大产出分片；**v0.21.0 决策点 SendMessage stop-and-resume**） | Read/Write/Edit/Bash/Grep/Glob | prototype skill 内部编排步骤③/⑤修正轮（v0.15.0，v0.18.0 种子优先） |
| prototype-env-scout | 原型环境探查 + 2-3 差异化方向（direction-picker；**v0.20.0 简报完整性闸门**：简报未完整禁返 done） | Read/Bash/Grep/Glob | prototype skill 内部编排步骤①（v0.15.0，v0.18.0 direction-picker） |
| prototype-reviewer | PRD 6 维度 + P0 grep + craft 4 席 rubric 评审 | Read/Bash/Grep/Glob | orchestrator S2 原型循环每轮产出后 |
| need-explorer | 需求探索 agent——交互式澄清意图/scope/约束/成功标准，稳定 change 定义、守 DP-1 门（只读型，不产出制品不写代码；workflow-start 路由后、spec-writer 前） | Read/Bash/Grep/Glob | workflow-start 路由，主进程交互式澄清 |
| spec-writer | 规格编写 agent——产出并打磨 proposal.md / specs/ / design.md / tasks.md 四件规划制品（可写型，规划制品唯一所有者；need-explorer DP-1 后、contract-builder 前） | Read/Bash/Grep/Glob/Write/Edit | workflow-start 路由时作为子代理 dispatch |
| contract-builder | 执行契约 agent——将规划制品压缩为单一执行握手 execution-contract.md、守 DP-3 批准门（可写型，契约文件唯一所有者；spec-writer DP-2 后、build-executor 前） | Read/Bash/Grep/Glob/Write/Edit | workflow-start 路由时作为子代理 dispatch |
| build-executor | 构建执行 agent——以契约为权威驱动 TDD 批次实施（SDD/Inline/Batch Inline）、守 TDD Iron Law（可写型，实施代码所有者；契约 DP-3 批准后、release-archivist 前） | Read/Bash/Grep/Glob/Write/Edit | workflow-start 路由时作为子代理 dispatch |
| release-archivist | 发布归档 agent——执行验证、产出 closing 总结、完成归档就绪（arch-merge → prototype-sync → 复利晋升）（可写型，归档制品所有者；build-executor 后、change 关闭前） | Read/Bash/Grep/Glob/Write/Edit | workflow-start 路由时作为子代理 dispatch |

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
| **注入** | 进入每阶段时，自动加载相关经验（top-5） | `tf solutions inject --phase <p> --domain <d>` |
| **捕获** | 阶段转换点检测到可复利时刻 | `tf solutions capture --phase <p> --domain <d> --type <t> --severity <s> --summary "<text>"` |
| **索引重建** | INDEX.md 损坏或手动触发 | `tf solutions index-gen` |
| **晋升** | change closing 时，经验验证后晋升为产品级 | `tf solutions promote <change-dir>` |

### 关键约束

- 所有复利操作为 **advisory 级**，INDEX.md 读取失败时静默跳过，不阻断流程
- INDEX.md 硬上限 150 行，超限时按 severity 降序保留，淘汰 low + 最早条目
- 晋升条件：severity ≥ medium 且 type = pitfall/pattern；与全局已有条目 domain+type 匹配则标记"已确认模式"并升级 severity
- 上下文占用控制：最坏 ~6.5k token（L1 索引全量加载）

## 配置注入（插件层扩展字段）

项目 `team-flow.config.json` 可注入（**插件层扩展字段，非 team-flow 原生 schema**；原生仅 `artifacts.order` / `artifacts.skip`）：

- `prd.template`：PRD 模板路径（默认 `templates/prd.md`，GTMC D7 业务要件 11 章结构）。ce-brainstorm Phase 0.0 首次运行时若未配置，会交互式询问用户选择默认模板或自定义路径，并自动写入配置。自定义模板应配套 brainstorm profile（`<模板名>-brainstorm-profile.md`），否则回退使用内置默认的 GTMC D7 profile
- `prototype.designSystem`：项目 `design-system.md` 路径
- `prototype.entry`：原型入口（默认 `prototype/index.html`）

读取方式：`tf runtime config --get <key>`（插件层自读，字段命名避开原生 key 冲突）。`prd.template` 已纳入 DEFAULTS（`config-loader.mjs`），未配置时返回默认值而非报错。

## Architecture（team-flow 底座，TypeScript）

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
