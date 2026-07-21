# team-flow

> 当前版本：`v0.11.0`

> 统一插件：**spec-superflow**（spec 驱动开发）+ **compound-engineering 核心子集**（全局复利）+ **architecture-design**（4A+DDD 增量设计）+ **prototype**（本地 HTML 原型）。一次安装，四套能力协同。

## 安装（plugin.json 一次安装）

支持 9 安装面：Claude Code、Cursor、OpenAI Codex CLI/App、GitHub Copilot CLI、Gemini CLI、OpenCode、WorkBuddy、Trae、ima-copilot。

```bash
# 本地路径安装（子命令依宿主 CLI 而定）
<cli> plugin install /path/to/team-flow

# 或从仓库
git clone <your-repo> && <cli> plugin install ./team-flow
```

> 不同宿主 CLI 的安装子命令略有差异（如 Claude Code 为 `/plugin add`，Cursor 为 `plugin install`）。以宿主文档为准；本插件提供单一 `plugin.json`，一次安装即加载全部 17 个 skills。

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
prd/               PRD（v1→v2，分支隔离）
prototype/         全局原型（UI 契约真相源）
docs/architecture/ 全局架构锚点（ARCHITECTURE.md / DATABASE.md / <bc>/）
specs/<cap>/        每变更设计/任务/契约
STRATEGY.md CONCEPTS.md 策略 / 领域词汇
```

## 四套能力（17 skills）

- **spec-superflow**（9）：workflow-start / need-explorer / spec-writer / contract-builder / build-executor / code-reviewer / spec-merger / release-archivist / bug-investigator
- **compound 核心子集**（6）：ce-brainstorm / ce-plan / ce-compound / ce-strategy / ce-ideate / ce-proof
- **architecture-design**（1）：architecture-design
- **prototype**（1）：prototype

## 工作流（SOP）

```
模糊需求
  → [ce-brainstorm → ce-plan] → prd/vN
  → 拆 change（一份 PRD 可拆多 change）
  → spec-superflow: exploring → … → closing
       每 change：引用全局 prototype/ 作 UI 契约；architecture-design 增量；api.md 硬消费
  → change 完成：arch-merge → prototype-sync（顺序提交）复利回写全局
```

详见 `AGENTS.md`。
