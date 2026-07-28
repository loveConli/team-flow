# Changelog

All notable changes to `team-flow` will be documented in this file.

The format loosely follows Keep a Changelog.

## [Unreleased]

## [0.24.0] - 2026-07-28

### Fixed（复利工程强制化补强，5 项）

#### P0: Hook 旧名修复
- **hooks/pre-tool-use-guard**: 修复 `.spec-superflow.yaml` → `.team-flow.yaml` 的硬编码旧名（5 处），恢复状态机编辑守卫
- **hooks/session-start**: 修复 `spec-superflow` → `team-flow` 的硬编码旧名（3 处），恢复会话启动提示

#### P1: 复利维度 guard
- **guard/checks/compound-captured.mjs**: 新增复利捕获检查维度（learnings.md 存在性或显式 compound_skipped）
- **guard/guard.mjs**: 将 `compound-captured` 维度挂到 `executing:closing` 转换（full 和 hotfix workflow）
- **state-loader.mjs**: BUILTIN_DEFAULTS 新增 `compound_skipped` 字段
- **cmd-state.mjs**: SETTABLE_FIELDS 新增 `compound_skipped` 字段，支持 `tf state set` 写入

#### P1: Bootstrap DDL 提取
- **workflow-bootstrap/scripts/recon-probe.sh**: 新增 DDL 提取能力（策略优先级：SQL 文件 > Java Entity 注解 > 占位兜底）
  - 策略 1: 扫描 `db/migration/` 等目录的 `.sql` 文件，提取 CREATE TABLE 语句
  - 策略 2: 扫描 `@Entity`/`@Table` 注解的 Java 类，提取表名和字段定义
  - 策略 3: 无 DDL 源时生成占位文件，提示手动补充
  - 新增 `--ddl-out` 参数，支持独立输出 DDL 文件
  - JSON 输出新增 `ddl_extraction` 字段（source/table_count/tables/ddl_statements）

#### P1: Bootstrap 模板引用
- **workflow-bootstrap/SKILL.md**: B2 阶段新增 Step 0（模板初始化），从 `architecture-design/templates/` 复制 5 个模板到 `docs/architecture/`
- **workflow-bootstrap/references/b1-reconnaissance.md**: 更新 B1.1a 章节，标注 DDL 提取已实现（v0.24.0），补充 CLI 用法和 JSON 输出字段说明

#### P2: solutions 脚本测试
- **tests/lib/solutions-capture.test.mjs**: 新增 6 个测试用例（文件创建、INDEX 追加、中文 slugify、默认 phase、无效 phase 拒绝）
- **tests/lib/solutions-inject.test.mjs**: 新增 8 个测试用例（空索引、phase 过滤、cross-phase 包含、domain 匹配、severity 排序、top-5 截断）
- **tests/lib/solutions-promote.test.mjs**: 新增 8 个测试用例（无 learnings、高/中/低 severity 晋升、insight 类型跳过、重复检测、多条晋升、INDEX 追加）
- **tests/lib/solutions-index-gen.test.mjs**: 新增 7 个测试用例（全量重建、severity 排序、date 排序、7 phase 扫描、非 .md 跳过、150 条截断、空目录处理）
- **scripts/lib/solutions-promote.mjs**: CLI 守卫增加 `NODE_ENV !== 'test'` 条件，避免 import 时触发 process.exit

#### 测试修复
- **tests/lib/guard.test.mjs**: `recordPassingClosingPrerequisites()` 新增 learnings.md 创建，满足 compound-captured 维度
- **tests/lib/guard-specs-merged.test.mjs**: `makeChangeDir()` 新增 learnings.md 创建
- **tests/lib/guard-tests-passing.test.mjs**: `makeChangeDir()` 新增 learnings.md 创建

### Verified

- check-version-consistency: ✅ PASS（全部 0.24.0，自动修复 6 处版本号）
- npm test: ✅ 457/457 通过（428 既有 + 29 新增）

### Statistics

- 新增代码: ~350 行（guard 检查器 + DDL 提取 + 测试用例）
- 修改文件: 52 个
- 测试覆盖: solutions 四个脚本从 0% → 100%（29 个测试用例）
- 复利强制化: executing:closing 转换新增 compound-captured 维度（learnings.md 或显式 skip）

## [0.22.5] - 2026-07-28

### Fixed（制品链评审与修复，设计 v0.9 §28）

- **state-loader.mjs**：BUILTIN_DEFAULTS 新增 `arch_design_decision` / `arch_design_reason` / `arch_design_timestamp` / `arch_design_artifacts` 四个字段，writeState() 序列化逻辑同步更新
- **cmd-state.mjs**：SETTABLE_FIELDS 新增上述四个 arch_design_* 字段，支持 `tf state set` 写入
- **architecture-design/SKILL.md**：移除错误的"状态写入"章节（职责边界应为"判断+产出"，非"判断+写入"）
- **workflow-start/SKILL.md**：新增 "State Writes" 章节，明确声明 arch_design_* 的 reasonableness check + 状态写入权责
- **ce-brainstorm/SKILL.md**：新增 "Optional Inputs" 章节，声明消费 `docs/ideation/*.md`（source: ce-ideate），修复 ideation 制品链断裂
- **workflow-start/SKILL.md Fast-Path Routing**：新增 DP-0 处理说明（hotfix/tweak 隐式跳过 DP-0，dp_0_confirmed 保持 null）

### Added（模板补全）

- **templates/change-brief.md**：新增变更简报模板，基于 s4-split-validate.md 的 brief_schema（5 个 frontmatter 字段 + 6 个 body sections）
- **templates/architecture.md**：新增架构设计模板（4A+DDD 增量设计：As-Is 基线冻结 + To-Be 增量 + 变更分叉级联 + 跨域一致性 + 演进日志）
- **templates/database.md**：新增数据库设计模板（CQRS 增量：写模型/读模型/Schema 变更/实体关系/数据迁移脚本 + 演进日志）
- **templates/api.md**：新增 API 设计模板（Command/Read/Query 分流 + 端点详细设计 + 跨域一致性检查 + 演进日志）

### Verified

- check-version-consistency：✅ PASS（全部 0.22.5）
- npm test：✅ 421/421 通过

---

## [0.22.4] - 2026-07-27

### Changed（npm 包名 scope 化，发布至 npm）

- **npm 包名**：`team-flow` → `@xulthekl/team-flow`（scoped package，解决 npm publish 权限冲突）
- **author**：`MageByte` → `xulthekl`
- **npx 引用**：全部 `npx --yes --package team-flow@X.Y.Z tf` → `npx --yes --package @xulthekl/team-flow@X.Y.Z tf`（179 处）
- **版本号**：bump 0.22.3 → 0.22.4（全量同步：plugin.json、marketplace.json、phase-guard.md、llms.txt、INSTALL.md、README.md 等 15 个文件）

### Verified

- 待执行 check-version-consistency + npm test

## [0.22.3] - 2026-07-27

### Changed（身份统一 spec-superflow → team-flow，P1-6 第二阶段）

- **npm 包名**：`spec-superflow` → `team-flow`（package.json `name` 字段）
- **CLI 前缀**：`ssf` → `tf`（package.json `bin` 字段，移除旧别名）
- **状态文件**：`.spec-superflow.yaml` → `.team-flow.yaml`（全局替换）
- **配置文件**：`spec-superflow.config.json` → `team-flow.config.json`
- **CLI 脚本**：`scripts/spec-superflow.mjs` → `scripts/team-flow.mjs`（git mv）
- **npx 引用**：99 处 `npx --yes --package spec-superflow@x.y.z ssf` → `npx --yes --package team-flow@x.y.z tf`
- **全量引用迁移**：721+ 处跨 skills/、scripts/、tests/、docs/、README、INSTALL、AGENTS、templates/、plugin manifests 等完成 spec-superflow → team-flow 和 ssf → tf 的文本替换
- **check-version-consistency.mjs**：RUNTIME_FILES 正则更新为匹配 `tf` 命令
- **install 脚本（install-cursor/zcode/workbuddy）**：npx 替换正则同步更新
- **dist/validation/tokenizer.js + src/validation/tokenizer.ts**：注释更新

