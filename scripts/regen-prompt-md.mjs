#!/usr/bin/env node
// Regenerate docs/system-prompt.md from the live functions/api/system-prompt.js.
//
// methodology.html and about.html link to docs/system-prompt.md as the
// human-readable mirror of the production prompt. The .js file is the
// authoritative source; this script keeps the .md in sync after a prompt
// change. Run after bumping PROMPT_VERSION:
//
//   npm run docs:prompt
//   git add docs/system-prompt.md && git commit
//
// Idempotent — running twice produces the same output.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const { SYSTEM_PROMPT, PROMPT_VERSION } = await import(`${repoRoot}/functions/api/system-prompt.js`);

const header = `# System Prompt — ismyaialive

**The authoritative source is [\`functions/api/system-prompt.js\`](../functions/api/system-prompt.js).** This .md file is auto-extracted from that template literal. If they ever drift, the .js wins.

Prompt version: \`${PROMPT_VERSION}\`

Model: Claude Haiku 4.5 (\`claude-haiku-4-5-20251001\`). Prompt cached on the system block (1h ephemeral). The user message is the parsed transcript as JSON.

To regenerate this file after a prompt change:
\`\`\`bash
npm run docs:prompt
\`\`\`

---

`;

const out = `${repoRoot}/docs/system-prompt.md`;
writeFileSync(out, header + SYSTEM_PROMPT + '\n');
console.log(`wrote ${header.length + SYSTEM_PROMPT.length} chars to docs/system-prompt.md (version ${PROMPT_VERSION})`);
