# 晋升检查规则

## 触发时机

release-archivist 归档时调用：

```bash
ssf solutions promote <change-dir>
```

## 晋升来源

检查 `specs/<cap>/learnings.md` 中的经验。

## 晋升条件

### change → product 晋升

满足以下条件的经验从 change 级别晋升到全局 `docs/solutions/`：

- **severity ≥ medium** 且 **type = pitfall 或 pattern** → 晋升到全局 `docs/solutions/`
- 与全局 INDEX 中已有条目 **domain + type 匹配** → 标记"已确认模式"，severity 升级

### Severity 标准

| Severity | 含义 | 晋升行为 |
|----------|------|----------|
| high | 阻塞性问题或关键模式 | 必须晋升 |
| medium | 有显著影响的问题或可复用模式 | 满足 type 条件时晋升 |
| low | 轻微问题或局部洞察 | 不晋升，保留在 change 级别 |

### 已确认模式

当晋升的经验与全局 INDEX 中已有条目的 domain + type 匹配时：
1. 不创建新文件
2. 在已有条目中标记"已确认模式"
3. severity 升级（low → medium, medium → high）
4. 更新 INDEX.md 中对应行的 severity 字段
