// tf doctor — health check for team-flow installation and project
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config-loader.mjs';
import { PLATFORM_RUNTIME_INVENTORY } from './platform-runtime-inventory.mjs';
// 非法 state 巡检所需的共享常量与读取器(来源:workflow-feedback 2026-08-01,#100004)。
import { readState, VALID_STATES } from './state-loader.mjs';

const RUNTIME_SKILLS = new Set([
  'workflow-start', 'need-explorer', 'spec-writer', 'contract-builder',
  'build-executor', 'code-reviewer', 'bug-investigator', 'release-archivist', 'spec-merger',
]);

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(readFileSync(filePath, 'utf-8')); } catch { return null; }
}

function checkVersionConsistency(root) {
  const files = [
    { name: 'package.json', path: ['version'] },
    { name: 'plugin.json', path: ['version'] },
    { name: '.claude-plugin/plugin.json', path: ['version'] },
    { name: '.claude-plugin/marketplace.json', path: ['plugins', '0', 'version'] },
    { name: '.cursor-plugin/plugin.json', path: ['version'] },
    { name: '.cursor-plugin/marketplace.json', path: ['metadata', 'version'] },
    { name: '.codex-plugin/plugin.json', path: ['version'] },
    { name: 'gemini-extension.json', path: ['version'] },
    { name: '.github/plugin/marketplace.json', path: ['metadata', 'version'] },
    { name: '.github/plugin/marketplace.json', path: ['plugins', '0', 'version'] },
  ];

  const versions = {};
  for (const f of files) {
    const key = `${f.name}:${f.path.join('.')}`;
    const data = readJsonIfExists(join(root, f.name));
    if (!data) { versions[key] = null; continue; }
    let val = data;
    for (const p of f.path) val = val?.[p];
    versions[key] = val || null;
  }

  const uniqueVersions = [...new Set(Object.values(versions).filter(Boolean))];
  const pkgVersion = versions['package.json:version'];

  if (uniqueVersions.length <= 1) {
    return { pass: true, message: `Version: ${pkgVersion} (consistent across ${Object.keys(versions).filter(k => versions[k]).length} manifest fields)` };
  }
  const mismatches = Object.entries(versions)
    .filter(([, v]) => v !== pkgVersion)
    .map(([name, v]) => `${name}=${v}`)
    .join(', ');
  return { pass: false, message: `Version mismatch: ${pkgVersion} (package.json) vs ${mismatches}` };
}

function checkHooks(root) {
  const hooksPath = join(root, 'hooks', 'hooks.json');
  if (!existsSync(hooksPath)) {
    return { pass: false, message: 'hooks/hooks.json not found' };
  }
  try {
    const hooks = JSON.parse(readFileSync(hooksPath, 'utf-8'));
    if (hooks.hooks && typeof hooks.hooks === 'object' && !Array.isArray(hooks.hooks)) {
      return { pass: true, message: 'valid format' };
    }
    return { pass: false, message: 'invalid format (expected record, got ' + typeof hooks.hooks + ')' };
  } catch (e) {
    return { pass: false, message: `parse error: ${e.message}` };
  }
}

function checkCodexManifest(root) {
  const manifestPath = join(root, '.codex-plugin', 'plugin.json');
  const manifest = readJsonIfExists(manifestPath);
  if (!manifest) {
    return { pass: false, message: '.codex-plugin/plugin.json not found' };
  }
  if (JSON.stringify(manifest.hooks) !== '{}') {
    return {
      pass: false,
      message: 'Codex manifest must set hooks to {} to suppress hooks/hooks.json auto-discovery',
    };
  }
  if (manifest.interface?.category !== 'Developer Tools') {
    return { pass: false, message: 'Codex category should be Developer Tools' };
  }
  return { pass: true, message: 'hooks suppressed, category Developer Tools' };
}

