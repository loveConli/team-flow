---
name: release-archivist
description: Close out a team-flow change with verification, summary, and archive readiness. Invoke when implementation is complete, verification is underway, or the user asks for a final wrap-up.
---

# Release Archivist

Finish a team-flow change cleanly with verification evidence.

## The Iron Law: Verification Before Completion

Claiming work is complete without verification is dishonesty, not efficiency. Before claiming any status:
1. IDENTIFY the command that proves the claim
2. RUN the full command fresh
3. READ output, check exit code
4. VERIFY output confirms the claim
5. Only THEN make the claim

**Forbidden before evidence**: "should", "probably", "seems to", expressions of satisfaction without output.

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check |
| Build succeeds | Build exit 0 | Linter passing |
| Bug fixed | Original symptom passes | Code changed |
| Requirements met | Line-by-line checklist | Tests passing |

## Verification Steps

### Step 1: Test Suite
Run full test suite fresh (e.g. `mvn test` / `npm test`). Record total/passed/failed/skipped. **Zero failures AND total > 0 = PASS.**

**⛔ 空真拒绝（v0.13 §50，C1-domain-policy 事件修复）**：0 个测试时"0 失败"在逻辑上为真，但不是证据——**0 tests ≠ PASS**。发现测试套件为空或项目无测试文件时：要么回 build-executor 补测试（按 test-matrix.md），要么该 change 本应在 bridging 阶段显式 skip（`test_matrix_skipped=true` + 理由）；两种情况都不得写 pass。

**程序化记录（v0.13 §50）**：跑完测试套件后，把 runner 输出落盘并用命令写入证据（`test_result` 已不可手工 `tf state set`）：
```bash
tf test record <change-dir> --from <runner-output-file>   # 支持 maven-surefire/jest/pytest，auto 识别
```
该命令写入结构化 `test_result`（recorded-by=tf-test-record）+ 证据文件（`.superpowers/test-evidence/`），是 `tests-passing` 门禁对非存量 change 的唯一合法凭证。

### Step 2: Completeness
Compare contract batches against actual diff. Every SHALL/MUST must have implementation evidence. Missing = Critical severity.

### Step 2b: Test Matrix Reconciliation (conditional, v0.12 §44.4)

If `test-matrix.md` exists:
1. **Statistics**: total cases / implemented / passed
2. **Candidate Coverage Ledger audit**: any `decision=deferred` without reasonable reason?
3. **Complexity tier check**: cases per module meet minimum (trivial≥3 / medium≥5 / complex≥7)?
4. **Verdict**:
   - Matrix coverage = 100% AND all cases pass → **PASS**
   - Matrix coverage ≥ 90% with reasonable deferred items → **CONDITIONAL (WARN)**
   - Matrix coverage < 90% OR unexplained gaps → **FAIL**

If `test-matrix.md` does NOT exist（v0.13 §52 B2 修订）:
- legacy change（.team-flow.yaml 无 `schema_version` 字段）或 `test_matrix_skipped=true` → **SKIP**
- 非存量且未 skip → **FAIL**（矩阵缺失即验证失败；删除静默 SKIP——C1-domain-policy 事件教训）

Add a report row: `| Test Matrix | PASS/FAIL/WARN/SKIP | [reconciliation summary] |`

### Step 3: Coherence
Compare design decisions against code. Check naming consistency. Inconsistencies = IMPORTANT.

### Step 4: Unintended Scope
Check for files modified outside scope fence, new dependencies not in design. Unplanned = WARN.

### Step 5: Report

| Dimension | Status | Findings |
|-----------|--------|----------|
| Completeness | PASS/FAIL/WARN | [list] |
| Correctness | PASS/FAIL/WARN | [list] |
| Coherence | PASS/FAIL/WARN | [list] |

- **Architecture merge**: <merged architecture.md + database.md + api.md + N SQL scripts to docs/architecture/ | architecture/ absent — skipped>
- **Prototype sync**: <synced N pages / N components / design-system updated | no UX delta | conflicts: N>
- **Compound promotion**: <promoted N learnings / updated N confirmed patterns | no learnings>

**Verdict**: PASS (all PASS) / CONDITIONAL (WARN only) / FAIL (any FAIL).
- FAIL → fix issues or route back to build-executor
- CONDITIONAL → present WARNs, proceed only with user acceptance
- PASS → proceed to final checks

