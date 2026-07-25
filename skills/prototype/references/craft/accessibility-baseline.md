# 无障碍基线（WCAG 2.2 最低 + 工艺超越）

无障碍不是加分项，是底线。B 端产品的使用者能力与场景多样：键盘流操作、读屏软件、低视力、
大龄员工。基线 = WCAG 2.2 AA 最小子集；标注"超越基线"的为工艺追求。

## 颜色与对比度

- **正文文字 ≥4.5:1**；大字（≥24px 或 ≥18.66px 加粗）≥3:1
- **UI 组件与图形 ≥3:1**：边框、图标、焦点指示器、图表色块
- 不以颜色为唯一信息通道：错误状态 = 错误色 + 图标 + 文字三件套
- 超越基线：用 `color-mix()` 派生色调时，逐个派生色校验对比度

## 触控目标

- 所有可交互元素 ≥44×44px（指可点击区域，不是视觉尺寸；小图标用 padding 补足）
- 相邻可点目标间距 ≥8px，防误触

## 焦点可见性

- 所有交互元素有可见焦点指示：3px focus-ring
  （`outline: 3px solid var(--color-focus); outline-offset: 2px`）
- 禁止裸写 `:focus { outline: none }` 而不提供替代样式
- 超越基线：focus-ring 与相邻背景对比 ≥3:1

## 表单标签

- 每个 input 有关联 `<label for="...">`（或包裹式 label）
- **placeholder 不是 label**——输入后即消失，读屏可及性差，无回忆线索
- 必填用 `required` 属性 + 视觉星号双标记；错误信息用 `aria-describedby` 关联到字段

## 键盘可操作性

- 所有交互元素可 Tab 到达，顺序与视觉顺序一致（禁止滥用负 tabindex）
- 仅 hover 触发的功能必须有键盘等价方式（hover 出现的操作按钮须可聚焦触发）
- 自定义弹层/下拉须管理焦点：焦点圈闭于弹层内，关闭后焦点归还触发元素
- 快捷键不与浏览器 / 读屏内置键冲突

## ARIA 纪律

- **原生 HTML 优先**：`<button>` 而非 `<div role="button">`；`<nav>` `<main>` `<table>` 而非 div 堆叠
- 原生语义不足时才用 aria-label，且须有意义："关闭对话框" 而非 "按钮"
- 图标按钮必须有可及名称（`aria-label` 或视觉隐藏文本）
- 动态内容状态化：加载中 `aria-busy`、错误注入 `aria-live`、状态切换管理焦点
  （详见 `state-coverage.md`）

## 减少动态效果

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

保留承载信息的动效（进度、状态转场），去除装饰性动效（漂浮 blob、循环视差）。

## 暗色模式（超越基线）

- 避免纯黑 / 纯白：背景 `#0f0f0f`、前景 `#fafafa`，减轻边缘光晕
- 边框用半透明色（`color-mix(in srgb, var(--color-text) 12%, transparent)`），明暗自适应
- 暗色下阴影减弱，改用明度差 + 边框表达层级
- 图表须备明暗双色板，暗色不直接复用亮色的高饱和色

## 关联参考

- `../checklist.md` — P0.8 data-testid（可测性是无障碍工具链的基础）
- `state-coverage.md` — 状态切换的 ARIA 与焦点管理
- `anti-ai-slop.md` — 装饰元素的取舍（blob/wave 同时是动效与无障碍负担）