function checkSkills(root) {
  const skillsDir = join(root, 'skills');
  if (!existsSync(skillsDir)) {
    return { pass: false, message: 'skills/ directory not found' };
  }
  const dirs = readdirSync(skillsDir).filter(f => {
    try { return statSync(join(skillsDir, f)).isDirectory(); } catch { return false; }
  });
  const withSkillMd = dirs.filter(d => existsSync(join(skillsDir, d, 'SKILL.md')));
  if (withSkillMd.length === dirs.length) {
    return { pass: true, message: `${dirs.length}/${dirs.length} present` };
  }
  const missing = dirs.filter(d => !withSkillMd.includes(d));
  return { pass: false, message: `${withSkillMd.length}/${dirs.length} present, missing SKILL.md: ${missing.join(', ')}` };
}

function localRuntimePaths(content) {
  const doubleQuoted = [...content.matchAll(/node\s+"([^"]+\/scripts\/team-flow\.mjs)"/g)]
    .map(match => match[1]);
  const singleQuoted = [...content.matchAll(/node\s+'(.+\/scripts\/team-flow\.mjs)'/g)]
    .map(match => match[1].split("'\\''").join("'"));
  return [...doubleQuoted, ...singleQuoted];
}

function checkRuntimeDistribution(root) {
  const pkg = readJsonIfExists(join(root, 'package.json'));
  const skillsDir = join(root, 'skills');
  if (!pkg?.version || !existsSync(skillsDir)) {
    return { pass: false, message: 'runtime distribution cannot be checked: package.json or skills/ is missing; reinstall team-flow' };
  }

  const canonicalPrefix = "tf";
  const issues = [];
  for (const name of readdirSync(skillsDir)) {
    if (!RUNTIME_SKILLS.has(name)) continue;
    const skillPath = join(skillsDir, name, 'SKILL.md');
    if (!existsSync(skillPath)) continue;
    const content = readFileSync(skillPath, 'utf8');
    if (/\$\{CLAUDE_PLUGIN_ROOT\}|\$\{PLUGIN_ROOT\}/.test(content)) {
      issues.push(`${name}: plugin-root placeholder remains`);
      continue;
    }
    if (content.includes(canonicalPrefix)) continue;
    const localPaths = localRuntimePaths(content);
    if (localPaths.length > 0) {
      if (localPaths.every(existsSync)) continue;
      issues.push(`${name}: local runtime tree is missing`);
      continue;
    }
    issues.push(`${name}: runtime prefix or local runtime tree is missing`);
  }

  if (issues.length > 0) {
    return { pass: false, message: `${issues.join('; ')}; reinstall or upgrade team-flow instead of editing skill files manually` };
  }
  return { pass: true, message: `${PLATFORM_RUNTIME_INVENTORY.length} platforms inventoried; canonical skills and local runtime are resolvable` };
}

function checkDist(root) {
  const distDir = join(root, 'dist');
  if (!existsSync(distDir)) {
    return { pass: false, message: 'dist/ not found (run npm run build)' };
  }
  const indexJs = join(distDir, 'index.js');
  if (!existsSync(indexJs)) {
    return { pass: false, message: 'dist/index.js not found' };
  }
  return { pass: true, message: 'compiled' };
}

function checkRootPluginAuthor(root) {
  const pluginPath = join(root, 'plugin.json');
  const plugin = readJsonIfExists(pluginPath);
  if (!plugin) {
    return { pass: false, message: 'plugin.json not found' };
  }
  if (!plugin.author) {
    return { pass: false, message: 'missing author field' };
  }
  if (typeof plugin.author === 'string') {
    return { pass: false, message: 'author must be an object (got string)' };
  }
  if (typeof plugin.author === 'object' && !Array.isArray(plugin.author) && plugin.author.name) {
    return { pass: true, message: `author.name = ${plugin.author.name}` };
  }
  return { pass: false, message: 'author object must contain a name property' };
}

function checkNodeVersion(version = process.version) {
  const major = parseInt(version.slice(1).split('.')[0], 10);
  if (major >= 20) {
    return { pass: true, message: version };
  }
  return { pass: false, message: `${version} (requires >= 20)` };
}