### Step 5b: E2E Verification (optional, v0.4)
If an `e2e/` suite exists for the change, fold its report into verification (see design spec ch.16):
- Read `docs/statistics/YYYY-MM-DD-e2e-report.md`: AC coverage / four-dimension coverage (EX/ST/BND) / type distribution / uncovered list / failure root-cause (test issue vs implementation issue).
- **4-level artifact verification** (L1 existence / L2 substance / L3 wiring / L4 dataflow → VERIFIED/HOLLOW/ORPHANED/STUB/MISSING): compare `architecture-design` outputs (API/DB design docs) against actual code; STUB/MISSING = BLOCKER, HOLLOW/ORPHANED = WARNING.
- **Graded gate**: prototype-phase AC≥80% (HP required, EX/ST/BND non-blocking if absent); integration-phase AC≥95% / EX≥80% / ST≥90% / BND≥75% (AC/EX = BLOCKER, ST/BND = WARNING).
- Add a report row: `| E2E | PASS/FAIL/WARN | [coverage summary] |`.
- Note: `ce-proof` is the Proof markdown editor — unrelated to verification; do NOT route E2E there.

## Final Checks

**⛔ 状态字段禁写（v0.30.0 + v0.13 §50）**：仅写本 skill 的 `dp_6_*`/`dp_7_*` 决策字段；测试证据经 `tf test record` 程序化写入（不再手工 set `test_result`）；**MUST NOT** 修改 `.team-flow.yaml` 的 `state`/`workflow` 核心字段——closing 转换由主代理经 `tf state transition` 执行（来源：workflow-feedback 2026-08-01）。

- Tests passing? (cite command and output)
- All batches complete? (cite batch status)
- Scope added without artifact updates?
- Unresolved blockers or known risks?
- Delta specs exist that need merging?
- Run `tf audit <change-dir>` — include `decision-point-audit.md` in archive

### DP-6 (Verification Outcome)
```bash
tf state set <change-dir> dp_6_result "<pass|conditional|fail>: <summary>"
tf state set <change-dir> dp_6_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```
If FAIL, do NOT proceed to DP-7. Route back or ask about abandonment.

**测试门禁凭证（v0.13 §50 修订）**：`dp_6_result` 只是决策点记录，不再是 `tests-passing` 门禁的证据（BUG-A 等价通道仅对存量 change 保留）。非存量 change 的 `executing → closing` 放行凭证是 Step 1 中 `tf test record` 写入的结构化 `test_result`（+ 证据文件）。若 Step 1 尚未执行 `tf test record`，先补跑测试套件并记录，再守 DP-6。

### DP-7 (Archive Confirmation)
```bash
tf state set <change-dir> dp_7_result "confirmed: <archive summary>"
tf state set <change-dir> dp_7_timestamp $(date -u +%Y-%m-%dT%H:%M:%SZ)
```
Verify DP-0 through DP-6 are recorded before DP-7.

## Archive Rule

If implementation diverged from the contract, return to `bridging` before closure.

## Post-Verification

Run `tf state transition <change-dir> closing`. If delta specs exist, route to `spec-merger`.

**架构快照门禁（arch-snapshot，v0.36.0 / v0.36.3）**：`executing→closing` 挂 `arch-snapshot` 维度——本轮迭代产品级架构快照 `iterations/vN/architecture.md` 必须已落盘（"先快照后回写"强制化）。**FAIL 升级路径**：回 orchestrator 的 ARCH 阶段补快照；存量升级在途 change（快照缺失但 change 有增量产物）→ WARN 兜底放行；`arch_baseline` 缺失 → WARN 不阻断。hotfix/tweak 豁免（不挂该维度）。判定逻辑见 `scripts/guard/checks/arch-gate-exemptions.mjs`。

### Architecture Merge (v0.10 §28-§31) — MUST run first

Merge change-level architecture artifacts to the global `docs/architecture/` baseline **before** any other post-verification step:

```bash
tf arch-merge <change-dir>
```

This merges `architecture/{architecture,database,api}.md` and `architecture/sql/` into the global architecture docs. Skip silently when `architecture/` does not exist (architecture-design was `skipped`).

**Execution order (mandatory, v0.12 §43.4)**: `arch-merge` → `prototype-sync` → `test-merge` → `compound promotion`. Do not parallelise — global docs must not be in a half-updated state.

### Prototype Sync (v0.5)

After `arch-merge` completes, run prototype-sync to merge UX deltas back to the global prototype:

```bash
tf prototype-sync <change-dir>
```

**Write-back order (mandatory, v0.12 §43.4)**: `arch-merge` → `prototype-sync` → `test-merge` → `compound promotion` must be executed **sequentially** within the same change closing. Do not run them in parallel — the global `docs/architecture/`, `prototype/`, and `docs/test-ledger/` must not be in a half-updated state when the next change grounds on them.

If `prototype-sync` reports conflicts, list them in the closing summary and flag for manual resolution. Do not block closing on prototype-sync conflicts (advisory level).

**Execution verification（v0.24.0）**：`prototype-sync` 命令执行后，检查其 stdout 输出确认合并完成（输出含 `merged`/`no UX delta`/`conflicts` 之一）。若命令未执行或执行失败，Step 5 Report 的 `Prototype sync` 行必须标注 `SKIPPED` 或 `FAILED`，并在 closing summary 中说明原因。**禁止在 prototype-sync 未执行时将 Prototype sync 行标注为已完成**。

