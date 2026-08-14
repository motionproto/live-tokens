// Google Fonts pairing per preset theme, from the plan's addendum 2. Called by
// generate-preset-themes.mjs, which stamps the pairing into the preset's
// colors-and-type file before embedding it in the theme — so applying either
// the colors and type alone or the whole look changes the type.
//
// Every URL below was checked against fonts.googleapis.com (200 plus the
// expected family and weight coverage in the returned CSS); the API answers 400
// for a weight a family does not have, so a passing URL is a real guarantee.

const STAMP_PREFIX = 'src_preset_';

export const PRESET_FONTS = {
  autumn: {
    display: { name: 'Fraunces', url: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@400..900&display=swap' },
    body: { name: 'Nunito Sans', url: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300..800&display=swap' },
  },
  yuletide: {
    display: { name: 'Mountains of Christmas', url: 'https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@400;700&display=swap' },
    body: { name: 'Nunito', url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@300..800&display=swap' },
  },
  halloween: {
    display: { name: 'Creepster', url: 'https://fonts.googleapis.com/css2?family=Creepster&display=swap' },
    body: { name: 'Karla', url: 'https://fonts.googleapis.com/css2?family=Karla:wght@300..800&display=swap' },
  },
  'midnight-study': {
    display: { name: 'EB Garamond', url: 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400..800&display=swap' },
    body: { name: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300..800&display=swap' },
  },
  ocean: {
    display: { name: 'Quicksand', url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap' },
    body: { name: 'Mulish', url: 'https://fonts.googleapis.com/css2?family=Mulish:wght@300..800&display=swap' },
  },
  'royal-velvet': {
    display: { name: 'Cinzel', url: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap' },
    body: { name: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap' },
  },
  leprechaun: {
    display: { name: 'Baloo 2', url: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@400..800&display=swap' },
    body: { name: 'Cabin', url: 'https://fonts.googleapis.com/css2?family=Cabin:wght@400..700&display=swap' },
  },
  'spring-meadow': {
    display: { name: 'Comfortaa', url: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap' },
    body: { name: 'Figtree', url: 'https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&display=swap' },
  },
  sunset: {
    display: { name: 'DM Serif Display', url: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap' },
    body: { name: 'Jost', url: 'https://fonts.googleapis.com/css2?family=Jost:wght@300..700&display=swap' },
  },
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Mirrors `parseGoogleFontsUrl`; throws rather than guess, so a table edge the
    editor's parser would read differently cannot be stamped silently. */
function weightsFromUrl(url) {
  const spec = new URL(url).searchParams.get('family').split(':')[1];
  if (!spec) return undefined;
  const match = spec.match(/^wght@(\d+(?:;\d+)*|\d+\.\.\d+)$/);
  if (!match) throw new Error(`unsupported family spec "${spec}" in ${url}`);
  const body = match[1];
  if (body.includes('..')) {
    const [lo, hi] = body.split('..').map(Number);
    const out = [];
    for (let w = lo; w <= hi; w += 100) out.push(w);
    return out;
  }
  return body.split(';').map(Number);
}

function sourceFor({ name, url }) {
  const id = `${STAMP_PREFIX}${slugify(name)}`;
  const weights = weightsFromUrl(url);
  return {
    id,
    kind: 'google',
    url,
    label: 'Google Fonts',
    families: [
      {
        id: `${id}:${slugify(name)}`,
        name,
        cssName: `"${name}"`,
        ...(weights ? { weights } : {}),
      },
    ],
  };
}

function rewriteStack(colorsAndType, variable, familyId) {
  const stack = colorsAndType.fontStacks?.find((s) => s.variable === variable);
  if (!stack) throw new Error(`colors and type have no ${variable} stack to rewrite`);
  stack.slots = [{ kind: 'project', familyId }, ...stack.slots.filter((s) => s.kind !== 'project')];
}

/**
 * Stamp the preset's pairing into `colorsAndType` in place: the two google
 * sources plus the `--font-display` / `--font-sans` project slots. Fallback
 * slots, the serif and mono stacks, and every other field are left alone.
 * Returns whether anything moved, so the caller can skip the write and the
 * `updatedAt` bump.
 */
export function stampPresetFonts(colorsAndType, slug) {
  const pairing = PRESET_FONTS[slug];
  if (!pairing) throw new Error(`no font pairing for preset "${slug}"`);

  const before = JSON.stringify([colorsAndType.fontSources, colorsAndType.fontStacks]);
  const display = sourceFor(pairing.display);
  const body = sourceFor(pairing.body);

  colorsAndType.fontSources = [
    ...(colorsAndType.fontSources ?? []).filter((s) => !s.id.startsWith(STAMP_PREFIX)),
    display,
    body,
  ];
  rewriteStack(colorsAndType, '--font-display', display.families[0].id);
  rewriteStack(colorsAndType, '--font-sans', body.families[0].id);

  // Sources displaced from the rewritten stacks would still ship as
  // render-blocking @imports in every consumer's fonts.css, so drop any
  // source no remaining stack references.
  const referenced = new Set(
    (colorsAndType.fontStacks ?? [])
      .flatMap((s) => s.slots)
      .filter((s) => s.kind === 'project')
      .map((s) => s.familyId),
  );
  colorsAndType.fontSources = colorsAndType.fontSources.filter((s) =>
    s.families.some((f) => referenced.has(f.id)),
  );

  return JSON.stringify([colorsAndType.fontSources, colorsAndType.fontStacks]) !== before;
}
