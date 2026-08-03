// tests/e2e/helpers/prompts.mjs
// team-flow e2e runner（Tier2）：自动决策 system prompt（替代 AskUserQuestion）+ 阶段 prompt 模板。
// 合并自 headless-staged-v0.16.0.sh:24-37（状态恢复段）+ headless-test-v0.16.0.sh:26-36（路由答案+绕过策略）。
// 阶段 prompt 显式 slash 触发 skill，避免新会话靠语义匹配触发的 flaky（评审 #1 5c）。

/** 自动决策 system prompt（注入 --append-system-prompt）。routeAnswers 可注入项目特化答案。 */
export function autoDecidePrompt(routeAnswers = {}) {
  const entry = routeAnswers.entry || '具体功能需求';
  const ownership = routeAnswers.ownership || 'VRM 项目内新模块';
  const scope = routeAnswers.scope || 'P0 全量';
  return `你正在无头自动化测试环境中运行 team-flow 工作流。

关键规则：
1. 当需要调用 AskUserQuestion 时，始终选择标记为「推荐」的选项。如果没有推荐标记，选择第一个选项。不要等待用户输入。
2. 如果需要用户确认（如 PRD 冻结、计划确认、DP-A 架构确认、DP-3 契约批准），视为已确认并继续。
3. 每个阶段完成后，必须更新 .team-flow/ 与 change 的 .team-flow.yaml 状态文件。
4. 侦察模式选择 Quick。首版范围选择「${scope}」。工作流入口选择「${entry}」。项目归属选择「${ownership}」。
5. 敏感信息用 \${PLACEHOLDER} 替换。
6. 如果遇到阻断性问题，记录到 .team-flow/feedback/ 并尝试绕过继续。
7. 每个阶段完成后，简要汇报产出物路径，并在结尾标注 FINAL VERDICT: <DONE|BLOCKED|FAIL>。

状态恢复：
- 先读取 .team-flow/registry.yaml 确认活跃需求
- 再读取 .team-flow/requirements/<req-id>/orchestrator.yaml 确认当前阶段
- 从当前阶段的下一步继续，不要重复已完成的阶段
- 读取 docs/architecture/baseline.md 和 CONCEPTS.md 作为架构上下文`;
}

/**
 * 交互式 e2e 的 system prompt（LT 决策②，取代 autoDecidePrompt 的"视为已确认"hack）。
 * 关键差异：决策门（DP-0/DP-A/DP-3、PRD 冻结、计划确认）按**真实流程停下等待人工**，
 * 不自行假定已确认——e2e 由 simulateHuman 模拟人工决策并 resume 续跑，测真实停→决→续链路。
 * 路由类问题（入口/归属/范围/侦察模式）给默认值以减少无谓停顿轮次。
 */
export function interactiveSystemPrompt(routeAnswers = {}) {
  const entry = routeAnswers.entry || '具体功能需求';
  const ownership = routeAnswers.ownership || 'VRM 项目内新模块';
  const scope = routeAnswers.scope || 'P0 全量';
  return `你正在无头自动化测试环境中运行 team-flow 工作流。

关键规则：
1. 按真实工作流流程推进。**遇到需要人工确认的决策门（DP-0 需求确认、DP-A 架构确认、DP-3 契约批准、PRD 冻结、计划确认等），按真实流程停下来等待人工决策**——清晰汇报当前待决策内容（选项/继承内容/建议），然后结束本轮等待回复。**不要自行假定已确认而跳过。**
2. 路由类选择使用以下默认值（无需停下询问）：侦察模式 Quick、首版范围「${scope}」、工作流入口「${entry}」、项目归属「${ownership}」。若这些以 AskUserQuestion 形式出现，选「推荐」项（无推荐则第一项）。
3. 每个阶段完成后，必须更新 .team-flow/ 与 change 的 .team-flow.yaml 状态文件（含对应 DP 字段落盘）。
4. 敏感信息用 \${PLACEHOLDER} 替换。
5. 如果遇到阻断性问题，记录到 .team-flow/feedback/ 并尝试绕过继续。
6. 阶段真正完成（产物落盘 + 状态推进）后，汇报产出物路径并在结尾标注 FINAL VERDICT: <DONE|BLOCKED|FAIL>。

状态恢复：
- 先读取 .team-flow/registry.yaml 确认活跃需求
- 再读取 .team-flow/requirements/<req-id>/orchestrator.yaml 确认当前阶段
- 从当前阶段的下一步继续，不要重复已完成的阶段
- 读取 docs/architecture/baseline.md 和 CONCEPTS.md 作为架构上下文`;
}

