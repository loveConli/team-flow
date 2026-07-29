# team-flow

> 当前版本：`v0.26.1`

> 统一插件：**team-flow**（spec 驱动开发）+ **compound-engineering 核心子集**（全局复利）+ **architecture-design**（4A+DDD 增量设计）+ **prototype**（本地 HTML 原型）+ **e2e**（AC 驱动 E2E）+ **workflow-orchestrator**（产品级编排）+ **workflow-bootstrap**（既有项目接入）。一次安装，七套能力协同。

## 30 秒上手

告诉它你的想法，它会帮你理清楚要做什么、怎么做、先做哪个。

```bash
# 在 Claude Code 中输入：
/workflow-orchestrator
# 然后说你的想法，例如："我想做一个任务管理功能"
# 跟着走就行——它会自动安排需求澄清、原型验证、计划拆分
```

**你只需要知道 3 个概念**：
1. **PRD**：你的需求文档（它帮你写）
2. **change**：拆分后的实施单元（它帮你拆）
3. **workflow-start**：开始实施一个 change（它帮你启动）

更多能力（原型验证、复利经验库、动态重规划等）在使用中自然接触，无需提前学习。

## 安装（plugin.json 一次安装）

支持 9 安装面：Claude Code、Cursor、OpenAI Codex CLI/App、GitHub Copilot CLI、Gemini CLI、OpenCode、WorkBuddy、Trae、ima-copilot。

```bash
# 本地路径安装（子命令依宿主 CLI 而定）
<cli> plugin install /path/to/team-flow

# 或从仓库
git clone <your-repo> && <cli> plugin install ./team-flow
```

> 不同宿主 CLI 的安装子命令略有差异（如 Claude Code 为 `/plugin add`，Cursor 为 `plugin install`）。以宿主文档为准；本插件提供单一 `plugin.json`，一次安装即加载全部 22 个 skills。

## 配置（插件层扩展字段）

项目根 `team-flow.config.json` 可注入（**插件层扩展字段，非 team-flow 原生 schema；原生仅 `artifacts.order` / `artifacts.skip`**）：

```json
{
  "prd.template": ".team-flow/prd.template.md",
  "prototype.designSystem": "prototype/design-system.md",
  "prototype.entry": "prototype/index.html"
}
```

读取方式：`tf runtime config --get <key>`（插件层自读，字段命名避开原生 key 冲突）。

## 初始化原型（首次）

```bash
cp -r <plugin>/skills/prototype/references/prototype-scaffold/ <project>/prototype/
```

随后按 `prototype/design-system.md` 填 token；`prototype/` 与 `prd/` 同级、git 分支隔离版本。

## 全局产物结构

```
prd/               PRD + 实施方案 + 原型审查记录（v1→v2，分支隔离）
prototype/         全局原型（UI 契约真相源）
docs/
  ├── architecture/  全局架构锚点（ARCHITECTURE.md / DATABASE.md / <bc>/ / baseline.md）
  └── solutions/     复利经验库（三层索引：INDEX.md → 分阶段目录 → 经验文件）
specs/<cap>/        每变更设计/任务/契约 + learnings.md
STRATEGY.md CONCEPTS.md 策略 / 领域词汇
```

## 九套能力（23 skills）

- **team-flow**（9）：workflow-start / need-explorer / spec-writer / contract-builder / build-executor / code-reviewer / spec-merger / release-archivist / bug-investigator
- **compound 核心子集**（6）：ce-brainstorm / ce-plan / ce-compound / ce-strategy / ce-ideate / ce-proof
- **architecture-design**（1）：architecture-design
- **prototype**（1）：prototype
- **e2e**（1）：e2e（AC 驱动 Playwright E2E 测试）
- **产品级编排**（1）：workflow-orchestrator（brainstorm→原型内循环→plan→拆change→分发）
- **既有项目接入**（1）：workflow-bootstrap（代码库侦察→架构基线→领域词汇→目录初始化）
- **会话交接**（1）：session-handoff（上下文腐化时压缩会话为交接文档，v0.16.0）
- **工作流反馈**（1）：workflow-feedback（工作流问题结构化记录，与 ce-compound 互补，v0.16.0）
- **设计系统**（1）：design-system（独立创建/迭代项目级设计系统，用户主导交互，v0.19.0）

### 配套 agents（8 个，v0.15.0 增至 8）

执行下沉的非交互子代理（主代理只编排）：code-reviewer / bug-investigator / prototype-reviewer / change-split-auditor / cross-change-consistency-checker / **prd-completeness-reviewer**（PRD 完整性评审）/ **prototype-builder**（原型绘制）/ **prototype-env-scout**（原型环境探查）。

### 命名约定

Skills 命名保留其来源前缀，作为功能分组的自然标识：

