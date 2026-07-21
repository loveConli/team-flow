# 原型设计解决方案调研与最优方案（纯 CLI 插件场景）

> 调研目标（LT 第 13–14 轮指令）：
> 1. 调研 Claude Design / Open Design / Trae 等"设计系统驱动原型"方案；
> 2. 确认"无应用、纯 CLI 插件"是否存在高质量原型方案；
> 3. 回答拷问：spec-superflow 的原型实际有人用吗？效果如何？怎么用？
> 4. 补充约束：原型需**随需求持续迭代**（迭代方案 + 产物维护），且要**衔接实施阶段**（架构/API/开发）。
> 本文件为 v0.3 原型章的方案基础与专家评审材料。

---

## 一、五个方案的事实对比

| 维度 | Claude Design（Anthropic 官方） | Open Design（开源替代） | Trae Work Design 模式 | spec-superflow handoff --type prototype | 本地 HTML 原型内核（self-contained HTML skill） |
|---|---|---|---|---|---|
| 定位 | 对话生成设计/交互原型/幻灯片 | 本地优先的开源 Claude Design 替代 | IDE 内 Design 模式生成/迭代界面 | 验证"某变更设计可行性"的 overlay | 同一套设计纪律在无 GUI 下的平移 |
| 设计系统 | 组织设计系统自动继承；`/design-sync` 从 repo/设计文件导入 | **71 个品牌级 `DESIGN.md`**（9 段 schema：color/typography/spacing/layout/components/motion/voice/brand/anti-patterns），可移植 Markdown | 内置 + 自定义设计系统，可导入主题/组件/图像/规范 | 无设计系统概念，仅草图验证 | 本地 `design-system.md`（借鉴 DESIGN.md 概念，项目 config 注入）+ 页面内 Tweaks 面板 |
| 产物 | 交互原型、standalone HTML、PPTX、PDF，可移交 Claude Code | web-prototype/saas-landing/dashboard/mobile-app 等 19 skill；导出 HTML/PDF/PPTX/ZIP/MD | 画布预览，导出 Figma/PNG/JPG/HTML/ZIP；可"在 Code 模式开发" | `prototype/` 目录 + `HANDOFF_RESULT.md` | 本地自包含 HTML（CSS 进 `<style>`、JS 进 `<script>`）+ 内嵌 Tweaks |
| GUI 依赖 | **强依赖** web/desktop 可视化画布（拖拽、行内评论） | 需本地 daemon + Vite React 前端 + 浏览器 sandbox iframe 预览 | **强依赖** GUI 画布/可视化编辑器 | 纯 CLI（开隔离 worktree） | **零 GUI、可离线**，CLI 写文件即可 |
| 纯 CLI 适配 | 否（仅 MCP 桥接，底层依赖 api.anthropic.com） | 否（需 daemon+前端+浏览器） | 否 | 是，但能力弱（草图） | **是，最契合** |
| 迭代机制 | 对话/画布编辑/行内评论迭代 | 表单锁定 + 沙箱预览 + 评论式手术编辑（路线图中） | 画布编辑 + 批量修改 + 连线跳转 | 一次性 overlay，不回写 | 重新生成 HTML / 调 Tweaks，全局一份 + git 分支隔离版本 |
| 与开发衔接 | 导出/移交 Claude Code | artifact 落盘项目目录 | "Code 模式开发"打包 zip + 默认指令 | 不自动改 design.md/tasks.md（硬约束） | 原型（全局）进 execution-contract.md 作 UI 契约参考 |
| 成熟度/采用 | 2026-04-17 发布，beta，仅 web/desktop | 早期实现（Apache-2.0，GitHub nexu-io/open-design） | 2025-06 上线，字节生态 | 机制存在但非主流 | 设计纪律规范（skill 级） |

