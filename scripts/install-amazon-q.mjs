#!/usr/bin/env node
// scripts/install-amazon-q.mjs — deploy team-flow for Amazon Q Developer CLI
// Skills → .amazonq/skills/, phase-guard rule → .amazonq/rules/phase-guard.md
import { installPlatform } from './lib/install.mjs';

installPlatform('amazon-q').catch(err => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
