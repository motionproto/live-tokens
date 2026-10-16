// Closes every copy of the layers an arm runs without, so each arm reaches only
// the knowledge its own layers give it, by any route.
//
//   node isolate.mjs                 the skills: the plugin under test is their only source
//   node isolate.mjs lookup          the lookup: components, tokens, and the catalogue entries they print
//   node isolate.mjs checker         the checker: check-page, check-component, report, the build's
//                                    checks, the checker modules, and the contract suites
//
// The README and the editor docs stay in every arm. They summarise the skills
// and commands, and a user without the plugin has them too.
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
if (unknown.length > 0) throw new Error(`usage: isolate.mjs [${Object.keys(GROUPS).join('|')}...]`);

// Each closure throws when the package no longer has the shape it edits: a
// silent miss would leave a layer open and make the arm a copy of a fuller one.
function edit(path, change, why) {
  const before = readFileSync(path, 'utf8');
  const after = change(before);
  if (after === before) throw new Error(`${path}: ${why}. Update isolate.mjs.`);
  writeFileSync(path, after);
}

// The usage text and the header comment drop the removed commands too, so the
// arm sees a package that never had them rather than one that refuses them.
function stripUsage(source, commands) {
  const start = source.indexOf('const USAGE = `');
  const end = source.indexOf('`;', start);
  if (start < 0 || end < 0) throw new Error(`${CLI} no longer declares USAGE as a template literal. Update isolate.mjs.`);
  const entries = [];
  for (const line of source.slice(start, end).split('\n')) {
    if (/^ {2}\S/.test(line) || entries.length === 0 || !/^ {3,}/.test(line)) entries.push([line]);
    else entries.at(-1).push(line);
  }
  const nameOf = (entry) => entry[0].match(/^ {2}(\S+)/)?.[1];
  for (const name of commands) {
    if (!entries.some((entry) => nameOf(entry) === name)) throw new Error(`USAGE in ${CLI} no longer lists ${name}. Update isolate.mjs.`);
  }
  const checkerGone = commands.includes('check-page');
  const kept = entries.filter((entry) => {
    const name = nameOf(entry);
    if (commands.includes(name)) return false;
    if (checkerGone && (name?.startsWith('--') || entry[0].startsWith('check-component and check-page'))) return false;
    return true;
  });
  const usage = kept.flat().join('\n').replace(/\n\n+(?= {2}\S)/g, '\n');
  const header = new RegExp(`^//   (${commands.join('|')}) .*\\n`, 'gm');
  return (source.slice(0, start) + usage + source.slice(end)).replace(header, '');
}

function closeSkills() {
  rmSync(`${PKG}/.claude`, { recursive: true, force: true });
  for (const path of [`${PKG}/src/editor/skill-atlas`, `${PKG}/src/demo/TestingLoops.svelte`]) {
    if (!existsSync(path)) throw new Error(`${path} is gone. Update isolate.mjs.`);
    rmSync(path, { recursive: true });
  }
  rmSync(`${PKG}/src/demo/TestingLoops.svelte.d.ts`, { force: true });
}

function closeCommands(commands) {
  if (!readFileSync(CLI, 'utf8').includes(ANCHOR)) throw new Error(`${CLI} no longer reads its command with "${ANCHOR}". Update isolate.mjs.`);
  edit(CLI, (source) => stripUsage(
    source.replace(ANCHOR, `${ANCHOR}\nif (${JSON.stringify(commands)}.includes(command)) fail(\`Unknown command: \${command}\\n\\n\${USAGE}\`);`),
    commands,
  ), 'the command guard did not apply');
}

// The entry keeps its shape, so the registry still imports it and the build passes.
function closeCatalogue() {
  const dir = `${PKG}/src/system/components`;
  const runtimes = readdirSync(dir).filter((name) => name.endsWith('.svelte'));
  let blanked = 0;
  for (const name of runtimes) {
    const source = readFileSync(`${dir}/${name}`, 'utf8');
    if (!source.includes('export const catalogue')) continue;
    edit(
      `${dir}/${name}`,
      (text) => text.replace(
        /export const catalogue = \{[\s\S]*?\n {2}\} satisfies CatalogueEntry;/,
        "export const catalogue = { description: '', whenToUse: '', whenNotToUse: [] } satisfies CatalogueEntry;",
      ),
      'the catalogue entry no longer ends in "} satisfies CatalogueEntry;"',
    );
    blanked += 1;
  }
  if (blanked === 0) throw new Error(`${dir} holds no catalogue entry. Update isolate.mjs.`);
}

function closeChecker() {
  // `vite build` runs the same checks through this module and stops on an error.
  writeFileSync(
    `${PKG}/bin/lib/buildChecks.mjs`,
    "export async function runBuildChecks() {\n  return { errors: 0, warnings: 0, report: '' };\n}\n",
  );
  // cli.mjs imports these for every command, so they load there and nowhere else.
  for (const module of ['check-page.mjs', 'check-component.mjs', 'contractRunner.mjs']) {
    edit(
      `${PKG}/bin/${module}`,
      (source) => "import { realpathSync as isolatedRealpath } from 'node:fs';\n"
        + "if (!isolatedRealpath(process.argv[1] ?? '.').endsWith('/bin/cli.mjs')) throw new Error('Cannot find module');\n"
        + source,
      'the load guard did not apply',
    );
  }
  // vitest and Playwright stay for tests the agent writes itself.
  const suites = `${PKG}/src/testing-js`;
  const contracts = readdirSync(suites).filter((name) => /\.contract\.js(\.map)?$/.test(name));
  if (contracts.length === 0) throw new Error(`${suites} holds no contract suite. Update isolate.mjs.`);
  for (const name of contracts) rmSync(`${suites}/${name}`);
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  delete manifest.scripts?.['test:design'];
  writeFileSync('package.json', `${JSON.stringify(manifest, null, 2)}\n`);
}

closeSkills();
if (groups.length > 0) closeCommands(groups.flatMap((g) => GROUPS[g]));
if (groups.includes('lookup')) closeCatalogue();
if (groups.includes('checker')) closeChecker();
