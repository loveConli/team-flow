# Routing Rules Reference

> 从 workflow-start SKILL.md 提取的详细路由规则和 CLI 命令。

## Route to need-explorer
Change is fuzzy, scope unclear, comparing options, no stable change name.

## Route to architecture-design (v0.9 §26, v0.11 §34 审查增强, v0.28.1 §36 主干补强, v0.29.0 §37 DP-A 确认门)

Guard: `arch_design_decision` in `.team-flow.yaml` is `null` → must run before spec-writer.

### Step 1: Dispatch architecture-design sub-agent

Dispatch `architecture-design` as sub-agent with inputs:
- `change-brief.md`（scope / AC / 技术方向）
- `prd/vN/plan.md` 高阶技术设计段
- existing `specs/`
- global `docs/architecture/`（As-Is 基线）

**⛔ 子代理 ID 记录（v0.29.0 §37，必须执行）**：dispatch 后**立即记录**子代理 ID（Agent 工具返回的 `agentId` 或 task-notification 中的 `task-id`），后续 Step 2 审查循环和 Step 4 DP-A 调整**必须通过此 ID 恢复子代理**，不得启动新子代理。记录格式：
```
arch_design_agent_id = <agentId>   # Step 1 dispatch 返回
arch_reviewer_agent_id = <agentId> # Step 2 dispatch 返回
```

Sub-agent returns structured output:
```yaml
decision: required | skipped
reason: "..."                    # skipped 时：不涉及架构变更的理由
                                 # required 时：涉及的变更项摘要
artifacts:                       # required 时必填
  - architecture/architecture.md
  - architecture/database.md
  - architecture/api.md
```

**📡 结果协议（v0.30.0）**：子代理终态须标注 `FINAL VERDICT: <DONE|BLOCKED|FAIL>`（审查类用 PASS/PASS_WITH_WARNINGS/FAIL）。**SendMessage 报告为权威结果**；task-notification.result 仅内部元数据，二者冲突时以 SendMessage + 落盘产物为准。

### Step 2: Auto-review (v0.11 §34, decision=required 时触发)

When `decision: required`, dispatch `architecture-reviewer` as sub-agent with inputs:
- `prd_path`, `plan_path`, `change_brief_path`
- `architecture_dir`（Step 1 产出目录）
- `global_arch_dir`（`docs/architecture/`）
- `conventions_config`（从 `team-flow.config.json` 读取）

**交接后产物校验**（defense in depth）：
```bash
test -f <architecture_dir>/architecture.md && test -s <architecture_dir>/architecture.md && echo OK
```
- OK → dispatch reviewer
- 缺失/为空 → **不派 reviewer**，resume architecture-design 补全

**审查循环**（≤3 轮 + 收敛检测）：
```
reviewer 报告 → FAIL → 不一致项交给 architecture-design 修正 → 重新审查
  → 收敛（不一致项缩小）→ 继续循环
  → 不收敛（连续两轮不一致项集合无缩小）→ 立即转人工
  → 满 3 轮仍 FAIL → 转人工
reviewer 报告 → PASS / PASS_WITH_WARNINGS → 进入 Step 3
```

**🎯 实事求是原则（v0.30.0，修复子代理行为准则）**：reviewer 建议是**输入不是指令**。修复子代理收到 findings 后，**必须先对照代码库与项目既有模式逐条验证属实性**（搜索既有实现、读取参照模块）：属实则修正；认为不属实或与既有模式冲突，则据实 SendMessage 反馈主代理（finding + 证据 + 替代建议），**不得盲目遵从**（移植自 ce-brainstorm「may contradict only on evidence / report it — do not suppress it」）。

> **⛔ 修复→审查必须串行（v0.30.0）**：修复子代理（architecture-design）**完成前 MUST NOT dispatch/恢复审查子代理**——并行会使审查跑在修复之前、误报"全部未修复"FAIL。

**⛔ 循环修正必须通过 SendMessage 恢复原子代理（v0.29.0 §37，禁止启动新子代理）**：
- FAIL 后修正：`SendMessage(to: arch_design_agent_id, message: "审查 FAIL，不一致项如下：{findings}。请先对照代码库与项目既有模式逐条验证 finding 属实性——属实则修正；认为不属实或冲突则据实反馈主代理（finding+证据+替代建议），勿盲目遵从。修正后返回更新的结构化输出。")`
- 重新审查：`SendMessage(to: arch_reviewer_agent_id, message: "第 {N} 轮审查，架构产物已修正。请重新执行 6 维度审查。")`
- **禁止**在循环中启动新的 architecture-design 或 architecture-reviewer 子代理——原子代理拥有完整的设计上下文和审查历史，新子代理需要重新加载全部上下文（浪费 10-20K tokens 且可能丢失修正连贯性）
- **唯一例外**：SendMessage 恢复失败（子代理 transcript 不可用）时，启动新子代理作为 fallback，但必须在 dispatch prompt 中传入：原产物路径 + auto-review 报告 + 历次修正记录

