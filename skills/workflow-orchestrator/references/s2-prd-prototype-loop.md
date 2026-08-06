# S2 PRD + 原型阶段（v0.7 重写，原型循环上提）

> v0.7 关键变更：原型循环由 orchestrator **直接编排**（思路 B），不再藏在 ce-brainstorm 内部。设计依据：设计增强方案 v0.7 §17.2 / §17.8 / §17.10。

## S2阶段状态管理

**S2阶段包含多个子阶段，必须按顺序执行，不能跳过：**

```
prd_draft → user_review → prototype_loop → prd_frozen → completed
```

| 子阶段 | 说明 | 是否阻塞 |
|--------|------|---------|
| `prd_draft` | PRD草稿生成完成 | 是（等待用户确认） |
| `user_review` | 用户查看PRD文档 | 是（等待用户确认） |
| `prototype_loop` | 原型循环（如需要） | 否（自动执行） |
| `prd_frozen` | PRD冻结 | 否（自动执行） |
| `completed` | S2阶段完成 | 否（自动执行） |

**⛔ 关键约束**：
- `prd_draft` 完成后必须等待用户确认，不能自动进入 `prototype_loop`
- 只有用户确认后，才能进入原型循环
- PRD冻结后，才能进入S3阶段

## 编排层 vs 执行层

| 编排层（orchestrator 自己做） | 执行层（委托） |
|------------------------------|---------------|
| 调用 ce-brainstorm（传路径） | PRD/原型产出（会话级 skill） |
| 原型触发判断 | 原型自动评审（`prototype-reviewer` agent） |
| 循环控制（verdict 路由、≤3 轮） | 复利时刻检测（`compound-moment-detector`，可选） |
| frozen 确认 | — |
| 人工评审阻塞确认 | — |

## 步骤

### 1. 产出 PRD 草稿

调用 `/ce-brainstorm`，**显式传入** `mode: orchestrated`（B6 跨 skill 集成规约：用显式入参，禁止语义推断）。被 orchestrator 调用时 ce-brainstorm 跳过其内部 Phase 3.5 原型循环（循环归编排层），直接调用时（standalone）保留。

> **阶段后压缩协议（A4）**：ce-brainstorm 冻结 PRD 后，编排层主动触发 compact，只保留 `prd/vN/prd.md` 路径与 frozen 状态，丢弃过程对话。会话级 skill 的过程对话会进入编排层上下文窗口，必须压缩。

### 1.5 用户确认 PRD 草稿（强制阻塞点）

**⛔ 关键：PRD草稿完成后，必须等待用户确认，不能自动进入下一步。**

PRD草稿生成后：
1. 输出PRD文档位置：`prd/vN/prd.md`
2. **阻塞等待用户确认**（使用 AskUserQuestion）
3. 用户确认后，才能进入步骤2（判断是否需要原型）

**错误行为**：PRD草稿完成后直接标记S3阶段完成
**正确行为**：PRD草稿完成后等待用户查看，确认后继续S2阶段的后续步骤

### 2. 判断是否需要原型

- 需要（涉及 UI/交互/页面）→ 进入原型循环
- 不需要（纯后端/无 UI）→ PRD 直接冻结，跳到步骤 5

### 3. 原型循环（编排层控制）

```
调用 prototype skill 产出原型
  → 自动评审（prototype-reviewer agent，独立上下文）
    → 输出一致性报告（编排层落盘到 prd/vN/prototype-auto-review.md）
    → FAIL（Critical > 0）→ 修正 → 重新自动评审（≤3 轮）
    → PASS_WITH_WARNINGS → 警告项交人工裁定
    → PASS → 进入人工评审
  → 人工评审（阻塞确认，聚焦：美观/体验/品牌/信息密度）
    → 通过 → 冻结
    → 不通过 → 修正 → 回自动评审
```

**自动评审 6 维度**（详见「原型自动评审」小节）：D1 页面完整性 / D2 功能覆盖 / D3 字段一致性 / D4 导航一致性 / D5 术语一致性 / D6 状态覆盖。

**收敛检测**：连续两轮不一致项集合无缩小（修正无效/误报死循环）→ 立即转人工，不等满 3 轮。

