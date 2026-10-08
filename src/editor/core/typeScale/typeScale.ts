export const USAGES = ['display', 'heading', 'body', 'editorial', 'code'] as const;
export type Usage = (typeof USAGES)[number];

export const STEPS = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
export type Step = (typeof STEPS)[number];

export const EXPONENT: Readonly<Record<Step, number>> = {
  '2xs': -3,
  xs: -2,
  sm: -1,
  md: 0,
  lg: 1,
  xl: 2,
  '2xl': 3,
};

export const VIEWPORTS = ['desktop', 'tablet', 'phone'] as const;
export type Viewport = (typeof VIEWPORTS)[number];
export type CompressedViewport = Exclude<Viewport, 'desktop'>;

export const MEDIA_QUERY: Readonly<Record<CompressedViewport, string>> = {
  tablet: '(max-width: 768px)',
  phone: '(max-width: 480px)',
};

export interface Interval {
  key: string;
  label: string;
  /** Null for the custom entry, which takes any ratio in `CUSTOM_RATIO_RANGE`. */
  ratio: number | null;
}

export const INTERVALS: readonly Interval[] = [
  { key: 'minor-second', label: 'Minor second', ratio: 1.067 },
  { key: 'major-second', label: 'Major second', ratio: 1.125 },
  { key: 'minor-third', label: 'Minor third', ratio: 1.2 },
  { key: 'major-third', label: 'Major third', ratio: 1.25 },
  { key: 'perfect-fourth', label: 'Perfect fourth', ratio: 1.333 },
  { key: 'augmented-fourth', label: 'Augmented fourth', ratio: 1.414 },
  { key: 'perfect-fifth', label: 'Perfect fifth', ratio: 1.5 },
  { key: 'golden', label: 'Golden ratio', ratio: 1.618 },
  { key: 'custom', label: 'Custom', ratio: null },
];

export const CUSTOM_RATIO_RANGE = { min: 1.01, max: 2 } as const;
export const COMPRESSION_RANGE = { min: 0.4, max: 1 } as const;

/** Pixels per rem. Bases are rem counts, and the power rule works in px. */
export const ROOT_PX = 16;

export type LineHeight = 'none' | 'tightest' | 'tighter' | 'tight' | 'normal' | 'relaxed';
export type LetterSpacing = 'tighter' | 'tight' | 'normal' | 'wide' | 'wider';

export interface UsageDefaults {
  /** A token name, such as `--font-display`. */
  face: string;
  /** A token name, such as `--font-weight-semibold`. */
  weight: string;
  /** Desktop size of the md step, in rem. */
  base: number;
  ratio: number;
  lineHeight: Readonly<Record<Step, LineHeight>>;
  letterSpacing: Readonly<Record<Step, LetterSpacing>>;
  /** Steps whose family ships unlinked, pinned to this font stack token. */
  familyPins: Readonly<Partial<Record<Step, string>>>;
  /** Elements `site.css` maps to each step. */
  elements: Readonly<Partial<Record<Step, readonly string[]>>>;
}

export interface EyebrowDefaults {
  /** The usage whose face and weight the eyebrow links to. */
  usage: Usage;
  /** The step of that usage whose sizes the eyebrow follows. */
  sizeStep: Step;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
  textTransform: string;
}

const allNormal: Record<Step, 'normal'> = {
  '2xs': 'normal',
  xs: 'normal',
  sm: 'normal',
  md: 'normal',
  lg: 'normal',
  xl: 'normal',
  '2xl': 'normal',
};

