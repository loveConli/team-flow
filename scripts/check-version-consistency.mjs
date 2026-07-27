#!/usr/bin/env node
// check-version-consistency.mjs — CI guard: fail if any file has a version
// that doesn't match package.json. Prevents doc/code drift after tf version.
//
// Usage:
//   node scripts/check-version-consistency.mjs          # check only (exit 1 on mismatch)
//   node scripts/check-version-consistency.mjs --fix    # auto-fix skill counts & npx refs
//
// Exit 0: all versions consistent (or fixed successfully)
// Exit 1: mismatches found (lists every file and its version)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const AUTO_FIX = process.argv.includes('--fix');

// Canonical version from package.json
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
const CANONICAL = pkg.version;
if (!CANONICAL || !/^\d+\.\d+\.\d+$/.test(CANONICAL)) {
  console.error('❌ package.json version is missing or invalid');
  process.exit(1);
}

const errors = [];
const fixes = [];

// ── JSON manifests ──
const JSON_CHECKS = [
  { file: 'plugin.json', path: ['version'] },
  { file: '.claude-plugin/plugin.json', path: ['version'] },
  { file: '.claude-plugin/marketplace.json', path: ['plugins', '0', 'version'] },
  { file: '.cursor-plugin/plugin.json', path: ['version'] },
  { file: '.cursor-plugin/marketplace.json', path: ['metadata', 'version'] },
  { file: '.codex-plugin/plugin.json', path: ['version'] },
  { file: 'gemini-extension.json', path: ['version'] },
  { file: '.github/plugin/marketplace.json', path: ['metadata', 'version'] },
  { file: '.github/plugin/marketplace.json', path: ['plugins', '0', 'version'] },
];

for (const check of JSON_CHECKS) {
  const fp = join(ROOT, check.file);
  if (!existsSync(fp)) {
    errors.push({ file: check.file, found: 'FILE_NOT_FOUND', expected: CANONICAL });
    continue;
  }
  try {
    const obj = JSON.parse(readFileSync(fp, 'utf-8'));
    let val = obj;
    for (const p of check.path) val = val?.[p];
    if (val !== CANONICAL) {
      errors.push({ file: `${check.file} [${check.path.join('.')}]`, found: val, expected: CANONICAL });
    }
  } catch (e) {
    errors.push({ file: check.file, found: `PARSE_ERROR: ${e.message}`, expected: CANONICAL });
  }
}

