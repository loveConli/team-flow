# E2E 测试集成进 team-flow 设计方案 v2（吸收双专家评审后修订）

> 状态：v2 修订稿，已吸收 E2E 测试架构 + team-flow 架构双专家评审
> 来源依据：gtmc `acceptance-test` SKILL.md v3.0.0 + `test-verifier.md`；spoko.space《AI & Playwright E2E Testing 2026》；LT的知识库（EXJh01CG7...）已存上述 gtmc 文件
> 重要更正（v2）：经架构评审核实，`ce-proof` 实为 **Proof 协作式 Markdown 编辑器**（发布 proofeditor.ai），**不是**"验证证明"。验收证据聚合归属 `release-archivist`（closing 态 verification gate）+ `build-executor` + `code-reviewer`。v1 草案 §1.1/§8 对 ce-proof 的定性为误读，本版纠正。
> **整合状态**：本方案已整合进主设计规格 `docs/architecture-api-db-design-enhancement-v0.3.md` **第十六章 E2E 测试集成（v0.4）**；本文件保留为评审过程稿与详细附录，规范以主规格第十六章为准。

---

## 0. 决策记录

| 维度 | 决策 | 备注 |
|---|---|---|
| 原型框架 | **A：维持 HTML 自包含 + 强化 `data-testid` 契约** | 守住 v0.3 零依赖/可离线 |
| E2E 挂载 | **A1：新建独立 `e2e` skill** | 17→18；可选 overlay，不进核心状态机 |
| `data-testid` 规范 | 搬 gtmc 命名；选择器优先级统一 spoko | 元素级仅关键锚点 |
| 覆盖率门禁 | **分级**：原型期放宽 / 集成期严格照搬 gtmc | 门禁随被测体成熟度递增 |
| AC 提取 | 门禁按维度条件触发 + 关键字回退 | 解除"可选→强制"陷阱 |
| 验收证据归属 | `release-archivist`（非 ce-proof） | v2 纠正误读 |

> 版本口径：本文件为**设计修订号 v0.4**；已发布插件打包版本为 **0.10.0**（冻结设计基线 v0.3）。两轴独立，勿与 `check-version-consistency` 守卫混淆。

---

## 1. 背景与现状缺口

### 1.1 team-flow 现有测试纪律
- `build-executor` 的 **TDD Iron Law**（RED→GREEN→REFACTOR）+ **SDD** + review gate + 8 态状态机。
- `spec.md` 含 `#### Scenario:` 块（验收场景），validation 要求每 Requirement 有 SHALL/MUST + ≥1 Scenario（机器级校验在 `scripts/validate-artifacts` → `dist/index.js` 的 `Validator.validateDeltaSpec`）。
- `release-archivist` 在 closing 态有 `verification-before-completion` gate（state-machine.md），承担验收证据聚合。
- `ce-proof` 是 **Proof Markdown 编辑器**（外部托管 proofeditor.ai），与测试/验证无关。
- 插件自身 `tests/e2e.test.mjs` 是 ssf 解析引擎测试，**非产品 UI E2E**。
- `prototype` skill 产出自包含 HTML，但**不自动生成 Playwright**。

### 1.2 核心缺口
**spec 场景 / 验收标准 → 可执行 E2E (Playwright) 的桥接未自动化。** gtmc 的 `acceptance-test` + `test-verifier` 是此桥接的完整参考实现（AC 驱动黑盒 + 机械覆盖率 + Playwright 生成）。

---

## 2. 不可破的核心约束

| 约束 | 来源 | 对 E2E 方案的含义 |
|---|---|---|
| 原型零依赖/可离线 | v0.3 `prototype-design-research.md` + prototype SKILL.md | 原型仍自包含 HTML；`data-testid` 为纯 HTML 属性，不引入 JS/CSS/构建/Playwright。Playwright 仅进**用户项目**，不进插件 |
| 通用插件不固化框架 | config 设计原则 | E2E 靠 `data-testid` 契约跨框架复用，不假设 Vue/React |

