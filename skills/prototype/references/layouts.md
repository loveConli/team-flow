# Layouts（B 端 section 骨架库 · v0.18.0）

> 把 section 直接落入 `template.html` 的 `<main id="content">`。**不要从零写 section**——
> 选最接近的 layout，整段粘贴，再换文案。所有片段只用下方「class 契约」里列出的类，
> 结构元素一律带 `data-testid`（页面级 `P-{xx}-{slug}` / 场景级 `S-{nn}-{slug}`）。
> B 端导向：管理后台 / 表单 / 仪表盘 / 文档索引，而非 C 端营销落地页。

## Class 契约（inventory · 与 template.html 的 `<style>` 一一对应）

| 分组 | 类名 |
|------|------|
| 布局原语 | `section` `container` `stack` `row` `row-between` `rule` `grid-2` `grid-3` `grid-4` `grid-2-1` `grid-1-2` |
| 文字辅助 | `eyebrow` `lead` `num` `meta` |
| Hero | `hero` `hero-center` `hero-split` `hero-cta` |
| 按钮 | `btn` `btn-primary` `btn-secondary` `btn-ghost` |
| 卡片/特性/数据 | `card` `card-flat` `feature` `feature-mark` `stat` `stat-num` `stat-label` |
| 引言 | `quote` `quote-mark` `quote-author` `pull` |
| 徽标 | `pill` `tag` |
| 表单 | `field` `input` `textarea` |
| 表格 | `ds-table` `num-col` |
| 占位/日志 | `ph-img` `log-row` |
| 页面框架 | `topnav` `pagefoot` |

**硬规则**：如果你想用一个不在这张表里的 class，**先在 `<style>` 里把它定义出来**。
绝不允许凭空发明一个没有 CSS 支撑的全局类。宁可定义，不可漂移。

---

## 1. hero（居中）

**use-when**：页面开场，一句话主张 + 两个动作。概览页 / 文档索引页首选。

```html
<section class="hero section" data-testid="P-01-hero">
  <div class="container hero-center">
    <p class="eyebrow">模块名 · 分组</p>
    <h1>一句话主张，不超过 14 个字</h1>
    <p class="lead">一句补充说明，点出对使用者的价值，不堆砌形容词。</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#">主操作</a>
      <a class="btn btn-secondary" href="#">次要操作</a>
    </div>
  </div>
</section>
```

**纪律**：h1 ≤14 字；eyebrow 用作面包屑式分组；CTA 最多两个，主次分明。

## 2. hero-split（左文右图）

**use-when**：需要展示界面截图 / 示意图的开场。左文案，右 16:9 占位图。

```html
<section class="hero section" data-testid="P-02-hero-split">
  <div class="container hero-split">
    <div class="stack">
      <p class="eyebrow">能力分组</p>
      <h1>左栏主张，简短有力</h1>
      <p class="lead">右栏放界面截图或流程示意，文图各占一半。</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#">进入</a>
        <a class="btn btn-ghost" href="#">了解文档</a>
      </div>
    </div>
    <div class="ph-img" data-testid="P-02-shot">界面截图占位 16:9</div>
  </div>
</section>
```

**纪律**：图用 `ph-img`（16:9）占位；不要把营销插画放进 B 端后台。

## 3. features（三联特性）

**use-when**：并列说明 3 项能力 / 字段 / 入口。

```html
<section class="section" data-testid="P-03-features">
  <div class="container grid-3">
    <div class="feature">
      <div class="feature-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
      </div>
      <h3>特性一</h3>
      <p>一句话说明这项能力解决什么。</p>
    </div>
    <div class="feature">
      <div class="feature-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>
      </div>
      <h3>特性二</h3>
      <p>一句话说明这项能力解决什么。</p>
    </div>
    <div class="feature">
      <div class="feature-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
      </div>
      <h3>特性三</h3>
      <p>一句话说明这项能力解决什么。</p>
    </div>
  </div>
</section>
```

**纪律**：图标统一单线 SVG（`stroke-width="1.6"`、`stroke="currentColor"`）。
**不要给每个标题都配图标**——三个一行可以，满屏图标即噪声。

## 4. stats（数据行）

**use-when**：用真实数字建立信任 / 概览。**只用真实数字，不臆造指标。**

```html
<section class="section" data-testid="P-04-stats">
  <div class="container grid-3">
    <div class="stat"><span class="stat-num num">1,284</span><span class="stat-label">本月处理工单</span></div>
    <div class="stat"><span class="stat-num num">99.2%</span><span class="stat-label">SLA 达成率</span></div>
    <div class="stat"><span class="stat-num num">3.4h</span><span class="stat-label">平均响应时长</span></div>
  </div>
</section>
```

