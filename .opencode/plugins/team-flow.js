/**
 * team-flow plugin for OpenCode.ai
 *
 * Registers skills directory and injects workflow-start bootstrap context
 * at session start, following the same pattern as Superpowers' OpenCode plugin.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsDir = path.resolve(__dirname, '../../skills');

// Module-level cache — read the bootstrap once per session
let _bootstrapCache = undefined;

const getBootstrapContent = () => {
  if (_bootstrapCache !== undefined) return _bootstrapCache;

  // Read GEMINI.md as the bootstrap context (shared across platforms)
  const geminiMd = path.resolve(__dirname, '../../GEMINI.md');
  if (!fs.existsSync(geminiMd)) {
    _bootstrapCache = null;
    return null;
  }

  const content = fs.readFileSync(geminiMd, 'utf8');

  _bootstrapCache = `<EXTREMELY_IMPORTANT>
You have team-flow installed.

${content}

**Tool Mapping for OpenCode:**
When skill instructions reference tools, substitute OpenCode equivalents:
- Read files → \`read\`
- Create, edit, or delete files → \`apply_patch\`
- Run shell commands → \`bash\`
- Search files → \`grep\`, \`glob\`
- Fetch a URL → \`webfetch\`
- Create or update todos → \`todowrite\`
</EXTREMELY_IMPORTANT>`;

  return _bootstrapCache;
};

export const SpecSuperflowPlugin = async (_opts) => {
  return {
    // Register skills directory so OpenCode discovers team-flow skills
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
    },

    // Inject bootstrap context into the first user message per session
    'experimental.chat.messages.transform': async (_input, output) => {
      const bootstrap = getBootstrapContent();
      if (!bootstrap || !output.messages.length) return;
      const firstUser = output.messages.find(m => m.info.role === 'user');
      if (!firstUser || !firstUser.parts.length) return;
      if (firstUser.parts.some(p => p.type === 'text' && p.text.includes('EXTREMELY_IMPORTANT'))) return;

      const ref = firstUser.parts[0];
      firstUser.parts.unshift({ ...ref, type: 'text', text: bootstrap });
    },
  };
};
