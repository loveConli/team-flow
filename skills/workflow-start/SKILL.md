---
name: workflow-start
description: Primary entry point for the team-flow state-machine workflow. Invoke when the user is inside an active team-flow change directory (look for .team-flow.yaml, changes/<name>/, proposal.md, specs/, design.md, tasks.md, or execution-contract.md) and asks to start, continue, resume, implement, plan, or figure out the next workflow step. Also invoke when the user explicitly asks to start a new team-flow change or route through the team-flow workflow. Do not invoke for unrelated coding tasks that happen to use words like start, continue, implement, or plan.
---

# Workflow Start

Primary entry point for `team-flow`. Jobs: inspect change context, check for updates, confirm DP-0, determine state, route to correct skill, block invalid transitions.

## Use This Skill When

Only invoke when team-flow context is present: `.team-flow.yaml` exists, artifacts like `proposal.md`/`specs/`/`design.md`/`tasks.md`/`execution-contract.md` are present, or user explicitly invokes team-flow by name. When in doubt, check for `.team-flow.yaml` first.

Do NOT invoke for: general coding tasks outside team-flow changes, casual questions, unrelated work.

## States

`exploring` → `specifying` → `bridging` → `approved-for-build` → `executing` → `closing`, with `debugging` side-path from `executing`, and `abandoned` as terminal. If a transition is ambiguous, run `tf runtime asset read docs/state-machine.md`.

**状态转换命令（v0.30.0）**：实际转换用 `tf state transition <change-dir 绝对路径> <目标状态>`（内部自动执行 guard 校验并写入 `.team-flow.yaml`）。`tf runtime guard check <dir> <from> <to> --json` 是转换前的独立预检（fail = BLOCK）。**恒用绝对路径**——相对路径下 guard 子进程与状态文件解析基准不一致会找不到产物（v0.30.0 修复）。

## Initialization

1. **Update check**: Run `tf runtime check-update`. Exit 0 → continue. Exit 1 → non-blocking upgrade reminder. Exit 2 → skip.
2. **Inspect change folder**: Check for `proposal.md`, `specs/`, `design.md`, `tasks.md`, `execution-contract.md`. Answer: Is the change fuzzy? Artifacts missing/unstable? Contract exist? User approved contract? Execution in progress or blocked? In verification/wrap-up?
3. **Overlay recovery scan**: Run `tf handoff list <change-dir> --json` and `tf checkpoint list <change-dir> --json`. A `result-ready` handoff requires explicit review and `tf handoff resolve` before resuming the affected work. An `active` handoff is non-blocking side work. Show a non-stale checkpoint as recovery context; show a stale checkpoint only as historical evidence.
4. **Execution-control recovery scan**: For `approved-for-build`, `executing`, `debugging`, or `closing`, run `tf execution show <change-dir> --json`. Treat only `current: true` plus `waves[].eligible: true` as permission to start a wave; report plan revision, mode, next eligible wave, and every wave's receipt/blockers. A missing, invalid, or stale plan blocks implementation and routes to `build-executor`; do not infer progress from chat history.

## DP-0: User Confirmation Gate

Run DP-0 when: change folder doesn't exist, planning artifacts missing/empty, or `dp_0_confirmed` ≠ `true`. Skip if `dp_0_confirmed` is `true`.

### Upstream Inheritance (v0.9)

若 `change-brief.md` 存在且 `upstream_source == orchestrator`（本 change 由 orchestrator S4 分发），**继承** brief 的 scope/约束/AC 为默认值，DP-0 从"从零问"改为"一次确认继承或修正"，**不**重新问"你想做什么"。否则（手动新建 / hotfix / 单 change 快速通道 / 存量 change 无 brief）照常 DP-0。**主信号 = brief 文件存在**（非 yaml 字段——可天然排除无 brief 的快速通道，且对存量手动 change 零误伤）；双源冲突以 `prd/vN/plan.md` 为准并触发 Brief drift（见「Staleness Detection」）。完整判定伪代码与主信号理由见 `references/routing-rules.md`「DP-0」。