/** The tokens.css migrations freeze their own copy of these values; a change here needs one. */
export const DEFAULTS: {
  compression: Readonly<Record<CompressedViewport, number>>;
  usages: Readonly<Record<Usage, UsageDefaults>>;
  eyebrow: EyebrowDefaults;
} = {
  compression: { tablet: 0.75, phone: 0.63 },
  usages: {
    display: {
      face: '--font-display',
      weight: '--font-weight-semibold',
      base: 3,
      ratio: 1.2,
      lineHeight: {
        '2xs': 'tighter',
        xs: 'tighter',
        sm: 'tighter',
        md: 'tightest',
        lg: 'tightest',
        xl: 'tightest',
        '2xl': 'tightest',
      },
      letterSpacing: { ...allNormal, lg: 'tight', xl: 'tight', '2xl': 'tight' },
      familyPins: {},
      elements: {},
    },
    heading: {
      face: '--font-display',
      weight: '--font-weight-semibold',
      base: 1.5,
      ratio: 1.25,
      lineHeight: {
        '2xs': 'tight',
        xs: 'tight',
        sm: 'tighter',
        md: 'tighter',
        lg: 'tightest',
        xl: 'tightest',
        '2xl': 'tightest',
      },
      letterSpacing: allNormal,
      familyPins: { '2xs': '--font-sans', xs: '--font-sans', sm: '--font-sans' },
      elements: { '2xs': ['h6'], xs: ['h5'], sm: ['h4'], md: ['h3'], lg: ['h2'], xl: ['h1'] },
    },
    body: {
      face: '--font-sans',
      weight: '--font-weight-normal',
      base: 1,
      ratio: 1.125,
      lineHeight: {
        '2xs': 'tight',
        xs: 'tight',
        sm: 'tight',
        md: 'normal',
        lg: 'tight',
        xl: 'tighter',
        '2xl': 'tighter',
      },
      letterSpacing: allNormal,
      familyPins: {},
      elements: { sm: ['small'], md: ['p', 'li'] },
    },
    editorial: {
      face: '--font-editorial',
      weight: '--font-weight-normal',
      base: 1,
      ratio: 1.125,
      lineHeight: {
        '2xs': 'tighter',
        xs: 'tighter',
        sm: 'tight',
        md: 'normal',
        lg: 'tight',
        xl: 'tighter',
        '2xl': 'tightest',
      },
      letterSpacing: allNormal,
      familyPins: {},
      elements: {},
    },
    code: {
      face: '--font-mono',
      weight: '--font-weight-normal',
      base: 0.875,
      ratio: 1.125,
      lineHeight: {
        '2xs': 'normal',
        xs: 'normal',
        sm: 'normal',
        md: 'normal',
        lg: 'normal',
        xl: 'normal',
        '2xl': 'normal',
      },
      letterSpacing: allNormal,
      familyPins: {},
      elements: { md: ['pre'] },
    },
  },
  eyebrow: {
    usage: 'body',
    sizeStep: 'sm',
    lineHeight: 'normal',
    letterSpacing: 'normal',
    textTransform: 'none',
  },
};

export const EYEBROW_PREFIX = '--eyebrow';
export type StylePrefix = `--${Usage}-${Step}` | typeof EYEBROW_PREFIX;
export type UsageSetting = 'font-family' | 'font-weight' | 'scale-base' | 'scale-ratio';
export type StyleAxis = 'font-family' | 'font-weight' | 'line-height' | 'letter-spacing' | 'text-transform';

export const compressionName = (viewport: CompressedViewport): string =>
  `--type-${viewport}-scale-compression`;
export const usageName = (usage: Usage, setting: UsageSetting): string => `--${usage}-${setting}`;
export const stepPrefix = (usage: Usage, step: Step): StylePrefix => `--${usage}-${step}`;
export const axisName = (prefix: StylePrefix, axis: StyleAxis): string => `${prefix}-${axis}`;
export const sizeName = (prefix: StylePrefix, viewport: Viewport): string =>
  `${prefix}-${viewport}-font-size`;
/**
 * The structural size. `tokens.css` points it at the desktop size and re-points
 * it at each breakpoint, so the editor never writes it and no theme holds it.
 */
export const fontSizeName = (prefix: StylePrefix): string => `${prefix}-font-size`;

/** Steps in `tokens.css` order, largest first. */
const STEPS_DOWN: readonly Step[] = [...STEPS].reverse();

/** Every text style, in `tokens.css` order: each usage's steps, then the eyebrow. */
export const STYLE_PREFIXES: readonly StylePrefix[] = [
  ...USAGES.flatMap((usage) => STEPS_DOWN.map((step) => stepPrefix(usage, step))),
  EYEBROW_PREFIX,
];

export function scalePx(base: number, ratio: number, step: Step): number {
  return base * ROOT_PX * ratio ** EXPONENT[step];
}

export function recommend(desktopPx: number, compression: number): number {
  return Math.min(desktopPx, ROOT_PX * (desktopPx / ROOT_PX) ** compression);
}

/** A number as CSS writes it: at most four decimals, no trailing zeros. */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(4)));
}

export function formatRem(rem: number): string {
  return `${formatNumber(rem)}rem`;
}

/** The step's desktop size as a unitless rem count over the usage's scale settings. */
export function scaleTerm(usage: Usage, step: Step): string {
  const base = `var(${usageName(usage, 'scale-base')})`;
  const n = EXPONENT[step];
  return n === 0 ? base : `${base} * pow(var(${usageName(usage, 'scale-ratio')}), ${n})`;
}

export function desktopScaleExpression(usage: Usage, step: Step): string {
  return `calc(${scaleTerm(usage, step)} * 1rem)`;
}

