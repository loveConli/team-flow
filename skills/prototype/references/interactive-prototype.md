# 交互原型方法论（零依赖适配版）

> **方法论来源**：baoyu-design `built-in-skills/interactive-prototype.md`，经零依赖原则重写。
> 
> **适用场景**：需要验证真实交互流程的原型（表单验证、多步导航、动态反馈），区别于静态页面展示。

## 核心目标

让原型**像真实可运行的应用**，而非静态 mockup。用户能在浏览器中点击、输入、看到反馈，验证交互逻辑的合理性。

## 零依赖交互三件套

| 技术 | 用途 | 示例 |
|------|------|------|
| **原生 JS** | 状态管理、事件绑定、表单验证 | `addEventListener('click', ...)` / `document.querySelector()` |
| **CSS transitions** | 状态变化动画（hover/active/focus） | `transition: background-color 150ms ease` |
| **CSS :checked/:focus-within** | 纯 CSS 交互（无需 JS） | tab 切换、折叠面板、checkbox 联动 |

## 交互原型必含要素

### 1. 真实状态管理

用 JS 变量管理应用状态，用 `data-*` 属性标记 DOM 状态：

```html
<button data-state="idle" onclick="handleSubmit()">提交</button>
<script>
function handleSubmit() {
  const btn = document.querySelector('[data-state="idle"]');
  btn.dataset.state = 'loading';
  btn.textContent = '提交中...';
  // 模拟异步
  setTimeout(() => {
    btn.dataset.state = 'success';
    btn.textContent = '已提交';
  }, 1000);
}
</script>
```

**反模式**：用 alert/confirm/prompt 替代真实 UI 反馈。

### 2. 表单验证

- 实时校验：`input` 事件触发即时反馈
- 失焦校验：`blur` 事件触发字段级校验
- 提交校验：`submit` 事件触发全表单校验

```html
<input type="email" data-validate="email" onblur="validateField(this)">
<span class="error-msg" data-error-for="email" hidden>请输入有效邮箱</span>
```

**反模式**：仅在提交时一次性校验所有字段，无实时反馈。

### 3. 多步导航流程

用 `data-step` 属性标记步骤，JS 控制步骤切换：

```html
<div data-step="1" class="step">步骤 1 内容</div>
<div data-step="2" class="step" hidden>步骤 2 内容</div>
<button onclick="nextStep()">下一步</button>
```

**反模式**：每个步骤一个独立 HTML 文件（割裂流程体验）。

### 4. 动态列表/表格

用 JS 数组管理数据，动态渲染 DOM：

```javascript
const items = [{ id: 1, name: '项目 A' }, { id: 2, name: '项目 B' }];
function renderList() {
  const tbody = document.querySelector('tbody');
  tbody.innerHTML = items.map(item => 
    `<tr><td>${item.id}</td><td>${item.name}</td></tr>`
  ).join('');
}
```

**反模式**：硬编码 10 行相同数据（无法验证增删改查）。

## 交互原型的 craft 约束

- **状态覆盖**：每个交互元素必须覆盖 Loading / Empty / Error / Populated / Edge 五态（见 `craft/state-coverage.md`）
- **无障碍基线**：键盘可达（Tab/Enter/Esc）、焦点可见、`prefers-reduced-motion` 尊重（见 `craft/accessibility-baseline.md`）
- **反 AI slop**：不用 modal 弹窗替代页内反馈、不用 loading spinner 超过 3 秒（用进度条或骨架屏）

## 与静态原型的区别

| 维度 | 静态原型 | 交互原型 |
|------|---------|---------|
| 页面数量 | 多页面展示 | 单页面多状态 |
| JS 复杂度 | 仅导航 | 状态管理 + 事件绑定 |
| 验证目标 | 视觉设计、信息架构 | 交互流程、用户体验 |
| 适用阶段 | PRD 评审 | 技术评审、用户测试 |

## 何时选择交互原型

- PRD 含复杂表单流程（注册/下单/审批）
- 需要验证多步骤导航逻辑
- 需要用户测试真实交互反馈
- 技术方案依赖交互细节（状态机、并发控制）

## 不适用场景

- 纯展示型页面（landing page / about us）
- 信息架构尚未确定（先用静态原型）
- 高保真动效需求（用专业工具 Figma/After Effects）