function checkDocs(root) {
  const warnings = [];
  const pkg = readJsonIfExists(join(root, 'package.json'));
  if (!pkg) return { pass: true, message: 'skipped (no package.json)' };

  const pkgVersion = pkg.version;

  // Check CHANGELOG has current version
  const changelogPath = join(root, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    const changelog = readFileSync(changelogPath, 'utf-8');
    if (!changelog.includes(`## [${pkgVersion}]`)) {
      warnings.push(`CHANGELOG.md missing entry for v${pkgVersion}`);
    }
  }

  // Check skills count in README
  const readmePath = join(root, 'README.md');
  if (existsSync(readmePath)) {
    const skillsDir = join(root, 'skills');
    if (existsSync(skillsDir)) {
      const actualSkills = readdirSync(skillsDir).filter(f => {
        try { return statSync(join(skillsDir, f)).isDirectory(); } catch { return false; }
      }).length;
      const readme = readFileSync(readmePath, 'utf-8');
      // Count skill table rows (pattern: | N | `skill-name` | where N is a row number)
      const skillRefs = readme.match(/\|\s*\d+\s*\|\s*`[a-z-]+`/g) || [];
      if (skillRefs.length > 0 && skillRefs.length !== actualSkills) {
        warnings.push(`README lists ${skillRefs.length} skills, but skills/ has ${actualSkills}`);
      }
    }
  }

  if (warnings.length === 0) {
    return { pass: true, message: 'consistent' };
  }
  return { pass: false, message: warnings.join('; ') };
}

// 非法 state 巡检(来源:workflow-feedback 2026-08-01,#100004):
// 扫描 changes/<name>/.team-flow.yaml,若 state 字段不在 VALID_STATES 则报 FAIL。
// 非法值通常由子代理绕过 CLI 直接 Edit .team-flow.yaml 导致,提示修复为合法值。
// 沿用 checkSkills 的目录扫描 + 计数报告风格。
function checkChangeStates(root) {
  const changesDir = join(root, 'changes');
  if (!existsSync(changesDir)) {
    return { pass: true, message: 'no changes/ directory (skipped)' };
  }
  const dirs = readdirSync(changesDir).filter(f => {
    try { return statSync(join(changesDir, f)).isDirectory(); } catch { return false; }
  });
  const invalid = [];
  let checked = 0;
  for (const d of dirs) {
    if (!existsSync(join(changesDir, d, '.team-flow.yaml'))) continue;
    checked += 1;
    const current = readState(join(changesDir, d)).state;
    if (!VALID_STATES.includes(current)) {
      invalid.push(`${d}='${current}'`);
    }
  }
  if (checked === 0) {
    return { pass: true, message: 'no state files under changes/ (skipped)' };
  }
  if (invalid.length > 0) {
    return {
      pass: false,
      message:
        `state 值非法(可能是子代理绕过 CLI 直接 Edit .team-flow.yaml 所致):${invalid.join('; ')}。` +
        `请修复为合法值:${VALID_STATES.join('/')}`,
    };
  }
  return { pass: true, message: `${checked} change(s) have legal state values` };
}

// v0.13 §52 B4 测试门禁卫生巡检（C1-domain-policy 事件修复）：
// 1. test_matrix_skipped=true 必须附 test_matrix_skip_reason（可审计豁免）；
// 2. 状态引用的产物文件必须存在（arch_review_report / test_evidence_path）——
//    C1 现场曾出现 arch_review_report 指向不存在的 auto-review.md。
// DP 时间戳顺序检查评估后未纳入：closing 后的 DP-7 时间戳晚于 last_transition 属合法，
//  blanket 检查会误报，收益不抵风险。
function checkChangeTestGates(root) {
  const changesDir = join(root, 'changes');
  if (!existsSync(changesDir)) {
    return { pass: true, message: 'no changes/ directory (skipped)' };
  }
  const dirs = readdirSync(changesDir).filter(f => {
    try { return statSync(join(changesDir, f)).isDirectory(); } catch { return false; }
  });
  const issues = [];
  let checked = 0;
  for (const d of dirs) {
    const changeDir = join(changesDir, d);
    if (!existsSync(join(changeDir, '.team-flow.yaml'))) continue;
    checked += 1;
    const state = readState(changeDir);
    if (state.test_matrix_skipped === 'true'
      && !(typeof state.test_matrix_skip_reason === 'string' && state.test_matrix_skip_reason.trim())) {
      issues.push(`${d}: test_matrix_skipped=true without test_matrix_skip_reason`);
    }
    for (const field of ['arch_review_report', 'test_evidence_path']) {
      const ref = state[field];
      if (typeof ref === 'string' && ref.trim() && !existsSync(join(changeDir, ref))) {
        issues.push(`${d}: ${field} references missing file '${ref}'`);
      }
    }
  }
  if (checked === 0) {
    return { pass: true, message: 'no state files under changes/ (skipped)' };
  }
  if (issues.length > 0) {
    return { pass: false, message: issues.join('; ') };
  }
  return { pass: true, message: `${checked} change(s) pass test-gate hygiene (skip reasons + artifact references)` };
}

