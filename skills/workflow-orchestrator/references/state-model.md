# `.workflow-orchestrator.yaml` 状态模型（v0.7 新增）

> orchestrator 的持久化记忆 / checkpointer（对标 LangGraph Checkpointer），跨阶段、跨 session 的状态一律读 yaml 而非依赖上下文记忆。设计依据：设计增强方案 v0.7 §17.9。

## 完整 Schema

```yaml
schema_version: 1                     # schema 版本号
workflow_phase: S2                    # 当前阶段
phases:                               # 各阶段状态
  - { id: S1, status: completed, started_at: "...", completed_at: "...", artifacts: [...] }
  - { id: S2, status: active, started_at: "...", artifacts: [...] }
  - { id: S3, status: pending }
custom_phases: []                     # reserved, Phase 2 (v0.15.0)
replan_log:                           # 重规划履历
  - { seq: 1, trigger: "用户要求跳过原型", before: "S2→S3", after: "S2(skip-proto)→S3", approved_by: user }
change_dag:                           # change 依赖图（S4 后填充）
  - id: change-1
    spec_dir: specs/change-1/
    state_file: specs/change-1/.spec-superflow.yaml
    depends_on: []
    priority: 1
    parallel_group: A                 # 同组可并行
    status: executing                 # 从 .spec-superflow.yaml 同步
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

## 双层冻结语义（解决 §17.3 与 §17.9.1 矛盾）

- **`frozen_downstream`**（S2 完成时设置）：下游阶段（S3/S4/S5）不可直接修改 PRD，只能通过回退到 S2 修改。**S3→S2 回退 = 临时解除 frozen_downstream**，S2 重新完成后恢复。
- **`frozen_absolute`**（用户显式确认或 vN+1 启动时设置）：任何修改都必须升版 vN+1。
- **单一真相源**：frozen 状态以 `prd/vN/prd.md` frontmatter 为准，yaml 只存指针不重复存 frozen 值，避免双写不一致。

## change_dag 结构

S4 后填充。每个节点字段：
- `id`：change 标识（与 C-ID 对应）
- `spec_dir` / `state_file`：change 目录与状态文件路径
- `depends_on`：依赖的 change id 列表（构成 DAG）
- `priority`：优先级数值
- `parallel_group`：同组可并行（如 A、B）
- `status`：从该 change 的 `.spec-superflow.yaml` 同步

## yaml 定位与并发约束

- **持久化记忆 / checkpointer**：跨阶段、跨 session 状态读 yaml，不依赖上下文记忆
- **幂等恢复**：S1「继续执行」入口通过 yaml + 制品实际存在性双重校验重建状态
- **单写者**：产品级 yaml 只由 orchestrator 单写，各 change 只写自己的 `.spec-superflow.yaml`，避免并发写冲突

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

> **当前实现状态**：本 SKILL.md 描述的是 v0.7 完整目标设计。`.workflow-orchestrator.yaml` 持久化（Phase 0）落地前，编排层以上下文 + 制品存在性做最佳努力状态推断；动态重规划相关能力随路线图分版本交付。
