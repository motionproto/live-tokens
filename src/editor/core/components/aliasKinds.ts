export type TokenKind =
  | 'surface'
  | 'border'
  | 'border-width'
  | 'radius'
  | 'divider-width'
  | 'divider-height'
  | 'divider-inset'
  | 'dot-size'
  | 'length'
  | 'blur'
  | 'scale'
  | 'shadow'
  | 'font-family'
  | 'font-weight'
  | 'font-size'
  | 'line-height'
  | 'letter-spacing'
  | 'padding'
  | 'gap'
  | 'duration'
  | 'easing'
  | 'text-color';

/** Suffix and prefix data mapped to kinds — the one source of truth for the
    editor's selector layout, the `adjust` CLI, and `check-component`'s naming
    rule, so the three cannot drift. `bin/check-component.mjs` reads the
    `suffix:` arrays out of this file, which is why they are plain literals.

    Order matters: `-text` must run before `-border`/`-surface`, and
    `-accent-width` before `-accent`, because the first match wins. A variable
    matching nothing falls through to `text-color` (a palette picker), but that
    fall-through is a smell — `check-component` rejects an unrecognised suffix,
    so add the name here rather than letting it drift. */
export const KIND_RULES: ReadonlyArray<{
  kind: TokenKind;
  suffix?: readonly string[];
  prefix?: readonly string[];
}> = [
  { kind: 'font-family',    suffix: ['-font-family'] },
  { kind: 'font-weight',    suffix: ['-font-weight'] },
  { kind: 'font-size',      suffix: ['-font-size', '-icon-size', '-thumb-size'] },
  { kind: 'line-height',    suffix: ['-line-height'] },
  { kind: 'letter-spacing', suffix: ['-letter-spacing'] },
  // Element-named colour roles: the property *is* the element it paints.
  { kind: 'text-color',     suffix: ['-text', '-label', '-icon', '-title', '-body', '-eyebrow',
                                     '-description', '-hint', '-error', '-placeholder', '-value'],
                            prefix: ['--text-'] },
  { kind: 'radius',         suffix: ['-radius'], prefix: ['--radius-'] },
  { kind: 'divider-width',  suffix: ['-divider-width', '-divider-thickness'] },
  { kind: 'divider-height', suffix: ['-divider-height', '-track-height'] },
  { kind: 'divider-inset',  suffix: ['-divider-inset', '-inset'] },
  { kind: 'dot-size',       suffix: ['-dot-size'] },
  { kind: 'blur',           suffix: ['-blur'], prefix: ['--blur-'] },
  { kind: 'scale',          suffix: ['-scale'], prefix: ['--scale-'] },
  { kind: 'shadow',         suffix: ['-shadow'], prefix: ['--shadow-'] },
  { kind: 'padding',        suffix: ['-padding', '-margin'] },
  { kind: 'gap',            suffix: ['-gap'] },
  { kind: 'duration',       suffix: ['-duration'], prefix: ['--duration-'] },
  { kind: 'easing',         suffix: ['-easing'], prefix: ['--ease-'] },
  { kind: 'border-width',   suffix: ['-border-width', '-accent-width', '-hairline-thickness', '-thickness'],
                            prefix: ['--border-width-'] },
  { kind: 'border',         suffix: ['-border'], prefix: ['--border-'] },
  // A dimension with no more specific name behind it — a panel's width, an
  // avatar's size. Last of the geometry rules, so every `-border-width`,
  // `-divider-height`, `-icon-size` and the rest claim their token first.
  { kind: 'length',         suffix: ['-width', '-height', '-size'] },
  // Fills. A tint is a wash over a surface, so it takes the surface picker: the
  // full palette with an alpha, not just the tint stops it defaults to.
  { kind: 'surface',        suffix: ['-surface', '-fill', '-divider', '-background', '-indicator',
                                     '-thumb', '-accent', '-color', '-tint', '-opacity'],
                            prefix: ['--surface-', '--tint', '--color-'] },
];

export const KIND_PATTERNS: ReadonlyArray<{ kind: TokenKind; matches: (v: string) => boolean }> =
  KIND_RULES.map(({ kind, suffix = [], prefix = [] }) => ({
    kind,
    matches: (v: string) => suffix.some((s) => v.endsWith(s)) || prefix.some((p) => v.startsWith(p)),
  }));

export function rawKind(variable: string): TokenKind {
  for (const { kind, matches } of KIND_PATTERNS) {
    if (matches(variable)) return kind;
  }
  return 'text-color';
}

const MATCHER_BY_KIND = Object.fromEntries(
  KIND_PATTERNS.map((p) => [p.kind, p.matches]),
) as Record<TokenKind, (v: string) => boolean>;

const SIDE_SUFFIXES = ['-top', '-right', '-bottom', '-left'];

/** Drops a per-side suffix so callers can test the parent name. */
export function stripSide(variable: string): string {
  const side = SIDE_SUFFIXES.find((s) => variable.endsWith(s));
  return side ? variable.slice(0, -side.length) : variable;
}

/** Side-aware kind test. Per-side paddings (`--card-default-body-padding-top`)
    are written by UIPaddingSelector and never declared as editor tokens, so
    `rawKind` never meets one; the CLI does, and they belong with their parent. */
export function matchesKind(variable: string, kind: TokenKind): boolean {
  return MATCHER_BY_KIND[kind](stripSide(variable));
}
