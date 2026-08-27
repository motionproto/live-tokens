/**
 * Sketch effect layer.
 *
 * Builds an SVG filter bank and a stylesheet from one SketchSettings and
 * injects both into every document cssVarSync tracks, so the host page behind
 * the overlay iframe gets the same effect the editor's preview shows.
 *
 * Nothing here reads or writes theme values. The effect is a layer over
 * whatever theme is active: it paints ::before/::after pseudo-elements from the
 * component's own --<component>-<variant>-{surface,border,radius} tokens and
 * hides the component's real background and border behind them.
 *
 * Scope is an attribute, not a class, so a caller can switch it on for a whole
 * document root or for a single preview container:
 *   data-sketch   present = on, absent = off
 */
import { getSyncedDocuments } from '../cssVarSync';
import { buildMaskUri, MASK_TILE } from './maskField';
import type { SketchSettings } from './sketchPresets';

const DEFS_ATTR = 'data-sketch-defs';
const STYLE_ATTR = 'data-sketch-style';
const ID = 'lt-sketch';

/** Distinct noise seeds. Equal-sized neighbours drawn from one seed are
    identical twins, which is the single biggest tell that it is not hand drawn. */
const SEEDS = [0, 1, 2, 3, 4];

/** The soft glyph bank, as a share of the icon travel. Travel is stated in px
    against a glyph whose size the layer cannot know, so the dial that suits a
    card's worth of artwork tears a 16px icon apart. An element that cannot take
    the full amount names this bank instead of going crisp. */
const ICON_SOFT = 0.35;

const HATCH_ANGLE = 45;
/** The second set of stripes leans and spaces itself a little off the first.
    Half a pixel of pitch against 7 puts the beat about 90px apart, and the two
    degrees of lean turn that beat so it is never a clean band. */
const HATCH_BEAT_ANGLE = 2;
const HATCH_BEAT_PITCH = 6.5;

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
  /** Hatch ink, where the stroke is transparent. A header or a content strip
      draws no outline of its own but still carries a surface, and the hatch
      falls back to the stroke, so binding the two left it striped in nothing.
      These name the ink their PARENT is outlined in, so the whole component
      reads as one drawing rather than as a box with a shaded panel dropped in.
      A part with a visible stroke needs no entry; a part with no fill wants
      none, because there is no surface there to shade. */
  hatch?: string;
  /** Overrides `--{stem}-radius` where a component names its corners something
      else, and supplies the value for a part that has no stem. `--sketch-radius`
      inherits, so every part states one: left unset, a square header inside a
      rounded card would pick up the card's corners. */
  radius?: string;
  /** Same contract for `--{stem}-shadow`. The shadow moves onto the drawn box,
      because the one the component casts belongs to a rectangle the sketch is
      no longer drawing. */
  shadow?: string;
  /** Keeps its own `overflow`, against the default. Every part gives its clip
      up under the layer, because a clip is a flat rectangle and a flat
      rectangle is exactly what slices the drawn box off. Most of them clip only
      to round off what sits inside, which the drawn box now does itself.

      Set this where the clip carries something real: a scroller, a fill bar
      held to its track, a picture held to its frame. Those keep it and take the
      drawn corner radii on the host instead, so the clip at least turns the
      same way the ink does. */
  clips?: boolean;
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
 * Every component the effect knows how to redraw. Interaction states are not
 * listed here — a state does not add a layer, it only repaints one, so they
 * live in STATE_COLOURS below.
 */
