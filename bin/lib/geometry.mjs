// Which token a raw dimension should have been, computed rather than guessed.
//
// `dimension-literal` fires on a declaration the checkers already flagged; this
// module answers the follow-up a repair needs: what the literal measures, which
// step of its scale sits nearest, and whether that step is unique. A tie is the
// one case a person has to settle, so it is reported rather than resolved.

import { stripVarFallbacks } from './cssValues.mjs';

const REM_PX = 16;

// The same literals `hasDimensionLiteral` flags: px and rem, no leading sign.
const LITERAL = /(?<![\w.-])(\d*\.?\d+)(px|rem)\b/g;

const round = (n) => Math.round(n * 1000) / 1000;

/**
 * A token's value in pixels, or null when it is not a single length. A shadow
 * step (`1px 1px 2px hsla(...)`) and `--space-full: 100%` both measure nothing
 * a literal can be matched against, so neither becomes a candidate.
 */
function pixelsOf(value) {
  const m = /^\s*(\d*\.?\d+)(px|rem)?\s*$/.exec(value);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!m[2]) return n === 0 ? 0 : null;
  return m[2] === 'rem' ? n * REM_PX : n;
}

/** The token scale a CSS property draws its lengths from, for check-page. */
export function geometryScaleOfProperty(prop) {
  if (/-radius$/.test(prop)) return 'radius';
  if (/shadow$/.test(prop)) return 'shadow';
  if (/^(border|outline)(-|$)/.test(prop)) return 'border-width';
  if (/^(padding|margin|gap|row-gap|column-gap|inset|top|right|bottom|left)(-|$)/.test(prop)) return 'space';
  return null;
}

/**
 * Every literal in a declaration, each with the nearest step of `scale`.
 *
 * A term inside `calc()` or a shorthand is measured on its own, so
 * `padding: 8px 16px` reports two literals and `calc(100% - 20px)` reports the
 * 20px. `auto` holds only when every one of them lands on a single step:
 * a tie, or a scale with no comparable steps, leaves the choice open.
 */
export function resolveGeometryLiteral(value, scale, tokens = []) {
  const steps = [];
  for (const token of tokens) {
    const px = pixelsOf(token.value ?? '');
    if (px !== null) steps.push({ token: token.name, px });
  }

  const literals = [];
  for (const m of stripVarFallbacks(value).matchAll(LITERAL)) {
    const px = round(parseFloat(m[1]) * (m[2] === 'rem' ? REM_PX : 1));
    if (px === 0) continue;
    const nearest = steps.reduce((best, s) => Math.min(best, Math.abs(s.px - px)), Infinity);
    const candidates = steps
      .filter((s) => Math.abs(Math.abs(s.px - px) - nearest) < 1e-6)
      .map((s) => ({ token: s.token, px: s.px, shift: round(s.px - px) }));
    literals.push({ value: m[0], px, candidates });
  }

  return {
    scale,
    literals,
    auto: literals.length > 0 && literals.every((l) => l.candidates.length === 1),
  };
}
