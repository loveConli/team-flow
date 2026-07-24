# S4 拆分验证与分发（v0.7 重写）

> 原 v0.5「拆分与分发」。v0.7 新增拆分质量审计与并行策略。设计依据：设计增强方案 v0.7 §17.2 / §17.8。

## 编排层 vs 执行层

| 编排层（orchestrator 自己做） | 执行层（委托） |
|------------------------------|---------------|
| 读 plan change 列表 | 拆分质量审计（`change-split-auditor` agent） |
| verdict 路由 | change 脚手架（`ssf change scaffold`，建议新增 CLI） |
| 告知用户 | — |

## 步骤

### 1. 拆分质量审计

调用 `change-split-auditor` agent（插件 agent，提示词>30行 + 需固定 tools 白名单）对 `plan.md` 做拆分质量审计，输出审计报告（覆盖矩阵 / DAG 无环 / 粒度均衡）。质量自检清单：

- **粒度合理性**：太大 → 实施困难；太小 → 管理开销
- **依赖 DAG**：是否有环、关键路径是否过长
- **并行策略建议**：哪些 change 可并行（同 parallel_group）、哪些必须串行
- **验收标准预分配**：从 PRD 功能清单映射到每个 change 的 AC（覆盖矩阵）

### 2. 反馈环路检查点

- 依赖图是否可执行？粒度是否合理？
  - **否** → 回退 S3 调整拆分策略。详见 feedback-loops.md「S4 → S3」
  - **是** → 分发

### 3. 创建 change 脚手架

按 plan 中的 change 拆分方案，为每个 change 创建目录并初始化状态文件：

```bash
mkdir -p changes/<change-name>
npx --yes --package spec-superflow@0.14.0 ssf state init changes/<change-name>
```

> 建议新增 `ssf change scaffold` CLI 一次性完成目录创建 + state init + change_dag 写入（确定性脚本，无需 LLM 判断）。

### 4. 写入 change_dag

把每个 change 的 id / spec_dir / state_file / depends_on / priority / parallel_group / status 写入 `.workflow-orchestrator.yaml` 的 `change_dag`。详见 state-model.md「change_dag 结构」。

### 5. 分发

按依赖顺序建议执行顺序，告知用户各 change 已就绪：

```
Change C1 已就绪，运行 /workflow-start 进入变更级流程。
执行顺序建议：C1 → (C2 ∥ C3) → C4（C2/C3 可并行）
```

## 完成条件

- 所有 change 目录已创建，`.spec-superflow.yaml` 已初始化
- `.workflow-orchestrator.yaml` 的 `change_dag` 已填充
- S4 状态 = completed，已告知用户执行顺序
