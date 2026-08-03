// tests/lib/frontmatter-lint.test.mjs
// frontmatter 合法性长效门禁（v0.33.0，设计 §54）。
//
// 背景：v0.33.0 之前全部 15 个 agent 的 frontmatter 是非法 YAML（description 块标量内
// 顶格书写 <example>），Claude Code 解析失败后静默降级——skills: 预加载被丢弃、
// tools: 限制失效，且无任何警告，缺陷存活了整个插件生命周期。
// 本门禁用 js-yaml 严格解析全部 frontmatter，杜绝同类缺陷复发：
//   1. agents/*.md：YAML 可解析 + name/description 必填 + tools/skills 结构断言
//   2. agent 的 skills: 引用必须解析到真实 skills/<name>/SKILL.md
//   3. skills/*/SKILL.md：YAML 可解析 + name/description 必填（description 含裸 ": " 同样非法）
//   4. commands/*.md：frontmatter（若有）可解析
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as yamlLoad } from 'js-yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** 提取文件首部 frontmatter 原文；无 frontmatter 返回 null。 */
function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : null;
}

/** 严格解析 frontmatter 为对象，失败即抛断言错误（附文件路径）。 */
function parseFrontmatter(file, text) {
  const raw = extractFrontmatter(text);
  assert.ok(raw != null, `${file}: 缺少 frontmatter（--- 边界）`);
  let data;
  try {
    data = yamlLoad(raw);
  } catch (e) {
    assert.fail(`${file}: frontmatter YAML 解析失败——${e.message.split('\n')[0]}（静默降级会导致 skills:/tools: 被 Claude Code 丢弃，见设计 §54）`);
  }
  assert.ok(data && typeof data === 'object' && !Array.isArray(data), `${file}: frontmatter 必须是映射`);
  return data;
}

const AGENTS_DIR = join(ROOT, 'agents');
const SKILLS_DIR = join(ROOT, 'skills');
const COMMANDS_DIR = join(ROOT, 'commands');

const agentFiles = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));
const skillDirs = readdirSync(SKILLS_DIR).filter((d) => statSync(join(SKILLS_DIR, d)).isDirectory());

describe('frontmatter-lint: agents/*.md', () => {
  it('agent 清单非空（防目录漂移导致门禁空转）', () => {
    assert.ok(agentFiles.length >= 15, `agents 应 ≥15 个，实际 ${agentFiles.length}`);
  });

  for (const f of agentFiles) {
    it(`${f}: YAML 严格可解析 + 必填字段`, () => {
      const data = parseFrontmatter(`agents/${f}`, readFileSync(join(AGENTS_DIR, f), 'utf8'));
      assert.equal(typeof data.name, 'string', `${f}: name 必须为字符串`);
      assert.ok(data.name.trim(), `${f}: name 不可为空`);
      assert.equal(typeof data.description, 'string', `${f}: description 必须为字符串`);
      assert.ok(data.description.trim(), `${f}: description 不可为空`);
      if (data.tools != null) {
        assert.ok(Array.isArray(data.tools) && data.tools.length > 0, `${f}: tools 必须为非空数组`);
        assert.ok(data.tools.every((t) => typeof t === 'string'), `${f}: tools 元素必须为字符串`);
      }
      if (data.skills != null) {
        assert.ok(Array.isArray(data.skills) && data.skills.length > 0, `${f}: skills 必须为非空数组`);
        assert.ok(data.skills.every((s) => typeof s === 'string'), `${f}: skills 元素必须为字符串`);
      }
    });

    it(`${f}: name 与文件名一致（registry 降级时以文件名为准，防错位）`, () => {
      const data = parseFrontmatter(`agents/${f}`, readFileSync(join(AGENTS_DIR, f), 'utf8'));
      assert.equal(data.name, basename(f, '.md'));
    });
  }

  it('全部 skills: 引用解析到真实 skills/<name>/SKILL.md', () => {
    const broken = [];
    for (const f of agentFiles) {
      const data = parseFrontmatter(`agents/${f}`, readFileSync(join(AGENTS_DIR, f), 'utf8'));
      for (const s of data.skills ?? []) {
        if (!existsSync(join(SKILLS_DIR, s, 'SKILL.md'))) broken.push(`agents/${f} → ${s}`);
      }
    }
    assert.deepEqual(broken, [], `skills 引用悬空（预加载将静默失败）: ${broken.join(', ')}`);
  });
});

describe('frontmatter-lint: skills/*/SKILL.md', () => {
  it('skill 清单非空（防目录漂移导致门禁空转）', () => {
    assert.ok(skillDirs.length >= 20, `skills 应 ≥20 个，实际 ${skillDirs.length}`);
  });

  for (const d of skillDirs) {
    it(`${d}/SKILL.md: YAML 严格可解析 + name/description 必填`, () => {
      const file = join(SKILLS_DIR, d, 'SKILL.md');
      assert.ok(existsSync(file), `skills/${d} 缺少 SKILL.md`);
      const data = parseFrontmatter(`skills/${d}/SKILL.md`, readFileSync(file, 'utf8'));
      assert.equal(typeof data.name, 'string', `skills/${d}: name 必须为字符串`);
      assert.ok(data.name.trim(), `skills/${d}: name 不可为空`);
      assert.equal(typeof data.description, 'string', `skills/${d}: description 必须为字符串（含裸 ": " 的 description 是非法 YAML，见 §54）`);
      assert.ok(data.description.trim(), `skills/${d}: description 不可为空`);
    });
  }
});

describe('frontmatter-lint: commands/*.md', () => {
  it('command frontmatter（若有）可解析', () => {
    const files = existsSync(COMMANDS_DIR) ? readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.md')) : [];
    for (const f of files) {
      const text = readFileSync(join(COMMANDS_DIR, f), 'utf8');
      if (extractFrontmatter(text) == null) continue; // 无 frontmatter 的 command 合法
      parseFrontmatter(`commands/${f}`, text);
    }
    assert.ok(true);
  });
});
