import { parseFontFaceText } from './fontParse';

export interface CssResponse {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}

export type CssFetcher = (url: string) => Promise<CssResponse>;

export interface ResolvedGoogleFont {
  /** As Google spells it in the returned CSS, not as the caller typed it. */
  name: string;
  url: string;
  weights: number[];
  italics: boolean;
  probeUrl: string;
}

/** The shipped `--font-weight-*` scale runs 100 to 900 in hundreds, so probing
 *  that ladder discovers every weight a theme can ask for. */
const LADDER = [100, 200, 300, 400, 500, 600, 700, 800, 900];

function familyParam(name: string): string {
  return name.trim().replace(/\s+/g, '+');
}

function url(name: string, spec?: string): string {
  const family = spec ? `${familyParam(name)}:${spec}` : familyParam(name);
  return `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
}

/**
 * Ask for every weight in both styles. Google silently drops the ones a family
 * does not have and answers 200 anyway, so the returned CSS is a census of the
 * family rather than a yes/no on the request. A 400 here means the family
 * itself is not on Google Fonts.
 */
export function discoveryUrl(name: string): string {
  const pairs = [
    ...LADDER.map((w) => `0,${w}`),
    ...LADDER.map((w) => `1,${w}`),
  ];
  return url(name, `ital,wght@${pairs.join(';')}`);
}

function isContiguous(weights: number[]): boolean {
  return weights.length > 1 && weights.every((w, i) => i === 0 || w - weights[i - 1] === 100);
}

/** The narrowest URL that still delivers everything the family has. A range
 *  serves one variable file; an enumeration serves one file per weight. */
export function persistUrlFor(name: string, weights: number[], italics: boolean): string {
  if (weights.length === 0 || (weights.length === 1 && weights[0] === 400 && !italics)) {
    return url(name);
  }
  if (isContiguous(weights)) {
    const range = `${weights[0]}..${weights[weights.length - 1]}`;
    return url(name, italics ? `ital,wght@0,${range};1,${range}` : `wght@${range}`);
  }
  const spec = italics
    ? `ital,wght@${[...weights.map((w) => `0,${w}`), ...weights.map((w) => `1,${w}`)].join(';')}`
    : `wght@${weights.join(';')}`;
  return url(name, spec);
}

function censusFrom(css: string, requested: string): { name: string; weights: number[]; italics: boolean } {
  const families = parseFontFaceText(css);
  if (families.length === 0) {
    throw new Error(`Google Fonts returned no @font-face rules for "${requested}".`);
  }
  const family = families[0];
  return {
    name: family.name,
    weights: family.weights ?? [],
    italics: family.italics === true,
  };
}

/**
 * Verify a family exists on Google Fonts and settle on the URL to persist.
 * Two requests in the common case: one to take the census, one to confirm the
 * narrower URL built from it. A range that the family's axis cannot serve
 * answers 400, so the enumerated form is the fallback rather than the guess.
 */
export async function resolveGoogleFont(name: string, fetcher: CssFetcher): Promise<ResolvedGoogleFont> {
  const probeUrl = discoveryUrl(name);
  const probe = await fetcher(probeUrl);
  if (!probe.ok) {
    throw new Error(
      `"${name}" is not on Google Fonts (the API answered ${probe.status}). ` +
        `Check the spelling against fonts.google.com.`,
    );
  }
  const census = censusFrom(await probe.text(), name);

  const candidates = [persistUrlFor(census.name, census.weights, census.italics)];
  const enumerated = census.weights.length > 0
    ? url(
        census.name,
        census.italics
          ? `ital,wght@${[...census.weights.map((w) => `0,${w}`), ...census.weights.map((w) => `1,${w}`)].join(';')}`
          : `wght@${census.weights.join(';')}`,
      )
    : null;
  if (enumerated && !candidates.includes(enumerated)) candidates.push(enumerated);
  const bare = url(census.name);
  if (!candidates.includes(bare)) candidates.push(bare);

  for (const candidate of candidates) {
    const res = await fetcher(candidate);
    if (!res.ok) continue;
    const served = censusFrom(await res.text(), census.name);
    return {
      name: census.name,
      url: candidate,
      weights: served.weights,
      italics: served.italics,
      probeUrl,
    };
  }
  throw new Error(`Could not build a working Google Fonts URL for "${census.name}".`);
}