> 已否决：原型改 Vue（推翻零依赖 + 背叛通用性）。

---

## 3. `data-testid` 契约规范（搬 gtmc 命名 + spoko 纪律）

**原则**：`data-testid` 是"测试—组件"契约层，由 spec/`execution-contract.md` 定义；原型 HTML 与实际 UI 代码**共用同一命名**，使 Playwright 测试脚本高重叠复用。

### 3.1 命名层级（搬 gtmc）
| 层级 | 格式 | 示例 |
|---|---|---|
| 场景级 | `S-{nn}-{slug}` | `data-testid="S-01-create-goal"` |
| 页面级 | `P-{xx}-{slug}` | `data-testid="P-04-strategy-list"` |
| 元素级 | `{语义名}` | `data-testid="create-btn"` / `name-input` / `submit` |

### 3.2 选择器优先级（统一 spoko 立场，v2 修正 §3.2/§7 矛盾）
**`getByRole` > `data-testid` > `id` > `getByLabel` > CSS/XPath（禁用于新测试）**。
- `data-testid` 仅用于动态/hydration 边界或角色不可达元素，非第一优先。
- 禁止 `waitForTimeout`（flaky 源），用 web-first 断言。

### 3.3 打标纪律（v2 修正"过度打标"）
- **必带**：场景级、页面级 testid（每个页面/场景根）。
- **元素级仅关键交互锚点**（提交、主操作、状态切换点）带 testid；内部子元素优先用 `getByRole`/`getByText`。
- 不"每个交互元素都打"——避免 DOM 膨胀与维护负担（spoko 反模式）。

### 3.4 可选开启 + 零依赖声明
- 由 config 驱动：仅当 change 选择 E2E 时强制 testid 产出，避免无测试需求项目被迫加。
- prototype SKILL.md 显式补："`data-testid` 为纯 HTML 属性，不引入任何依赖"——钉死零依赖约束。

### 3.5 契约治理（v2 新增，防漂移）
- `execution-contract.md` 记录 UI 契约（testid 命名 + 期望行为）。
- 提供 **testid checker**：比对原型 HTML 与实际代码两侧 testid 集合，漂移即报警，避免"同名约定"静默失效。

---

## 4. spec `#### Scenario:` → Playwright 映射（v2 修正 fallback）

### 4.1 提取源
| gtmc 输入 | team-flow 对应 | AC 类型 |
|---|---|---|
| 验收标准 checkbox | Requirement `#### Scenario:`（正常路径） | HP |
| 异常处理 table | spec 可选 `##### Exception:` 子标签 | EX |
| 状态流转图 | spec 可选 `##### State:` 子标签 | ST |
| 交互步骤字段 | spec 可选 `##### Boundary:` 子标签 | BND |

### 4.2 解除"可选→强制"陷阱（v2 关键修正）
门禁**按维度条件触发** + **关键字回退**双保险：
1. **维度条件触发**：仅当 spec 含某维度标签时，才考核该维度覆盖率；未含 → 标 `N/A` 而非 `0%`，不触发 BLOCKER。
2. **关键字回退推导**：未打标签时，从 Scenario 文本提取 error/invalid/fail/边界/超时 等信号作为 EX/ST/BND 来源，使存量 spec 仍有覆盖率。
- 二者至少取一，确保"可选"真正可选、向后兼容。

### 4.3 AC 矩阵公式（搬 gtmc）
`Total = HP×1 + EX×2 + ST×2 + BND×1`（ST-invalid 若已被 EX 覆盖则去重）。

### 4.4 阶段映射（v2 修正 gtmc 编号）
不用 gtmc 的 A-5.7/A-6.5/A-6.7，映射到本插件真实执行模型：
| team-flow 阶段 | 被测体 | 含义 |
|---|---|---|
| bridging / prototype | `prototype/` HTML（http-server 托管） | 验证 spec 可执行性 |
| executing（batch/wave） | `build-executor` 实际代码 | 集成验证 |
| closing | 业务完整实现 | 验收（release-archivist gate） |

