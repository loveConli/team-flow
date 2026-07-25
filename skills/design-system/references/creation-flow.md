# 交互创建流程（Creation Flow）

设计系统创建的 6 步详细规程。**用户主导**：LLM 预填推荐值 + 报告选择原因，用户原样确认或调整。
**确定性**：相同的 5 维输入永远派生出相同的 token 体系（rule-based，非随机）。

> Token 四层模型（A1-identity / A1-structure / A2-derived / B-slot）+ C-extension 名单制，
> 与 prototype skill 的 `design-token-guard.mjs` 共享同一完整性约束。

---

## Step 1: 需求收集（5 维封闭词汇）

用 **AskUserQuestion** 一次性收集 5 个维度。每个问题预填 LLM 推荐默认值，并附「为什么推荐这个」。
用户可原样确认，也可改成封闭词汇内的其它值。**封闭词汇外的自由输入 → 追问澄清，不猜测。**

### 维度 1：品牌调性（mood）— 决定调色板方向

| 值 | 含义 | 适配场景 |
|----|------|---------|
| `professional_minimal` | 专业克制 | B 端 SaaS、企业后台、金融/数据平台（**默认**） |
| `warm_approachable` | 温暖亲和 | C 端生活/教育/健康、社区产品 |
| `technical_dense` | 技术密集 | 开发者工具、监控/运维、IDE 类 |
| `editorial` | 编辑排版 | 内容/媒体/阅读类、品牌官网 |
| `brutalist` | 粗野主义 | 实验性/艺术/独立产品、强个性品牌 |

### 维度 2：品牌主色（brand_color）

- 用户给具体 `#RRGGBB` → 直接采用为 `--accent`。
- 用户答「帮我选」/未给 → 按 mood 取映射表的 accent（见 Step 2 表），并记入透明报告。
- 非法 hex（非 6 位、非 hex 字符）→ 追问「你是指 #RRGGBB 格式吗？」。

### 维度 3：展示字体（display_font）— 决定 `--font-display`

| 值 | font-display 栈 | 默认配 mood |
|----|----------------|------------|
| `serif_display` | `'Iowan Old Style', Charter, Georgia, serif` | editorial |
| `sans_display` | `-apple-system, 'Segoe UI', system-ui, sans-serif` | professional_minimal / warm_approachable / brutalist（**全局默认**） |
| `mono_accent` | `'SF Mono', 'JetBrains Mono', ui-monospace, monospace` | technical_dense |

> `--font-body` 恒定 `-apple-system, 'Segoe UI', system-ui, sans-serif`（A1-identity 必选）；
> `--font-mono` 属 A2-derived，按代码场景派生。零外部依赖：只用系统字体栈，不引 webfont。

### 维度 4：信息密度（density）— 决定 spacing/typography 变体

| 值 | 基准间距 `--space-4` | 行高 | 字号基准 | 默认配 |
|----|---------------------|------|---------|--------|
| `compact` | 12px | 1.4 | 14px | technical_dense |
| `balanced` | 16px | 1.5 | 16px | professional_minimal（**全局默认**） |
| `spacious` | 20px | 1.65 | 17px | warm_approachable / editorial |

### 维度 5：目标端（target）— 决定产出几个变体文件

| 值 | 产出 |
|----|------|
| `b_end` | base.md + b-end.md |
| `c_end` | base.md + c-end.md |
| `both` | base.md + b-end.md + c-end.md（**默认**，覆盖最广） |

---

## Step 2: 确定性 Token 派生

### Mood → 调色板映射表（确定性，同 mood 同色）

| mood | accent（品牌主色 `--accent`） | neutral 锚点（ink `--fg` 基调） |
|------|------------------------------|--------------------------------|
| `professional_minimal` | `#3B82F6`（blue） | `#64748B`（slate） |
| `warm_approachable` | `#C96442`（terracotta） | `#D97706`（amber） |
| `technical_dense` | `#0891B2`（cyan） | `#059669`（emerald） |
| `editorial` | `#1A1916`（ink） | `#6B6964`（stone） |
| `brutalist` | `#DC2626`（red） | `#000000`（black） |

- 用户给了 brand_color → 覆盖表中 accent，neutral 锚点仍按 mood 取。
- 派生顺序：**palette first** → A1-identity → A2-derived → B-slot。
- 5 方向调色板（neutral / primary / success / warning / danger）各派生 50–900 阶梯；
  primary 阶梯以 accent 为 500 锚点向两端推。具体公式见 `token-derivation.md`。

