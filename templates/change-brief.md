---
upstream_source: orchestrator          # orchestrator | manual | null
upstream_req_id: <req-id>              # 对应 .team-flow/requirements/<req-id>/
upstream_plan_ref: requirement/vN/plan.md      # hotfix/快速通道为 null
upstream_change_id: C2                 # 对应 change_dag.id
plan_hash: sha256:<plan.md 内容摘要>    # 检测产品层改动后变更层未同步
---
# Change Brief: <change-name>

## Scope
<用户故事/功能模块级 scope 描述，与 plan.md 该 change 的 Scope 一致>

## 约束
<来自 plan.md 的全局约束 / 该 change 的已知约束>

## AC 列表
<取自 auditor 报告 Dim1 覆盖矩阵中映射到本 change 的 AC，逐条列出>

## 全局技术方向
<取自 plan.md 高阶技术设计段的要点指针：模块边界/技术选型/数据流方向，供 spec-writer 作 design.md 约束>

## PRD & plan 引用
- PRD: requirement/vN/prd.md §<相关章节>
- Plan: requirement/vN/plan.md ### <C-ID>
