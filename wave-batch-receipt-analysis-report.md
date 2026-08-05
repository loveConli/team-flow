# Wave/Batch/Receipt 实现分析报告

## 1. Execution Plan 相关文件

### 核心文件路径
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/lib/execution-plan.mjs`
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/lib/cmd-execution.mjs`
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/lib/execution-recommendation.mjs`

### Wave 数据结构定义

```javascript
// 从 execution-plan.mjs 和测试文件中提取
{
  id: string,           // wave 唯一标识，如 'wave-1', 'foundation'
  strategy: 'serial' | 'parallel',  // 执行策略
  tasks: string[],      // 任务 ID 列表，如 ['1.1', '1.2']
  depends_on: string[]  // 依赖的其他 wave ID 列表，如 ['wave-1', 'foundation']
}
```

### Execution Plan 完整数据结构

```javascript
{
  mode: 'inline' | 'batch-inline' | 'sdd',  // 执行模式（EXECUTION_MODES）
  source: string,           // 计划来源，如 'user-confirmed', 'user-confirmed-revision'
  rationale: string,        // 选择该模式的理由
  waves: Wave[],            // wave 数组
  artifacts_hash: string,   // 制品哈希（sha256:...）
  contract_hash: string,    // 契约哈希（sha256:...）
  workflow: string,         // 工作流类型：'full' | 'hotfix' | 'tweak'
  revision: number,         // 修订版本号
  hash: string,             // 计划内容哈希（sha256:...）
  recommendation?: {        // 推荐信息（full/hotfix 必需）
    available_modes: string[],
    recommendation: {
      mode: string,
      reasons: string[]
    },
    facts: object
  },
  recommendation_receipt?: {  // 推荐凭证（full/hotfix 必需）
    recommendation: object,
    waves: Wave[],
    artifacts_hash: string,
    contract_hash: string,
    workflow: string,
    execution_plan_revision_at_recommendation: number | null,
    created_at: string,
    hash: string
  },
  selection?: {             // 用户选择信息（full/hotfix 必需）
    confirmed: boolean,
    followed_recommendation: boolean,
    acknowledged_non_recommendation: boolean
  }
}
```

### 关键代码片段

**创建计划 (execution-plan.mjs:14-33)**
```javascript
export function createPlan(changeDir, input) {
  const state = readState(changeDir);
  const plan = {
    mode: input?.mode,
    source: input?.source,
    rationale: input?.rationale,
    waves: input?.waves,
    artifacts_hash: computeArtifactsHash(changeDir),
    contract_hash: computeContractHash(changeDir),
    workflow: state.workflow,
    revision: input?.revision ?? state.revision ?? 1,
  };
  // ... validation and hash computation
}
```

**Wave 解析 (cmd-execution.mjs:163-178)**
```javascript
function parseWaves(values) {
  // 格式: <id>:<strategy>:<task,...>[:<depends-on,...>]
  // 示例: 'wave-1:parallel:1.1,1.2' 或 'wave-2:serial:2.1:wave-1'
  return values.map(value => {
    const [id, strategy, taskList, dependencyList, ...extra] = value.split(':');
    const tasks = taskList.split(',').map(task => task.trim()).filter(Boolean);
    const depends_on = dependencyList === undefined ? [] : dependencyList.split(',').map(id => id.trim()).filter(Boolean);
    return { id, strategy, tasks, depends_on };
  });
}
```

---

## 2. Receipt 相关实现

### 核心文件路径
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/lib/execution-plan.mjs` (recordReview, readCurrentReview)
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/guard/checks/execution-reviews-passed.mjs`

### Review Receipt 数据结构

```javascript
{
  status: 'pass' | 'fail',  // 审查状态
  base: string,             // git base commit hash（完整 SHA）
  head: string,             // git head commit hash（完整 SHA）
  report: string,           // 审查报告文件路径（相对于 change 目录）
  tests?: {                 // 可选的测试统计（v0.13 §51.2）
    total: number,          // 测试总数
    passed: number,         // 通过数
    failed: number          // 失败数
  },
  plan_hash: string,        // 关联的执行计划哈希
  plan_revision: number,    // 关联的执行计划修订版本
  recorded_at: string       // 记录时间（ISO 格式）
}
```

### Receipt 存储位置
```
<change-dir>/.superpowers/sdd/reviews/<base64url-encoded-wave-id>.json
```

### Receipt 校验逻辑 (execution-plan.mjs:133-177)

```javascript
export function recordReview(changeDir, waveId, receipt) {
  // 1. 验证计划有效性
  const plan = readPlan(changeDir);
  const validation = validatePlan(changeDir, plan);
  if (!validation.valid) throw new Error(...);

  // 2. 验证 wave 是否存在于计划中
  const wave = plan.waves.find(candidate => candidate?.id === waveId);
  if (!wave) throw new Error(`Review receipt references unknown wave '${waveId}'`);

  // 3. 检查依赖是否已通过（阻塞依赖检查）
  const blockedBy = blockedDependencies(changeDir, plan, wave);
  if (blockedBy.length > 0) {
    throw new Error(`Wave '${waveId}' cannot be reviewed before dependencies have passing receipts: ${blockedBy.join(', ')}`);
  }

  // 4. 验证 status
  if (!REVIEW_STATUSES.has(receipt?.status)) {
    throw new Error("Review receipt status must be 'pass' or 'fail'");
  }

  // 5. 验证 base 和 head
  for (const field of ['base', 'head']) requireText(receipt?.[field], `receipt.${field}`);

  // 6. 验证 report 文件
  const report = validateReviewReportEvidence(changeDir, receipt?.report);

  // 7. 验证 git 范围（禁止空 diff）
  const { base, head } = validateReviewRange(changeDir, receipt.base, receipt.head);
  // 关键校验：base !== head（禁止 base==head 空 diff review）
  if (resolvedBase === resolvedHead) {
    throw new Error('Review receipt base must differ from head...');
  }

  // 8. 验证 base 是 head 的祖先
  execFileSync('git', ['-C', gitRoot, 'merge-base', '--is-ancestor', resolvedBase, resolvedHead]);

  // 9. 保存 receipt
  const savedReceipt = {
    status: receipt.status,
    base, head, report,
    ...(tests ? { tests } : {}),
    plan_hash: plan.hash,
    plan_revision: plan.revision,
    recorded_at: new Date().toISOString(),
  };
  atomicWrite(join(paths.reviews, `${safeFileName(waveId)}.json`), JSON.stringify(savedReceipt));
}
```

### 读取当前 Receipt (execution-plan.mjs:183-200)

```javascript
export function readCurrentReview(changeDir, waveId, plan = readPlan(changeDir)) {
  // 1. 检查 receipt 文件是否存在
  // 2. 验证 plan_hash 和 plan_revision 匹配当前计划
  // 3. 验证 base/head 范围仍然有效
  // 4. 对于 passing receipt，验证 report 文件仍然安全可读
  if (receipt?.status === 'pass') validateReviewReportEvidence(changeDir, receipt.report);
  return receipt;
}
```

---

## 3. state-loader.mjs 中的字段

### 核心文件路径
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/lib/state-loader.mjs`