// ── Text files (extraction-pattern check) ──
// Each entry has a regex that extracts ONLY the declared version (capture group 1),
// not historical references like "v0.6.0 起支持".
// Note: CLAUDE.md is intentionally gitignored (project-local AI instructions).
const TEXT_CHECKS = [
  { file: 'README.md',              extract: /当前版本：`v(\d+\.\d+\.\d+)`/ },
  { file: 'INSTALL.md',             extract: /当前发布版本：\*\*v(\d+\.\d+\.\d+)\*\*/ },
  { file: 'docs/README_en.md',      extract: /Current: `v(\d+\.\d+\.\d+)`/ },
  { file: 'hooks/session-start',    extract: /# v(\d+\.\d+\.\d+): conditional injection/ },
  { file: 'llms.txt',               extract: /Current version: v(\d+\.\d+\.\d+)\./ },
  { file: '.claude/always/phase-guard.md', extract: /# team-flow v(\d+\.\d+\.\d+) \|/ },
  { file: 'GEMINI.md',              extract: /# team-flow v(\d+\.\d+\.\d+) \|/ },
];

for (const check of TEXT_CHECKS) {
  const fp = join(ROOT, check.file);
  if (!existsSync(fp)) {
    errors.push({ file: check.file, found: 'FILE_NOT_FOUND', expected: CANONICAL });
    continue;
  }
  const content = readFileSync(fp, 'utf-8');
  const match = content.match(check.extract);
  if (!match) {
    errors.push({ file: check.file, found: 'PATTERN_NOT_MATCHED', expected: CANONICAL });
  } else if (match[1] !== CANONICAL) {
    errors.push({ file: check.file, found: match[1], expected: CANONICAL });
  }
}

const RUNTIME_FILES = [
  'workflow-start', 'need-explorer', 'spec-writer', 'contract-builder',
  'build-executor', 'code-reviewer', 'bug-investigator', 'release-archivist', 'spec-merger',
].map(skill => `skills/${skill}/SKILL.md`).concat([
  'skills/build-executor/implementer-prompt.md',
  'skills/build-executor/task-reviewer-prompt.md',
  'skills/code-reviewer/code-reviewer-prompt.md',
]);
for (const file of RUNTIME_FILES) {
  const fp = join(ROOT, file);
  if (!existsSync(fp)) {
    errors.push({ file, found: 'FILE_NOT_FOUND', expected: CANONICAL });
    continue;
  }
  const versions = [...readFileSync(fp, 'utf8').matchAll(/npx --yes --package @xulthekl\/team-flow@(\d+\.\d+\.\d+) tf/g)]
    .map(match => match[1]);
  if (versions.length === 0) {
    errors.push({ file, found: 'RUNTIME_PREFIX_NOT_FOUND', expected: CANONICAL });
  } else if (versions.some(version => version !== CANONICAL)) {
    errors.push({ file, found: [...new Set(versions)].join(', '), expected: CANONICAL });
  }
}

// ── Skill count consistency ──
// Count actual skill directories under skills/ and compare against the count
// documented in manifests and docs. Prevents skill-count drift after add/remove.
const skillsDir = join(ROOT, 'skills');
const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory());
const ACTUAL_SKILL_COUNT = skillDirs.length;

// JSON manifests: extract the "N skills" number from the description field.
const SKILL_COUNT_JSON_CHECKS = [
  { file: 'plugin.json', path: ['description'], extract: /(\d+) skills/ },
  { file: '.claude-plugin/plugin.json', path: ['description'], extract: /(\d+) skills/ },
];

for (const check of SKILL_COUNT_JSON_CHECKS) {
  const fp = join(ROOT, check.file);
  if (!existsSync(fp)) {
    errors.push({ file: check.file, found: 'FILE_NOT_FOUND', expected: ACTUAL_SKILL_COUNT });
    continue;
  }
  try {
    const obj = JSON.parse(readFileSync(fp, 'utf-8'));
    let val = obj;
    for (const p of check.path) val = val?.[p];
    const match = typeof val === 'string' ? val.match(check.extract) : null;
    if (!match) {
      errors.push({ file: `${check.file} [${check.path.join('.')}]`, found: 'PATTERN_NOT_MATCHED', expected: ACTUAL_SKILL_COUNT });
    } else if (Number(match[1]) !== ACTUAL_SKILL_COUNT) {
      if (AUTO_FIX) {
        // Auto-fix: update skill count in JSON
        const newVal = val.replace(check.extract, `${ACTUAL_SKILL_COUNT} skills`);
        obj[check.path[0]] = newVal;
        writeFileSync(fp, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
        fixes.push(`${check.file}: ${match[1]} → ${ACTUAL_SKILL_COUNT}`);
      } else {
        errors.push({ file: `${check.file} [${check.path.join('.')}]`, found: match[1], expected: ACTUAL_SKILL_COUNT });
      }
    }
  } catch (e) {
    errors.push({ file: check.file, found: `PARSE_ERROR: ${e.message}`, expected: ACTUAL_SKILL_COUNT });
  }
}

// Text files: extract the documented skill count.
const SKILL_COUNT_TEXT_CHECKS = [
  { file: 'README.md', extract: /(\d+) skills/, replace: (content, count) => content.replace(/(\d+) skills/, `${count} skills`) },
  { file: 'AGENTS.md', extract: /Skills 索引（(\d+) 个）/, replace: (content, count) => content.replace(/Skills 索引（(\d+) 个）/, `Skills 索引（${count} 个）`) },
];

for (const check of SKILL_COUNT_TEXT_CHECKS) {
  const fp = join(ROOT, check.file);
  if (!existsSync(fp)) {
    errors.push({ file: check.file, found: 'FILE_NOT_FOUND', expected: ACTUAL_SKILL_COUNT });
    continue;
  }
  const content = readFileSync(fp, 'utf-8');
  const match = content.match(check.extract);
  if (!match) {
    errors.push({ file: check.file, found: 'PATTERN_NOT_MATCHED', expected: ACTUAL_SKILL_COUNT });
  } else if (Number(match[1]) !== ACTUAL_SKILL_COUNT) {
    if (AUTO_FIX) {
      // Auto-fix: update skill count in text
      const newContent = check.replace(content, ACTUAL_SKILL_COUNT);
      writeFileSync(fp, newContent, 'utf-8');
      fixes.push(`${check.file}: ${match[1]} → ${ACTUAL_SKILL_COUNT}`);
    } else {
      errors.push({ file: check.file, found: match[1], expected: ACTUAL_SKILL_COUNT });
    }
  }
}

// ── npx version reference consistency ──
// Scan every skills/*/SKILL.md for `team-flow@X.Y.Z` references and ensure
// each one matches the canonical version. Catches stale npx pins in any skill —
// broader than RUNTIME_FILES above, which only covers the known runtime set.
const SKILL_MD_FILES = skillDirs
  .map(entry => `skills/${entry.name}/SKILL.md`)
  .filter(file => existsSync(join(ROOT, file)));

// Also scan references/ subdirectories for stale npx refs
const REFERENCES_FILES = [];
function scanDir(dir, prefix = '') {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      scanDir(fullPath, relPath);
    } else if (entry.name.endsWith('.md')) {
      REFERENCES_FILES.push(relPath);
    }
  }
}
const refsDir = join(ROOT, 'skills');
for (const skillEntry of skillDirs) {
  const refsPath = join(refsDir, skillEntry.name, 'references');
  if (existsSync(refsPath)) {
    scanDir(refsPath, `skills/${skillEntry.name}/references`);
  }
}

const ALL_SCANNABLE_FILES = [...SKILL_MD_FILES, ...REFERENCES_FILES];

for (const file of ALL_SCANNABLE_FILES) {
  const fp = join(ROOT, file);
  if (!existsSync(fp)) continue;

  const content = readFileSync(fp, 'utf-8');
  const versions = [...content.matchAll(/team-flow@(\d+\.\d+\.\d+)/g)]
    .map(match => match[1]);
  const stale = [...new Set(versions)].filter(version => version !== CANONICAL);

  if (stale.length > 0) {
    if (AUTO_FIX) {
      // Auto-fix: update all stale npx references
      let newContent = content;
      for (const oldVer of stale) {
        newContent = newContent.replaceAll(`team-flow@${oldVer}`, `team-flow@${CANONICAL}`);
      }
      writeFileSync(fp, newContent, 'utf-8');
      fixes.push(`${file}: ${stale.join(', ')} → ${CANONICAL}`);
    } else {
      errors.push({ file, found: stale.join(', '), expected: CANONICAL });
    }
  }
}

// ── Detect new skills not in any manifest ──
const MANIFEST_SKILLS = new Set();
// Extract from plugin.json description
const pluginDesc = pkg.description || '';
const skillListMatch = pluginDesc.match(/(\d+) skills/);
// We'll check AGENTS.md for skill list (table format: | skill-name | ... |)
const agentsMd = readFileSync(join(ROOT, 'AGENTS.md'), 'utf-8');
const skillIndexMatch = agentsMd.match(/## Skills 索引[\s\S]*?(?=##|$)/);
if (skillIndexMatch) {
  // Match table rows: | skill-name | ... |
  const skillNames = [...skillIndexMatch[0].matchAll(/^\|\s*([a-z][a-z0-9-]*)\s*\|/gm)]
    .map(m => m[1])
    .filter(name => name !== 'Skill'); // Skip header row
  skillNames.forEach(name => MANIFEST_SKILLS.add(name));
}

const newSkills = skillDirs
  .map(entry => entry.name)
  .filter(name => !MANIFEST_SKILLS.has(name));

if (newSkills.length > 0) {
  console.warn(`⚠️  New skills detected not in AGENTS.md index: ${newSkills.join(', ')}`);
  console.warn(`   Consider adding them to AGENTS.md Skills 索引`);
}

// ── Post-fix verification (only in --fix mode) ──
// If we made any fixes, re-verify that all fixed files are now consistent.
// This catches cases where auto-fix introduced new issues (e.g., wrong count).
if (AUTO_FIX && fixes.length > 0) {
  console.log('🔍 Verifying fixes...');

  // Re-check skill counts
  for (const check of SKILL_COUNT_JSON_CHECKS) {
    const fp = join(ROOT, check.file);
    if (!existsSync(fp)) continue;
    try {
      const obj = JSON.parse(readFileSync(fp, 'utf-8'));
      let val = obj;
      for (const p of check.path) val = val?.[p];
      const match = typeof val === 'string' ? val.match(check.extract) : null;
      if (match && Number(match[1]) !== ACTUAL_SKILL_COUNT) {
        errors.push({
          file: `${check.file} [${check.path.join('.')}]`,
          found: match[1],
          expected: ACTUAL_SKILL_COUNT,
          note: 'Post-fix verification failed'
        });
      }
    } catch (e) { /* ignore parse errors in verification */ }
  }

  for (const check of SKILL_COUNT_TEXT_CHECKS) {
    const fp = join(ROOT, check.file);
    if (!existsSync(fp)) continue;
    const content = readFileSync(fp, 'utf-8');
    const match = content.match(check.extract);
    if (match && Number(match[1]) !== ACTUAL_SKILL_COUNT) {
      errors.push({
        file: check.file,
        found: match[1],
        expected: ACTUAL_SKILL_COUNT,
        note: 'Post-fix verification failed'
      });
    }
  }

  if (errors.length > 0) {
    console.error('❌ Post-fix verification found remaining issues:');
    for (const e of errors) {
      console.error(`  ${e.file}: expected ${e.expected}, found ${e.found}`);
    }
    console.error('\nAuto-fix may have introduced errors. Please fix manually.');
    process.exit(1);
  }

  console.log('✅ All fixes verified\n');
}

// ── Report ──
if (fixes.length > 0) {
  console.log(`🔧 Auto-fixed ${fixes.length} issue(s):`);
  for (const fix of fixes) {
    console.log(`   ${fix}`);
  }
  console.log('');
}

if (errors.length === 0) {
  const msg = fixes.length > 0
    ? `✅ Version consistency check passed after auto-fix — all files at ${CANONICAL}`
    : `✅ Version consistency check passed — all files at ${CANONICAL}`;
  console.log(msg);
  process.exit(0);
}

console.log(`❌ Version consistency check FAILED — canonical version is ${CANONICAL}\n`);
console.log('Mismatches found:');
for (const e of errors) {
  console.log(`  ${e.file}`);
  console.log(`    expected: ${e.expected}`);
  console.log(`    found:    ${e.found}`);
}
console.log(`\nRun: npm run check-versions -- --fix`);
console.log(`Then manually verify and commit.`);
process.exit(1);
