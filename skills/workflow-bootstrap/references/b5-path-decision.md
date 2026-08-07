# B5 路径决策详细流程（v0.42.0：降级路径设计）

> 主代理在 B5 询问用户时展示分组选项，并按用户选择执行 A/B/C 或进入第二组流程。

## 分组展示模板

询问用户时，按以下模板展示（**两组分开展示**）：

```
第一组：确保 bootstrap 产物可信
  A 逆向重建完整架构
  B 交叉验证与对齐 bootstrap 产物
  C 真实性核对
第二组：直接进入 team-flow 流程
  D 我有一个具体的功能需求
  E 我有一个模糊的产品方向
  F 仅建立基线，暂不开发
```

**多选**：第一组可多选（如 A + B），第二组单选。第一组优先——用户选第二组前，主代理应提示"bootstrap 产物未经交叉验证，直接进入流程可能有偏差"（advisory，不阻断）。

## A 逆向重建：复杂度分级推荐

**判据来源**（复用 B1 侦察结果，无需新采集）：
- 模块数：codebase-recon-analyst modules 维度的模块计数
- 源文件数：recon-probe JSON `loc.total_files`

**分级推荐**：

| 条件 | 推荐措辞 |
|------|---------|
| ≥5 模块 或 ≥10 源文件（复杂） | "建议优先重建完整架构——项目有实质架构，基线快照不足以支撑后续设计" |
| <5 模块 且 <10 源文件（简单） | "项目较简单，可直接进入流程，逆向重建为可选项" |

**去向**：A → workflow-orchestrator ARCH 阶段 reconstruction 模式（arch-reverse-analyst，`references/agents/arch-reverse-analyst.md`）→ architecture-reviewer product 视角评审（≤3 轮循环）→ PASS 后 `tf arch init --mode reconstruction --baseline-ref requirement/vN/` 打戳。

## B 交叉验证与对齐：主代理机械比对

> B1 刚结束主代理手里材料最全（recon-probe JSON + 各维度摘要 + baseline.md），交叉验证是机械比对，**主代理直接执行，不派发子代理**（LT 决策 v0.42.0）。

**比对原则**：确定性数据（脚本机械采集）为锚，语义结论（子代理 LLM 推断）为被检对象。只标记冲突，不重跑侦察。

**比对清单**：

| # | 比对项 | 确定性证据（脚本字段） | 语义结论（子代理维度） |
|---|--------|----------------------|----------------------|
| 1 | 技术栈 | `dependencies.manifests` | technology |
| 2 | 模块边界 | `directory_tree.dirs` | modules |
| 3 | 数据模型 | `ddl_extraction.tables` | data-model |
| 4 | API 表面 | `directory_tree.dirs` 按 controller/router/route/api 目录名过滤（best-effort） | api-surface |
| 5 | 测试现状 | `tests.test_file_count` | test-docs |
| 6 | Git 结构 | `git_structure` | git-structure |
| 7 | 文档声明 | `docs.doc_files` | baseline.md 中引用的文档 |

**维度覆盖说明**：
- **architecture 维度不纳入机械比对**（显式排除）：架构模式（DDD/MVC/微服务/单体）是纯语义判定，无确定性锚点。其验证交由 A 重建时的 arch-reverse-analyst 深化 + architecture-reviewer 审查，B 阶段不机械比对。
- **API 表面无独立确定性扫描字段**（recon-probe.sh 无 controller/router 采集），第 4 项降级为 best-effort 语义比对——从 `directory_tree.dirs` 过滤 controller/router/route/api 目录名作锚，若目录树无明显 API 目录则标注"无锚点，跳过该项"。

**疑点判定**：确定性证据存在但语义结论未反映 → 疑点（如依赖清单有 spring-boot 但技术栈未提）；语义结论声称但确定性证据缺失 → 疑点（如测试覆盖声称 60% 但 test_file_count=0）。

**输出**：`docs/architecture/cross-check-report.md`

```markdown
# Bootstrap Cross-Check Report

> 由 workflow-bootstrap B5-B 主代理机械比对生成（v0.42.0）。确定性数据为锚，语义结论为被检对象。

## 疑点清单

| # | 比对项 | 确定性证据 | 语义结论 | 冲突描述 | 建议动作 |
|---|--------|-----------|---------|---------|---------|
| 1 | 技术栈 | ... | ... | ... | ... |

## 结论

cross-check: <PASS | N/A（未选 B）| deferred（疑点留档）>
```

不阻断（advisory）。`cross-check: deferred` 时提示用户可后续补核对。

## C 真实性核对：用户确认门

**触发**：用户选 C，或选 B 后主代理提示"是否进入 C 真实性核对？"。

**两种模式**：
- **C 跟随 B（推荐）**：针对 cross-check-report.md 疑点清单，主代理用 AskUserQuestion 逐条（或按比对项分组）确认：
- **C 独立（未选 B）**：无 cross-check-report.md 可核对，主代理对 baseline.md 的全部语义结论做真实性抽查（每维度挑 1-2 个代表性结论），用户逐条确认"属实 / 修正 / 忽略"。

**确认流程**（两模式共用）：

| 用户选择 | 动作 |
|---------|------|
| 确认（属实） | 修正 baseline.md 对应内容，provenance 标注 `user-confirmed` |
| 忽略 | 保留疑点，标记 `deferred`，不阻断 |
| 补充说明 | 按用户描述修正，provenance 标注 `user-confirmed` |

**核对完成**：更新 baseline.md 顶部校验状态 `cross-check: PASS`（无剩余疑点）或 `deferred`（有忽略项）。

## 与其他选项关系

- A（重建）与 B（交叉验证）可组合：先 B 校验基线可信，再 A 重建——重建消费的是校验后的基线，降低重建偏差
- D/E/F 为原 A/B/C 平移，语义不变，仅位置后移