const PART_SPECS: readonly PartSpec[] = [
  // Buttons
  ...FILLED_BUTTON_VARIANTS.map((v) => ({ sel: `.button.${v}`, stem: `button-${v}` })),
  {
    sel: '.button.outline', fill: 'transparent', stroke: 'var(--button-outline-border)',
    radius: 'var(--button-outline-radius, 0px)',
  },
  ...FILLED_BUTTON_VARIANTS.map((v) => ({ sel: `.icon-button.${v}`, stem: `iconbutton-${v}` })),
  {
    sel: '.icon-button.outline', fill: 'transparent', stroke: 'var(--iconbutton-outline-border)',
    radius: 'var(--iconbutton-outline-radius, 0px)',
  },

  // Chips
  ...BADGE_VARIANTS.map((v) => ({ sel: `.badge-${v}`, stem: `badge-${v}` })),
  // CornerBadge's own element only anchors and rebinds: the colour it names is
  // handed down to the Badge inside it, and `.badge-*` above draws it there.
  // Drawing it here as well stacks a second box behind the first.

  // Containers
  { sel: '.card', stem: 'card-default' },
  {
    sel: '.card-header', fill: 'var(--card-default-header-surface)', stroke: 'transparent',
    hatch: 'var(--card-default-border)',
  },
  {
    sel: '.panel', fill: 'var(--panel-stage-surface)', stroke: 'var(--panel-frame-border)',
    radius: 'var(--panel-frame-radius, 0px)',
  },
  // Scrolls sideways.
  { sel: '.codesnippet', stem: 'codesnippet', clips: true },
  // Scrolls sideways.
  { sel: '.table-wrapper', stem: 'table-default', clips: true },
  { sel: '.dialog', stem: 'dialog' },
  {
    sel: '.dialog-header', fill: 'var(--dialog-header-surface)', stroke: 'transparent',
    hatch: 'var(--dialog-border)',
  },
  // The container variant is a frame around two painted children, and holds no
  // colour of its own. Filling it with the header's surface floods the whole
  // section with it, and repaints all of it on a hover only the header answers.
  {
    sel: '.es-root.variant-container', fill: 'transparent',
    stroke: 'var(--collapsiblesection-container-frame-border)',
    radius: 'var(--collapsiblesection-container-frame-radius, 0px)',
  },
  {
    sel: '.es-root.variant-container > .section-header',
    fill: 'var(--collapsiblesection-container-default-surface)', stroke: 'transparent',
    hatch: 'var(--collapsiblesection-container-frame-border)',
  },
  {
    sel: '.es-root.variant-container > .section-content',
    fill: 'var(--collapsiblesection-container-expanded-surface)', stroke: 'transparent',
    hatch: 'var(--collapsiblesection-container-frame-border)',
  },
  {
    sel: '.sidenavigation',
    fill: 'var(--sidenavigation-panel-surface)',
    stroke: 'var(--sidenavigation-panel-border)',
    // Its close animation is a width transition whose overflow the clip hides.
    clips: true,
  },
  // The arrow is the tooltip's own ::after, so the box takes the fill only.
  { sel: '.tooltip', stem: 'tooltip', positioned: true, strokeless: true },

  // Status blocks
  ...STATUS_VARIANTS.map((v) => ({ sel: `.callout-${v}`, stem: `callout-${v}` })),
  // Same shape as the container section above: the notification's colour is on
  // its header strip, and the body below it is left to the page.
  ...STATUS_VARIANTS.map((v) => ({
    sel: `.notification.${v}`, fill: 'transparent',
    stroke: `var(--notification-${v}-border)`,
    radius: `var(--notification-${v}-radius, 0px)`,
  })),
  ...STATUS_VARIANTS.map((v) => ({
    sel: `.notification.${v} .notification-header`,
    fill: `var(--notification-${v}-surface)`, stroke: 'transparent',
    hatch: `var(--notification-${v}-border)`,
  })),

  // Controls
  { sel: '.input-control', stem: 'input-default', radius: 'var(--input-radius, 0px)' },
  {
    sel: '.menuselect', fill: 'var(--menuselect-menu-surface)',
    stroke: 'var(--menuselect-menu-border)',
    radius: 'var(--menuselect-menu-radius, 0px)',
    shadow: 'var(--menuselect-menu-shadow, none)',
  },
  { sel: '.tab', stem: 'tabbar-default', radius: 'var(--tabbar-default-tab-top-radius, 0px)' },
  { sel: '.tab.active', stem: 'tabbar-active', radius: 'var(--tabbar-active-tab-top-radius, 0px)' },
  {
    sel: '.segmented-control',
    fill: 'var(--segmentedcontrol-bar-surface)',
    stroke: 'var(--segmentedcontrol-bar-border)',
    radius: 'var(--segmentedcontrol-bar-radius, 0px)',
  },
  // A segment carries the layer at all times and starts invisible, so that
  // selecting or hovering one repaints it rather than materialising a
  // pseudo-element that was not there a moment ago. STATE_COLOURS supplies
  // the two lit states.
  {
    sel: '.segment', fill: 'transparent', stroke: 'transparent',
    radius: 'var(--segmentedcontrol-selected-radius, 0px)',
  },
  {
    sel: '.progress-track',
    fill: 'var(--progressbar-track-surface)',
    stroke: 'var(--progressbar-track-border)',
    radius: 'var(--progressbar-radius, 0px)',
    // Holds the fill bar to the track, which is the whole component.
    clips: true,
  },
  {
    sel: '.image', fill: 'transparent', stroke: 'var(--image-default-border)',
    radius: 'var(--image-default-radius, 0px)',
    // Holds the picture inside the frame; without it a zoom spills out square.
    clips: true,
  },
  { sel: '.toggle .track', stem: 'toggle-track' },
  { sel: '.toggle.on .track', stem: 'toggle-on-track', radius: 'var(--toggle-track-radius, 0px)' },

  // Rules. A hairline is a thin filled box, so it needs the fill layer and no
  // outline: a line does not get drawn around.
  { sel: '.sd-hairline', fill: 'var(--_divider-hairline-color)', strokeless: true },

  // Consumer opt-in. A page element or a consumer-authored component that
  // paints a token-driven surface sets --sketch-fill / --sketch-stroke itself
  // and carries one of these; the layer then treats it like any other part.
  // They name no colour, so no rule is emitted for them and whatever the
  // element declared survives.
  //
  // Which one to carry is a question of size, not of kind. The shipped parts
  // are sorted the same way below: a container tilts less than the type inside
  // it can tolerate, a chip is smaller than one blob of the fill mask. A part
  // that is neither takes `.sketch-surface` and the middle treatment.
  { sel: '.sketch-surface' },
  { sel: '.sketch-container' },
  { sel: '.sketch-chip' },
  { sel: '.sketch-rule', strokeless: true },
];

/**
 * Colours for the interaction states, applied on top of a part's base rule.
 *
 * The host's real background is forced transparent, so without these a hover
 * simply does not read. Only the two colour properties change: the noise seed
 * is keyed to nth-child, so the wobble holds still while the fill repaints,
 * which is what makes this safe to do on hover at all.
 *
 * `stroke` is omitted where the component ships no hover border token; the
 * base stroke then stays, rather than falling through to a neutral that has
 * nothing to do with the component.
 *
 * `.force-hover` is the editor's own preview of the hover state.
 */
interface StateSpec {
  sel: string;
  fill: string;
  stroke?: string;
}

/** `{stem}-hover-{surface,border}` is the shipped naming for a hover state. */
function hoverPair(sel: string, stem: string, withBorder = true): StateSpec {
  return {
    sel: `${sel}:hover, ${sel}.force-hover`,
    fill: `var(--${stem}-hover-surface)`,
    ...(withBorder ? { stroke: `var(--${stem}-hover-border)` } : {}),
  };
}

const STATE_COLOURS: readonly StateSpec[] = [
  ...FILLED_BUTTON_VARIANTS.map((v) => hoverPair(`.button.${v}`, `button-${v}`)),
  hoverPair('.button.outline', 'button-outline'),
  ...FILLED_BUTTON_VARIANTS.map((v) => hoverPair(`.icon-button.${v}`, `iconbutton-${v}`)),
  hoverPair('.icon-button.outline', 'iconbutton-outline'),
  hoverPair('.tab', 'tabbar'),
  // A menu's hover belongs to the item under the pointer. The item is not a
  // drawn part, so it keeps its own background and lights up on its own.
  {
    sel: '.es-root.variant-container > .section-header:hover,'
      + ' .es-root.variant-container.force-hover > .section-header',
    fill: 'var(--collapsiblesection-container-hover-surface)',
  },

  // Segments: the two lit states over the transparent base.
  {
    sel: '.segment.selected',
    fill: 'var(--segmentedcontrol-selected-surface)',
    stroke: 'var(--segmentedcontrol-selected-border)',
  },
  {
    sel: '.segment:hover, .segment.force-hover',
    fill: 'var(--segmentedcontrol-option-hover-surface)',
  },

  // Toggle puts the state before the part rather than after it.
  {
    sel: '.toggle:hover .track, .toggle.force-hover .track',
    fill: 'var(--toggle-hover-track-surface)',
  },
  {
    sel: '.toggle.on:hover .track, .toggle.on.force-hover .track',
    fill: 'var(--toggle-on-hover-track-surface)',
  },
];

/** Exported so a test can check that every selected part is also painted. */
export const PART_SELECTORS: readonly string[] = PART_SPECS.map((p) => p.sel);

const PARTS = PART_SELECTORS.join(', ');
const FLOW_PARTS = PART_SPECS.filter((p) => !p.positioned).map((p) => p.sel).join(', ');
const STROKE_PARTS = PART_SPECS.filter((p) => !p.strokeless).map((p) => p.sel).join(', ');
const UNCLIPPED = PART_SPECS.filter((p) => !p.clips).map((p) => p.sel).join(', ');
const CLIPPED = PART_SPECS.filter((p) => p.clips).map((p) => p.sel).join(', ');