### Test Merge (v0.12 §43)

After `prototype-sync` completes, run test-merge to write test matrix results back to the global test ledger:

```bash
tf test-merge <change-dir>
```

This merges `test-matrix.md` into `docs/test-ledger/`:
- **mergeBaselines**: extract cases by module, incrementally update `baselines/{module}.md`
- **resolveDeferred**: new cases covering old deferred items → remove from Deferred
- **appendChangelog**: archive test-matrix.md → `changelog/{change-id}.md`
- **rewriteIndex**: recalculate module/case/deferred counts, rewrite `INDEX.md`

Skip silently when `test-matrix.md` does not exist (legacy change or test_matrix_skipped=true).

**Execution verification**: check stdout output for `test-merge complete` confirmation. If the command did not execute or failed, Step 5 Report's `Test Matrix` row (from Step 2b) must note the reason.

### Compound Promotion (v0.5)

During closing, promote change-level learnings to the global solutions library:

```bash
tf solutions promote <change-dir>
```

This checks `specs/<cap>/learnings.md` for entries meeting promotion criteria:
- severity ≥ medium AND type = pitfall/pattern → promote to global `docs/solutions/`
- domain+type matches existing global entry → mark as "confirmed pattern", upgrade severity

Report promotion results in the closing summary. Promotion is advisory — failures do not block closing.

### Compound Capture Check (v0.5)

Before finalizing the closing, check if this change produced any learnable moments:

- Did the change trigger any mandatory rewind (re-specify, re-bridge)?
- Did bug-investigator find a recurring issue (same root cause as a prior change)?
- Did scope expand beyond the original proposal?
- Did execution-contract drift from proposal?

If any of the above occurred, capture the learning:
```bash
tf solutions capture \
  --phase cross-phase --domain <domain> --type pitfall \
  --severity medium --summary "<what happened and how to prevent it>"
```

This check is advisory — skip silently if no learnable moments are detected.

### 阶段产物同步门禁点（v0.37.0 §68.2 G5）

回写链（arch-merge → prototype-sync → test-merge → compound promotion）全部完成后、`tf state transition closing` 之前，**阻塞确认**（AskUserQuestion）是否同步 change 实施结果（团队协作：落地结果是团队最需要看的内容）：
- **A 提交并推送**：`tf publish --changes <change-dir> --push`
- **B 仅提交不推送**：`tf publish --changes <change-dir>`（arch-merge/test-merge 已自动 commit，此步补 push）
- **C 暂不同步**：继续 closing，后续可补

同步对象：实施代码 `changes/<change-dir>/` + arch-merge 回写（docs/architecture/）+ test-ledger（docs/test-ledger/）。**原型独立仓库场景**：若本 change 有 UX 增量回写原型，push 对应 `prd-vN` 分支（`tf prototype branch <prd-vN>` 确认/创建 worktree）。

### Worktree Deisolation (v0.35.0) — advisory

After compound promotion, check if worktree isolation exists for this change:

```bash
tf deisolate <change-dir>
```

If worktrees exist (output shows `found: true` or ahead/behind stats), include the deisolation report in the closing summary. **Do NOT auto-merge** — the orchestrator or user decides the merge strategy. Mark `Worktree deisolation` in the Step 5 report as:
- `PENDING` — worktrees detected, user action required
- `N/A` — no worktrees found (single-repo or already cleaned)

This step is advisory — skip silently when `tf deisolate` reports no worktrees.

### Workflow Feedback Check (v0.16.0)

Before finalizing the closing, ask the user if they encountered any workflow issues during this change:

> "本次 change 过程中有遇到工作流问题吗？（skill 触发不准、流程不顺、产物质量等）如果有，可以用 `/workflow-feedback` 记录。"

This check is advisory — skip if the user declines. If the user reports issues, invoke the `workflow-feedback` skill to create structured records in `.team-flow/feedback/`.

## Lightweight Closure (hotfix/tweak)

Verify files exist and are non-empty, run `node --check` on code files, skip 5-step verification. Still record DP-6 and DP-7.

**⚠️ tests-passing 门禁不因轻量收尾而豁免（v0.13 §50）**：hotfix/tweak 的 `executing→closing` guard 同样挂 `tests-passing`。非存量 change 仅记 DP-6/DP-7 不足以放行——必须二选一：① `test_matrix_skipped=true` + `test_matrix_skip_reason` 已由 contract-builder 设置（hotfix/tweak 常规路径，先 `tf state get` 核实）；② 有代码变更时补跑测试套件并 `tf test record <change-dir> --from <输出>`。

## Exception Handling

- **Parse failures**: Report exact file and section
- **Missing files**: If audit can't generate, run `tf audit` manually
- **User interruption**: Re-run verification from the beginning on resume
- **DP gaps**: Flag missing DPs during DP-6; ask user whether to proceed or return