// v0.36.3 建议项：arch-state / iterations 一致性体检
// 1. arch_baseline 已打戳但 iterations/ 无任何产品级快照 → arch 门禁将 FAIL（需回 ARCH 补快照）
// 2. SKIPPED 与快照并存 → 语义矛盾
function checkArchState(root) {
  const warnings = [];
  const archStatePath = join(root, '.team-flow', 'arch-state.json');
  const iterationsDir = join(root, 'docs', 'architecture', 'iterations');
  if (existsSync(archStatePath)) {
    const hasSnapshot = existsSync(iterationsDir)
      && readdirSync(iterationsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .some(d => existsSync(join(iterationsDir, d.name, 'architecture.md')));
    if (!hasSnapshot) {
      warnings.push('arch_baseline 已打戳但 iterations/ 无产品级快照——arch-readiness/arch-snapshot 门禁将 FAIL，需回 ARCH 阶段补快照');
    }
  }
  if (existsSync(iterationsDir)) {
    for (const d of readdirSync(iterationsDir, { withFileTypes: true }).filter(x => x.isDirectory())) {
      const hasSkip = existsSync(join(iterationsDir, d.name, 'SKIPPED'));
      const hasSnap = existsSync(join(iterationsDir, d.name, 'architecture.md'));
      if (hasSkip && hasSnap) warnings.push(`${d}: SKIPPED 与快照并存，语义矛盾`);
    }
  }
  return { pass: warnings.length === 0, message: warnings.length ? warnings.join('; ') : 'arch-state/iterations 一致' };
}

export async function run(args) {
  const root = process.cwd();
  const config = loadConfig(root);

  console.log('team-flow doctor:\n');

  const checks = [
    ['Version', checkVersionConsistency(root)],
    ['Root plugin author', checkRootPluginAuthor(root)],
    ['Hooks', checkHooks(root)],
    ['Codex manifest', checkCodexManifest(root)],
    ['Skills', checkSkills(root)],
    ['Runtime distribution', checkRuntimeDistribution(root)],
    ['dist/', checkDist(root)],
    ['Node.js', checkNodeVersion()],
    ['Docs', checkDocs(root)],
    ['Change states', checkChangeStates(root)],
    ['Change test gates', checkChangeTestGates(root)],
  ['Arch state', checkArchState(root)],
  ];

  // Config check
  const configPath = join(root, 'team-flow.config.json');
  if (existsSync(configPath)) {
    try {
      JSON.parse(readFileSync(configPath, 'utf-8'));
      checks.push(['Config', { pass: true, message: 'valid JSON' }]);
    } catch (e) {
      checks.push(['Config', { pass: false, message: `invalid JSON: ${e.message}` }]);
    }
  }

  let hasFailure = false;
  for (const [name, result] of checks) {
    const icon = result.pass ? '✅' : '⚠️ ';
    console.log(`  ${icon} ${name}: ${result.message}`);
    if (!result.pass) hasFailure = true;
  }

  console.log('');
  if (hasFailure) {
    console.log('⚠️  Some checks need attention.');
  } else {
    console.log('✅ All checks passed.');
  }
}

export { checkVersionConsistency, checkHooks, checkCodexManifest, checkSkills, checkRuntimeDistribution, checkDist, checkRootPluginAuthor, checkNodeVersion, checkDocs, checkChangeStates, checkChangeTestGates };
