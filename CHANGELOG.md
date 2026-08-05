# Changelog

All notable changes to `team-flow` will be documented in this file.

The format loosely follows Keep a Changelog.

## [Unreleased]

## [0.37.0] - 2026-08-05

### Added（阶段同步 + 原型版本隔离，设计增强方案 v0.15 §68）

- **CLI 新命令 `tf publish`**：阶段产物白名单提交 + 可选推送（`--prd / --arch / --changes <dir> / --all` + `--push` 确认制 + `--dry-run`）；复用 arch-merge 白名单 commit 模式 + 外部脏文件检测 + 独立写锁（`.publish.lock`）
- **CLI 新命令 `tf prototype branch` / `tf prototype deisolate`**：原型仓库（独立 + 远程）PRD 版本 worktree 隔离——`branch <prd-vN>` 创建/复用版本 worktree（隔离 + 团队一键拉取）；`deisolate <prd-vN> --merge --clean` 版本收尾 merge 回主干 + 清理（方案 A：merge 时机 = 版本收尾）
- **5 个同步门禁点（G1-G5，§68.2）**：S2 冻结 / ARCH 完成 / orchestrator 结束 / execution-contract 完成 / change closing——各点 AskUserQuestion 三选项（提交并推送 / 仅提交 / 暂不同步），团队协作阶段产物同步
- **制品链路径版本化修正（§68.5）**：原型引用 = 语义相对 + 版本绑定；spec-writer / build-executor / e2e / contract-builder 声明原型版本 worktree 路径；`prototype-sync --prototype-dir` 缺省按版本解析 worktree（`derivePrdVersion`/`resolvePrototypeDir`，change-brief `upstream_plan_ref` 推导，worktree 缺失回退主仓库并提示）
- **文档**：设计增强方案 v0.15（§68 阶段同步 + 原型版本隔离 + §69 决策落实状态）

## [0.36.4] - 2026-08-05

### Added（Wave 审查纪律 + 上下文轮转）

- **workflow-start SKILL.md**：Route to code-reviewer 增加逐 wave 审查纪律——每次 code-reviewer dispatch 只审查一个 wave，禁止合并多 wave 审查（vrm4teamflow C1 事件修复）
- **workflow-start SKILL.md**：Sub-agent Dispatch Protocol 增加 build-executor 交互轮次轮转——累计 ≥6 轮 SendMessage 交互时启动新 build-executor 子代理（交接文档必须含已完成 waves + 累积决策 + worktree SHA）

## [0.36.3] - 2026-08-05

### Fixed（v0.14 全链路缺口修复——27 项，复利链路 + agent 契约 + 门禁时序 + 交接/决策门 + guard hook + 快照生命周期 + 旧项目 + 文档同步 + 横展）

- **复利链路（严重 #4）**：solutions PHASES 加 architecture；architecture-design 加载协议加复利注入（`tf solutions inject --phase architecture`）；S3.5 SOP 加复利捕获（Step 9）；ce-compound 补架构自动捕获场景
- **agent 契约（严重 #1 #2）**：architecture-design / architecture-reviewer agent 加 product 模式（mode 参数/快照输入/INPUT_ERROR 分 mode/Phase1-A3 分叉/报告落盘 iterations/vN/auto-review.md）
- **门禁触发点（严重 #3）**：`tf arch init` 打戳加 SOP 触发点（S3.5 完成条件 + orchestrator ARCH 节）——arch_baseline 从此可建立，arch 门禁不再永久空转
- **门禁时序（重要 #5 + 一般 #16 #21）**：skip 物化限定最新迭代（防旧 SKIPPED 错误豁免）；iterations 数字排序（v10+）；FAIL 提示文案修正
- **arch 门禁测试（重要 #10）**：新增 tests/lib/guard-arch-gates.test.mjs（7 例）；guard-dimensions 更新 16 维度 + arch-readiness 断言
- **交接/决策门（重要 #12 #7 #6）**：change-brief 加 upstream_arch_ref；架构修订决策门 SOP 定义（deviation 登记）；API-INDEX 只扫已关闭 change；首轮特例状态标注；arch-snapshot 在途兜底
- **guard hook + 门禁说明（重要 #9 #11）**：pre-tool-use-guard 豁免 docs/architecture/iterations/ + .team-flow/；workflow-start/release-archivist 补 arch 门禁说明 + FAIL 升级路径
- **快照生命周期（重要 #8 + 一般 #17）**：s5-monitoring 迭代收尾标 archived；S3.5 补 domains/ + diagrams/ 产出 SOP
- **旧项目链路（重要 #14 + 一般 #22）**：workflow-bootstrap 感知 arch-reverse-analyst/逆向重建（B5 + 修正陈旧指引）；recon-probe.sh 路径修正
- **文档同步（一般 #15 #19 #20）**：AGENTS.md/README 目录树三层化；ch06/state-model/loading-protocol/模板 marker 陈旧修正；workspace 登记（design-doc-system/roadmap）
- **横展（一般 #13 + 建议 #24 #25）**：arch-merge 白名单补 changelog/；doctor 加 arch-state 体检；cross-change 对照产品级注册表

## [0.36.2] - 2026-08-05

### Fixed
- **变更级架构设计输入链缺口修复**：0.36.0 在 architecture-design/SKILL.md 声明产品级快照（`iterations/vN/architecture.md`）为主输入，但 workflow-start 实际 dispatch 子代理的输入列表（`routing-rules.md`）未传该路径——变更级架构设计不会将产品级架构设计作为输入。已同步：routing-rules.md（architecture-design + architecture-reviewer dispatch 输入）、workflow-start/SKILL.md（Step 1）、architecture-reviewer（A5 基线一致性对照产品级快照）

