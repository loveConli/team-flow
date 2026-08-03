# E2E Workflow Test Matrix — team-flow（v0.29.1+ 全量覆盖）

> 本矩阵是 team-flow **工作流自身 e2e 测试**的用例设计，方法论复用 `skills/test-strategy`
> （design_method 三级分层 / 复杂度分级 / 对抗验证三招 / 候选覆盖台账 / work_mode），
> **适配到工作流行为**（被测目标从"应用代码方法"换成"工作流行为/机制"）。
>
> **与 docs/test-ledger/ 的关系**：本矩阵与结果**独立**于应用代码测试台账（docs/test-ledger/ 是
> 应用单测/集成测复利台账，语义不同），但**工作流行为层覆盖 v0.12 引入的新行为**
> （contract-builder 产 test-matrix.md、test_matrix_hash/skipped、guard test-matrix-complete）。
>
> 12 列格式（e2e 适配）：`case_id | behavior | design_method | fixture/input | expected | test_tier | oracle_cmd | work_mode | test_file | test_case_name | run_command | 覆盖候选`
> （test_kind 恒 e2e；mock 列以 fixture/input 替代）。

## Summary

- 被测版本：v0.29.1 + v0.30.0 + v0.31.0
- 两层架构：Tier 1 确定性（`tf` CLI + guard，进 CI，零 LLM 成本）/ Tier 2 LLM（`claude -p` 驱动，opt-in local-only）
- 复杂度分级：trivial（≥3 case）/ medium（≥5）/ complex（≥7）；自检口诀适配为「每行为 1 正向 + 1 负向 + 1 边界 + 1 异常」
- design_method 工作流映射：state（状态机）/ equivalence（有效无效输入）/ boundary（门禁边界）/ error（缺产物/CLI 异常）/ reject（guard 阻断）/ exception（子代理崩溃超时）/ contract（跨 change/跨 skill 契约）/ idempotency（重复操作）/ concurrency（多 change 并行）/ path（hotfix/tweak/full 分支）

## Candidate Coverage Ledger（v0.29.1+ 行为候选台账）

| 候选行为 | 版本 | decision | case_ids | reason |
|---|---|---|---|---|
| tf state transition 合法/非法转换 | v0.30.0 | covered | T1-state-full-table, T1-invalid-transition | 全转换表正负向 |
| 相对路径状态转换修复 | #100005 | covered | T1-relative-path | cwd 基准修复 |
| state 禁写（set/writeState/doctor） | #100004 | covered | T1-set-state-blocked, T1-writestate-rejects, T1-doctor-illegal-state | 三层防护 |
| DP 编号映射载体（dp_1/2/3） | #100004 | covered | T1-dp-fields | 字段可写回读 |
| guard 14 维度（正负向） | — | covered | T1-guard-* | 全维度解耦断言 |
| arch-design 门控阻断 | #100000 相关 | covered | T1-guard-arch-negative | required+缺文件→fail |
| tf isolate Case A 多仓库 | #100009 | covered | T1-isolate-caseA, T1-isolate-idempotent | .worktrees 落点 |
| tf isolate Case B 单仓库兼容 | #100009 | covered | T1-isolate-caseB | 遗留回退 |
| tf validate schema | — | covered | T1-validate-positive/negative | 退出码 |
| workflow 模式推断 | — | covered | T1-infer-full/hotfix | mode 判定 |
| execution show/recommend | — | covered | T1-execution-show-noplan, T1-execution-recommend | build oracle |
| 5 agent 注册（skills 预加载/色/model） | #100001 #100006 | covered | T1-agents-by-name, T1-agents-skills-field, T1-agents-color-valid, T1-agents-model-inherit | 结构性 |
| test-matrix-complete guard 四分支 | v0.12 | covered | T1-tm-skip/legacy/no-contract/missing/empty/hash-match/hash-mismatch | 4 豁免路径 |
| contract-builder 产 test-matrix.md | v0.12 | covered | T2-contract | 产物 + test_matrix_hash |
| DP-0 冷启动确认 | — | covered | T2-explore-coldstart | dp_0_confirmed |
| 架构四步协议 + DP-A | v0.29.0 | covered | T2-arch-gate | arch_design_decision/arch_review/dp_a |
| **spec-writer dispatch 行为**（非主进程） | #100001 #100006 | covered | T2-specify-dispatch | stream-json 捕获 subagent_type |
| 跨 change 隔离行为（不改他 change） | #100000 | covered | T2-cross-change | 目录树快照零 diff |
| 统一结果协议 FINAL VERDICT | #100008 | covered | T2-result-protocol | 硬断言 grep |
| 修复→审查串行 | #100003 | covered | T2-serial | stream-json 时序断言 |
| 返回即验证门（FAIL→SendMessage 修复） | #100001 | covered | T2-validation-gate | 负向闭环 |
| cross-change-consistency-checker 接入 | #100000 | covered | T2-cross-change-checker | 调度断言 |
| SendMessage 复用原子代理（禁新子代理） | v0.29.1 | covered | T2-sendmessage-reuse | stream-json 无新 spawn |
| 磁盘状态续跑（中断恢复） | — | covered | T2-interruption-resume | 续跑成功 |
| 实事求是（reviewer 建议先查证） | #100002 | covered（弱信号） | T2-pragmatic | LLM 价值判断，断言"已查代码验证"证据引用 |
| B4 validator WHEN/THEN 结构校验 | — | **deferred** | — | 回归风险，需专项夹具，降级 v0.31.0+（P2-26） |