**人工介入 = 编排层阻塞确认**（非 subagent，因 subagent 不能 AskUserQuestion），呈现争议项 + 选项（接受现状 / 指定修正方向 / 升版 / 放弃原型）。

### 4. 冻结

设置 `frozen_downstream`（见 state-model.md「双层冻结」）。冻结后，**迭代内变更不升版**，在 vN 内修订 + 记录决策/变更履历。

### 4.5 阶段产物同步门禁点（v0.37.0 §68.2 G1）

S2 冻结后，**阻塞确认**（AskUserQuestion）是否同步阶段产物（团队协作：PRD+原型是需求讨论基线）：
- **A 提交并推送**：`tf publish --prd --push`；原型为独立仓库时先 `tf prototype branch <prd-vN>` 确认/创建版本 worktree（迭代完成 push `prd-vN` 分支供团队查看者 `tf prototype branch <prd-vN>` 一键拉取）
- **B 仅提交不推送**：`tf publish --prd`
- **C 暂不同步**：继续 S3，后续可补

同步对象：`prd/vN/` + 原型（push `prd-vN` 分支）+ `.team-flow/`（orchestrator.yaml / registry.yaml）。

### 5. 复利捕获

检测可复利时刻（需求矛盾、原型返工、自动评审发现不一致并修正等）。每次自动评审发现不一致并修正后触发：

```bash
tf solutions capture --phase prd --domain <domain> --type pitfall --severity <sev> --summary "<summary>"
```

### 6. 反馈环路检查点

- PRD scope 是否合理？是否有明显遗漏？
- 如果 S3 发现 scope 问题，可回退到 S2 修订（**vN 内修订，非升版**）。详见 feedback-loops.md。

## 原型自动评审（§17.10）

**实现形式**：独立 `prototype-reviewer` agent（对齐 code-reviewer 模式）。
- tools: Read, Bash, Grep, Glob, Write（直接写审查报告文件）
- 独立上下文运行，未参与 PRD/原型产出（规避锚定效应）
- 两阶段检查：Pre-check（Bash 结构化预检，D1/D4 机械化）+ Deep-check（LLM 六维度语义对比，D2/D3/D5/D6 标注为「建议级，误报可被人工推翻」）

**6 维度检查**：

| 维度 | PRD 基准源 | 检查内容 | 严重级别 |
|------|-----------|---------|---------|
| D1 页面完整性 | §4 画面原型 | 每个页面是否有对应 HTML + 导航链接 | Critical |
| D2 功能覆盖 | §7 系统功能清单 | 每个 UI 功能是否有对应交互元素 | Critical |
| D3 字段一致性 | §8.4 功能模块 | 字段是否在表单中体现 | Important |
| D4 导航一致性 | §8.2.2 画面交互 | 页面跳转是否与 flow.md 一致 | Important |
| D5 术语一致性 | §6 业务术语 + CONCEPTS.md | 标签/术语是否一致 | Minor |
| D6 状态覆盖 | §8.2.3 异常状态 | 空/错误/加载状态是否体现 | Important（**可标 N/A**） |

> **D6 N/A 机制**：自包含 HTML 原型结构性无法体现的状态（如动态加载），允许标 N/A，不阻断。

**判定标准**（柔性化，B7）：
- **PASS**：Critical=0 且 Important=0
- **PASS_WITH_WARNINGS**：Critical=0 且 Important>0（警告项交人工裁定，不阻断）
- **FAIL**：**仅当 Critical>0**（Important 误报不触发 FAIL，避免 D6 等维度误报卡死循环）

**自动评审不能检查的维度**（只能人工评审）：美观度、交互体验、品牌一致性、响应式适配、动效合理性、信息密度、无障碍访问。

## 完成条件

- `prd/vN/prd.md` frontmatter `frozen: true`（frozen_downstream 已设置）
- 如需原型：`prd/vN/prototype-auto-review.md` 已落盘且 verdict 为 PASS / PASS_WITH_WARNINGS（人工已裁定）
- `.team-flow/requirements/<req-id>/orchestrator.yaml` 中 S2 状态 = completed，`prd_version` 已记录
