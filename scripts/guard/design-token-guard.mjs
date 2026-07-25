#!/usr/bin/env node
// design-token-guard.mjs — 设计系统完整性检查（v0.18.0）
//
// Validates that a design-system.md is structurally complete and that a
// design-tokens.css provides the token coverage the prototype skill relies on
// (A1 identity tokens, A2 derived state tokens, B-slot alias tokens).
//
// Usage: node scripts/guard/design-token-guard.mjs <design-system.md path> [design-tokens.css path]
//   Exit 0: PASS — all required checks satisfied
//   Exit 1: FAIL — one or more issues found (listed in the report)

import { readFileSync, existsSync } from 'node:fs';

// ── Check definitions ──

// The 9 required ## sections in design-system.md.
const REQUIRED_SECTIONS = [
  'color', 'typography', 'spacing', 'layout', 'components',
  'motion', 'voice', 'brand', 'anti-patterns',
];

// Optional ## sections — reported for visibility, never counted as failures.
const OPTIONAL_SECTIONS = ['palette', 'aliases', 'extensions'];

// The 5 palette directions checked when a palette section exists.
const PALETTE_DIRECTIONS = ['neutral', 'primary', 'success', 'warning', 'danger'];

// A1 identity tokens — 8 required in design-tokens.css.
const A1_IDENTITY_TOKENS = [
  '--bg', '--surface', '--fg', '--muted', '--border',
  '--accent', '--font-display', '--font-body',
];

// A2 derived state tokens — must be defined via a color-mix() formula.
const A2_DERIVED_TOKENS = ['--accent-hover', '--accent-active', '--focus-ring', '--elev-raised'];

// B-slot alias tokens — each should resolve (via var()) to its base token.
const B_SLOT_ALIASES = [
  { token: '--fg-2', base: '--fg' },
  { token: '--meta', base: '--muted' },
  { token: '--border-soft', base: '--border' },
  { token: '--surface-warm', base: '--surface' },
];

// ── Helpers ──

// Read a file as UTF-8, or return null when it does not exist.
function readFileOrNull(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8');
}

// Collect the lower-cased text of every level-2 ("## ") markdown header.
function extractH2Headers(markdown) {
  return markdown
    .split('\n')
    .filter(line => /^##\s+/.test(line) && !/^###/.test(line))
    .map(line => line.replace(/^##\s+/, '').trim().toLowerCase());
}

// True when any ## header mentions the given section name.
function hasSection(headers, section) {
  return headers.some(header => header.includes(section));
}

// Return the body of a section (text between its ## header and the next ##
// header or EOF), lower-cased; null when the section is absent.
function sectionBody(markdown, section) {
  const lines = markdown.split('\n');
  const startIdx = lines.findIndex(
    line => /^##\s+/.test(line) && !/^###/.test(line) &&
      line.replace(/^##\s+/, '').trim().toLowerCase().includes(section),
  );
  if (startIdx === -1) return null;
  const body = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i]) && !/^###/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n').toLowerCase();
}

// Escape a token name for safe use inside a RegExp (names contain "--").
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Return the declared value of a CSS custom property, or null when absent.
function getTokenValue(css, name) {
  const match = css.match(new RegExp(`${escapeRegExp(name)}\\s*:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

// Extract the var(--x) reference from a token value, if present.
function extractVarTarget(value) {
  const match = value.match(/var\(\s*(--[a-z0-9-]+)/i);
  return match ? match[1] : null;
}

// ── Report accumulation ──

const issues = [];
function line(text = '') { console.log(text); }
function pass(text) { line(`  ✅ ${text}`); }
function fail(text) { issues.push(text); line(`  ❌ ${text}`); }

// ── Argument parsing ──

const mdPath = process.argv[2];
const cssPath = process.argv[3];

if (!mdPath) {
  console.error('Usage: node scripts/guard/design-token-guard.mjs <design-system.md path> [design-tokens.css path]');
  process.exit(1);
}

const markdown = readFileOrNull(mdPath);
const css = cssPath ? readFileOrNull(cssPath) : null;

line('Design Token Guard v0.18.0');
line('==========================');
line(`design-system.md: ${mdPath}`);
line(`design-tokens.css: ${cssPath || 'not provided'}`);
line();

// ── File availability ──

if (markdown === null) {
  fail(`design-system.md not found: ${mdPath}`);
}
if (cssPath && css === null) {
  fail(`design-tokens.css not found: ${cssPath}`);
}

// ── 9-Section Check ──

line('## 9-Section Check');
if (markdown === null) {
  for (const section of REQUIRED_SECTIONS) fail(`${section} — MISSING (file not found)`);
} else {
  const headers = extractH2Headers(markdown);
  for (const section of REQUIRED_SECTIONS) {
    if (hasSection(headers, section)) pass(section);
    else fail(`${section} — MISSING`);
  }
  // Optional sections: report presence only, never fail.
  for (const section of OPTIONAL_SECTIONS) {
    if (hasSection(headers, section)) line(`  ℹ️  ${section} (optional, present)`);
  }
}
line();

// ── Palette Check (5 directions) ──

line('## Palette Check (5 directions)');
if (markdown === null) {
  line('  ⏭️  skipped — design-system.md not found');
} else {
  const palette = sectionBody(markdown, 'palette');
  if (palette === null) {
    line('  ⏭️  skipped — no palette section (optional)');
  } else {
    for (const direction of PALETTE_DIRECTIONS) {
      if (palette.includes(direction)) pass(direction);
      else fail(`${direction} — MISSING`);
    }
  }
}
line();

// ── A1 Identity Tokens ──

line('## A1 Identity Tokens (8 required)');
if (css === null) {
  line(`  ⏭️  skipped — design-tokens.css ${cssPath ? 'not found' : 'not provided'}`);
} else {
  for (const token of A1_IDENTITY_TOKENS) {
    if (getTokenValue(css, token) !== null) pass(token);
    else fail(`${token} — MISSING`);
  }
}
line();

// ── A2 Derived Tokens ──

line('## A2 Derived Tokens');
if (css === null) {
  line(`  ⏭️  skipped — design-tokens.css ${cssPath ? 'not found' : 'not provided'}`);
} else {
  for (const token of A2_DERIVED_TOKENS) {
    const value = getTokenValue(css, token);
    if (value === null) {
      fail(`${token} — MISSING`);
    } else if (/color-mix\(/i.test(value)) {
      pass(`${token} (color-mix found)`);
    } else {
      fail(`${token} — no color-mix formula`);
    }
  }
}
line();

// ── B-Slot Aliases ──

line('## B-Slot Aliases');
if (css === null) {
  line(`  ⏭️  skipped — design-tokens.css ${cssPath ? 'not found' : 'not provided'}`);
} else {
  for (const { token, base } of B_SLOT_ALIASES) {
    const value = getTokenValue(css, token);
    if (value === null) {
      fail(`${token} — MISSING`);
      continue;
    }
    const target = extractVarTarget(value);
    if (target === base) {
      pass(`${token} → var(${target})`);
    } else if (target) {
      // Alias exists but points somewhere other than the expected base token.
      fail(`${token} → var(${target}) (expected var(${base}))`);
    } else {
      // Defined as a literal value rather than an alias to the base token.
      pass(`${token} = ${value}`);
    }
  }
}
line();

// ── Verdict ──

if (issues.length === 0) {
  line('Verdict: PASS');
  process.exit(0);
}

line(`Verdict: FAIL (${issues.length} issue${issues.length === 1 ? '' : 's'})`);
process.exit(1);
