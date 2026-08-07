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

`exploring` → `specifying` → `bridging` → `approved-for-build` → `executing` → `closing`, with `debugging` side-path from `executing`, and `abandoned` as terminal. If a transition is ambiguous, run `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' runtime asset read docs/state-machine.md`.

## Initialization

1. **Update check**: Run `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' runtime check-update`. Exit 0 → continue. Exit 1 → non-blocking upgrade reminder. Exit 2 → skip.
2. **Inspect change folder**: Check for `proposal.md`, `specs/`, `design.md`, `tasks.md`, `execution-contract.md`. Answer: Is the change fuzzy? Artifacts missing/unstable? Contract exist? User approved contract? Execution in progress or blocked? In verification/wrap-up?
3. **Overlay recovery scan**: Run `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' handoff list <change-dir> --json` and `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' checkpoint list <change-dir> --json`. A `result-ready` handoff requires explicit review and `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' handoff resolve` before resuming the affected work. An `active` handoff is non-blocking side work. Show a non-stale checkpoint as recovery context; show a stale checkpoint only as historical evidence.
4. **Execution-control recovery scan**: For `approved-for-build`, `executing`, `debugging`, or `closing`, run `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' execution show <change-dir> --json`. Treat only `current: true` plus `waves[].eligible: true` as permission to start a wave; report plan revision, mode, next eligible wave, and every wave's receipt/blockers. A missing, invalid, or stale plan blocks implementation and routes to `build-executor`; do not infer progress from chat history.

## DP-0: User Confirmation Gate

Run DP-0 when: change folder doesn't exist, planning artifacts missing/empty, or `dp_0_confirmed` ≠ `true`. Skip if `dp_0_confirmed` is `true`.

### Upstream Inheritance (v0.9)

若 `change-brief.md` 存在且 `upstream_source == orchestrator`（本 change 由 orchestrator S4 分发），**继承** brief 的 scope/约束/AC 为默认值，DP-0 从"从零问"改为"一次确认继承或修正"，**不**重新问"你想做什么"。否则（手动新建 / hotfix / 单 change 快速通道 / 存量 change 无 brief）照常 DP-0。**主信号 = brief 文件存在**（非 yaml 字段——可天然排除无 brief 的快速通道，且对存量手动 change 零误伤）；双源冲突以 `requirement/vN/plan.md` 为准并触发 Brief drift（见「Staleness Detection」）。完整判定伪代码与主信号理由见 `references/routing-rules.md`「DP-0」。

Ask (manual path): change name + one-sentence intent, known constraints, related optimizations (include or stay focused?), communication preference (ask per decision or draft for review).

After confirmation:
```bash
node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' state set <change-dir> dp_0_decisions "<summary>"
node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' state set <change-dir> dp_0_result confirmed
node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' state set <change-dir> dp_0_confirmed true
node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' state set <change-dir> dp_0_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```

Config-aware routing: check `artifacts.order` and `artifacts.skip` from project config.

## Mode Detection

If workflow is `auto`/`null`/unset: run `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' runtime infer <change-dir>`. Inference: **hotfix** (≤2 tasks, ≤2 files, no schema/API/new modules), **tweak** (≤4 tasks, config/doc only), **full** (anything larger). Persist with `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' state set <dir> workflow <mode>`.

Validate mode against artifact content. If hotfix/tweak criteria not met → upgrade to `full` and output reason. Don't overwrite explicit mode unless user asks.

## Routing Rules

### Route to need-explorer
Change is fuzzy, scope unclear, comparing options, no stable change name.

### Route to architecture-design (v0.9 §26)
Guard: `arch_design_decision` in `.team-flow.yaml` is `null` → must run before spec-writer. Dispatch `architecture-design` as sub-agent; after return, run reasonableness check and write yaml. Full protocol in `references/routing-rules.md`「Route to architecture-design」.

### Route to spec-writer
Guard: `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' runtime guard check <dir> exploring specifying --json` → fail = BLOCK. **arch_design_decision must not be null** → fail = BLOCK (v0.9 §26). User knows what they want, artifacts missing/incomplete.

### Route to contract-builder
Guard: `... check <dir> specifying bridging --json` → fail = BLOCK. Artifacts exist, implementation requested, contract missing/stale. Include `DP-3: 契约批准`.

