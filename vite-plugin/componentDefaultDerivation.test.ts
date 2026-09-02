/**
 * `default.json` is the derivation product of a component's `:global(:root)`
 * block, so the derivation has to be total: a first generation into an empty
 * directory, with no prior file to carry anything forward from, must reproduce
 * the committed file exactly. Booting the plugin against a temp data dir is
 * that first generation, verbatim.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { themeFileApi, extractAliasDeclarations } from './themeFileApi';
import { extractGlobalRootBody } from '../src/editor/core/themes/parsers/globalRootBlock';

const REPO_ROOT = process.cwd();
const COMPONENTS_DIR = path.join(REPO_ROOT, 'src/system/components');
const COMMITTED_CONFIGS_DIR = path.join(REPO_ROOT, 'src/live-tokens/data/component-configs');

let tmp: string;
let derivedDir: string;

function aliasesOf(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf-8')).aliases;
}

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-derive-'));
  derivedDir = path.join(tmp, 'component-configs');
  const plugin = themeFileApi({
    dataDir: tmp,
    componentConfigsDir: derivedDir,
    componentsSrcDir: COMPONENTS_DIR,
    tokensCssPath: path.join(REPO_ROOT, 'src/system/styles/tokens.css'),
    fontsCssPath: path.join(tmp, 'fonts.css'),
    tokensGeneratedCssPath: path.join(tmp, 'tokens.generated.css'),
  });
  (plugin as any).configureServer({
    middlewares: { use: () => {} },
    config: { logger: { warn: () => {} } },
  });
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const committedComponents = fs
  .readdirSync(COMMITTED_CONFIGS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

describe('first generation with no prior default.json', () => {
  it('covers every committed component', () => {
    expect(committedComponents).toHaveLength(26);
    expect(fs.readdirSync(derivedDir).sort()).toEqual(committedComponents);
  });

  it.each(committedComponents)('derives %s exactly as committed', (comp) => {
    const derived = aliasesOf(path.join(derivedDir, comp, 'default.json'));
    const committed = aliasesOf(path.join(COMMITTED_CONFIGS_DIR, comp, 'default.json'));

    expect(derived).toEqual(committed);
    // Key order counts. The boot guard re-derives only when the component
    // source is newer than its `default.json`, which is true on a fresh
    // checkout and false on a working tree, and the unchanged check compares
    // serialized JSON. Order-only drift therefore rewrites the file on CI
    // alone, where it silently moves the baseline every shipped theme is
    // gated against. This is the only assertion that sees it locally.
    expect(Object.keys(derived)).toEqual(Object.keys(committed));
  });

  it('carries the Panel gradient as a structured alias, not a dropped literal', () => {
    expect(aliasesOf(path.join(derivedDir, 'panel', 'default.json'))['--panel-stage-surface']).toEqual({
      kind: 'gradient',
      value: {
        type: 'linear',
        angle: 0,
        stops: [
          { position: 0.5, color: '--surface-neutral-low', opacity: 40 },
          { position: 100, color: '--surface-neutral-lowest', opacity: 75 },
        ],
      },
    });
  });
});

describe('extractAliasDeclarations', () => {
  it('leaves structural intrinsics out of the alias map', () => {
    const source = fs.readFileSync(path.join(COMPONENTS_DIR, 'SectionDivider.svelte'), 'utf-8');
    const aliases = extractAliasDeclarations(extractGlobalRootBody(source));
    expect(aliases).not.toHaveProperty('--sectiondivider-lg-align');
    expect(aliases).not.toHaveProperty('--sectiondivider-lg-hairline');
  });
});
