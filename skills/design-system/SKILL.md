---
name: design-system
description: >-
  设计系统独立创建与维护 skill。通过用户主导的交互流程（LLM 推荐+用户确认）创建
  项目级 design-system（base 品牌共享层 + B端/C端变体），产出确定性 token 体系 +
  预览画廊。支持独立调用或 prototype skill 内部编排调用。当用户需要创建设计系统、
  迭代设计系统、或原型流程发现设计系统缺失时使用。
  不适用于：原型绘制（用 prototype）、纯架构设计（用 architecture-design）。
---

# Design System（设计系统 skill）

独立创建与维护项目级设计系统。用户主导，LLM 推荐+检查。确定性 token 派生（同输入=同输出）。零外部依赖。

## Use This Skill When
- 用户说「设计一套设计系统」「创建 design system」「设计系统」
- prototype skill 发现设计系统缺失（verdict: needs_design_system）
- 需要迭代现有设计系统（PRD 升版、新增端）

Do NOT invoke for:
- 原型绘制（用 /team-flow:prototype）
- 纯架构设计（用 /team-flow:architecture-design）

## 交互创建流程（6 步）

### Step 1: 需求收集（≤5 个预填推荐问题）
用 AskUserQuestion 收集 5 个维度（预填 LLM 推荐值，用户原样确认或调整）：
1. 品牌调性（封闭词汇：professional_minimal / warm_approachable / technical_dense / editorial / brutalist）
2. 品牌主色（用户给 hex 或"帮我选"→按调性推荐）
3. 展示字体（serif_display / sans_display / mono_accent）
4. 信息密度（compact / balanced / spacious）
5. 目标端（b_end / c_end / both）

**规则**：封闭词汇外的值 → 追问"你是指…？"（不猜测）。每个默认值报告选择原因。详见 `references/creation-flow.md`。

### Step 2: 确定性 Token 派生
按调性→调色板→token 映射表确定性生成：A1-identity（8 必选）+ A2-derived（color-mix 公式）+ B-slot 别名 + 5 方向调色板（50-900 阶梯）。详见 `references/token-derivation.md`。

### Step 3: 草稿生成
按目标端生成：base.md（品牌共享：colors/logo/voice/anti-patterns）+ 变体文件（b-end.md / c-end.md：typography/spacing/layout/components/motion）。详见 `references/variant-schema.md`。

### Step 4: 预览生成
生成 `preview.html`（自包含 HTML 画廊：色板+排版+间距+组件+明暗切换）。用 `references/preview-template.html` 模板填充 token 值。

### Step 5: 用户评审 + 确认
呈现：token 摘要表 + 预览路径 + 默认值透明报告。AskUserQuestion：确认 / 调整 / 重新来。

### Step 6: 落盘 + guard 校验
写入 `.team-flow/design-system/`，运行 `scripts/guard/design-token-guard.mjs` 校验。

## 存储位置
```
.team-flow/design-system/
├── base.md          # 品牌共享层
├── b-end.md         # B 端变体（可选）
├── c-end.md         # C 端变体（可选）
└── preview.html     # token 预览画廊
```

## 迭代模式（iterate）
已有 design-system → 读取 → 合并增量 → 变更履历 → 预览 → 确认 → 写入。

## 迁移兼容
检测旧 `prototype/design-system.md` → 提示迁移到 `.team-flow/design-system/base.md`（一次性）。

## 执行引擎
内部子代理 `references/agents/design-system-architect.md`（唯一写者，两阶段落盘：confirmed:false 草案 → 人工确认 → confirmed:true 写入）。

## 配置
```json
{
  "prototype.designSystem": ".team-flow/design-system/b-end.md",
  "prototype.designSystemBase": ".team-flow/design-system/base.md"
}
```