### Verified

- check-version-consistency：✅ PASS（全部 0.22.3）
- npm test：✅ 421/421 通过
- Skill 计数一致性：✅ 23 skills（manifest 与实际目录匹配）
- spec-superflow/ssf 残留扫描：✅ 零残留（排除 CHANGELOG 历史记录和 package-lock.json）

---

## [0.22.2] - 2026-07-27

### Added（架构设计显式编排与产物独立化，设计 v0.9 §26）

- **workflow-start 显式编排 architecture-design**：路由表新增 architecture-design 子代理调用（exploring→specifying 之间），作为架构设计必经之门。子代理承担判断+执行一体化职责（五项检查判定是否涉及架构变更，涉及则执行完整 4A+DDD 增量设计，不涉及则返回 skip+理由）。workflow-start 接收结果后做合理性确认（skipped reason 与 scope 一致性 / required artifacts 存在性），写入 yaml 字段 `arch_design_decision` / `arch_design_reason` / `arch_design_artifacts` / `arch_design_timestamp`。null 状态硬阻断，不允许路由到 spec-writer。hotfix / tweak 不豁免。详细编排协议抽取到 `references/routing-rules.md`「Route to architecture-design」。
- **architecture-design 判断+执行一体化 SOP**：SKILL.md 新增「Workflow Integration」段，定义五项检查（聚合变更/限界上下文变更/读写模型变更/API 变更/DB schema 变更）、结构化输出契约（decision/reason/artifacts）、产出目录独立为 `architecture/`（不混入 `specs/`）。支持 workflow-start 编排调用和用户独立调用两种模式。
- **spec-writer 显式读取 architecture/ 约束**：Required Inputs 新增「Architecture Design Outputs (v0.9 §26)」段，读取 `architecture/architecture.md` / `database.md` / `api.md` 作为 design.md / tasks.md 的架构约束输入。Working Rules 新增「Honor Architecture」。Validation Checklist 新增 Architecture alignment 检查项。
- **contract-builder 读取 architecture/ 约束**：Artifact Mapping 表新增 `architecture/` 行，确保 execution-contract.md 的 Implementation Constraints 段包含架构设计的关键约束（聚合边界/CQRS 分流/API 契约/schema 变更）。
- **ch06-integration.md 产物布局修正**：从 `specs/<cap>/` 修正为独立 `architecture/` 目录，完整列出 change 容器内全部目录结构。

### Changed

- **s4-split-validate.md**：路径约束说明增加 `architecture/` 目录（与 `specs/<cap>/` 并列说明）。
- **state-model.md**：change_dir 说明增加 `architecture/` 目录（与 `specs/<cap>/` 并列说明）。
- **routing-rules.md**：Fast-Path 段补充「architecture-design 不豁免」提示（v0.9 §26）。

### Verified

- check-version-consistency：✅ PASS（全部 0.22.2）
- npm test：✅ 421/421 通过
- plugin-validator：✅ 0 Critical / 0 Important / 5 Advisory（1 个可操作性 Advisory 已修复）
- SKILL.md 行数：✅ 全部 ≤150（workflow-start 147 / architecture-design 140 / spec-writer 149 / contract-builder 72）

## [0.21.0] - 2026-07-25

### Added（子代理决策点 SendMessage stop-and-resume 交互协议，设计 §22.1.1，修订 §18.1.2）

- **决策点 SendMessage stop-and-resume（P1-14，完成 P1-13 的 SendMessage 子项）**：子代理工具集不含 AskUserQuestion，决策点需用户/主代理输入时经 `SendMessage(to: main)` 发结构化提问后**主动停止**（status=completed）；主代理经 `task-notification` 收到（零 TaskOutput 轮询）→ `AskUserQuestion` 代问用户 → `SendMessage(to: agentId)` 回传**自动 resume** 子代理带答案续跑（上下文经 transcript 保留）。LT 实证确认（Session d6801ab4，单轮/多轮追问/三子代理并行/多问合并四形态）。
- **请求-应答匹配纪律**：主代理维护未决提问台账、仅回传子代理实际所问；子代理收到回传校验对应性，不匹配按「正确优先」拒绝将错就错（实证暴露的真风险，必设）。
- **跨平台降级**：harness 不支持 resume → 降级 `blocked` + 携答案重派（承 §17.8 / §18.1.2）。
- 落点：`prototype-builder.md`（Decision-Point Interaction）+ `prototype-env-scout.md`（决策点交互）+ `prototype/references/orchestration-flow.md`（主代理中继协议）。

### Changed

- **§18.1.2 修订**：「不引入 agent team」明确指不采用**常驻 teammate 架构**，不排斥决策点 SendMessage stop-and-resume 中途交互；结构化返回仍为终态主协议。
- **AGENTS.md**：§4 prototype 增 v0.21.0 决策点中继说明；Agents 索引 prototype-builder 补注；**Skills 索引补 `design-system` 行**（v0.19.0 漏登，标题「23 个」与表体 22 行不一致修复，plugin-validator W1）。

### Deferred → Adopted

- v0.20.0 §22.1.1 曾标 Deferred（CC 误判为类 agent-team 常驻），经 LT 指认实证实录后纠正：实为 stop-and-resume，与 §18.1.2 兼容，采纳实施。

## [0.20.0] - 2026-07-25

### Added（工作流反馈三件套落地，设计增强方案 v0.8 §22）

- **产出型子代理质量闸门（P1-13，§22.1，修订 §18.1.1 返回契约）**：`prototype-builder` 新增 Deliverable Hard Gate——声明的 deliverable（`index.html`）未落盘非空禁止返回 `done`，终态交接前自检 `test -f && test -s` 通过方可 `done`；规划过重/预算将尽时诚实返回 `blocked` 交主代理 resume，杜绝「谎报 completed」。新增大产出分片纪律（先 Write 骨架 → Edit 分段追加）。`prototype-env-scout` 同步加简报完整性闸门。
- **编排层交接后产物校验（defense in depth）**：`prototype/references/orchestration-flow.md` builder→reviewer 间主代理强制校验入口产物落盘，不信 `status=done` 字面值，缺失则 resume，不空转评审。
- **编排层完成通知等待范式（P2-11，§22.2）**：`workflow-orchestrator` / `prototype` 明文派发后台子代理后依赖 `<task-notification>` 完成通知再行动，禁反复 `TaskOutput(block=true)` 阻塞轮询（其对长任务超时返回会倾泻完整 transcript 撑爆主上下文）。
- **S1 路由第 7 种入口「原型补跑/重跑」（P2-12，§22.3）**：PRD 冻结 ∧ `prototype/` 缺失/需重做 → 部分重入 S2 原型循环（PRD 不动、保留有效 S3/S4、闭环恢复原 phase）。`workflow-orchestrator/SKILL.md` 路由表 6→7 + `s1-path-router.md` 判据分支 + `state-model.md` 部分重入冻结语义与状态转换。

### Changed

- **AGENTS.md 能力概览**：§4 prototype / §6 orchestrator 补 v0.20.0 说明；Agents 索引 prototype-builder / env-scout 标注产物落盘硬闸门。
- **.cursor-plugin/plugin.json 描述横展对齐**：17 skills → 23 skills + 8 agents（与主清单一致，修 P0-3 遗漏的 cursor 副本）。

### Deferred

- **决策点 SendMessage 交互协议（§22.1.1，修订 §18.1.2）**：与「不引入 agent team / 统一返回结构」有张力；硬闸门已根治谎报完成，作为可选扩展待 LT 确认是否采纳后再写入 agent 定义。

## [0.16.0] - 2026-07-25