export function buildDefsMarkup(s: SketchSettings): string {
  /**
   * `warp` is the shape stage: one wave of noise whose wavelength spans a whole
   * component, so the four corners sample different parts of the field and the
   * box comes out a quadrangle with gently bowed sides. The fine stage that
   * follows is the pen wobble.
   *
   * It has to be a displacement rather than a transform. Any transform that
   * moves a corner does it in proportion to the box, so one setting wrecks a
   * card and does nothing to a button; a displacement moves every corner the
   * same number of pixels whatever it is drawing.
   *
   * Fill and stroke are handed the same warp seed and scale, so they distort
   * together and only the fine stage disagrees.
   *
   * `pressure` is the along-stroke thinning, and it goes FIRST, before the
   * shape stage moves anything. It used to be a CSS mask on the stroke layer,
   * which meant it sat still in the element's own coordinates while the warp
   * carried the line out from under it: past a certain travel the line no
   * longer met the patches the mask had been cut for, and whole edges were
   * erased instead of stretches of them. Thinning the ink here, ahead of the
   * warp, means the thin patches ride along with the line they belong to and
   * the shape dial has no ceiling.
   */
  const displace = (
    id: string, freq: number, seed: number, scale: number, pad: number,
    warp: number, warpSeed: number,
    opts: { pressure?: number; retrace?: readonly [number, number]; warpFreq?: number } = {},
  ) => {
    // The box is shared with the fill, so its wave runs at the fill's
    // frequency even when the pen has a wavelength of its own.
    const { pressure = 0, retrace, warpFreq = freq } = opts;

    // One pass of the pen. `tag` suffixes every result name, so a second pass
    // can be laid into the same filter without its stages shadowing the
    // first's.
    const pass = (tag: string, passSeed: number, stages: string[]): string => {
      let src = 'SourceGraphic';

      if (pressure > 0) {
        stages.push(
          `<feTurbulence type="fractalNoise" baseFrequency="${PRESSURE_FREQUENCY}" numOctaves="2" seed="${passSeed + 31}" result="pn${tag}"/>`,
          // Turbulence carries its own alpha. Flatten it first, or the luminance
          // read below is of a field that is already partly see-through.
          `<feComponentTransfer in="pn${tag}" result="pf${tag}"><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>`,
          `<feColorMatrix in="pf${tag}" type="luminanceToAlpha" result="pl${tag}"/>`,
          `<feComponentTransfer in="pl${tag}" result="pm${tag}">` +
            `<feFuncA type="linear" slope="${(1 + pressure * 2.5).toFixed(3)}" intercept="${(0.5 - pressure * 0.9).toFixed(3)}"/>` +
          `</feComponentTransfer>`,
          `<feComposite in="${src}" in2="pm${tag}" operator="in" result="inked${tag}"/>`,
        );
        src = `inked${tag}`;
      }

      // The shape stage keeps the filter's own warp seed on both passes. It is
      // the box, not the pen: reseed it and the second pass leans a different
      // quadrilateral, which reads as two boxes rather than as one gone round
      // twice.
      if (warp > 0) {
        stages.push(
          `<feTurbulence type="fractalNoise" baseFrequency="${(warpFreq * WARP_FREQUENCY).toFixed(5)}" numOctaves="1" seed="${warpSeed}" result="w${tag}"/>`,
          squareOff(s, `w${tag}`, `wb${tag}`),
          `<feDisplacementMap in="${src}" in2="${squaredResult(s, `w${tag}`, `wb${tag}`)}" scale="${swing(warp)}" xChannelSelector="R" yChannelSelector="G" result="box${tag}"/>`,
        );
        src = `box${tag}`;
      }

      stages.push(
        `<feTurbulence type="fractalNoise" baseFrequency="${freq.toFixed(5)}" numOctaves="${s.roughness}" seed="${passSeed}" result="n${tag}"/>`,
        squareOff(s, `n${tag}`, `nb${tag}`),
        `<feDisplacementMap in="${src}" in2="${squaredResult(s, `n${tag}`, `nb${tag}`)}" scale="${swing(scale)}" xChannelSelector="R" yChannelSelector="G" result="drawn${tag}"/>`,
      );

      return `drawn${tag}`;
    };

    const stages: string[] = [];
    const first = pass('', seed, stages);
    if (retrace) {
      // A second pen stroke rather than a copy of the first: its own wobble
      // seed and its own thinning, so the two runs part company along their
      // length instead of tracking each other a couple of px apart. They are
      // merged, not composited, so a translucent nib doubles where they cross
      // and stays pale where only one landed.
      const second = pass('r', seed + RETRACE_SEED, stages);
      stages.push(
        `<feOffset in="${second}" dx="${retrace[0].toFixed(2)}" dy="${retrace[1].toFixed(2)}" result="shifted"/>`,
        `<feMerge><feMergeNode in="${first}"/><feMergeNode in="shifted"/></feMerge>`,
      );
    }

    return `<filter id="${id}" x="-${pad}%" y="-${pad}%" width="${100 + pad * 2}%" height="${100 + pad * 2}%" color-interpolation-filters="sRGB">` +
      stages.join('') +
    `</filter>`;
  };

  // Room for both stages to push the edge outward, for the retrace, and for the
  // shadow the fill layer casts. Too tight and the filter region itself becomes
  // a flat rectangle that cuts the drawn box off — the same failure as an
  // overflow clip, one layer further down.
  //
  // A filter region can only be a percentage of the box it is filtering, so a
  // short component gets fewer pixels of headroom than a tall one out of the
  // same number. The small bank is padded far harder for that reason: it draws
  // the badges and rules, where the travel is a large share of the height.
  const pad = 30 + s.cornerTravel * 3.2;
  const warp = s.cornerTravel;
  // The dials speak in wavelengths, the filter wants cycles per px.
  const base = 1 / s.wobble;

  // A reseeded second pass is built into the stroke bank itself, because a CSS
  // filter chain can only ever duplicate what the stage before it produced: to
  // send the line through a different wobble the two passes have to live in
  // one filter. Each bank lands its pass a different distance and a different
  // way, so neighbours do not retrace alike.
  const reseeded = s.doubleStroke && s.retracePass === 'reseeded';
  const shift = (i: number): { retrace?: readonly [number, number] } =>
    (reseeded
      ? { retrace: [RETRACE_SHIFT[i][0] * s.retraceOffset, RETRACE_SHIFT[i][1] * s.retraceOffset] }
      : {});

  const banks = SEEDS.map((seed, i) =>
    // The warp seed is the instance's own, NOT the offset one: fill and stroke
    // share the box and disagree only about the pen.
    displace(`${ID}-fill-${seed}`, base, seed, s.fillTravel, pad, warp, seed + 41) +
    // Offset seeds so the outline never tracks the fill exactly. That
    // disagreement at the edges is the whole effect.
    displace(`${ID}-stroke-${seed}`, base / s.borderWavelength, seed + 17, s.strokeTravel, pad, warp, seed + 41,
      { pressure: s.pressureMod, warpFreq: base, ...shift(i) }) +
    // Small components take a reduced, higher-frequency displacement.
    displace(`${ID}-fill-sm-${seed}`, base * 2.2, seed, s.fillTravel * 0.35, pad + 40, warp * 0.35, seed + 41) +
    displace(`${ID}-stroke-sm-${seed}`, base * 2.2 / s.borderWavelength, seed + 17, s.strokeTravel * 0.35, pad + 40, warp * 0.35, seed + 41,
      { pressure: s.pressureMod, warpFreq: base * 2.2, ...shift(i) }) +
    // Icons are glyphs a few tens of pixels across, read at a glance, with no
    // redundancy to lose. A high-frequency field at a small amplitude wobbles
    // the outline without pulling a stroke off the shape it belongs to.
    displace(`${ID}-icon-${seed}`, base / s.iconWavelength, seed + 63, s.iconTravel, 40, 0, 0) +
    displace(`${ID}-icon-soft-${seed}`, base / s.iconWavelength, seed + 63, s.iconTravel * ICON_SOFT, 40, 0, 0),
  ).join('');

  // Ink pooling. Blur spreads the stroke, then a steep alpha ramp re-sharpens
  // it. Where two runs of the border sit within blur distance of each other,
  // which is what happens at a corner and wherever the second pass crosses the
  // first, the fields sum past the top of the ramp and fill in.
  //
  // The ramp is placed against the line each instance actually draws. A blurred
  // run of width w peaks at erf(w / 2√2σ) of its own ink, and that peak falls
  // as the radius grows, so a fixed threshold meant a different thing on every
  // line: a 1.25px pencil stroke dropped under it past a radius of about 1.3
  // and pooled to nothing, which is why the dial did nothing on a pencil.
  //
  // Anchoring it to the settings alone is not enough either. Pen weight is a
  // per-instance cycle, so two cards side by side draw different widths at
  // different ink, and one ramp cut for the nominal line put one of them near
  // its floor and the other in the middle of it: the same dials read as a wet
  // blur on the first card and as two clean passes on the second. One bank per
  // step of that cycle puts every instance at the same place on its own ramp,
  // and the only spread left is the honest one, where a harder press lays down
  // a wetter line.
  //
  // The crisp source is merged back on top, so pooling only ever ADDS.
  const poolFilter = (i: number, jw: number) => {
    const width = s.strokeWidth * (1 + jw * s.pressure);
    // At full ink the colour passes through untouched, so the cycle moves the
    // weight of the line but not its density.
    const ink = s.strokeInk < 1 ? Math.min(1, s.strokeInk + (jw * INK_VARY) / 100) : 1;
    // The floor only keeps the gain finite where the width dial is at zero and
    // there is no line to pool. Anything above it is anchored honestly, however
    // faint: a thin pale run wants a steep ramp, not a clamped one.
    const peak = Math.max(1e-4, ink * erf(width / (Math.max(s.pooling, 0.05) * 2 * Math.SQRT2)));
    const gain = 1 / ((POOL_TOP - POOL_FOOT) * peak);
    const thresholded = ink < 1 ? 'hard' : 'pooled';
    return `<filter id="${ID}-pool-${i}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
      `<feGaussianBlur stdDeviation="${s.pooling}" result="b"/>` +
      // The ramp drives alpha to 1, which flattened a translucent nib back to
      // a solid one and left the ink dial doing nothing under any preset that
      // pooled. Scaling the pooled alpha back down to this instance's ink keeps
      // the bulge and keeps the line see-through, so the crisp pass merged on
      // top still reads as a second coat.
      `<feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${gain.toFixed(3)} ${(-POOL_FOOT * peak * gain).toFixed(3)}" result="${thresholded}"/>` +
      (ink < 1
        ? `<feComponentTransfer in="${thresholded}" result="pooled">` +
            `<feFuncA type="linear" slope="${ink.toFixed(3)}"/>` +
          `</feComponentTransfer>`
        : '') +
      `<feMerge><feMergeNode in="pooled"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>`;
  };

  const pool = s.pooling > 0
    ? JITTER_Y_WEIGHT.map(([, jw], i) => poolFilter(i, jw)).join('')
    : '';

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
/** Offset and pen weight, as numbers rather than as the declarations they
    become: the weight decides how wide and how wet each instance draws, so the
    pooling bank has to be built from the same eleven values. */
const JITTER_Y_WEIGHT: readonly (readonly [number, number])[] = [
  [0.45, -0.6], [-0.8, 0.85], [0.9, -0.25], [-0.2, 0.5], [0.6, -0.95], [-0.95, 0.3],
  [0.1, 0.7], [-0.5, -0.45], [0.75, 0.15], [-0.3, -0.8], [0.25, 0.6],
];
const JITTER_ROT = [
  -0.7, 0.35, 0.85, -0.15, 0.5, -0.9, 0.2, 0.65, -0.4, 0.95, -0.25, 0.75, -0.6,
];

/** The field tiles from each element's own origin, so identical parts would
    otherwise get identical blotches. Shift the sampling window per instance. */
const MASK_POS = ['0 0', '-137px -211px', '-311px -97px', '-73px -389px', '-419px -263px'];

/**
 * Per-instance corner shape. Four coefficients in [0, 1], one per corner in
 * `border-radius` order, scaled by the cornerSpread dial and added on top of
 * the part's own radius. At a 32px dial a row reads as roughly 32, 27, 8, 4.
 *
 * Every corner is independent, but they run in a band from half the spread to
 * all of it, never down to nothing. Letting a coefficient reach zero put a
 * square corner next to one carrying the whole dial, and on anything as short
 * as a button that is a scallop: a half-round end with a sharp point beside it.
 * A hand holds a rough size and misses it by a bit each time, so half to full
 * is the shape of the error. The four land in a different order row to row.
 *
 * Added, never subtracted, because a hand-drawn look tends to sit on a theme
 * whose corners are already tight: a coefficient set that swung both ways
 * spent half its range clamped at zero.
 */
const CORNER_ROUNDING = [
  [1, 0.62, 0.85, 0.5],
  [0.55, 1, 0.68, 0.9],
  [0.8, 0.5, 0.95, 0.65],
  [0.95, 0.72, 0.52, 1],
  [0.6, 0.88, 0.75, 0.52],
  [1, 0.55, 0.7, 0.82],
  [0.7, 0.95, 0.5, 0.75],
  [0.85, 0.58, 1, 0.68],
  [0.52, 0.78, 0.62, 0.98],
];

/** `scale` on a displacement map is the full swing: a point travels half of it
    either side of where it started, and only where the field peaks. Every dial
    the tab shows is stated as that peak travel in px, so the doubling happens
    here, in the one place the maps are written. */
const swing = (travel: number) => String(Number((travel * 2).toFixed(4)));

/** Squares the displacement wave off around 0.5, its zero, so full amplitude is
    spent along the whole edge rather than only where the wave peaks. Both
    channels take it: the map reads x from R and y from G. */
function squareOff(s: SketchSettings, from: string, to: string): string {
  if (s.waveform <= 1) return '';
  const slope = s.waveform.toFixed(2);
  const intercept = ((1 - s.waveform) / 2).toFixed(3);
  return `<feComponentTransfer in="${from}" result="${to}">` +
    `<feFuncR type="linear" slope="${slope}" intercept="${intercept}"/>` +
    `<feFuncG type="linear" slope="${slope}" intercept="${intercept}"/>` +
  `</feComponentTransfer>`;
}

const squaredResult = (s: SketchSettings, from: string, to: string) =>
  (s.waveform > 1 ? to : from);

/** Along-stroke pressure wavelength. Low, with a high floor in the transfer
    above, so the line mostly holds and only thins in patches. */
const PRESSURE_FREQUENCY = 0.0165;

/** Per-instance swing on the ink density, in percentage points, off the same
    cycle that carries stroke weight. */
const INK_VARY = 14;

/** Where the pooling ramp sits against a straight run's own blurred peak: the
    foot just under it, so the line keeps a faint wet edge and nothing more, and
    the top above it, so only somewhere two runs sum comes out solid. Anchoring
    both to the peak is what makes one radius mean the same thing on a hairline
    and on a 6px nib.

    The foot used to sit at 0.45, which put a straight run at 58% alpha along
    its whole length. Both ends of the ramp are fixed by construction, so with
    the sides that wet the corners had nowhere left to go: they saturated at
    every dial value, and the only thing the dial still moved was how far the
    edge spread. That is a blur radius, not pooling. */
const POOL_FOOT = 0.85;
const POOL_TOP = 1.6;

/** Winitzki's approximation, inside 0.2% across the range, which is finer than
    a dial step. Used for the alpha a box of ink keeps at its centre once a
    gaussian of a given radius has spread it. */
function erf(x: number): number {
  const t = x * x;
  const a = 0.147;
  return Math.sqrt(1 - Math.exp((-t * (4 / Math.PI + a * t)) / (1 + a * t)));
}

/** Where a reseeded second pass lands, per seed bank, as a share of the offset
    range on each axis. Distances differ as well as directions: two passes that
    always part by the same amount read as a printing offset, not as a hand.
    Copy mode takes its share off the per-instance jitter cycles instead, which
    are longer, so it varies over 77 components rather than 5. */
const RETRACE_SHIFT: readonly (readonly [number, number])[] = [
  [0.9, -0.35], [-0.2, 0.35], [0.4, 0.95], [-0.7, -0.15], [0.1, -0.75],
];

/** Seed distance between the two passes. Far enough that the second wobble
    shares nothing with the first. */
const RETRACE_SEED = 53;

/** The shape stage's wavelength, as a fraction of the pen-wobble frequency.
    Long: a wave that spans several components leaves each one sitting on a
    smooth slope of the field, so its four corners disagree while its edges
    travel together and stay straight. Shorten it and the field turns over
    inside a single box, which ripples the edges and tears a thin stroke apart
    rather than leaning the shape. */
const WARP_FREQUENCY = 0.08;


export function buildStylesheet(s: SketchSettings): string {
  const on = '[data-sketch]';
  const parts = `:is(${PARTS})`;
  const el = `${on} ${parts}`;
  const strokeEl = `${on} :is(${STROKE_PARTS})`;

  // `--radius-none` is a bare `0`, so a part the theme leaves square hands the
  // corner maths a number where it needs a length: `calc(0 + 0.95 * 16px)` is
  // invalid, and an invalid calc takes the whole border-radius down to its
  // initial value. Registering the property makes the browser reject the
  // unitless value on the way in and substitute 0px, so one square component
  // can no longer flatten the corners of every other one.
  const registrations = `@property --sketch-radius{syntax:"<length>";inherits:true;initial-value:0px;}`;

  const vars =
    `${on}{` +
      `--sketch-stroke-width:${s.strokeWidth}px;` +
      `--sketch-ink:${s.strokeInk};` +
      `--sketch-stroke-style:${s.strokeStyle};` +
      `--sketch-hatch-angle:${HATCH_ANGLE}deg;` +
      `--sketch-hatch-ink:${Math.round(s.hatchInk * 100)}%;` +
      `--sketch-fill-filter:url(#${ID}-fill-0);` +
      `--sketch-stroke-filter:url(#${ID}-stroke-0);` +
      `--sketch-mask:${s.maskOn || s.iconMaskOn ? buildMaskUri(s) : 'none'};` +
      `--sketch-mask-tile:${MASK_TILE}px;` +
      `--sketch-icon-mask-tile:${Math.round(s.iconMaskScale * 100)}%;` +
      // Named here rather than on the icons themselves, so an ancestor asking
      // for the soft bank resolves it against a value it can actually see.
      `--sketch-icon-soft:url(#${ID}-icon-soft-0);` +
      `--sketch-jit-x-base:${s.jitterX}px;` +
      `--sketch-jit-y-base:${s.jitterY}px;` +
      `--sketch-jit-rot-base:${s.jitterRot}deg;` +
      `--sketch-jit-scale-base:${s.jitterScale};` +
      `--sketch-corner-spread-base:${s.cornerSpread}px;` +
      `--sketch-pressure:${s.pressure};` +
      // opacity(1) is the no-op that lets pooling be switched out of the chain.
      // The weight cycle below hands each instance the bank cut for the line it
      // draws; this one only decides whether pooling is in the chain at all.
      `--sketch-pool:${s.pooling > 0 ? `url(#${ID}-pool-0)` : 'opacity(1)'};` +
    `}`;

  /**
   * Ink coverage: the field laid over a layer as a luminance mask, tiled from
   * that element's own origin and sampled at a different offset per instance,
   * so two parts the same size are not blotched alike.
   *
   * `mask-clip: no-clip` asks for the painting area not to be restricted, which
   * is what a layer the filter has already carried outside its own box needs.
   * Chrome does not honour it — see `bleed` below, which is what actually keeps
   * the drawn edge off the border box.
   */
  const coverage = (size: string, pos: string, off = '') =>
    `mask-image:${off}var(--sketch-mask, none);` +
    `mask-size:${size};` +
    `mask-mode:luminance;mask-repeat:repeat;mask-clip:no-clip;` +
    `mask-position:var(${pos}, 0 0);`;

  // Icons. A glyph has no box to redraw, so it takes the filter directly rather
  // than through a redrawn ::before. Body type is deliberately left alone: an
  // icon is a shape and survives a wobble, a paragraph is not.
  //
  // `--sketch-icon-off` names what to draw a subtree's glyphs with instead:
  // `none` keeps them crisp, `var(--sketch-icon-soft)` draws them at a fraction
  // of the travel. It inherits, so any chrome that lives in the host document
  // (the overlay bar, the column guides) sets it once on its own root and every
  // icon under it follows regardless of specificity. `svg` covers inline artwork
  // the same way. The injected filter bank is itself an svg in the body, so it
  // has to be excluded or it filters itself.
  //
  // The knob answers for the ink mask as well, or chrome that asked for crisp
  // glyphs came out blotched anyway. It holds a filter, which is not a mask
  // image, so it cannot be substituted into `mask-image` as a value: prefixed
  // to it, any value the knob carries makes the declaration invalid, and an
  // invalid declaration is dropped, which is the no-mask this wants. Unset, it
  // substitutes to nothing and the field lands as before. Soft loses the mask
  // too, which is the point of asking for less: the mask is what eats a glyph
  // small enough to need the soft bank.
  const iconSel = `[class*="fa-"], svg:not([${DEFS_ATTR}])`;
  const iconsOn = s.iconTravel > 0 || s.iconMaskOn;
  const icons = iconsOn
    ? `${on} :is(${iconSel}){` +
        (s.iconTravel > 0
          ? `filter:var(--sketch-icon-off, var(--sketch-icon-filter, url(#${ID}-icon-0)));`
          : '') +
        // The ink mask reads as coverage on a glyph the way it does on a fill,
        // but the fill states its tile in px and a glyph has no fixed size to
        // state one against: the component tile is hundreds of px across, so a
        // whole icon sampled one flat patch of it and came out either untouched
        // or gone.
        //
        // The glyph is the unit instead. A percentage resolves against the
        // element the mask is laid on, so the tile scales with whatever it
        // covers and the dial reads the same on a 16px icon as on a page-wide
        // drawing. `auto` on the other axis keeps the tile square.
        (s.iconMaskOn
          ? coverage('auto var(--sketch-icon-mask-tile)', '--sketch-icon-mask-pos', 'var(--sketch-icon-off,) ')
          : '') +
      `}` +
      SEEDS.map((seed, i) =>
        `${on} :is(${iconSel}):nth-child(5n + ${i + 1})` +
          `{--sketch-icon-filter:url(#${ID}-icon-${seed});` +
          `--sketch-icon-soft:url(#${ID}-icon-soft-${seed});` +
          `--sketch-icon-mask-pos:${MASK_POS[i]};}`,
      ).join('')
    : '';

  // The drawn box, shared by both layers so fill and outline describe the same
  // shape and only the displacement seeds disagree.
  //
  // Corners are read from the part's own radius token rather than inherited,
  // because `border-radius: inherit` is all-or-nothing: there is no way to add
  // to a value CSS never hands over. At the dial's zero the inherit stays, so
  // the shape is untouched until the user asks for it, and a part whose radius
  // token is missing keeps its real corners.
  const cornerRadius = (i: number) =>
    `max(0px, calc(var(--sketch-radius, 0px) + var(--sketch-c${i}, 0) * var(--sketch-corner-spread, 0px)))`;
  const corners = s.cornerSpread > 0
    ? `border-radius:${[1, 2, 3, 4].map(cornerRadius).join(' ')};`
    : 'border-radius:inherit;';

  /**
   * How far past its own box the fill layer is drawn on.
   *
   * A mask is applied AFTER the filter, and its painting area stops at the
   * border box whatever `mask-clip` says: Chrome accepts `no-clip`, computes it
   * back, and clips anyway. Every pixel the displacement pushed outside the box
   * was erased along a straight rectangle, and because `jitterScale` grows each
   * fill one-sidedly the drawn shape always covered its own box — so what
   * survived was the box itself, ruler-straight with perfectly circular
   * corners, under a stroke that wobbled freely because it carries no mask.
   *
   * The fill is drawn on a box this much larger instead, with the paint held to
   * the middle of it, so the mask's painting area covers everything the pen laid
   * down. Only what the FILTER moves has to fit: the jitter transform runs after
   * the mask and carries the finished layer whole.
   */
  const bleed = s.maskOn ? Math.ceil(s.cornerTravel + s.fillTravel) + 4 : 0;

  /** Padding subtracts from a corner, so the bleed added here comes back off at
      the content box and the paint turns exactly where it did before. The
      inherit is spent at this point: a bleeding fill has to state its corners,
      and `--sketch-radius` is what it states them from. */
  const fillCorners = bleed === 0
    ? corners
    : `border-radius:${s.cornerSpread > 0
      ? [1, 2, 3, 4].map((i) => `calc(${cornerRadius(i)} + ${bleed}px)`).join(' ')
      : `calc(var(--sketch-radius, 0px) + ${bleed}px)`};`;

  /** Grow the box, hold the paint to the middle of it. `content-box` sizing
      keeps the content area at the element's own size, which a rule two pixels
      tall cannot do under `border-box`; the two `auto`s are for Button, whose
      shimmer ::before states `width: 100%` and would otherwise pin the grown box
      back to the element. `background` is a shorthand and resets both box
      properties, so `bleedPaint` follows every declaration of it. */
  const bleedBox = bleed === 0
    ? 'inset:0 !important;'
    : `inset:-${bleed}px !important;padding:${bleed}px;box-sizing:content-box;` +
      `width:auto !important;height:auto !important;`;
  const bleedPaint = bleed === 0 ? '' : 'background-origin:content-box;background-clip:content-box;';

  const host =
    `${el}{` +
      `--sketch-jit-x:var(--sketch-jit-x-base);` +
      `--sketch-jit-y:var(--sketch-jit-y-base);` +
      `--sketch-jit-rot:var(--sketch-jit-rot-base);` +
      `--sketch-jit-scale:var(--sketch-jit-scale-base);` +
      `--sketch-corner-spread:var(--sketch-corner-spread-base);` +
      `z-index:0;` +
      // The shadow is re-cast on the fill layer, where it follows the shape
      // that is actually drawn.
      `background:transparent !important;border-color:transparent !important;` +
      `box-shadow:none !important;` +
    `}` +
    `${on} :is(${UNCLIPPED}){overflow:visible !important;}` +
    // The five that keep their clip take the drawn radii on the host, so what
    // the clip cuts turns the same way the ink does at the corners. It cannot
    // follow the displacement, which is a filter and has no geometry to clip to.
    `${el}:is(${CLIPPED}){${corners}}` +
    // Only parts that sit in flow. Forcing this onto an absolutely-positioned
    // part would drop it back to its flow position.
    `${on} :is(${FLOW_PARTS}){position:relative;}`;

  // Fill layer. Own seed, own offset, sits behind the content.
  //
  // `inset` and `transition` are !important because the layer CLAIMS this
  // pseudo-element from whatever the component was using it for. Button drives
  // a hover shimmer off ::before — parked at left:-100%, sliding to left:100%
  // over 0.5s — and its hover rule outweighs this one on specificity. Left
  // alone, the fill wipes across the button on hover, and again the moment the
  // effect is switched on, because `left` animates from -100% to 0.
  const fill =
    `${el}::before{` +
      `content:'';position:absolute;${bleedBox}transition:none !important;` +
      `z-index:-1;${fillCorners}` +
      `background:var(--sketch-fill, var(--surface-neutral-lower));` +
      bleedPaint +
      // A shadow is cast from the border box, and the bleed is not where the
      // drawing is. The five parts that name one (card, dialog, menu, table,
      // tooltip) go without while coverage is on rather than wear a halo the
      // width of the bleed; every other part's token is --shadow-none anyway.
      (bleed === 0 ? 'box-shadow:var(--sketch-shadow, none);' : '') +
      `filter:var(--sketch-fill-filter);` +
      (s.maskOn ? coverage('var(--sketch-mask-tile) var(--sketch-mask-tile)', '--sketch-mask-pos') : '') +
      `transform:translate(` +
        `calc(var(--sketch-jx, 0) * var(--sketch-jit-x, 0px)),` +
        `calc(var(--sketch-jy, 0) * var(--sketch-jit-y, 0px))` +
      `) rotate(calc(var(--sketch-jr, 0) * var(--sketch-jit-rot, 0deg)))` +
      ` scale(calc(1 + (var(--sketch-js, 0) + 1) / 2 * var(--sketch-jit-scale, 0)));` +
      `pointer-events:none;` +
    `}`;

  // The hatch is laid over the fill as a second background LAYER rather than
  // as `background-image` beside a `background-color`, because a part is free
  // to name a gradient as its fill: the Kit's lead block hands the layer the
  // same wash it paints itself with. A gradient is not a `<color>`, so it took
  // `background-color` down as invalid at computed-value time and the surface
  // went transparent under the hatch. The shorthand's last layer accepts either
  // a colour or an image, so both kinds of fill survive here.
  //
  // Hatch ink falls back to the outline colour but is its own property, so a
  // part that deliberately draws no outline can still be hatched. Half the
  // parts that carry a surface set `--sketch-stroke: transparent` (headers,
  // segments, notifications), and binding the stripes to it left every one of
  // them hatched in an invisible colour.
  //
  // Two sets of stripes, nearly parallel and nearly the same pitch. Where they
  // fall in step the shading doubles up and where they fall out of it they
  // thin, and the beat between the two pitches is long enough to cross a
  // component once or twice, so a hatched card is dense in one corner and
  // pale in another the way a hand shades an area. A single set is a ruled
  // pattern whatever the pen does to its edges.
  const hatchInk = (share: string) =>
    `color-mix(in srgb, var(--sketch-hatch-color, var(--sketch-stroke, currentColor))` +
      ` calc(var(--sketch-hatch-ink) * ${share}), transparent)`;
  const fillStyles =
    `[data-sketch][data-sketch-fill='hatched'] ${parts}::before{` +
      `background:repeating-linear-gradient(calc(var(--sketch-hatch-angle) + ${HATCH_BEAT_ANGLE}deg),` +
        `${hatchInk('0.55')} 0 1px,transparent 1px ${HATCH_BEAT_PITCH}px),` +
      `repeating-linear-gradient(var(--sketch-hatch-angle),` +
        `${hatchInk('1')} 0 1.5px,` +
        `transparent 1.5px 7px),` +
      `var(--sketch-fill, var(--surface-neutral-lower));` +
      bleedPaint +
    `}`;

  // A translucent nib. The retrace pass below overlaps this one, so where both
  // landed the colour doubles and where only one did it stays pale: a line
  // whose density varies across its own weight, which is the difference
  // between a marker and a pen. At full ink the colour is passed through
  // untouched, so a preset that wants a hard line still gets one.
  //
  // The density is varied per instance off the same cycle that varies the
  // stroke weight, which is the honest pairing: the harder the nib is pressed
  // the wider AND the wetter the line, so a heavy stroke reads dark and a light
  // one reads thin and pale rather than every stroke being equally grey.
  const ink = (fallback: string) =>
    (s.strokeInk < 1
      ? `color-mix(in srgb, var(--sketch-stroke, ${fallback})` +
        ` calc(var(--sketch-ink, 1) * 100% + var(--sketch-jw, 0) * ${INK_VARY}%), transparent)`
      : `var(--sketch-stroke, ${fallback})`);

  // Second stroke pass, copied rather than redrawn: `drop-shadow` duplicates
  // the alpha silhouette it is handed, and what it is handed here is the
  // already-displaced ring, so the copy carries the same wobble and lands a few
  // px off it. Offset rather than concentric, because an `outline` can only sit
  // parallel and reads as a double rule. The other mode sends the line through
  // its own seed instead, which only a second pass inside the filter can do.
  //
  // The dial is the range, not the distance: `--sketch-jx`/`--sketch-jy` are the
  // per-instance cycles, so each component parts its passes by its own share of
  // it on each axis, and 77 go by before a pairing repeats.
  //
  // The two paths stack because both are translucent. Where they cross, two
  // coats of 35% ink make 58%; where only one landed it stays at 35%. That
  // difference across the weight of the line is the marker.
  //
  // It sits ahead of pooling in the chain so the two runs merge where they
  // touch rather than being goo'd apart, and the direction comes off the same
  // per-instance cycle as the fill offset, so no two components retrace alike.
  const retraceStep = s.retraceOffset.toFixed(2);
  const retrace = s.retracePass === 'copy'
    ? `[data-sketch][data-sketch-passes='double'] :is(${STROKE_PARTS})::after{` +
        `--sketch-retrace:drop-shadow(` +
          `calc(var(--sketch-jx, 0.6) * ${retraceStep}px)` +
          ` calc(var(--sketch-jy, -0.4) * ${retraceStep}px)` +
          ` 0 ${ink('currentColor')});` +
      `}`
    // A reseeded pass is drawn inside the stroke bank, where it can take its own
    // seed, so there is nothing to lay into the chain here.
    : '';

  // Outline layer. Own seed, above the content.
  const stroke =
    `${strokeEl}::after{` +
      `content:'';position:absolute;inset:0 !important;transition:none !important;` +
      `z-index:1;${corners}` +
      `border-style:var(--sketch-stroke-style);` +
      `border-color:${ink('var(--border-neutral)')};` +
      // Pen pressure: each instance carries its own weight off the nth-child cycle.
      `border-width:calc(var(--sketch-stroke-width) * (1 + var(--sketch-jw, 0) * var(--sketch-pressure, 0)));` +
      `filter:var(--sketch-stroke-filter) var(--sketch-retrace, opacity(1))` +
      ` var(--sketch-pool, opacity(1));` +
      `pointer-events:none;` +
    `}`;

  const seedRotation = SEEDS.map((seed, i) =>
    `${el}:nth-child(5n + ${i + 1}){` +
      `--sketch-fill-filter:url(#${ID}-fill-${seed});` +
      `--sketch-stroke-filter:url(#${ID}-stroke-${seed});` +
      `--sketch-mask-pos:${MASK_POS[i]};` +
    `}`,
  ).join('');

  const shape = s.cornerSpread > 0
    ? CORNER_ROUNDING.map((row, i) =>
        `${el}:nth-child(9n + ${i + 1}){` +
          row.map((c, k) => `--sketch-c${k + 1}:${c};`).join('') +
        `}`,
      ).join('')
    : '';

  const jitter =
    JITTER_X_SCALE.map((v, i) => `${el}:nth-child(7n + ${i + 1}){${v}}`).join('') +
    JITTER_Y_WEIGHT.map(([jy, jw], i) =>
      `${el}:nth-child(11n + ${i + 1}){--sketch-jy: ${jy}; --sketch-jw: ${jw};` +
        // The pen weight this instance draws at is what decides where its line
        // lands on the pooling ramp, so it takes the bank cut for that weight.
        (s.pooling > 0 ? `--sketch-pool:url(#${ID}-pool-${i});` : '') +
      `}`).join('') +
    JITTER_ROT.map((v, i) => `${el}:nth-child(13n + ${i + 1}){--sketch-jr:${v};}`).join('');

  // Large panels tilt less than the type inside them can tolerate; small chips
  // can take more rotation but less travel.
  const perPart =
    `${el}:is(.card, .card-header, .panel, .dialog, .table-wrapper, .sidenavigation,` +
      ` .sketch-container)` +
      `{--sketch-jit-rot:calc(var(--sketch-jit-rot-base) * 0.3);}` +
    // A rule is one or two pixels tall. The full-size displacement tears it into
    // dashes and a translate that large lifts it clean off its own row, so it
    // takes the small filter bank and a fraction of the travel.
    `${el}:is(.sd-hairline, .sketch-rule){` +
      `--sketch-fill-filter:url(#${ID}-fill-sm-1);` +
      `--sketch-jit-x:calc(var(--sketch-jit-x-base) * 0.3);` +
      `--sketch-jit-y:calc(var(--sketch-jit-y-base) * 0.15);` +
      `--sketch-jit-rot:0deg;--sketch-jit-scale:0;` +
      // A rule is a line, not a box. Rounding its ends reads as a mistake
      // rather than as a hand.
      `--sketch-corner-spread:0px;` +
    `}` +
    `${el}:is(.badge, .toggle .track, .sketch-chip){` +
      // A chip is smaller than one blob at the tile the cards read it at, so it
      // lands wholly inside a patch and comes out either untouched or gone.
      // Shrinking the tile puts several blotches across it, which is the same
      // move the icon mask makes for a glyph.
      `--sketch-mask-tile:${Math.round(MASK_TILE * 0.3)}px;` +
      `--sketch-jit-rot:calc(var(--sketch-jit-rot-base) * 1.6);` +
      `--sketch-jit-x:calc(var(--sketch-jit-x-base) * 0.5);` +
      `--sketch-jit-y:calc(var(--sketch-jit-y-base) * 0.5);` +
    `}` +
    SEEDS.map((seed, i) =>
      `${on} .badge:nth-child(5n + ${i + 1}){` +
        `--sketch-fill-filter:url(#${ID}-fill-sm-${seed});` +
        `--sketch-stroke-filter:url(#${ID}-stroke-sm-${seed});` +
      `}`,
    ).join('') +
    `${on} .toggle .track{` +
      `--sketch-fill-filter:url(#${ID}-fill-sm-2);` +
      `--sketch-stroke-filter:url(#${ID}-stroke-sm-2);` +
    `}`;

  // The `.sketch-*` opt-in classes name their own colours, so they emit no rule
  // and keep whatever the page set.
  const colours = PART_SPECS.map((p) => {
    const f = p.fill ?? (p.stem ? `var(--${p.stem}-surface)` : null);
    const st = p.stroke ?? (p.stem ? `var(--${p.stem}-border)` : null);
    if (!f && !st) return '';
    const r = p.radius ?? (p.stem ? `var(--${p.stem}-radius, 0px)` : '0px');
    const sh = p.shadow ?? (p.stem ? `var(--${p.stem}-shadow, none)` : 'none');
    // Every part states a hatch ink for the same reason it states a radius:
    // custom properties inherit, so a badge sitting in a hatched card header
    // would otherwise stripe itself in the CARD's ink. Where a part has no ink
    // of its own the value is the indirection, not the colour, so it resolves
    // against this element's own stroke and keeps following it into hover.
    return `${on} ${p.sel}{${f ? `--sketch-fill:${f};` : ''}${st ? `--sketch-stroke:${st};` : ''}` +
      `--sketch-hatch-color:${p.hatch ?? 'var(--sketch-stroke)'};` +
      `--sketch-radius:${r};--sketch-shadow:${sh};}`;
  }).join('');

  // After `colours`, so a state wins over its part's base rule at equal weight.
  const states = STATE_COLOURS.map((st) => {
    const sel = st.sel.split(',').map((s) => `${on} ${s.trim()}`).join(',');
    return `${sel}{--sketch-fill:${st.fill};${st.stroke ? `--sketch-stroke:${st.stroke};` : ''}}`;
  }).join('');

  return [
    registrations, vars, icons, host, fill, fillStyles, retrace, stroke,
    seedRotation, shape, jitter, perPart, colours, states,
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
    const style = styleNode(doc);
    // Writing markup a document already has is a visible flash, not a no-op:
    // rewriting defs destroys every filter the page is mid-paint against, and
    // rewriting the sheet drops the mask image to be decoded again. Both are
    // built from the same settings, so the sheet answers for the pair. The
    // comparison is against the DOM rather than a variable because with the
    // overlay open two instances of this module render into this page, and the
    // document is the only ground they share.
    if (style.textContent === css) continue;
    defsNode(doc).innerHTML = defs;
    style.textContent = css;
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
  el.setAttribute('data-sketch', '');
  el.setAttribute('data-sketch-fill', settings.fillStyle);
  el.setAttribute('data-sketch-passes', settings.doubleStroke ? 'double' : 'single');
}

/** The host page behind the overlay iframe, when there is one. */
export function hostRoot(): HTMLElement | null {
  const docs = getSyncedDocuments();
  const host = docs.find((d) => d !== document);
  return host ? host.documentElement : null;
}