**关键事实核实：**
- Claude Design 官方指南明确：入口仅 web/desktop，**无纯 CLI**；唯一非 GUI 通道是 Claude Code + Claude Design MCP server（HTTP），底层仍依赖 api.anthropic.com 的设计能力，GUI 画布交互在终端无法等效替代。
- Open Design FAQ 明确：本地优先，最少需要本地 daemon + 一个 Agent；"不安装 CLI 或桌面端不能用"。其价值在 **DESIGN.md 可移植设计系统概念**（71 个品牌、9 段 schema、5 方向确定性调色板），而非纯 CLI 内核。
- Trae Design 文档显示：强 GUI 画布、可视化编辑器（设计+原型页签建立跳转）、"在 Code 模式中开发"衔接思路可借鉴，但强依赖 IDE。
- 本地 HTML 原型内核（自包含 HTML + Tweaks，公开方法论内化）：产物是本地自包含 HTML，用页面内 `<div>` Tweaks 控件替代云端工具栏，明确"avoid remote dependencies"，**可完全离线**。

---

## 二、针对"无应用、纯 CLI 插件"的结论

| 方案 | 能否内嵌进我们的统一插件 | 判断 |
|---|---|---|
| Claude Design | 否 | 强 GUI + 云端依赖，只能做外部 MCP 桥接，不可离线 |
| Open Design | 间接（借鉴概念） | 需 daemon+前端+浏览器，非纯 CLI；但 **DESIGN.md 设计系统概念值得整体借鉴** |
| Trae Design | 否 | 强 GUI IDE 依赖 |
| spec-superflow handoff | 部分（机制可用但弱） | 纯 CLI 但仅草图验证，无设计系统、无闭环、非主流 |
| **本地 HTML 原型内核（self-contained HTML skill）** | **是（最优内核，零外部依赖）** | 不安装任何外部设计软件，纯 CLI 产出本地 HTML，契合"一次安装一个插件" |

**结论：我们"无应用、纯 CLI 插件"的高质量原型方案 = 本地 HTML 原型内核（self-contained HTML skill，零外部软件依赖）+ 借鉴 Open Design 的 DESIGN.md 可移植设计系统概念（仅借鉴思想，不安装任何外部软件）。**

不内嵌任何 GUI 工具的渲染层，只把它们的"设计系统驱动风格"思想落成本地 `design-system.md`，原型内核自研为一个 skill（写合规 HTML 文件）。

> **零外部依赖声明**：本方案**不安装、不调用任何外部设计软件**（Claude Design / Open Design / Trae 均不安装）。"本地 HTML 原型内核"与"DESIGN.md 概念"只是借鉴其公开的"AI 生成自包含 HTML 原型"方法论与"用 Markdown 定义设计系统"的思想，全部内化为我们插件内部的**通用 skill**。

### 2.1 配置驱动：插件通用 + 项目注入（回应 LT 第 15 轮修正）

**原则：插件只提供通用机制与默认骨架，项目独特资产由项目级配置注入，不固化在插件内。**

spec-superflow 已有项目级配置机制，可直接扩展：
- `.spec-superflow.yaml`：per-change 状态/决策缓存（dp_0_decisions、workflow、state 等 12 字段）。
- `spec-superflow.config.json`：项目级配置，**config-aware**（CHANGELOG 证实支持 `artifacts.order` / `artifacts.skip`，由 `ssf runtime config --get <key>` 读取）。我们在此基础上扩展 `prd` / `prototype` 段（以及未来可扩展 `api` / `architecture` 模板段）。

**插件层（一次安装，通用，不含任何公司风格）：**
- `skills/prototype-builder/SKILL.md`：通用原型构建规则（产出自包含 HTML 原型系统、多页面、组件化、Tweaks）。
- `skills/prd-writer/`（或复用 ce-plan）：通用 PRD 结构 schema。
- `templates/prd.default.md`、`templates/design-system.base.md`：默认骨架（可被项目覆盖）。