## [0.36.1] - 2026-08-05

### Fixed
- **workflow-orchestrator 流程缺口修复**：0.36.0 的 `references/state-model.md` 已定义 ARCH（S3.5 产品级架构设计）阶段，但 SKILL.md 主体 Execution Flow（S1-S5）/ AGENTS.md / README 未同步该阶段——LLM 执行 orchestrator 会走 S3→S4 跳过架构设计。已同步 11 处：SKILL.md（定位表/Execution Flow 标题/ARCH 阶段节/反馈环路/增量入口/状态模型/Guardrails/Output Standard）+ AGENTS.md（产品级工作流/SOP）+ README（SOP）

## [0.36.0] - 2026-08-05

### Added（产品级架构设计增强——设计增强方案 v0.14 §57-§66）

#### 新阶段
- **architecture 阶段（S3.5）**：S3 计划之后、S4 拆分之前的产品级架构设计
  - 场景判定（全新=正向设计 / 旧项目首轮=逆向重建 / 无结构性变更=可跳过，skip 须物化）
  - 产出 `docs/architecture/iterations/vN/architecture.md`（6 产物：BC/聚合注册表/指令事件/状态机/概念 ER/时序），预测态快照不写全局
  - 产品级评审门（architecture-reviewer `review_mode: product`，PASS 才进 S4）

#### 新命令
- **tf arch init/show**：项目级 `arch_baseline` 打戳（`.team-flow/arch-state.json`，防污染复刻 v0.13 schema_version 模式）

#### guard 门禁
- **arch-readiness**（exploring:specifying）+ **arch-snapshot**（executing:closing），arch_baseline 缺失 → WARN 不 FAIL（存量豁免）

#### arch-merge 重构（v0.14 §62）
- 当前态幂等 upsert 替代 append（marker 区代码独占写 + 成对校验，缺失/重复硬失败）
- 演进日志 changeName 去重 + schema-baseline 幂等追加
- 生成式 PHYSICAL-MODEL / DATABASE / API-INDEX（结构化解析，替代正则扫 markdown）
- 冲突预检（端点冲突 / 聚合重定义转产品级决策门）
- 并发安全：全局写锁 + 白名单 git add + 脏文件告警；dry-run 不落盘

#### 其他
- 变更级输入联动：iterations/vN/ 快照为主输入 + 五项检查路由分流（产品级决策 vs change 内细节）
- 旧项目逆向重建 `arch-reverse-analyst` + 全局三层数据面维护（L1 当前态 / L2 变更增量 / L3 迭代快照）

## [0.35.0] - 2026-08-05

### Added（C1 workflow-feedback 根因修复——6 条 feedback 4 个根因聚类）

#### 新命令
- **tf deisolate**：worktree 生命周期管理（与 `tf isolate` 对称）
  - 支持 Case A（多仓库工作区）和 Case B（单仓库）布局检测
  - `--dry-run`（默认）：输出 worktree 状态报告（分支、ahead/behind、未提交改动）
  - `--merge`：合并 worktree 分支回 master
  - `--clean`：删除 worktree + 分支
- **tf execution refresh-hash**：独立刷新 plan 的 artifacts_hash/contract_hash，不升 revision、不清 receipts

#### Bug Fixes
- **test-merge.mjs**：修复顶层 `main()` 无参自调用崩溃（→ `run()` + `import.meta.url` 守卫）
- **execution-plan.mjs**：`writePlan` revise 时保留 reviews/ 目录（旧 receipt 通过 plan_hash/plan_revision 校验自动失效，不丢证据）
- **execution-plan.mjs**：stale plan 报错信息附 hash 前缀，便于定位是哪个产物变更导致

#### Agent 质量增强
- **build-executor**：BLOCKED 报告强制结构化证据链（blocker.category/root_cause/evidence/attempted_fixes）
- **build-executor**：集成测试环境问题优先走 test-strategy skill，禁止 guess-and-check
- **原子代理协议**：增加"上下文水位例外"（transcript >2MB 或 token >200 万时允许启动新代理替代恢复）

#### Closing 流程增强
- **release-archivist**：Post-Verification 新增 Worktree Deisolation advisory 步骤
- **workflow-start**：§37 原子代理协议更新

#### 来源
- workflow-feedback 2026-08-05（6 条：P1-1~P1-4 + P2-1~P2-2）
- 交叉验证：4 个独立专家验证，16/16 断言通过

## [0.34.1] - 2026-08-04

### Added（工作空间支持——conventions-generator 支持多子项目扫描）

#### 工作空间扫描（v0.34.1 核心特性）
- **scripts/lib/conventions-generator.mjs**：新增工作空间模式
  - `scanSubProjects(root)`：扫描工作空间中的所有子项目
  - `aggregateTechStacks(subProjects)`：汇总所有子项目的技术栈
  - `selectTemplatesForWorkspace(aggregatedTechStack)`：为工作空间选择 conventions 模板
  - `run()` 函数支持自动检测工作空间模式（子项目 > 1 时进入）
  - 输出模式标识：`mode: 'workspace'` 或 `mode: 'single'`

#### 使用场景
- **前后端分离项目**：Java 后端 + Vue 前端 → 生成 Java + JavaScript conventions
- **多语言项目**：Java 后端 + Python 脚本 + JavaScript 前端 → 生成三种语言 conventions
- **单项目兼容**：原有单项目逻辑完全保留

### Tests
- **tests/lib/conventions-generator.test.mjs**：新增 12 个测试（scanSubProjects: 4 / aggregateTechStacks: 3 / selectTemplatesForWorkspace: 5）
- 全量回归：583/583 通过（含 27 个 conventions-generator 测试）
- check-versions ✅

