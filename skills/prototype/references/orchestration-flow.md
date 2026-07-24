# Prototype 内部编排流程（v0.15.0）

> 本 skill 主代理只编排不实施。所有非交互步骤（探查/绘制/评审/设计系统产出）派子代理，遵循 §18.1 subagent 结构化交接协议（status/deliverable/blockers/outstanding_questions/summary）。人工评审/路由由主代理用阻塞问题工具执行（subagent 不能 AskUserQuestion）。

## 步骤 ① 环境探查 + 方案设计（子代理）

派发插件 agent `prototype-env-scout`（只读，tools 硬限 Read/Bash/Grep/Glob），传入：PRD 路径、config 的 `prototype.designSystem`/`prototype.entry`、当前 git 分支。简报写在 response，主代理按需落盘。

子代理探查并产出环境简报：
- **设计系统现状**：`design-system.md` 是否存在？9 段 schema 完整度？缺失哪些段？
- **原型仓库分支**：当前分支、是否已有 `prototype/`、与 PRD 版本分支是否对齐
- **PRD 版本**：`iteration_version`、冻结状态、UI 功能点清单（§4/§7）
- **已有页面**：现有 prototype/ 页面/组件清单（迭代时）
- **原型方案设计建议**：页面结构、组件复用、导航 flow 草案

子代理按 §18.1 返回。若发现 `design-system.md` 缺失 → 在 `outstanding_questions`/`blockers` 标注，主代理转入设计系统创建（见下）。

## 步骤 ①b 设计系统创建（条件，子代理）

环境简报显示设计系统缺失/不完整时：
1. 派 `references/agents/design-system-architect.md`（`mode: create`, `confirmed: false`）按 9 段 schema + 5 方向确定性调色板产出 `design-system.md` 草案（写 scratch 或 response，**不写正式路径**）。
2. 主代理评审草案 → **人工评审**（AskUserQuestion 确认/调整）。
3. 确认后**带 `confirmed: true` 重派 design-system-architect**，由它写入正式 `prototype/design-system.md`（**主代理不直接写**），再回 ① 补齐环境简报。

## 步骤 ② 方案评审 + 人工评审（主代理）

主代理评审 ① 的环境简报 + 原型方案设计，然后用 AskUserQuestion 与 LT 确认：
- 原型方案（页面结构/导航）是否认可
- 设计系统/分支/版本是否明确
- 是否进入绘制

LT 确认后进入 ③。**confirmed_plan 序列化**：将 scout 简报的「Recommended Prototype Plan」段（页面清单/组件清单/导航流）+ 人工确认结论（含明确的设计系统路径/分支/版本）拼为 `confirmed_plan`，作为 ③ prototype-builder 的入参。

## 步骤 ③ 原型绘制（子代理）

派发插件 agent `prototype-builder`（有 Write），传入：已确认的原型方案、`design-system.md` 路径、目标分支/版本、PRD 路径。

prototype-builder 绘制 `prototype/`（index.html + pages/ + components/ + assets/design-tokens.css + flow.md），零外部依赖、复用设计系统 token、禁止内联样式漂移。按 §18.1 返回 deliverable = prototype/ 入口绝对路径。

**主代理严禁在此步直接 Write/Edit 原型文件。**

## 步骤 ④ 原型评审（子代理）

派发插件 agent `prototype-reviewer`（只读，独立上下文），**传入：`prd_path`、`prototype_path`（及当前轮次 N）**，对照 PRD 6 维度（D1 页面完整性 / D2 功能覆盖 / D3 字段一致性 / D4 导航一致性 / D5 术语一致性 / D6 状态覆盖）。报告写 response，主代理落盘到 `prd/vN/prototype-auto-review.md`。

判定（柔性）：
- **PASS**：Critical=0 且 Important=0
- **PASS_WITH_WARNINGS**：Critical=0 且 Important>0（警告交人工裁定）
- **FAIL**：仅 Critical>0

## 步骤 ⑤ 循环编排（主代理）

- FAIL → 主代理把不一致项交给 prototype-builder 修正（回 ③），重新 ④ 评审，**≤3 轮**。
- **收敛检测**：连续两轮不一致项集合无缩小（修正无效/误报死循环）→ 立即转人工，不等满 3 轮。
- PASS / PASS_WITH_WARNINGS → 进入 ⑥。

## 步骤 ⑥ 人工评审路由（主代理）

主代理用 AskUserQuestion 呈现评审结论 + 争议项，LT 选择：
- **PRD 有问题** → 回 orchestrator S2 修订 PRD（**vN 内修订 + 变更履历，非升版**；见 feedback-loops 设计）→ PRD 更新后再回 ① 更新原型。**独立调用 fallback**（非 orchestrator 触发时）：无 S2 可回，直接提示 LT 修订 `prd/vN/prd.md` 后重入本 skill。
- **原型需调整**（美观/体验/品牌/信息密度等自动评审查不到的维度）→ 回 ③ 派 prototype-builder 实施调整
- **通过** → 冻结：PRD frontmatter `frozen: true`（frozen_downstream），prototype 定版

## 子代理阻断处理（§18.1）

- 子代理返回 `done_with_questions` → 主代理批量确认 `outstanding_questions`（可合并为一次 AskUserQuestion）。
- 子代理返回 `blocked` → 主代理裁决 `blockers[]` 后续跑/重启该子代理（如设计系统缺失、PRD 未冻结等阻断）。
