# Layouts（B+C 端 section 骨架库 · v0.18.0, v0.24.0 C 端扩展）

> 把 section 直接落入 `template.html` 的 `<main id="content">`。**不要从零写 section**——
> 选最接近的 layout，整段粘贴，再换文案。所有片段只用下方「class 契约」里列出的类，
> 结构元素一律带 `data-testid`（页面级 `P-{xx}-{slug}` / 场景级 `S-{nn}-{slug}`）。
> 
> **B 端骨架**（§1-8）：管理后台 / 表单 / 仪表盘 / 文档索引。
> **C 端骨架**（§9-14）：营销落地页 / 产品介绍 / 定价页。

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
| C 端扩展 | `hero-xl` `social-proof` `logo-wall` `pricing-card` `faq-item` `faq-toggle` `urgency` `countdown` |

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

## C 端骨架（v0.24.0 新增）

> C 端 section 强调视觉冲击力、情感驱动、转化导向。与 B 端的「信息密度优先」形成对比。

## 9. hero-xl（C 端超大开场）

**use-when**：营销落地页 / 产品首页开场。全屏视觉冲击，一句话价值主张 + 单一强 CTA。

```html
<section class="hero-xl section" data-testid="P-09-hero-xl">
  <div class="container hero-center">
    <p class="eyebrow">产品名 · 一句话定位</p>
    <h1>用动词开头的价值主张，不超过 10 个字</h1>
    <p class="lead">用「你」开头的第二人称描述，点出用户获得的具体收益。</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#">免费开始</a>
      <a class="btn btn-ghost" href="#">观看演示 →</a>
    </div>
  </div>
</section>
```

**纪律**：h1 ≤10 字，动词开头（「提升」「节省」「加速」）；CTA 按钮用动作词（「开始」「试用」），不用名词（「方案」「详情」）；hero-xl 高度 ≥60vh，留白要足。

## 10. marketing-features（收益导向特性）

**use-when**：向 C 端用户展示产品能力。**强调 benefits（用户得到什么），而非 features（产品有什么）。**

```html
<section class="section" data-testid="P-10-marketing-features">
  <div class="container stack">
    <h2>为什么选择我们</h2>
    <div class="grid-2">
      <div class="feature">
        <div class="feature-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <h3>节省 80% 时间</h3>
        <p>把重复工作交给系统，你专注在真正重要的决策上。</p>
      </div>
      <div class="feature">
        <div class="feature-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h3>零学习成本</h3>
        <p>界面直觉化设计，5 分钟上手，无需培训文档。</p>
      </div>
    </div>
  </div>
</section>
```

**纪律**：标题用「你得到什么」（节省/提升/简化），不用「我们有什么」（功能/模块/系统）；数字必须真实（见 anti-ai-slop ⑥）；2 列或 3 列均可，不超过 4 列。

## 11. social-proof（社会证明）

**use-when**：建立信任 / 降低决策焦虑。三种形式：客户 logo 墙 / 用户证言 / 关键数据。

```html
<section class="section" data-testid="P-11-social-proof">
  <div class="container stack">
    <h2>已服务 1,200+ 团队</h2>
    <div class="logo-wall grid-4">
      <div class="ph-img">客户 A</div>
      <div class="ph-img">客户 B</div>
      <div class="ph-img">客户 C</div>
      <div class="ph-img">客户 D</div>
    </div>
    <figure class="quote">
      <div class="quote-mark" aria-hidden="true">&ldquo;</div>
      <p>上线第一周，跨部门对齐时间从 2 天降到 30 分钟。</p>
      <figcaption class="quote-author">—— 某公司运营负责人</figcaption>
    </figure>
  </div>
</section>
```

**纪律**：logo 用灰阶（避免彩色 logo 抢夺视觉焦点）；数据必须真实（见 anti-ai-slop ⑥）；quote 归属用真实职位，不写「某用户」。

## 12. pricing-c（C 端定价卡）

**use-when**：SaaS 定价页 / 套餐对比。3 列卡片，中间列高亮推荐。

```html
<section class="section" data-testid="P-12-pricing">
  <div class="container">
    <h2>选择适合你的方案</h2>
    <div class="grid-3">
      <div class="pricing-card">
        <h3>个人版</h3>
        <div class="stat"><span class="stat-num num">¥29</span><span class="stat-label">/月</span></div>
        <ul>
          <li>1 个项目</li>
          <li>5GB 存储</li>
          <li>邮件支持</li>
        </ul>
        <a class="btn btn-secondary" href="#">选择</a>
      </div>
      <div class="pricing-card">
        <span class="pill">推荐</span>
        <h3>团队版</h3>
        <div class="stat"><span class="stat-num num">¥99</span><span class="stat-label">/月</span></div>
        <ul>
          <li>不限项目</li>
          <li>100GB 存储</li>
          <li>优先支持</li>
        </ul>
        <a class="btn btn-primary" href="#">选择</a>
      </div>
      <div class="pricing-card">
        <h3>企业版</h3>
        <div class="stat"><span class="stat-num num">定制</span><span class="stat-label">联系销售</span></div>
        <ul>
          <li>私有部署</li>
          <li>不限存储</li>
          <li>专属客服</li>
        </ul>
        <a class="btn btn-secondary" href="#">咨询</a>
      </div>
    </div>
  </div>
</section>
```

