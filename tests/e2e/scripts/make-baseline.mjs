#!/usr/bin/env node
// tests/e2e/scripts/make-baseline.mjs
// 一次性创建 vrm4teamflow 冻结基线归档（LT 决策⑥）。用法：npm run test:e2e:baseline
// 源工作区/归档路径可用 TF_E2E_VRM / TF_E2E_BASELINE 环境变量覆盖。
import { createBaseline, DEFAULT_VRM_DIR, DEFAULT_BASELINE } from '../helpers/workspace.mjs';

try {
  const archive = createBaseline();
  console.log(`✅ 基线归档已创建: ${archive}`);
  console.log(`   源工作区: ${DEFAULT_VRM_DIR}`);
  console.log(`   默认归档: ${DEFAULT_BASELINE}`);
} catch (e) {
  console.error(`❌ 基线归档创建失败: ${e.message}`);
  process.exit(1);
}