### Added（会话交接 + 工作流反馈）

- **session-handoff skill（设计增强方案 v0.8 §21.1）**：上下文腐化时将当前会话压缩为结构化交接文档（10 节），供新会话无缝继续。自动检测 `.team-flow/` 状态文件构建工作流快照；无状态文件时降级为通用 handoff。输出到 `.team-flow/handoffs/`（.gitignore，临时性质）。区别于 change 级 `tf handoff`（任务委派）和 `.team-flow/` yaml（结构化状态自动恢复）。含 3 个 references（交接文档模板 / 上下文萃取规则 / skill 推荐矩阵）。
- **workflow-feedback skill（设计增强方案 v0.8 §21.2）**：工作流使用问题结构化记录（10 类分类），转化为可追踪的改进项。与 ce-compound 互补——ce-compound 是"经验沉淀端"，workflow-feedback 是"问题发现端"。输出到 `.team-flow/feedback/`（git 跟踪，改进输入持久化）。含 3 个 references（问题记录模板 / 分类指南 / 回顾模式信号识别）。
- **release-archivist 收尾联动**：change 收尾时建议触发 workflow-feedback 回顾工作流问题。
- **产物目录**：`.team-flow/handoffs/`（.gitignore）+ `.team-flow/feedback/`（git 跟踪）。

### Changed

- **Skill 计数 20 → 22**（九套能力）：plugin.json / .claude-plugin/ / .cursor-plugin/ / .codex-plugin/ / gemini-extension.json / README / AGENTS.md 全链路同步。
- **AGENTS.md 能力概览**：新增第 8 节（session-handoff）和第 9 节（workflow-feedback）；触发域分层表登记为「步骤级 - 独立工具」。
- **CLAUDE.md**：skills 表新增 2 行、产物结构追加 handoffs/feedback/、Roadmap 追加 v0.16.0 里程碑、P1-9 横展补入 ce-ideate/ce-proof 超标。

## [0.15.0] - 2026-07-25

### Added（subagent 编排下沉 + 状态治理）

- **subagent 结构化交接协议（设计增强方案 v0.8 §18.1）**：统一 `done / done_with_questions / blocked` + `blockers[] / outstanding_questions[]` 返回契约——主代理只编排、执行下沉子代理；非阻断疑问按默认假设继续后批量返回，阻断疑问立即返回 `blocked`。不引入 agent team，保跨平台健壮性。
- **多需求并行状态模型**：`.team-flow/registry.yaml` 注册表 + 每需求一份 `.team-flow/requirements/<req-id>/orchestrator.yaml`，状态天然隔离（原单文件 `.workflow-orchestrator.yaml` 自动迁移）。
- **3 个新插件 agent**：`prd-completeness-reviewer`（PRD 完整性评审，冻结前门禁，只读）、`prototype-builder`（原型绘制执行者，有 Write）、`prototype-env-scout`（原型环境探查，只读）。agents 5 → 8。
- **2 个新种子提示**：`codebase-recon-analyst`（bootstrap 侦察）、`design-system-architect`（设计系统创建/迭代）。
- **`recon-probe.sh` 确定性侦察脚本**（workflow-bootstrap）：固定化代码库质量采集（目录树/依赖/LOC/测试计数含 `.mjs`/DB 迁移/文档），可复现可横展对比。
- **prototype 内部编排器重构**：主代理只编排不实施——env-scout 探查 → 方案/人工评审 → builder 绘制 → reviewer 评审 → 循环 → 人工路由；新增设计系统生命周期（创建→引用→增量更新）。
- **PRD 完整性评审门禁**：ce-brainstorm/orchestrator S2 冻结前派 `prd-completeness-reviewer`（管"说得全不全"，区别于 claim verifier 管"说得对不对"）。
- **PRD 版本格式规范**：迭代版本 `vN` / 文档修订次版本 `vN.M` / 文档状态枚举（编辑中/已冻结-下游/已冻结-绝对），与 frontmatter `frozen` 一致性硬约束。

### Changed

- **ce-plan 收窄**：模式强制询问（pipeline 下 orchestrator 问定后显式传 `plan_mode`，禁止隐式默认一人公司）；一人公司模式收窄到「高阶技术设计」，**删除接口清单段**（接口/字段/签名属各 change 的 spec-writer）；SKILL.md 顶部新增产品级/变更级作用边界硬声明。
- **workflow-bootstrap B1 重构**：主代理只编排，先跑 `recon-probe.sh` 脚本再并行派发侦察子代理；SKILL.md 瘦身至 ≤150 行（细节进 `references/b1-reconnaissance.md`）。
- **状态文件治理（P1-6 第一阶段）**：产品级编排状态迁入 `.team-flow/`（变更级 `.team-flow.yaml`→`.team-flow.yaml` 改名归 P1-6 第二阶段 v1.0.0，与 npm 包名/CLI 同批）。

### Fixed

- **冻结措辞 BUG**：ce-brainstorm 把 `frozen_downstream` 误写成「升版 vN+1」语义，违反反馈环路「迭代内变更不升版」设计；已修正为区分双层冻结（frozen_downstream 可 vN 内修订 / frozen_absolute 才升版），并横展到 PRD 模板与 prd-mapping。

## [0.10.0] - 2026-07-16

### Added

- **#60 — Qoder 平台支持**：新增 `tf install-qoder` 一键安装命令，部署 skills 到 `.qoder/skills/`、运行时依赖到 `.qoder/team-flow/`、phase-guard 规则到 `.qoder/rules/phase-guard.md`。采用共享库安装器模式（Pattern A），与 Cline/Kiro/Windsurf 等平台一致。平台支持数从 17 增至 18。

## [0.9.1] - 2026-07-15

### Changed

- **#52 — isolate optional name**: `tf isolate <change-dir>` no longer forwards an absent optional name as the literal string `undefined`; explicit names and `--force` retain their existing behavior.
- **#43 — portable skill runtime**: all nine canonical skills no longer require `${CLAUDE_PLUGIN_ROOT}`. Raw marketplace, cache, copy, and symlink loading use a semver-pinned package CLI; local installers rewrite that prefix to their bundled runtime tree.
- **Cross-platform runtime diagnostics**: `tf doctor` now detects stale root placeholders and missing runtime trees, while version sync and CI consistency checks include all nine canonical skill prefixes.
- **Linked-worktree version hook**: `npm run setup-hooks` now locates Git's shared hooks directory, upgrades stale team-flow hooks, and validates the worktree being committed rather than a sibling checkout.
- **#45 — Execution-mode recommendation**: DP-4 now runs `tf execution recommend` to list Inline, Batch Inline, and SDD from task and wave evidence, with a recommendation. Every persisted plan at `<change>/.superpowers/sdd/execution-plan.json` requires explicit `--confirm`; a non-recommended selection records `--acknowledge-recommendation` instead of treating Inline as an override. Named waves, dependencies, and review receipts remain mandatory.

### Added

- Runtime distribution inventory for all 17 documented platforms plus the ZCODE compatibility installer path.
- `npm run test:raw-mode` packages the current source and proves the canonical runtime works without plugin-root variables or a global `tf` command.

## [0.9.0] - 2026-07-11

### Added

- **#37 — Model profiles**：可在 `team-flow.config.json` 中为 `mechanical`、`standard`、`strong`、`review` 配置平台模型 ID，并用 `tf config --resolve-model <profile>` 只读解析；不执行跨平台自动模型切换，也不新增 runtime dependency。
- **#38 — Minimality discipline**：code-reviewer 现要求用任务依据审查无请求的依赖、配置、抽象与无关重构；保留 TDD、验证、安全和错误处理，不引入 Ponytail 或任何 runtime dependency。

## [0.8.17] - 2026-07-10

### Fixed

