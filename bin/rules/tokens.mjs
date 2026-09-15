import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { loadBuiltEngine, resolveTokensCssPath } from '../migrate.mjs';
import { scaleTokens } from '../lib/catalogue.mjs';
import { COLOR_SCALES, GEOMETRY_SCALES, STATE_TOKENS, readKindRules, tokenScale, unreadTokens } from '../lib/componentSource.mjs';
import { colorScaleOfProperty, hasColorLiteral, hasDimensionLiteral, stripVarFallbacks } from '../lib/cssValues.mjs';
import { readComponentConfig } from '../lib/dataDir.mjs';
import { findJsonKeyLine, isExcluded } from '../lib/findings.mjs';
import { geometryScaleOfProperty, resolveGeometryLiteral } from '../lib/geometry.mjs';
import { declarationPatch, declarations, neutralise, pageDeclaredNames } from '../lib/pageSource.mjs';
import { isContractToken } from '../lib/tokenVocabulary.mjs';

export const COLOR_BY_ROLE =
  'Pick the color token by the role the color plays, and the theme moves every role together. ' +
  'Text on a surface takes --text-primary through --text-disabled, the neutral text scale, or --text-<family> for a family color. ' +
  'Light text on a dark chip takes --text-inverted, which carries no AA guarantee. ' +
  'A surface fill takes --surface-<family>-<level>, where the role names the family: neutral for chrome, brand for emphasis, danger for status. ' +
  'A stroke takes --border-<family>-<level>, with levels from faint to strong. ' +
  'A translucent layer that dims what is behind it, such as the layer behind a modal, takes --scrim-low, --scrim, or --scrim-high. ' +
  'A translucent wash on a surface, such as a hover state, takes --tint-low, --tint, or --tint-high. ' +
  "Any other translucent color takes the role's token at an opacity, color-mix(in srgb, var(--surface-brand) 80%, transparent), the form the editor reads. " +
  'A fully transparent color takes --color-transparent. ' +
  'A gradient takes a --gradient-* token, or one composed from surface tokens. ' +
  "`npx live-tokens tokens --scale <name>` prints a scale's names and values, with --json for data.";

export const GEOMETRY_BY_SCALE =
  'Pick the geometry token from its scale. ' +
  'Spacing takes the nearest --space-<px> step, and `npx live-tokens tokens --scale space` prints the steps. ' +
  'A stroke width, an outline included, takes --border-width-1, --border-width-2, or --border-width-4. ' +
  'A corner takes --radius-sm through --radius-4xl, or --radius-full. ' +
  'A shadow takes --shadow-sm through --shadow-xl in place of the whole value. ' +
  'Part of a calc() takes the token inside the calc, such as calc(var(--space-64) * -2 + var(--space-8)). ' +
  'A duration or easing takes --duration-* or --ease-*, and a blur() takes --blur-*. No rule reports those three, so fix them while in the file.';

const COMPONENT_DEFAULT = 'In a component, make the :global(:root) default read the token, composed when needed.';

const INTRINSIC = "Declare a structural keyword, such as start, in the editor's `intrinsics`.";

const shared = {
  'tokens-migration': {
    severity: 'error',
    repair: 'auto',
    guidance:
      'A run without --no-fix applies these migrations to tokens.css. Each one adds design tokens the installed package reads and changes no existing token. `details.migrations` names them.',
  },
  'tokens-breaking-migration': {
    severity: 'error',
    repair: 'choice',
    guidance:
      'Each migration in `details.migrations` renames, removes, or rewrites design tokens in tokens.css. Read the plan with `npx live-tokens migrate --check`, apply it with `npx live-tokens migrate`, and move any page or component that reads an old name to the new one. To keep tokens.css as it is, record the `exception`.',
  },
  'color-literal': {
    severity: 'error',
    repair: 'choice',
    guidance: `Replace the literal with a design token. \`details.candidates\` lists the tokens on the scale the property reads. ${COLOR_BY_ROLE} ${COMPONENT_DEFAULT}`,
  },
  'dimension-literal': {
    severity: 'warn',
    repair: 'auto',
    guidance:
      'A run without --no-fix replaces each literal that has one nearest step. ' +
      'A literal left over has no single nearest step, so pick by the visual weight the candidates in `details` show. ' +
      `A size, such as a hero's height, is layout. Leave it. ${GEOMETRY_BY_SCALE} ${COMPONENT_DEFAULT}`,
  },
};