**项目层（每项目一份 `spec-superflow.config.json` + 自定义模板/设计系统文件，放在项目目录如 `.ourflow/`）：**
```json
{
  "artifacts": { "order": ["proposal","specs","design","tasks"], "skip": [] },
  "prd": { "template": ".ourflow/prd.acme.md" },
  "prototype": {
    "designSystem": ".ourflow/design-system.acme.md",
    "outDir": "prototype"
  }
}
```
- `prd.template`：项目独特 PRD 结构与模板（不同公司/项目结构不同）。
- `prototype.designSystem`：项目独特设计系统（颜色/字体/组件/品牌，9 段 schema）。
- `prototype.outDir`：全局原型目录（**全局层，与 PRD 同级**，非 change 子目录）。

**运行逻辑**：prototype-builder / prd-writer 启动时读 `ssf runtime config --get prd.template` 与 `prototype.designSystem`；若配置缺失，回退到插件内置默认骨架。项目资产始终留在项目目录，**插件保持通用、可跨公司复用，设计风格零硬编码**。

---

## 三、spec-superflow 原型的真实使用情况（回答拷问）

**机制确实存在（源码核实）：**
- `ssf handoff create <dir> --type prototype`（`sdd-overlay.mjs` 中 `HANDOFF_TYPES = ['prototype','research','experiment']`）。
- 触发：workflow-start 在检测到 UX/规格不确定性时建议。
- 行为：`ssf isolate <change-dir> prototype-<handoff-id>` 开隔离 worktree，结果落 `HANDOFF_RESULT.md` + `prototype/` 目录。

**但实际使用情况（公开资料核实）：**
- GitHub Star ≈ 449（v0.9.0，npm.io 数据），社区实战案例集中在主流程：add-dark-mode、RBAC 权限、bug 修复等。
- **无任何一篇实战文章/社区讨论演示 `handoff --type prototype` 的使用案例或效果反馈**（腾讯云完整指南 v0.9.0 实战章节未提及；juejin/头条/segmentfault 等文章全在主流程）。
- 官方定位：它是验证"某变更设计可行性"的 **overlay**，不是 PRD 之后的循环环节。
- **硬约束：handoff 结果不自动改 design.md/tasks.md**（overlay 规则，INSTALL.md）。

**效果与怎么用：**
- 效果：机制可用但**非主流、缺实战背书、无 PRD 闭环、无"原型随需求迭代"原生概念**。
- 怎么用：仅在 workflow-start 检测到 UX/规格不确定性时触发，做一次性可行性草图，结果由人工判读后决定是否回流 PRD/design；不自动回写。

**对 LT 第 12 轮拷问的修正结论：** 原型机制"有"，但既非主流用法、也无闭环、更无迭代模型——所以你第 12 轮说的"缺失原型设计及原型→完善 PRD 循环"完全成立，且需进一步补"迭代/维护/衔接"。

> **Note（第 16 轮修正）**：spec-superflow 自带的 `handoff --type prototype` 是 **per-change overlay**（开隔离 worktree，落 change 内 `prototype/`），与我们定义的"**全局原型、与 PRD 同级**"定位不同。我们的原型能力**不复用**该 overlay 作为主机制，而是自建全局 `prototype/` 目录（见 §4）。spec-superflow 的 handoff 仅作可选的可行性草图旁路。

---

## 四、原型迭代方案 + 产物维护 + 与实施阶段衔接（回答补充）

### 4.0 产物层级模型（全局层 vs 变更层，回应 LT 第 16 轮）

必须先厘清 PRD / 原型 / 代码 / change 的层级关系，否则原型归属会错（此前误把原型放 change 维度）。

**全局层（产品级，与 PRD 同级）：**
- `prd/`：PRD，**有版本迭代** v1→v2→v3…，每个版本是完整需求基线。
- `prototype/`：原型，**全局一份**，与 PRD 同级；随 PRD 版本演进，物理一份，git 分支隔离版本。
- `design-system.md`：全局一份，config 注入。
- `architecture.md`：全局架构，复利回写目标。
- `api.md`：全局 API，复利回写目标。
- `src/`：代码，全局一份，git 分支隔离。

