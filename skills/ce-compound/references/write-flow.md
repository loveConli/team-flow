# 写入流程

## 记录一条经验的步骤

1. 确定 phase/domain/type/severity 标签
2. 在对应阶段目录下创建经验文件（如 `docs/solutions/prd/2026-07-15-需求歧义.md`）
3. 在 INDEX.md 中追加一行摘要
4. 如果 INDEX.md 超过 150 行，执行淘汰规则

## 淘汰规则（Eviction）

当 INDEX.md 超过 150 行硬上限时：
- 按 severity 降序排列（high > medium > low）
- 保留前 150 条
- 淘汰 low severity 且 date 最早的条目
- 被淘汰的经验文件保留在阶段目录中（可从文件系统找回），仅从 INDEX.md 移除

## CLI 写入命令

各 skill 在阶段转换点通过 CLI 调用（无需交互）：

```bash
ssf solutions capture --phase <p> --domain <d> --type <t> --severity <s> --summary "<text>"
```

## 索引重建

```bash
ssf solutions index-gen    # 重建复利索引
```

## 阶段感知注入

```bash
ssf solutions inject --phase <p> --domain <d>   # 阶段感知注入（top-5）
```
