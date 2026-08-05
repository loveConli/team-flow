---
name: e2e
description: "从 spec 验收场景生成 Playwright E2E 测试、执行并审计覆盖率（可选 overlay）。用法: /e2e [原型|集成|验收] [spec路径]"
version: 0.1.0
user-invocable: true
---

# E2E 测试（AC 驱动黑盒 + Playwright）

基于 team-flow v0.4 设计修订第十六章（详见 `docs/e2e-integration-design.md`）。从 spec `#### Scenario:` 派生的验收标准生成 Playwright E2E，执行并审计覆盖率。可选 overlay，不进核心 8 态状态机。

## 何时使用
- 需求迭代需要 UI 层可执行验证：原型期验证 spec 可执行性、集成期验证实际代码。
- 用户调用 `/e2e [原型|集成|验收] [spec路径]`。

## 核心约束
- **黑盒视角**：只验证输入→输出行为，不依赖实现/DOM 结构；禁止从代码反推测试。
- **选择器优先级**：`getByRole` > `data-testid` > `id` > `getByLabel` > CSS/XPath（禁用于新测试）。
- **禁止 `waitForTimeout`**（flaky 源），用 web-first 断言。
- **被测体**：原型自包含 HTML（http-server 托管）/ 实际 UI 代码；统一 `e2e/` + `playwright.config` `projects`(baseURL) 切换。
- **Playwright 仅进用户项目，不进插件**（守零依赖）。

## 执行流程（5 步）
1. **确定测试类型**：原型（默认）/ 集成 / 验收 / 未指定则询问。
2. **AC 提取与分类**：从 spec Scenario（+ 可选 `##### Exception/State/Boundary` 子标签；未打标签时用关键字回退 error/invalid/fail/边界）机械提取 HP/EX/ST/BND，生成 AC 矩阵。质量门禁：总测试数 ≥ AC×1.5。
3. **测试脚本生成**：调用 `test-verifier` 角色（`references/test-verifier.md`），prompt 含 AC 矩阵 + 黑盒约束 + 分级门禁 + 命名规范 + `@regression-source`/`@last-sync`。
4. **执行与报告**：跑 Playwright，产出 AC 覆盖率 / 四维覆盖率 / 类型分布 / 未覆盖清单 / 失败根因分类（测试问题 vs 实现问题）。
5. **覆盖率审计**：按分级门槛判定 BLOCKER/WARNING，未达标回退补充。

## AC 分类与公式
- HP（正向）×1；EX（异常）×2（触发+恢复）；ST（状态）×2（合法+非法，去重 EX 覆盖）；BND（边界）×1/边界。
- `Total = HP×1 + EX×2 + ST×2 + BND×1`。

## 门禁分级
| 指标 | 原型期（验证可执行性，静态 mock） | 集成期（实际代码） |
|---|---|---|
| AC 覆盖率 | ≥ 80%（HP 必测） | ≥ 95% |
| 异常 EX | 有则测、无则带说明（不阻断） | ≥ 80% |
| 状态 ST | 有则测、无则带说明（不阻断） | ≥ 90% |
| 边界 BND | 有则测、无则带说明（不阻断） | ≥ 75% |
| 阻断级别 | AC<80% = BLOCKER | AC/EX<门槛 = BLOCKER；ST/BND = WARNING |

门禁随被测体成熟度递增。未含某维度标签 → 标 `N/A` 不阻断（维度条件触发）。

## 产出物
| 产物 | 路径 |
|---|---|
| 测试脚本 | `e2e/`（统一，不放 `prototype/`） |
| AC 矩阵 | `docs/statistics/AC-coverage-matrix.md` |
| 测试报告 | `docs/statistics/YYYY-MM-DD-e2e-report.md` |

## 复用机制
单一 `e2e/` + `playwright.config.ts` `projects`(baseURL)：`prototype` project → http-server 托管 HTML；`integration` project → 真实应用。脚本一致，仅切地址 + 少量选择器/断言适配（高重叠复用，非零触碰；原型绿 ≠ 集成绿）。

**原型期托管（v0.37.0 §68.5）**：`prototype` project 托管的原型 = 对应 PRD 版本 worktree 的 `prototype/`（`<workspace>/.worktrees/prd-vN/prototype/`，版本从 change-brief `upstream_plan_ref` 推导）；baseURL 指向该 worktree 的 http-server，**不指向主干旧版本原型**。该 worktree 缺失时回退 `<workspace>/prototype/` 并提示 `tf prototype branch <prd-vN>` 创建（与 prototype-sync 回退语义一致）。

## 与 release-archivist 衔接
e2e 报告 + 4 级制品比对（L1 存在 / L2 实质 / L3 接线 / L4 数据流）作为 closing 验收 gate 的验证维度，由 `release-archivist` 接入（`ce-proof` 是 Proof 编辑器，与此无关）。