---

## 5. 门禁分级（v2 修正：原型放宽 / 集成严格）

| 指标 | 原型期（验证可执行性，静态 mock） | 集成期（实际代码） |
|---|---|---|
| AC 覆盖率 | ≥ 80%（HP 必测） | ≥ 95% |
| 异常路径 EX | 有则测、无则带说明（不阻断） | ≥ 80% |
| 状态转换 ST | 有则测、无则带说明（不阻断） | ≥ 90% |
| 边界值 BND | 有则测、无则带说明（不阻断） | ≥ 75% |
| 阻断级别 | AC<80% = BLOCKER | AC/EX < 门槛 = BLOCKER；ST/BND = WARNING |

> 门禁随被测体成熟度**单调递增**；原型 mock 结构性做不到 EX/ST 全覆盖，强行照搬会产出虚假 BLOCKER（与 spoko"工具不替人类做覆盖决策"一致）。

---

## 6. 新 `e2e` skill 设计（SKILL.md 草案）

```yaml
name: e2e
description: 从 spec 验收场景生成 Playwright E2E 测试、执行并审计覆盖率（可选 overlay）。
  用法: /e2e [原型|集成|验收] [spec路径]
version: 0.1.0
user-invocable: true
```

### 执行流程（5 步）
1. **确定测试类型**：原型（默认）/ 集成 / 验收。
2. **AC 提取与分类**：从 spec Scenario（+ 可选子标签 / 关键字回退）机械提取，生成 AC 矩阵。质量门禁：总测试数 ≥ AC×1.5。
3. **测试脚本生成**：调用 `test-verifier` 角色，含 AC 矩阵 + 黑盒约束（§3.2 选择器纪律）+ 分级门禁 + 命名规范 + `@regression-source`/`@last-sync` 标记。
4. **执行与报告**：跑 Playwright，产出 AC 覆盖率 / 四维覆盖率 / 类型分布 / 未覆盖清单 / 失败根因分类（测试问题 vs 实现问题）。
5. **覆盖率审计**：按 §5 分级门槛判定 BLOCKER/WARNING，未达标回退补充。

### 产出物（v2 修正落盘位置）
| 产物 | 路径 |
|---|---|
| 测试脚本 | **统一 `e2e/`**（不放 `prototype/`） |
| AC 矩阵 | `docs/statistics/AC-coverage-matrix.md` |
| 测试报告 | `docs/statistics/YYYY-MM-DD-e2e-report.md` |

> **复用机制（v2 修正）**：单一 `e2e/` + `playwright.config.ts` 的 `projects`（baseURL 切换）同时服务两个被测体——`prototype` project → http-server 托管 HTML；`integration` project → 真实应用。测试脚本体一致，**仅切目标地址 + 少量选择器/断言适配**（表述为"高重叠复用"，非"零触碰"；原型绿 ≠ 集成绿）。

---

## 7. 执行层：`test-verifier` 角色（v2 裁剪 MVP 子集）

借 gtmc `test-verifier.md` 作 e2e skill 执行 Agent，**MVP 裁剪**：
- **保留**：AC 深度分析（4 类提取 + 分级门禁）、选择器纪律、E2E 决策矩阵（轻量）、执行与报告（覆盖率/未覆盖/根因）。
- **移交 `release-archivist`**：4 级制品验证（L1 存在→L4 数据流；设计→实现追溯本就是 closing gate 缺口）。
- **DEFER / 归 `prototype-reviewer`**：8 维健康评分（功能/无障碍/UX/控制台/视觉/性能/链接/内容，<60 阻止发布）、每页 7 点视觉走查（需 axe/Lighthouse，不匹配自包含原型 MVP）。

> 适配：gtmc 用 `npx playwright test` + Bash；team-flow E2E 在**用户项目目录内**初始化独立 Playwright 工程，不塞进插件自身 `.mjs` 测试。

---