/**
 * 人工模拟器 prompt（LT 决策②：LLM 为主）。让一个轻量 LLM 扮演产品负责人 LT，
 * 读工作流代理的阶段汇报，按测试决策策略给出人工决策回复（用于 resume 续跑）。
 * 强约束：只输出决策文本，不调用任何工具/不做任何文件操作（避免污染被测工作区）。
 */
export function humanSimulatorPrompt(agentReport) {
  return `你正在扮演产品负责人 LT，审阅 team-flow 工作流代理的阶段汇报并做出人工决策。工作流代理已停下来等待你的决定。

你的决策策略（测试约定，必须遵循）：
- 需要二选/多选时：选标记为「推荐」的选项；无推荐则选第一个。
- DP-0 需求确认：确认继承 change-brief 的 Scope/约束/AC 列表，无修正。
- DP-A 架构确认 / DP-3 契约批准：批准，继续。
- PRD 冻结 / 计划确认：确认，继续。
- 范围/侦察：P0 全量、Quick。

约束：
- **只输出你作为 LT 的决策回复文本（1-3 句），让工作流继续推进。**
- **不要调用任何工具，不要读写任何文件，不要执行任何命令。**
- 若代理汇报的是阶段性完成（非待决策），回复"确认，继续下一阶段"。

工作流代理的汇报如下：
---
${agentReport}
---

现在以 LT 的身份给出决策回复：`;
}

// ── 阶段 prompt 模板（显式 slash 触发）──────────────────────────────────────

export function exploreColdstartPrompt(change) {
  return `对 change \`${change}\` 执行 /team-flow:workflow-start。该 change 处于冷启动 exploring 态（仅 change-brief.md，DP-0 未确认）。
任务：运行 need-explorer 澄清意图并完成 DP-0 确认门，将 dp_0_confirmed 写为 true。完成后汇报并标注 FINAL VERDICT。`;
}

export function archGatePrompt(change) {
  return `对 change \`${change}\` 执行 /team-flow:workflow-start。该 change 处于 exploring 态、arch_design_decision 为 null（架构未判定）。
**路由规则：arch_design_decision=null 时 MUST 路由到 architecture-design（routing priority 硬规则）。** 立即执行 architecture-design 四步协议：
1. dispatch team-flow:architecture-design 子代理（记录 agentId）
2. auto-review（decision=required 时）
3. reasonableness check + state write（arch_design_decision + arch_review_verdict）
4. DP-A 用户确认门（确认后写 dp_a_result）
完成后汇报并标注 FINAL VERDICT。**不要路由到 spec-writer / contract-builder / build-executor。**`;
}

export function specifyPrompt(change) {
  return `对 change \`${change}\` 执行 /team-flow:workflow-start。该 change 架构已完成（arch_design_decision≠null）、尚无规划产物。
任务：通过 dispatch team-flow:spec-writer 子代理产出 proposal.md / specs/ / design.md / tasks.md，并推进 exploring→specifying。必须用子代理 dispatch（不要主进程手写）。完成后汇报产出路径并标注 FINAL VERDICT。`;
}

export function contractPrompt(change) {
  return `对 change \`${change}\` 执行 /team-flow:workflow-start。该 change 处于 specifying/bridging 态、规划产物齐备、契约未生成。
任务：通过 dispatch team-flow:contract-builder 子代理生成 execution-contract.md 与 test-matrix.md，完成 DP-3 批准，推进到 approved-for-build。完成后汇报并标注 FINAL VERDICT。`;
}

export function executePrompt(change) {
  return `对 change \`${change}\` 执行 /team-flow:workflow-start。该 change 处于 approved-for-build/executing 态、契约已批。
任务：通过 dispatch team-flow:build-executor 启动实施，先执行 tf isolate 建立 .worktrees/<change>/<repo> 隔离，再按 execution plan 推进首个 wave。完成后汇报 worktree 落点与 execution 状态并标注 FINAL VERDICT。`;
}

export function crossChangePrompt(targetChange, otherChange) {
  return `对 change \`${targetChange}\` 执行 /team-flow:workflow-start。注意：工作区还存在另一个 change \`${otherChange}\`。
任务：推进 \`${targetChange}\` 的当前阶段。严格遵守跨 change 隔离——不得修改 changes/${otherChange}/ 下任何产物；若发现对 ${otherChange} 的依赖，仅在 ${targetChange} 的产物中声明。完成后汇报并标注 FINAL VERDICT。`;
}
