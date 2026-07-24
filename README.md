# team-flow

> 当前版本：`v0.11.0`

> 统一插件：**spec-superflow**（spec 驱动开发）+ **compound-engineering 核心子集**（全局复利）+ **architecture-design**（4A+DDD 增量设计）+ **prototype**（本地 HTML 原型）+ **e2e**（AC 驱动 E2E）+ **workflow-orchestrator**（产品级编排）+ **workflow-bootstrap**（既有项目接入）。一次安装，七套能力协同。

## 安装（plugin.json 一次安装）

支持 9 安装面：Claude Code、Cursor、OpenAI Codex CLI/App、GitHub Copilot CLI、Gemini CLI、OpenCode、WorkBuddy、Trae、ima-copilot。

```bash
# 本地路径安装（子命令依宿主 CLI 而定）
<cli> plugin install /path/to/team-flow

# 或从仓库
git clone <your-repo> && <cli> plugin install ./team-flow
```

> 不同宿主 CLI 的安装子命令略有差异（如 Claude Code 为 `/plugin add`，Cursor 为 `plugin install`）。以宿主文档为准；本插件提供单一 `plugin.json`，一次安装即加载全部 20 个 skills。

## 配置（插件层扩展字段）

项目根 `spec-superflow.config.json` 可注入（**插件层扩展字段，非 spec-superflow 原生 schema；原生仅 `artifacts.order` / `artifacts.skip`**）：

```json
{
  "prd.template": ".team-flow/prd.template.md",
  "prototype.designSystem": "prototype/design-system.md",
  "prototype.entry": "prototype/index.html"
}
```

读取方式：`ssf runtime config --get <key>`（插件层自读，字段命名避开原生 key 冲突）。

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

## 七套能力（20 skills）

- **spec-superflow**（9）：workflow-start / need-explorer / spec-writer / contract-builder / build-executor / code-reviewer / spec-merger / release-archivist / bug-investigator
- **compound 核心子集**（6）：ce-brainstorm / ce-plan / ce-compound / ce-strategy / ce-ideate / ce-proof
- **architecture-design**（1）：architecture-design
- **prototype**（1）：prototype
- **e2e**（1）：e2e（AC 驱动 Playwright E2E 测试）
- **产品级编排**（1）：workflow-orchestrator（brainstorm→原型内循环→plan→拆change→分发）
- **既有项目接入**（1）：workflow-bootstrap（代码库侦察→架构基线→领域词汇→目录初始化）

## 工作流（SOP）

```
模糊需求
  → [既有项目接入层 workflow-bootstrap]（一次性，baseline.md 已存在则跳过）
  → [产品级编排层 workflow-orchestrator]
  → S1 ce-brainstorm → PRD(vN)（含原型内循环，可选）
  → S2 ce-plan → plan(vN)（产品级策略：change 拆分+依赖+技术方向）
  → S3 拆 change → S4 分发 → 各 change 进入 spec-superflow（workflow-start 8态状态机）
  → [复利贯穿层] 每个阶段转换点：检测→捕获→索引→注入
  → change 完成：arch-merge → prototype-sync（顺序提交）+ 复利晋升
```

详见 `AGENTS.md`。
