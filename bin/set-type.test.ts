import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyFontPairing, SLOT_ORDER, SLOT_VARIABLES } from '../src/editor/core/fonts/applyFontPairing';
import { resolveGoogleFont, discoveryUrl, persistUrlFor } from '../src/editor/core/fonts/googleFontsUrl';
import { requiredWeights, weightCoverage } from '../src/editor/core/fonts/weightCoverage';
// @ts-expect-error — plain .mjs module, no types
import { runSetType } from './set-type.mjs';

const engine = {
  applyFontPairing,
  resolveGoogleFont,
  requiredWeights,
  weightCoverage,
  SLOT_ORDER,
  SLOT_VARIABLES,
  readLiveTokensConfig: () => ({}),
  resolveDataDirs: () => {
    throw new Error('tests pass explicit dirs');
  },
};

const GOOGLE = 'https://fonts.googleapis.com/css2?family=';
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function face(family: string, weights: number[]): string {
  return weights
    .map(
      (weight) => `@font-face { font-family: '${family}'; font-style: normal; font-weight: ${weight}; src: url(x.woff2); }`,
    )
    .join('\n');
}

/** Serves the discovery probe and the URL built from its census; every other
 *  request 400s. */
function fetcher(families: Record<string, number[]>) {
  const serve: Record<string, string> = {};
  for (const [family, weights] of Object.entries(families)) {
    serve[discoveryUrl(family)] = face(family, weights);
    serve[persistUrlFor(family, weights, false)] = face(family, weights);
  }
  return async (url: string) => ({
    ok: serve[url] !== undefined,
    status: serve[url] === undefined ? 400 : 200,
    text: async () => serve[url] ?? '',
  });
}

function colorsAndType() {
  return {
    name: 'Fixture',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    editorConfigs: {},
    cssVariables: { '--surface-default': 'oklch(0.9 0 0)' },
    fontSources: [],
    fontStacks: [
      { variable: '--font-display', slots: [{ kind: 'generic', value: 'serif' }] },
      { variable: '--font-sans', slots: [{ kind: 'generic', value: 'sans-serif' }] },
      { variable: '--font-serif', slots: [{ kind: 'generic', value: 'serif' }] },
      { variable: '--font-mono', slots: [{ kind: 'generic', value: 'monospace' }] },
    ],
  };
}

function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-set-type-'));
  roots.push(root);
  mkdirSync(join(root, 'themes'), { recursive: true });
  mkdirSync(join(root, 'colors-and-type'), { recursive: true });
  writeFileSync(join(root, 'themes', '_active.json'), JSON.stringify({ activeFile: 'fixture' }));
  writeFileSync(
    join(root, 'themes', 'fixture.json'),
    JSON.stringify({ name: 'Fixture', schemaVersion: 4, colorsAndType: colorsAndType(), componentConfigs: {} }),
  );
  writeFileSync(
    join(root, 'tokens.css'),
    `:root {
      --font-weight-normal: 400;
      --font-weight-semibold: 600;
      --heading-lg-font-family: var(--font-display);
      --heading-lg-font-weight: var(--font-weight-semibold);
      --body-md-font-family: var(--font-sans);
      --body-md-font-weight: var(--font-weight-normal);
    }`,
  );
  return root;
}

function run(root: string, pairing: unknown, opts: Record<string, unknown> = {}) {
  const pairingPath = join(root, 'pairing.json');
  writeFileSync(pairingPath, JSON.stringify(pairing));
  return runSetType({
    pairingPath,
    colorsAndTypeDir: join(root, 'colors-and-type'),
    themesDir: join(root, 'themes'),
    tokensCssPath: join(root, 'tokens.css'),
    engine,
    fetcher: fetcher({ Cinzel: [400, 500, 600, 700], Lato: [100, 300, 400, 700, 900] }),
    ...opts,
  });
}

function buffer(root: string) {
  return JSON.parse(readFileSync(join(root, 'colors-and-type', '_working.json'), 'utf8'));
}

function hasBuffer(root: string): boolean {
  return existsSync(join(root, 'colors-and-type', '_working.json'));
}