## 8. 对现有 skill 的影响面（v2 纠正事实错误）

| Skill | 改动 |
|---|---|
| `prototype` | 补 `data-testid` 产出要求（场景/页面级必带 + 关键锚点；config 可选开启；零依赖声明） |
| `build-executor` | 不改（TDD 管单测；E2E 独立） |
| `ce-proof` | **不改**（纠正误读：它仍是 Proof 编辑器，与验证无关） |
| `release-archivist` | 接入 e2e 报告 + 4 级制品比对（closing 验收 gate 的验证维度） |
| `architecture-design` | API/DB 设计文档供 `release-archivist` 制品比对使用 |
| `design-system`（=模板/项目 design-system.md，**非 skill**） | 不在 9 段视觉 schema 加测试段；testid 契约只置 `execution-contract.md`（避免双真相源） |
| `spec-writer` | Validation Checklist 补"可选 Exception/State/Boundary 子标签"说明；补回归用例 |

---

## 9. 实施步骤（Claude Code，拍板后）

1. 新建 `skills/e2e/SKILL.md`（§6 草案）+ `skills/e2e/references/test-verifier.md`（§7 MVP 裁剪）。
2. 改 `prototype/SKILL.md`：补 §3.3–3.4 的 data-testid 产出（可选开启 + 零依赖声明）。
3. 改 `release-archivist/SKILL.md`：接入 e2e 报告 + 4 级制品比对。
4. 改 `spec-writer`：Validation Checklist 补可选子标签说明；补回归用例"含 `##### Exception:` 的 spec 仍能 `npm run validate` 通过"。
5. `plugin.json` 第 4 行"17 skills"→"18 skills"（仅文案，守卫不因此失败）。
6. 版本两轴：文档标注设计修订 v0.4 vs 打包 0.10.0。
7. `check-version-consistency.mjs`：新增 skill 不在守卫枚举内，不会破；人工确保 e2e 不引入错误版本 `npx` 引用。
8. `npm test` / `npm run validate` 验证插件不因新增 skill 破损。

---

## 10. 专家评审结论摘要（已采纳）

### E2E 测试架构专家
- **BLOCKER**：① 测试落盘位置自相矛盾（prototype/tests/ 又宣称仅地址切换）；② 门禁照搬全阈值到原型期会系统性虚假 BLOCKER；③ AC 提取依赖可选子标签却驱动强制门禁。
- **WARNING**：选择器优先级矛盾；过度打标；test-verifier 过度搬运；testid 契约漂移；复用表述夸大；§0/§5.1 内部不一致；18 skill 精简定位。
- **最担忧**：B②+B③ 叠加 = 门禁在原型期默认失败。

### team-flow 架构专家
- **BLOCKER**：① ce-proof 职责误定（实为 Proof 编辑器，方案前提错误）；② spec 可选标签 vs 强制门禁反向兼容矛盾。
- **WARNING**：design-system 误标为 skill + 测试契约耦合；影响面表事实错误；validateDeltaSpec 对 `#####` 容忍度未实测；prototype testid 强制偏重；test-verifier 范围过大；gtmc 阶段编号误用；版本口径。
- **最反对**：ce-proof 误读导致验收证据归属错误。

### v2 已采纳的修订
✅ ce-proof 重定位（归 release-archivist）｜✅ 门禁分级（原型放宽/集成严格）｜✅ AC 提取 fallback（维度条件触发 + 关键字回退）｜✅ 落盘统一 `e2e/` + projects(baseURL)｜✅ 选择器优先级统一 spoko｜✅ 打标纪律（关键锚点）｜✅ test-verifier MVP 裁剪（4级/8维移交）｜✅ design-system 纠正（非 skill，契约只置 execution-contract）｜✅ 阶段映射回 team-flow 模型｜✅ 文档内部一致｜✅ 版本两轴 + plugin.json 18 文案。

---
*本方案为 v0.4 设计修订，v2 已吸收双专家评审。须经 LT 拍板后方可进入 Claude Code 实施。*
