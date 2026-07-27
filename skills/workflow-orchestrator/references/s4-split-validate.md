# S4 拆分验证与分发（v0.7 重写，v0.17.0 审计必选）

> 原 v0.5「拆分与分发」。v0.7 新增拆分质量审计与并行策略。设计依据：设计增强方案 v0.7 §17.2 / §17.8。
> v0.17.0 变更：change-split-auditor 审计由隐含步骤升级为「必选门禁」，PASS 前不可创建 change 脚手架。change_dag 字段 `spec_dir` 更名为 `change_dir`，路径修正为 `changes/<change-name>/`。

## 编排层 vs 执行层

| 编排层（orchestrator 自己做） | 执行层（委托） |
|------------------------------|---------------|
| 读 plan change 列表 | 拆分质量审计（`change-split-auditor` agent） |
| verdict 路由 | change 脚手架（`tf change scaffold`，建议新增 CLI） |
| 告知用户 | — |

## 步骤

### 1. 拆分质量审计（必选门禁，不可跳过）

调用 `change-split-auditor` agent 对 `plan.md` 做拆分质量审计，输出审计报告（覆盖矩阵 / DAG 无环 / 粒度均衡 / 字段完整 / **拆分维度合规**）。质量自检清单：

**必选约束**：审计 verdict = PASS 是 Step 3（创建脚手架）的前置条件。
verdict = FAIL → 必须回退 S3 调整拆分后重新审计，不可绕过直接创建 change。

- **所有权粒度合规**（v0.9 根因判据，D5 硬门禁）：每个 change 是否对应一个所有权自包含的架构设计单元；是否存在 ≥2 change 瓜分同一聚合/上下文/读模型/契约所有权（切碎 = FAIL）；是否细到无设计单元可识别（FAIL）；是否横跨多个无关节所有权单元（FAIL）
- **粒度合理性**：太大 → 实施困难；太小 → 管理开销（advisory，不单独 FAIL）
- **依赖 DAG**：是否有环、关键路径是否过长
- **并行策略建议**：哪些 change 可并行（同 parallel_group）、哪些必须串行
- **验收标准预分配**：从 PRD 功能清单映射到每个 change 的 AC（覆盖矩阵）——此映射将在 Step 3.5 落盘到 change-brief.md

### 2. 反馈环路检查点

- 依赖图是否可执行？粒度是否合理？
  - **否** → 回退 S3 调整拆分策略。详见 feedback-loops.md「S4 → S3」
  - **是** → 分发

### 3. 创建 change 脚手架

按 plan 中的 change 拆分方案，为每个 change 创建目录并初始化状态文件：

```bash
mkdir -p changes/<change-name>
npx --yes --package @xulthekl/team-flow@0.22.4 tf state init changes/<change-name>
```

> ⚠️ **路径约束**：change 脚手架目录固定为项目根 `changes/<change-name>/`。
> 不要与 `specs/<cap>/`（change 内部行为规格目录）或 `architecture/`（change 内部架构设计目录）混淆。
> 不要放入 `.team-flow/`（仅存产品级编排状态）。

> 建议新增 `tf change scaffold` CLI 一次性完成目录创建 + state init + change_dag 写入（确定性脚本，无需 LLM 判断）。（规划中，尚未实现——v0.17.0 时仍用上方手动步骤）

### 3.5 落盘 change-brief.md（v0.9 新增，产品级→变更级交接物）

> **设计意图**：S3/S4 已把每个 change 的 scope、AC、依赖、技术方向定稿，但这些信息此前只活在产品级 `prd/vN/plan.md`，变更层（workflow-start / need-explorer / spec-writer）读不到，导致变更层在 DP-0 重新询问意图、在 need-explorer 重新决策拆分——两层产物断链。本步骤把产品级决策投影到 change 目录内的 `change-brief.md`，作为**上游输入交接物**，让变更层可继承而非重做。

**职责边界（写死）**：auditor 是只读 agent，**只在审计报告里输出 Dim1 覆盖矩阵**；**落盘动作归 orchestrator 自己**（与 Step 4 写 change_dag 同属编排层自做，见上文「编排层 vs 执行层」表）。即：读取 auditor 报告 Dim1 矩阵 → orchestrator 写入 brief 的 AC 段。

为每个已创建脚手架的 change 写 `changes/<change-name>/change-brief.md`（已存在则**覆盖更新**——防 S4→S3 回退调整后 brief 陈旧，呼应 SKILL.md「已建 change 目录保留增量调整」）：

```markdown
---
upstream_source: orchestrator          # orchestrator | manual | null
upstream_req_id: <req-id>              # 对应 .team-flow/requirements/<req-id>/
upstream_plan_ref: prd/vN/plan.md      # hotfix/快速通道为 null
upstream_change_id: C2                 # 对应 change_dag.id
plan_hash: sha256:<plan.md 内容摘要>    # 检测产品层改动后变更层未同步
---
# Change Brief: <change-name>

## Scope
<用户故事/功能模块级 scope 描述，与 plan.md 该 change 的 Scope 一致>

## 约束
<来自 plan.md 的全局约束 / 该 change 的已知约束>

## AC 列表
<取自 auditor 报告 Dim1 覆盖矩阵中映射到本 change 的 AC，逐条列出>

## 全局技术方向
<取自 plan.md 高阶技术设计段的要点指针：模块边界/技术选型/数据流方向，供 spec-writer 作 design.md 约束>

## PRD & plan 引用
- PRD: prd/vN/prd.md §<相关章节>
- Plan: prd/vN/plan.md ### <C-ID>
```

**hash 豁免（重要）**：change-brief.md 放在 change 根目录，**不**属于 team-flow 五产物（proposal/specs/design/tasks/execution-contract），因此天然**不进入 `artifacts_hash`**（`hash.mjs` 只统计前四类）。空 change 的 `artifacts_hash` 仍为 null，状态机的"无产物"判定不受污染——**绝不**让 brief 入 hash。

**双源权威规则**：scope/技术方向以 `prd/vN/plan.md` 为准、AC 以 PRD 功能清单为准；**brief 只是 S4 时刻的投影快照**，不是第二真相源。若变更层发现 brief 与 plan.md 冲突，以 plan.md 为准并触发 Brief drift 提示（见 workflow-start「Staleness Detection」）。

### 4. 写入 change_dag

把每个 change 的 id / change_dir / state_file / depends_on / priority / parallel_group / status 写入 `.team-flow/requirements/<req-id>/orchestrator.yaml` 的 `change_dag`。详见 state-model.md「change_dag 结构」。

### 5. 分发

按依赖顺序建议执行顺序，告知用户各 change 已就绪：

```
Change C1 已就绪，运行 /workflow-start 进入变更级流程。
执行顺序建议：C1 → (C2 ∥ C3) → C4（C2/C3 可并行）
```

## 完成条件

- change-split-auditor 审计 verdict = PASS（必选门禁已通过，含 v0.9 D5 拆分维度合规）
- 所有 change 目录已创建在项目根 `changes/` 下（非 `specs/` 或 `.team-flow/`），`.team-flow.yaml` 已初始化
- 每个 change 目录已落盘 `change-brief.md`（v0.9 交接物，含 scope/AC/技术方向/frontmatter）
- `.team-flow/requirements/<req-id>/orchestrator.yaml` 的 `change_dag` 已填充
- S4 状态 = completed，已告知用户执行顺序
