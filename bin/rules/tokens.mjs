import { relative } from 'node:path';
import { scaleTokens } from '../lib/catalogue.mjs';
import { COLOR_SCALES, GEOMETRY_SCALES, STATE_TOKENS, readKindRules, tokenScale, unreadTokens } from '../lib/componentSource.mjs';
import { colorScaleOfProperty, hasColorLiteral, hasDimensionLiteral, stripVarFallbacks } from '../lib/cssValues.mjs';
import { readComponentConfig } from '../lib/dataDir.mjs';
import { findJsonKeyLine } from '../lib/findings.mjs';
import { geometryScaleOfProperty, resolveGeometryLiteral } from '../lib/geometry.mjs';
import { declarationPatch, declarations, neutralise, pageDeclaredNames } from '../lib/pageSource.mjs';
import { isContractToken } from '../lib/tokenVocabulary.mjs';

export const pageRules = {
  'unknown-token': { severity: 'error', fix: 'page-token', repair: 'choice' },
  'color-literal': { severity: 'error', fix: 'page-token', repair: 'choice' },
  'raw-text-axis': { severity: 'error', fix: 'page-token', repair: 'choice' },
  'dimension-literal': { severity: 'warn', fix: 'page-token', repair: 'auto' },
  'hardcoded-columns': { severity: 'warn', fix: 'page-layout', repair: 'choice' },
};

export const componentRules = {
  'unread-token': { severity: 'warn', fix: 'runtime', repair: 'choice' },
  'color-literal': { severity: 'error', fix: 'property-token', repair: 'choice' },
  'unknown-token-ref': { severity: 'error', fix: 'property-token', repair: 'choice' },
  'default-not-token': { severity: 'error', fix: 'property-token', repair: 'choice' },
  'dimension-literal': { severity: 'warn', fix: 'property-token', repair: 'auto' },
  'config-token': { severity: 'error', fix: 'property-token', repair: 'choice' },
};

/**
 * The semantic half of the contract: a component token is a *property name*, and
 * its default is the theme token that property reads. So every default must
 * resolve to a real token — otherwise the component stops repainting when the
 * theme changes, which is the whole point of declaring it.
 */
export function checkDefaultsAreSemantic({ blocks, runtime, root, runtimePath, vocab, intrinsic }, record) {
  const rel = relative(root, runtimePath);
  const kindRules = readKindRules(root);

  const own = new Set();
  for (const block of blocks) {
    for (const m of block.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/gm)) own.add(m[1]);
  }

  for (const block of blocks) {
    for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const [decl, name, raw] = m;
      const value = raw.trim();
      const at = runtime.indexOf(decl);

      const painted = stripVarFallbacks(value);
      const refs = [...painted.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((x) => x[1]);
      for (const ref of refs) {
        if (own.has(ref) || vocab.knows(ref)) continue;
        record(
          'unknown-token-ref',
          STATE_TOKENS.includes(ref.replace(/^--/, '').split('-')[0])
            ? `${rel}: ${name} reads ${ref}, but a state is a segment of a property name. Read the token the state should paint`
            : isContractToken(ref)
              ? `${rel}: ${name} reads ${ref}, which has the shape of a design token but no longer exists. Check tokens.css for a rename`
              : `${rel}: ${name} reads ${ref}, which is not a design token or a semantic property`,
          at,
        );
      }

      if (hasColorLiteral(painted)) {
        const scale = tokenScale(name, kindRules, COLOR_SCALES);
        record(
          'color-literal',
          `${rel}: ${name}: ${value} is a colour literal; defaults must reference design tokens (e.g. var(--surface-primary))`,
          at,
          { details: { scale, candidates: scaleTokens(vocab, scale).map((t) => t.name) } },
        );
        continue;
      }

      if (refs.length === 0 && !intrinsic.some((re) => re.test(name))) {
        record(
          'default-not-token',
          `${rel}: ${name}: ${value} has no design token behind it. Back it with a token, or declare it in the editor's \`intrinsics\` when it is a structural keyword`,
          at,
        );
      }

      if (hasDimensionLiteral(painted)) {
        const scale = tokenScale(name, kindRules, GEOMETRY_SCALES);
        const resolved = resolveGeometryLiteral(value, scale, scaleTokens(vocab, scale));
        // Anchored at the whole declaration: a value-only patch applied at the
        // first namesake literal at or after the line, whatever property held it.
        const patch = resolved.patch
          ? { from: decl, to: `${decl.slice(0, decl.length - raw.length - 1)}${raw.replace(value, resolved.patch.to)};` }
          : null;
        record(
          'dimension-literal',
          `${rel}: ${name}: ${value} pins a raw dimension; use a --space-*, --radius-*, or --border-width-* token`,
          at,
          {
            details: { scale: resolved.scale, literals: resolved.literals, ...(patch ? { patch } : {}) },
            ...(patch ? {} : { repair: 'choice' }),
          },
        );
      }
    }
  }
}

