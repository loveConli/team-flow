---
phase: database
domain: db
severity: high
date: 2026-07-31
---

# DB 设计规范

> 本文件由 team-flow 被动式自动沉淀机制维护（v0.11 §33）。
> 请勿手动编辑模板——此文件作为参考模板，实际项目规范在 `.team-flow/conventions/db-design.md` 中维护。

## 表命名
- （项目级规范在此补充，如：表名必须以 `t_` 前缀开头）

## 主键策略
- （项目级规范在此补充，如：主键使用 sequence generator 表生成）

## 审计字段
- （项目级规范在此补充，如：所有表必须包含 BaseEntity 审计字段）

## DDL 管理
- 所有 DDL 必须写入 `schema-baseline.sql`
- 增量变更必须提供 migration 脚本
- SQL 文件放在 `changes/<name>/architecture/sql/` 目录

## 索引规范
- （项目级规范在此补充）

## 字段命名
- （项目级规范在此补充，如：snake_case、禁止使用 SQL 保留字）