## [0.34.0] - 2026-08-04

### Added（测试能力增强——吸收 glaf4-test 通用能力 + conventions 机制，设计见工作区级文档 team-flow-workspace/docs/plan/test-capability-enhancement-design.md）

#### P0：组合覆盖声明（test-strategy SKILL.md）
- **§8 组合覆盖声明**：多参数方法（param_count > 1）必须声明 `pairwise`，有分支逻辑必须声明 `branch`；contract-builder 生成矩阵后强制对账

#### P1：测试质量规则 + failure 分类法
- **skills/test-strategy/references/test-quality-rules.md**：从 glaf4-test scan-generated-tests.py 抽取 16 条通用规则（断言质量、调试代码残留、测试状态、测试数据、测试结构、矩阵对账、语言特定）
- **scripts/lib/test-record.mjs**：新增 `classifyFailure` 函数，测试失败时自动分类为 6 类（assertion_failure / runtime_error / framework_error / compile_error / dependency_blocker / unknown），记录到 test_result

#### P2：社交测试契约 + 测试隔离分级
- **skills/test-strategy/references/integration-test-contracts.md**：5 种契约类型（入口/协作者/数据/中间件/清理），集成测试的组织方法论
- **skills/test-strategy/references/integration-test-isolation.md**：4 级隔离策略（L1 进程内 / L2 事务 / L3 手动清理 / L4 无隔离），基础设施隔离策略