报告落盘到 `changes/<name>/architecture/auto-review.md`。

### Step 3: Reasonableness check

workflow-start 确认后写入 yaml：
- `skipped` + reason inconsistent with brief/plan scope → **BLOCK**（如 scope 含"新增 API"但 reason 说"不涉及架构变更"）
- `required` + artifacts files missing on disk → **BLOCK**
- `required` + auto-review FAIL → **BLOCK**（修正后再写入）
- `null`（未判定）→ **BLOCK**

```bash
tf state set <change-dir> arch_design_decision "<required|skipped>"
tf state set <change-dir> arch_design_reason "<reason>"
tf state set <change-dir> arch_design_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
# if required:
tf state set <change-dir> arch_design_artifacts "architecture/architecture.md,architecture/database.md,architecture/api.md"
# if required + auto-review completed (v0.28.1 §36):
tf state set <change-dir> arch_review_verdict "<PASS|PASS_WITH_WARNINGS>"
tf state set <change-dir> arch_review_rounds "<N>"
tf state set <change-dir> arch_review_report "architecture/auto-review.md"
```

**hotfix / tweak 不豁免**：同样过 architecture-design 子代理判断门（hotfix 可能正是架构缺陷导致）。

### Step 4: DP-A 用户确认门 (v0.29.0 §37)

> **设计动机**：v0.28.1 的三步协议是全自动闭环（dispatch → auto-review → state write → 路由下一步），缺少人工审批环节。用户在架构设计完成后无法确认或提出调整意见，被迫手动打断流程。DP-A 在 Step 3 之后、路由 spec-writer 之前插入结构化用户确认门。

Step 3 reasonableness check + state write 完成后，**必须**执行 DP-A：

**4a. 输出架构决策摘要**：

```
📐 架构设计完成 — 决策摘要
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
判定：{decision} ({reason})
审查：{arch_review_verdict}（{arch_review_rounds} 轮）

聚合定义：
  {列出新增/修改的聚合及聚合根}

限界上下文：
  {列出 BC 边界变更}

API 端点概览：
  {端点总数} 个（Command: {n}, Query: {n}）
  {列出关键端点}

DB 变更概览：
  {新增/修改的表数量}

ADR 列表：
  {列出关键架构决策记录}

产物路径：
  - changes/<name>/architecture/architecture.md
  - changes/<name>/architecture/database.md
  - changes/<name>/architecture/api.md
  - changes/<name>/architecture/auto-review.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**4b. 项目规范变更提示（advisory，不阻断）**：

在摘要末尾附加：
```
📋 项目规范变更检查（advisory）：
  本次架构设计是否引入了新的项目级规范？
  （如：新模块不使用 CQRS、Mapper 放 domain 等）
  如是，请确认已更新 docs/architecture/ 相关文档
  （ARCHITECTURE.md / baseline.md / CONCEPTS.md）。
```

**4c. AskUserQuestion 确认**：

```
AskUserQuestion:
  question: "架构设计确认？"
  options:
    [A] "确认，进入 spec-writer"（推荐）
    [B] "需要调整（列出调整点）"
    [C] "需要查看详细产物（给出文件路径）"