/** Every `--name` inside a JSON string value, in the order it appears. Simple
 *  greedy extraction: `--card-default-body-padding` is one match, never two,
 *  since `[a-z0-9-]+` already consumes the longer run first. */
const TOKEN_NAME_RE = /--[a-z0-9-]+/g;

/**
 * Saved assignments, validated as data. Every `--name` an alias string in
 * `component-configs/<id>/default.json` carries, whatever wraps it (`var()`,
 * the color-mix opacity form the editor writes, or nothing), must resolve —
 * a design token, or one of the component's own properties. A string with no
 * `--name` at all is a bare literal, allowed only on a property the editor
 * declares in `intrinsics`. A structured (non-string) alias value, such as a
 * gradient, is out of scope here.
 */
export function checkConfigTokens({ id, root, intrinsic, vocab }, recordAt) {
  const config = readComponentConfig(root, id);
  if (!config) return;
  const { text, data } = config;
  const rel = relative(root, config.path);
  // Only this component's own tokens, not the union across every component:
  // an alias naming a sibling component's property is exactly the case this
  // rule exists to catch.
  const ownTokens = vocab.components.get(id)?.tokens;
  const knows = (name) => vocab.themeTokens.has(name) || (ownTokens?.has(name) ?? false);
  for (const [prop, value] of Object.entries(data.aliases ?? {})) {
    if (typeof value !== 'string') continue;
    const line = findJsonKeyLine(text, prop);
    const names = value.match(TOKEN_NAME_RE);
    if (!names) {
      if (!intrinsic.some((re) => re.test(prop))) {
        recordAt(
          'config-token',
          `${rel}: ${prop}: "${value}" has no design token behind it, and ${prop} is not a declared intrinsic`,
          rel,
          line,
          { details: { property: prop, value } },
        );
      }
      continue;
    }
    for (const name of names) {
      if (knows(name)) continue;
      recordAt(
        'config-token',
        `${rel}: ${prop} names ${name}, which is not a design token or a semantic property`,
        rel,
        line,
        { details: { property: prop, value } },
      );
    }
  }
}

/** A property nothing in the file reads paints nothing, so the editor offers a
 *  control that moves nothing. */
export function checkUnreadTokens({ root, runtimePath, runtime, declared }, record) {
  for (const name of unreadTokens(runtime, declared)) {
    record(
      'unread-token',
      `${relative(root, runtimePath)}: ${name} is declared and never read in this file's own CSS. Read it where it paints, or drop it`,
      runtime.indexOf(name),
      { details: { property: name } },
    );
  }
}

const TEXT_AXES = ['font-size', 'font-family', 'font-weight', 'line-height', 'letter-spacing'];

// The single-axis scales in tokens.css. A text style bundle carries its axis
// as a suffix (--body-md-font-size, --code-font-family), so no bundle name
// matches, and neither does a custom property the page declares itself. A
// weight alone cannot move the scale or the fonts, so --font-weight-* is not one.
const SINGLE_AXIS_TOKEN =
  /^--(?:font-size|line-height|letter-spacing)-|^--font-(?:sans|serif|mono|display|editorial)$/;

// The geometry the theme owns: spacing, stroke, radius, and shadow all have a
// token scale, and `set-geometry` moves them. Sizing (a hero's height, a
// column's minimum width, a max content width) is layout, has no scale, and
// stays literal.
const THEMED_GEOMETRY = /^(padding|margin|gap|row-gap|column-gap|border|outline|inset|top|right|bottom|left|box-shadow|text-shadow)(-|$)|-radius$/;

