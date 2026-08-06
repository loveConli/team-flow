# Phase 3.5 — Prototype Inner Loop（原型内循环）

> **v0.7 条件化**：当 `mode: orchestrated` 时，跳过整个 Phase 3.5（原型循环由 orchestrator 编排）。以下为 standalone 模式的流程。

PRD 文档写入后、Handoff 之前，执行原型内循环。原型是 PRD 的**验证工具**，不是 PRD 的下游。

## 3.5.1 原型触发判断

检查 PRD 草稿中是否包含 UI/画面/交互相关功能点（§4 画面原型、§7 系统功能清单中的 UI 功能）。

- **包含 UI 功能点** → 使用平台阻塞问题工具询问用户："PRD 包含 UI 功能点，是否需要产出原型进行验证？"
- **不包含 UI 功能点** → 跳过原型内循环，直接进入 Phase 4
- **用户选择跳过** → 跳过，PRD 直接冻结

## 3.5.2 原型产出

如果需要原型：
1. 读取 PRD 草稿中的功能点清单（§7 系统功能清单）
2. 读取项目 `design-system.md`（通过 `tf runtime config --get prototype.designSystem` 获取路径）
3. 调用 `/prototype` skill 产出原型页面
4. 产出 `prototype/` 目录（index.html + pages/ + components/ + flow.md）

## 3.5.3 原型审查（对照 PRD）

逐功能点检查：
- PRD 中每个 UI 功能点是否在原型中有对应页面/组件？
- PRD 中的状态流转是否在原型 flow.md 中完整体现？
- PRD 中的边界条件是否在原型中有体现（空状态/错误状态/加载状态）？

产出审查报告：覆盖/遗漏/矛盾清单。

## 3.5.4 修正循环

如果审查发现问题：
- **遗漏** → 回到 Phase 1.3 对话，补充 PRD 功能点 → 更新原型 → 回 3.5.3
- **矛盾** → 回到 Phase 1.3 对话，解决矛盾 → 更新原型 → 回 3.5.3
- **最多循环 3 次**，超过则标记为"需人工介入"，在 PRD 中记录未解决项
- 每次修正触发复利捕获：`tf solutions capture --phase prd --domain <domain> --type pitfall --severity medium --summary "<修正原因>"`

## 3.5.5 PRD 完整性评审（冻结前门禁）

原型审查通过后、冻结前，派发 `prd-completeness-reviewer` 子代理（独立上下文），评审 PRD「是否完整到能支撑后续 plan/spec 实施」（区别于 Phase 2.6 claim verifier——后者管"说得对不对"，本评审管"说得全不全"）。

- 派发：按名派发插件 agent `prd-completeness-reviewer`（定义见插件 `agents/prd-completeness-reviewer.md`），传入 PRD 路径 + CONCEPTS.md 路径。
- agent 直接写审查报告到 `prd/{ITERATION_VERSION}/prd-completeness-review.md`。
- 判定（柔性）：PASS / PASS_WITH_WARNINGS → 进入冻结；**FAIL（Critical>0）→ 回 Phase 1.3 补充**后重审。
- 5 维度：用户故事完整性(Critical)/验收标准(Critical)/边界与非功能(Important)/术语一致性(Minor)/范围闭环(Important)。

## 3.5.6 冻结

完整性评审通过后：
1. 写入 `prd/{ITERATION_VERSION}/prototype-review.md`（审查结论 + 版本 + 日期 + 循环次数）
2. PRD 标记为 frozen（在 PRD frontmatter 中增加 `frozen: true` + `frozen_date: YYYY-MM-DD`），并在正文标题下插入冻结声明（措辞见 `references/prd-mapping.md`「冻结声明」节）
3. **冻结语义为 `frozen_downstream`（非升版）**：后续阶段（ce-plan、spec-writer）**不可直接回改** PRD；如 plan 或实施暴露 scope 问题，经 **S3→S2 回退在 vN 内修订**并记录「决策与变更履历」（不升版）。**仅当启动新迭代 vN+1 或用户显式绝对冻结（`frozen: absolute`）时才需升版。**
4. 同步更新正文 §1.1 文档状态为「已冻结-下游」（与 frontmatter `frozen: true` 一致）