Ask (manual path): change name + one-sentence intent, known constraints, related optimizations (include or stay focused?), communication preference (ask per decision or draft for review).

After confirmation:
```bash
tf state set <change-dir> dp_0_decisions "<summary>"
tf state set <change-dir> dp_0_result confirmed
tf state set <change-dir> dp_0_confirmed true
tf state set <change-dir> dp_0_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```

Config-aware routing: check `artifacts.order` and `artifacts.skip` from project config.

## Mode Detection

If workflow is `auto`/`null`/unset: run `tf runtime infer <change-dir>`. Inference: **hotfix** (≤2 tasks, ≤2 files, no schema/API/new modules), **tweak** (≤4 tasks, config/doc only), **full** (anything larger). Persist with `tf state set <dir> workflow <mode>`.

Validate mode against artifact content. If hotfix/tweak criteria not met → upgrade to `full` and output reason. Don't overwrite explicit mode unless user asks.

## Routing Rules

> **⚠️ 路由优先级（硬规则）**：路由按文档顺序从前到后评估，**第一个匹配的路由必须执行**。关键门控：`arch_design_decision` 为 `null` 时 MUST 路由到 `architecture-design`，即使后续路由（spec-writer / contract-builder / build-executor）的其他条件也满足——架构判定是 exploring→specifying 的硬前置，不可跳过。hotfix/tweak 走快速转换，guard 不挂 `arch-design` 维度（`exploring:bridging`/`exploring:approved-for-build` 为空维度），但 **SOP 层仍须过 architecture-design 判断门，不豁免**（v0.9 §26，见 Fast-Path Routing；hotfix 可能正是架构缺陷导致）——判断结果由 architecture-design 子代理写入 `arch_design_decision`，无"自动写 skipped"行为。

### Sub-agent Dispatch Protocol (v0.30.0)

产出型路由（spec-writer / contract-builder / build-executor / release-archivist）通过 `Agent(subagent_type: "team-flow:<name>")` **dispatch 子代理**执行——agent 定义经 `skills:` 预加载对应 SKILL.md，主代理**不得**凭记忆手写产物格式 prompt。need-explorer 为交互式澄清，**主进程执行**（需与用户对话；其 agent 定义 `team-flow:need-explorer` 仅作可 dispatch 后备）。

- **记录 agentId**：dispatch 后立即记录子代理 ID；修复一律 SendMessage 恢复原子代理（禁启动新子代理，见 v0.29.0 §37）
  - **上下文水位例外（v0.35.0）**：当原子代理 transcript 超过 2MB 或累计 token 消耗超过 200 万时，主代理可以启动新代理替代恢复。新代理必须接收完整交接文档（当前进度、已完成 wave 列表、未解决问题、artifact 位置、已知 blocker），以保证连续性。此为 SendMessage 恢复原则的唯一补充例外
  - **build-executor 交互轮次轮转（v0.36.4）**：主代理通过 SendMessage 恢复 build-executor 时，累计交互轮次。当累计 ≥6 轮（~3 wave 的典型交互量：放行→实施→审查→FAIL→修→复评）时，checkpoint 当前进度并启动新 build-executor 子代理。交接文档必须包含：已完成 waves 及 receipt 状态、累积技术决策（如命名约定、架构选型）、worktree commit SHA、剩余 waves 及依赖关系。此规则独立于上下文水位例外——两者取先触发者
