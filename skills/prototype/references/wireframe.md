# 线框图方法论（零依赖适配版）

> **方法论来源**：baoyu-design `built-in-skills/wireframe.md`，经零依赖原则重写。
> 
> **适用场景**：PRD 早期快速探索设计空间，用低保真线框图验证信息架构和流程，避免过早投入高保真细节。

## 核心目标

**Breadth over polish** — 快速生成 3-5 个差异化方案，验证设计方向，而非打磨单一方案的视觉细节。

## 线框图三原则

### 1. 低保真（Low-fi）

- **颜色**：灰阶为主（`#f0f0f0` / `#cccccc` / `#666666`），最多 1 个强调色
- **形状**：矩形 + 圆形 + 线条，无圆角/阴影/渐变
- **文字**：占位符（`[标题]` / `[描述文字]` / `[按钮]`），非真实文案
- **图片**：灰色矩形 + X 线（SVG 内联），无真实图片

```html
<div class="wf-card">
  <div class="wf-image"><!-- 灰色矩形 --></div>
  <div class="wf-title">[标题]</div>
  <div class="wf-desc">[描述文字，2-3 行]</div>
  <button class="wf-btn">[按钮]</button>
</div>
```

### 2. 快速迭代

- **时间盒**：单方案 ≤ 30 分钟，超时 = 过度设计
- **方案数量**：3-5 个，少于 3 = 探索不足，多于 5 = 决策瘫痪
- **变体维度**：布局差异（栅格/列表/卡片）、导航差异（侧边栏/顶栏/tab）、信息密度差异（紧凑/宽松）

### 3. 结构化对比

所有方案并排展示，用 `data-variant` 标记：

```html
<div class="wf-compare">
  <div data-variant="A" class="wf-option">方案 A：侧边栏导航</div>
  <div data-variant="B" class="wf-option">方案 B：顶部 tab 导航</div>
  <div data-variant="C" class="wf-option">方案 C：卡片式导航</div>
</div>
```

## 线框图必含要素

### 1. 页面骨架

用 `section` 标签 + `data-section` 标记区域：

```html
<section data-section="header">[导航栏]</section>
<section data-section="hero">[首屏主内容]</section>
<section data-section="content">[主体内容]</section>
<section data-section="footer">[页脚]</section>
```

### 2. 信息层级

用字号差异（非颜色/装饰）建立层级：

```css
.wf-title { font-size: 24px; font-weight: 700; }
.wf-subtitle { font-size: 16px; font-weight: 400; }
.wf-desc { font-size: 14px; color: #666; }
```

### 3. 交互提示

用虚线框 + 文字标注交互行为：

```html
<button class="wf-btn" data-interaction="点击后弹出确认框">[删除]</button>
```

## 线框图的 craft 约束

- **反 AI slop**：禁止渐变/emoji/图标装饰（见 `craft/anti-ai-slop.md` ②③⑤）
- **排版层级**：仅靠字号/字重建立层级，禁止全大写/全斜体（见 `craft/typography-hierarchy.md`）
- **无障碍基线**：灰阶对比度 ≥ 4.5:1（WCAG AA），确保可读（见 `craft/accessibility-baseline.md`）

## 线框图 vs 静态原型 vs 交互原型

| 维度 | 线框图 | 静态原型 | 交互原型 |
|------|--------|---------|---------|
| 保真度 | 低保真（灰阶+占位符） | 中保真（设计系统+真实文案） | 中高保真（真实交互） |
| 目的 | 探索设计空间 | 验证视觉设计 | 验证交互流程 |
| 方案数量 | 3-5 个 | 1 个 | 1 个 |
| 时间投入 | ≤ 2 小时 | 1-2 天 | 2-3 天 |
| 适用阶段 | PRD 评审前 | PRD 评审后 | 技术评审前 |

## 何时选择线框图

- PRD 早期，信息架构尚未确定
- 需要快速对比多种布局方案
- 团队对设计方向有分歧，需要可视化讨论
- 用户访谈前需要低成本测试物

## 不适用场景

- 信息架构已确定（直接用静态原型）
- 需要验证视觉设计（用静态原型）
- 需要验证交互细节（用交互原型）
- 向非技术 stakeholders 展示（线框图太抽象）

## 从线框图到高保真的路径

```
线框图（3-5 方案）
  → 用户/团队选定 1 个方向
    → 静态原型（应用设计系统+真实文案）
      → 交互原型（添加真实交互逻辑）
```

线框图是**探索工具**，不是交付物。选定方向后应丢弃线框图，进入静态原型阶段。