- Fixed canonical delta spec paths: validation, guard checks, hashing, sync, examples, and docs now use `specs/<capability>/spec.md`.
- Fixed `tf inject` default behavior so ambiguous projects require `--platforms` instead of writing every platform file.
- Fixed hotfix fast-path guards so hotfix can skip full planning artifacts while still requiring a fresh minimal contract and DP-3 approval.

## [0.8.16] - 2026-07-07

### Fixed

- **Plugin Scanner 门禁**：回归测试 `guard-tests-passing.test.mjs` / `guard-specs-merged.test.mjs` 此前用字符串形式 `execSync(\`node ${...}\`)` 触发 `SHELL_INJECTION_PATTERN`（8 high），改为参数数组 `execFileSync('node', [...])`。扫描分数 85/high:8 → 99/high:0 (A)。
- **产线 .mjs 硬化**：`ensure-branch.mjs` 去掉变量参数包装、改字面参数数组；`cmd-isolate.mjs` 去掉 `...extra` 展开；`config-loader.mjs` `execSync(字符串)` → `execFileSync(数组)`。均为去 shell 注入面的质量提升，运行时行为不变。
- **CI 稳定性**：`.github/workflows/hol-plugin-scanner.yml` 把 `ai-plugin-scanner-action@v1`（移动 tag，07-06→07-07 静默从 2.0.992 升到 2.0.997 导致门禁忽然挂掉）锁到 SHA `c4737ed2f724`（= 2.0.992），顺带修掉「Third-party Actions 未锁 SHA」中危项。

## [0.8.15] - 2026-07-07

### Fixed

- **BUG-A（致命）— `executing→closing` 收口跳转永久失败**：`release-archivist` 从不写 `test_result: pass`，而 `tests-passing` 守卫强制要求它，导致 `tf state transition closing` 永远 `exit(1)`。现守卫同时接受 `dp_6_result` 以 `pass` 开头，且 `release-archivist` 在 DP-6 后显式执行 `tf state set <change-dir> test_result pass`。
- **BUG-B — 状态漂移**：`cmd-state` 非 init 子命令在 `.team-flow.yaml` 缺失时静默返回默认态、会幽灵式创建状态文件。现缺失即报错退出；`state-loader` 增加 `spec_merged: false` 默认值并持久化。
- **#28 — `executing→closing` 缺「spec 已合并」闸门**：新增 `specs-merged` 守卫，残留未合并的 delta spec 会阻断收口；`spec-merger` 同步后置 `spec_merged: true`。
- **#15 — git 隔离仅为建议性、无强制**：新增 `ensure-branch.mjs` + `cmd-isolate.mjs`，拒绝在 `main`/`master` 上直接提交（除非 `--force`）；`build-executor` 的 `tf isolate` 改为强制 pre-flight。
- **#26 / #27.2 — skill 依赖 PATH 解析的裸 `tf`**：所有 `skills/**/SKILL.md` 改为安装时重写的绝对路径 `node "${CLAUDE_PLUGIN_ROOT}/scripts/team-flow.mjs"`，修复 cursor / marketplace 用户必失败的问题。

### Added

- **#29 — ZCODE（gemini-cli）安装器**：新增 `install-zcode.mjs` + `cmd-install-zcode.mjs`，注册进 CLI；`INSTALL.md` 平台表补充 ZCODE 行。

## [0.8.14] - 2026-07-06

### Fixed

- **WorkBuddy 安装器重构** — `tf install-workbuddy` 现在部署为标准 marketplace 插件，修复了 v0.8.13 中存在的三个缺陷：
  - **运行时依赖缺失** — 旧安装器不复制 `scripts/`、`docs/`、`templates/`、`dist/`、`hooks/`，导致 skill 中引用的脚本和模板无法解析。现在全部复制到插件根目录。
  - **`${CLAUDE_PLUGIN_ROOT}` 未重写** — 旧安装器直接复制 SKILL.md 而不重写路径变量，导致所有脚本引用断裂。现在重写为 marketplace 插件绝对路径。
  - **插件结构错误** — 旧安装器为每个 skill 创建独立的 marketplace 插件目录（9 个插件 × 9 个 enabledPlugins 键）。现在部署为单个 `team-flow` 插件，包含 `skills/` 子目录、`.codebuddy-plugin/plugin.json` 清单、`rules/phase-guard.md` 规则，settings.json 中仅需 `team-flow@cb_teams_marketplace` 单个启用键。旧安装产生的 per-skill 键会在升级时自动清理。

### Added

- WorkBuddy 安装器新增 `--dry-run` 预览模式和 `--tag` 指定版本安装。
- WorkBuddy 平台现在有 phase-guard 规则（`rules/phase-guard.md`，WorkBuddy 自动加载为常驻上下文）。

## [0.8.13] - 2026-07-06

### Added

- **跨平台安装支持扩展至 17 个平台** — 新增 8 个 AI 编程平台的一键安装器，平台覆盖面对齐 comet：
  - `tf install-cline` — Cline（`.cline/skills/` + `.clinerules/phase-guard.md`）
  - `tf install-kiro` — Kiro（`.kiro/skills/` + `.kiro/steering/phase-guard.md`）
  - `tf install-windsurf` — Windsurf（`.windsurf/skills/` + `.windsurf/rules/phase-guard.md`）
  - `tf install-qwen` — Qwen Code（`.qwen/skills/` + `.qwen/rules/phase-guard.md`）
  - `tf install-amazon-q` — Amazon Q Developer（`.amazonq/skills/` + `.amazonq/rules/phase-guard.md`）
  - `tf install-roocode` — Roo Code（`.roo/skills/` + `.roo/rules/phase-guard.md`）
  - `tf install-continue` — Continue（`.continue/skills/` + `.continue/rules/phase-guard.md`）
  - `tf install-pi` — Pi（`.pi/skills/`，无规则目录，手动 `/workflow-start`）
- **共享安装器架构** — 新增 `scripts/lib/platforms.mjs`（平台注册表）与 `scripts/lib/install.mjs`（共享安装器），8 个 `install-<id>.mjs` 为薄壳调用，路径全部与 comet `src/core/platforms.ts` 交叉核实。`install-cursor.mjs` / `install-workbuddy` 保持原样。
- **平台支持矩阵文档** — 新增 `docs/platform-matrix.md`，17 平台 × Skills/Rules/Hooks 三层接入透明化。
- **CLI 命令** — `tf` 注册 8 个 `install-<id>` 子命令，`npx team-flow@latest install-<id>` 一键部署。

### Changed

- INSTALL.md 平台总览表从 9 行扩至 17 行，新增 8 个平台完整安装/升级/卸载/验证章节。
- README.md 安装区表格与 CLI 命令表同步扩充。

### Notes

- Kiro / Windsurf / Qwen / Amazon Q 原生支持 hooks，但 team-flow 的 SessionStart 钩子在这些平台的可用性未逐一验证，v0.8.13 暂不写入 hook 配置；上下文注入由 phase-guard 规则（平台自动加载）承担，后续版本验证后补齐。
- 剩余 14 个 comet 平台（Junie / Bob / ForgeCode / Crush / iFlow / CoStrict / Factory / KiloCode / Auggie / Lingma / KimiCode / Antigravity ×2 等）留待 v0.8.14+ 分批跟进。

## [0.8.12] - 2026-07-06

### Fixed

- **Workflow mode inference** — hotfix/tweak auto-detection now recognizes common non-JavaScript source files, including Java, Go, Python, Rust, Kotlin, Swift, C/C++, C#, Ruby, PHP, and shell scripts, so multi-task code changes are no longer misclassified as config/doc-only tweaks.

## [0.8.11] - 2026-07-06

### Fixed

- **DP-0 audit consistency** — `tf audit` now treats existing `dp_0_confirmed: true` state as a recorded DP-0 confirmation, and `dp_0_result` is now persisted by the state loader instead of being dropped after `tf state set`.

## [0.8.10] - 2026-07-06

### Fixed