export const pageRules = {
  'unknown-token': {
    severity: 'error',
    repair: 'choice',
    guidance:
      'Search tokens.css for the stem. When the name has the shape of a design token and no longer exists, `npx live-tokens migrate --check` lists the migration that adds the current name.',
  },
  'raw-text-axis': {
    severity: 'error',
    repair: 'choice',
    guidance:
      'Set every axis from one text style bundle, -font-family through -letter-spacing. The text styles are heading, body, editorial, and code, and `npx live-tokens tokens --scale heading` prints one of them. Rewrite a font: shorthand the same way.',
  },
  'hardcoded-columns': {
    severity: 'warn',
    repair: 'choice',
    guidance:
      'Use repeat(var(--columns-count), 1fr) for the page grid, and repeat(calc(var(--columns-count) - 2), 1fr) for a sub-grid that spans fewer columns. `details.candidates` holds both forms.',
  },
  ...shared,
};

export const componentRules = {
  'unread-token': {
    severity: 'warn',
    repair: 'choice',
    guidance:
      "The message names the property the runtime declares in :global(:root) and never reads. Wire it into the runtime's CSS where it paints, as the Runtime component section of live-tokens-create-component wires a property, or delete the declaration when nothing should paint with it.",
  },
  'unknown-token-ref': {
    severity: 'error',
    repair: 'choice',
    guidance:
      "Point the default at a design token or one of the component's own semantic properties. A state is a segment of a property name, so replace a reference that starts with a state by the token that state should paint. When the name has the shape of a design token and no longer exists, search tokens.css for the rename, and `npx live-tokens migrate --check` lists the migration that adds it. " +
      COMPONENT_DEFAULT,
  },
  'default-not-token': {
    severity: 'error',
    repair: 'choice',
    guidance: `Make the :global(:root) default read a design token, composed when needed. ${INTRINSIC}`,
  },
  'config-token': {
    severity: 'error',
    repair: 'choice',
    guidance:
      "The message names the alias in component-configs/<id>/default.json that names something outside the vocabulary, or a bare literal on a property the editor declares no intrinsic for. Point the alias at a design token or one of the component's own semantic properties, or declare the intrinsic in the editor. " +
      `${COLOR_BY_ROLE} ${GEOMETRY_BY_SCALE}`,
  },
  ...shared,
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

/**
 * Runs before either checker reads the vocabulary, so a tokens.css behind the
 * installed package never surfaces as unknown tokens. `engine` is a test seam.
 */
export async function checkTokensCssMigrations({ root = process.cwd(), apply, engine } = {}) {
  const result = { applied: [], findings: [] };
  const loaded = engine ?? (await loadBuiltEngine());
  if (!loaded) return result;
  const { TOKENS_CSS_MIGRATIONS, readLiveTokensConfig, runAdditiveTokensCssMigrations, runTokensCssMigrations } = loaded;
  const tokensPath = resolveTokensCssPath(null, readLiveTokensConfig().tokensCssPath, root);
  if (!tokensPath || !existsSync(tokensPath)) return result;
  const file = relative(root, tokensPath);
  if (isExcluded(file, root)) return result;

  const migration = (id) => TOKENS_CSS_MIGRATIONS.find((m) => m.id === id);
  const listed = (ids) => ids.map((id) => ({ id, description: migration(id).description }));

  let css = readFileSync(tokensPath, 'utf8');
  const additive = runAdditiveTokensCssMigrations(css);
  if (additive.changed) {
    const finding = {
      rule: 'tokens-migration',
      file,
      line: 1,
      message: `${file} lacks design tokens the installed package reads: ${additive.applied.join(', ')}`,
      details: { migrations: listed(additive.applied) },
    };
    if (apply) {
      writeFileSync(tokensPath, additive.css);
      css = additive.css;
      result.applied.push(finding);
    } else {
      result.findings.push(finding);
    }
  }

  const breaking = runTokensCssMigrations(css).applied.filter((id) => migration(id).kind === 'breaking');
  if (breaking.length > 0) {
    result.findings.push({
      rule: 'tokens-breaking-migration',
      file,
      line: 1,
      message: `${file} has breaking migrations pending: ${breaking.join(', ')}`,
      details: { migrations: listed(breaking) },
    });
  }
  return result;
}