**变更层（spec-superflow change，从 PRD 拆解）：**
- `changes/<id>/`：proposal.md / specs/ / design.md / tasks.md / execution-contract.md。
- 每个 change 走 spec-superflow 8 状态机。
- **一份 PRD（某版本）可拆出多个 change**；change 是实施工作单位，不是产品基线。

**关系链：**
```
PRD(vN) ──拆解──┬─▶ change-1 ─▶ spec-superflow（exploring→…→closing）
                ├─▶ change-2 ─▶ spec-superflow
                └─▶ change-3 ─▶ spec-superflow
全局 prototype/ ──（UI 契约参考）──▶ 各 change 的 build-executor
各 change 完成 ──（增量合并）──▶ 全局 architecture.md / api.md / prototype / src
```
**核心纠正（此前错误）：原型不是 per-change 的 overlay，而是全局一份、与 PRD 同级；版本演进靠 git 分支，不靠 change 内 v1/v2 目录。**

### 4.1 原型迭代模型（全局一份，随 PRD 版本演进）

- 原型是**全局产物**（与 PRD 同级），**物理一份**，不是某个 change 的子目录。
- **版本演进靠 git 分支**：PRD 升版（v1→v2）时，原型在对应分支上演进到该版本形态（如 `prd-v2` 分支上的 `prototype/` = v2 产品原型）；一份代码/原型，git 隔离版本。
- **PRD 有版本，原型/代码无多份**：PRD 持续迭代产生 v1/v2/v3 需求基线；原型与代码各自只有"当前形态一份"，历史版本由 git 分支/标签保留。
- **change 引用全局原型**：每个 change 实施时，把全局 `prototype/` 作为 UI 契约参考（进 execution-contract.md）；change 不直接拥有原型文件。
- change 完成 → 其 UX 增量合并回全局 `prototype/` 与 `architecture.md`/`api.md`（compound 复利回写）。

### 4.2 产物维护（完整原型系统，全局一份）

原型目录位于**全局层**（与 PRD 同级），是完整原型系统，不是单页、不是 change 子目录：

```
prototype/                      # 全局，一份，git 分支隔离版本
├── index.html                  # 入口 / 全局导航
├── pages/                      # 多页面（首页 / 列表 / 详情 / 设置 …）
├── components/                 # 可复用组件（按钮 / 表单 / 卡片 …），统一设计系统
├── assets/                     # 共享 style.js / design-tokens.css
├── design-system.md            # 本项目设计系统（config 注入，9 段 schema）
└── flow.md                     # 页面跳转 / 用户流说明
```
- 版本管理：**git 分支 / 标签**隔离 PRD 版本（非 change 内 v1/v2 目录）。
- 复利回写：change 完成 → 原型结论 + 设计系统迭代回写**全局** `design-system.md` / `architecture.md` / `api.md`；design-system 是项目资产（config 注入），回写发生在项目内。
- 全局 `design-system.md` 作本项目风格唯一真相源，随 PRD 版本演进复利，防漂移。

### 4.3 与实施阶段衔接（闭环，两层）

```
PRD(vN) ──拆解──┬─▶ change-1 ─┐
                ├─▶ change-2 ─┼─▶ spec-superflow: spec-writer → contract-builder → build-executor
                └─▶ change-3 ─┘         （各 change 引用全局 prototype/ 作 UI 契约）
                                              │
        全局 prototype/ ◀── 增量合并 ────────┘（change 完成回写 UX / 架构 / API）
        compound 复利回写: design-system.md / architecture.md / api.md
```
- 原型（全局）→ 架构：原型确认的 UX 流向全局 `architecture.md` 限界上下文映射（DDD）。
- 原型 → API：原型交互 → 端点设计 → 流入 `execution-contract.md` + build-executor。
- 原型 → 开发：全局原型作 UI 契约参考进 `execution-contract.md`，build-executor 按契约 + TDD 实现。
- 闭环：PRD 版本演进 → 拆 change → spec-superflow 实施 → 增量回写全局原型/架构/API；原型随 PRD 持续迭代不腐烂。