**纪律**：推荐项用 `pill` + `btn-primary` 双重强调，非推荐项用 `btn-secondary`；价格数字用 `num`（等宽）；特性列表 ≤5 项，用动词开头（「支持」「包含」「提供」）。

## 13. faq（常见问题）

**use-when**：消除购买疑虑 / 减少客服压力。5-8 个问题，覆盖「是什么/怎么用/多少钱/安全吗」。

```html
<section class="section" data-testid="P-13-faq">
  <div class="container stack">
    <h2>常见问题</h2>
    <details class="faq-item">
      <summary class="faq-toggle">可以免费试用吗？</summary>
      <p>可以，所有方案提供 14 天免费试用，无需绑定信用卡。</p>
    </details>
    <details class="faq-item">
      <summary class="faq-toggle">数据安全如何保障？</summary>
      <p>所有数据加密存储，通过 ISO 27001 认证，支持私有部署。</p>
    </details>
    <details class="faq-item">
      <summary class="faq-toggle">可以随时取消订阅吗？</summary>
      <p>可以，按月订阅无合约期，随时可在设置页取消。</p>
    </details>
  </div>
</section>
```

**纪律**：用原生 `<details>/<summary>` 实现折叠（零 JS 依赖）；问题用用户视角（「我可以...」「怎么...」），不用产品视角（「系统支持...」）；答案 ≤3 句，直接给结论。

## 14. cta-c（C 端行动召唤）

**use-when**：页面收口，带紧迫感。强调「现在行动」的收益或「错过」的损失。

```html
<section class="section" data-testid="P-14-cta">
  <div class="container hero-center">
    <h2>今天就开始，14 天免费</h2>
    <p class="lead">无需信用卡，3 分钟完成注册。</p>
    <div class="hero-cta">
      <a class="btn btn-primary" href="#">立即免费试用</a>
    </div>
    <p class="urgency">已有 1,200+ 团队在使用</p>
  </div>
</section>
```

**纪律**：CTA 按钮用动作词 + 收益词（「免费试用」「立即开始」）；urgency 用社会证明（「已有 N 人使用」）或时间限制（「限时优惠」），**不编造倒计时**（见 anti-ai-slop ⑥）；留白要足（上下 `--section-pad`）。

---

## 页面类型节奏表（B 端）

| 页面类型 | section 节奏（自上而下） |
|----------|--------------------------|
| 管理后台列表页 | `hero-center` → `log`/列表（`ds-table`） → `stats` 汇总 |
| 表单页 | `hero-center` → 表单分组（`field`/`input`/`textarea`） → `cta-strip` |
| 仪表盘 | `stats` → `grid-2-1` 图表区 → `log` 最近动态 |
| Landing / 概览 | `hero` → `features` → `stats`/`quote` → `cta-strip` |
| 文档索引 | `hero-center` → `log` 条目列表 → `cta-strip` |

## 页面类型节奏表（C 端，v0.24.0 新增）

| 页面类型 | section 节奏（自上而下） |
|----------|--------------------------|
| SaaS 落地页 | `hero-xl` → `marketing-features` → `social-proof` → `pricing-c` → `faq` → `cta-c` |
| 产品介绍页 | `hero-xl` → `hero-split`（截图展示）→ `marketing-features` → `social-proof` → `cta-c` |
| 定价页 | `hero-center`（简短开场）→ `pricing-c` → `faq` → `cta-c` |
| 活动营销页 | `hero-xl` → `social-proof`（数据+logo）→ `marketing-features` → `cta-c`（带 urgency） |

## 抗疲劳规则（anti-fatigue）

**两个 stats 行连放、两个 features 三联连放——都会造成视觉疲劳。必须交替。**
节奏靠「数据 → 文字 → 列表 → 图」的强弱交替来维持；连续同型 section 是默认错误。

## 起飞前检查清单（pre-flight）

- [ ] 通读 `template.html` 直到 `</style>`，确认要用的类都已在契约里。
- [ ] **先定 section 清单，再写文案**（结构先于文字）。
- [ ] 每屏单一 accent，使用处 ≤2（主按钮 + 一处强调，够了）。
- [ ] 所有结构元素带 `data-testid`；只引用契约内的类，缺类先定义再用。
- [ ] stats 全为真实数字；quote 每页一条；同型 section 不连放。
- [ ] **C 端特有**：hero-xl h1 ≤10 字动词开头；pricing-c 推荐项用 pill+btn-primary 双重强调；faq 用原生 `<details>` 不用 JS；urgency 不编造倒计时。
