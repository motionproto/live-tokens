// The two skill gates both compare prose against what `bin/cli.mjs` actually
// offers, and both used to re-derive it. One parse, one place: a change to how
// the CLI declares a verb cannot leave one gate reading the old shape.

// setup-claude is dispatched by the final `!==` branch, and a leading letter is
// what separates a verb from the --help and -h the same comparisons carry.
export const dispatchedVerbs = (cli) =>
  new Set([...cli.matchAll(/command [!=]== '([a-z][a-z-]*)'/g)].map((m) => m[1]));

// Flags come off each verb's signature line in USAGE, never the indented prose
// under it: set-type describes the --font-* custom properties there, and those
// are not flags.
export function usageFlags(cli) {
  const usage = cli.match(/const USAGE = `([\s\S]*?)`;/)?.[1] ?? '';
  return new Map(
    [...usage.matchAll(/^ {2}([a-z][a-z-]+)\s+(.*)$/gm)].map(([, verb, rest]) => [
      verb,
      [...rest.matchAll(/--[a-z-]+/g)].map((m) => m[0]),
    ]),
  );
}
