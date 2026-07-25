# 确定性 Token 派生规则（v0.19.0）

> **原则**: 同输入 = 同输出。不即兴发挥。每个 token 值由映射表确定性决定。

---

## A1-identity（8 必选 token）

| Token | Source | Example (professional_minimal) |
|-------|--------|-------------------------------|
| `--bg` | mood→bg mapping | `#FAFAF9` |
| `--surface` | mood→surface | `#FFFFFF` |
| `--fg` | mood→fg | `#1A1916` |
| `--muted` | fg lightened 40% | `#6B6964` |
| `--border` | fg lightened 80% | `#E8E5DF` |
| `--accent` | mood→accent mapping (or user hex) | `#3B82F6` |
| `--font-display` | font preference→stack | `Georgia, serif` (serif_display) |
| `--font-body` | always system sans | `-apple-system, system-ui, sans-serif` |

---

## Mood → 色彩映射表（5 moods × 6 colors = 确定性）

| Mood | bg | surface | fg | muted | border | accent |
|------|-----|---------|-----|-------|--------|--------|
| professional_minimal | #FAFAF9 | #FFFFFF | #1A1916 | #6B6964 | #E8E5DF | #3B82F6 |
| warm_approachable | #FDF8F4 | #FFFFFF | #292524 | #78716C | #E7E5E4 | #C96442 |
| technical_dense | #F8FAFC | #FFFFFF | #0F172A | #64748B | #E2E8F0 | #0891B2 |
| editorial | #FAFAF7 | #FFFFFF | #1A1916 | #6B6964 | #E8E5DF | #1A1916 |
| brutalist | #FFFFFF | #F5F5F5 | #000000 | #525252 | #D4D4D4 | #DC2626 |

---

## A2-derived（color-mix 公式，mood 无关）

```css
/* 交互状态色 */
--accent-hover:  color-mix(in oklab, var(--accent), black 8%);
--accent-active: color-mix(in oklab, var(--accent), black 14%);
--accent-soft:   color-mix(in oklab, var(--accent), transparent 86%);
--focus-ring:    0 0 0 3px color-mix(in oklab, var(--accent), transparent 70%);
--elev-raised:   0 2px 8px color-mix(in oklab, var(--fg), transparent 92%);

/* 语义色（固定） */
--success: #16A34A;
--warn:    #EAB308;
--danger:  #DC2626;

/* 字体 */
--font-mono: ui-monospace, 'JetBrains Mono', monospace;

/* 间距（4px base scale） */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-7: 32px;  --space-8: 40px;  --space-9: 48px;
--space-10: 64px; --space-11: 80px; --space-12: 96px;

/* 圆角 */
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-pill: 9999px;

/* 动效 */
--motion-fast: 150ms;
--motion-base: 200ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
```

---

## B-slot 别名（4 项）

```css
--fg-2:        var(--fg);
--meta:        var(--muted);
--border-soft: var(--border);
--surface-warm: var(--surface);
```

组件始终引用 B-slot 别名 → 永远可解析，与底层 A1 解耦。

---

## 5 方向调色板派生规则

从 accent hex 生成 primary 方向 50–900 阶梯：

| Step | 派生公式 |
|------|---------|
| 50 | color-mix(in oklab, accent, white 95%) |
| 100 | color-mix(in oklab, accent, white 90%) |
| 200 | color-mix(in oklab, accent, white 75%) |
| 300 | color-mix(in oklab, accent, white 55%) |
| 400 | color-mix(in oklab, accent, white 30%) |
| 500 | accent（基准色） |
| 600 | color-mix(in oklab, accent, black 10%) |
| 700 | color-mix(in oklab, accent, black 22%) |
| 800 | color-mix(in oklab, accent, black 35%) |
| 900 | color-mix(in oklab, accent, black 48%) |

- **neutral** 方向：从 fg 同理派生（白/黑混合）。
- **success / warning / danger**：固定语义色（#16A34A / #EAB308 / #DC2626），各派生同结构阶梯。

---

## Density → 间距/排版修正

| Density | base font | space unit | container |
|---------|-----------|------------|-----------|
| compact | 14px | 4px | 1280px |
| balanced | 16px | 4px | 1120px |
| spacious | 18px | 8px | 960px |

density 只影响数值倍率，不影响 token 名称或色彩。
