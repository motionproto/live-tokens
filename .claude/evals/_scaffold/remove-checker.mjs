import { readFileSync, writeFileSync } from 'node:fs';

const PKG = 'node_modules/@motion-proto/live-tokens';
const CLI = `${PKG}/bin/cli.mjs`;
const ANCHOR = 'const [, , command, ...rest] = process.argv;';

const source = readFileSync(CLI, 'utf8');
// A silent miss would leave the checker in place and make this arm a copy of the other.
if (!source.includes(ANCHOR)) throw new Error(`${CLI} no longer reads its command with "${ANCHOR}". Update remove-checker.mjs.`);
writeFileSync(
  CLI,
  source.replace(
    ANCHOR,
    `${ANCHOR}\nif (['check-page', 'check-component', 'report'].includes(command)) fail(\`Unknown command: \${command}\`);`,
  ),
);

// `vite build` runs the same checks through this module and stops on an error.
writeFileSync(
  `${PKG}/bin/lib/buildChecks.mjs`,
  "export async function runBuildChecks() {\n  return { errors: 0, warnings: 0, report: '' };\n}\n",
);