---

## 五、最优解决方案（总结提案）

对"我们这种无应用、纯 CLI 插件"，最优原型方案：

1. **原型内核 = 本地 HTML 原型 skill（配置驱动）**：自包含 HTML 原型系统（多页面 + 组件 + 导航）+ 内嵌 Tweaks + 项目级设计系统板；PRD 模板与设计系统由 `spec-superflow.config.json` 注入，插件保持通用；零外部软件依赖、可离线、纯 CLI 产出。不安装/不调用任何 GUI 设计产品（Claude Design / Open Design / Trae 均不安装）。
2. **设计系统 = 借鉴 Open Design 的 DESIGN.md 概念**：由项目 `spec-superflow.config.json` 注入的 `design-system.md`（9 段 schema + 5 方向确定性调色板，项目资产），作为原型渲染 token 源与项目级复利真相源；原型 skill 读取它渲染，保证风格与品牌一致，插件不固化任何公司风格。
3. **整合进 spec-superflow change-centric 模型（两层）**：原型**全局一份**、随 PRD 版本 git 分支演进、change 引用全局原型作 UI 契约；change 完成增量回写项目级 `design-system.md`/`architecture.md`/`api.md`，并最终进 `execution-contract.md` 驱动开发。
4. **不内嵌 Claude Design / Trae / Open Design 的 GUI**，只借鉴其"设计系统驱动风格"思想，内核自研为 skill。

**与 v0.2/v0.3 的关系：**
- 此前 v0.3 仅计划"补原型↔PRD 闭环"（见 v0.2 摘要第 9 节）。
- 本轮补充使 v0.3 原型章必须扩展为：**产物层级模型（全局 vs 变更）+ 配置驱动（插件通用+项目注入）+ 本地 HTML 原型 skill + 完整原型目录维护（全局一份、多页面/组件/导航、git 分支隔离版本）+ 回流 PRD + 衔接架构/API/开发 + 复利回写项目级设计系统**。
- 这同时回应了 LT 第 12 轮两问（I/O 钉死 + 原型闭环）、第 13–14 轮（设计系统方案调研 + 迭代/维护/衔接）、第 15 轮（配置驱动 + 完整原型）与第 16 轮（全局层 vs 变更层）。

---

## 六、引用来源
- Claude Design 官方指南（support.claude.com，2026-04-17 beta）
- Open Design GitHub（nexu-io/open-design）+ FAQ（open-design.ai）
- Trae Work Design 模式文档（docs.trae.cn）
- spec-superflow 完整使用指南（腾讯云，v0.9.0）+ 源码 `sdd-overlay.mjs` / `workflow-start` SKILL.md / INSTALL.md
- 本地 HTML 原型内核规范（lobehub skill，公开方法论内化）
- spec-superflow npm.io 数据（449 Stars, v0.9.0, Deps 0）

---

## 七、待 LT 决策（已更新）
1. 原型内核选型（本地 HTML 原型 skill，零外部依赖）——**已认可方向**。
2. 配置驱动原则（插件通用 + 项目 `spec-superflow.config.json` 注入 PRD 模板/设计系统）——**已认可方向**。
3. **产物层级模型（本轮确认 ✓）**：全局层（PRD 有版本、原型/代码/设计系统各一份、git 分支隔离）+ 变更层（一份 PRD 拆多 change，change = spec-superflow 单位）；原型全局、与 PRD 同级。LT 第 16 轮已确认"符合"。
4. 是否同意将本方案并入 v0.3 原型章（含：层级模型 + 配置驱动 + 完整原型目录维护 + 迭代/衔接/复利回写）？
5. 是否授权：起草 v0.3（含原型章）→ 安排专家评审 → 你决策 → 再建统一插件？