**纪律**：数字用 `num`（等宽 tabular-nums）；一行 ≤3 个；**不要编造指标**——没有真实来源就不放 stats。

## 5. quote（引言）

**use-when**：一句用户 / 业务方背书，调节节奏。**一页一条，绝不连放两条。**

```html
<section class="section" data-testid="P-05-quote">
  <div class="container">
    <figure class="quote" style="margin:0">
      <div class="quote-mark" aria-hidden="true">&ldquo;</div>
      <p>这套流程把跨部门对齐从两天压到了半小时。</p>
      <figcaption class="quote-author">—— 某业务负责人</figcaption>
    </figure>
  </div>
</section>
```

**纪律**：每页最多一条；不要 quote 紧跟 quote；用真实归属，不写假名人名言。

## 6. cta-strip（行动召唤条）

**use-when**：页面收口，一个决定性动作。留白要足。

```html
<section class="section" data-testid="P-06-cta">
  <div class="container hero-center">
    <h2>准备好开始了吗</h2>
    <p class="lead">一个决定性诉求，一句话讲清下一步。</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#">立即开始</a>
    </div>
  </div>
</section>
```

**纪律**：只放一个主按钮；上下留白用 `--section-pad`，别挤。

## 7. log（列表 / 变更记录）

**use-when**：变更记录 / 操作流水 / 文档条目列表。日期 + 内容，**边框只在上方，不围一圈。**

```html
<section class="section" data-testid="P-07-log">
  <div class="container stack">
    <h2>变更记录</h2>
    <div>
      <div class="log-row"><span class="num">2026-07-25</span><span class="body">上线工单批量导出。<span class="tag">feature</span></span></div>
      <div class="log-row"><span class="num">2026-07-18</span><span class="body">修复 SLA 统计口径偏差。<span class="tag">fix</span></span></div>
      <div class="log-row"><span class="num">2026-07-10</span><span class="body">新增仪表盘暗色主题。<span class="tag">feature</span></span></div>
    </div>
  </div>
</section>
```

**纪律**：日期用 `num`；状态用 `tag`；行间分隔靠 `log-row` 的 top border，**不要给整列加外框**。

## 8. pricing（对比表）

**use-when**：套餐 / 规格 / 字段对比。细边框、等宽数字、高亮一列。

```html
<section class="section" data-testid="P-08-pricing">
  <div class="container">
    <table class="ds-table">
      <thead>
        <tr><th>规格</th><th class="num-col">席位</th><th class="num-col">存储</th><th>支持</th></tr>
      </thead>
      <tbody>
        <tr><td>团队版 <span class="pill">推荐</span></td><td class="num-col">50</td><td class="num-col">200GB</td><td>工作日</td></tr>
        <tr><td>企业版</td><td class="num-col">不限</td><td class="num-col">2TB</td><td>7×24</td></tr>
      </tbody>
    </table>
  </div>
</section>
```

**纪律**：边框走 hairline（`ds-table` 已定义）；数字列右对齐 + `num-col`；**只高亮一列**（用 `pill` 标注推荐项）。

---

## 页面类型节奏表（B 端）

| 页面类型 | section 节奏（自上而下） |
|----------|--------------------------|
| 管理后台列表页 | `hero-center` → `log`/列表（`ds-table`） → `stats` 汇总 |
| 表单页 | `hero-center` → 表单分组（`field`/`input`/`textarea`） → `cta-strip` |
| 仪表盘 | `stats` → `grid-2-1` 图表区 → `log` 最近动态 |
| Landing / 概览 | `hero` → `features` → `stats`/`quote` → `cta-strip` |
| 文档索引 | `hero-center` → `log` 条目列表 → `cta-strip` |

## 抗疲劳规则（anti-fatigue）

**两个 stats 行连放、两个 features 三联连放——都会造成视觉疲劳。必须交替。**
节奏靠「数据 → 文字 → 列表 → 图」的强弱交替来维持；连续同型 section 是默认错误。

## 起飞前检查清单（pre-flight）

- [ ] 通读 `template.html` 直到 `</style>`，确认要用的类都已在契约里。
- [ ] **先定 section 清单，再写文案**（结构先于文字）。
- [ ] 每屏单一 accent，使用处 ≤2（主按钮 + 一处强调，够了）。
- [ ] 所有结构元素带 `data-testid`；只引用契约内的类，缺类先定义再用。
- [ ] stats 全为真实数字；quote 每页一条；同型 section 不连放。