- **返回即验证（validation gate）**：子代理返回产物后**立即** `tf validate <change-dir>`；FAIL → SendMessage 回**原**子代理修复，通过后才能继续/转换。把格式失败拦截在返回时，而非状态转换时（避免浪费整次执行后再失败）。**build-executor 附加验证（v0.13 §52 B3，SDD/full 模式）**：返回的 diff 中必须包含测试文件（src/test/ 或项目测试目录）；零测试文件的实现返回一律 BLOCK，SendMessage 回原子代理按 test-matrix.md / TDD Iron Law 补齐——不得以"手动验证"替代（C1-domain-policy 事件教训）。例外：已显式记录 `test_matrix_skipped=true` + 理由的 change（纯文档/配置类）不要求测试文件
- **结果协议**：子代理终态须标注 `FINAL VERDICT: <DONE|BLOCKED|FAIL>`（审查类用 PASS/PASS_WITH_WARNINGS/FAIL）；**SendMessage 报告为权威结果**，task-notification.result 仅内部元数据
- **子代理状态边界**：子代理 MUST NOT 修改 `.team-flow.yaml` 的 `state`/`workflow` 核心字段（状态转换是主代理专有职责，经 `tf state transition` 执行），只写自己的 `dp_N_*` 决策字段

### Route to need-explorer
Change is fuzzy, scope unclear, comparing options, no stable change name.（交互式澄清，主进程执行，见 Sub-agent Dispatch Protocol）

### Route to architecture-design (v0.9 §26, v0.28.1 §36 审查增强, v0.29.0 §37 DP-A 确认门)
Guard: `arch_design_decision` in `.team-flow.yaml` is `null` → must run before spec-writer.

**Four-step protocol (MUST execute in order)**:

> **⛔ 串行约束（v0.30.0）**：四步严格串行。**修复子代理（architecture-design）完成前 MUST NOT dispatch 审查子代理（architecture-reviewer）**——并行会使审查跑在修复之前、误报"全部未修复"FAIL（来源：workflow-feedback 2026-08-01）。并行白名单：仅多个独立 change 的工作可并行；修复→审查、设计→审查必须串行。

1. **Dispatch**: `architecture-design` as sub-agent（**输入含 `docs/architecture/iterations/<vN>/architecture.md` 产品级架构快照**，v0.36.0——变更级只引用产品级聚合注册表，不重定义）→ returns `decision` + `reason` + `artifacts`。**⛔ 记录子代理 ID**（后续循环修正和 DP-A 调整必须通过此 ID 恢复，禁止启动新子代理）
2. **Auto-review** (decision=required 时触发): 校验产物文件存在且非空 → dispatch `architecture-reviewer` sub-agent（**记录子代理 ID**）→ FAIL 则通过 **SendMessage 恢复原 architecture-design 子代理**修正（≤3 轮 + 收敛检测，不收敛转人工）→ 报告落盘 `changes/<name>/architecture/auto-review.md`
3. **Reasonableness check + state write**: PASS/PASS_WITH_WARNINGS → write `arch_design_decision` + `arch_review_*` to yaml; skipped + brief 含架构关键词 → BLOCK; required + artifacts 缺失 → BLOCK; required + auto-review FAIL → BLOCK
4. **DP-A 用户确认门（v0.29.0 §37）**: 输出架构决策摘要 → AskUserQuestion 确认 → 需要调整时**必须通过 SendMessage 恢复原子代理**修改（禁止主代理直接修改，禁止启动新子代理）→ 修改后 SendMessage 恢复原 reviewer 重新 auto-review → 回到本步骤重新确认。含项目规范变更提示（advisory）。详见 `references/routing-rules.md`「Step 4: DP-A」

Full protocol in `references/routing-rules.md`「Route to architecture-design」.

### Route to spec-writer (dispatch sub-agent)
Guard: `tf runtime guard check <dir> exploring specifying --json` → fail = BLOCK. **arch_design_decision must not be null** → fail = BLOCK (v0.9 §26). User knows what they want, artifacts missing/incomplete.

### Route to contract-builder (dispatch sub-agent)
Guard: `... check <dir> specifying bridging --json` → fail = BLOCK. Artifacts exist, implementation requested, contract missing/stale. Include `DP-3: 契约批准`. **full workflow 必产 test-matrix.md（v0.13 §52 B1）**：契约 `## Test Matrix` 段 + 非空矩阵文件 + `tf state rebuild` 捕获 hash；确无测试需求只能显式 skip + 理由（`test_matrix_skipped=true` + `test_matrix_skip_reason`）。GLAF4 Java 项目矩阵生成的工具选择见 `references/routing-rules.md`「Route to glaf4-tests」。

