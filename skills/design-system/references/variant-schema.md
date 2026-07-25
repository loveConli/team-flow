# Base / Variant 拆分 Schema（variant-schema）

设计系统拆为 **base 品牌共享层** + **端变体层**。base 管「品牌是什么」，变体管「在该端怎么排布」。
变体读 base 取色与品牌，覆写排版/间距/布局/组件/动效。合并后 = 一份完整 token 集（喂给 design-tokens.css）。

```
.team-flow/design-system/
├── base.md      # 品牌共享层（color/brand/voice/anti-patterns/extensions）
├── b-end.md     # B 端变体（typography/spacing/layout/components/motion）
├── c-end.md     # C 端变体（同结构，按 C 端密度/字号覆写）
└── preview.html
```

---

## base.md 段落（品牌共享，端无关）

| 段 | 内容 | Token 归属 |
|----|------|-----------|
| `color` | A1-identity 8 必选（`--bg/--surface/--fg/--muted/--border/--accent/--font-display/--font-body`）+ 5 方向调色板（neutral/primary/success/warning/danger，各 50–900 阶梯） | A1-identity + palette |
| `brand` | logo 规范 + 品牌主色（accent 的品牌语境用法、留白、最小尺寸） | brand |
| `voice` | 文案语气（专业/简洁/温度等级），跨端统一 | voice |
| `anti-patterns` | 禁止内联样式漂移 / 禁止非 token 颜色 / 禁止跨端私改品牌色（**必含前两条**） | anti-patterns |
| `extensions` | C-token 名单制清单：品牌专有 token + 提升路径标注（C→B→A2） | C-extension |

> base 不含排版/间距/布局——这些随端变化，归变体。base 的 A1+A2+B-slot 必须完整可过 guard。

## 变体 .md 段落（b-end.md / c-end.md，端特定）

| 段 | 内容 | Token 归属 |
|----|------|-----------|
| `typography` | font-display/body/mono 引用 + type scale（`--text-xs~4xl`，1.25 比例）+ weights + line-height（按 density） | A1-structure |
| `spacing` | `--space-1~12` 阶梯（基于 density 基准：compact 12 / balanced 16 / spacious 20） | A2-derived |
| `layout` | 栅格 12 列 / 断点 sm/md/lg / 容器 max-width（B 端宽容器、C 端窄容器） | A1-structure |
| `components` | button / input / card / table 规范（**最少这 4 类**），全部 token-bound，引用 B-slot | components |
| `motion` | duration（`--motion-fast/base`，150–300ms）+ `--ease-standard` | A2-derived |

> B 端 vs C 端差异示例：B 端 compact + 14px + 宽表格容器；C 端 spacious + 17px + 窄卡片容器。
> 两端共享 base 的 color/brand/voice，绝不各自重定义品牌色。

---

## 继承规则（Inheritance）

1. 变体**只读** base 的 `color` / `brand` / `voice` / `anti-patterns` / `extensions`——不复制、不覆写品牌色。
2. 变体**覆写** `typography` / `spacing` / `layout` / `components` / `motion`——这是端差异的合法表达。
3. 变体新增 token 必须引用 base 已有 token（如 `--card-bg: var(--surface)`），禁止孤立 token、禁止硬编码 hex。
4. 变体需要的品牌专有 token → 先列入 base 的 `extensions`（C-token 名单制），达晋升条件再升级。

## Token 合并规则（Merge → design-tokens.css）

```
完整 token 集 = base(A1-identity + A1-structure 颜色/字体部分 + A2-derived + B-slot + palette)
              + 变体(A1-structure 排版/布局 + spacing + components + motion)
```

- 渲染某端时：把 base `:root` + 该端变体 `:root` 合并进**单个 `<style>`**（无全局级联）。
- 缺任何一个 A1/A2/B-slot token → 规则悄悄失效 → `design-token-guard.mjs` 失败。
- 同 token 名 base 与变体冲突时：**变体优先**（仅限排版/间距/布局/动效类）；颜色/品牌类冲突 = 错误，guard 报错。
- 迭代（iterate）走 MERGE 不 OVERWRITE：新组件进变体 `components`，新共享色进 base `color`，并记变更履历。