function recommendationExpression(prefix: StylePrefix, remTerm: string, viewport: CompressedViewport): string {
  return `min(var(${sizeName(prefix, 'desktop')}), calc(pow(${remTerm}, var(${compressionName(viewport)})) * 1rem))`;
}

/** The recommendation while the desktop size follows the scale. */
export function recommendedScaleExpression(usage: Usage, step: Step, viewport: CompressedViewport): string {
  return recommendationExpression(stepPrefix(usage, step), scaleTerm(usage, step), viewport);
}

/** The recommendation once the desktop size holds an edit of `desktopRem`. */
export function recommendedEditedExpression(
  prefix: StylePrefix,
  desktopRem: number,
  viewport: CompressedViewport,
): string {
  return recommendationExpression(prefix, formatNumber(desktopRem), viewport);
}

export interface TokenDeclaration {
  name: string;
  value: string;
}

const ref = (name: string): string => `var(${name})`;
const COMPRESSED: readonly CompressedViewport[] = ['tablet', 'phone'];

/** The text-style block of `tokens.css`, one entry per declaration, in file order. */
export function typeScaleDeclarations(): TokenDeclaration[] {
  const out: TokenDeclaration[] = COMPRESSED.map((vp) => ({
    name: compressionName(vp),
    value: formatNumber(DEFAULTS.compression[vp]),
  }));

  for (const usage of USAGES) {
    const d = DEFAULTS.usages[usage];
    out.push(
      { name: usageName(usage, 'font-family'), value: ref(d.face) },
      { name: usageName(usage, 'font-weight'), value: ref(d.weight) },
      { name: usageName(usage, 'scale-base'), value: formatNumber(d.base) },
      { name: usageName(usage, 'scale-ratio'), value: formatNumber(d.ratio) },
    );
    for (const step of STEPS_DOWN) {
      const prefix = stepPrefix(usage, step);
      const pin = d.familyPins[step];
      out.push(
        { name: axisName(prefix, 'font-family'), value: ref(pin ?? usageName(usage, 'font-family')) },
        { name: sizeName(prefix, 'desktop'), value: desktopScaleExpression(usage, step) },
        ...COMPRESSED.map((vp) => ({
          name: sizeName(prefix, vp),
          value: recommendedScaleExpression(usage, step, vp),
        })),
        { name: fontSizeName(prefix), value: ref(sizeName(prefix, 'desktop')) },
        { name: axisName(prefix, 'font-weight'), value: ref(usageName(usage, 'font-weight')) },
        { name: axisName(prefix, 'line-height'), value: ref(`--line-height-${d.lineHeight[step]}`) },
        { name: axisName(prefix, 'letter-spacing'), value: ref(`--letter-spacing-${d.letterSpacing[step]}`) },
      );
    }
  }

  const e = DEFAULTS.eyebrow;
  const follows = stepPrefix(e.usage, e.sizeStep);
  out.push(
    { name: axisName(EYEBROW_PREFIX, 'font-family'), value: ref(usageName(e.usage, 'font-family')) },
    ...VIEWPORTS.map((vp) => ({ name: sizeName(EYEBROW_PREFIX, vp), value: ref(sizeName(follows, vp)) })),
    { name: fontSizeName(EYEBROW_PREFIX), value: ref(sizeName(EYEBROW_PREFIX, 'desktop')) },
    { name: axisName(EYEBROW_PREFIX, 'font-weight'), value: ref(usageName(e.usage, 'font-weight')) },
    { name: axisName(EYEBROW_PREFIX, 'line-height'), value: ref(`--line-height-${e.lineHeight}`) },
    { name: axisName(EYEBROW_PREFIX, 'letter-spacing'), value: ref(`--letter-spacing-${e.letterSpacing}`) },
    { name: axisName(EYEBROW_PREFIX, 'text-transform'), value: e.textTransform },
  );
  return out;
}

/** The breakpoint re-points of the structural sizes, in file order. */
export function typeScaleMediaDeclarations(viewport: CompressedViewport): TokenDeclaration[] {
  return STYLE_PREFIXES.map((prefix) => ({
    name: fontSizeName(prefix),
    value: ref(sizeName(prefix, viewport)),
  }));
}

export const STRUCTURAL_NAMES: ReadonlySet<string> = new Set(STYLE_PREFIXES.map(fontSizeName));

/** Every name the editor may write. */
export const EDITABLE_NAMES: ReadonlySet<string> = new Set(
  typeScaleDeclarations()
    .map((d) => d.name)
    .filter((name) => !STRUCTURAL_NAMES.has(name)),
);
