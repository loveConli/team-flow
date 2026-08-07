# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 本文件由 team-flow `workflow-bootstrap` B4.5 阶段生成（参考 Claude Code /init）。
> 维护原则：索引级 + 结构级，简明扼要——删除某条后 Claude 是否会犯错？不会就删掉。

## 项目概况

{{PROJECT_SUMMARY}}
<!-- 语言 / 框架 / 构建工具 / 数据库，2-3 行。来源：B1 technology 维度 -->

## 开发命令

{{DEV_COMMANDS}}
<!-- 构建/测试/lint 命令，只列非标准的（如 mvn 单测、特殊 env）。来源：B1 侦察 + README -->

## 工作区结构

{{WORKSPACE_TREE}}
<!-- 简化目录树（≤3 层），只标注关键目录用途。来源：B1 directory_tree -->

## Git 仓库结构

{{GIT_STRUCTURE}}
<!-- 子仓库清单 + 类型(nested/submodule) + 用途 + 提交/推送顺序约束。来源：B1 git-structure 维度 -->

## 产物结构（team-flow）

team-flow 工作流在 `changes/<name>/` 下通过状态机驱动变更，核心制品如下：

### 代码强制执行的制品（state-loader.mjs + hash.mjs 校验）

| 产物 | 路径 | 校验机制 |
|------|------|---------|
| 状态文件 | `changes/<name>/.team-flow.yaml` | state-loader 硬编码 `STATE_FILE` |
| 提案 | `changes/<name>/proposal.md` | hash.mjs → `artifacts_hash` |
| 规格 | `changes/<name>/specs/*.md` | hash.mjs → `artifacts_hash` |
| 设计 | `changes/<name>/design.md` | hash.mjs → `artifacts_hash` |
| 任务 | `changes/<name>/tasks.md` | hash.mjs → `artifacts_hash` |
| 执行契约 | `changes/<name>/execution-contract.md` | hash.mjs → `contract_hash` |

### 设计层面约定的制品（SKILL.md 文档引用，无代码强制校验）

| 产物 | 路径 | 状态 |
|------|------|------|
| 产品级 PRD | `requirement/vN/prd.md` | ce-brainstorm 引用 |
| 产品级计划 | `requirement/vN/plan.md` | ce-plan 引用 |
| 变更简报 | `changes/<name>/change-brief.md` | orchestrator S4 产出，hash 显式排除 |
| 架构设计 | `changes/<name>/architecture/{architecture,database,api}.md` | hash 纳入 artifacts_hash |
| 需求注册表 | `.team-flow/registry.yaml` | workflow-orchestrator 引用 |
| 全局架构基线 | `docs/architecture/baseline.md` | workflow-bootstrap 引用 |
| 项目架构基线标记 | `.team-flow/arch-state.json` | `tf arch init` 打戳 |

> 架构文档详细内容见 `@docs/architecture/baseline.md`（全局基线）和 `@docs/architecture/`（ARCHITECTURE.md / DATABASE.md / API-INDEX.md / INDEX.md）。

## Git 管理规则

{{GIT_MANAGEMENT_RULES}}
<!-- 提交/推送顺序约束 + 子仓库操作规则。来源：B1 git-structure 维度 + 项目约定 -->
