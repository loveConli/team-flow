---
name: prototype
description: 本地 HTML 原型设计与维护 skill（零外部依赖、可离线）。产品级需求的原型环节由 workflow-orchestrator S2 内部调用（含 PRD 一致性自动评审循环）；直接调用仅限：独立原型迭代、change 完成回写（prototype-sync）、设计系统(design-system.md)创建/维护。当用户需要基于项目设计系统产出/迭代全局 prototype/（多页面+组件+导航的自包含 HTML 原型系统）时使用。不适用于：依赖 GUI 设计软件（Claude Design / Open Design 桌面应用 / Trae）、需要高保真交互动效、非 HTML 原型场景。
---

# Prototype（本地 HTML 原型 skill）

基于 team-flow v0.3 第十五章 + v0.15.0 内部编排重构。全局一份 `prototype/`（与 PRD 同级，git 分支隔离），由本 skill 产出维护，**零外部依赖、可离线**。

## 何时使用
- 新项目初始化：基于 PRD(v1) + 项目 `design-system.md` 生成 `prototype/`（设计系统缺失时先创建设计系统）。
- 需求迭代：PRD 升版（v1→v2）时，在对应 git 分支演进 `prototype/`。
- change 实施：各 change 引用全局 `prototype/` 作 UI 契约（进 `execution-contract.md`）。
- change 完成：UX 增量经 `prototype-sync` 回写全局 `prototype/` + `design-system.md`。

## 内部编排模型（v0.15.0 核心，主代理只编排不实施）

> **硬原则**：本 skill 加载进主上下文后，**主代理只做编排**（环境探查派发、评审组织、循环控制、人工评审、路由决策），**严禁主代理直接 Write/Edit 原型 HTML 或 design-system.md**。所有探查/绘制/设计系统产出经子代理（§18.1 交接协议）。人工评审/路由因需 AskUserQuestion 必须由主代理执行（subagent 不能阻塞提问）。
>
> **后台子代理等待范式（v0.20.0）**：③绘制 / ④评审是长任务（实测 25-50 分钟）。派发后台子代理后**依赖完成通知（`<task-notification>`）再行动**，**禁止反复 `TaskOutput(block=true)` 阻塞轮询**——其对长任务超时返回会倾泻完整子代理 transcript（含 thinking/tool_use/tool_result，单次数万 token），连续轮询会撑爆主上下文。长任务派发后可先处理可并行工作或结束本轮等待通知，**不空转死等**；确需中途观察用 `block=false` 轻量查询（仍返转录，尽量不用）。（设计 §22.2）

```
① 环境探查 + 方案设计   → sub: prototype-env-scout（只读，产出环境简报+2-3 个差异化方向，v0.18.0）
② 方案评审 + 人工评审   → 主代理（方向选定+方案确认 → AskUserQuestion）
③ 原型绘制             → sub: prototype-builder（有 Write，种子优先：template.html+layouts.md 组合，v0.18.0）
④ 原型评审             → sub: prototype-reviewer（只读，PRD 6 维度+P0 grep+craft 4 席 rubric，v0.18.0）
⑤ 循环编排             → 主代理：FAIL→回③修正(≤3轮,收敛检测)；PASS/PASS_WITH_WARNINGS→⑥
⑥ 人工评审路由         → 主代理 AskUserQuestion：
                          - PRD 有问题 → 回 orchestrator S2 修订 PRD（vN 内修订，非升版）→ 再更新原型
                          - 原型需调整 → 回 ③ 派 prototype-builder 实施
                          - 通过 → 冻结
```

详细步骤、子代理派发提示词、收敛检测、设计系统生命周期见 `references/orchestration-flow.md`。

| 步骤 | 载体 | 写文件权 |
|------|------|---------|
| ①环境探查+方案设计 | sub `prototype-env-scout`（插件 agent，只读） | 无（简报+方向写 response） |
| ②方案/人工评审 | 主代理（含方向选定，v0.18.0） | 无 |
| ③绘制 | sub `prototype-builder`（插件 agent，种子优先） | prototype/ 全部 |
| ④评审 | sub `prototype-reviewer`（插件 agent，只读，含 craft rubric） | 无（报告写 response，主代理落盘） |
| ⑤循环编排 | 主代理 | 落盘评审报告 |
| ⑥人工路由 | 主代理 | 无 |

## 内核（零外部依赖）
- 自包含 HTML：CSS 进 `<style>`、JS 进 `<script>`，页面内 `<div id="tweaks">` 控件替代云端工具栏。
- **avoid remote dependencies**：无 CDN、无外部字体/脚本，可完全离线。
- 设计系统渲染：读取项目 `design-system.md`（9 段 schema + 5 方向调色板 + aliases 别名层 + extensions，v0.18.0 token 四层模型），渲染 token 到 `assets/design-tokens.css`。
- **种子模板 + 骨架库（v0.18.0）**：builder 从 `references/template.html`（种子）+ `references/layouts.md`（8 个 B 端 section 骨架 + 类清单契约）组合，不从零写 CSS。
- **工艺规则层（v0.18.0）**：`references/checklist.md`（P0/P1/P2）+ `references/craft/`（anti-ai-slop / state-coverage / typography-hierarchy / accessibility-baseline / laws-of-ux），品牌无关，B 端导向。
- **原型类型方法论（v0.24.0）**：`references/interactive-prototype.md`（交互原型：零依赖状态管理+表单验证+多步导航）+ `references/wireframe.md`（线框图：低保真快速探索+3-5 差异化方案+并排对比），按需加载。

