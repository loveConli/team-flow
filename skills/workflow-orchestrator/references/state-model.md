# 编排状态模型（v0.7 新增，v0.15.0 多需求重构 + `.team-flow/` 治理）

> orchestrator 的持久化记忆 / checkpointer（对标 LangGraph Checkpointer），跨阶段、跨 session 的状态一律读 yaml 而非依赖上下文记忆。设计依据：设计增强方案 v0.7 §17.9 + v0.8 §18.2/§18.3。

## 状态文件布局（v0.15.0：每需求一份 + 注册表）

> **v0.15.0 重构**：从「单需求单文件 `.workflow-orchestrator.yaml`（项目根）」升级为「每需求一份 + 注册表索引」，支持多需求并行；所有状态文件收敛到 `.team-flow/` 目录（P1-6 第一阶段）。

```
.team-flow/
├── registry.yaml                        # 需求注册表（索引 + 活跃指针）
└── requirements/
    └── <req-id>/                        # 每个需求独立目录（req-id = prd 迭代主题短码）
        └── orchestrator.yaml            # 该需求的产品级编排状态（原 .workflow-orchestrator.yaml）
```

- **迁移兼容**：检测到旧 `<root>/.workflow-orchestrator.yaml` 存在时，自动迁移到 `.team-flow/requirements/<req-id>/orchestrator.yaml` 并提示用户（一次性）。
- **变更级状态**：各 change 的状态文件**当前仍为** `<change>/.team-flow.yaml`，检测逻辑不动；**计划 v1.0.0（P1-6 第二阶段）改名**为 `.team-flow.yaml`（对齐设计增强方案 v0.8 §18.3）。改名落地前，编排层与变更层一律以 `.team-flow.yaml` 为准。
- **项目级架构状态（v0.35.0 新增）**：`.team-flow/arch-state.json`（架构阶段是产品/迭代级，不放 change 状态）。见下文「architecture 阶段」与「arch_baseline 豁免键」。

## registry.yaml Schema

```yaml
schema_version: 1
active_requirement: <req-id>          # 当前活跃需求（orchestrator 默认操作对象）
requirements:
  - id: <req-id>
    title: <需求标题>
    prd_version: v1
    phase: S3                          # 冗余快照，真相源仍是各 orchestrator.yaml
    orchestrator_state: .team-flow/requirements/<req-id>/orchestrator.yaml
    created_at: "..."
    updated_at: "..."
```

## 单需求 orchestrator.yaml Schema

```yaml
schema_version: 1                     # schema 版本号
requirement_id: <req-id>              # 需求标识（与 registry 对应）
workflow_phase: S2                    # 当前阶段
phases:                               # 各阶段状态
  - { id: S1, status: completed, started_at: "...", completed_at: "...", artifacts: [...] }
  - { id: S2, status: active, started_at: "...", artifacts: [...] }
  - { id: S3, status: pending }
  - { id: ARCH, name: 产品级架构设计, status: pending, skip: <迭代无结构性变更|null>, artifacts: [docs/architecture/iterations/vN/architecture.md] }
  - { id: S4, status: pending }
custom_phases: []                     # reserved
replan_log:                           # 重规划履历
  - { seq: 1, trigger: "用户要求跳过原型", before: "S2→S3", after: "S2(skip-proto)→S3", approved_by: user }
change_dag:                           # change 依赖图（S4 后填充）
  - id: change-1
    change_dir: changes/change-1/                      # 项目根 changes/<change-name>/（非 specs/，非 .team-flow/）
    state_file: changes/change-1/.team-flow.yaml   # 变更级状态文件（P1-6 第二阶段 v1.0.0 改名为 .team-flow.yaml）
    depends_on: []
    priority: 1
    parallel_group: A                 # 同组可并行
    status: executing                 # 从 .team-flow.yaml 同步（计划 v1.0.0 改名 .team-flow.yaml）
  - id: change-2
    depends_on: [change-1]
    status: pending
prd_version: v1                       # PRD 版本
```

## 状态枚举

`pending | active | completed | skipped | blocked | aborted`

## 状态转换规则

