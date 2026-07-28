# Prototype 内部编排流程（v0.15.0，v0.18.0 工艺升级）

> 本 skill 主代理只编排不实施。所有非交互步骤（探查/绘制/评审/设计系统产出）派子代理，遵循 §18.1 subagent 结构化交接协议（status/deliverable/blockers/outstanding_questions/summary）。人工评审/路由由主代理用阻塞问题工具执行（subagent 不能 AskUserQuestion）。

## 子代理决策点中继（v0.21.0，§22.1.1 stop-and-resume）

子代理（scout / builder）**没有 AskUserQuestion**。当其在决策点经 `SendMessage(to: "main")` 发来结构化提问请求（`<agent-message>` 含 `{ question, why, options[] }`）并停止时，主代理**负责中继**：

1. **收通知识别**：经 `task-notification` 收到子代理提问请求（**不要用 TaskOutput 轮询**，对齐 §22.2 等待范式）。识别其为「中继请求」而非终态交接（子代理末条消息会明示「已发问、等待回传」）。
2. **代问用户**：用 `AskUserQuestion` 把问题转给 LT（包装措辞、给选项）；属主代理权限内的技术决策可自行拍板。并行多子代理提问可**合并为一个多问弹窗**一次问完。
3. **回传即唤醒**：拿到答案后 `SendMessage(to: <agentId>)` 回传——该调用**自动 resume 已停止的子代理**带答案续跑。

**请求-应答匹配纪律（实证暴露的真风险，必守）**：
- 维护每子代理的「未决提问请求」台账，**仅回传子代理实际提出过的提问**；**不要自发追加问题**再把答案错配回传（实录中主代理曾把无主答案回传给未发追问的子代理，被子代理按「正确优先」拒绝）。
- 回传时附上下文（「这是你关于 X 提问的回答：Y」），便于子代理校验对应性。
- harness 不支持 resume 时，降级为读子代理 `blocked` 返回 + 携答案**重新派发**。

## 步骤 ① 环境探查 + 方案设计（子代理）

派发插件 agent `prototype-env-scout`（只读，tools 硬限 Read/Bash/Grep/Glob），传入：PRD 路径、config 的 `prototype.designSystem`/`prototype.entry`、当前 git 分支。简报写在 response，主代理按需落盘。

子代理探查并产出环境简报：
- **设计系统现状**：`design-system.md` 是否存在？9 段 schema 完整度？缺失哪些段？
- **原型仓库分支**：当前分支、是否已有 `prototype/`、与 PRD 版本分支是否对齐
- **PRD 版本**：`iteration_version`、冻结状态、UI 功能点清单（§4/§7）
- **已有页面**：现有 prototype/ 页面/组件清单（迭代时）
- **原型方案设计建议**：页面结构、组件复用、导航 flow 草案
- **差异化方向（v0.18.0）**：产出 2-3 个差异化方向（布局策略 / 视觉侧重 / 风险权衡），附推荐方向 + 理由

子代理按 §18.1 返回。若发现 `.team-flow/design-system/` 缺失 → 在 `outstanding_questions`/`blockers` 标注，主代理转入设计系统创建（见下）。

## 步骤 ①b 设计系统创建（条件，调用独立 skill，v0.19.0）

环境简报显示设计系统缺失/不完整时：
1. 主代理调用 `/team-flow:design-system` skill（独立入口，用户主导交互创建）。
2. design-system skill 内部执行：需求收集（≤5 个预填推荐问题）→ 确定性 token 派生 → 草稿生成（base.md + 变体）→ 预览生成（preview.html）→ 用户评审确认 → 落盘 `.team-flow/design-system/` + guard 校验。
3. 创建完成后回 ① 补齐环境简报。

> **v0.19.0 变更**：①b 从"内部派 design-system-architect 种子代理"升级为"调用独立 design-system skill"。architect 迁移为 design-system skill 的内部执行引擎。存储从 `prototype/design-system.md` 迁移到 `.team-flow/design-system/`（base.md + 变体）。

## 步骤 ② 方案评审 + 人工评审（主代理）