### BUILTIN_DEFAULTS 中的相关字段

```javascript
const BUILTIN_DEFAULTS = {
  // 核心状态
  state: 'exploring',
  workflow: 'auto',
  revision: null,

  // 哈希校验
  artifacts_hash: null,
  contract_hash: null,

  // 执行进度（与 wave/batch/execution 相关）
  execution_mode: null,           // 执行模式：'inline' | 'batch-inline' | 'sdd'
  execution_plan_hash: null,      // 执行计划哈希
  execution_plan_revision: null,  // 执行计划修订版本
  batches_completed: 0,           // 已完成的批次数量
  test_result: null,              // 测试结果
  spec_merged: false,             // 规格是否已合并

  // 其他字段...
};
```

### 关键代码片段

**写入状态 (state-loader.mjs:92-188)**
```javascript
export function writeState(changeDir, state) {
  // 序列化到 .team-flow.yaml
  lines.push('# === Execution progress ===');
  lines.push(`execution_mode: ${state.execution_mode ?? 'null'}`);
  lines.push(`execution_plan_hash: ${state.execution_plan_hash ?? 'null'}`);
  lines.push(`execution_plan_revision: ${state.execution_plan_revision ?? 'null'}`);
  lines.push(`batches_completed: ${state.batches_completed ?? 0}`);
  lines.push(`test_result: ${state.test_result ?? 'null'}`);
  lines.push(`spec_merged: ${state.spec_merged ?? false}`);
}
```

