# Routing Rules Reference

> 从 workflow-start SKILL.md 提取的详细路由规则和 CLI 命令。

## Route to need-explorer
Change is fuzzy, scope unclear, comparing options, no stable change name.

## Route to spec-writer
Guard: `npx --yes --package spec-superflow@0.22.0 ssf runtime guard check <dir> exploring specifying --json` → fail = BLOCK.
User knows what they want, artifacts missing/incomplete.

## Route to contract-builder
Guard: `... check <dir> specifying bridging --json` → fail = BLOCK.
Artifacts exist, implementation requested, contract missing/stale. Include DP-3: 契约批准.

## Route to build-executor
Contract exists and approved, contract matches artifacts. Include DP-4: 执行模式选择.

Propose waves, run:
```bash
npx --yes --package spec-superflow@0.22.0 ssf execution recommend <change-dir> [--wave ...]
```
Show every available mode plus evidence and recommendation, obtain clear selection. Then:
```bash
npx --yes --package spec-superflow@0.22.0 ssf execution plan <change-dir> --mode <selected> --confirm ...
npx --yes --package spec-superflow@0.22.0 ssf execution show <change-dir> --json
```
Do not transition to `executing` until `show` reports `current: true`.
Guard: `... check <dir> approved-for-build executing --json` → fail = BLOCK.

## Route to bug-investigator
Execution hit blockage: test failure, unexpected behavior, build error. After debugging, route back to build-executor.

## Route to code-reviewer
Current planned wave implemented and ready for review. Reviewer must write:
```bash
npx --yes --package spec-superflow@0.22.0 ssf execution review <change-dir> --wave <id> --base <sha> --head <sha> --report <path> --verdict <pass|fail>
```

## Route to release-archivist
Guard: `... check <dir> executing closing --json` → fail = BLOCK. Include DP-7: 归档确认.

## Route to spec-merger
Delta specs exist that need merging, change closing with ADDED/MODIFIED/REMOVED/RENAMED specs.

## Route to abandoned
User explicitly requests, bug-investigator escalates after 3+ failures AND user chooses, scope change makes change no longer worthwhile AND user confirms. Block from `closing` or `abandoned`.

## Fast-Path Routing

- **Hotfix**: Route to contract-builder (minimal), skip need-explorer + spec-writer, guard check `exploring bridging --workflow hotfix`, then `bridging -> approved-for-build`, after DP-3 → build-executor, after → release-archivist (lightweight).
- **Tweak**: Route to build-executor (direct edit), skip need-explorer + spec-writer + contract-builder, guard check `exploring approved-for-build --workflow tweak`, after → release-archivist (lightweight).

## Optional Prototype Handoff

When the user's brief explicitly contains UI/screen/interaction/layout/UX uncertainty, ask once whether a prototype would reduce uncertainty. After confirmation:
```bash
npx --yes --package spec-superflow@0.22.0 ssf handoff create <change-dir> \
  --type prototype --objective "<confirmed objective>" \
  --expected-output "<expected evidence>" --acceptance "<completion criterion>"
npx --yes --package spec-superflow@0.22.0 ssf isolate <change-dir> prototype-<handoff-id>
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
npx --yes --package spec-superflow@0.22.0 ssf state set <change-dir> dp_0_decisions "<summary>"
npx --yes --package spec-superflow@0.22.0 ssf state set <change-dir> dp_0_result confirmed
npx --yes --package spec-superflow@0.22.0 ssf state set <change-dir> dp_0_confirmed true
npx --yes --package spec-superflow@0.22.0 ssf state set <change-dir> dp_0_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```

## Mode Detection

If workflow is `auto`/`null`/unset:
```bash
npx --yes --package spec-superflow@0.22.0 ssf runtime infer <change-dir>
```
Inference: **hotfix** (≤2 tasks, ≤2 files, no schema/API/new modules), **tweak** (≤4 tasks, config/doc only), **full** (anything larger).

## Staleness Detection

- **Stale contract**: proposal scope expanded beyond contract scope fence → route to contract-builder
- **Stale planning artifacts**: capability in proposal has no spec file, or vice versa → drift detected
- **Stale tasks**: requirement in specs has no corresponding task → stale tasks
- **Brief drift (advisory, v0.9)**: change-brief.md 的 `plan_hash` 与当前 plan.md 不一致 → 提示回 orchestrator 重新分发；**不**阻断、**不**进 artifacts_hash、**不**混入上述三条产物互查

## Post-transition
💡 `npx --yes --package spec-superflow@0.22.0 ssf inject <change-dir>` to update phase-guard artifacts.