### Route to build-executor (dispatch sub-agent)
Contract exists and approved, contract matches artifacts. Include `DP-4: 执行模式选择`: propose waves, run `tf execution recommend <change-dir> [--wave ...]`, show the user every available mode plus evidence and the recommendation, then obtain a clear selection. The command saves a current receipt; before the first implementation edit, `build-executor` must run `tf execution plan <change-dir> --mode <selected> --confirm ...` (and `--acknowledge-recommendation` when the selected mode differs from the recommendation) using matching artifacts, contract, and waves, then `tf execution show <change-dir> --json`; report the saved revision, selected mode, recommendation alignment, ordered waves, and actual concurrent-dispatch capability. A revision must repeat recommend and confirmation. Do not transition to `executing` until `show` reports `current: true`; then run `... check <dir> approved-for-build executing --json` → fail = BLOCK. **v0.13 §49 门禁前移**：该 guard 含 `test-matrix-ready` 维度——full 模式非存量 change 必须"带着矩阵开工"（矩阵存在非空 OR 显式 skip 附理由）；FAIL 时回 bridging 让 contract-builder 补矩阵，或按指引显式 skip，禁止绕过。

### 阶段产物同步门禁点（v0.37.0 §68.2 G4）

契约批准（DP-3）后、进入实施（DP-4）前，**阻塞确认**（AskUserQuestion）是否同步 change 规划制品（团队协作：契约是实施授权）：
- **A 提交并推送**：`tf publish --changes <change-dir> --push`
- **B 仅提交不推送**：`tf publish --changes <change-dir>`
- **C 暂不同步**：直接进入实施，后续可补

同步对象：change 规划制品 4+1（proposal / specs / design / tasks / execution-contract）+ `architecture/`。

### Route to bug-investigator
Execution hit blockage: test failure, unexpected behavior, build error, task cannot proceed. After debugging, route back to build-executor.

### Route to code-reviewer
The current planned wave is implemented and ready for spec-compliance + code-quality verification. A reviewer must write an `tf execution review <change-dir> --wave <id> --base <sha> --head <sha> --report <path> --verdict <pass|fail>` receipt before any dependent wave or closing transition.

**逐 wave 审查纪律（v0.36.4）**：每次 code-reviewer dispatch 只审查**一个** wave。禁止将多个 wave 合并为一次审查（vrm4teamflow C1 事件：W1-W4 合并审查导致设计约定类问题在 W4 才发现，修复范围扩大到 8 个 batch）。parallel wave 内的多个 task 作为整体审查一次（receipt 是 wave 级别），但审查 prompt 必须包含每个 task 的独立 diff。

### Route to release-archivist (dispatch sub-agent)
Guard: `... check <dir> executing closing --json` → fail = BLOCK. Implementation complete, verification complete/nearly complete. Include `DP-7: 归档确认`.

### Route to spec-merger
Delta specs exist that need merging, change closing with ADDED/MODIFIED/REMOVED/RENAMED specs.

### Route to abandoned
User explicitly requests, bug-investigator escalates after 3+ failures AND user chooses, scope change makes change no longer worthwhile AND user confirms. Block from `closing` or `abandoned`.

### Optional Prototype Handoff

When the user's brief explicitly contains UI, screen, interaction, layout, UX,
or product-experience uncertainty, ask once whether a prototype would reduce
uncertainty. Do not create a prototype handoff or enter a prototype worktree
until the user confirms. After confirmation:

```bash
tf handoff create <change-dir> \
  --type prototype --objective "<confirmed objective>" \
  --expected-output "<expected evidence>" --acceptance "<completion criterion>"
tf isolate <change-dir> prototype-<handoff-id>
```

Never suggest or enter this route automatically for backend, CLI, configuration,
or internal-refactor work. Never pass `--force` to `tf isolate` for prototype
work.

### Fast-Path Routing

