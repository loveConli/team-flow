# 三层索引架构

## 目录结构

```
docs/solutions/
├── INDEX.md                  # L1：轻量索引（≤150行，每条一行摘要+标签）
├── requirement/              # 按阶段分目录
├── plan/
├── prototype/
├── spec/
├── build/
├── review/
└── cross-phase/              # 跨阶段通用经验
```

## INDEX.md 格式

```markdown
# Solutions Index
<!-- 每条一行，按 severity 降序，≤150 行硬上限 -->
| date | phase | domain | type | severity | summary | file |
|------|-------|--------|------|----------|---------|------|
```

## 经验文件格式

每条经验一个文件，frontmatter 包含标签：

```yaml
---
phase: prd          # 阶段标签：prd | plan | prototype | spec | build | review | cross-phase
domain: auth        # 领域标签（与 PRD/change 的领域对应）
type: pitfall       # pitfall | pattern | decision | insight
severity: high      # high | medium | low
date: 2026-07-15
source: change-id   # 来源 change（晋升时保留）
---

## 问题描述
（一句话描述问题或经验）

## 根因/模式
（为什么会出现，或为什么这个模式有效）

## 预防措施/应用方式
（下次如何避免，或如何复用）
```

## 按需加载策略

三层索引设计使最坏情况 token 消耗约 ~6.5k：
1. **L1 INDEX.md**：始终加载（≤150 行，每条约 40 token）
2. **L2 阶段目录**：按 phase 过滤后加载匹配文件列表
3. **L3 经验文件**：仅加载与当前任务相关的具体文件