主代理评审 ① 的环境简报 + 原型方案设计，然后用 AskUserQuestion 与 LT 确认：
- **方向选定（v0.18.0）**：呈现 2-3 个差异化方向对比，LT 选定一个锁定
- 原型方案（页面结构/导航）是否认可
- 设计系统/分支/版本是否明确
- 是否进入绘制

LT 确认后进入 ③。**confirmed_plan 序列化**：将 scout 简报的选定方向（布局策略/视觉侧重）+「Prototype Plan」段（页面清单/组件清单/导航流）+ 人工确认结论（含明确的设计系统路径/分支/版本）拼为 `confirmed_plan`，作为 ③ prototype-builder 的入参。

## 步骤 ③ 原型绘制（子代理）

派发插件 agent `prototype-builder`（有 Write），传入：已确认的原型方案（含选定方向）、`design-system.md` 路径、目标分支/版本、PRD 路径。

**prompt 组装顺序契约（v0.18.0, v0.24.0 扩展）**：`design-system.md → references/template.html → references/layouts.md → references/checklist.md → references/craft/（按页面类型选择注入）→ references/interactive-prototype.md（按需）→ references/wireframe.md（按需）→ PRD`。

craft 注入策略：仪表盘→laws-of-ux+state-coverage；表单→state-coverage+accessibility-baseline；列表→typography-hierarchy；通用→anti-ai-slop（始终注入）。

**原型类型注入策略（v0.24.0）**：
- **线框图模式**（scout 简报标注 `prototype_type: wireframe`）→ 注入 `references/wireframe.md`，跳过 template.html/layouts.md（线框图不用种子骨架）
- **交互原型模式**（scout 简报标注 `prototype_type: interactive`，PRD 含复杂表单/多步流程/动态反馈）→ 注入 `references/interactive-prototype.md` + `craft/state-coverage.md`（强制）
- **静态原型模式**（默认）→ 不注入额外文件，按现有流程

prototype-builder **从种子模板组合**（template.html + layouts.md 骨架），先报 section 列表，再填充真实文案，P0/P1/P2 自检后提交。零外部依赖、复用设计系统 token、禁止内联样式漂移。按 §18.1 返回 deliverable = prototype/ 入口绝对路径。

**主代理严禁在此步直接 Write/Edit 原型文件。**

**交接后产物校验（v0.20.0，defense in depth，设计 §22.1）**：收到 builder 交接、**派 reviewer 之前**，主代理**不信 `status=done` 字面值**，先机械校验入口产物真实落盘：

```bash
test -f <prototype_path>/index.html && test -s <prototype_path>/index.html && echo OK
```

- `OK` → 进入 ④ 评审。
- 缺失/为空（builder 谎报 done 或中途耗尽预算）→ **不派 reviewer（避免对空目录空转评审）**，`SendMessage` resume builder 续写（指出缺失文件），或按 builder 返回的 `blockers` 裁决。
- 此校验与 builder 的 Deliverable Hard Gate 互为冗余：即便个别 agent 未守闸门谎报 done，编排层仍在此截断缺陷向下游传导。

## 步骤 ④ 原型评审（子代理）

派发插件 agent `prototype-reviewer`（只读，独立上下文），**传入：`prd_path`、`prototype_path`（及当前轮次 N）**，执行：
- PRD 6 维度（D1-D6，D6 含五状态契约）
- **P0 工艺机械检查（v0.18.0）**：裸 hex / 靛蓝黑名单 / emoji / 填充文案 / scrollIntoView / data-testid / accent 超限——P0 违规 = Critical
- **Craft Quality 4 席 rubric（v0.18.0）**：工艺(×0.4)+品牌(×0.2)+无障碍(×0.2)+文案(×0.2) 加权合成

报告写 response，主代理落盘到 `prd/vN/prototype-auto-review.md`。

判定（v0.18.0 升级）：
- **PASS**：Critical=0 且 Important=0 且 craft 合成 ≥6.0
- **PASS_WITH_WARNINGS**：Critical=0 且（Important>0 或 craft 合成 <6.0），无未清 must-fix
- **FAIL**：Critical>0（含 P0 违规）或有未清 must-fix

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