- **正向**：pending → active → completed
- **跳过**：pending → skipped（用户确认）
- **回退**：active → pending（**必须写 replan_log**）
- **阻塞**：active → blocked → active（S5 检测到 change 卡死）或 blocked → aborted
- **终止**：任何非 completed 状态 → aborted（用户放弃编排）

## architecture 阶段（S3.5，v0.35.0 新增）

> 产品级架构设计阶段，位于 S3 计划之后、S4 拆分之前。设计依据：设计增强方案 v0.14 §59。

**phase id**：`ARCH`；顶层 `workflow_phase: architecture`（语义 kebab-case）。
**命名约定**：新阶段一律用 kebab-case 语义名（历史值保留不迁移，避免无价值 churn）。

```yaml
phases:
  - { id: S3, status: completed }
  - { id: ARCH, name: 产品级架构设计, workflow_phase: architecture,
      status: completed, skip: null,
      artifacts: [docs/architecture/iterations/vN/architecture.md] }
  - { id: S4, status: pending }
```

**场景判定（入口三态）**：
| 场景 | 判定输入 | S3.5 模式 |
|------|---------|----------|
| S0 全新项目 | 无代码库 | 正向设计（首轮不可跳过） |
| S1 存量代码+无基线 | 有 src/，无 baseline.md | 先 workflow-bootstrap → 逆向重建 |
| S2 存量+瘦锚点 | baseline.md + ARCHITECTURE 无 BC/聚合层 | 逆向重建（深化） |
| S3 存量+跑过迭代 | baseline + changes/ + prd/vN/，无 arch_baseline | 逆向重建（首轮强制） |
| S4 已有产品级架构 | arch_baseline 已打戳 + iterations/ | 正向设计（正轨） |

**skip 条件（须物化）**：迭代无结构性变更（纯 bugfix/重构/不新增 BC 或聚合/不改变聚合边界或全局契约）。判定者 = **编排器 + 用户确认**（非 LLM 自判，防 v0.13 §54 绕过教训）。**skip 必须物化**：写入 `docs/architecture/iterations/vN/` 占位（含 skipped 标记 + 理由），guard 才放行——否则 hotfix/快速通道 change 会卡在 arch-readiness 上（v0.32.2 C1 死锁链同类）。

**时间盒 + 深度分层**：时间盒 ≤1 天；非触及 BC 只维护锚点行，触及 BC 才做按域深化（v0.14 §60.4）。

**输入输出契约**：
- 输入：prd/vN/prd.md（frozen_downstream）+ plan.md + prototype/ + baseline.md + CONCEPTS.md + 现有全局基线（旧项目）
- 输出：`docs/architecture/iterations/vN/architecture.md`（6 产物权威快照，预测态，provenance 标注）+ 产品级评审 verdict；**不触发全局覆盖写**（P1：预测态不进实际态）

**门禁**（v0.14 §59.4）：
| 门禁 | 挂点 | 校验 | 豁免 |
|------|------|------|------|
| 产品级评审门 | ARCH→S4 | architecture-reviewer product 视角 PASS | skip 时仍要物化标记 |
| arch-readiness | S4 拆分 | iterations/vN/ 快照覆盖 change 触及的 BC | arch_baseline 缺失 → WARN 不 FAIL |
| arch-snapshot | executing→closing | 本轮快照已落盘 | 在途 change legacy 豁免 |

## arch_baseline 豁免键（v0.35.0 新增）

完全复刻 v0.13 §48.1 schema_version 防污染模式（设计增强方案 v0.14 §59.4/§63.1）：

- **位置**：`.team-flow/arch-state.json`（项目级状态；架构阶段是产品/迭代级，不放 change 的 `.team-flow.yaml`）
- **内容**：`{ arch_baseline: "v0", established_at: "<date>", mode: "reconstruction" | "design", snapshot_root: "iterations/", baseline_prd_ref: "prd/vN/" }`
- **防污染**：仅 `tf arch init` 写入；`tf state set`/rebuild/doctor 一律不得追加（缺失 = 存量信号）
- **判定**：`arch_baseline == null` → arch-readiness/arch-snapshot 均 PASS + WARN（reason: 'project architecture baseline not established — S3.5 reconstruction pending'）

## 双层冻结语义（解决 §17.3 与 §17.9.1 矛盾）