// A local two-up or three-up is a layout. From four columns on, a hardcoded
// count reads as a claim about the page grid, which `--columns-count` owns.
const PAGE_GRID_COLUMNS = 4;

// The two forms that keep a grid in step: the page grid itself, and a sub-grid
// spanning fewer than every column.
const COLUMN_FORMS = ['repeat(var(--columns-count), 1fr)', 'repeat(calc(var(--columns-count) - N), 1fr)'];

/** `unknown-token` over each style region, then the value rules over each of its declarations. */
export function checkPageValues({ text, regions, inlineRegions, vocab }, add) {
  const declared = pageDeclaredNames(text, regions);
  for (const region of [...regions, ...inlineRegions]) {
    const css = neutralise(region.text);
    const at = (i) => region.offset + i;

    for (const m of css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
      const name = m[1];
      if (declared.has(name) || vocab.knows(name)) continue;
      add(
        'unknown-token',
        at(m.index),
        isContractToken(name)
          ? `${name} has the shape of a design token but no longer exists. Check tokens.css for a rename`
          : `${name} is not a design token, a semantic property, or declared in this file`,
      );
    }

    for (const decl of declarations(css)) checkDeclaration(decl, { text, region, vocab, at }, add);
  }
}

/** A colour literal or a raw text axis ends the checks for its declaration. */
function checkDeclaration(decl, { text, region, vocab, at }, add) {
  const { prop, value, index } = decl;
  if (prop.startsWith('--')) return;

  // A `var()` fallback only renders when the token is missing, so a literal
  // inside one is not the page's value.
  const painted = stripVarFallbacks(value);
  if (!TEXT_AXES.includes(prop) && hasColorLiteral(painted)) {
    const scale = colorScaleOfProperty(prop);
    add('color-literal', at(index), `${prop}: ${value}. Use a design token.`, {
      details: { scale, candidates: scaleTokens(vocab, scale).map((t) => t.name) },
    });
    return;
  }

  if (TEXT_AXES.includes(prop) || prop === 'font') {
    const axis = [...painted.matchAll(/var\(\s*(--[a-z0-9-]+)/g)]
      .map((m) => m[1])
      .find((name) => SINGLE_AXIS_TOKEN.test(name));
    if (axis) {
      add(
        'raw-text-axis',
        at(index),
        `${prop}: ${value}. ${axis} is one axis. Set every axis from one text style bundle (--heading-*, --body-*, --editorial-*, --code-*).`,
      );
      return;
    }

    // Of the literals only absolute type values are a finding. `em`, `%`,
    // and a unitless line-height are relative to the inherited type, so
    // they ride whatever the theme sets rather than overriding it.
    if (
      !value.includes('var(') &&
      !/^(inherit|initial|unset|normal)$/.test(value) &&
      /\d(px|rem|pt)\b|^[a-z"']/i.test(value)
    ) {
      add(
        'raw-text-axis',
        at(index),
        `${prop}: ${value}. Set type from a text style bundle (--heading-*, --body-*, --editorial-*, --code-*).`,
      );
      return;
    }
  }

  if (THEMED_GEOMETRY.test(prop) && hasDimensionLiteral(painted)) {
    const scale = geometryScaleOfProperty(prop);
    const resolved = resolveGeometryLiteral(value, scale, scaleTokens(vocab, scale));
    const patch = resolved.patch ? declarationPatch(text, region, decl, resolved.patch.to) : null;
    add(
      'dimension-literal',
      at(index),
      `${prop}: ${value}. Use a --space-*, --radius-*, --border-width-*, or --shadow-* token.`,
      {
        details: { scale: resolved.scale, literals: resolved.literals, ...(patch ? { patch } : {}) },
        ...(patch ? {} : { repair: 'choice' }),
      },
    );
  }

  const columns = value.match(/\brepeat\(\s*(\d+)\s*,\s*1fr\s*\)/);
  if (columns && Number(columns[1]) >= PAGE_GRID_COLUMNS) {
    add(
      'hardcoded-columns',
      at(index),
      `${prop}: ${value}. Use repeat(var(--columns-count), 1fr) so the page grid stays in step.`,
      { details: { columns: Number(columns[1]), candidates: COLUMN_FORMS } },
    );
  }
}
