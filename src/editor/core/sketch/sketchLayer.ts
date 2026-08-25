/**
 * Sketch effect layer.
 *
 * Builds an SVG filter bank and a stylesheet from one SketchSettings and
 * injects both into every document cssVarSync tracks, so the host page behind
 * the overlay iframe gets the same effect the editor's preview shows.
 *
 * Nothing here reads or writes theme values. The effect is a layer over
 * whatever theme is active: it paints ::before/::after pseudo-elements from the
 * component's own --<component>-<variant>-{surface,border} tokens and hides the
 * component's real background and border behind them.
 *
 * Scope is an attribute, not a class, so a caller can switch it on for a whole
 * document root or for a single preview container:
 *   data-sketch="layered" | "global"   absent = off
 */
import { getSyncedDocuments } from '../cssVarSync';
import type { SketchSettings } from './sketchPresets';

const DEFS_ATTR = 'data-sketch-defs';
const STYLE_ATTR = 'data-sketch-style';
const ID = 'lt-sketch';

/** Distinct noise seeds. Equal-sized neighbours drawn from one seed are
    identical twins, which is the single biggest tell that it is not hand drawn. */
const SEEDS = [0, 1, 2, 3, 4];

const HACHURE_ANGLE = 45;

/**
 * One drawable part. `stem` is the token stem: the fill reads
 * `--{stem}-surface` and the stroke `--{stem}-border`, the naming every
 * component already follows, so most rows are one line. `fill`/`stroke`
 * override that where a component breaks the pattern.
 *
 * `positioned` marks a part that already establishes its own containing block.
 * The host rule must not force `position:relative` onto it, which would move an
 * absolutely-positioned element to wherever its flow position happens to be.
 *
 * `strokeless` keeps the effect off `::after`, for a part that owns that
 * pseudo-element itself.
 */
interface PartSpec {
  sel: string;
  stem?: string;
  fill?: string;
  stroke?: string;
  positioned?: boolean;
  strokeless?: boolean;
}

const BADGE_VARIANTS = [
  'primary', 'accent', 'special', 'neutral', 'alternate',
  'canvas', 'info', 'success', 'warning', 'danger',
];
/** `outline` is filled by its border alone, so it is listed separately. */
const FILLED_BUTTON_VARIANTS = ['primary', 'secondary', 'danger', 'success', 'warning'];
const STATUS_VARIANTS = ['info', 'success', 'warning', 'danger'];

/**
 * Every component the effect knows how to redraw.
 *
 * Interaction states are deliberately absent. The host's real background is
 * forced transparent, so a hover fill would have to be re-declared here per
 * state, per variant, for every component — and a draft look that flickers
 * between two noise fields on hover reads worse than one that holds still.
 * `.toggle.on` is the exception: its two states are the whole control.
 */