### Route to build-executor
Contract exists and approved, contract matches artifacts. Include `DP-4: 执行模式选择`: propose waves, run `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' execution recommend <change-dir> [--wave ...]`, show the user every available mode plus evidence and the recommendation, then obtain a clear selection. The command saves a current receipt; before the first implementation edit, `build-executor` must run `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' execution plan <change-dir> --mode <selected> --confirm ...` (and `--acknowledge-recommendation` when the selected mode differs from the recommendation) using matching artifacts, contract, and waves, then `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' execution show <change-dir> --json`; report the saved revision, selected mode, recommendation alignment, ordered waves, and actual concurrent-dispatch capability. A revision must repeat recommend and confirmation. Do not transition to `executing` until `show` reports `current: true`; then run `... check <dir> approved-for-build executing --json` → fail = BLOCK.

### Route to bug-investigator
Execution hit blockage: test failure, unexpected behavior, build error, task cannot proceed. After debugging, route back to build-executor.

### Route to code-reviewer
The current planned wave is implemented and ready for spec-compliance + code-quality verification. A reviewer must write an `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' execution review <change-dir> --wave <id> --base <sha> --head <sha> --report <path> --verdict <pass|fail>` receipt before any dependent wave or closing transition.

### Route to release-archivist
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
node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' handoff create <change-dir> \
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

Post-transition: 💡 `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' inject <change-dir>` to update phase-guard artifacts.

## Staleness Detection

Use content inspection, not timestamps.

**Stale contract**: proposal scope expanded beyond contract scope fence, or contract references capabilities no longer in proposal → route back to `contract-builder`.

**Stale planning artifacts**: capability in proposal has no spec file, or spec exists for capability not in proposal → drift detected.

**Stale tasks**: requirement in specs has no corresponding task → stale tasks.

**Brief drift (advisory, v0.9, 不阻断)**: change-brief.md 是上游输入（非 team-flow 产物），**不**混入上述三条产物互查、**不**进入 `artifacts_hash`。当 brief 的 `plan_hash` 与当前 `requirement/vN/plan.md` 不一致，或 brief AC 列表与 PRD 功能清单明显出入 → 提示"产品层已变更，brief 可能过期，建议回 orchestrator 重新分发（S4→S3 环路）"，**不**触发产物重审。

## Guardrails

- No implementation before planning artifacts or contract exist
- No implementation for full/hotfix without a current `node '/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/.zcode/team-flow/scripts/team-flow.mjs' execution plan`; no state transition based on an unverified DP-4 string
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

## State Writes (v0.22.5 F06 修复)

workflow-start 负责写入以下字段到 `.team-flow.yaml`：

**核心状态字段**：
- `state`：当前状态（exploring/specifying/bridging/approved-for-build/executing/debugging/closing/abandoned）
- `workflow`：工作流类型（auto/full/hotfix/tweak）

**决策点字段**（各阶段确认后写入）：
- `dp_0_*`：need-explorer 完成后的需求澄清决策
- `dp_1_*`：spec-writer 完成后的规格决策
- `dp_2_*`：contract-builder 完成后的契约决策
- `dp_3_*`：build-executor 完成后的执行决策
- `dp_5_*`：code-reviewer 完成后的审查决策
- `dp_6_*`：release-archivist 完成后的发布决策
- `dp_7_*`：其他决策点

**架构设计门控字段**（v0.9 §26，v0.22.5 F02 修复）：
- `arch_design_decision`：`required` | `skipped`（architecture-design 子代理返回，workflow-start 经 reasonableness check 后写入）
- `arch_design_reason`：判断理由
- `arch_design_timestamp`：ISO 8601 时间戳（UTC）
- `arch_design_artifacts`：产出路径列表（required 时必填，skipped 时为空）

**职责边界**：architecture-design 负责判断+产出，workflow-start 负责 reasonableness check + 状态写入。详细写入命令见 `references/routing-rules.md`「Route to architecture-design」。

## Output Standard

Always state: (1) current detected state, (2) why (cite file/content/condition), (3) which skill should run next. If blocking, explain missing artifact/approval.

Decision point references when routing:
- architecture-design → DP-A（架构设计判断门，v0.9 §26）, contract-builder → DP-3, build-executor → DP-4, bug-investigator (escalation) → DP-5, release-archivist (verification failure) → DP-6, release-archivist → DP-7

## Exception Handling

- **Parse failures**: Fall back to content-level detection if `.team-flow.yaml` is malformed
- **Missing files**: Route to the skill that generates the missing files
- **User interruption**: Re-inspect change directory content (not cached state) on resume