| 前缀 | 来源 | 含义 | Skills |
|------|------|------|--------|
| `ce-` | compound-engineering | 产品级思维工具（头脑风暴、计划、策略、复利、创意、验证） | ce-brainstorm, ce-plan, ce-strategy, ce-compound, ce-ideate, ce-proof |
| 无前缀 | team-flow | 变更级开发流程工具（状态机、规格、构建、审查、归档） | workflow-start, need-explorer, spec-writer, contract-builder, build-executor, code-reviewer, spec-merger, release-archivist, bug-investigator |
| 无前缀 | team-flow 新增 | 编排/接入/设计/原型/测试/交接/反馈 | workflow-orchestrator, workflow-bootstrap, architecture-design, prototype, e2e, session-handoff, workflow-feedback |

> `ce-` 前缀来自 compound-engineering 项目，team-flow 整合时保留了这一命名以维持功能分组的可辨识性。这不是命名不一致，而是有意的来源标注。

## 工作流（SOP，v0.7 修订）

```
模糊需求
  → [既有项目接入层 workflow-bootstrap]（一次性，baseline.md 已存在则跳过）
  → [产品级编排层 workflow-orchestrator]（v0.7 重设计）
  → S1 路径路由器 → 判断入口路径（全新/续版/重新计划/继续执行/快速通道/Hotfix）
  → S2 PRD + 原型阶段 → ce-brainstorm + 原型循环上提（prototype → 自动评审 → 人工评审 → 冻结）
  → S3 计划阶段 → ce-plan（pipeline 快速路径）→ plan.md（change 拆分+依赖+技术方向）
  → S4 拆分验证与分发 → change-split-auditor 审计（必选门禁）→ 创建 change → 进入 team-flow
  → S5 全局监控（change≥2 必选）→ 跨 change 一致性 + 复利晋升 + 动态重规划
  → [复利贯穿层] 每个阶段转换点：检测→捕获→索引→注入
  → change 完成：arch-merge → prototype-sync（顺序提交）+ 复利晋升
```

详见 `AGENTS.md`。

## 受 guard 保护的执行计划（execution plan）

full/hotfix 在 DP-4 必须保存 current execution plan 到
`<change>/.superpowers/sdd/execution-plan.json`；它不属于 `execution-contract.md`。
先运行 `tf execution recommend`（执行模式推荐）：它按任务量和 wave 策略列出 `inline`、
`batch-inline`、`sdd` 并给出推荐，并保存当前 wave 的推荐凭据到
`<change>/.superpowers/sdd/execution-recommendation.json`。Agent 展示候选项和理由后，
`plan` 与 `revise` 必须消费匹配当前 artifact、contract 和 wave 的凭据；用户用 `--confirm`
确认；若选择非推荐方式，必须用 `--acknowledge-recommendation` 记录确认风险。Batch
Inline 始终串行，不会表示并行。`tweak` 免除 execution plan 与 review receipt gate。

```bash
tf execution recommend changes/my-change \
  --wave foundation:parallel:1.1,1.2 \
  --wave integration:serial:2.1:foundation --json
tf execution plan changes/my-change --mode sdd --confirm --reason "independent work" \
  --wave foundation:parallel:1.1,1.2 \
  --wave integration:serial:2.1:foundation
tf execution show changes/my-change --json
# inline/batch-inline 可升级为 sdd，或重规划已有 sdd 的 wave/依赖；不能降级。
tf execution recommend changes/my-change \
  --wave foundation:parallel:1.1,1.2 \
  --wave integration:serial:2.1:foundation --json
tf execution revise changes/my-change --mode sdd --confirm --reason "need parallel work" \
  --wave foundation:parallel:1.1,1.2 \
  --wave integration:serial:2.1:foundation
tf execution review changes/my-change --wave foundation --base <sha> --head <sha> \
  --report .superpowers/sdd/reviews/foundation.md --verdict pass
```

`--report` 相对于 `<change>` 解析，且必须位于
`<change>/.superpowers/sdd/reviews/` 之下。`--base` 和 `--head` 必须是该
`<change>` Git 工作树中的真实 commit，且 `base` 必须是 `head` 的祖先。
`<change>/.superpowers/sdd/reviews/` 的目录层级必须是物理、非符号链接目录；
report 本身必须为普通、非空、非符号链接文件。

每一个 wave 均须有当前 `pass` review receipt，才可启动依赖 wave 或进入 closing；
修订计划会废止旧 receipt。#47 所提出的恢复、切换与手动保存 slash command 尚未实现，
不能假定有 `/tf:*` 命令。

## OpenAI Codex CLI 安装与升级

```bash
codex plugin marketplace add hashgraph-online/awesome-codex-plugins
codex plugin add team-flow@awesome-codex-plugins
```

直接安装指定 release tag（绕过社区镜像延迟）：

```bash
codex plugin marketplace add MageByte-Zero/team-flow --ref v0.9.0
codex plugin add team-flow@team-flow
```

升级：

```bash
codex plugin marketplace upgrade awesome-codex-plugins
codex plugin add team-flow@awesome-codex-plugins
codex plugin list | rg team-flow
```

## v0.9.0 亮点

- **Node 20** 最低运行时要求
- **model profiles**（`tf config --resolve-model`）：mechanical / standard / strong / review 四档模型配置，只读解析，不切换当前会话模型
- **最小性**原则：零运行时依赖、自包含插件、按需加载