---

## 4. guard.mjs 中的 Wave 门控逻辑

### 核心文件路径
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/guard/guard.mjs`
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/guard/checks/execution-plan-ready.mjs`
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/guard/checks/execution-reviews-passed.mjs`

### 门控转换矩阵

```javascript
// guard.mjs 中定义的转换检查维度
const TRANSITION_CHECKS = {
  'approved-for-build:executing': [
    'artifacts-exist',
    'contract-fresh',
    'dp-gate-passed',
    'execution-plan-ready',    // ★ 执行计划就绪检查
    'test-matrix-ready'
  ],
  'executing:closing': [
    'tasks-complete',
    'tests-passing',
    'specs-merged',
    'execution-plan-ready',    // ★ 执行计划就绪检查
    'execution-reviews-passed', // ★ 所有 wave receipt 通过检查
    'compound-captured',
    'test-matrix-complete',
    'arch-snapshot'
  ],
  'debugging:executing': [
    'contract-fresh',
    'execution-plan-ready'     // ★ 从 debugging 返回时也检查
  ],
};

// Workflow 特定检查
const WORKFLOW_TRANSITION_CHECKS = {
  hotfix: {
    'approved-for-build:executing': ['contract-current', 'dp3-approved', 'execution-plan-ready'],
    'executing:closing': ['tasks-complete', 'tests-passing', 'specs-merged', 'execution-plan-ready', 'execution-reviews-passed', 'compound-captured'],
  },
  tweak: {
    // Tweak 豁免 execution-plan 和 review receipt 检查
    'approved-for-build:executing': ['artifacts-exist', 'contract-fresh', 'dp-gate-passed'],
    'executing:closing': ['tasks-complete', 'tests-passing', 'specs-merged'],
  },
};
```

### execution-plan-ready 检查逻辑 (execution-plan-ready.mjs)

```javascript
export function checkExecutionPlanReady(changeDir) {
  // 1. 检查执行计划是否存在
  const plan = readPlan(changeDir);
  if (!plan) {
    return { pass: false, failures: ['execution plan is missing...'] };
  }

  // 2. 验证计划有效性
  const validation = validatePlan(changeDir, plan);
  if (!validation.valid) {
    return { pass: false, failures: validation.failures };
  }

  // 3. 验证 DP-4 引用了当前计划修订版本
  const state = readState(changeDir);
  const revisionReference = new RegExp(`\\bplan revision\\s+${plan.revision}\\b`, 'i');
  if (!revisionReference.test(decision)) {
    return { pass: false, failures: [`DP-4 must precisely reference current plan revision...`] };
  }

  return { pass: true, failures: [] };
}
```

### execution-reviews-passed 检查逻辑 (execution-reviews-passed.mjs)

```javascript
export function checkExecutionReviewsPassed(changeDir) {
  // 1. 读取执行计划
  const plan = readPlan(changeDir);
  if (!plan) return { pass: true, failures: [] }; // tweak 豁免

  // 2. 验证计划有效性
  const validation = validatePlan(changeDir, plan);
  if (!validation.valid) return { pass: false, failures: validation.failures };

  // 3. 遍历所有 wave，检查 receipt
  const failures = [];
  for (const wave of plan.waves) {
    const receipt = readCurrentReview(changeDir, wave.id, plan);
    if (!receipt) {
      failures.push(`review receipt missing for planned wave '${wave.id}'`);
      continue;
    }
    if (receipt?.status !== 'pass') {
      failures.push(`review receipt for planned wave '${wave.id}' has status '${receipt?.status}'`);
    }
  }

  return { pass: failures.length === 0, failures };
}
```

---

## 5. depends_on 和拓扑相关实现

### 核心文件路径
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/scripts/lib/execution-plan.mjs`