- **Guard fast-path gating** — `exploring -> bridging` now requires `hotfix` or `tweak`, and `exploring -> approved-for-build` now requires `tweak`; `full`/`auto` workflows no longer skip `contract-builder` and approval gates.
- **State transition safety** — `tf state transition` now fails closed when guard execution fails, returns malformed output, reports non-boolean `pass`, or exits unsuccessfully, preventing state writes after unreliable guard checks.
- **Execution branch isolation** — `build-executor` now requires branch/worktree preflight before implementation and stops for explicit approval before editing `main` or `master`.

## [0.8.9] - 2026-07-04

### Added

- **WorkBuddy installer** — New `tf install-workbuddy` command deploys all 9 skills into WorkBuddy's marketplace plugin directory and enables them in `~/.workbuddy/settings.json`.
- **WorkBuddy installer tests** — Covers target path planning, skill copy behavior, settings preservation, and package-root resolution for `npx` usage.

### Changed

- **Installation docs** — Updated README, English README, INSTALL.md, OpenCode notes, AGENTS.md, and llms.txt to reflect current mainstream installation paths for Claude Code, Cursor, OpenAI Codex CLI/App, GitHub Copilot CLI, Gemini CLI, OpenCode, WorkBuddy, and Trae.
- **Update guidance** — Added WorkBuddy upgrade command to the version reminder output.

### Fixed

- **Doctor manifest coverage** — `tf doctor` now checks `.cursor-plugin/marketplace.json` and `.github/plugin/marketplace.json`, and correctly handles multiple version fields in the same manifest file.

## [0.8.8] - 2026-07-03

### Changed

- **Token efficiency optimization**: Compressed all prompt injection surfaces by 60.3% (from ~24,387 estimated tokens to ~9,669).
  - `hooks/session-start`: 23→15 lines, comments compressed, platform branches share message variable.
  - 9 skill SKILL.md files: 2,461→750 lines total (−69.5%). Each skill ≤250 lines, 0 token lint issues.
  - Phase guard files (`.claude/always/phase-guard.md`, `GEMINI.md`): 14→3 lines each, reference state machine instead of enumerating operations.
  - `workflow-start` initialization simplified: deferred non-critical checks to target skills.

### Added

- **Token baseline tool** (`scripts/token-baseline.mjs`): Measures lines, characters, and estimated tokens for all injection components. Supports `--compare` for pre/post compression analysis.
- **Token lint rules** (`scripts/lint/rules/token-rules.mjs`): 4 rules — max lines, max chars, emphasis marker limits, code block length limits. Banned markers: `EXTREMELY_IMPORTANT`, `CRITICAL`.
- **`--include token`** support in `lint-skills.mjs` for token-specific linting.
- **CI token lint step**: Warning-only check in both build-and-test and release jobs.
- **Phase guard files** now included in version consistency checks.

## [0.8.7] - 2026-07-03

### Added

- **Skill lint framework**: `scripts/lint/lint-skills.mjs` with 5 rules for static analysis of skill instruction quality.
- **Guard transition tests**: 43 regression tests covering all 21 legal transitions and 8 illegal rejections.
- **Exception handling**: All 9 skills now include guidance for parse failures, missing files, and user interruption recovery.

### Fixed (Bug)

- **Parser bilingual support**: `parseChangeMarkdown` now correctly extracts sections from bilingual headings (e.g., `## 背景（Why）`). Previously it used English-only exact matching, silently returning empty strings.
- **Guard workflow normalization**: `tf state transition` no longer silently skips guard checks when workflow is `auto`. The `auto` mode is now normalized to `full` before guard invocation.
- **Guard error handling**: Terminal states (`abandoned`, `closing`) now correctly reject further transitions instead of allowing them through.

### Changed

- **build-executor**: Added DP-4 and DP-5 record commands.
- **contract-builder**: Added DP-3 record command and exception handling guidance.
- **release-archivist**: Added DP-6/DP-7 record commands and DP gap detection.
- **workflow-start**: Fixed "Route to abandonment" → "Route to abandoned state".
- All 9 skills: Added standardized exception handling sections.

## [0.8.6] - 2026-07-03

### Fixed (Bug)

- **CI**: Correct `actions/setup-node` SHA — the previously pinned `v4.5.0` release didn't exist. Changed to `v4.4.0` (latest actual v4). This was silently breaking all CI runs on main.

### Changed

- **Deps**: Bump `actions/checkout` from 4.2.2 to 7.0.0 (SHA-pinned, `tsc` verified).
- **Deps**: Bump `typescript` from 5.9.3 to 6.0.3 (devDependency, `tsc --noEmit` zero errors).
- **Branch protection**: Main branch now requires PR + CI checks (`Build & Test (22)`, `scan`) before merge.

## [0.8.5] - 2026-07-03

### Fixed (Bug)

- **Issue #9**: Cursor installation (`install-cursor.mjs`) now copies the full runtime tree (`scripts/`, `docs/`, `templates/`, `dist/`, `hooks/`) instead of just `skills/`. Fixes 24 broken `${CLAUDE_PLUGIN_ROOT}` references in skills.

### Added

- **`tf install-cursor` CLI command**: Deploys team-flow to `.cursor/` directory.
- **Multi-platform marketplace support**:
  - `.cursor-plugin/marketplace.json` — Cursor marketplace submission
  - `.opencode/plugins/team-flow.js` — OpenCode plugin entry
  - `.codex-plugin/plugin.json` — `composerIcon` for Codex
  - `gemini-extension.json` — Gemini CLI verified install
- **Codex scanner**: `SECURITY.md`, `assets/icon.svg`, `.codexignore`, `.github/dependabot.yml`, `hol-plugin-scanner.yml` CI workflow. Scanner score: 92/130.
- **Branch protection setup** for main branch.

### Changed

- **README**: Restructured with quick start first. English README fully synced with Chinese version.

## [0.8.4] - 2026-07-03

### Fixed (Bug)

- **Critical: C-1** — Validator bilingual heading support: `extractSection` regex now matches both `## Why` and `## 背景（Why）` style headings. Chinese templates no longer fail schema validation.
- **Critical: C-2** — Guard dead transition `bridging:approved` fixed to `bridging:approved-for-build` (matching canonical state name).
- **Critical: C-3** — Cursor workflow-orchestrator guard call fixed to use `approved-for-build` instead of `approved`, preventing "Unknown transition" errors.
- **High: H-1** — Guard transition matrix extended with 6 missing rewind transitions (`specifying:exploring`, `bridging:specifying`, `approved-for-build:bridging`, `executing:specifying`, `executing:bridging`, `closing:specifying`).
- **High: H-2** — `tf state transition` now runs guard checks before writing state. Guard is no longer bypassable via direct CLI.
- **High: H-3** — `tasks-complete.mjs` now matches both `[x]` and `[X]` (case-insensitive) and supports indented/nested tasks (`[ \t]*` prefix).
- **High: H-4** — `build-executor` SKILL.md: 3 script paths fixed to use `${CLAUDE_PLUGIN_ROOT}` prefix, preventing breakage after worktree `cd`.
- **High: H-5** — `spec-merger` SKILL.md: removed non-existent `workflow/` path prefix from 7 spec locations.
- **High: H-6** — `infer-workflow.mjs`: fixed `import.meta.url` comparison for relative-path invocation (added `import.meta.filename` fallback for Node 22+).
- **High: H-7** — `cmd-state.mjs` transition now validates state names against `VALID_STATES` whitelist, rejecting typos that corrupt the state machine.
- **Medium: M-1** — 6 skill H1 titles updated from v0.7 old names to v0.8.x current names (e.g., "Spec Explorer" → "Need Explorer").
- **Medium: M-2** — `state-loader.mjs`: `||` replaced with `??` across 10 fields, preventing empty string → null data loss.
- **Medium: M-3** — `hash.mjs`: specs hash now only includes `spec.md` files (not all `.md` files), preventing false hash mismatch from README.md changes.
- **Medium: M-4** — `schema-valid.mjs`: WARNING-level issues now captured and returned alongside ERRORs instead of being silently discarded.
- **Medium: M-6** — `schema-valid.mjs`: dynamic `import()` now wrapped in try/catch with helpful "Run 'npm run build'" error message.
- **Medium: M-7** — `infer-workflow.mjs`: explicit `workflow: full` no longer overridden by auto-detection heuristic.
- **Medium: M-8** — `workflow-start` SKILL.md: 8 relative script paths fixed to use `${CLAUDE_PLUGIN_ROOT}` prefix.
- **Medium: M-9** — `cmd-state.mjs` SETTABLE_FIELDS extended with 25 missing fields (`batches_completed`, `dp_0_result`, `dp_N_decisions`, `dp_N_confirmed` for DP-1 through DP-7).
- **Medium: M-10** — `bug-investigator` SKILL.md: added DP-5 (调试升级) reference near 3+ failure escalation rule.
- **Low: L-1** — `CLAUDE.md` ASCII state diagram: `approved` → `approved-for-build`.
- **Low: L-2** — `team-flow.mjs` CLI help: example uses `approved-for-build` instead of `approved`.
- **Low: L-3** — `cmd-state.mjs` get: blocks prototype property reads (`__proto__`, `constructor`, etc.).
- **Low: L-4** — `cmd-state.mjs` init: auto-creates change directory if missing.
- **Low: L-7** — `docs/state-machine.md`: added fast-path transitions (`exploring→bridging`, `exploring→approved-for-build`).

