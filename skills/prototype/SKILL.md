---
name: prototype
description: 本地 HTML 原型设计与维护 skill（零外部依赖、可离线）。当用户需要基于项目设计系统(design-system.md)产出/迭代全局 prototype/（多页面+组件+导航的自包含 HTML 原型系统），或某 change 完成后回写 UX 增量到全局 prototype/ 时使用。不适用于：依赖 GUI 设计软件(Claude Design/Open Design/Trae)、需要高保真交互动效、非 HTML 原型场景。
---

# Prototype（本地 HTML 原型 skill）

基于 team-flow v0.3 第十五章。全局一份 `prototype/`（与 PRD 同级，git 分支隔离），由本 skill 产出维护，**零外部依赖、可离线**。

## 何时使用
- 新项目初始化：基于 PRD(v1) + 项目 `design-system.md` 生成 `prototype/` 脚手架（复制 `references/prototype-scaffold/`）。
- 需求迭代：PRD 升版（v1→v2）时，在对应 git 分支演进 `prototype/`。
- change 实施：各 change 引用全局 `prototype/` 作 UI 契约（进 `execution-contract.md`）。
- change 完成：UX 增量经 `prototype-sync` 回写全局 `prototype/` + `design-system.md`。

## 内核（零外部依赖）
- 自包含 HTML：CSS 进 `<style>`、JS 进 `<script>`，页面内 `<div id="tweaks">` 控件替代云端工具栏。
- **avoid remote dependencies**：无 CDN、无外部字体/脚本，可完全离线。
- 设计系统渲染：读取项目 `design-system.md`（9 段 schema + 5 方向确定性调色板），渲染 token 到 `assets/design-tokens.css`。

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

## 测试契约（data-testid，可选开启）

- **原则**：`data-testid` 是"测试—组件"契约层，由 spec / `execution-contract.md` 定义；原型 HTML 与实际 UI 代码共用同一命名，使 Playwright 测试脚本高重叠复用（详见设计规格第十六章 E2E 集成）。
- **零依赖声明**：`data-testid` 为纯 HTML 属性，不引入任何 JS/CSS/构建/Playwright 依赖，守 v0.3 零依赖/可离线硬约束。
- **打标纪律**：场景级 `S-{nn}-{slug}` / 页面级 `P-{xx}-{slug}` **必带**；元素级 `data-testid` 仅**关键交互锚点**（提交、主操作、状态切换）带，内部子元素优先 `getByRole`/`getByText`（避免过度打标）。
- **可选开启**：由项目 config 驱动（如 `prototype.e2e: true` 时强制），避免无测试需求项目被迫加 testid。
- **契约治理**：`execution-contract.md` 记录 UI 契约（testid 命名 + 期望行为）；提供 testid checker 比对原型与实际代码两侧 testid 集合，漂移即报警。

## 配置驱动（插件通用 + 项目注入）
- 项目 `spec-superflow.config.json` 注入（**插件层扩展字段，非 spec-superflow 原生**）：
  - `prototype.designSystem`：项目 `design-system.md` 路径
  - `prototype.entry`：原型入口（默认 `prototype/index.html`）
- 插件层用 `ssf runtime config --get <key>` 自读；字段命名避开原生 key 冲突。
- 插件保持通用，不固化任何公司/产品风格。

## 膨胀防控
- `components/` 必须复用 `design-system.md` 组件，**禁止页面内联样式漂移**。
- 新增组件先沉淀进 `design-system` 再引用。

## 分支约定
- 原型随 **PRD 当前版本分支**维护（如 `prd-v2` 分支的 `prototype/` = v2 产品原型）。
- change 引用其所在 PRD 版本分支的 `prototype/`，避免原型领先/落后于未合并代码分支。

## prototype-sync（change 完成回写，SOP）
1. 取 change 完成的 UX 增量（来自 `execution-contract.md` / 设计结论）。
2. 合并进全局 `prototype/`（pages/components/assets/flow.md）。
3. 若涉及设计系统迭代（新组件/token/anti-pattern），合并进 `prototype/design-system.md`。
4. **顺序提交**：`arch-merge` → `prototype-sync`（同一 change closing 内），避免全局文档半更新态。

## 脚手架
新建项目：`cp -r references/prototype-scaffold/ <project>/prototype/`，再按 `design-system.md` 填 token。