## 产出结构（全局 prototype/）
```
prototype/
├── index.html          # 入口 / 全局导航
├── pages/              # 多页面
├── components/         # 可复用组件（统一设计系统）
├── assets/             # design-tokens.css / design-tokens.js
├── design-system.md    # 本项目设计系统（config 注入，9 段 schema）
└── flow.md             # 页面跳转 / 用户流
```

## 设计系统生命周期（v0.15.0 新增，v0.19.0 独立化）
```
首次创建 → 引用 → 增量更新（变更履历）
```
- **首次创建**：项目无设计系统时，①环境探查发现缺失 → 主代理调用 `/team-flow:design-system` skill（独立入口，用户主导交互创建），产出 `.team-flow/design-system/`（base.md + 变体 + preview.html）。
- **引用**：prototype-builder 绘制时强制读 `.team-flow/design-system/<variant>.md`（+ base.md 合并 token）渲染，禁止内联样式漂移。
- **增量更新**：prototype-sync 回写时若涉及新组件/token/anti-pattern，调用 `/team-flow:design-system`（iterate 模式）合并进 `.team-flow/design-system/` 并记**变更履历**。
- **迁移兼容**：检测旧 `prototype/design-system.md` → 提示迁移到 `.team-flow/design-system/base.md`（一次性）。

## 测试契约（data-testid，可选开启）
- **原则**：`data-testid` 是"测试—组件"契约层，由 spec / `execution-contract.md` 定义；原型 HTML 与实际 UI 代码共用同一命名（详见设计规格第十六章 E2E 集成）。
- **零依赖声明**：纯 HTML 属性，不引入任何 JS/CSS/构建/Playwright 依赖。
- **打标纪律**：场景级 `S-{nn}-{slug}` / 页面级 `P-{xx}-{slug}` 必带；元素级仅关键交互锚点带。
- **可选开启**：由项目 config 驱动（如 `prototype.e2e: true` 时强制）。

## 配置驱动（插件通用 + 项目注入）
- 项目 `team-flow.config.json` 注入（插件层扩展字段）：`prototype.designSystem`（`.team-flow/design-system/<variant>.md` 路径）、`prototype.designSystemBase`（`.team-flow/design-system/base.md`）、`prototype.entry`（默认 `prototype/index.html`）。
- 插件层用 `tf runtime config --get <key>` 自读；插件保持通用，不固化任何公司/产品风格。

## 膨胀防控
- `components/` 必须复用 `design-system.md` 组件，**禁止页面内联样式漂移**。
- 新增组件先沉淀进 `design-system` 再引用。

## 分支约定
- 原型随 **PRD 当前版本分支**维护（如 `prd-v2` 分支的 `prototype/` = v2 产品原型）。
- change 引用其所在 PRD 版本分支的 `prototype/`。

## prototype-sync（change 完成回写，release-archivist 自动触发，v0.24.0 升级）

> **触发机制（v0.24.0）**：prototype-sync 由 `release-archivist` closing 流程**自动触发**（`arch-merge → prototype-sync → compound promotion` 顺序执行），不再是手动 SOP。release-archivist Step 5 Report 中 `Prototype sync` 行是必填维度，未执行时 closing 报告不完整。
>
> **独立调用**：仍可独立调用（如 change 中途需要预同步），但标准路径是 closing 自动触发。

1. 取 change 完成的 UX 增量（来自 `execution-contract.md` / 设计结论）。
2. **派 `prototype-builder`（修正/演进模式）**把增量合并进全局 `prototype/`（pages/components/assets/flow.md）——主代理不直接写原型 HTML。
3. 若涉及设计系统迭代，调用 `/team-flow:design-system`（iterate 模式）合并进 `.team-flow/design-system/` 并记变更履历。
4. 人工确认增量无误。
5. **顺序提交**：`arch-merge` → `prototype-sync`（同一 change closing 内）。

## 脚手架
新建项目：`cp -r references/prototype-scaffold/ <project>/prototype/`，再按 `.team-flow/design-system/` 的设计系统填 token（缺设计系统先用 `/team-flow:design-system` 创建）。

## prototype-builder agent 方法论（v0.28.1 §37，Agent/Skill 职责分离）

`prototype-builder` agent 通过 `skills: [prototype]` 预加载本 SKILL.md。其详细构建方法论（Hard Constraints / Build Process Steps 0-4 / Seed Composition / P0-P2 Quality Self-Check / Structured Handoff / Deliverable Hard Gate / Decision-Point Interaction）已迁移至 `references/builder-methodology.md`，由 agent 在执行中按需 Read。

## 方法论参考与归因

> ⚠️ **命名区分**：本 skill 负向清单中排除的「Open Design 桌面应用」（nexu-io/open-design 出品的 Electron 桌面设计工作台产品）与 `references/craft/anti-ai-slop.md` 借鉴的「nexu-io/open-design 开源设计方法论」**同名不同义**：
> - **被排除的 GUI 工具**：Open Design 桌面应用——agent-native 设计工作台产品，依赖外部运行时，与本 skill「零依赖自包含 HTML」路线互斥。
> - **被借鉴的方法论**：nexu-io/open-design 开源项目（Apache-2.0）——其 `craft/` 规则层（anti-ai-slop / typography / state-coverage / accessibility / laws-of-ux）经 B 端企业场景重写后沉淀进 `references/craft/`。
>
> Token 四层模型（A1-identity / A1-structure / A2-derived / B-slot）亦参考 open-design token-schema，详见 `references/agents/design-system-architect.md`（已迁移至 design-system skill）。