### A1-identity（8 必选，缺 = guard 失败）
`--bg` `--surface` `--fg` `--muted` `--border` `--accent` `--font-display` `--font-body`

### A2-derived（color-mix 公式派生，不手写固定 hex）
```
--accent-hover:  color-mix(in oklab, var(--accent), black 8%)
--accent-active: color-mix(in oklab, var(--accent), black 14%)
--focus-ring:    color-mix(in oklab, var(--accent), transparent 70%)
--elev-raised:   color-mix(in oklab, var(--fg), transparent 92%)
```
另含 `--success` `--warn` `--danger` `--font-mono` `--space-1~12` `--radius-sm/md/lg/pill`
`--motion-fast/base` `--ease-standard`。

### B-slot（4 别名，组件引用永远可解析）
`--fg-2 → var(--fg)` / `--meta → var(--muted)` / `--border-soft → var(--border)` / `--surface-warm → var(--surface)`

---

## Step 3-4: 草稿 + 预览
- 按 target 生成 base.md + 变体（schema 见 `variant-schema.md`）。
- 用 `preview-template.html` 填 token 值 → 自包含 `preview.html`（色板/排版/间距/组件/明暗切换）。

## Step 5: 用户评审 + 确认
呈现三件套：① token 摘要表 ② preview.html 路径 ③ **默认值透明报告**。
AskUserQuestion 三选项：**确认落盘 / 调整某项（回到 Step 1 对应维度）/ 重新来（清空重来）**。

## Step 6: 落盘 + guard
两阶段写入由子代理执行（confirmed:false 草案 → 人工确认 → confirmed:true 写正式路径）。
落盘后运行 `node scripts/guard/design-token-guard.mjs`，校验 A1+A2+B-slot 完整性。

---

## 默认解析规则（Default Resolution）

| 触发条件 | 应用的默认 | 理由 |
|---------|-----------|------|
| mood 未给 | `professional_minimal` | 最通用，B 端覆盖面最大，风险最低 |
| brand_color 未给/「帮我选」 | mood 表 accent | 保持调性与色彩一致 |
| display_font 未给 | `sans_display` | 系统栈零依赖，跨端最稳 |
| density 未给 | `balanced` | 16px 基准，适配多数信息场景 |
| target 未给 | `both` | 一次产出双端，避免后续补做 |
| mood 与某维度冲突（如 technical_dense + spacious） | 保留用户显式选择，仅在透明报告标注「非常规组合」 | 用户显式输入优先于推荐 |

**优先级**：用户显式输入 > mood 联动推荐 > 全局默认。冲突时不静默改写，标注后由 Step 5 确认。

---

## 默认值透明报告模板（Transparency Report）

每次创建/迭代都必须随 Step 5 呈现，逐项列出「用了什么默认 + 为什么」：

```markdown
## 默认值透明报告
| 维度 | 最终值 | 来源 | 选择原因 |
|------|--------|------|---------|
| 品牌调性 | professional_minimal | 默认 | 未指定，取最通用 B 端调性 |
| 品牌主色 | #3B82F6 | mood 推荐 | 未给主色，按 professional_minimal 取 blue |
| 展示字体 | sans_display | 默认 | 未指定，系统字体栈零外部依赖 |
| 信息密度 | balanced | 默认 | 未指定，16px 基准适配多数场景 |
| 目标端 | both | 默认 | 未指定，一次覆盖 B/C 双端 |

### 非常规组合提示
- （若有）technical_dense + spacious：保留你的显式选择，已按此派生。

### 假设（Assumptions）
- 无品牌输入，采用调性默认调色板；如需精确品牌色请提供 #RRGGBB。
```

---

## AskUserQuestion 格式示例

预填推荐 + 封闭选项，用户原样确认或改选：

```
Q1 品牌调性？（推荐：professional_minimal — 最通用 B 端调性）
   [ professional_minimal | warm_approachable | technical_dense | editorial | brutalist ]

Q2 品牌主色？（推荐：#3B82F6 — 按 professional_minimal 推荐）
   [ 用推荐 #3B82F6 | 我来填 hex… ]

Q3 展示字体？（推荐：sans_display — 系统栈零依赖）
   [ serif_display | sans_display | mono_accent ]

Q4 信息密度？（推荐：balanced — 16px 基准）
   [ compact | balanced | spacious ]

Q5 目标端？（推荐：both — 一次覆盖双端）
   [ b_end | c_end | both ]
```

**封闭词汇校验**：用户答「极简」→ 追问「你是指 professional_minimal 吗？」；
答「蓝绿色」→ 追问具体 hex，不自行映射。澄清前不进入 Step 2。
