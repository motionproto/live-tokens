export type TokenKind =
  | 'surface'
  | 'border'
  | 'border-width'
  | 'radius'
  | 'divider-width'
  | 'divider-height'
  | 'divider-inset'
  | 'dot-size'
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

/** Suffix/prefix patterns mapped to kinds — the one source of truth for the
    editor's selector layout and the `adjust` CLI, so the two cannot drift.
    Order matters: `-text` must run before `-border`/`-surface` because `--text-*`
    would otherwise match `surface`/`border` if any pattern overlapped. Variables
    that don't match any pattern fall through to `text-color` (renders as a palette
    picker). Tokens with unconventional suffixes should be renamed. */
export const KIND_PATTERNS: ReadonlyArray<{ kind: TokenKind; matches: (v: string) => boolean }> = [
  { kind: 'font-family',    matches: (v) => v.endsWith('-font-family') },
  { kind: 'font-weight',    matches: (v) => v.endsWith('-font-weight') },
  { kind: 'font-size',      matches: (v) => v.endsWith('-font-size') || v.endsWith('-icon-size') || v.endsWith('-thumb-size') },
  { kind: 'line-height',    matches: (v) => v.endsWith('-line-height') },
  { kind: 'letter-spacing', matches: (v) => v.endsWith('-letter-spacing') },
  { kind: 'text-color',     matches: (v) => v.endsWith('-text') || v.startsWith('--text-') },
  { kind: 'radius',         matches: (v) => v.endsWith('-radius') || v.startsWith('--radius-') },
  { kind: 'divider-width',  matches: (v) => v.endsWith('-divider-width') || v.endsWith('-divider-thickness') },
  { kind: 'divider-height', matches: (v) => v.endsWith('-divider-height') || v.endsWith('-track-height') },
  { kind: 'divider-inset',  matches: (v) => v.endsWith('-divider-inset') },
  { kind: 'dot-size',       matches: (v) => v.endsWith('-dot-size') },
  { kind: 'blur',           matches: (v) => v.endsWith('-blur') || v.startsWith('--blur-') },
  { kind: 'scale',          matches: (v) => v.endsWith('-scale') || v.startsWith('--scale-') },
  { kind: 'shadow',         matches: (v) => v.endsWith('-shadow') || v.startsWith('--shadow-') },
  { kind: 'padding',        matches: (v) => v.endsWith('-padding') || v.endsWith('-margin') },
  { kind: 'gap',            matches: (v) => v.endsWith('-gap') },
  { kind: 'duration',       matches: (v) => v.endsWith('-duration') || v.startsWith('--duration-') },
  { kind: 'easing',         matches: (v) => v.endsWith('-easing') || v.startsWith('--ease-') },
  { kind: 'border-width',   matches: (v) => v.endsWith('-border-width') || v.endsWith('-accent-width') || v.endsWith('-hairline-thickness') || v.startsWith('--border-width-') },
  { kind: 'border',         matches: (v) => v.endsWith('-border') || v.startsWith('--border-') },
  { kind: 'surface',        matches: (v) => v.endsWith('-surface') || v.startsWith('--surface-') },
];

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

/** Side-aware kind test. Per-side paddings (`--card-default-body-padding-top`)
    are written by UIPaddingSelector and never declared as editor tokens, so
    `rawKind` never meets one; the CLI does, and they belong with their parent. */
export function matchesKind(variable: string, kind: TokenKind): boolean {
  const side = SIDE_SUFFIXES.find((s) => variable.endsWith(s));
  return MATCHER_BY_KIND[kind](side ? variable.slice(0, -side.length) : variable);
}
