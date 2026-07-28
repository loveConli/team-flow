# Architecture Index

> 本文件始终加载，各产物按需 Read。
> Last updated: change=<change-name>, YYYY-MM-DD

## ARCHITECTURE.md
- 限界上下文: <数量>
- 聚合数量: <数量>
- 最后更新: change=<change-name>, YYYY-MM-DD
- 读取建议: 按 BC 段落读取

## PHYSICAL-MODEL.md
- 表数量: <数量>
- 业务域:
  - <域名1>: <表名列表> (N表)
  - <域名2>: <表名列表> (N表)
- 最后更新: change=<change-name>, YYYY-MM-DD
- 读取建议: 按业务域段落读取

## schema-baseline.sql
- 表数量: <数量>
- 最后更新: change=<change-name>, YYYY-MM-DD
- 读取建议: 通常不需加载，DDL 由 sql/ 目录独立管理

## API-INDEX.md
- 端点数量: <数量>
- 分流统计: Command=N / Read=N / Query=N
- 最后更新: change=<change-name>, YYYY-MM-DD
- 读取建议: 按分流区域读取

## CONCEPTS.md
- 术语数量: <数量>
- 最后更新: bootstrap, YYYY-MM-DD