**DP-0 处理**（v0.22.5 F03 修复）：hotfix/tweak 路径隐式跳过 DP-0（`dp_0_confirmed` 保持 `null`），因为意图已明确（修复/微调），无需从零探索。contract-builder 的 DP-3 审批成为唯一门禁。

- **Hotfix**: Route to contract-builder (minimal), skip need-explorer + spec-writer, guard check `exploring bridging --workflow hotfix`, then `bridging -> approved-for-build`, after DP-3 → build-executor (recommend, show, and confirm an execution mode), after → release-archivist (lightweight). Hotfix may skip `proposal.md`, `design.md`, `tasks.md`, and `specs/`, but it still requires a fresh minimal `execution-contract.md`, DP-3 approval, and a current execution plan before build. **architecture-design 不豁免**（v0.9 §26）：同样过 architecture-design 子代理判断门，快速判定是否涉及架构变更（hotfix 可能正是架构缺陷导致）
- **Tweak**: Route to build-executor (direct edit), skip need-explorer + spec-writer + contract-builder, guard check `exploring approved-for-build --workflow tweak`, after → release-archivist (lightweight). **architecture-design 不豁免**（v0.9 §26）：同样过 architecture-design 子代理判断门

Post-transition: 💡 `tf inject <change-dir>` to update phase-guard artifacts.

## Staleness Detection

Use content inspection, not timestamps.

**Stale contract**: proposal scope expanded beyond contract scope fence, or contract references capabilities no longer in proposal → route back to `contract-builder`.

**Stale planning artifacts**: capability in proposal has no spec file, or spec exists for capability not in proposal → drift detected.

**Stale tasks**: requirement in specs has no corresponding task → stale tasks.

**Brief drift (advisory, v0.9, 不阻断)**: change-brief.md 是上游输入（非 team-flow 产物），**不**混入上述三条产物互查、**不**进入 `artifacts_hash`。当 brief 的 `plan_hash` 与当前 `prd/vN/plan.md` 不一致，或 brief AC 列表与 PRD 功能清单明显出入 → 提示"产品层已变更，brief 可能过期，建议回 orchestrator 重新分发（S4→S3 环路）"，**不**触发产物重审。

## Guardrails

- No implementation before planning artifacts or contract exist
- No implementation for full/hotfix without a current `tf execution plan`; no state transition based on an unverified DP-4 string
- No "continue" without state inspection
- No implementation past stale contract
- No implementation past bug without investigation
- No closure without all planned wave review receipts recorded as `pass`
- No closure with unsynced delta specs
- No transitions from `abandoned` (terminal)
- No transition to `abandoned` from `closing` or `abandoned`
- No auto-abandon without user confirmation
- No merging delta specs from abandoned change
- **No routing to spec-writer without architecture-design gate pass** (v0.9 §26): `arch_design_decision` must be `required` or `skipped` (not `null`). hotfix/tweak 不豁免
- **No arch state write without auto-review PASS** (v0.28.1 §36): when `decision: required`, auto-review MUST complete with PASS or PASS_WITH_WARNINGS before writing `arch_design_decision` to yaml. FAIL → loop fix (≤3 rounds) or escalate to human
- **No routing past DP-A without user confirmation** (v0.29.0 §37): architecture-design 四步协议完成后，必须经 DP-A 用户确认门（AskUserQuestion）才能路由到 spec-writer。用户选择"需要调整"时，修改必须通过子代理执行，修改后重新 auto-review + 重新 DP-A 确认
- **Artifact Ownership — 主代理不得直接修改子代理产物** (v0.29.0 §37): 子代理是其产物的唯一负责人（architecture-design → `architecture/` 目录，spec-writer → `proposal.md`/`specs/`/`design.md`/`tasks.md`，contract-builder → `execution-contract.md`）。主代理（workflow-start）不得通过 Read + Edit/Write 直接修改子代理的产物文件。修改必须通过 `SendMessage` 恢复原子代理（优先）或启动新子代理执行。例外：仅当子代理无法启动且用户明确授权时，主代理可直接修改，但必须在修改后重新触发对应的 review 验证
- **No cross-change artifact modification (v0.30.0)**: 处理 change X 时 **MUST NOT** 编辑 `changes/Y/`（Y≠X）下任何产物。发现跨 change 依赖/问题时：① 在 change X 的 ADR/proposal 中显式声明依赖；② change Y 进入 workflow-start 时，扫描是否有其他 change 声明了对 Y 的依赖并提醒用户；③ change Y 的产物修改必须走 Y 自己的完整流程（architecture-design → auto-review → DP-A），不得绕过。跨 change 一致性核查可调度 `cross-change-consistency-checker` agent（来源：workflow-feedback 2026-08-01）