### 依赖验证逻辑 (execution-plan.mjs:381-433)

```javascript
function validateStructure(plan) {
  // ...

  // 验证每个 wave 的 depends_on
  for (const [index, wave] of plan.waves.entries()) {
    // 1. depends_on 必须是数组
    if (!Array.isArray(wave.depends_on)) failures.push(`${label} depends_on must be an array`);

    // 2. 依赖项必须是非空字符串
    else if (wave.depends_on.some(id => !isNonEmptyText(id))) failures.push(`${label} dependencies must be non-empty strings`);
  }

  // 3. 验证依赖引用的有效性
  for (const wave of plan.waves.filter(isObject)) {
    for (const dependency of wave.depends_on) {
      // 不能自依赖
      if (dependency === wave.id) failures.push(`wave '${wave.id}' cannot depend on itself`);
      // 不能依赖不存在的 wave
      else if (!ids.has(dependency)) failures.push(`wave '${wave.id}' depends on unknown wave '${dependency}'`);
    }
  }

  // 4. 检测循环依赖
  if (canCheckCycles && hasDependencyCycle(plan.waves)) {
    failures.push('execution plan waves contain a dependency cycle');
  }
}
```

### 循环依赖检测算法 (execution-plan.mjs:436-452)

```javascript
function hasDependencyCycle(waves) {
  // 使用 DFS 检测有向图中的环
  const dependencies = new Map(waves.map(wave => [wave.id, wave.depends_on]));
  const visiting = new Set();  // 当前正在访问的节点（用于检测后向边）
  const visited = new Set();   // 已完成访问的节点

  const visit = id => {
    if (visiting.has(id)) return true;   // 发现环！
    if (visited.has(id)) return false;   // 已经检查过，无环
    visiting.add(id);
    for (const dependency of dependencies.get(id) || []) {
      if (visit(dependency)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  return [...dependencies.keys()].some(visit);
}
```

### 阻塞依赖检查 (execution-plan.mjs:324-327)

```javascript
function blockedDependencies(changeDir, plan, wave) {
  if (!Array.isArray(wave?.depends_on)) return [];
  // 返回所有未通过的依赖 wave
  return wave.depends_on.filter(dependency =>
    readCurrentReview(changeDir, dependency, plan)?.status !== 'pass'
  );
}
```

### Wave 可执行性判断 (execution-plan.mjs:207-224)

```javascript
export function describeWaves(changeDir, plan = readPlan(changeDir)) {
  return plan.waves.map(wave => {
    const receipt = readCurrentReview(changeDir, wave.id, plan);
    const blockers = blockedDependencies(changeDir, plan, wave);
    const retryable = receipt?.status === 'fail';
    return {
      id: wave.id,
      strategy: wave.strategy,
      tasks: wave.tasks,
      depends_on: wave.depends_on,
      eligible: (receipt === null || retryable) && blockers.length === 0,  // 可执行条件
      retryable,
      receipt,
      blockers,
    };
  });
}
```

---

## 6. 测试文件中的示例

### 核心测试文件路径
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/tests/lib/execution-plan.test.mjs`
- `/Users/litong/Documents/work/code/practice/team-flow-workspace/team-flow/tests/lib/guard.test.mjs`

### Wave 定义示例

```javascript
// 单 wave，无依赖
waves: [{ id: 'wave-1', strategy: 'serial', tasks: ['1.1'], depends_on: [] }]

// 多 wave，有依赖
waves: [
  { id: 'wave-1', strategy: 'parallel', tasks: ['1.1', '1.2'], depends_on: [] },
  { id: 'wave-2', strategy: 'serial', tasks: ['2.1'], depends_on: ['wave-1'] }
]

