// tests/lib/hook-pre-tool-use.test.mjs
// v0.32.2（P1-44）：pre-tool-use-guard 路径化判定矩阵。
// 语义：change 目录内产物写入全状态放行；change 目录外（代码区）维持状态门禁
//（仅 approved-for-build/executing/debugging 放行）；.team-flow.yaml 恒受门禁（禁写红线）。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOK = join(__dirname, '..', '..', 'hooks', 'pre-tool-use-guard');

function runHook({ cwd, tool = 'Write', filePath }) {
  const input = JSON.stringify({
    tool_name: tool,
    tool_input: filePath === undefined ? {} : { file_path: filePath },
  });
  try {
    const stdout = execFileSync('bash', [HOOK], { input, cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 10000 });
    return { blocked: stdout.includes('"decision":"block"'), stdout };
  } catch (e) {
    const stdout = e.stdout?.toString() ?? '';
    return { blocked: stdout.includes('"decision":"block"'), stdout };
  }
}

function makeChange(state) {
  const root = mkdtempSync(join(tmpdir(), 'tf-hook-guard-'));
  const changeDir = join(root, 'changes', 'C-test');
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(join(changeDir, '.team-flow.yaml'), `state: ${state}\nworkflow: full\nchange_name: C-test\n`);
  return { root, changeDir };
}

describe('P1-44: pre-tool-use-guard 路径化判定', () => {
  const cleanups = [];
  after(() => { for (const d of cleanups) rmSync(d, { recursive: true, force: true }); });
  const track = (x) => { cleanups.push(x.root); return x; };

  it('exploring + change 目录内产物写入 → 放行（修复误伤）', () => {
    const { changeDir } = track(makeChange('exploring'));
    const r = runHook({ cwd: changeDir, filePath: join(changeDir, 'architecture', 'architecture.md') });
    assert.equal(r.blocked, false, 'exploring 阶段写架构产物应放行');
  });

  it('specifying/bridging + change 目录内产物写入 → 放行', () => {
    for (const state of ['specifying', 'bridging']) {
      const { changeDir } = track(makeChange(state));
      for (const f of ['proposal.md', 'design.md', 'execution-contract.md', 'test-matrix.md', join('specs', 'cap', 'spec.md')]) {
        const r = runHook({ cwd: changeDir, filePath: join(changeDir, f) });
        assert.equal(r.blocked, false, `${state} 写 ${f} 应放行`);
      }
    }
  });

  it('exploring + change 目录外代码写入 → 拦截', () => {
    const { root, changeDir } = track(makeChange('exploring'));
    const r = runHook({ cwd: changeDir, filePath: join(root, 'bff-app', 'src', 'main', 'java', 'Foo.java') });
    assert.equal(r.blocked, true, 'exploring 阶段写代码应拦截');
    assert.match(r.stdout, /blocked/i);
  });

  it('executing + change 目录外代码写入 → 放行（构建态）', () => {
    const { root, changeDir } = track(makeChange('executing'));
    const r = runHook({ cwd: changeDir, filePath: join(root, 'bff-app', 'src', 'Foo.java') });
    assert.equal(r.blocked, false, 'executing 状态写代码应放行');
  });

  it('closing + change 目录外写入 → 拦截；change 目录内审计文档 → 放行', () => {
    const { root, changeDir } = track(makeChange('closing'));
    assert.equal(runHook({ cwd: changeDir, filePath: join(root, 'src', 'X.java') }).blocked, true, 'closing 写代码应拦截');
    assert.equal(runHook({ cwd: changeDir, filePath: join(changeDir, 'decision-point-audit.md') }).blocked, false, 'closing 写 change 内审计文档应放行');
  });

  it('.team-flow.yaml 恒受状态门禁（禁写红线，v0.32.2 保留）', () => {
    const { changeDir } = track(makeChange('exploring'));
    const r = runHook({ cwd: changeDir, filePath: join(changeDir, '.team-flow.yaml') });
    assert.equal(r.blocked, true, '非构建态直写状态文件应拦截');
    const exec = track(makeChange('executing'));
    assert.equal(runHook({ cwd: exec.changeDir, filePath: join(exec.changeDir, '.team-flow.yaml') }).blocked, false, '构建态放行（与代码写入同权）');
  });

  it('无活动 change（无 .team-flow.yaml）→ 放行', () => {
    const bare = mkdtempSync(join(tmpdir(), 'tf-hook-bare-'));
    cleanups.push(bare);
    const r = runHook({ cwd: bare, filePath: join(bare, 'src', 'anything.ts') });
    assert.equal(r.blocked, false);
  });

  it('非 Write/Edit/MultiEdit 工具 → 放行', () => {
    const { root, changeDir } = track(makeChange('exploring'));
    const r = runHook({ cwd: changeDir, tool: 'Bash', filePath: undefined });
    assert.equal(r.blocked, false, 'Bash 不受本 hook 约束');
  });

  it('相对路径 file_path 正确解析（cwd=change 目录）', () => {
    const { changeDir } = track(makeChange('specifying'));
    const r = runHook({ cwd: changeDir, filePath: 'architecture/api.md' });
    assert.equal(r.blocked, false, '相对路径应基于 cwd 解析为 change 内产物');
  });
});
