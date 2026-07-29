// Config loader for team-flow
// Loads team-flow.config.json and merges with built-in defaults.
// Lookup order: (1) projectRoot, (2) git root, (3) home directory.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const DEFAULTS = {
  artifacts: {
    order: ['proposal', 'specs', 'design', 'tasks'],
    skip: [],
  },
  execution: {
    inlineThreshold: 3,
    abandonmentReasonMinLength: 50,
    defaultLanguage: 'auto',
  },
  verification: {
    language: 'auto',
  },
  prd: {
    template: 'templates/prd.md',
  },
};

export const MODEL_PROFILES = Object.freeze([
  'mechanical', 'standard', 'strong', 'review',
]);

export function resolveModelProfile(config, profile) {
  if (!MODEL_PROFILES.includes(profile)) {
    throw new Error(
      `Unknown model profile '${profile}'. Supported profiles: ${MODEL_PROFILES.join(', ')}`,
    );
  }

  const models = config?.models;
  if (!models || !Object.hasOwn(models, profile)) {
    return { profile, model: null, configured: false };
  }

  const model = models[profile];
  if (typeof model !== 'string' || model.trim().length === 0) {
    throw new Error(`Invalid model profile: models.${profile} must be a non-empty string`);
  }

  return { profile, model, configured: true };
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function findConfigFile(startDir) {
  // 1. Check .team-flow/ directory (preferred location)
  const teamFlowDir = join(startDir, '.team-flow', 'team-flow.config.json');
  if (existsSync(teamFlowDir)) return teamFlowDir;

  // 2. Check startDir (legacy location, for backward compatibility)
  const direct = join(startDir, 'team-flow.config.json');
  if (existsSync(direct)) return direct;

  // 3. Check git root
  try {
    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: startDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const gitPath = join(gitRoot, 'team-flow.config.json');
    if (existsSync(gitPath)) return gitPath;
  } catch {
    // Not a git repo — skip
  }

  // 4. Check home directory
  const homePath = join(process.env.HOME || '', 'team-flow.config.json');
  if (existsSync(homePath)) return homePath;

  return null;
}

export function loadConfig(projectRoot) {
  const configPath = findConfigFile(projectRoot || process.cwd());
  if (!configPath) return { ...DEFAULTS };

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(raw);
    return deepMerge(DEFAULTS, userConfig);
  } catch {
    return { ...DEFAULTS };
  }
}

export function getDefaults() {
  return JSON.parse(JSON.stringify(DEFAULTS));
}