// 循环依赖（会被拒绝）
waves: [
  { id: 'wave-1', strategy: 'serial', tasks: ['1.1'], depends_on: ['wave-2'] },
  { id: 'wave-2', strategy: 'serial', tasks: ['1.2'], depends_on: ['wave-1'] }
]

// 自依赖（会被拒绝）
waves: [{ id: 'wave-1', strategy: 'parallel', tasks: ['1.1'], depends_on: ['wave-1'] }]

// 依赖不存在的 wave（会被拒绝）
waves: [{ id: 'wave-1', strategy: 'parallel', tasks: ['1.1'], depends_on: ['missing'] }]
```

### Receipt 记录示例

```javascript
// 记录通过的 receipt
const receipt = recordReview(changeDir, 'wave-1', {
  status: 'pass',
  base: gitRefs.base,    // git base commit
  head: gitRefs.head,    // git head commit
  report: reportPath,    // 审查报告路径
  tests: {               // 可选测试统计
    total: 12,
    passed: 11,
    failed: 1
  }
});

// 记录失败的 receipt
const receipt = recordReview(changeDir, 'wave-2', {
  status: 'fail',
  base: gitRefs.base,
  head: gitRefs.head,
  report: reportPath
});
```

### Guard 测试示例

```javascript
// 测试：所有 wave 必须有 passing receipt 才能 closing
it('blocks closing until every planned wave has a passing review receipt', () => {
  // 1. 创建计划（wave-1 和 wave-2）
  createCurrentPlan();

  // 2. 尝试 closing，应该失败（没有 receipt）
  let result = run('executing', 'closing');
  assert.equal(result.exitCode, 1);
  assert.match(reviewCheck.failures.join('\n'), /wave-1|receipt/i);

  // 3. 记录 wave-1 passing，wave-2 failing
  runNodeScript(CLI_PATH, ['execution', 'review', dir, '--wave', 'wave-1', ...]);
  runNodeScript(CLI_PATH, ['execution', 'review', dir, '--wave', 'wave-2', ..., '--verdict', 'fail']);

  // 4. 尝试 closing，应该失败（wave-2 failing）
  result = run('executing', 'closing');
  assert.match(reviewCheck.failures.join('\n'), /wave-2.*fail/i);

  // 5. 修复 wave-2 为 passing
  runNodeScript(CLI_PATH, ['execution', 'review', dir, '--wave', 'wave-2', ..., '--verdict', 'pass']);

  // 6. 尝试 closing，应该成功
  result = run('executing', 'closing');
  assert.equal(result.exitCode, 0);
});
```

---

## 7. 关键设计要点总结

### Wave 设计
1. **Wave 是执行计划的基本单位**，每个 wave 包含一组任务和执行策略
2. **策略类型**：`serial`（顺序执行）和 `parallel`（并行执行）
3. **依赖关系**：通过 `depends_on` 字段定义 wave 之间的依赖
4. **拓扑约束**：禁止自依赖、禁止依赖不存在的 wave、禁止循环依赖

### Receipt 设计
1. **Receipt 是 wave 级别的审查证据**，记录在 `.superpowers/sdd/reviews/` 目录
2. **必须包含**：status、base、head、report
3. **可选包含**：tests（测试统计）
4. **关联性**：receipt 通过 plan_hash 和 plan_revision 关联到特定的执行计划版本
5. **有效性**：receipt 在计划变更后自动失效（hash 不匹配）

### 门控设计
1. **execution-plan-ready**：在进入 executing 和 closing 时检查
2. **execution-reviews-passed**：在 closing 时检查，要求所有 wave 都有 passing receipt
3. **依赖阻塞**：wave 的 receipt 记录依赖其所有 depends_on wave 的 receipt 先通过
4. **Workflow 豁免**：tweak workflow 豁免 execution-plan 和 review receipt 检查

### 状态持久化
1. **execution_mode**：记录选择的执行模式
2. **execution_plan_hash**：记录当前执行计划的哈希
3. **execution_plan_revision**：记录当前执行计划的修订版本
4. **batches_completed**：记录已完成的批次数量