```

**4d. 处理用户选择**：

- **选择 A（确认）**：
  ```bash
  tf state set <change-dir> dp_a_result "confirmed"
  tf state set <change-dir> dp_a_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
  tf state set <change-dir> dp_a_adjustments ""
  ```
  → 路由到 spec-writer

- **选择 B（需要调整）**：
  1. 记录用户调整意见
  2. **⛔ 必须通过 SendMessage 恢复原 architecture-design 子代理修改（禁止启动新子代理，禁止主代理直接 Edit）**：
     ```
     SendMessage(to: arch_design_agent_id, message: "用户评审反馈（DP-A 调整）：
       {用户调整意见}
       请先对照代码库与项目既有模式验证调整点的合理性，再修改架构产物，保持内部一致性；若调整点与既有模式冲突请据实反馈。返回更新后的结构化输出。")
     ```
     原子代理拥有完整的设计上下文（PRD、brief、基线、conventions），能保持修改的一致性。启动新子代理会丢失上下文（重新加载 10-20K tokens）且可能引入不一致。
  3. 子代理修改完成后，**通过 SendMessage 恢复原 architecture-reviewer 子代理重新审查**（即使之前已 PASS）：
     ```
     SendMessage(to: arch_reviewer_agent_id, message: "架构产物已按用户评审意见修正。请重新执行 6 维度审查。")
     ```
  4. auto-review PASS 后，更新 yaml 状态（arch_review_verdict / arch_review_rounds）
  5. 回到 Step 4a 重新输出摘要 + 重新确认
  6. **唯一 fallback**：SendMessage 恢复失败时，启动新子代理，但必须在 dispatch prompt 中传入：调整意见 + 原产物路径 + auto-review 报告 + 历次修正记录
  ```bash
  tf state set <change-dir> dp_a_result "adjustment_requested"
  tf state set <change-dir> dp_a_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
  tf state set <change-dir> dp_a_adjustments "<调整意见摘要>"
  ```

- **选择 C（查看详细产物）**：
  输出文件路径列表，等待用户阅读后重新 AskUserQuestion（回到 4c）

**⛔ 反模式（禁止）**：
- 主代理直接 Read + Edit `architecture/*.md` 文件（违反 Artifact Ownership 规则）
- 跳过 DP-A 直接路由 spec-writer
- 用户选择 B 后不重新 auto-review 就直接重新确认
- **循环修正或 DP-A 调整时启动新的 architecture-design / architecture-reviewer 子代理**（必须通过 SendMessage 恢复原子代理，原子代理拥有完整上下文；新子代理 = 上下文断裂 + token 浪费。唯一例外：SendMessage 恢复失败时的 fallback）

## Route to spec-writer (dispatch sub-agent)
Guard: `tf runtime guard check <dir> exploring specifying --json` → fail = BLOCK.
**arch_design_decision must not be null** → fail = BLOCK（architecture-design gate not passed，v0.9 §26）。
User knows what they want, artifacts missing/incomplete.

## Route to contract-builder (dispatch sub-agent)
Guard: `... check <dir> specifying bridging --json` → fail = BLOCK.
Artifacts exist, implementation requested, contract missing/stale. Include DP-3: 契约批准.

## Route to build-executor (dispatch sub-agent)
Contract exists and approved, contract matches artifacts. Include DP-4: 执行模式选择.

Propose waves, run:
```bash
tf execution recommend <change-dir> [--wave ...]
```
Show every available mode plus evidence and recommendation, obtain clear selection. Then:
```bash
tf execution plan <change-dir> --mode <selected> --confirm ...
tf execution show <change-dir> --json
```
Do not transition to `executing` until `show` reports `current: true`.
Guard: `... check <dir> approved-for-build executing --json` → fail = BLOCK.

## Route to bug-investigator
Execution hit blockage: test failure, unexpected behavior, build error. After debugging, route back to build-executor.

## Route to code-reviewer
Current planned wave implemented and ready for review. Reviewer must write:
```bash
tf execution review <change-dir> --wave <id> --base <sha> --head <sha> --report <path> --verdict <pass|fail>
```

## Route to release-archivist (dispatch sub-agent)
Guard: `... check <dir> executing closing --json` → fail = BLOCK. Include DP-7: 归档确认.

## Route to spec-merger
Delta specs exist that need merging, change closing with ADDED/MODIFIED/REMOVED/RENAMED specs.

## Route to abandoned
User explicitly requests, bug-investigator escalates after 3+ failures AND user chooses, scope change makes change no longer worthwhile AND user confirms. Block from `closing` or `abandoned`.

## Fast-Path Routing

- **Hotfix**: Route to contract-builder (minimal), skip need-explorer + spec-writer, guard check `exploring bridging --workflow hotfix`, then `bridging -> approved-for-build`, after DP-3 → build-executor, after → release-archivist (lightweight).
- **Tweak**: Route to build-executor (direct edit), skip need-explorer + spec-writer + contract-builder, guard check `exploring approved-for-build --workflow tweak`, after → release-archivist (lightweight).
- **architecture-design 不豁免**（v0.9 §26）：hotfix / tweak 同样过 architecture-design 子代理判断门（hotfix 可能正是架构缺陷导致）。

## Optional Prototype Handoff

When the user's brief explicitly contains UI/screen/interaction/layout/UX uncertainty, ask once whether a prototype would reduce uncertainty. After confirmation:
```bash
tf handoff create <change-dir> \
  --type prototype --objective "<confirmed objective>" \
  --expected-output "<expected evidence>" --acceptance "<completion criterion>"
tf isolate <change-dir> prototype-<handoff-id>
```
Never suggest for backend/CLI/config/internal-refactor work. Never pass `--force`.

## DP-0: User Confirmation Gate

Run when: change folder doesn't exist, planning artifacts missing/empty, or `dp_0_confirmed` ≠ `true`.

**Upstream Inheritance (v0.9)**：主信号 = `change-brief.md` 是否存在（非 yaml 字段）。

判定伪代码：
```
brief = read(<change-dir>/change-brief.md)
if brief 存在 and brief.upstream_source == "orchestrator":
    # 编排分发：继承但允许修正（DP-0 仍执行，从"从零问"改为"一次确认继承或修正"）
    defaults = { name: brief.upstream_change_id/<dir basename>,
                 intent: brief.Scope,
                 constraints: brief.约束,
                 AC: brief.AC 列表 }
    问用户(一次): "本 change 由 orchestrator 分发，继承意图/约束/AC 如下 {…}。
                   [A] 继承并开始  [B] 我要修正（逐项覆盖 defaults）"
    # 绝不重新问"你想做什么"——那是手动路径的问题
else:
    # 手动新建 / hotfix / 单 change 快速通道 / 存量 change（均无 brief）→ 照常 DP-0
    问用户(原题): change name + 一句话意图 + 已知约束
                 + 相关优化(纳入还是聚焦) + 沟通偏好
两分支最终都写 dp_0_confirmed=true（命令见下）
```

- **为何以 brief 存在为主信号**：hotfix / 单 change 快速通道也是 orchestrator 创建的 change，但不产 brief；以 brief 存在为信号可天然排除这两条路径，且对存量手动 change（无 brief）零误伤。
- **双源权威**：继承的 scope/AC 若与 `prd/vN/plan.md` 冲突，以 plan.md 为准（brief 是 S4 时刻快照，非真相源）；冲突时触发 Brief drift 提示（见「Staleness Detection」）。

After confirmation:
```bash
tf state set <change-dir> dp_0_decisions "<summary>"
tf state set <change-dir> dp_0_result confirmed
tf state set <change-dir> dp_0_confirmed true
tf state set <change-dir> dp_0_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```

## Mode Detection

If workflow is `auto`/`null`/unset:
```bash
tf runtime infer <change-dir>
```
Inference: **hotfix** (≤2 tasks, ≤2 files, no schema/API/new modules), **tweak** (≤4 tasks, config/doc only), **full** (anything larger).

## Staleness Detection

- **Stale contract**: proposal scope expanded beyond contract scope fence → route to contract-builder
- **Stale planning artifacts**: capability in proposal has no spec file, or vice versa → drift detected
- **Stale tasks**: requirement in specs has no corresponding task → stale tasks
- **Brief drift (advisory, v0.9)**: change-brief.md 的 `plan_hash` 与当前 plan.md 不一致 → 提示回 orchestrator 重新分发；**不**阻断、**不**进 artifacts_hash、**不**混入上述三条产物互查

## Post-transition
💡 `tf inject <change-dir>` to update phase-guard artifacts.

## Route to glaf4-tests (v0.12 §46, v0.31.0)

**触发条件**：`project_type == glaf4-java`（Spring Boot / JUnit 5 / Mockito）AND contract-builder 需要生成 test-matrix。

**协议**：
1. contract-builder 检测项目技术栈（读取 `pom.xml` / `build.gradle` 判断是否 GLAF4 Java）
2. GLAF4 项目 → 提示用户：「检测到 GLAF4 Java 项目，是否调用 `glaf4-test:glaf4-tests` 做精细测试矩阵设计？」
3. 用户同意 → 调用 `glaf4-test:glaf4-tests-design` 生成 `test-matrix.json`
4. `glaf4-tests-validate` 校验矩阵完整性
5. `scripts/lib/test-matrix-export.mjs` 转换为 team-flow 格式的 `test-matrix.md`
6. 用户确认（轻量版 DP-A）
7. 写入 `test-matrix.md`，contract 中添加 `## Test Matrix` 段引用

**非 GLAF4 项目**：contract-builder 使用内置 test-strategy skill 直接生成 `test-matrix.md`。

**设计决策**：glaf4-tests 对接为**可选增强**，不是必经路径。
