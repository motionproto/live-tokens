// Resolves the project's live-tokens data directory and its optional
// `live-tokens.testing.ts` settings file, statically — no engine import, no
// dynamic import of the consumer's own config. Shared by `contractRunner.mjs`
// (which isolates a copy of this directory before spawning the test tools)
// and `check-component.mjs`'s `config-token` rule (which reads
// `component-configs/<id>/default.json` under it directly), so the two agree
// on which tree a project's saved assignments live in.

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function settingsFilePath(root) {
  for (const name of ['live-tokens.testing.ts', 'live-tokens.testing.mts', 'live-tokens.testing.js', 'live-tokens.testing.mjs']) {
    const path = join(root, name);
    if (existsSync(path)) return path;
  }
  return null;
}

/**
 * A generated config's own extensionless relative imports (Vite/Playwright's
 * loaders resolve those, matching how this repo's own `vite.config.ts` and
 * `live-tokens.testing.ts` are written) only get that treatment for a
 * *static* import. A dynamic `import()` of the same path, called after a Vite
 * config finishes loading, runs through plain Node resolution instead and
 * fails on the same files: verified against `vitest.contract.config.ts` with
 * both a `file://` URL and a plain absolute path as the dynamic specifier,
 * identical `ERR_MODULE_NOT_FOUND` both times. So neither `settings.viteConfig`
 * nor `settings.dataDir` (the resolved values `resolveTestingConfig` computes)
 * has a reader here on purpose — reading either would mean importing the
 * settings file dynamically first, which reintroduces exactly this failure.
 * Regexing the settings file's *source text* for a field, imprecise as that
 * is, is what stays inside the static-import constraint: a wrong guess still
 * fails loudly (a bad `viteConfig` throws on its own static import in the
 * generated file; a bad `dataDir` throws "no data directory at ..." below),
 * never as a silent pass. A settings-level `dataDir` this cannot see at all
 * is worse than one resolved this imprecisely, since a project that names its
 * data directory only in `live-tokens.testing.ts` would otherwise have its
 * contracts checked against whatever happens to sit at the default path.
 */
function stripComments(text) {
  // Block comments first: a `//` inside one (`/* // note */`) must not seed a
  // second, overlapping strip.
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Measured across eleven settings-file shapes: a commented-out `dataDir:`
 *  above the real one won the regex, because the regex only sees text
 *  position, never comment syntax, and a comment naming the field with
 *  nothing else present invented a setting out of prose. Comments are
 *  stripped before the field ever gets a chance to match. A field present in
 *  live code as a template literal, a computed value, or an import throws
 *  instead of falling through to a default silently: the two guesses this
 *  feeds, `viteConfig` and `dataDir`, can each resolve to a real path that
 *  simply names the wrong tree, which then reads as a clean run. */
export function scrapeSettingsField(settingsPath, fieldName) {
  if (!settingsPath) return null;
  let text;
  try {
    text = readFileSync(settingsPath, 'utf8');
  } catch {
    return null;
  }
  const live = stripComments(text);
  const literal = new RegExp(`\\b${fieldName}\\s*:\\s*['"]([^'"]+)['"]`).exec(live);
  if (literal) return literal[1];
  if (new RegExp(`\\b${fieldName}\\s*:`).test(live)) {
    throw new Error(
      `"${fieldName}" in ${settingsPath} is set to something other than a plain string literal, ` +
        `so it cannot be read statically. Use a literal string, or remove the key to fall back to the default.`,
    );
  }
  return null;
}

/**
 * `dataDir` as the plugin resolves it: a `dataDir` field scraped from the
 * settings file (see above), else `live-tokens.config.json`'s own key, else
 * the default. Mirrors `resolveTestingConfig`'s own `configuredDataDir`
 * fallback (`src/testing/config.ts`) rather than importing it: that module
 * compiles into `src/testing-js`, which does not exist until `build:testing`
 * runs, and importing the *source* `.ts` module to reach it hits the same
 * extensionless-import failure documented above — measured with
 * `src/testing-js` moved aside, `resolveTestingEntry`'s `.ts` fallback threw
 * exactly that trying to load `vitest.ts`. Duplicating this small a resolver
 * has precedent in this module already, in `settingsFilePath`.
 */
export function resolveSourceDataDir(root, settingsPath) {
  const scraped = scrapeSettingsField(settingsPath, 'dataDir');
  if (scraped) return resolve(root, scraped);
  try {
    const parsed = JSON.parse(readFileSync(join(root, 'live-tokens.config.json'), 'utf8'));
    if (parsed && typeof parsed === 'object' && typeof parsed.dataDir === 'string') {
      return resolve(root, parsed.dataDir);
    }
  } catch {
    // Missing or unparseable reads as absent, matching the plugin's own resolver.
  }
  return resolve(root, 'src/live-tokens/data');
}