- **`frozen_downstream`**（S2 完成时设置）：下游阶段（S3/S4/S5）不可直接修改 PRD，只能通过回退到 S2 修改。**S3→S2 回退 = 临时解除 frozen_downstream**，S2 重新完成后恢复。
- **`frozen_absolute`**（用户显式确认或 vN+1 启动时设置）：任何修改都必须升版 vN+1。
- **单一真相源**：frozen 状态以 `prd/vN/prd.md` frontmatter 为准，yaml 只存指针不重复存 frozen 值，避免双写不一致。

## 原型补跑/重跑：部分重入语义（v0.20.0，S1 第 7 入口）

S1 判定「原型补跑/重跑」（PRD `frozen_downstream` ∧ `prototype/` 缺失/需重做）时的状态转换规则，**区别于 S3→S2 回退**：

- **状态转换**：`workflow_phase` 临时回 `S2`，S2 阶段状态置 `active` 并加子标记 `prototype-only`（仅重跑 S2 步骤 2 判断→3 原型循环→4 冻结）；**不重置** S3/S4 已 `completed` 的 phases。记录原 phase（如 `S4`）到 `replan_log`，闭环后恢复。
- **冻结语义**：PRD `frozen_downstream` **保持不变**（与 S3→S2 回退会临时解除 frozen 不同）——原型补跑不修 PRD，故无需解除冻结。
- **制品保留**：S3 `plan.md` / S4 `changes/` 已存在且仍有效则**保留不动**，不重做、不归档。
- **闭环恢复**：原型循环闭环（自动评审 PASS / 人工通过）后，`workflow_phase` 恢复原 phase（如 `s4-distribution`），S2 状态回 `completed`（去掉 `prototype-only` 子标记）。
- **replan_log 必写**：`{ seq, trigger: "prototype-rerun", before: <原 phase>, after: "S2(prototype-only)", approved_by }`，并记结论「未暴露 scope 问题、changes 保持有效」。
- **升级路径**：若原型循环暴露 PRD scope 问题 → **脱离本路径**，升级为 S3→S2 回退修订（临时解除 `frozen_downstream`，PRD vN 内修订 + 变更履历），不再按 prototype-only 处理。

## change_dag 结构

S4 后填充。每个节点字段：
- `id`：change 标识（与 C-ID 对应）
- `change_dir` / `state_file`：change 目录与状态文件路径。`change_dir` 固定为项目根 `changes/<change-name>/`，不是 `specs/<cap>/`（change 内部行为规格目录）或 `architecture/`（change 内部架构设计目录），也不是 `.team-flow/`（仅存产品级编排状态）
- `depends_on`：依赖的 change id 列表（构成 DAG）
- `priority`：优先级数值
- `parallel_group`：同组可并行（如 A、B）
- `status`：从该 change 的 `.team-flow.yaml` 同步（变更级状态文件，P1-6 第二阶段改名 `.team-flow.yaml`）

## yaml 定位与并发约束

- **持久化记忆 / checkpointer**：跨阶段、跨 session 状态读 yaml，不依赖上下文记忆
- **幂等恢复**：S1「继续执行」入口通过 yaml + 制品实际存在性双重校验重建状态
- **多需求隔离（v0.15.0）**：每个需求的 `orchestrator.yaml` 只由该需求的 orchestrator 实例单写——多需求并行时**天然隔离，无写冲突**（原「单写者」约束自动成立）。
- **registry 写入**：`registry.yaml` 只在需求创建/切换/状态快照时由 orchestrator 写，频率低。
- **变更级单写者**：各 change 只写自己的状态文件（当前 `.team-flow.yaml`，P1-6 第二阶段改名 `.team-flow.yaml`），避免并发写冲突。

---

## 动态重规划（§17.9）

> 从「固定管道」升级为「默认路径 + 任意时刻可重规划」。

### 三级意图分类器（宁可漏判，不可误触发）

| 级别 | 方法 | 触发条件 | 动作 |
|------|------|---------|------|
| L1 关键词 | 零成本匹配（**宾语须为 orchestrator 阶段或 change 全局结构**） | 「改阶段顺序/跳过原型阶段/插入一个评审阶段/回退到S2/重规划工作流」 | → 重规划评估 |
| L2 语义分析 | LLM 判断 | 对阶段顺序的不满 / 对缺失环节的要求 / 对已完成产出的否定 | → **建议模式**：输出轻量提示「你似乎想调整工作流？输入'重规划'进入重规划模式」，**不自动进入评估** |
| L3 默认 | — | 不改变工作流结构 | 普通问答处理 |