#### P2：conventions 机制建设（v0.34.0 核心特性）
- **templates/conventions/**：plugin 内置 conventions 模板
  - `glaf4-compliant/java-testing.md`：Java 测试规范（JUnit 5 + Mockito），符合 glaf4-test 要求
  - `glaf4-compliant/spring-patterns.md`：Spring Boot 测试规范，符合 glaf4-test 要求
  - `js-testing.md`：JavaScript 测试规范（Jest/Vitest）
  - `python-testing.md`：Python 测试规范（Pytest）
  - `_manifest.json`：模板清单（版本、描述、适用技术栈）
- **scripts/lib/conventions-generator.mjs**：conventions 生成器脚本
  - 技术栈自动检测（Java/JavaScript/Python）
  - conventions 模板选择和生成
  - 版本管理机制（.versions.json）
  - team-flow.config.json 自动更新
  - 支持存量项目（自动识别）和全新项目（交互式引导）
- **skills/workflow-bootstrap/SKILL.md**：增加 B1.5 阶段（Conventions Generator）

### Tests
- **tests/lib/conventions-generator.test.mjs**：15 个测试（detectTechStack/selectTemplates/generateConventions/updateConfig）
- 全量回归：571/571 通过（含 15 个新增测试）
- check-versions ✅

## [0.33.0] - 2026-08-03

### Fixed（skills 注入恢复——frontmatter YAML 非法导致预加载静默失效，设计见工作区级文档 team-flow-workspace/docs/architecture-api-db-design-enhancement-v0.13.md §54）

#### 根因（P2-41）
- 全部 15 个 agent .md 的 frontmatter 是非法 YAML：`description` 块标量内顶格书写 `<example>`，缩进断裂 → Claude Code 解析静默降级：`skills:` 预加载被丢弃、`tools:` 限制失效、description 回退泛化标签，且无任何警告。插件诞生至今 SKILL.md 方法论从未被注入子代理（v0.32.1 的 contract-builder test-strategy 预加载修复同样未生效）
- **agents/*.md（15 个）**：description 单句化 + 删除 `<example>` 块（LT 决策，学 glaf4 合法写法）；`skills:`/`tools:` 声明保持
- **skills/e2e/SKILL.md**、**skills/test-strategy/SKILL.md**：description 含裸 `: `（非法 YAML）→ 加引号/改写修复；test-strategy 顺带修正预加载主体表述（build-executor / contract-builder）

#### 行为变更
- `skills:` 预加载开始真实生效：dispatch 时 SKILL.md 全文注入子代理上下文
- `tools:` 限制开始真实生效：子代理工具集从全量（117 个，含全部 MCP）收紧为 frontmatter 声明集

### Added
- **tests/lib/frontmatter-lint.test.mjs**（P3-12）：frontmatter 合法性长效门禁——js-yaml 严格解析全部 agents/skills/commands frontmatter + name/description 必填断言 + agent name 与文件名一致 + skills: 引用必须解析到真实 skills/<name>/SKILL.md；进 npm test（58 例），杜绝同类缺陷复发
- devDependency：js-yaml

### Tests
- 全量回归：556/556（lib 498 + lint 58）+ Tier1 e2e + check-versions ✅
- 变异验证：门禁对旧式病态 frontmatter 样本可捕获

## [0.32.2] - 2026-08-03

### Fixed（C1 死锁链修复三件套，设计见工作区级文档 team-flow-workspace/docs/plan/v0.32.2-hook-and-gate-fix.md）

#### pre-tool-use-guard 路径化（P1-44，死锁环1）
- **hooks/pre-tool-use-guard**：新增产物区豁免——Write/Edit/MultiEdit 目标在活动 change 目录内（architecture/、specs/、proposal/design/tasks、contract、test-matrix、reviews 等工作流产物）→ 全状态放行；change 目录外（实现代码）→ 维持状态门禁（仅 approved-for-build/executing/debugging）。修复 exploring/specifying/bridging 阶段产物写入被一刀切拦截、LLM 被迫 Bash 绕过（写入彻底脱管）的死锁
- `.team-flow.yaml` 本身恒受状态门禁（state 禁写红线保留）
- macOS symlink 归一化（/private/var ↔ /var 双侧对齐），防物理/逻辑路径前缀失配

#### exploring→specifying 门禁时序（P3-10，死锁环2）
- **scripts/guard/guard.mjs**：`exploring:specifying` 移除 `artifacts-exist` 维度（四件规划产物由 spec-writer 在 specifying 阶段生成，转换前要求属鸡生蛋死锁）；产物齐全性由 `specifying:bridging` 独家负责（该维度本就挂着，单一责任人）

#### hooks 版本同步（P2-40，发版中断根治）
- **scripts/lib/cmd-version.mjs**：hooks/session-start 纳入自动同步——头部注释行 pattern 后缀改通配（根因：旧 pattern 写死 `: conditional injection` 措辞，hook 注释演进后失配，v0.27.2~v0.32.1 四次发版中断）+ PLUGIN_VERSION 变量首次纳入同步
- 顺带修复：major 版本号硬编码为 0 的缺陷（v1.0.0 里程碑会静默写成 0.x.y）——解构补 major + 全部 replacement 改 %MAJOR% 占位 + 全部 pattern 首段泛化（`0\.` → `\d+`，支持 1.x 匹配）

### Tests
- tests/lib/hook-pre-tool-use.test.mjs：路径化判定 9 场景矩阵（产物区放行/代码区拦截/构建态/禁写红线/无 change/非 Write 工具/相对路径）
- tests/lib/cmd-version-hooks.test.mjs：hooks 双位置同步 + 幂等 + pattern 防腐化 3 例
- guard.test.mjs / guard-dimensions.test.mjs：artifacts-exist 断言迁移至 specifying→bridging + exploring→specifying 新语义断言
- 全量回归：lib 498/498 + Tier1 e2e 68/68 + check-versions ✅

## [0.32.1] - 2026-08-03

> 版本号说明：0.32.0 因 `.npmignore` 缺失 `/tests/` 排除项，误将 61.8M e2e 基线归档打入 tarball（72MB），发布后 30 分钟内撤回；npm 版本号一经发布不可复用，故以 **0.32.1** 重发（内容完全一致 + 打包修复）。

### Added（设计增强方案 v0.13 §47-§53 测试门禁硬化——C1-domain-policy 事件修复）

#### 豁免键修正（v0.13 §48）
- **scripts/lib/state-loader.mjs**：BUILTIN_DEFAULTS 新增 `test_matrix_skip_reason` / `test_evidence_path`；`schema_version` 不进 defaults（字段缺失 = 存量信号）；writeState 条件序列化 `schema_version`
- **scripts/lib/cmd-state.mjs**：init 分支仅在 change 创建（状态文件尚不存在）时打戳 `schema_version: 1`（rebuild/set 不追加）；SETTABLE_FIELDS 移除 `test_result`、新增 `test_matrix_skip_reason`；`test_result`/`schema_version` 手工 set 被拒并给引导
- **scripts/guard/checks/test-gate-exemptions.mjs**：新建共享豁免判定模块（legacy/skip 语义唯一真相源，防三个测试门禁漂移）
- **scripts/guard/checks/test-matrix-complete.mjs**：重写——legacy/skip 双豁免；删除内容型豁免（contract 无 `## Test Matrix` 段即 PASS）与"无 contract → PASS"；删除 hash null 短路；skip 必附理由

#### 门禁前移（v0.13 §49）
- **scripts/guard/checks/test-matrix-ready.mjs**：新建入口维度（矩阵存在非空 + contract 声明段 OR 显式 skip 附理由；legacy 豁免）
- **scripts/guard/guard.mjs**：full `approved-for-build:executing` 新增 `test-matrix-ready`（hotfix/tweak 沿用 §45.3 豁免不挂）

#### tests-passing 证据程序化（v0.13 §50，BUG-A 政策修正）
- **scripts/lib/test-record.mjs**：新建 `tf test record` 命令——maven-surefire（控制台汇总行 + XML 报告目录）/jest(--json)/pytest 解析器 + auto 识别；结构化 `test_result`（recorded-by=tf-test-record）+ 证据落盘 `.superpowers/test-evidence/`；fail 结果 exit 1；无手工自述通道
- **scripts/guard/checks/tests-passing.mjs**：重写——非存量 change 只认程序化结构化记录 + 证据文件存在性；dp_6_result 去证据化（BUG-A 通道仅存量保留）；total=0 空真拒绝；skip 必附理由
- **scripts/team-flow.mjs**：注册 `test` 命令 + HELP

#### review 硬化 + 巡检扩展（v0.13 §51-§52）
- **scripts/lib/execution-plan.mjs**：validateReviewRange 禁止 base==head（空 diff review 非法，C1 现场 6 个 receipt 全为空 diff）；receipt 新增可选 `tests` 统计字段（非负整数校验）
- **scripts/lib/cmd-execution.mjs**：review 新增 `--tests-total/--tests-passed/--tests-failed`（须同时提供）
- **scripts/lib/cmd-doctor.mjs**：新增 checkChangeTestGates 巡检（skip_reason 配对 + arch_review_report/test_evidence_path 引用完整性）
- **scripts/lib/cmd-validate.mjs**：test-matrix 双向互锁（契约段↔矩阵文件，非存量非 skip 时 ERROR）+ hash 漂移警告

### Changed（SOP 硬化批次，v0.13 §52）
- **agents/contract-builder.md**：skills 补 test-strategy 预加载（修复矩阵生成者的预加载断点）+ test-matrix.md 所有权声明
- **skills/contract-builder/SKILL.md**：Test Matrix Generation 升 MUST（full workflow）+ skip 必附理由
- **skills/release-archivist/SKILL.md**：Step 1 零测试条款（0 tests ≠ PASS）+ tf test record 程序化记录；Step 2b 矩阵缺失对非存量 change FAIL（删除静默 SKIP）；dp_6 去证据化说明
- **skills/workflow-start/SKILL.md**：build-executor 返回验证补测试文件检查（SDD/full）；contract-builder 路由声明矩阵必产；入口门禁前移引导
- **skills/workflow-start/references/routing-rules.md**：Route to glaf4-tests 归位（触发主体 = contract-builder；可选的是工具选择，矩阵生成本身强制）
- **skills/session-handoff/SKILL.md**：Guardrail #6 报告生成纪律（LLM 重构报告必须现场核对，C1 报告 10+ 处失真教训）

### Fixed（P3 审查横展修复）
- **skills/workflow-start/SKILL.md**：路由优先级块修正 v0.30.0 引入的存量矛盾——删除"hotfix/tweak 架构设计可跳过（自动写 skipped）"例外句（与 Fast-Path 5 处"不豁免"条款及 v0.9 §26 冲突，且无对应代码行为）；skill-reviewer F-1
- **skills/release-archivist/SKILL.md** + **skills/contract-builder/SKILL.md**：Lightweight Closure / Hotfix Mode 补非存量 change tests-passing 门禁指引（skip+reason 或 tf test record），修复轻量收尾必然撞门禁的断点；skill-reviewer W-0
- **agents/contract-builder.md**：DON'T 列表终态标记条款反向措辞修正；skill-reviewer W-2
- **计数同步**：12 处 manifest/文档的 skill 计数修正为 24 skills（v0.31.0 新增 test-strategy 时漏更的遗留债）；plugin-validator

### Tests
- tests/lib/schema-version.test.mjs（打戳语义 5 例）、test-record.test.mjs（解析器 9 例 + CLI 6 例）、review-hardening.test.mjs（base==head 拒绝 + 统计字段 4 例）
- tests/e2e/deterministic/guard-dimensions.test.mjs：test-matrix-complete 重写为 v0.13 六步判定（9 例）+ test-matrix-ready 新 describe（6 例）+ tests-passing 程序化/skip/负向用例
- tests/lib/cmd-state.test.mjs：test_result/schema_version 拒设用例 + skip_reason 可设用例；tests/lib/guard.test.mjs：closing 前置夹具适配（legacy 夹具直写 yaml 模拟旧 CLI）
- 全量回归：lib 486/486 + Tier1 e2e 67/67

## [0.31.0] - 2026-08-01

### Added（设计增强方案 v0.12 §40-§46 测试矩阵驱动开发 + 测试复利闭环）

#### test-strategy skill（24→25 skills）
- **skills/test-strategy/**：新建测试设计方法论 skill（≤50 行硬规则），含 3 个 references：design-methods-detail.md（10+1 种 design_method 详细说明）、complexity-grading.md（复杂度分级规则 + 圈复杂度计算）、adversarial-patterns.md（对抗验证三招 + 攻击向量模板）
- **agents/build-executor.md**：frontmatter `skills` 新增 `test-strategy` 预加载

#### test-matrix.md 附属产物
- **skills/contract-builder/SKILL.md**：新增 Test Matrix Generation 段（12 列格式 + 候选覆盖台账 + 对抗验证段 + GLAF4 Java 路由）
- **skills/spec-writer/SKILL.md**：新增 Unit/Integration 可选标签（test-matrix 提取 hints）
- **scripts/lib/hash.mjs**：新增 `computeTestMatrixHash()`（独立于 artifacts_hash，避免自循环）
- **scripts/lib/state-loader.mjs**：BUILTIN_DEFAULTS 新增 `test_matrix_hash` / `test_matrix_skipped`
- **scripts/lib/cmd-state.mjs**：SETTABLE_FIELDS 新增 `test_matrix_skipped`；init 计算 test_matrix_hash

#### build-executor 按矩阵 TDD
- **skills/build-executor/implementer-prompt.md**：新增 Test Matrix Protocol 段（TDD/CHARACTERIZATION/REGRESSION 三种 work_mode + 两不原则 + 五步闭环 + 矩阵覆盖率自检）

#### code-reviewer Test Matrix Compliance
- **skills/code-reviewer/SKILL.md**：新增 Step 5b Test Matrix Compliance（case-by-case 验证 + 覆盖率计算 + 候选台账审计 + 金字塔比例检查）
- **skills/code-reviewer/code-reviewer-prompt.md**：reviewer prompt 新增 Test Matrix Compliance 检查段

#### release-archivist Test Matrix Reconciliation
- **skills/release-archivist/SKILL.md**：新增 Step 2b Test Matrix Reconciliation（条件触发 PASS/FAIL/WARN/SKIP）+ Test Merge 段 + closing 顺序更新为 arch-merge → prototype-sync → test-merge → compound promotion

#### guard 维度 test-matrix-complete
- **scripts/guard/checks/test-matrix-complete.mjs**：新建检查（~55 行），4 条豁免路径（显式 skip / 存量兼容 / 无 contract / hash 一致）
- **scripts/guard/guard.mjs**：`executing:closing` 新增 `test-matrix-complete`（full 考核 7 维度）；hotfix `executing:closing` 新增（6 维度，豁免 test-matrix-complete）；tweak 保持 3 维度不变

#### 测试复利闭环（test-ledger + test-merge）
- **scripts/lib/test-merge.mjs**：新建 6 步流程（preCheck → mergeBaselines → resolveDeferred → appendChangelog → rewriteIndex → gitCommit）
- **scripts/lib/test-matrix-export.mjs**：新建 glaf4 JSON → team-flow Markdown 格式转换（test_kind → test_tier 映射）
- **scripts/team-flow.mjs**：注册 `test-merge` + `test-matrix-export` 两个新 CLI 命令

#### 注入侧
- **skills/workflow-orchestrator/references/s1-path-router.md**：新增「测试台账注入」段（读取 docs/test-ledger/INDEX.md，注入 partial 模块列表）
- **skills/workflow-start/references/routing-rules.md**：新增「Route to glaf4-tests」段（GLAF4 Java 项目可选 glaf4-tests design stage）

## [0.30.0] - 2026-08-01

### Added（设计增强方案 v0.11 §39 workflow 健壮性增强，来源：workflow-feedback 2026-08-01 ×9）

#### 5 个 skill 注册为 agent + skills 预加载（解决 feedback #100001 #100006）
- **agents/spec-writer.md / contract-builder.md / build-executor.md / release-archivist.md / need-explorer.md**：新建 5 个 agent 定义（写法 2，仿 architecture-design/code-reviewer），各声明 `skills: [<skill>]` 预加载，正文 WHO/WHAT only（≤100 行）；前 4 个可写（Artifact Ownership + Structured Output Contract），need-explorer 只读交互式
- **skills/workflow-start/SKILL.md**：新增「Sub-agent Dispatch Protocol」——spec-writer/contract-builder/build-executor/release-archivist 从「Route to skill」改为「Dispatch as sub-agent（记录 agentId）」；need-explorer 保持主进程交互
- **skills/workflow-start/SKILL.md**：返回即验证门——子代理返回后立即 `tf validate`，FAIL → SendMessage 回原子代理修复（拦截格式失败于返回时，避免浪费整次执行后再失败）

#### 跨 change 隔离规则（解决 feedback #100000）
- **skills/workflow-start/SKILL.md**：Guardrails 新增「No cross-change artifact modification」——处理 change X 不得编辑 changes/Y/；依赖声明/延迟提醒/走 Y 自身流程三步处置；接入既有但从未编排的 cross-change-consistency-checker agent

#### 子代理实事求是原则（解决 feedback #100002）
- **agents/architecture-design.md**：Red Lines 新增「Verify external suggestions against the codebase BEFORE accepting」——reviewer 建议是输入非指令，先查代码验证，存疑据实反馈主代理
- **skills/workflow-start/references/routing-rules.md**：修正模板从「请修正」改为「先验证 finding 属实性，不属实则据实反馈」（移植 ce-brainstorm 证据原则）

#### 修复→审查严格串行（解决 feedback #100003）
- **skills/workflow-start/SKILL.md + routing-rules.md**：四步协议增加「修复子代理完成前 MUST NOT dispatch 审查子代理」明文 + 并行白名单

#### 统一结果协议（解决 feedback #100008）
- **skills/workflow-start/references/routing-rules.md + 5 个新 agent**：终态标注 `FINAL VERDICT`；SendMessage 为权威结果，task-notification.result 仅内部元数据

#### tf isolate 多仓库工作区重构（解决 feedback #100009）
- **scripts/ensure-branch.mjs**：重写（72→226 行），布局识别 Case A（多仓库工作区 → `.worktrees/<change>/<repo>` 逐仓库 worktree，基于各仓库当前分支）/ Case B（单仓库遗留兼容）；保持 execFileSync 字面参数数组安全形式 + 双参签名
- **skills/build-executor/SKILL.md**：preflight 更新为 `.worktrees/<change>/` 结构
- **tests/lib/ensure-branch.test.mjs**：新增 Case A 多仓库夹具 + worktree 落点断言

### Fixed

#### 子代理 state 禁写（解决 feedback #100004）
- **skills/{spec-writer,need-explorer,contract-builder,build-executor,release-archivist}/SKILL.md**：横展新增「MUST NOT 修改 state/workflow 核心字段」红线
- **skills/workflow-start/SKILL.md**：State Writes 职责边界明确子代理 state 禁写；**修正 DP 编号错位**（dp_0=DP-0 确认门 / dp_1=need-explorer / dp_2=spec-writer / dp_3=contract-builder / dp_5=build-executor+bug-investigator）
- **scripts/lib/state-loader.mjs**：VALID_STATES 抽为共享导出（消除魔法常量）；writeState 加 state 合法性校验（defense-in-depth）
- **scripts/lib/cmd-doctor.mjs**：新增 checkChangeStates 巡检（拦截子代理 Edit 绕过 CLI 的非法 state 值）

#### tf state transition 命令体验（解决 feedback #100005）
- **scripts/lib/cmd-state.mjs**：run() 入口 `path.resolve(changeDir)` 修相对路径下 guard 找不到产物的 bug（横展确认同类 bug 仅此一处）；`tf state set ... state` 报错升级为完整 transition 语法示例
- **skills/workflow-start/SKILL.md**：补 `tf state transition <绝对路径> <目标状态>` 示例 + 厘清与 `tf runtime guard check` 关系；修正「三步/四步协议」旧表述

#### 存量 agent 颜色修复（关闭 P2-22）
- **agents/cross-change-consistency-checker.md**：`color: orange`（非法值，plugin-validator 发布门禁阻断项）→ `red`；横展确认 agents/ 仅此一处 orange（prototype-builder 已是 green）

### Documentation
- **设计增强方案 v0.11**：补写 §38（v0.29.0 已发布内容回写，修文档债）+ 新写 §39（v0.30.0 四根因修复）+ 待办列表追加 9 条（P1-28~32 / P2-23~24 / P3-5）+ B4 降级项 P2-26
- **roadmap-and-todos.md**：v0.30.0 里程碑 + 待办同步
- **AGENTS.md / README.md / plugin.json 等 8 处**：agent 计数 10/8→15（既有「8 agents」漂移一并修正）+ Agents 索引 +5 行

### Deferred
- **B4 validator WHEN/THEN 结构校验**（P2-26 → v0.31.0）：countScenarios 仅校验 Scenario 头存在，WHEN/THEN 从未强制；既有 spec 合规性未知，硬置 ERROR 有回归风险，需专项夹具，降级后续迭代

## [0.29.1] - 2026-08-01

### Fixed（子代理复用 SOP 强化）

- **skills/workflow-start/SKILL.md**：四步协议摘要中明确"记录子代理 ID + 循环修正/DP-A 调整必须 SendMessage 恢复原子代理"
- **skills/workflow-start/references/routing-rules.md**：Step 1 增加子代理 ID 记录指令；Step 2 审查循环从隐式 resume 改为"⛔ 必须 SendMessage 恢复，禁止启动新子代理"；Step 4d 从"优先 SendMessage"改为"⛔ 必须 SendMessage"；反模式清单增加"启动新子代理"禁令
- 来源：LT 实测发现主代理在循环修正时启动新子代理而非恢复原子代理

## [0.29.0] - 2026-07-31

### Added（§37 DP-A 确认门 + 产物权限规则 + A4 增强，来源：workflow-feedback 2026-07-31 × 7）

#### DP-A 用户确认门（解决 feedback #1 #5）
- **skills/workflow-start/SKILL.md**：三步协议升级为四步协议，Step 4 DP-A 用户确认门（架构决策摘要输出 + AskUserQuestion + 调整转交子代理）
- **skills/workflow-start/references/routing-rules.md**：Step 4 完整协议（4a 摘要 + 4b 项目规范变更提示 + 4c AskUserQuestion + 4d 选择处理 + SendMessage 复用指导）
- **scripts/lib/state-loader.mjs**：新增 `dp_a_result` / `dp_a_timestamp` / `dp_a_adjustments` 字段（BUILTIN_DEFAULTS + writeState）
- **scripts/lib/cmd-state.mjs**：`dp_a_*` 加入 SETTABLE_FIELDS 白名单

#### Artifact Ownership 产物修改权限规则（解决 feedback #5 #6）
- **skills/workflow-start/SKILL.md**：Guardrails 新增"主代理不得直接修改子代理产物"显式禁令
- **skills/workflow-orchestrator/SKILL.md**：Guardrails 同步新增 Artifact Ownership 条款
- **agents/architecture-design.md**：新增"architecture/ 目录唯一负责人"声明

#### A4 审查 PRD 功能清单交叉验证（解决 feedback #7）
- **agents/architecture-reviewer.md**：A4 维度增加双对照源（brief + PRD 功能清单）、子实体 CRUD 完整性检查、PRD vs api.md 端点交叉验证
- **skills/architecture-design/SKILL.md**：api.md 增加 PRD 功能清单→API 端点映射表要求
- **agents/architecture-design.md**：Red Lines 增加 PRD 映射表产出要求
- **agents/change-split-auditor.md**：Dim 1 增加子实体操作完整性检查

#### change 目录命名版本前缀（解决 feedback #2）
- **skills/workflow-orchestrator/references/s4-split-validate.md**：命名规范 `v{N}-C{n}-{kebab-name}`、change_dag 增加 `prd_version` 字段

### Fixed（代码层贯通）

- **scripts/lib/state-loader.mjs**：补齐 `arch_review_verdict` / `arch_review_rounds` / `arch_review_report` 字段（v0.28.1 §36 遗留的"死命令"问题）
- **scripts/lib/cmd-state.mjs**：`arch_review_*` 加入 SETTABLE_FIELDS 白名单

### Documentation

- 工作区 **CLAUDE.md**：更新 arch_design_* 差异表（代码层已全链路贯通）、代码强制执行点、内置字段列表

## [0.26.0] - 2026-07-29

### Added（配置管理与 Skill 降级逻辑补强，4 项）

#### Config-loader 查找顺序优化
- **scripts/lib/config-loader.mjs**：`findConfigFile` 函数增加 `.team-flow/team-flow.config.json` 查找路径（优先于项目根目录）。新查找顺序：① `.team-flow/` → ② 根目录（兼容旧路径）→ ③ git 根 → ④ home

#### ce-brainstorm Phase 0.0 降级逻辑补强
- **skills/ce-brainstorm/SKILL.md Phase 0.0**：增加 tf CLI 可用性检查（`which tf`），不可用时走显式降级逻辑：询问用户（默认模板 or 自定义路径）→ 在 `.team-flow/templates/` 创建模板 → 维护配置到 `.team-flow/team-flow.config.json`
- **skills/ce-brainstorm/SKILL.md Phase 0.0**：增加 guardrail——明确禁止写入 skill 源码目录，项目级制品只在项目工作区创建/修改

### Documentation（1 项）

- **docs/architecture-api-db-design-enhancement-v0.10.md**：新增第 32 章「配置管理与 Skill 降级逻辑补强」

## [0.25.1] - 2026-07-29

### Changed（SKILL.md 渐进式披露拆分，P1-9，3 项）

#### ce-proof (346→88 行)
- **skills/ce-proof/SKILL.md**：保留核心决策逻辑（Identity/Credentials/Publish Mode/Edit Strategy/Safety），curl 示例和工作流移入 references
- **skills/ce-proof/references/api-recipes.md**（新增）：Create/Read/Edit/Presence/Title/Delete 的完整 curl 示例 + 错误码表 + Marks & Privacy + When the loop breaks
- **skills/ce-proof/references/workflows.md**（新增）：Review/Create/Pull 三个完整工作流

#### ce-brainstorm (458→122 行)
- **skills/ce-brainstorm/SKILL.md**：保留核心原则 + 每个 Phase 摘要 + reference 引用指针
- **skills/ce-brainstorm/references/output-format.md**（新增）：OUTPUT_FORMAT 5 级优先级解析逻辑
- **skills/ce-brainstorm/references/phase0-routing.md**（新增）：Phase 0 的 Resume/Classify/Verdict/Assess/Scope/Spine/Iteration 详细路由
- **skills/ce-brainstorm/references/prototype-loop.md**（新增）：Phase 3.5 原型内循环完整流程
- **skills/ce-brainstorm/references/grounding.md**（新增）：Phase 1.1 上下文扫描 + grounding scout 提示词 + Slack 路由

#### ce-ideate (402→85 行)
- **skills/ce-ideate/SKILL.md**：保留核心原则 + Phase 摘要 + reference 引用指针
- **skills/ce-ideate/references/phase0-scope.md**（新增）：Phase 0 完整路由逻辑（输出模式/主题门/模式分类/上下文门/聚焦与容量/成本透明）
- **skills/ce-ideate/references/grounding.md**（新增）：Phase 1 模式感知 Grounding（仓库/非仓库调度 + Web 研究 + 用户研究工件 + 综合摘要）
- **skills/ce-ideate/references/topic-surface.md**（新增）：Phase 1.5 主题表面分解（轴标准 + 证据侦察）

## [0.25.0] - 2026-07-29

### Added（brainstorm profile 机制，3 项）

#### Brainstorm Profile 机制
- **templates/prd-brainstorm-profile.md**（新增）：GTMC D7 模板的 brainstorm profile，定义核心思考维度（7 项：业务流程/状态模型/权限模型/用户角色/数据关系/业务规则/系统功能）、扩展维度（6 项：画面设计/业务术语/报表需求/交互机制/非功能性需求/编码规则）、反例边界（7 项：禁止后端模块划分/前端页面结构/数据库表设计/API 接口定义/技术选型/部署架构/代码结构）和正向示例
- **skills/ce-brainstorm/references/prd-mapping.md**：新增"Brainstorm Profile 机制"完整说明（文件命名规则、查找优先级、三段结构、自定义 Profile 指南）
- **skills/ce-brainstorm/references/brainstorm-sections.md**：新增"Brainstorm profile coverage check"段落，确保核心维度在 PRD 中被覆盖

### Changed（Phase 0 模板选择 + Phase 2 profile 驱动，4 项）

#### PRD 模板交互式选择
- **skills/ce-brainstorm/SKILL.md Phase 0.0**：PRD 模板解析改为 MANDATORY STEP——必须执行 bash 命令检查配置，未配置自定义模板时强制使用 AskUserQuestion 询问用户选择默认或自定义路径，并自动写入 `team-flow.config.json`
- **skills/ce-brainstorm/SKILL.md Phase 2**：新增"Load brainstorm profile"步骤，按 profile 维度约束方案探索；"Approach granularity"从"mechanism/product shape"改为"profile-driven product thinking, not architecture"
- **skills/ce-brainstorm/SKILL.md 调用模式**：明确声明 `orchestrated` 模式仅跳过 Phase 3.5，Phase 0-3 均正常执行不可跳过

#### Config 默认值
- **scripts/lib/config-loader.mjs**：DEFAULTS 增加 `prd.template: 'templates/prd.md'`，`tf runtime config --get prd.template` 未配置时返回默认值而非报错

### Documentation（1 项）

- **AGENTS.md**：`prd.template` 配置字段说明扩充（含 brainstorm profile 关联说明）；通用性描述补充 profile 注入机制

## [0.24.1] - 2026-07-28

### Fixed（prototype skill 体系补强，5 项）

#### P0: design-system-architect.md 重复维护
- **prototype/references/agents/design-system-architect.md**: 替换为迁移指针，指向 `design-system skill` 下的权威版本，消除两份文件内容漂移风险

#### P0: Open Design 命名歧义
- **prototype/SKILL.md**: description 中明确标注 "Open Design 桌面应用"（GUI 工具，互斥项）与 "nexu-io/open-design 开源设计方法论"（craft 规则借鉴源）同名不同义；新增「方法论参考与归因」段

#### P1: prototype-sync 自动触发
- **prototype/SKILL.md**: prototype-sync 段从 "SOP" 升级为 "release-archivist 自动触发"，明确标准路径是 closing 流程自动触发
- **release-archivist/SKILL.md**: 新增 prototype-sync 执行校验段，要求检查 stdout 输出，禁止在未执行时标注为已完成
- **release-archivist/references/closing-procedures.md**: 同步执行校验段和 write-back order 约束

### Added（原型设计能力扩展，2 项）

#### P2-1: 交互原型 + 线框图方法论
- **prototype/references/interactive-prototype.md**: 新增交互原型方法论（零依赖状态管理、表单验证、多步导航、动态列表）
- **prototype/references/wireframe.md**: 新增线框图方法论（低保真快速探索、3-5 差异化方案、并排对比）
- **prototype/references/orchestration-flow.md**: prompt 组装顺序契约新增原型类型注入策略（wireframe / interactive / static）

#### P2-2: C 端骨架扩展
- **prototype/references/layouts.md**: 新增 §9-§14 C 端骨架（hero-xl / marketing-features / social-proof / pricing-c / faq / cta-c），新增 C 端页面节奏表
- **prototype/references/template.html**: 新增 C 端扩展 CSS（hero-xl / pricing-card / faq-item / urgency 等）

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