## State Writes (v0.22.5 F06 修复)

workflow-start 负责写入以下字段到 `.team-flow.yaml`：

**核心状态字段**：
- `state`：当前状态（exploring/specifying/bridging/approved-for-build/executing/debugging/closing/abandoned）
- `workflow`：工作流类型（auto/full/hotfix/tweak）

**决策点字段**（各阶段确认后写入；v0.30.0 修正错位，以各 skill 实际 `tf state set` 为准）：
- `dp_0_*`：DP-0 用户确认门（workflow-start 本 skill 写入）
- `dp_1_*`：need-explorer 完成后的需求澄清决策
- `dp_2_*`：spec-writer 完成后的规格决策
- `dp_3_*`：contract-builder 完成后的契约决策
- `dp_5_*`：build-executor 执行决策 / bug-investigator 调试决策（共享 dp_5；dp_4 预留未用）
- `dp_6_*`：release-archivist 完成后的验证决策
- `dp_7_*`：release-archivist 归档确认决策

**架构设计门控字段**（v0.9 §26，v0.22.5 F02 修复）：
- `arch_design_decision`：`required` | `skipped`（architecture-design 子代理返回，workflow-start 经 auto-review + reasonableness check 后写入）
- `arch_design_reason`：判断理由
- `arch_design_timestamp`：ISO 8601 时间戳（UTC）
- `arch_design_artifacts`：产出路径列表（required 时必填，skipped 时为空）

**架构审查字段**（v0.28.1 §36，decision=required 时写入）：
- `arch_review_verdict`：`PASS` | `PASS_WITH_WARNINGS`（auto-review 最终判定）
- `arch_review_rounds`：审查轮次（1-3）
- `arch_review_report`：`architecture/auto-review.md` 路径

**DP-A 确认门字段**（v0.29.0 §37，DP-A 用户确认后写入）：
- `dp_a_result`：`confirmed` | `adjustment_requested`（用户确认结果）
- `dp_a_timestamp`：ISO 8601 时间戳（UTC）
- `dp_a_adjustments`：用户调整意见摘要（adjustment_requested 时必填，confirmed 时为空）

**职责边界**：architecture-design 负责判断+产出，architecture-reviewer 负责 6 维度审查，workflow-start 负责编排四步协议（dispatch → auto-review → reasonableness check → DP-A 确认）+ 状态写入。**子代理 MUST NOT 修改 `state`/`workflow` 核心字段**（v0.30.0）——状态转换是 workflow-start 专有职责，经 `tf state transition` 执行；子代理只写自己的 `dp_N_*` 决策字段。详细写入命令见 `references/routing-rules.md`「Route to architecture-design」。

## Output Standard

Always state: (1) current detected state, (2) why (cite file/content/condition), (3) which skill should run next. If blocking, explain missing artifact/approval.

Decision point references when routing:
- architecture-design → DP-A（架构设计用户确认门，v0.9 §26 判断门 + v0.29.0 §37 用户确认门）, contract-builder → DP-3, build-executor → DP-4, bug-investigator (escalation) → DP-5, release-archivist (verification failure) → DP-6, release-archivist → DP-7

## Exception Handling

- **Parse failures**: Fall back to content-level detection if `.team-flow.yaml` is malformed
- **Missing files**: Route to the skill that generates the missing files
- **User interruption**: Re-inspect change directory content (not cached state) on resume
