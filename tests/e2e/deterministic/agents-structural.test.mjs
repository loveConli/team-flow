// tests/e2e/deterministic/agents-structural.test.mjs
// Tier 1 确定性：5 个新 agent 的注册结构性校验（文件存在 + skills 引用真实 + color 合法 + model inherit）。
// 来源：workflow-feedback 2026-08-01 #100001（agent 注册结构）/ #100006（frontmatter 合法性）。
// frontmatter 解析说明：agent .md 头部为 `---` 包裹的 YAML；description 是 `>-` 折叠块（内容缩进），
// name/color/model 是块后的顶层标量（列 0 起），skills 是缩进块序列。故按"列 0 锚定"提取标量、
// 按 `skills:` 后缩进 `- item` 收集列表，无需完整 YAML 库（也避免被 description 内的 user:/assistant: 干扰）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PKG_ROOT } from '../helpers/tf.mjs';

const AGENTS_DIR = join(PKG_ROOT, 'agents');
const SKILLS_DIR = join(PKG_ROOT, 'skills');

// 按名单断言（非硬编码总数）：v0.29.0 引入的 5 个 DP 链 agent。
const NEW_AGENTS = ['spec-writer', 'contract-builder', 'build-executor', 'release-archivist', 'need-explorer'];
// 合法 color 集合（plugin-dev:agent-development 规定色板；无 orange）。
const VALID_COLORS = ['blue', 'cyan', 'green', 'yellow', 'magenta', 'red'];

/** 解析 agent .md 的 frontmatter，提取 {name,color,model,skills[]}。文件不存在/无 frontmatter 返回 null。 */
function parseFrontmatter(file) {
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, 'utf-8').split('\n');
  if ((lines[0] || '').trim() !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) return null;
  const fm = lines.slice(1, end);

  // 顶层标量：列 0 锚定 `key:`，避开 description 折叠块内的缩进行。
  const scalar = (key) => {
    const re = new RegExp(`^${key}:[ \\t]*(.*)$`);
    const line = fm.find((l) => re.test(l));
    if (line === undefined) return null;
    return line.replace(re, '$1').trim().replace(/^["']|["']$/g, '') || null;
  };

  // skills 块序列：`skills:` 行后收集缩进的 `- item`，遇非列表非空行停止。
  const skills = [];
  const idx = fm.findIndex((l) => /^skills:[ \t]*$/.test(l));
  if (idx !== -1) {
    for (let i = idx + 1; i < fm.length; i++) {
      const m = fm[i].match(/^\s+-\s+(.+)$/);
      if (m) skills.push(m[1].trim().replace(/^["']|["']$/g, ''));
      else if (fm[i].trim() === '') continue;
      else break;
    }
  }

  return { name: scalar('name'), color: scalar('color'), model: scalar('model'), skills };
}

function loadAgent(name) {
  const file = join(AGENTS_DIR, `${name}.md`);
  return { name, file, exists: existsSync(file), fm: parseFrontmatter(file) };
}

describe('T1 agents: 5 个新 agent 注册结构性（#100001 / #100006）', () => {
  it('T1-agents-by-name：5 个新 agent 文件按名单全部存在', () => {
    for (const name of NEW_AGENTS) {
      assert.ok(existsSync(join(AGENTS_DIR, `${name}.md`)), `agents/${name}.md 应存在`);
    }
  });

  it('T1-agents-skills-field：每个新 agent 含 skills: 且引用的 skill 目录真实存在', () => {
    for (const name of NEW_AGENTS) {
      const { fm } = loadAgent(name);
      assert.ok(fm, `${name} frontmatter 应可解析`);
      assert.ok(Array.isArray(fm.skills) && fm.skills.length > 0, `${name} 应声明 skills: 列表`);
      for (const skill of fm.skills) {
        assert.ok(existsSync(join(SKILLS_DIR, skill)), `${name} 引用的 skills/${skill}/ 应真实存在`);
      }
    }
  });

  it('T1-agents-color-valid：每个新 agent color ∈ 合法色板（无 orange）', () => {
    for (const name of NEW_AGENTS) {
      const { fm } = loadAgent(name);
      assert.ok(fm, `${name} frontmatter 应可解析`);
      assert.ok(VALID_COLORS.includes(fm.color),
        `${name} color 应 ∈ {${VALID_COLORS.join(',')}}，实际: ${fm.color}`);
    }
  });

  it('T1-agents-model-inherit：每个新 agent model: inherit', () => {
    for (const name of NEW_AGENTS) {
      const { fm } = loadAgent(name);
      assert.ok(fm, `${name} frontmatter 应可解析`);
      assert.equal(fm.model, 'inherit', `${name} model 应为 inherit，实际: ${fm.model}`);
    }
  });
});