const PART_SPECS: readonly PartSpec[] = [
  // Buttons
  ...FILLED_BUTTON_VARIANTS.map((v) => ({ sel: `.button.${v}`, stem: `button-${v}` })),
  { sel: '.button.outline', fill: 'transparent', stroke: 'var(--button-outline-border)' },
  ...FILLED_BUTTON_VARIANTS.map((v) => ({ sel: `.icon-button.${v}`, stem: `iconbutton-${v}` })),
  { sel: '.icon-button.outline', fill: 'transparent', stroke: 'var(--iconbutton-outline-border)' },

  // Chips
  ...BADGE_VARIANTS.map((v) => ({ sel: `.badge-${v}`, stem: `badge-${v}` })),
  ...BADGE_VARIANTS.map((v) => ({
    sel: `.corner-badge-${v}`, stem: `corner-badge-${v}`, positioned: true,
  })),

  // Containers
  { sel: '.card', stem: 'card-default' },
  { sel: '.card-header', fill: 'var(--card-default-header-surface)', stroke: 'transparent' },
  { sel: '.panel', fill: 'var(--panel-stage-surface)', stroke: 'var(--panel-frame-border)' },
  { sel: '.codesnippet', stem: 'codesnippet' },
  { sel: '.table-wrapper', stem: 'table-default' },
  { sel: '.dialog', stem: 'dialog' },
  { sel: '.dialog-header', fill: 'var(--dialog-header-surface)', stroke: 'transparent' },
  {
    sel: '.es-root.variant-container',
    fill: 'var(--collapsiblesection-container-default-surface)',
    stroke: 'var(--collapsiblesection-container-frame-border)',
  },
  {
    sel: '.sidenavigation',
    fill: 'var(--sidenavigation-panel-surface)',
    stroke: 'var(--sidenavigation-panel-border)',
  },
  // The arrow is the tooltip's own ::after, so the box takes the fill only.
  { sel: '.tooltip', stem: 'tooltip', positioned: true, strokeless: true },

  // Status blocks
  ...STATUS_VARIANTS.map((v) => ({ sel: `.callout-${v}`, stem: `callout-${v}` })),
  ...STATUS_VARIANTS.map((v) => ({ sel: `.notification.${v}`, stem: `notification-${v}` })),

  // Controls
  { sel: '.input-control', stem: 'input-default' },
  { sel: '.menuselect', fill: 'var(--menuselect-default-surface)', stroke: 'transparent' },
  { sel: '.tab', stem: 'tabbar-default' },
  { sel: '.tab.active', stem: 'tabbar-active' },
  {
    sel: '.segmented-control',
    fill: 'var(--segmentedcontrol-bar-surface)',
    stroke: 'var(--segmentedcontrol-bar-border)',
  },
  {
    sel: '.progress-track',
    fill: 'var(--progressbar-track-surface)',
    stroke: 'var(--progressbar-track-border)',
  },
  { sel: '.image', fill: 'transparent', stroke: 'var(--image-default-border)' },
  { sel: '.toggle .track', stem: 'toggle-track' },
  { sel: '.toggle.on .track', stem: 'toggle-on-track' },

  // Rules. A hairline is a thin filled box, so it needs the fill layer and no
  // outline: a line does not get drawn around.
  { sel: '.sd-hairline', fill: 'var(--_divider-hairline-color)', strokeless: true },

  // Consumer opt-in. A page element that is not a component but paints a
  // token-driven surface sets --sketch-fill / --sketch-stroke itself and
  // carries this class; the layer then treats it like any other part.
  { sel: '.sketch-surface' },
  { sel: '.sketch-rule', strokeless: true },
];

/** Exported so a test can check that every selected part is also painted. */
export const PART_SELECTORS: readonly string[] = PART_SPECS.map((p) => p.sel);

const PARTS = PART_SELECTORS.join(', ');
const FLOW_PARTS = PART_SPECS.filter((p) => !p.positioned).map((p) => p.sel).join(', ');
const STROKE_PARTS = PART_SPECS.filter((p) => !p.strokeless).map((p) => p.sel).join(', ');

function levels(n: number): string {
  return Array.from({ length: n }, (_, i) => (i / (n - 1)).toFixed(3)).join(' ');
}

function rgbTransfer(type: string, attrs: string): string {
  return ['R', 'G', 'B'].map((c) => `<feFunc${c} type="${type}" ${attrs}/>`).join('');
}

/**
 * Greyscale luminance mask over the fill: white keeps the fill, black erases
 * it, so the noise decides where ink landed and where it ran out.
 *
 * The `#` in the filter reference must stay raw. Pre-encoding it as %23 makes
 * encodeURIComponent escape the % into %25, the reference dies, and the mask
 * silently becomes a no-op.
 */
