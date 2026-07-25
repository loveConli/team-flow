# 原型质量检查清单（P0/P1/P2，v0.18.0）

Builder 提交前逐项自检。P0 = 必过（grep 可机械验证）；P1 = 应过；P2 = 加分。

> 用法：交付前按 P0 → P1 → P2 顺序逐项过。任一 P0 不过 = 返工，无例外。
> `[grep]` 标记项可用命令机械校验；其余为目视/手动校验。

## P0 — 必过（10 项）

- [ ] **1. `:root` 外无裸 hex** `[grep]`
  - 所有颜色在 `:root{}` 定义为 CSS 变量，组件代码只允许 `var(--xxx)`
  - 验证：`grep -nE '#[0-9a-fA-F]{3,8}' *.html *.css`，`:root{}` 块外命中 = 0
  - 例外：`transparent`、`currentColor`、SVG 内联 stroke 引用不受限
- [ ] **2. 标题必用 `var(--font-display)`** `[grep]`
  - h1/h2 的 font-family 为 `var(--font-display)`；不含 sans-serif / Inter / Roboto / Arial
  - 验证：检查 `<style>` 内 h1/h2 声明；标题字体 = display 字体
- [ ] **3. accent 每屏 ≤2 处使用**
  - 清点 eyebrow + 主 CTA + 其余着色元素；≥3 = 降级一处（改中性色或描边样式）
  - accent 为"动作"服务，不为"装饰"服务
- [ ] **4. 无靛蓝/紫渐变** `[grep]`
  - 黑名单 hex：`#6366f1` `#4f46e5` `#4338ca` `#3730a3` `#8b5cf6` `#7c3aed` `#a855f7`
  - 无 purple/violet 命名的 linear-gradient
  - 验证：`grep -nE '#(6366f1|4f46e5|4338ca|3730a3|8b5cf6|7c3aed|a855f7)' *.html *.css` = 0；
    `grep -niE 'gradient.*(purple|violet|indigo)'` = 0
- [ ] **5. 无 emoji 作图标** `[grep]`
  - h1-h6 / button / li 内无 ✨🚀🎯⚡🔥💡 等表情
  - 验证：`grep -nE '[✨🚀🎯⚡🔥💡]' *.html` 在标题/按钮/列表区域 = 0
  - 图标一律用内联 SVG（`stroke="currentColor"`）
- [ ] **6. 无编造指标**
  - "10× faster"、"99.9% uptime"、"节省 80% 时间" 无出处 = 删除或改为定性描述
  - 数字必须来自 PRD / 实测 / 可引用研究，否则不写数字
- [ ] **7. 无填充文案** `[grep]`
  - 验证：`grep -nE 'lorem ipsum|功能[一二三]|placeholder|示例文本|xxx|TODO' *.html` = 0
  - 所有文案必须是贴合产品语境的真实感文案（行业术语、真实角色名、合理数量级）
- [ ] **8. 每个顶层 `<section>` 有 `data-testid`** `[grep]`
  - 格式：`data-testid="页面-区块用途"`，如 `data-testid="dashboard-kpi-overview"`
  - 验证：每个 HTML 中 `<section` 数量 = 带 `data-testid` 的 section 数量
- [ ] **9. 移动端回流**
  - grid 在 ≤920px 折为单列，无横向滚动
  - 禁止用 `overflow-x: hidden` 掩盖问题，必须真正回流
  - 验证：浏览器收窄至 375px 逐页检查
- [ ] **10. 无 `scrollIntoView()`** `[grep]`
  - 用 `window.scrollTo({ top, behavior: 'smooth' })` 替代
  - 原因：scrollIntoView 触发整页跳转，与固定导航高度偏移不兼容
  - 验证：`grep -n 'scrollIntoView' *.html *.js` = 0

## P1 — 应过（8 项）

- [ ] **1. 一个决断性亮点** — 至多 1 个：拉引语 / 真实数据 / 产品截图 / 一个微动画。多个亮点 = 没有亮点。
- [ ] **2. section 节奏交替** — 无连续同类型区块（文字+文字、卡片网格+卡片网格不得相邻）。
- [ ] **3. 标题 ≤14 词** — 超长标题拆为副标题或分句。
- [ ] **4. lead ≤56ch / 两句话** — 段落引导 `max-width:60ch`，最多两句。
- [ ] **5. CTA 说明动作** — "开始免费试用" > "了解更多"；动词体现点击后的结果。
- [ ] **6. hover 态存在** — 所有 `a` 与 `.btn` 有 `:hover`（颜色/背景/位移任一）。
- [ ] **7. 数字用 mono** — `.num` 类统一 `font-family: var(--font-mono)`；范围：价格、统计值、版本号、日期。
- [ ] **8. 每页一种图片风格** — 插画与摄影不混用；必须混用时统一滤镜或蒙版。

## P2 — 加分（4 项）

- [ ] **1. `text-wrap: pretty` / `balance`** — 正文 pretty、标题 balance，避免孤字悬行。
- [ ] **2. `color-mix()` 派生色调** — 从基色派生 hover/active/tint，减少手写 hex 数量。
- [ ] **3. 毛玻璃导航** — `backdrop-filter: blur(12px)` + 半透明背景，导航与内容有层级感。
- [ ] **4. 系统字体优先** — 零依赖要求：`system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`。

## Anti-slop 两秒直觉检查

> 把页面截图，两秒后问自己：**外人能认出这是哪个产品吗？**
>
> - 能认出 = 有灵魂，通过。
> - 看起来像"又一个 AI 后台" = 模板货，回去做两件事：
>   1. 把一个特写换成**只有这个产品才有的东西**（真实产品截图 / 具体业务示例 / 实际输出样本）
>   2. 去掉一个 accent 使用点
>
> 完整灵魂测试与七大罪见 `craft/anti-ai-slop.md`。

## 关联参考

- `craft/anti-ai-slop.md` — 七大罪 + 80/20 灵魂法则
- `craft/state-coverage.md` — 五状态覆盖契约（Loading/Empty/Error/Populated/Edge）
- `craft/typography-hierarchy.md` — 排版层级
- `craft/accessibility-baseline.md` — 无障碍基线
- `craft/laws-of-ux.md` — 构图法则