## Cases — Tier 1 确定性（tests/e2e/deterministic/）

| case_id | behavior | design_method | fixture/input | expected | test_tier | oracle_cmd | work_mode | test_file | run_command |
|---|---|---|---|---|---|---|---|---|---|
| T1-state-full-table | 全合法转换被识别 | state | exploring change | error=null | deterministic | guardCheck | REGRESSION | state-machine.test.mjs | `npm run test:e2e` |
| T1-invalid-transition | 非法转换被拒 | state+reject | exploring change | Unknown transition exit1 | deterministic | guardCheck | REGRESSION | state-machine.test.mjs | 同上 |
| T1-relative-path | 相对路径转换 | state+boundary | exploring+artifacts | exit0 + state=specifying | deterministic | tf state transition | REGRESSION | state-machine.test.mjs | 同上 |
| T1-set-state-blocked | set state 被拒 | reject | any change | exit1 + transition 提示 | deterministic | stateSet | REGRESSION | state-machine.test.mjs | 同上 |
| T1-writestate-rejects | writeState 拒非法 | error | state=planning | throws Legal states | deterministic | writeState import | REGRESSION | state-machine.test.mjs | 同上 |
| T1-doctor-illegal-state | 巡检命中非法 state | error | state=planning | pass=false | deterministic | doctorChangeStates | REGRESSION | state-machine.test.mjs | 同上 |
| T1-dp-fields | dp_1/2/3 可写回读 | equivalence | exploring change | 值回读匹配 | deterministic | stateSet/stateGet | REGRESSION | state-machine.test.mjs | 同上 |
| T1-guard-artifacts-exist | 产物存在维度±  | equivalence | ±proposal | pass/fail | deterministic | guardCheck | REGRESSION | guard-dimensions.test.mjs | 同上 |
| T1-guard-arch-negative | 架构门控阻断 | error+reject | required+删 api.md | arch-design fail | deterministic | guardCheck | REGRESSION | guard-dimensions.test.mjs | 同上 |
| T1-guard-schema-valid | spec schema±  | equivalence | ±SHALL spec | pass/fail | deterministic | guardCheck | REGRESSION | guard-dimensions.test.mjs | 同上 |
| T1-guard-contract-fresh | 合约新鲜度±  | boundary | ±改产物 | pass/hash 漂移 fail | deterministic | guardCheck | REGRESSION | guard-dimensions.test.mjs | 同上 |
| T1-guard-dp-gate | DP 门±  | reject | ±dp_3 | pass/fail | deterministic | guardCheck | REGRESSION | guard-dimensions.test.mjs | 同上 |
| T1-guard-closing-dims | tasks/tests/specs/compound±  | equivalence+reject | ±字段 | 各维度 pass/fail | deterministic | guardCheck | REGRESSION | guard-dimensions.test.mjs | 同上 |
| T1-tm-* | test-matrix-complete 四分支 | equivalence+boundary | skip/legacy/无contract/缺matrix/空/hash | 4 豁免 pass / 缺matrix fail | deterministic | guardCheck | REGRESSION | guard-dimensions.test.mjs | 同上 |
| T1-guard-hotfix | dp3-approved±  | reject | hotfix ±dp_3 approved | pass/fail | deterministic | guardCheck --workflow hotfix | REGRESSION | guard-dimensions.test.mjs | 同上 |
| T1-isolate-caseA | 多仓库 worktree | contract | 多仓库工作区 | .worktrees/<change>/<repo>/.git | deterministic | isolate + fs | REGRESSION | isolate.test.mjs | 同上 |
| T1-isolate-idempotent | 重复隔离幂等 | idempotency | 已隔离工作区 | exit0 reuse | deterministic | isolate | REGRESSION | isolate.test.mjs | 同上 |
| T1-isolate-caseB | 单仓库回退 | path | 单仓库保护分支 | exit0 已隔离/建 worktree | deterministic | isolate | REGRESSION | isolate.test.mjs | 同上 |
| T1-validate-* | schema 校验±  | equivalence | ±合规 spec | exit0/1 | deterministic | validate | REGRESSION | validate-execution.test.mjs | 同上 |
| T1-infer-* | 模式推断 | path | full/hotfix fixture | mode 判定 | deterministic | infer | REGRESSION | validate-execution.test.mjs | 同上 |
| T1-execution-* | 执行计划 oracle | error | ±plan | exit1 / recommend modes | deterministic | executionShow/recommend | REGRESSION | validate-execution.test.mjs | 同上 |
| T1-agents-* | agent 注册结构 | equivalence | agents/*.md | 名单/skills/color/model | deterministic | fs frontmatter | REGRESSION | agents-structural.test.mjs | 同上 |

## Cases — Tier 2 LLM（tests/e2e/workflow/，TF_E2E_LLM=1 opt-in）

| case_id | behavior | design_method | fixture/input | expected（行为级 oracle） | work_mode |
|---|---|---|---|---|---|
| T2-explore-coldstart | DP-0 冷启动 | state | C3 基线副本 | tf state get dp_0_confirmed=true | CHARACTERIZATION |
| T2-arch-gate | 架构四步+DP-A | state+path | C1-reset 副本 | arch_design_decision≠null + arch_review_verdict + dp_a_result | CHARACTERIZATION |
| T2-specify-dispatch | spec-writer 子代理 dispatch | contract | C1 副本 | **stream-json 捕获 subagent_type:team-flow:spec-writer** + tf validate pass | CHARACTERIZATION |
| T2-contract | 契约 + test-matrix 产出 | contract | bridging-fixture 副本 | contract_hash≠null + dp_3 + test-matrix.md 非空 + test_matrix_hash≠null | CHARACTERIZATION |
| T2-execute-isolate | build + isolate | contract+state | C2 副本 | .worktrees/C2.../bff/.git + execution show current | CHARACTERIZATION |
| T2-cross-change | 跨 change 不改他 change | contract | C1+C2 共存副本 | **C1 目录树快照 hash 零 diff** | REGRESSION |
| T2-result-protocol | FINAL VERDICT 协议 | contract | 任意产出阶段 | 子代理输出 grep FINAL VERDICT（硬断言） | CHARACTERIZATION |
| T2-serial | 修复→审查串行 | concurrency | 架构修复循环 | stream-json 时序：审查 dispatch > 修复完成 | REGRESSION |
| T2-validation-gate | 返回即验证门 | error+reject | 构造不合规产物 | FAIL → SendMessage 回原子代理修复 | REGRESSION |
| T2-cross-change-checker | checker 接入 | contract | 跨 change 不一致 | cross-change-consistency-checker 被调度 | CHARACTERIZATION |
| T2-sendmessage-reuse | 复用原子代理 | idempotency | 修复循环 | stream-json 无新 subagent spawn | REGRESSION |
| T2-interruption-resume | 磁盘状态续跑 | exception | 阶段中断 | 续跑成功（不靠 --resume） | REGRESSION |
| T2-pragmatic | 实事求是 | exception | 喂错误 reviewer 建议 | 弱信号：输出含"已查代码验证/既有模式"证据引用 | CHARACTERIZATION |

## Adversarial Cases（对抗验证三招适配）

1. **恶意输入**：非法 state 名（T1-writestate-rejects/T1-doctor-illegal-state）、缺 SHALL 的 spec（T1-validate-negative/T1-guard-schema-valid）、缺产物的转换（T1-guard-artifacts-exist 负向）。
2. **依赖失败**：claude -p 崩溃/超时/无 result 行 → driver fail 并归档 JSONL（Tier2 风控）；dist 缺失 → validate exit 1。
3. **并发**：多 change 并行隔离（并行白名单，#100003）；Tier2 强制 --test-concurrency=1 避免 claude 并发烧钱。

## Deferred Items

| case_id | behavior | reason | deferred_since |
|---|---|---|---|
| B4 | validator WHEN/THEN 结构硬校验 | countScenarios 仅校验 Scenario 头存在；既有 spec 合规性未知，硬置 ERROR 有回归风险，需专项夹具 | v0.30.0（P2-26 → v0.31.0+） |