> **L1 上下文限定**：「跳过这个功能」（PRD 内容讨论）不触发；「跳过原型阶段」（orchestrator 阶段）才触发。L2 从「自动触发」降级为「建议模式」（B2），将触发权交还用户。

### 重规划评估流程

```
边界检查（红/绿/灰区）→ 影响分析 → before/after 对比呈现
  → DP-R 用户确认（硬门禁，阻塞式）→ 执行 + 写入 replan_log
  → 触发复利捕获（workflow_pattern）
```

### 重规划边界

| 区域 | 范围 | 规则 |
|------|------|------|
| **绿区（可重规划）** | 调整未完成阶段顺序；跳过未完成阶段；插入新阶段；修改未执行 change 的优先级/依赖；S4 后新增 change | 用户确认即可 |
| **红区（不可重规划）** | 修改已冻结 PRD（只能升版）；删除已执行 change（只能走 abandoned）；重做已完成阶段；改变已合并 delta spec | 硬阻断 |
| **灰区（二次确认）** | 回退 active 阶段（半成品可能丢失）；修改有下游执行的 change 依赖图 | 需二次确认 + 影响说明 |

### replan_log

每次回退/重规划必须写入 `replan_log`：`{ seq, trigger, before, after, approved_by }`。是 ACM/CMMN Case Event Log 的 LLM 简化版。

---

## 工作流模式复利 L2（§17.9.4）

与现有 solutions 体系完全兼容，新增 `type: workflow_pattern`：

| 字段 | 值 |
|------|---|
| type | `workflow_pattern`（新增值） |
| domain | `workflow`（固定） |
| phase | `cross-phase`（固定） |
| pattern_kind | stage-insertion / stage-skip / reorder / change-split-adjust / gate-adding |
| outcome | positive / negative / neutral |
| confidence | 浮点数（0.3 基础 + occurrences×0.1 + outcome 加成） |
| occurrences | 出现次数 |

**捕获时机**：DP-R 确认的重规划、阶段回退、用户主动反馈、PRD 升版、change closing 回顾。

**注入时机**（全部 advisory 级，不阻断）：
- S1 路由时：历史模式 top-3（confidence ≥ 0.5）
- 阶段转换时：applicable_when 匹配
- DP-R 触发时：类似历史重规划

**置信度阈值**：≥0.7 强建议 / ≥0.5 弱建议 / <0.5 仅记录 / ≤0.1 淘汰。晋升：confidence ≥ 0.7 且 occurrences ≥ 3 → 建议固化到 SOP。

---

## 实施路线图（§17.9.6）

| 阶段 | 版本 | 内容 | 依赖 |
|------|------|------|------|
| Phase 0 | v0.14.0 | `.workflow-orchestrator.yaml` 状态持久化 | 无（一切前提） |
| Phase 1 | v0.14.0 | DP-R 决策点 + 阶段跳过/插入/重排 + replan_log | Phase 0 |
| Phase 2 | v0.15.0 | 三级意图分类器 + 红/绿/灰区边界检查 | Phase 1 |
| Phase 3 | v0.15.0 | workflow_pattern 注册 + 捕获 + INDEX.md 兼容 | Phase 1 |
| Phase 4 | v0.16.0 | confidence 模型 + 三处注入 + 用户反馈回写 | Phase 3 |
| Phase 5 | v0.17.0+ | 高 confidence 模式固化 SOP + 失效淘汰 | Phase 4 |

**关键约束**：Phase 0 是一切前提；所有 L2 注入为 advisory 级；L3（自动工作流修改）明确不做，人在环。

> **当前实现状态**：状态持久化（Phase 0）已于 **v0.15.0** 落地，并升级为多需求模型（`.team-flow/registry.yaml` + `.team-flow/requirements/<req-id>/orchestrator.yaml`）。动态重规划相关能力（三级意图分类器、红/绿/灰区、workflow_pattern 复利）随路线图分版本交付。
