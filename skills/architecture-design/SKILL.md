---
name: architecture-design
description: 基于 4A 企业架构 + DDD 领域驱动设计的架构/API/DB 设计 skill。当用户需要做架构设计、识别聚合与限界上下文、划分写/读模型(CQRS)、设计 API 指令映射，或在 spec-superflow / compound-engineering 工作流中做每变更架构增量设计与全局复利回写时使用。不适用于：纯业务逻辑编码、与架构无关的需求分析、非 DDD 语境的数据库建模。
---

# Architecture Design (4A + DDD)

把企业架构(4A)与领域驱动设计(DDD)的 crystallized 方法，转化为每变更可执行的架构/API/DB 设计动作，并与 spec-superflow(开发过程) + compound-engineering(全局复利) 衔接。

## Core Frameworks

### F1 · 4A 分叉依赖
`BA → (IA ∥ AA) → TA`。BA 先行且未稳前不并行；IA 与 AA 同步并行、双向对齐；二者共同汇聚 TA。定义不可逆（先选技术再补流程是反模式）。

### F2 · 跨域一致性（双对齐，质量门禁）
每个 AA 功能 ≥1 个 IA 数据实体支撑；每个 IA 实体 ≥1 个 AA 功能消费（多对多，无孤立节点）。检查两类缺一不可：结构一致（"有没有"）+ 语义一致（"对不对"，命名统一，用户/客户/consumer 不能并存）。

### F3 · 变更分叉级联（三层次必覆盖）
直接依赖（BA→AA/IA 同变）→ 间接依赖（AA/IA→TA、IA↔AA 对齐调整）→ 隐式依赖（表面无关却牵动，最危险）。无架构管理=上线才暴露(10×成本)。

### F4 · DDD 聚合四要素
实体(唯一标识)+值对象(无标识)+聚合根(唯一入口)+事务边界(聚合内一事务)。聚合仅存于业务服务；数据服务/技术服务无聚合。

### F5 · 限界上下文(Context Map)
语义边界=L3 应用服务；同术语异义须显式映射(Shared Kernel / Anti-Corruption Layer / Open Host Service)。

### F6 · CQRS 写读模型
事务型对象→写模型(聚合，Command/Read 操作)；分析型对象→读模型(查询模型，Query 派生，无事务)。Command/Read→写模型；Query 经阻断测试分流。

### F7 · 三维判定（验证工具）
失忆测试(清空业务记忆还能工作?→TA) → 阻断测试(阻断1h下游能继续?不能→业务服务/能→数据服务) → 孤岛测试(谁调用? 私有/领域共通/企业共通)。

### F8 · 增量设计 + 复利回写闭环（工作流衔接）
每变更：As-Is 冻结复制+版本锚点(change_id+章节+commit)→ To-Be(DDD)+ 全局 ARCHITECTURE.md 锚点。复利回写：one change per run，append 当前态+演进日志，Discoverability 在 AGENTS.md 暴露 docs/architecture/，下游检索复用。API 仅每变更内设计；技术架构(IA/AA/TA)与产品策略(BA/STRATEGY.md)分离对齐。

## Chapter Index
- ch01-4a-domains — 4A 四域定义与分叉依赖
- ch02-change-cascade — 变更级联与跨域一致性门禁
- ch03-architecture-outputs — 架构产出三层 + 治理三支柱
- ch04-entity-to-aggregate — 业务实体→聚合→限界上下文
- ch05-cqrs — 写/读模型、指令分流、三维判定
- ch06-integration — 与 spec-superflow / compound-engineering 的集成

## Topic Index
- 4A / BA / IA / AA / TA → ch01
- 分叉依赖 / 跨域一致性 → ch01, ch02
- 变更级联(直接/间接/隐式) → ch02
- 架构产出三层(元素/制品/交付件) → ch03
- 治理三支柱 → ch03
- 业务实体 / 活动对象矩阵 → ch04
- 聚合 / 聚合根 / 值对象 / 事务边界 → ch04
- 限界上下文 / Context Map → ch04
- 写模型 / 读模型 / CQRS → ch05
- Command / Read / Query → ch05
- 阻断测试 / 三维判定 → ch05
- 增量设计 / As-Is 冻结 / 复利回写 / 全局锚点 → ch06

## Scope & Limits
本 skill 覆盖 4A+DDD 架构设计方法及其与 spec-superflow/compound-engineering 的衔接。落地实现结合项目具体工具；超出本范围见相关 skill 或直接问 agent。
