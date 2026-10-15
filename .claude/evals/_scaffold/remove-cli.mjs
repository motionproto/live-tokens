// Removes groups of CLI commands from a seeded project, so an arm measures the
// skills apart from the commands they name. The skills the package ships are
// removed too: the plugin under test supplies them, and a copy here would
// reach the arm that runs without the plugin.
//
//   node remove-cli.mjs lookup    components, tokens
//   node remove-cli.mjs checker   check-page, check-component, report, and the build's checks
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const PKG = 'node_modules/@motion-proto/live-tokens';
const CLI = `${PKG}/bin/cli.mjs`;
const ANCHOR = 'const [, , command, ...rest] = process.argv;';
const GROUPS = {
  lookup: ['components', 'tokens'],
  checker: ['check-page', 'check-component', 'report'],
};

const groups = process.argv.slice(2);
const unknown = groups.filter((g) => !GROUPS[g]);
if (groups.length === 0 || unknown.length > 0) throw new Error(`usage: remove-cli.mjs ${Object.keys(GROUPS).join('|')}...`);

const source = readFileSync(CLI, 'utf8');
// A silent miss would leave the commands in place and make this arm a copy of the full one.
if (!source.includes(ANCHOR)) throw new Error(`${CLI} no longer reads its command with "${ANCHOR}". Update remove-cli.mjs.`);
const removed = JSON.stringify(groups.flatMap((g) => GROUPS[g]));
writeFileSync(CLI, source.replace(ANCHOR, `${ANCHOR}\nif (${removed}.includes(command)) fail(\`Unknown command: \${command}\`);`));

if (groups.includes('checker')) {
  // `vite build` runs the same checks through this module and stops on an error.
  writeFileSync(
    `${PKG}/bin/lib/buildChecks.mjs`,
    "export async function runBuildChecks() {\n  return { errors: 0, warnings: 0, report: '' };\n}\n",
  );
}

rmSync(`${PKG}/.claude`, { recursive: true, force: true });