### Changed (Token Optimization)

- **T-1** — `session-start` hook injection reduced from ~100 tokens to ~40 tokens (~60% reduction). Removed `set -euo pipefail` and no-op `| cat` pipes.
- **T-2** — `install-cursor.mjs`: now cleans old skill directories before copying, preventing stale v0.7 names from accumulating.
- **T-3** — `cmd-inject.mjs`: `claude` platform writer no longer writes duplicate `rules/phase-guard.md` (`.claude/always/phase-guard.md` suffices).
- **T-4** — `.cursor/skills/`: removed 8 stale v0.7 skill directories (spec-explorer, spec-forger, spec-syncer, bridge-contract, execution-governor, systematic-debugger, closure-archivist, workflow-orchestrator). Now has only 9 current skills.
- **T-5** — Deleted stale `rules/phase-guard.md` file.

### Changed (Internal)

- `package.json` test script now runs all 152 tests (e2e + lib), not just e2e.
- Guard test updated for `bridging→approved-for-build` transition name.

## [0.8.3] - 2026-07-01

### Added

- **130 new tests** — CLI scripts (`cmd-list`, `cmd-state`, `cmd-audit`, `cmd-doctor`, `cmd-inject`) and guard system now have comprehensive test coverage. 152 total tests (up from 22), covering config loading, state management, hash computation, guard transitions, workflow inference, and phase guard generation.

### Fixed

- **`infer-workflow` empty directory** — previously returned `hotfix` for empty change directories (0 tasks, 0 files); now correctly returns `full` as the safe default.

### Changed

- **Refactored guard run loop** — switch-case replaced with `CHECK_RUNNERS` lookup map for cleaner dimension dispatch.
- **Deduplicated `cmd-validate`** — `design.md` and `tasks.md` structural validation merged into a single config-driven loop.
- **Exported internal functions** — `detectChangeStatus` (cmd-list), `generateReport`/`DP_NAMES` (cmd-audit), 7 doctor check functions (cmd-doctor), `generatePhaseGuard`/`toCursorMdc`/`toCopilotInstructions` (cmd-inject) now exported for direct unit testing.

## [0.8.2] - 2026-07-01

### Added

- **DP-1 and DP-2 implementation** — `need-explorer` now records DP-1 (requirement confirmation) before handing off to `spec-writer`; `spec-writer` now records DP-2 (artifact review) before handing off to `contract-builder`.

### Fixed