describe('runSetType', () => {
  it('writes the pairing into the unsaved buffer', async () => {
    const root = project();
    const result = await run(root, { display: 'Cinzel', body: 'Lato' });

    expect(result.wrote).toBe('buffer');
    expect(result.source).toBe('theme');
    const stacks = buffer(root).fontStacks;
    expect(stacks.find((s: any) => s.variable === '--font-display').slots[0]).toEqual({
      kind: 'project',
      familyId: 'src_google_cinzel:cinzel',
    });
    expect(buffer(root).fontSources.map((s: any) => s.families[0].name)).toEqual(['Cinzel', 'Lato']);
  });

  it('leaves every other file alone', async () => {
    const root = project();
    const before = JSON.stringify(readdirSync(join(root, 'themes')).sort());
    const theme = readFileSync(join(root, 'themes', 'fixture.json'), 'utf8');

    await run(root, { display: 'Cinzel', body: 'Lato' });

    expect(JSON.stringify(readdirSync(join(root, 'themes')).sort())).toBe(before);
    expect(readFileSync(join(root, 'themes', 'fixture.json'), 'utf8')).toBe(theme);
    expect(readdirSync(join(root, 'colors-and-type'))).toEqual(['_working.json']);
  });

  it('writes nothing on --dry-run', async () => {
    const root = project();
    const result = await run(root, { display: 'Cinzel' }, { dryRun: true });

    expect(result.changed).toBe(true);
    expect(result.wrote).toBe(null);
    expect(hasBuffer(root)).toBe(false);
  });

  it('discards the buffer when the pairing matches what the theme already holds', async () => {
    const root = project();
    await run(root, { display: 'Cinzel', body: 'Lato' });
    expect(hasBuffer(root)).toBe(true);

    // The theme now carries that pairing, so setting it again is a return to
    // saved rather than an edit.
    const saved = buffer(root);
    writeFileSync(
      join(root, 'themes', 'fixture.json'),
      JSON.stringify({ name: 'Fixture', schemaVersion: 4, colorsAndType: saved, componentConfigs: {} }),
    );
    writeFileSync(join(root, 'colors-and-type', '_working.json'), JSON.stringify(colorsAndType(), null, 2));

    const result = await run(root, { display: 'Cinzel', body: 'Lato' });

    expect(result.wrote).toBe('cleared');
    expect(hasBuffer(root)).toBe(false);
  });

  it('reports the weights the token contract asks for and the family lacks', async () => {
    const root = project();
    const result = await run(root, { display: 'Cinzel', body: 'Lato' });

    const body = result.coverage.find((c: any) => c.stack === '--font-sans');
    expect(body).toMatchObject({ family: 'Lato', required: [400], missing: [] });
    const display = result.coverage.find((c: any) => c.stack === '--font-display');
    expect(display).toMatchObject({ family: 'Cinzel', required: [600], missing: [] });
  });

  it('flags a family that lacks a required weight', async () => {
    const root = project();
    const result = await run(
      root,
      { display: 'Cinzel' },
      { fetcher: fetcher({ Cinzel: [400] }) },
    );

    expect(result.coverage[0]).toMatchObject({ family: 'Cinzel', required: [600], missing: [600] });
  });

  it('refuses a bare family name with --no-verify', async () => {
    const root = project();
    await expect(run(root, { body: 'Lato' }, { verify: false })).rejects.toThrow(/needs an explicit URL/);
  });

  it('takes a pinned URL with --no-verify', async () => {
    const root = project();
    const url = `${GOOGLE}Lato:wght@400;700&display=swap`;
    const result = await run(root, { body: { name: 'Lato', url } }, { verify: false });

    expect(result.wrote).toBe('buffer');
    expect(buffer(root).fontSources[0].url).toBe(url);
  });

  it('refuses a pairing that names no slot', async () => {
    const root = project();
    await expect(run(root, { colour: 'red' })).rejects.toThrow(/names no slot/);
  });

  it('reports a family that is not on Google Fonts', async () => {
    const root = project();
    await expect(run(root, { body: 'Notafont Xyzzy' })).rejects.toThrow(/not on Google Fonts/);
  });
});
