import { describe, it, expect } from 'vitest';
// @ts-expect-error — plain .mjs module, no types
import { dispatchedVerbs, usageFlags } from './cliSurface.mjs';

const cli = (usage: string) => `const USAGE = \`Usage: npx @motion-proto/live-tokens <command> [options]

Commands:
${usage}\`;
`;

const CHECKERS = cli(`  components [id] [--json]    List every component.
  check-component [id]        Validate one component.
  check-page [paths...]       Validate pages against the contract.
                              Checks every page under src/ when given no paths.

check-component and check-page also accept:
  --json                      Machine-readable findings
  --strict                    Treat warnings as errors
  --off=<rule,...>            Silence rules; --warn=/--error= change severity
                              (or set "checks" in live-tokens.config.json)
  set-type <pairing.json> [--dry-run] [--no-verify]
                              Bind families to the font tokens.
`);

describe('verbs bin/cli.mjs dispatches', () => {
  it('reads the equality branches, including the trailing setup-claude', () => {
    expect(
      dispatchedVerbs("if (command === 'create') {\nif (command !== 'setup-claude') {\nif (command === '--help') {"),
    ).toEqual(new Set(['create', 'setup-claude']));
  });
});

describe('flags USAGE offers', () => {
  it('takes them from a verb signature line', () => {
    expect(usageFlags(CHECKERS).get('set-type')).toEqual(['--dry-run', '--no-verify']);
  });

  it('gives a shared block to every verb its heading names', () => {
    const flags = usageFlags(CHECKERS);

    expect(flags.get('check-page')).toEqual(['--json', '--strict', '--off']);
    expect(flags.get('check-component')).toEqual(['--json', '--strict', '--off']);
    expect(flags.get('components')).toEqual(['--json']);
  });

  it('leaves a flag the block only describes to no verb', () => {
    expect([...usageFlags(CHECKERS).values()].flat()).not.toContain('--warn');
  });

  it('refuses a block whose heading names no verb', () => {
    expect(() => usageFlags(cli('  components [id]             List them.\n\nBoth check commands accept:\n  --json  Findings as data\n')))
      .toThrow(/--json under "Both check commands accept:", which names no verb/);
  });
});
