# ch06 · 与 spec-superflow / compound-engineering 的集成

本章把 F1–F7 落到两个工作流：spec-superflow（开发过程，change-centric）+ compound-engineering（全局产物+复利）。融合四方专家会审的硬伤修正。

## 产物布局
```
项目根/
├── STRATEGY.md              # 产品/BA 锚点（compound，不动）
├── CONCEPTS.md              # 领域词汇（追加 DDD 术语，复利累积）
├── docs/architecture/       # 【技术锚点层，独立于 STRATEGY.md】
│   ├── ARCHITECTURE.md      # 全局架构（瘦锚点：Context Map+聚合清单+关键决策）
│   └── DATABASE.md          # 全局 DB（实体+读写模型+OLTP/OLAP）
├── specs/<cap>/
│   ├── architecture.md      # 每变更 DDD 增量
│   ├── database.md          # 每变更 DB 增量
│   └── api.md               # 每变更 API 设计（全局不另设）
```

## 每变更增量设计（SOP 步骤）
1. (LLM) 读全局 ARCHITECTURE.md 作 grounding；用活动对象矩阵识别限界上下文/聚合。
2. (LLM) 出 To-Be：新增/调整聚合、Context Map 关系、CQRS 读写模型、4A 跨域对齐。
3. **As-Is 冻结**（核心修正）：复制全局相关章节**当前原文** + 记版本锚点（`ARCHITECTURE.md@<change_id>#<章节>`），变更内不可变——杜绝活引用漂移。
4. (脚本) 填 frontmatter 并校验：`cap_id/date/change_type/bounded_contexts/aggregates_affected/cqrs`。
5. (LLM) 写 ADR 理由；API 标 Command/Read/Query + 阻断测试归属。
6. (脚本) 回写全局 + 生成 API 索引。

## 复利回写（借鉴 ce-compound，已正名）
- **one change per run**：一次回写一个变更 delta，可追溯、不混杂。
- 全局 ARCHITECTURE.md 维护双视图：`## 当前态`（覆盖式，每 BC/聚合仅留最新有效定义）+ `## 演进日志`（append-only，含 change_id+来源）。
- **架构一致性/漂移检查**（独立于 Discoverability）：①结构冲突（重复 BC/聚合 key）②语义冲突（同义异名，如客户vs用户）③跨域一致性门禁（AA≥1 IA 实体，反之亦然）。
- **Discoverability 正名**：在 AGENTS.md/CLAUDE.md 暴露 `docs/architecture/`，使代理设计前"发现并查阅"（存在/结构/何时检索）——这是 compound 原义，勿与内容冲突检查混淆。
- 下游检索复用：下一 change 设计前从 `docs/architecture/` 检索相关上下文/聚合（grounding 用 CONCEPTS.md）。

## 集成纪律（来自 spec-superflow 源码事实）
- **design.md 不可变**：原型覆盖层 never mutate design.md/tasks.md。原型结论走 `handoff --type prototype` → 新 requirement delta → 正常 `specifying→closing→spec-merger` 闭环，不得直接改 design.md。
- **guard 软集成**：三份增量文档为推荐产出、非阻断；全局回写经独立 `arch-compound` skill/overlay，不进状态机硬矩阵；frontmatter 校验仅 advisory 脚本（正则提取 key，不引第三方 YAML 依赖），保全零依赖。
- **术语正名**：IA/AA 非"技术架构"（仅 TA 是）；4A 是四域非三层；技术架构对 STRATEGY.md 是"补位 compound 缺位"而非"修正其错误"，且 ARCHITECTURE.md 是 anchor 而非评审巨著。

## 第二大脑整合（ima「LT的知识库」）
- 方法层(kb)：存 4A/DDD 方法 skill + 每限界上下文一个 `architecture-anchor`（frontmatter 索引）。
- 项目层(repo)：`docs/architecture/` 为权威源；设计前检索 kb skill + 读全局 ARCHITECTURE.md；回写后**批量**同步 Context Map 索引入 kb，避免每 delta 双写。
- API 留债：脚本化 `API-INDEX.md`（扫描所有 `specs/*/api.md` 抽取端点/方法/错误码/幂等），反对手写全局 API 文档。
