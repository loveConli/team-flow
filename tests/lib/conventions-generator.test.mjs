// tests/lib/conventions-generator.test.mjs
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import path, { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectTechStack, selectTemplates, generateConventions, updateConfig } from '../../scripts/lib/conventions-generator.mjs';

describe('conventions-generator', () => {
  let testDir;

  beforeEach(() => {
    testDir = join(tmpdir(), `conventions-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('detectTechStack', () => {
    it('should detect Java + Maven project', () => {
      writeFileSync(join(testDir, 'pom.xml'), '<project></project>');

      const result = detectTechStack(testDir);

      assert.strictEqual(result.language, 'java');
      assert.strictEqual(result.buildTool, 'maven');
    });

    it('should detect Java + Gradle project', () => {
      writeFileSync(join(testDir, 'build.gradle'), 'plugins { }');

      const result = detectTechStack(testDir);

      assert.strictEqual(result.language, 'java');
      assert.strictEqual(result.buildTool, 'gradle');
    });

    it('should detect JavaScript + npm project', () => {
      writeFileSync(join(testDir, 'package.json'), '{"name":"test"}');

      const result = detectTechStack(testDir);

      assert.strictEqual(result.language, 'javascript');
      assert.strictEqual(result.buildTool, 'npm');
    });

    it('should detect Python + pip project', () => {
      writeFileSync(join(testDir, 'requirements.txt'), 'flask==2.0.0');

      const result = detectTechStack(testDir);

      assert.strictEqual(result.language, 'python');
      assert.strictEqual(result.buildTool, 'pip');
    });

    it('should return null for unknown project', () => {
      const result = detectTechStack(testDir);

      assert.strictEqual(result.language, null);
      assert.strictEqual(result.buildTool, null);
    });
  });

  describe('selectTemplates', () => {
    it('should select Java templates for Java project', () => {
      const techStack = {
        language: 'java',
        buildTool: 'maven',
        testFramework: 'junit5-mockito',
        appFramework: 'spring-boot',
      };

      const templates = selectTemplates(techStack);

      assert.ok(templates.includes('glaf4-compliant/java-testing.md'));
      assert.ok(templates.includes('glaf4-compliant/spring-patterns.md'));
    });

    it('should select Java testing template without Spring', () => {
      const techStack = {
        language: 'java',
        buildTool: 'maven',
        testFramework: 'junit5-mockito',
        appFramework: null,
      };

      const templates = selectTemplates(techStack);

      assert.ok(templates.includes('glaf4-compliant/java-testing.md'));
      assert.ok(!templates.includes('glaf4-compliant/spring-patterns.md'));
    });

    it('should select JavaScript template', () => {
      const techStack = {
        language: 'javascript',
        buildTool: 'npm',
        testFramework: 'jest',
        appFramework: null,
      };

      const templates = selectTemplates(techStack);

      assert.ok(templates.includes('js-testing.md'));
    });

    it('should select Python template', () => {
      const techStack = {
        language: 'python',
        buildTool: 'pip',
        testFramework: 'pytest',
        appFramework: null,
      };

      const templates = selectTemplates(techStack);

      assert.ok(templates.includes('python-testing.md'));
    });

    it('should return empty for unknown language', () => {
      const techStack = {
        language: null,
        buildTool: null,
        testFramework: null,
        appFramework: null,
      };

      const templates = selectTemplates(techStack);

      assert.deepStrictEqual(templates, []);
    });
  });

  describe('generateConventions', () => {
    it('should generate conventions files', () => {
      const techStack = {
        language: 'java',
        buildTool: 'maven',
        testFramework: 'junit5-mockito',
        appFramework: 'spring-boot',
      };
      const templates = ['glaf4-compliant/java-testing.md', 'glaf4-compliant/spring-patterns.md'];

      const result = generateConventions(testDir, techStack, templates);

      assert.ok(result.created.length > 0);
      assert.ok(existsSync(join(testDir, '.team-flow', 'conventions', 'java-testing.md')));
      assert.ok(existsSync(join(testDir, '.team-flow', 'conventions', 'spring-patterns.md')));
      assert.ok(existsSync(join(testDir, '.team-flow', 'conventions', '.versions.json')));
    });

    it('should create versions.json with correct structure', () => {
      const techStack = {
        language: 'java',
        buildTool: 'maven',
        testFramework: 'junit5-mockito',
        appFramework: null,
      };
      const templates = ['glaf4-compliant/java-testing.md'];

      generateConventions(testDir, techStack, templates);

      const versionsPath = join(testDir, '.team-flow', 'conventions', '.versions.json');
      const versions = JSON.parse(readFileSync(versionsPath, 'utf-8'));

      assert.ok(versions.conventions);
      assert.ok(versions.conventions['java-testing.md']);
      assert.ok(versions.conventions['java-testing.md'].source_version);
      assert.ok(versions.conventions['java-testing.md'].installed_at);
      assert.strictEqual(versions.conventions['java-testing.md'].customized, false);
    });

    it('should skip existing conventions with same version', () => {
      const techStack = {
        language: 'java',
        buildTool: 'maven',
        testFramework: 'junit5-mockito',
        appFramework: null,
      };
      const templates = ['glaf4-compliant/java-testing.md'];

      // 第一次生成
      const result1 = generateConventions(testDir, techStack, templates);
      assert.ok(result1.created.includes('java-testing.md'));

      // 第二次生成（应该跳过）
      const result2 = generateConventions(testDir, techStack, templates);
      assert.ok(result2.skipped.includes('java-testing.md'));
    });
  });

  describe('updateConfig', () => {
    it('should update team-flow.config.json', () => {
      const conventionsFiles = ['java-testing.md', 'spring-patterns.md'];

      updateConfig(testDir, conventionsFiles);

      const configPath = join(testDir, '.team-flow', 'team-flow.config.json');
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      assert.ok(config.conventions);
      assert.ok(config.conventions['java-testing']);
      assert.ok(config.conventions['spring-patterns']);
      assert.strictEqual(config.conventions['java-testing'], '.team-flow/conventions/java-testing.md');
    });

    it('should preserve existing config', () => {
      const configPath = join(testDir, '.team-flow', 'team-flow.config.json');
      mkdirSync(join(testDir, '.team-flow'), { recursive: true });
      writeFileSync(configPath, JSON.stringify({ existing: 'value' }));

      updateConfig(testDir, ['java-testing.md']);

      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      assert.strictEqual(config.existing, 'value');
      assert.ok(config.conventions);
    });
  });
});
