#!/usr/bin/env node
// scripts/lib/conventions-generator.mjs — conventions 生成器（v0.34.0 新增）
//
// 根据项目技术栈自动生成测试规范 conventions，符合 glaf4-test 要求。
// 支持存量项目（自动识别）和全新项目（交互式引导）。
//
// 使用方式：
//   node scripts/lib/conventions-generator.mjs --root <项目根目录> [--interactive]
//
// 设计来源：test-capability-enhancement-design v1.0 §四

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path, { join } from 'node:path';
import { parseArgs } from 'node:util';

// ── 常量 ─────────────────────────────────────────────────────────────────────

const TEMPLATE_DIR = join(import.meta.dirname, '../../templates/conventions');
const GLAF4_TEMPLATE_DIR = join(TEMPLATE_DIR, 'glaf4-compliant');

// 技术栈检测特征
const TECH_STACK_SIGNATURES = {
  java: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
  javascript: ['package.json', 'yarn.lock', 'pnpm-lock.yaml'],
  python: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
};

// 测试框架检测特征
const TEST_FRAMEWORK_SIGNATURES = {
  'junit5-mockito': { file: 'pom.xml', content: /junit-jupiter|org\.junit\.jupiter/ },
  jest: { file: 'package.json', content: /"jest"|"@jest\/|vitest/ },
  pytest: { file: 'requirements.txt', content: /pytest/ },
};

// 应用框架检测特征
const APP_FRAMEWORK_SIGNATURES = {
  'spring-boot': { file: 'pom.xml', content: /spring-boot|org\.springframework\.boot/ },
  express: { file: 'package.json', content: /"express"/ },
  django: { file: 'requirements.txt', content: /django/ },
};

// ── 技术栈检测 ─────────────────────────────────────────────────────────────

/**
 * 检测项目技术栈
 * @param {string} root 项目根目录
 * @returns {{ language: string|null, buildTool: string|null, testFramework: string|null, appFramework: string|null }}
 */
export function detectTechStack(root) {
  const result = {
    language: null,
    buildTool: null,
    testFramework: null,
    appFramework: null,
  };

  // 检测语言
  for (const [lang, files] of Object.entries(TECH_STACK_SIGNATURES)) {
    if (files.some(f => existsSync(join(root, f)))) {
      result.language = lang;
      break;
    }
  }

  // 检测构建工具
  if (existsSync(join(root, 'pom.xml'))) result.buildTool = 'maven';
  else if (existsSync(join(root, 'build.gradle')) || existsSync(join(root, 'build.gradle.kts'))) result.buildTool = 'gradle';
  else if (existsSync(join(root, 'package.json'))) result.buildTool = 'npm';
  else if (existsSync(join(root, 'yarn.lock'))) result.buildTool = 'yarn';
  else if (existsSync(join(root, 'pnpm-lock.yaml'))) result.buildTool = 'pnpm';
  else if (existsSync(join(root, 'requirements.txt')) || existsSync(join(root, 'pyproject.toml'))) result.buildTool = 'pip';
  else if (existsSync(join(root, 'Pipfile'))) result.buildTool = 'pipenv';

  // 检测测试框架
  for (const [fw, sig] of Object.entries(TEST_FRAMEWORK_SIGNATURES)) {
    const filePath = join(root, sig.file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      if (sig.content.test(content)) {
        result.testFramework = fw;
        break;
      }
    }
  }

  // 检测应用框架
  for (const [fw, sig] of Object.entries(APP_FRAMEWORK_SIGNATURES)) {
    const filePath = join(root, sig.file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      if (sig.content.test(content)) {
        result.appFramework = fw;
        break;
      }
    }
  }

  return result;
}

// ── 模板选择 ─────────────────────────────────────────────────────────────

/**
 * 根据技术栈选择 conventions 模板
 * @param {{ language: string|null, buildTool: string|null, testFramework: string|null, appFramework: string|null }} techStack
 * @returns {string[]} 模板文件名列表
 */
export function selectTemplates(techStack) {
  const templates = [];

  if (techStack.language === 'java') {
    // Java 项目：使用 glaf4-compliant 模板
    if (existsSync(join(GLAF4_TEMPLATE_DIR, 'java-testing.md'))) {
      templates.push('glaf4-compliant/java-testing.md');
    }
    if (techStack.appFramework === 'spring-boot') {
      if (existsSync(join(GLAF4_TEMPLATE_DIR, 'spring-patterns.md'))) {
        templates.push('glaf4-compliant/spring-patterns.md');
      }
    }
  } else if (techStack.language === 'javascript') {
    templates.push('js-testing.md');
  } else if (techStack.language === 'python') {
    templates.push('python-testing.md');
  }

  return templates;
}

// ── conventions 生成 ─────────────────────────────────────────────────────

/**
 * 生成 conventions 文件
 * @param {string} root 项目根目录
 * @param {{ language: string|null, buildTool: string|null, testFramework: string|null, appFramework: string|null }} techStack
 * @param {string[]} templates 模板文件名列表
 * @returns {{ created: string[], skipped: string[] }}
 */
export function generateConventions(root, techStack, templates) {
  const conventionsDir = join(root, '.team-flow', 'conventions');
  const versionsFile = join(conventionsDir, '.versions.json');

  // 创建目录
  mkdirSync(conventionsDir, { recursive: true });

  // 读取现有版本信息
  let versions = {};
  if (existsSync(versionsFile)) {
    try {
      versions = JSON.parse(readFileSync(versionsFile, 'utf-8'));
    } catch {
      versions = {};
    }
  }
  if (!versions.conventions) versions.conventions = {};

  const created = [];
  const skipped = [];

  for (const template of templates) {
    const templatePath = join(TEMPLATE_DIR, template);
    const fileName = path.basename(template);
    const targetPath = join(conventionsDir, fileName);

    // 检查是否已存在且未自定义
    if (existsSync(targetPath)) {
      const existingVersion = versions.conventions[fileName];
      if (existingVersion && !existingVersion.customized) {
        // 读取模板版本
        const templateContent = readFileSync(templatePath, 'utf-8');
        const versionMatch = templateContent.match(/version:\s*(\d+\.\d+\.\d+)/);
        const templateVersion = versionMatch ? versionMatch[1] : '1.0.0';

        if (existingVersion.source_version === templateVersion) {
          skipped.push(fileName);
          continue;
        }
      }
    }

    // 复制模板
    const templateContent = readFileSync(templatePath, 'utf-8');
    writeFileSync(targetPath, templateContent, 'utf-8');

    // 更新版本信息
    const versionMatch = templateContent.match(/version:\s*(\d+\.\d+\.\d+)/);
    const templateVersion = versionMatch ? versionMatch[1] : '1.0.0';

    versions.conventions[fileName] = {
      source_version: templateVersion,
      installed_at: new Date().toISOString().split('T')[0],
      customized: false,
      last_checked: new Date().toISOString().split('T')[0],
      source: template,
    };

    created.push(fileName);
  }

  // 写入版本信息
  writeFileSync(versionsFile, JSON.stringify(versions, null, 2), 'utf-8');

  return { created, skipped };
}

// ── 更新 team-flow.config.json ─────────────────────────────────────────

/**
 * 更新 team-flow.config.json 的 conventions 字段
 * @param {string} root 项目根目录
 * @param {string[]} conventionsFiles conventions 文件名列表
 */
export function updateConfig(root, conventionsFiles) {
  const teamFlowDir = join(root, '.team-flow');
  const configPath = join(teamFlowDir, 'team-flow.config.json');

  // 确保目录存在
  mkdirSync(teamFlowDir, { recursive: true });

  let config = {};
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
      config = {};
    }
  }

  if (!config.conventions) config.conventions = {};

  for (const file of conventionsFiles) {
    const key = file.replace(/\.md$/, '').replace(/\//g, '-');
    config.conventions[key] = `.team-flow/conventions/${file}`;
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

// ── 交互式引导 ─────────────────────────────────────────────────────────────

/**
 * 交互式引导用户选择技术栈（全新项目）
 * @returns {Promise<{ language: string, buildTool: string, testFramework: string, appFramework: string }>}
 */
export async function interactiveSetup() {
  // 注意：在实际使用中，这里需要使用 readline 或 inquirer 等库
  // 这里提供默认值，实际实现需要集成到 workflow-bootstrap 的交互流程中
  console.log('\n=== 全新项目技术栈配置 ===\n');
  console.log('由于当前为脚本模式，使用默认配置：');
  console.log('  - 编程语言：Java');
  console.log('  - 构建工具：Maven');
  console.log('  - 测试框架：JUnit 5 + Mockito');
  console.log('  - 应用框架：Spring Boot');
  console.log('\n如需自定义配置，请在 workflow-bootstrap 中使用交互式模式。\n');

  return {
    language: 'java',
    buildTool: 'maven',
    testFramework: 'junit5-mockito',
    appFramework: 'spring-boot',
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

export async function run(args) {
  const { positionals, values } = parseArgs({
    args,
    options: {
      root: { type: 'string', default: '.' },
      interactive: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  const root = path.resolve(values.root);

  // 检查项目根目录
  if (!existsSync(root)) {
    console.error(`项目根目录不存在: ${root}`);
    process.exit(1);
  }

  // 检查 conventions 是否已存在
  const conventionsDir = join(root, '.team-flow', 'conventions');
  if (existsSync(conventionsDir) && readdirSync(conventionsDir).length > 0) {
    console.log('⚠️  conventions 已存在，跳过生成');
    console.log(`   路径: ${conventionsDir}`);
    process.exit(0);
  }

  // 检测技术栈
  let techStack = detectTechStack(root);

  // 如果未检测到技术栈且启用交互式模式
  if (!techStack.language && values.interactive) {
    techStack = await interactiveSetup();
  }

  // 如果仍未检测到技术栈
  if (!techStack.language) {
    console.error('❌ 未检测到技术栈特征');
    console.error('   请指定项目根目录，或使用 --interactive 模式手动配置');
    process.exit(1);
  }

  // 选择模板
  const templates = selectTemplates(techStack);

  if (templates.length === 0) {
    console.error('❌ 未找到匹配的 conventions 模板');
    console.error(`   技术栈: ${JSON.stringify(techStack)}`);
    process.exit(1);
  }

  // 生成 conventions
  const result = generateConventions(root, techStack, templates);

  // 更新配置
  updateConfig(root, result.created);

  // 输出结果
  if (values.json) {
    console.log(JSON.stringify({
      ok: true,
      techStack,
      templates,
      created: result.created,
      skipped: result.skipped,
      conventionsDir,
    }));
  } else {
    console.log('✅ conventions 生成完成');
    console.log(`   技术栈: ${techStack.language} + ${techStack.testFramework}`);
    console.log(`   创建: ${result.created.join(', ')}`);
    if (result.skipped.length > 0) {
      console.log(`   跳过: ${result.skipped.join(', ')}`);
    }
    console.log(`   路径: ${conventionsDir}`);
  }
}

// 直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.argv.slice(2)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
