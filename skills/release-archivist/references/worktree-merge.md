# Worktree 合并规范（v0.43.1）

> 设计依据：设计增强方案 v0.18 §74。来源：workflow-feedback 2026-08-06（20260806-180100-sop-flow）——C2-policy-management 合并时无标准流程，主代理临时设计方案、手动执行、遇到依赖链顺序与冲突无章可循。
> 本文件是 release-archivist Step 5c「Code Landing」的详细规范；SKILL.md 只保留摘要。

## 背景

team-flow 的 change 实施在 worktree 隔离环境（`tf isolate` → `.worktrees/<change>/<repo>`，v0.30.0 RC-D）。change closing 时，代码需要从 worktree feature 分支**落地到主分支**——否则"开发完成 ≠ 交付"。

## 合并模式：merge commit（不 rebase）

| 项 | 决策 | 理由 |
|----|------|------|
| 合并命令 | `git merge --no-edit`（merge commit） | 保留真实合并历史，审计可追溯 |
| rebase | **明确不使用** | rebase 重写历史：多仓库 + 依赖链场景需 force push、冲突需逐 commit 重放、失败难回退。merge commit 冲突只解决一次、可安全回退。强壮性优先于历史线性美观 |
| 工具入口 | `tf deisolate <change-dir> --merge` | 自动识别 Case A/B 布局，逐 repo 合并 |

## 合并前置条件（命令已防护）

`tf deisolate --merge`（v0.43.1 增强）自动执行：

1. **dirty 检查**：worktree 有未提交改动 → 默认阻断（未提交改动不该混入 master），`--force` 跳过。
2. **ahead==0 短路**：分支相对目标分支无新 commit → 跳过合并（幂等，可安全重复调用）。
3. **目标分支**：合并到主仓库当前分支（release-archivist 调用前确保主仓库在 master/main）。

## 多仓库策略（Case A）

多仓库工作区（bff/ui 等独立 git 仓库）中，`tf deisolate` 自动识别 Case A 布局（`.worktrees/<change>/<repo>/`），逐 repo 执行合并。每个独立仓库是一个独立 git 操作，互不依赖。

## 依赖链顺序

合并顺序**不能随意**——后合入者可能覆盖先合入者的共享代码：

1. 读 change DAG（`change_dag` / 依赖关系），确定依赖序。
2. 按依赖序合并：**C1（被依赖者）→ C2 → C3**。
3. 共享代码（如枚举、公共模型）先合入者先落地——先合入者的定义是后合入者的基座。
4. 若依赖 change 尚未合入，当前 change 应选择 **DEFERRED**（暂不合并），待依赖合入后再执行。

## 冲突处理

`tf deisolate --merge` 冲突时：
1. 命令返回非零 exit code + 报告冲突文件清单（`git status --porcelain` 的 unmerged 文件）。
2. 冲突**必须人工介入**解决（命令不自动解决——自动解决可能选错语义）。
3. 解决流程：
   ```bash
   # 在主仓库解决冲突（git merge 已在冲突状态）
   git status            # 查看 unmerged 文件
   # 编辑冲突文件，保留正确语义
   git add <resolved-files>
   git commit            # 完成 merge
   ```
4. 解决后**重新执行主分支编译验证**（编译 + 测试）。

## 合并后验证（硬性）

合并完成后必须验证主分支可构建：

- **Java 项目**：`mvn test`（exit 0 且 Tests run > 0）
- **前端/Node 项目**：`npm run build`（exit 0 且产物非空）
- 其他语言按项目类型对应命令

编译验证失败 → 回退合并（`git reset --hard <merge前>`）或修复后重新合并。

## 与产物同步的关系

- **代码落地**（Step 5c，本文件）管代码：worktree → master。
- **产物归档**（Step 5b 及之前，arch-merge/prototype-sync/test-merge）管文档：change → 全局 docs/。
- 两者独立但都在 closing 完成；代码落地不替代产物归档，反之亦然。
- 团队同步用 `tf publish`（v0.37.0，提交 + push 确认制）。
