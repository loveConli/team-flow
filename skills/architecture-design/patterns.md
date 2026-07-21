# Patterns · 技术与模式

## P1 · 活动对象矩阵（实体发现）
横轴 L5 活动、纵轴业务对象；符号 ●主 ◐从 ○关联 △新。出现任何符号=实体；重叠>70% 合并。→ 产出实体清单供聚合设计。

## P2 · 聚合识别（四要素落位）
对每个实体：定聚合根(唯一入口)、拆值对象、画事务边界(一事务内完成的操作集)。硬规则：仅业务服务有聚合；数据/技术服务无。

## P3 · Context Map 映射选型
- 两团队共享模型 → **Shared Kernel**
- 下游需隔离上游概念泄漏 → **Anti-Corruption Layer**
- 上游供多下游标准消费 → **Open Host Service**

## P4 · CQRS 读写模型划分
事务型对象→写模型(聚合)；分析型对象→读模型(查询模型)。Command/Read→写模型；Query 经阻断测试分流到业务/数据服务。读模型派生自写模型。

## P5 · 增量设计 + 复利回写（工作流衔接）
每变更：As-Is 冻结复制(版本锚点 change_id+章节+commit) → To-Be(DDD) → 全局 ARCHITECTURE.md(当前态覆盖+演进日志追加)。one change per run。回写前跑架构一致性检查（结构+语义+跨域）。

## P6 · 架构 frontmatter（脚本可校验）
每变更 architecture.md/database.md 头部：
```
cap_id / date / change_type(new|modify) /
bounded_contexts / aggregates_affected / cqrs(write/read_model)
```
用正则提取 key 做 advisory 校验，不引第三方 YAML 依赖（保全 spec-superflow 零依赖）。

## P7 · API 指令映射（每变更 api.md）
对每个端点标 Command/Read/Query；Query 标注阻断测试归属(业务/数据服务)。下游脚本扫所有 api.md 生成 API-INDEX.md。

## P8 · 全局锚点暴露（Discoverability）
在 AGENTS.md 追加一节：存在 docs/architecture/；其结构(Context Map/聚合/DB)；何时检索(每变更设计前)。使代理自动 grounding。