export function buildMaskUri(s: SketchSettings): string {
  const lvl = s.maskPosterize > 1 ? levels(s.maskPosterize) : '';
  const shift = (s.maskFloor - 0.5).toFixed(3);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">` +
      `<filter id="m" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
        `<feTurbulence type="fractalNoise" baseFrequency="${s.maskFrequency}" numOctaves="${s.maskOctaves}" seed="9"/>` +
        `<feColorMatrix type="saturate" values="0"/>` +
        `<feComponentTransfer>` +
          rgbTransfer('linear', `slope="${s.maskContrast}" intercept="${shift}"`) +
          `<feFuncA type="linear" slope="0" intercept="1"/>` +
        `</feComponentTransfer>` +
        (lvl ? `<feComponentTransfer>${rgbTransfer('discrete', `tableValues="${lvl}"`)}</feComponentTransfer>` : '') +
        (s.maskSoftness > 0 ? `<feGaussianBlur stdDeviation="${s.maskSoftness}"/>` : '') +
      `</filter>` +
      // The rect overhangs the viewport so the blur bleeds outside the visible
      // tile instead of drawing a dark rim that shows up as a seam when it repeats.
      `<rect x="-100" y="-100" width="800" height="800" filter="url(#m)"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Along-stroke pressure. Low frequency and a high floor, so the line mostly
    holds and only thins in patches. Same luminance contract as the fill mask. */
function pressureUri(s: SketchSettings): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">` +
      `<filter id="q" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
        `<feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="31"/>` +
        `<feColorMatrix type="saturate" values="0"/>` +
        `<feComponentTransfer>` +
          rgbTransfer('linear', `slope="${1 + s.pressureMod * 2.5}" intercept="${0.5 - s.pressureMod * 0.9}"`) +
          `<feFuncA type="linear" slope="0" intercept="1"/>` +
        `</feComponentTransfer>` +
      `</filter>` +
      `<rect x="-60" y="-60" width="520" height="520" filter="url(#q)"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function buildDefsMarkup(s: SketchSettings): string {
  const displace = (id: string, freq: number, seed: number, scale: number, pad: number) =>
    `<filter id="${id}" x="-${pad}%" y="-${pad}%" width="${100 + pad * 2}%" height="${100 + pad * 2}%" color-interpolation-filters="sRGB">` +
      `<feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="${s.octaves}" seed="${seed}" result="n"/>` +
      `<feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>` +
    `</filter>`;

  const banks = SEEDS.map((seed) =>
    displace(`${ID}-fill-${seed}`, s.frequency, seed, s.fillScale, 15) +
    // Offset seeds so the outline never tracks the fill exactly. That
    // disagreement at the edges is the whole effect.
    displace(`${ID}-stroke-${seed}`, s.frequency, seed + 17, s.strokeScale, 15) +
    // Small components take a reduced, higher-frequency displacement.
    displace(`${ID}-fill-sm-${seed}`, s.frequency * 2.2, seed, s.fillScale * 0.35, 25) +
    displace(`${ID}-stroke-sm-${seed}`, s.frequency * 2.2, seed + 17, s.strokeScale * 0.35, 25),
  ).join('');

  // Ink pooling. Blur spreads the stroke, then a steep alpha curve re-sharpens
  // it. Where two runs of the border sit within blur distance of each other,
  // which is exactly what happens at a corner, the fields sum past the
  // threshold and bulge.
  const pool =
    `<filter id="${ID}-pool" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
      `<feGaussianBlur stdDeviation="${s.pooling}" result="b"/>` +
      `<feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"/>` +
    `</filter>`;

  return `<defs>${banks}${pool}</defs>`;
}

/** Per-instance variation. Three coprime cycles give 7x11x13 = 1001
    combinations, so the pattern does not visibly repeat on a real page. */
const JITTER_X_SCALE = [
  '--sketch-jx: 0.8; --sketch-js: -0.4;',
  '--sketch-jx: -0.35; --sketch-js: 0.7;',
  '--sketch-jx: 0.15; --sketch-js: -0.85;',
  '--sketch-jx: -0.9; --sketch-js: 0.2;',
  '--sketch-jx: 0.55; --sketch-js: -0.15;',
  '--sketch-jx: -0.6; --sketch-js: 0.95;',
  '--sketch-jx: 0.3; --sketch-js: -0.55;',
];
const JITTER_Y_WEIGHT = [
  '--sketch-jy: 0.45; --sketch-jw: -0.6;',
  '--sketch-jy: -0.8; --sketch-jw: 0.85;',
  '--sketch-jy: 0.9; --sketch-jw: -0.25;',
  '--sketch-jy: -0.2; --sketch-jw: 0.5;',
  '--sketch-jy: 0.6; --sketch-jw: -0.95;',
  '--sketch-jy: -0.95; --sketch-jw: 0.3;',
  '--sketch-jy: 0.1; --sketch-jw: 0.7;',
  '--sketch-jy: -0.5; --sketch-jw: -0.45;',
  '--sketch-jy: 0.75; --sketch-jw: 0.15;',
  '--sketch-jy: -0.3; --sketch-jw: -0.8;',
  '--sketch-jy: 0.25; --sketch-jw: 0.6;',
];
const JITTER_ROT = [
  -0.7, 0.35, 0.85, -0.15, 0.5, -0.9, 0.2, 0.65, -0.4, 0.95, -0.25, 0.75, -0.6,
];

/** The mask tiles from each element's own origin, so identical elements would
    otherwise get identical blotches. Shift the sampling window per instance. */
const MASK_POS = ['0 0', '-137px -211px', '-311px -97px', '-73px -389px', '-419px -263px'];


export function buildStylesheet(s: SketchSettings): string {
  const on = '[data-sketch]';
  const layered = "[data-sketch='layered']";
  const parts = `:is(${PARTS})`;
  const el = `${layered} ${parts}`;
  const strokeEl = `${layered} :is(${STROKE_PARTS})`;

  const vars =
    `${on}{` +
      `--sketch-stroke-width:${s.strokeWidth}px;` +
      `--sketch-stroke-style:${s.strokeStyle};` +
      `--sketch-fill-dx:${s.fillDx}px;` +
      `--sketch-fill-dy:${s.fillDy}px;` +
      `--sketch-hachure-angle:${HACHURE_ANGLE}deg;` +
      `--sketch-fill-filter:url(#${ID}-fill-0);` +
      `--sketch-stroke-filter:url(#${ID}-stroke-0);` +
      `--sketch-mask-image:${s.maskOn ? buildMaskUri(s) : 'none'};` +
      `--sketch-mask-size:${s.maskScale}px ${s.maskScale}px;` +
      `--sketch-jit-x-base:${s.jitterX}px;` +
      `--sketch-jit-y-base:${s.jitterY}px;` +
      `--sketch-jit-rot-base:${s.jitterRot}deg;` +
      `--sketch-jit-scale-base:${s.jitterScale};` +
      `--sketch-grow:${s.fillGrow};` +
      `--sketch-pressure:${s.pressure};` +
      `--sketch-press-image:${s.pressureMod > 0 ? pressureUri(s) : 'none'};` +
      // opacity(1) is the no-op that lets pooling be switched out of the chain.
      `--sketch-pool:${s.pooling > 0 ? `url(#${ID}-pool)` : 'opacity(1)'};` +
    `}`;

  const globalMode = `[data-sketch='global']{filter:var(--sketch-fill-filter);}`;

  const host =
    `${el}{` +
      `--sketch-jit-x:var(--sketch-jit-x-base);` +
      `--sketch-jit-y:var(--sketch-jit-y-base);` +
      `--sketch-jit-rot:var(--sketch-jit-rot-base);` +
      `--sketch-jit-scale:var(--sketch-jit-scale-base);` +
      `z-index:0;` +
      `background:transparent !important;border-color:transparent !important;` +
    `}` +
    // Only parts that sit in flow. Forcing this onto an absolutely-positioned
    // part would drop it back to its flow position.
    `${layered} :is(${FLOW_PARTS}){position:relative;}`;

  // Fill layer. Own seed, own offset, sits behind the content.
  const fill =
    `${el}::before{` +
      `content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;` +
      `background:var(--sketch-fill, var(--surface-neutral-lower));` +
      `filter:var(--sketch-fill-filter);` +
      `transform:translate(` +
        `calc(var(--sketch-fill-dx) + var(--sketch-jx, 0) * var(--sketch-jit-x, 0px)),` +
        `calc(var(--sketch-fill-dy) + var(--sketch-jy, 0) * var(--sketch-jit-y, 0px))` +
      `) rotate(calc(var(--sketch-jr, 0) * var(--sketch-jit-rot, 0deg)))` +
      ` scale(calc(1 + var(--sketch-grow, 0) + var(--sketch-js, 0) * var(--sketch-jit-scale, 0)));` +
      `pointer-events:none;` +
      `mask-image:var(--sketch-mask-image, none);` +
      `mask-size:var(--sketch-mask-size, 900px 900px);` +
      `mask-mode:luminance;mask-repeat:repeat;` +
      `mask-position:var(--sketch-mask-pos, 0 0);` +
    `}`;

  const fillStyles =
    `[data-sketch][data-sketch-fill='none'] ${parts}::before{background:none;}` +
    `[data-sketch][data-sketch-fill='hachure'] ${parts}::before{` +
      `background-color:var(--sketch-fill, var(--surface-neutral-lower));` +
      `background-image:repeating-linear-gradient(var(--sketch-hachure-angle),` +
        `color-mix(in srgb, var(--sketch-stroke, currentColor) 40%, transparent) 0 1.5px,` +
        `transparent 1.5px 7px);` +
    `}`;

  // Second stroke pass. It rides the STROKE layer, not the fill: the fill
  // carries the misregistration offset and the corner-guard oversize, both of
  // which are fill-only by intent, and a second outline that inherited them
  // read as one ring systematically larger and shifted rather than as a line
  // drawn twice. Sharing ::after means sharing its displacement seed, which is
  // what retracing a line by hand actually looks like.
  const doublePass =
    `[data-sketch][data-sketch-passes='double'] :is(${STROKE_PARTS})::after{` +
      `outline:var(--sketch-stroke-width) var(--sketch-stroke-style) var(--sketch-stroke, currentColor);` +
      `outline-offset:calc(-1 * var(--sketch-stroke-width) - 1px);` +
    `}`;

  // Outline layer. Own seed, above the content.
  const stroke =
    `${strokeEl}::after{` +
      `content:'';position:absolute;inset:0;z-index:1;border-radius:inherit;` +
      `border-style:var(--sketch-stroke-style);` +
      `border-color:var(--sketch-stroke, var(--border-neutral));` +
      // Pen pressure: each instance carries its own weight off the nth-child cycle.
      `border-width:calc(var(--sketch-stroke-width) * (1 + var(--sketch-jw, 0) * var(--sketch-pressure, 0)));` +
      `filter:var(--sketch-stroke-filter) var(--sketch-pool, opacity(1));` +
      `mask-image:var(--sketch-press-image, none);` +
      `mask-size:340px 340px;mask-mode:luminance;mask-repeat:repeat;` +
      `mask-position:var(--sketch-mask-pos, 0 0);` +
      `pointer-events:none;` +
    `}`;

  const seedRotation = SEEDS.map((seed, i) =>
    `${el}:nth-child(5n + ${i + 1}){` +
      `--sketch-fill-filter:url(#${ID}-fill-${seed});` +
      `--sketch-stroke-filter:url(#${ID}-stroke-${seed});` +
      `--sketch-mask-pos:${MASK_POS[i]};` +
    `}`,
  ).join('');

  const jitter =
    JITTER_X_SCALE.map((v, i) => `${el}:nth-child(7n + ${i + 1}){${v}}`).join('') +
    JITTER_Y_WEIGHT.map((v, i) => `${el}:nth-child(11n + ${i + 1}){${v}}`).join('') +
    JITTER_ROT.map((v, i) => `${el}:nth-child(13n + ${i + 1}){--sketch-jr:${v};}`).join('');

  // Large panels tilt less than the type inside them can tolerate; small chips
  // can take more rotation but less travel.
  const perPart =
    `${layered} :is(.card, .card-header, .panel, .dialog, .table-wrapper, .sidenavigation)` +
      `{--sketch-jit-rot:calc(var(--sketch-jit-rot-base) * 0.3);}` +
    // A rule is one or two pixels tall. The full-size displacement tears it into
    // dashes and a translate that large lifts it clean off its own row, so it
    // takes the small filter bank and a fraction of the travel.
    `${layered} :is(.sd-hairline, .sketch-rule){` +
      `--sketch-fill-filter:url(#${ID}-fill-sm-1);` +
      `--sketch-jit-x:calc(var(--sketch-jit-x-base) * 0.3);` +
      `--sketch-jit-y:calc(var(--sketch-jit-y-base) * 0.15);` +
      `--sketch-jit-rot:0deg;--sketch-grow:0;` +
    `}` +
    `${layered} :is(.badge, .toggle .track){` +
      `--sketch-jit-rot:calc(var(--sketch-jit-rot-base) * 1.6);` +
      `--sketch-jit-x:calc(var(--sketch-jit-x-base) * 0.5);` +
      `--sketch-jit-y:calc(var(--sketch-jit-y-base) * 0.5);` +
    `}` +
    SEEDS.map((seed, i) =>
      `${layered} .badge:nth-child(5n + ${i + 1}){` +
        `--sketch-fill-filter:url(#${ID}-fill-sm-${seed});` +
        `--sketch-stroke-filter:url(#${ID}-stroke-sm-${seed});` +
      `}`,
    ).join('') +
    `${layered} .toggle .track{` +
      `--sketch-fill-filter:url(#${ID}-fill-sm-2);` +
      `--sketch-stroke-filter:url(#${ID}-stroke-sm-2);` +
    `}`;

  // `.sketch-surface` names its own colours, so it emits no rule and keeps
  // whatever the page set.
  const colours = PART_SPECS.map((p) => {
    const f = p.fill ?? (p.stem ? `var(--${p.stem}-surface)` : null);
    const st = p.stroke ?? (p.stem ? `var(--${p.stem}-border)` : null);
    if (!f && !st) return '';
    return `${on} ${p.sel}{${f ? `--sketch-fill:${f};` : ''}${st ? `--sketch-stroke:${st};` : ''}}`;
  }).join('');

  return [
    vars, globalMode, host, fill, fillStyles, doublePass, stroke,
    seedRotation, jitter, perPart, colours,
  ].join('\n');
}

function styleNode(doc: Document): HTMLStyleElement {
  const existing = doc.head.querySelector<HTMLStyleElement>(`style[${STYLE_ATTR}]`);
  if (existing) return existing;
  const node = doc.createElement('style');
  node.setAttribute(STYLE_ATTR, '');
  doc.head.appendChild(node);
  return node;
}

function defsNode(doc: Document): SVGSVGElement {
  const existing = doc.body.querySelector<SVGSVGElement>(`svg[${DEFS_ATTR}]`);
  if (existing) return existing;
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute(DEFS_ATTR, '');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  doc.body.appendChild(svg);
  return svg;
}

/**
 * Install the filter bank and stylesheet in every synced document. Idempotent:
 * repeated calls rewrite the same two nodes rather than stacking new ones.
 *
 * This only makes the effect *available*. An element opts in by carrying
 * data-sketch, which is what `setSketchScope` writes.
 */
export function applySketchLayer(settings: SketchSettings): void {
  const defs = buildDefsMarkup(settings);
  const css = buildStylesheet(settings);
  for (const doc of getSyncedDocuments()) {
    defsNode(doc).innerHTML = defs;
    styleNode(doc).textContent = css;
  }
}

/** Remove the injected nodes and every scope attribute from all synced documents. */
export function removeSketchLayer(): void {
  for (const doc of getSyncedDocuments()) {
    doc.head.querySelector(`style[${STYLE_ATTR}]`)?.remove();
    doc.body.querySelector(`svg[${DEFS_ATTR}]`)?.remove();
    doc.querySelectorAll('[data-sketch]').forEach((el) => setSketchScope(el as HTMLElement, null));
  }
}

/**
 * Mark one element as an effect scope. Pass null settings to clear it.
 * The host page's root and the editor's own preview container are both scopes,
 * which is why this takes an element rather than assuming documentElement.
 */
export function setSketchScope(el: HTMLElement | null, settings: SketchSettings | null): void {
  if (!el) return;
  if (!settings) {
    el.removeAttribute('data-sketch');
    el.removeAttribute('data-sketch-fill');
    el.removeAttribute('data-sketch-passes');
    return;
  }
  el.setAttribute('data-sketch', settings.mode);
  el.setAttribute('data-sketch-fill', settings.fillStyle);
  el.setAttribute('data-sketch-passes', settings.doubleStroke ? 'double' : 'single');
}

/** The host page behind the overlay iframe, when there is one. */
export function hostRoot(): HTMLElement | null {
  const docs = getSyncedDocuments();
  const host = docs.find((d) => d !== document);
  return host ? host.documentElement : null;
}