- **SessionStart token overhead (issue #5)** — `hooks/session-start` now injects a ~50 token lightweight pointer instead of the full 360-line `workflow-start` SKILL.md, reducing per-session context-window usage by ~2,200 words.
- **tweak fast-path deadlock** — `guard.mjs` now skips `artifacts-exist` checks for tweak workflow, and `build-executor` accepts tweak mode without requiring `execution-contract.md`. The advertised tweak path now actually works.
- **State name inconsistency** — `approved` and `approved-for-build` standardized to `approved-for-build` across `guard.mjs`, `cmd-inject.mjs`, `workflow-start`, and `state-machine.md`. Removed duplicate `approved` phase-guard template.
- **`tf list` false CLOSED** — `detectChangeStatus` now reads `.team-flow.yaml` state instead of inferring closure from file existence. Previously reported BRIDGED changes as CLOSED.
- **`tf audit` missing DP-0** — DP-0 (user confirmation gate) now included in audit reports alongside DP-1–DP-7.
- **Guard `artifacts-exist` config-aware** — now respects `artifacts.skip` from `team-flow.config.json`, allowing projects to exclude optional planning artifacts.
- **Old skill names in guard scripts** — `contract-fresh.mjs` and `tests-passing.mjs` error messages updated to reference `contract-builder` and `release-archivist`.
- **Sub-prompt path resolution** — `build-executor` and `code-reviewer` now use `${CLAUDE_PLUGIN_ROOT}/skills/<name>/` paths for sub-prompt templates instead of bare filenames.
- **`tf validate` coverage** — now validates all 4 planning artifacts (`design.md` and `tasks.md` basic structural checks added).
- **Config default artifact order** — `execution-contract` removed from `artifacts.order` default (it's `contract-builder`'s output, not `spec-writer`'s).
- **README state count** — corrected from 7 to 8 states (includes `abandoned`).

### Changed

- **README "不推荐使用" refreshed** — v0.8.x improvements (hotfix, tweak, Batch Inline, reduced token overhead) now cover many previously-excluded scenarios. The "not recommended" section now only lists truly unsuitable cases (throwaway scripts, pure Q&A).

## [0.8.1] - 2026-07-01

### Added

- **Auto-latest Cursor install** — `scripts/install-cursor.mjs` now downloads and deploys the latest GitHub release by default. Use `--local <path>` to deploy from a local repo.
- **Update check reminder** — New `scripts/check-update.mjs` compares the installed version with npm latest. `workflow-start` runs it on startup and surfaces a non-blocking upgrade reminder when behind.

### Changed

- **INSTALL.md** now documents `/plugin update team-flow@team-flow` as the Claude Code upgrade path and provides a curl one-liner for Cursor auto-deployment.

## [0.8.0] - 2026-07-01

### Added

- **Intuitive skill names** — All 9 skills renamed to action-object style: `workflow-start`, `need-explorer`, `spec-writer`, `contract-builder`, `build-executor`, `bug-investigator`, `code-reviewer`, `release-archivist`, `spec-merger`.
- **Batch Inline execution mode** — `build-executor` now supports `Batch Inline` for low-risk, same-module tasks, reducing subagent dispatch overhead for small changes like issue #5.
- **User confirmation gate (DP-0)** — `workflow-start` confirms key decisions with the user before routing to `spec-writer`; `spec-writer` honors confirmed constraints and pauses on unconfirmed decisions.
- **Migration guide** — Added `docs/skill-rename-v0.8.0.md` with old→new mapping and per-platform refresh instructions.

### Changed

- **Documentation sync** — `README.md`, `INSTALL.md`, `CLAUDE.md`, `docs/state-machine.md`, `docs/decision-points.md`, `GEMINI.md`, main `specs/`, `templates/`, and plugin manifests updated to use the new skill names and v0.8.0 install instructions.
- **Version sync** — `tf version` now also updates `.codex-plugin/plugin.json`; `tf doctor` checks all 7 manifests.

## [0.7.1] - 2026-06-30

### Fixed

- **README consistency** — 移除架构图中不存在的 `schemas/` 目录，补充 `scripts/guard/`、`install-cursor.mjs`、`infer-workflow.mjs`；明确 Cursor 的 session-start hook 需要手动复制到 `.cursor/hooks.json`。

## [0.7.0] - 2026-06-30

### Added

- **Multi-platform phase-guard injection** — `tf inject` now generates phase-guard artifacts for Claude Code (`.claude/always/phase-guard.md`), Cursor (`.cursor/rules/phase-guard.mdc`), Copilot (`.github/copilot-instructions.md`), and Gemini (`GEMINI.md`). New `--platforms` flag limits output to a subset.
- **Auto workflow-mode detection** — `workflow-orchestrator` infers `hotfix`/`tweak`/`full` from artifact content when `.team-flow.yaml` workflow is `auto`. Added `scripts/infer-workflow.mjs` helper. Explicit workflow values are preserved.
- **Decision-point audit report** — New `tf audit <change-dir>` command reads `.team-flow.yaml` DP fields and generates `decision-point-audit.md` with a summary table and per-DP interpretation.
- **Cursor local deploy** — New `scripts/install-cursor.mjs` copies skills to `.cursor/skills/` and creates `.cursor/rules/phase-guard.mdc` for Cursor Agent.
- **Template localization** — All planning templates under `templates/` are now in Chinese while keeping required parsing markers intact.

### Fixed

- **Copilot CLI plugin manifest** — Root `plugin.json` `author` is now an object (`{ "name": "..." }`) to satisfy Copilot CLI strict validation.
- **`tf doctor` author check** — Added validation for root `plugin.json` `author` format.
- **INSTALL.md accuracy** — Cursor and Copilot CLI install instructions now describe the actual working mechanisms.

## [0.6.0] - 2026-06-29

### Added

- **Fast-path workflow modes** — hotfix and tweak modes skip full planning for small changes. Hotfix: ≤2 files, no new modules, minimal contract. Tweak: ≤4 files, config/doc only, direct edit. Auto-upgrade to full when thresholds exceeded.
- **Phase-drift prevention** — `tf inject` command generates `rules/phase-guard.md` and installs to `.claude/always/` for per-turn Agent context injection. 9 state templates with allowed/forbidden operations. Forms a soft+hard dual defense with guard.mjs.
- **Decision point protocol** — `docs/decision-points.md` defines 7 standard decision points (DP-1 through DP-7) with triggers, inputs, outputs, and associated skills. All 4 affected skills reference DP numbers.
- **Guard mode awareness** — `guard.mjs` accepts `--workflow` parameter (full/hotfix/tweak) for mode-specific check skipping. 2 new transitions: `exploring→bridging`, `exploring→approved`.
- **State set command** — `tf state set <dir> <field> <value>` with SETTABLE_FIELDS whitelist. 14 new decision point audit fields (dp_N_result + dp_N_timestamp).

### Changed

- **Guard schema-valid** — Uses `validateDeltaSpec` for change specs, fixing a format mismatch between delta spec and main spec validators.
- **4 skill files** — workflow-orchestrator (mode detection + fast-path routing + DP refs), bridge-contract (hotfix minimal contract), execution-governor (tweak direct edit), closure-archivist (lightweight closure).

## [0.5.0] - 2026-06-29

### Added

- **Guard script system** — `scripts/guard/guard.mjs` provides dimension-based phase transition validation with 5 check dimensions. Exit code ≠ 0 blocks transitions. Reuses existing Validator engine for schema validation.
  - `artifacts-exist` — checks all 4 planning artifacts + specs/ are present and non-empty
  - `schema-valid` — validates proposal.md and all specs/*/spec.md using the Validator engine
  - `contract-fresh` — compares stored artifacts hash against current artifacts for staleness detection
  - `tasks-complete` — verifies all tasks.md items are checked off
  - `tests-passing` — confirms test_result: pass is recorded in state file
- **Lightweight state file** — `.team-flow.yaml` as a derived cache (12 fields) for fast context recovery. Always rebuildable from artifacts via `tf state rebuild`. Artifacts are the source of truth; state file is a performance optimization.
- **SHA256 hash acceleration** — `scripts/lib/hash.mjs` computes artifact hashes for O(1) staleness detection. Reduces staleness detection from ~3500 tokens (full content read) to ~50 tokens (single script call).
- **ssf state CLI** — New `state` subcommand with 5 operations: `init`, `check`, `transition`, `get`, `rebuild`.

### Changed

- **workflow-orchestrator** — Each routing rule now includes a guard script invocation step before allowing transitions.
- **bridge-contract** — Automatically runs `tf state init` after contract generation.
- **closure-archivist** — Runs `tf state transition` after verification completes.
- **execution-governor** — Updates `batches_completed` in state file after each batch.

## [0.4.0] - 2026-06-29

### Added

- **CLI toolchain** — `tf` command with 6 subcommands: `list` (scan changes and report status), `validate` (artifact validation via Validator), `doctor` (health check: version sync, hooks, skills, dist, node, docs, config), `version` (one-command version sync to all manifests), `sync` (delta spec merge with conflict detection), `config` (display/modify configuration). Zero dependencies via `node:util.parseArgs`.
- **Configuration system** — Optional `team-flow.config.json` for customizing artifact order, skip list, execution thresholds, and verification language. Absence = v0.3.0 defaults. Deep-merge with built-in defaults. Skills query config at runtime via `scripts/get-config` bash helper.
- **Multi-language tokenizer** — `src/validation/tokenizer.ts` with English stemmer (extracted from validator) + Chinese CJK tokenizer (Unicode ranges + 2-5 char sliding window + stop words). Auto-detection based on CJK character ratio. Mixed mode runs both tokenizers and unions results.
- **Conflict detection** — `Validator.detectSyncConflicts()` detects when multiple changes modify the same requirement across unsynced delta specs. Integrated into `tf sync` command and `spec-syncer` skill pre-flight check.
- **git worktree isolation** — execution-governor now recommends worktree creation when executing on main/master branch. Pure SKILL.md guidance, no code changes.

### Changed

- **package.json** — Added `bin` field exposing `tf` and `team-flow` commands.
- **validateImplementation()** — Refactored to use `tokenize()` instead of inline `stem()`. Added optional `config` parameter for language override (`'auto' | 'en' | 'zh'`). Backward compatible — existing callers work unchanged.
- **Tokenizer refinements** — CJK sliding window extended to 2-5 chars (covers compound words like "令牌桶算法"). English min token length lowered to 3 (preserves short tokens like "jwt"). Added "based"/"using"/"used" to English stop words.
- **Version manifests** — `.cursor-plugin/plugin.json` and `gemini-extension.json` now tracked in version sync (previously lagging at 0.2.0 and 0.1.0).

### Fixed

- **Version consistency** — `tf version` command ensures all 5 manifest files stay in sync. `tf doctor` reports inconsistencies as warnings.

## [0.3.0] - 2026-06-27

### Added

- **Inline execution mode** — Lightweight single-session execution for small changes (≤ 3 tasks, no cross-module dependencies). Parallel to SDD subagent mode. Preserves TDD Iron Law with checkpoint review per task. Automatic mode selection with user override.
- **Abandoned terminal state** — 8th workflow state allowing graceful change abandonment from any non-terminal state. Generates `abandonment-summary.md` with reason, lessons learned, and recommendations. Blocks delta spec merge for abandoned changes. Partial code preservation supported.
- **Three-dimensional verification** — closure-archivist now verifies Completeness (all tasks/requirements implemented), Correctness (tests pass, no placeholders), and Coherence (design decisions reflected in code). New `Validator.validateImplementation()` API with word-stemming and keyword matching.
- **abandonment-summary.md template** — Structured template for documenting abandoned changes.
- **Verification types** — New exports: `VerificationDimension`, `VerificationStatus`, `VerificationFinding`, `VerificationReport`.

### Changed

- **spec-forger task planning** — Rewritten with writing-plans methodology: File Structure section, Interfaces block (Consumes/Produces), per-task TDD expansion (5 phases), exact file paths with line ranges, zero placeholder enforcement, 2-5 minute granularity per step.
- **execution-contract.md template** — Added Execution Mode (SDD | Inline) selection field and Verification Dimensions table.
- **tasks.md template** — Added File Structure and Interfaces sections for cross-batch dependency tracking.
- **State machine** — Extended from 7 to 8 states (+abandoned terminal state). Universal abandoned transition from any non-terminal state.
- **Validator engine** — New `validateImplementation(diffSummary, specContent, designContent)` method with three-dimensional `VerificationReport` return type. Word-stemming for Completeness matching, keyword-based Coherence checking.
- **closure-archivist** — Verification steps expanded from 3 to 5 (Correctness, Completeness, Coherence, Unintended Scope Detection, Verification Report). Structured output with PASS/CONDITIONAL/FAIL verdict.
- **spec-syncer** — Pre-flight guard blocks sync for abandoned changes.

## [0.2.1] - 2026-06-27

### Fixed

- **hooks.json format** — Changed from incorrect array format to Claude Code plugin record format. Event name corrected from `Startup|Clear|Compact` to standard `SessionStart`. Command path now uses `${CLAUDE_PLUGIN_ROOT}` environment variable for cross-platform compatibility.

## [0.2.0] - 2026-06-26

### Added

- **Engine layer (`src/`)** — embedded OpenSpec schema/validation/parsing engine in TypeScript
  - `src/schema/` — Requirement, Delta (ADDED/MODIFIED/REMOVED/RENAMED), Spec, Change type definitions
  - `src/validation/` — Validator class with validateSpecContent, validateChangeContent, validateDeltaSpec
  - `src/parsing/` — Requirement block parser + Delta spec parser (self-contained, no external deps)
- **3 new skills** (6 → 9 total):
  - `systematic-debugger` — 4-phase root cause debugging (Root Cause → Pattern → Hypothesis → Implementation)
  - `code-reviewer` — Unified code review (request + receive), 3 severity levels (Critical/Important/Minor)
  - `spec-syncer` — Delta Spec → Main Spec intelligent merge with conflict detection
- **SDD (Subagent-Driven Development)** — Full implementation discipline embedded in `execution-governor`:
  - `implementer-prompt.md` — Subagent implementation template with TDD evidence + self-review
  - `task-reviewer-prompt.md` — Dual-verdict review (spec compliance + code quality)
  - `code-reviewer-prompt.md` — Structured code review template
- **Helper scripts (`scripts/`)** — `task-brief`, `review-package`, `validate-artifacts`
- **Session-start hooks (`hooks/`)** — Multi-platform bootstrap (Claude Code / Cursor / Copilot CLI)
- **Content-level stale detection** — `workflow-orchestrator` now compares proposal scope vs contract intent lock

### Changed

- State machine extended from 6 to 7 states (+`debugging`)
- All 6 existing skills enhanced with embedded engine capabilities:
  - `spec-explorer` — embedded brainstorming's "one question at a time + 2-3 approach comparison"
  - `spec-forger` — Schema engine validation on every artifact + writing-plans task granularity
  - `bridge-contract` — parsing engine auto-extraction of contract fields
  - `execution-governor` — Full TDD Iron Law + SDD workflow + Review Gates
  - `closure-archivist` — verification-before-completion Iron Law
  - `workflow-orchestrator` — content-level inspection + 3 new routing targets
- Plugin metadata updated to v0.2.0 with expanded keywords across all manifest files

### Release Quality

- **TypeScript compilation** — Added `tsconfig.json` (ES2022, NodeNext, strict mode), `npm run build` produces `dist/` with declarations
- **Integration tests** — 8 test cases using real example artifacts (`docs/examples/`), `npm test` passes
- **package.json** — `main` points to `dist/index.js`, `types` to `dist/index.d.ts`
- **Documentation** — Updated English README Current Status to v0.2.0

## [0.1.0] - 2026-06-25

### Added

- Initial self-contained `team-flow` plugin structure
- Plugin metadata in `.claude-plugin/plugin.json`
- Six workflow skills:
  - `workflow-orchestrator`
  - `spec-explorer`
  - `spec-forger`
  - `bridge-contract`
  - `execution-governor`
  - `closure-archivist`
- Planning templates:
  - `proposal.md`
  - `spec.md`
  - `design.md`
  - `tasks.md`
  - `execution-contract.md`
- Workflow docs:
  - `docs/artifact-contract.md`
  - `docs/state-machine.md`
- Example change sets:
  - `docs/examples/add-dark-mode/` (net-new UI capability)
  - `docs/examples/refactor-auth-boundary/` (brownfield backend refactor)
- Installation guide in `INSTALL.md`
- Chinese publishing README in `README.zh-CN.md`
- Repository governance files: `.gitignore`, `CONTRIBUTING.md`, `docs/release-checklist.md`

### Notes

- First release targets Claude Code and Trae style local skill loading
- Runtime ownership remains inside `team-flow`
- OpenSpec and Superpowers are reference influences, not runtime dependencies

## v0.23.0 (2026-07-28) — 架构制品体系可执行化 + 上下文治理

### 新增
- **`tf arch-merge` CLI 命令**：8 步完整合并脚本，将 change 级架构增量（architecture/*.md + sql/）合并回全局 docs/architecture/（ARCHITECTURE.md / PHYSICAL-MODEL.md / schema-baseline.sql / API-INDEX.md / INDEX.md）
- **架构门控（guard.mjs）**：`exploring:specifying` 转换新增 `arch-design` 维度；`arch_design_decision=required` 时必须存在 architecture/*.md，`skipped` 时 reason 非空（advisory）
- **architecture/*.md 纳入 artifacts_hash**：修改 hash.mjs，三件套变更触发 hash 失效
- **5 个架构模板**：architecture.md / database.md / api.md / index.md / physical-model.md + change-brief.md
- **架构上下文加载协议**：INDEX.md 摘要索引 + 物理模型按业务域分段 + 按需加载三层策略，单次执行预算 ~2K tokens

### 修改
- **database.md 模板**：DDL 从内嵌代码块改为引用 `sql/ddl/` 和 `sql/migration/` 目录
- **api.md 定位调整**：聚焦 Command/Read/Query 分流归属+端点概要（架构路由表），不重复 Swagger 管理的精确 Schema；frontmatter 须声明 `api_contract_manager: swagger`
- **Bootstrap B2 新增成果物导入环节**：优先用户提供既有 SQL/物理模型/API 文档，兜底确定性提取（Entity 类解析 / SHOW CREATE TABLE）；新产出 PHYSICAL-MODEL.md / schema-baseline.sql / API-INDEX.md / INDEX.md；CONCEPTS.md 路径迁移至 docs/architecture/
- **architecture-design SKILL.md**：产出目录新增 sql/ 子目录；api.md 架构路由表定位；新增上下文加载协议段；新增 arch-merge 引用

### 下游消费同步
- **spec-writer**：输入源增加 architecture/sql/ 路径 + api.md 路由表说明
- **build-executor**：输入源增加 architecture/sql/ddl/*.sql + sql/migration/*.sql
- **code-reviewer**：新增 Architecture Cross-Domain Consistency 评审维度
- **release-archivist**：closing 步骤新增 `tf arch-merge`（先于 prototype-sync）

### 设计文档
- 新增 `docs/architecture-api-db-design-enhancement-v0.10.md`（§28-§31 完整设计决策记录）

### 参考
- v0.10 设计文档：`docs/architecture-api-db-design-enhancement-v0.10.md`
- 设计增强方案权威版本：v0.10（承袭 v0.9 全部内容）
