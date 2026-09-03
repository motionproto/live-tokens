// The two skill gates both compare prose against what `bin/cli.mjs` actually
// offers, and both used to re-derive it. One parse, one place: a change to how
// the CLI declares a verb cannot leave one gate reading the old shape.

// setup-claude is dispatched by the final `!==` branch, and a leading letter is
// what separates a verb from the --help and -h the same comparisons carry.
export const dispatchedVerbs = (cli) =>
  new Set([...cli.matchAll(/command [!=]== '([a-z][a-z-]*)'/g)].map((m) => m[1]));

const SIGNATURE = /^ {2}([a-z][a-z-]+)\s+(.*)$/;
const DECLARATION = /^ {2}(--[a-z-]+)/;
// A block header sits flush left and ends in a colon: `check-component and
// check-page also accept:`.
const BLOCK = /^\S.*:\s*$/;

// Flags come off each verb's signature line in USAGE, never the indented prose
// under it: set-type describes the --font-* custom properties there, and those
// are not flags. A heading that names verbs opens a block they share, and each
// flag the block declares — the name at the head of its own line, never the
// prose beside it — belongs to every verb the heading names. While the
// checkers' shared block belonged to no verb, a skill that ran check-page and
// named --json was told the flag lived on `components`, and no skill running a
// checker owed --strict or --off= at all.
export function usageFlags(cli) {
  const usage = cli.match(/const USAGE = `([\s\S]*?)`;/)?.[1] ?? '';
  const flags = new Map();
  const record = (verb, text) => {
    const owned = flags.get(verb) ?? [];
    for (const [flag] of text.matchAll(/--[a-z-]+/g)) if (!owned.includes(flag)) owned.push(flag);
    flags.set(verb, owned);
  };

  let header = '';
  let shared = [];
  for (const line of usage.split('\n')) {
    const signature = line.match(SIGNATURE);
    if (signature) {
      header = '';
      shared = [];
      record(signature[1], signature[2]);
      continue;
    }
    if (BLOCK.test(line)) {
      header = line.trim();
      // A hyphen is a word boundary, so `components` would otherwise read
      // itself into `check-component`.
      shared = [...flags.keys()].filter((verb) => new RegExp(`(?<![\\w-])${verb}(?![\\w-])`).test(line));
      continue;
    }
    const declaration = line.match(DECLARATION);
    if (!declaration) continue;
    // Silently dropping these is the bug this parse exists to end, so a header
    // that names no verb is refused rather than read past.
    if (shared.length === 0) {
      throw new Error(
        `USAGE declares ${declaration[1]} under "${header || 'no heading'}", which names no verb; ` +
          `a shared block belongs to the verbs its heading names`,
      );
    }
    for (const verb of shared) record(verb, declaration[1]);
  }
  return flags;
}
