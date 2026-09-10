import type { ElementHandle, Page } from '@playwright/test';
import {
  DEFAULT_PAGE_VIEWPORTS,
  PAGES_ENV,
  PAGE_VIEWPORTS_ENV,
  type PageViewport,
} from '../config';
import { AA_BODY, AA_LARGE, contrastRatio } from '../../editor/core/palettes/contrast';
import { isInapplicable, type ComponentContract, type PaintMap } from '../componentContract';

export type PageRule =
  | 'page-component-paint'
  | 'page-text-style'
  | 'page-contrast'
  | 'page-grid'
  | 'page-overflow';

/**
 * A failed obligation on a rendered page, carrying the rule id the CLI reports
 * it under and the page file line the finding anchors on.
 */
export class PageViolation extends Error {
  constructor(
    readonly rule: PageRule,
    readonly source: string,
    readonly line: number,
    message: string,
  ) {
    super(`[${rule}] ${source}:${line}: ${message}`);
    this.name = 'PageViolation';
  }
}

export interface PageTarget {
  /** Page file the finding anchors on, relative to the project root. */
  source: string;
  route: string;
}

/** The wrapper `LiveTokensRouter` renders every consumer page inside. */
const PAGE_CONTAINER = '[data-live-tokens-page]';

/** The router's own chrome: the editor overlay and the column guides. Inside
 *  the container and never part of the page. */
const CHROME = '[data-live-tokens-chrome]';

export function pageTargets(): PageTarget[] {
  const raw = process.env[PAGES_ENV];
  if (!raw) return [];
  return JSON.parse(raw) as PageTarget[];
}

export function pageViewports(): PageViewport[] {
  const raw = process.env[PAGE_VIEWPORTS_ENV];
  if (!raw) return DEFAULT_PAGE_VIEWPORTS;
  return JSON.parse(raw) as PageViewport[];
}

/**
 * A state a resting instance on a page is not in. The component contracts key
 * their paint maps by the editor's own tab labels, which name interaction
 * states (hover, focused), component states (disabled, selected, error, on),
 * and views that only exist once something is opened (an active tab, a menu
 * and its options). Everything else — a bare label, `base`, `default`, and the
 * structural part labels (Header, Body, Footer, ...) — paints at rest.
 */
const TRANSIENT_STATE = /\b(?:hover|active|disabled|focused|error|selected|open|menu|option|on)\b/;

function restingState(label: string | undefined): boolean {
  return label === undefined || !TRANSIENT_STATE.test(label.toLowerCase());
}

interface PaintCheck {
  part: string;
  /** Null for the contract's own root part, which is the instance itself. */
  selector: string | null;
  pseudo: string | null;
  css: string;
  variable: string;
}

interface PaintEntry {
  /** The contract's own variant label, lowercased, as the finding names it. */
  variant: string | null;
  /** Source of the RegExp an instance's class tokens are tested against. Null
   *  for an entry every instance is in. */
  pattern: string | null;
  checks: PaintCheck[];
}

/**
 * A class token names a variant when it is the variant's own word or carries
 * it as a suffix: the three spellings the shipped components use are bare
 * (`button primary`), component-prefixed (`badge badge-primary`), and
 * axis-prefixed (`es-root variant-divider`). A contract's variant label is the
 * editor's prose (`With Divider`), so each of its words is a key as well as
 * the whole label, which is what reaches the `divider` the markup spells.
 */
function variantPattern(label: string | undefined | null): string | null {
  if (!label) return null;
  const words = label.toLowerCase().split(/\s+/);
  const keys = [...new Set([words.join('-'), ...words])]
    .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return `(?:^|-)(?:${keys.join('|')})$`;
}

export interface ContractPaintSpec {
  id: string;
  root: string;
  entries: PaintEntry[];
}

function paintChecks(contract: ComponentContract, map: PaintMap): PaintCheck[] {
  const checks: PaintCheck[] = [];
  for (const [part, properties] of Object.entries(map)) {
    const declared = contract.parts[part];
    if (declared === undefined) continue;
    const locator = typeof declared === 'string' ? { selector: declared } : declared;
    // A portalled part is rendered by an interaction, so no resting page
    // instance has one.
    if (typeof declared !== 'string' && declared.portal) continue;
    for (const [css, variable] of Object.entries(properties)) {
      checks.push({
        part,
        selector: part === contract.root ? null : locator.selector,
        pseudo: (typeof declared === 'string' ? undefined : declared.pseudo) ?? null,
        css,
        variable,
      });
    }
  }
  return checks;
}

/**
 * What a contract obliges of an instance sitting at rest on a page: the paint
 * maps that need no state tab, no editor control, and no interaction. A
 * variant-keyed entry carries the pattern its instances' root classes have to
 * name.
 */
export function restingPaintSpec(contract: ComponentContract): ContractPaintSpec | null {
  const rootSelector = contract.parts[contract.root];
  if (typeof rootSelector !== 'string') return null;
  const entries: PaintEntry[] = [];
  // `contract.view` opens the component editor: its `setup` drives preview
  // controls no page has and its `state` names a tab. Only `variant` carries
  // onto a page, so an entry inherits that and nothing else.
  const inherited = contract.view ?? {};
  for (const expectation of contract.properties) {
    if ((expectation.setup ?? []).length > 0) continue;
    if (!restingState(expectation.state)) continue;
    const checks = paintChecks(contract, expectation.paints);
    if (checks.length === 0) continue;
    const variant = (expectation.variant ?? inherited.variant)?.toLowerCase() ?? null;
    entries.push({ variant, pattern: variantPattern(variant), checks });
  }
  // A component whose only resting paint map hangs off a state tab still
  // paints its default state on a page.
  if (!isInapplicable(contract.states)) {
    for (const state of contract.states) {
      if (!state.paints || !restingState(state.state)) continue;
      if ((state.setup ?? []).length > 0) continue;
      const checks = paintChecks(contract, state.paints);
      if (checks.length === 0) continue;
      const variant = (state.variant ?? inherited.variant)?.toLowerCase() ?? null;
      entries.push({ variant, pattern: variantPattern(variant), checks });
    }
  }
  if (entries.length === 0) return null;
  return { id: contract.id, root: rootSelector, entries };
}

export interface PaintFailure {
  id: string;
  variant: string | null;
  line: number;
  part: string;
  css: string;
  variable: string;
  actual: string;
  expected: string;
}

export interface UncoveredInstance {
  id: string;
  line: number;
  /** The variants the contract offers, none of which this instance's root
   *  classes name. */
  variants: string[];
}

export interface PaintObservation {
  instances: number;
  asserted: number;
  failures: PaintFailure[];
  /** Instances every variant-keyed entry passed over: decision 6's exception,
   *  reported per instance rather than silently passed. */
  uncovered: UncoveredInstance[];
}

export interface TextObservation {
  elements: number;
  failures: { line: number; tag: string; nearest: string; axis: string; actual: string; expected: string }[];
}

export interface TextBundle {
  name: string;
  prefix: string;
}

export interface ContrastPair {
  line: number;
  tag: string;
  /** Computed text colour, composited over the surface when translucent. */
  color: string;
  background: string;
  colorToken: string | null;
  backgroundToken: string | null;
  fontSize: number;
  fontWeight: number;
}

export interface ContrastObservation {
  pairs: ContrastPair[];
  /** Why a run of text carries no pair, counted by reason. */
  skipped: Record<string, number>;
}

export interface GridChildFailure {
  line: number;
  tag: string;
  edge: 'left' | 'right';
  /** Distance from the nearest track edge, in px. */
  off: number;
}

export interface GridObservation {
  grids: number;
  children: number;
  failures: GridChildFailure[];
  /** The page's own outermost element, which a missing grid anchors on. */
  pageLine: number;
}

export interface OverflowFailure {
  line: number;
  tag: string;
  kind: 'document' | 'element' | 'instance';
  detail: string;
}

export interface OverflowObservation {
  elements: number;
  failures: OverflowFailure[];
}

const TEXT_AXES = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;

/** Displays that make an element a block of its own. Text sitting directly in
 *  anything else is a run inside a line, and the line's own block owns it. */
const BLOCK_DISPLAYS = ['block', 'flow-root', 'list-item', 'flex', 'grid', 'table-cell', 'table-caption'];

/** Sub-pixel track positions and a browser's own rounding put an edge that is
 *  on the line up to a pixel off it. */
const GRID_TOLERANCE = 1;

/** Below this the page is one column, so the grid rule has nothing to hold a
 *  section to. */
const GRID_VIEWPORT = 768;

/** WCAG's large-text sizes: the AA floor drops to 3:1 at either. */
const LARGE_TEXT_PX = 24;
const LARGE_BOLD_PX = 18.66;
const BOLD = 700;

/** Findings name CSS properties as a page's own stylesheet spells them. */
const cssName = (camel: string) => camel.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** The line the finding anchors on, the rest named in the message, and what
 *  the rule looked at to find them: one rerun after each repair walks the
 *  whole list. */
function report<T>(failures: T[], scope: string, describe: (failure: T) => string): string {
  const lines = failures.map(describe);
  return lines.length === 1 ? lines[0] : `${lines.length} of ${scope}\n${lines.join('\n')}`;
}

function hex(rgb: string): string {
  const [r, g, b] = rgb.match(/\d+/g)!.map(Number);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** The AA floor the pair has to clear, which its own size and weight set. */
function aaFloor(pair: ContrastPair): number {
  const large = pair.fontSize >= LARGE_TEXT_PX
    || (pair.fontSize >= LARGE_BOLD_PX && pair.fontWeight >= BOLD);
  return large ? AA_LARGE : AA_BODY;
}

/** A reason reads as prose: `a gradient (2), a blend mode (1)`. */
function reasons(skipped: Record<string, number>): string {
  return Object.entries(skipped).map(([reason, count]) => `${reason} (${count})`).join(', ');
}

/** The page under test, and what the rules read off it. */
export class PageHarness {
  private constructor(
    readonly page: Page,
    readonly target: PageTarget,
    readonly viewport: PageViewport,
  ) {}

  static async open(page: Page, target: PageTarget, viewport: PageViewport): Promise<PageHarness> {
    await installPageProbe(page);
    await page.setViewportSize(viewport);
    await page.goto(target.route);
    await page.locator(PAGE_CONTAINER).waitFor();
    // The lazy route module, then the theme's own custom properties: a page
    // measured before either lands reads the browser's defaults as the
    // theme's values.
    await page.waitForFunction((selectors) => {
      const container = document.querySelector(selectors.container);
      if (!container) return false;
      const content = [...container.children].some((child) => !child.matches(selectors.chrome));
      const themed = getComputedStyle(document.documentElement)
        .getPropertyValue('--body-md-font-size').trim().length > 0;
      return content && themed;
    }, { container: PAGE_CONTAINER, chrome: CHROME });
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => {
      await document.fonts.ready;
      const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await frame();
      await frame();
    });
    return new PageHarness(page, target, viewport);
  }

  fail(rule: PageRule, line: number, message: string): never {
    throw new PageViolation(rule, this.target.source, line, message);
  }

  /** Every shipped instance on the page, as the contract root selectors find
   *  them, with the variant its own root classes name. */
  async instances(specs: ContractPaintSpec[]): Promise<{ id: string; variant: string | null; line: number }[]> {
    return this.page.evaluate(({ specs: list, container, chrome, source }) => {
      const found: { id: string; variant: string | null; line: number }[] = [];
      const root = document.querySelector(container);
      if (!root) return found;
      for (const spec of list) {
        const keyed: { variant: string | null; pattern: RegExp }[] = [];
        for (const entry of spec.entries) {
          if (entry.pattern !== null) keyed.push({ variant: entry.variant, pattern: new RegExp(entry.pattern) });
        }
        for (const element of root.querySelectorAll(spec.root)) {
          if (element.closest(chrome)) continue;
          const classes = [...element.classList];
          const matched = keyed.find(({ pattern }) => classes.some((name) => pattern.test(name)));
          found.push({
            id: spec.id,
            variant: matched?.variant ?? null,
            line: window.__liveTokensPageLine(element, source),
          });
        }
      }
      return found;
    }, { specs, container: PAGE_CONTAINER, chrome: CHROME, source: this.target.source });
  }

  /**
   * Every element that renders text of its own: block-level, inside the page
   * container, outside the router's chrome, and outside every shipped
   * component root, whose slot typography the component owns.
   */
  async textElements(componentRoots: string[]): Promise<{ line: number; tag: string; axes: Record<string, string> }[]> {
    return this.page.evaluate(({ roots, container, chrome, source, axes, displays }) => {
      const found: { line: number; tag: string; axes: Record<string, string> }[] = [];
      const root = document.querySelector(container);
      if (!root) return found;
      const inComponent = roots.join(', ');
      for (const element of root.querySelectorAll<HTMLElement>('*')) {
        if (element.closest(chrome)) continue;
        if (inComponent && element.closest(inComponent)) continue;
        const ownText = [...element.childNodes]
          .some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0);
        if (!ownText) continue;
        const style = getComputedStyle(element);
        if (!displays.includes(style.display)) continue;
        found.push({
          line: window.__liveTokensPageLine(element, source),
          tag: element.tagName.toLowerCase(),
          axes: Object.fromEntries(axes.map((axis) => [axis, (style as unknown as Record<string, string>)[axis] ?? ''])),
        });
      }
      return found;
    }, {
      roots: componentRoots,
      container: PAGE_CONTAINER,
      chrome: CHROME,
      source: this.target.source,
      axes: [...TEXT_AXES],
      displays: BLOCK_DISPLAYS,
    });
  }

  /** The page file line the element was written on, from Svelte's dev-build
   *  element metadata. */
  async lineOf(element: ElementHandle<Element>): Promise<number> {
    return element.evaluate((node, source) => window.__liveTokensPageLine(node, source), this.target.source);
  }

  /** Every resting paint obligation, measured on the instances themselves. */
  async observePaints(specs: ContractPaintSpec[]): Promise<PaintObservation> {
    return this.page.evaluate(({ specs: list, container, chrome, source }) => {
      const failures: PaintObservation['failures'] = [];
      const uncovered: UncoveredInstance[] = [];
      let instances = 0;
      let asserted = 0;
      const root = document.querySelector(container);
      if (!root) return { instances, asserted, failures, uncovered };

      // The value a CSS property takes from the raw token, measured beside the
      // part so inherited font size and colour resolve the same way. A token
      // holding `#fff` and a computed `rgb(255, 255, 255)` are the same paint,
      // and only the browser can say so.
      //
      // The part's own font size is seeded onto the probe first: a unitless
      // line height and an `em` letter spacing resolve against it, and a
      // component that sets its own font size (every Button does) makes the
      // parent's the wrong ruler. A `font-size` token overwrites the seed and
      // still resolves its own relative units against the parent, as it must.
      const normalize = (node: Element, css: string, raw: string): string => {
        const probe = document.createElement('div');
        probe.style.display = 'none';
        // A border width computes to 0 while the border style is `none`, so
        // the probe would answer 0px for every stroke thickness.
        probe.style.borderStyle = 'solid';
        probe.style.outlineStyle = 'solid';
        probe.style.fontSize = getComputedStyle(node).fontSize;
        (node.parentElement ?? document.body).appendChild(probe);
        probe.style.setProperty(css.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), raw);
        const computed = (getComputedStyle(probe) as unknown as Record<string, string>)[css];
        probe.remove();
        return (computed ?? '').trim();
      };

      for (const spec of list) {
        const patterns = spec.entries.map((entry) => (entry.pattern === null ? null : new RegExp(entry.pattern)));
        const variants = [...new Set(spec.entries.map((entry) => entry.variant).filter((v): v is string => v !== null))];
        for (const element of root.querySelectorAll(spec.root)) {
          if (element.closest(chrome)) continue;
          instances++;
          const classes = [...element.classList];
          const line = window.__liveTokensPageLine(element, source);
          let covered = false;
          for (const [index, entry] of spec.entries.entries()) {
            const pattern = patterns[index];
            if (pattern && !classes.some((name) => pattern.test(name))) continue;
            covered = true;
            for (const check of entry.checks) {
              const part = check.selector === null ? element : element.querySelector(check.selector);
              if (!part) continue;
              const style = getComputedStyle(part, check.pseudo ?? undefined);
              const token = style.getPropertyValue(check.variable).trim();
              if (!token) continue;
              const expected = normalize(part, check.css, token);
              const actual = ((style as unknown as Record<string, string>)[check.css] ?? '').trim();
              asserted++;
              if (actual !== expected) {
                failures.push({
                  id: spec.id,
                  variant: entry.variant,
                  line,
                  part: check.part,
                  css: check.css,
                  variable: check.variable,
                  actual,
                  expected,
                });
              }
            }
          }
          // One Badge naming its variant says nothing about the next one, so
          // decision 6's exception is counted per instance.
          if (!covered) uncovered.push({ id: spec.id, line, variants });
        }
      }
      return { instances, asserted, failures, uncovered };
    }, { specs, container: PAGE_CONTAINER, chrome: CHROME, source: this.target.source });
  }

  /** Every run of text on the page, against the theme's own style bundles as
   *  they resolve at this viewport. */
  async observeTextStyles(bundles: TextBundle[], componentRoots: string[]): Promise<TextObservation> {
    const elements = await this.textElements(componentRoots);
    const expected = await this.page.evaluate(({ list, axes }) => {
      const style = getComputedStyle(document.documentElement);
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);
      const resolved: Record<string, Record<string, string>> = {};
      for (const bundle of list) {
        // One probe per bundle, carrying all five axes at once: a unitless
        // line height and an `em` letter spacing resolve against the bundle's
        // own font size, so five separately measured values would not be the
        // bundle. The reset clears an axis the previous bundle set.
        probe.style.cssText = 'position:absolute;visibility:hidden';
        for (const axis of axes) {
          probe.style.setProperty(
            axis.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
            style.getPropertyValue(`${bundle.prefix}-${axis.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`).trim(),
          );
        }
        const computed = getComputedStyle(probe) as unknown as Record<string, string>;
        resolved[bundle.name] = Object.fromEntries(axes.map((axis) => [axis, (computed[axis] ?? '').trim()]));
      }
      probe.remove();
      return resolved;
    }, { list: bundles, axes: [...TEXT_AXES] });

    const failures: TextObservation['failures'] = [];
    for (const element of elements) {
      let best = { name: '', misses: [] as string[], distance: Number.POSITIVE_INFINITY };
      for (const bundle of bundles) {
        const misses: string[] = TEXT_AXES.filter((axis) => element.axes[axis] !== expected[bundle.name][axis]);
        if (misses.length === 0) { best = { name: bundle.name, misses: [], distance: 0 }; break; }
        // Family and size are what identify a bundle by eye, so a bundle that
        // matches both and misses a weight is nearer than one that misses the
        // face, even on the same count.
        const distance = misses.length
          + (misses.includes('fontFamily') ? 0.4 : 0)
          + (misses.includes('fontSize') ? 0.2 : 0);
        if (distance < best.distance) best = { name: bundle.name, misses, distance };
      }
      if (best.misses.length === 0) continue;
      const axis = best.misses[0];
      failures.push({
        line: element.line,
        tag: element.tag,
        nearest: best.name,
        axis,
        actual: element.axes[axis],
        expected: expected[best.name][axis],
      });
    }
    return { elements: elements.length, failures };
  }

  /**
   * Every text and surface pair the page composes, with the tokens whose
   * resolved values match them. The ratio itself is computed by the caller
   * from the editor's own WCAG helper, so one implementation answers for the
   * palette editor and for a page.
   */
  async observeContrast(componentRoots: string[]): Promise<ContrastObservation> {
    return this.page.evaluate(({ roots, container, chrome, source, displays }) => {
      const pairs: ContrastPair[] = [];
      const skipped: Record<string, number> = {};
      const skip = (reason: string) => { skipped[reason] = (skipped[reason] ?? 0) + 1; };
      const root = document.querySelector(container);
      if (!root) return { pairs, skipped };

      // The theme states its colours in `oklch()`, which Chromium keeps in the
      // computed value, so no string parse reaches the channels. A 1x1 canvas
      // in `copy` mode answers with the pixel the screen shows, gamut-clamped
      // the same way, for any colour syntax including a future one. An invalid
      // or `transparent` value leaves the cleared pixel, which reads as alpha 0
      // and is what "paints nothing here" means.
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.globalCompositeOperation = 'copy';
      const rgba = (value: string): [number, number, number, number] => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return [r, g, b, a / 255];
      };
      const key = ([r, g, b]: [number, number, number, number]) => `${r},${g},${b}`;
      const css = (c: [number, number, number, number]) =>
        (c[3] === 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`);

      // A finding names the token when one resolves to the colour it measured.
      const probe = document.createElement('div');
      probe.style.display = 'none';
      document.body.appendChild(probe);
      const named = new Map<string, string>();
      const rootStyle = getComputedStyle(document.documentElement);
      for (const name of rootStyle) {
        if (!name.startsWith('--')) continue;
        probe.style.color = '';
        probe.style.color = `var(${name})`;
        const resolved = getComputedStyle(probe).color;
        if (!resolved) continue;
        const colour = rgba(resolved);
        if (colour[3] === 0) continue;
        if (!named.has(key(colour))) named.set(key(colour), name);
      }
      probe.remove();

      const over = (
        front: [number, number, number, number],
        back: [number, number, number, number],
      ): [number, number, number, number] => [
        Math.round(front[0] * front[3] + back[0] * (1 - front[3])),
        Math.round(front[1] * front[3] + back[1] * (1 - front[3])),
        Math.round(front[2] * front[3] + back[2] * (1 - front[3])),
        1,
      ];

      const inComponent = roots.join(', ');
      for (const element of root.querySelectorAll<HTMLElement>('*')) {
        if (element.closest(chrome)) continue;
        if (inComponent && element.closest(inComponent)) continue;
        const ownText = [...element.childNodes]
          .some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0);
        if (!ownText) continue;
        const style = getComputedStyle(element);
        if (!displays.includes(style.display)) continue;
        if (style.visibility !== 'visible') continue;
        const colour = rgba(style.color);
        if (colour[3] === 0) continue;

        let surface: [number, number, number, number] | null = null;
        let reason: string | null = null;
        for (let node: Element | null = element; node; node = node.parentElement) {
          const behind = getComputedStyle(node);
          if (behind.mixBlendMode !== 'normal') { reason = 'a blend mode'; break; }
          if (behind.backgroundImage !== 'none') { reason = 'a gradient or an image behind the text'; break; }
          const paint = rgba(behind.backgroundColor);
          if (paint[3] === 1) { surface = paint; break; }
          if (paint[3] > 0) { reason = 'a translucent surface'; break; }
        }
        if (!surface) {
          skip(reason ?? 'no opaque surface behind the text');
          continue;
        }
        pairs.push({
          line: window.__liveTokensPageLine(element, source),
          tag: element.tagName.toLowerCase(),
          color: css(colour[3] === 1 ? colour : over(colour, surface)),
          background: css(surface),
          colorToken: named.get(key(colour[3] === 1 ? colour : over(colour, surface))) ?? null,
          backgroundToken: named.get(key(surface)) ?? null,
          fontSize: parseFloat(style.fontSize),
          fontWeight: parseInt(style.fontWeight, 10) || 400,
        });
      }
      return { pairs, skipped };
    }, {
      roots: componentRoots,
      container: PAGE_CONTAINER,
      chrome: CHROME,
      source: this.target.source,
      displays: BLOCK_DISPLAYS,
    });
  }

  /** Where each section of the page sits against the column grid it draws. */
  async observeGrid(): Promise<GridObservation> {
    return this.page.evaluate(({ container, chrome, source, tolerance }) => {
      const failures: GridChildFailure[] = [];
      let grids = 0;
      let children = 0;
      const root = document.querySelector(container);
      if (!root) return { grids, children, failures, pageLine: 1 };
      const own = [...root.children].find((child) => !child.matches(chrome));
      const pageLine = own ? window.__liveTokensPageLine(own, source) : 1;

      const columns = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--columns-count').trim(),
        10,
      );
      if (!columns) return { grids, children, failures, pageLine };

      for (const grid of root.querySelectorAll('*')) {
        if (grid.closest(chrome)) continue;
        const style = getComputedStyle(grid);
        const tracks = style.gridTemplateColumns.split(/\s+/).map(parseFloat);
        if (tracks.length !== columns || tracks.some((track) => !Number.isFinite(track))) continue;
        grids++;
        const box = grid.getBoundingClientRect();
        const gap = parseFloat(style.columnGap) || 0;
        let offset = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
        const lines: number[] = [];
        for (const track of tracks) {
          lines.push(offset);
          offset += track;
          lines.push(offset);
          offset += gap;
        }
        const nearest = (edge: number) =>
          lines.reduce((best, line) => (Math.abs(line - edge) < Math.abs(best - edge) ? line : best), lines[0]);

        const items = getComputedStyle(grid).justifyItems;
        for (const child of grid.children) {
          if (child.matches(chrome)) continue;
          const kid = getComputedStyle(child);
          if (kid.display === 'none' || kid.display === 'contents') continue;
          // Out of flow: the grid places its containing block, not the box.
          if (kid.position === 'absolute' || kid.position === 'fixed') continue;
          // The border box, which is the edge the eye reads. A margin that
          // insets a stretched section moves that edge off the line, and the
          // finding is the same one a reader would raise.
          const { left, right } = child.getBoundingClientRect();
          children++;
          // Self-alignment is the grid's own way of insetting a box in the
          // area it placed: a centred section is still on the grid, and only
          // the edge its alignment pins has to land on a line. A margin, a
          // width, or a transform is not the grid's vocabulary, so a stretched
          // item answers for both edges.
          const align = kid.justifySelf === 'auto' ? items : kid.justifySelf;
          const centred = align === 'center';
          const pinned: ('left' | 'right')[] = centred ? []
            : align === 'start' || align === 'flex-start' || align === 'left' ? ['left']
            : align === 'end' || align === 'flex-end' || align === 'right' ? ['right']
            : ['left', 'right'];
          if (centred) {
            const before = left - Math.max(...lines.filter((line) => line <= left + tolerance), lines[0]);
            const after = Math.min(...lines.filter((line) => line >= right - tolerance), lines[lines.length - 1]) - right;
            if (Math.abs(before - after) > tolerance) {
              failures.push({
                line: window.__liveTokensPageLine(child, source),
                tag: child.tagName.toLowerCase(),
                edge: before > after ? 'left' : 'right',
                off: Math.round((before - after) * 10) / 10,
              });
            }
            continue;
          }
          for (const edge of pinned) {
            const at = edge === 'left' ? left : right;
            const off = at - nearest(at);
            if (Math.abs(off) <= tolerance) continue;
            failures.push({
              line: window.__liveTokensPageLine(child, source),
              tag: child.tagName.toLowerCase(),
              edge,
              off: Math.round(off * 10) / 10,
            });
          }
        }
      }
      return { grids, children, failures, pageLine };
    }, { container: PAGE_CONTAINER, chrome: CHROME, source: this.target.source, tolerance: GRID_TOLERANCE });
  }

  /** What the page pushes past the viewport, past its own container, or past
   *  the box that clips it. */
  async observeOverflow(specs: ContractPaintSpec[]): Promise<OverflowObservation> {
    return this.page.evaluate(({ specs: list, container, chrome, source, tolerance }) => {
      const failures: OverflowFailure[] = [];
      let elements = 0;
      const root = document.querySelector(container);
      if (!root) return { elements, failures };
      const own = [...root.children].find((child) => !child.matches(chrome));
      const pageLine = own ? window.__liveTokensPageLine(own, source) : 1;

      const page = document.documentElement;
      if (page.scrollWidth > window.innerWidth + tolerance) {
        failures.push({
          line: pageLine,
          tag: 'html',
          kind: 'document',
          detail: `the document scrolls to ${page.scrollWidth}px at a ${window.innerWidth}px viewport`,
        });
      }

      for (const element of root.querySelectorAll('*')) {
        if (element.closest(chrome)) continue;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.display === 'contents') continue;
        // An inline box reports 0 for both, so every one of them would read as
        // overflowing its own zero width.
        if (element.clientWidth === 0) continue;
        elements++;
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') continue;
        if (element.scrollWidth > element.clientWidth + tolerance) {
          failures.push({
            line: window.__liveTokensPageLine(element, source),
            tag: element.tagName.toLowerCase(),
            kind: 'element',
            detail: `<${element.tagName.toLowerCase()}> holds ${element.scrollWidth}px of content in `
              + `${element.clientWidth}px, and its overflow-x is ${style.overflowX}`,
          });
        }
      }

      const clips = (style: CSSStyleDeclaration) =>
        style.overflowX !== 'visible' || style.overflowY !== 'visible';
      for (const spec of list) {
        for (const instance of root.querySelectorAll(spec.root)) {
          if (instance.closest(chrome)) continue;
          let clipper: Element | null = null;
          for (let node = instance.parentElement; node; node = node.parentElement) {
            if (clips(getComputedStyle(node))) { clipper = node; break; }
          }
          if (!clipper) continue;
          const box = instance.getBoundingClientRect();
          const bounds = clipper.getBoundingClientRect();
          const past = [
            box.left < bounds.left - tolerance ? `${Math.round(bounds.left - box.left)}px past the left edge` : null,
            box.right > bounds.right + tolerance ? `${Math.round(box.right - bounds.right)}px past the right edge` : null,
          ].filter((side): side is string => side !== null);
          if (past.length === 0) continue;
          failures.push({
            line: window.__liveTokensPageLine(instance, source),
            tag: spec.id,
            kind: 'instance',
            detail: `${spec.id} sits ${past.join(' and ')} of the `
              + `<${clipper.tagName.toLowerCase()}> that clips it`,
          });
        }
      }
      return { elements, failures };
    }, { specs, container: PAGE_CONTAINER, chrome: CHROME, source: this.target.source, tolerance: 1 });
  }

  /**
   * Every rule reports the same three ways: it throws a `PageViolation` the
   * runner turns into a finding, returns a reason the run records as
   * `inapplicable`, or returns null, which is the pass. The suite files hold
   * no rule of their own so the defect fixtures measure what a consumer runs.
   */
  async assertComponentPaint(specs: ContractPaintSpec[]): Promise<string | null> {
    const observed = await this.observePaints(specs);
    if (observed.instances === 0) return `${this.target.source} renders no shipped component`;
    if (observed.failures.length > 0) {
      this.fail(
        'page-component-paint',
        observed.failures[0].line,
        report(observed.failures, `${observed.asserted} contracted paints`, (failure) =>
          `line ${failure.line}: ${failure.id}${failure.variant ? ` (${failure.variant})` : ''} `
          + `paints ${failure.part} ${cssName(failure.css)}: ${failure.actual}, `
          + `but ${failure.variable} resolves to ${failure.expected}`),
      );
    }
    // A page holding an instance the rule cannot place in a variant is a page
    // the rule did not prove.
    if (observed.uncovered.length > 0) {
      return `${this.target.source}: no entry names the variant of `
        + observed.uncovered
          .map((instance) => `${instance.id} at line ${instance.line}, which offers ${instance.variants.join(', ')}`)
          .join('; ');
    }
    if (observed.asserted === 0) {
      return `no contracted part of a shipped instance is rendered on ${this.target.source}`;
    }
    return null;
  }

  async assertTextStyle(bundles: TextBundle[], componentRoots: string[]): Promise<string | null> {
    const observed = await this.observeTextStyles(bundles, componentRoots);
    if (observed.elements === 0) return `${this.target.source} renders no text outside a shipped component`;
    if (observed.failures.length > 0) {
      this.fail(
        'page-text-style',
        observed.failures[0].line,
        report(observed.failures, `${observed.elements} runs of text`, (failure) =>
          `line ${failure.line}: <${failure.tag}> is in no shipped text style. `
          + `Nearest is ${failure.nearest}: its ${cssName(failure.axis)} is ${failure.expected}, `
          + `the element's is ${failure.actual}`),
      );
    }
    return null;
  }

  async assertContrast(componentRoots: string[]): Promise<string | null> {
    const observed = await this.observeContrast(componentRoots);
    const failures = observed.pairs
      .map((pair) => ({ pair, ratio: contrastRatio(hex(pair.color), hex(pair.background)), floor: aaFloor(pair) }))
      .filter(({ ratio, floor }) => ratio < floor);
    if (failures.length > 0) {
      const names = (colour: string, token: string | null) => (token ? `${token} (${colour})` : colour);
      this.fail(
        'page-contrast',
        failures[0].pair.line,
        report(failures, `${observed.pairs.length} text and surface pairs`, ({ pair, ratio, floor }) =>
          `line ${pair.line}: <${pair.tag}> at ${pair.fontSize}px/${pair.fontWeight} sets `
          + `${names(pair.color, pair.colorToken)} on ${names(pair.background, pair.backgroundToken)}, `
          + `a ratio of ${ratio.toFixed(2)} against the ${floor} AA floor`),
      );
    }
    if (observed.pairs.length === 0) {
      const why = reasons(observed.skipped);
      return why
        ? `no text on ${this.target.source} sits on a surface the rule can read: ${why}`
        : `${this.target.source} renders no text outside a shipped component`;
    }
    return null;
  }

  async assertGrid(): Promise<string | null> {
    if (this.viewport.width < GRID_VIEWPORT) {
      return `the page is one column at ${this.viewport.width}px, below the ${GRID_VIEWPORT}px the grid needs`;
    }
    const observed = await this.observeGrid();
    if (observed.grids === 0) {
      this.fail(
        'page-grid',
        observed.pageLine,
        `${this.target.source} draws no column grid: no element on it has as many tracks as `
        + '--columns-count. The page is the column grid, so its sections sit on one',
      );
    }
    if (observed.failures.length > 0) {
      this.fail(
        'page-grid',
        observed.failures[0].line,
        report(observed.failures, `${observed.children} sections on ${observed.grids} column grids`, (failure) =>
          `line ${failure.line}: <${failure.tag}> sits ${Math.abs(failure.off)}px `
          + `to the ${failure.off < 0 ? 'left' : 'right'} of the nearest column line on its ${failure.edge}`),
      );
    }
    return null;
  }

  async assertOverflow(specs: ContractPaintSpec[]): Promise<string | null> {
    const observed = await this.observeOverflow(specs);
    if (observed.failures.length > 0) {
      this.fail(
        'page-overflow',
        observed.failures[0].line,
        report(observed.failures, `${observed.elements} boxes`, (failure) =>
          `line ${failure.line}: ${failure.detail}`),
      );
    }
    return null;
  }
}

/** Installed on every page the run opens, so each rule reads the line the same
 *  way. Svelte's dev build stamps every element with the file and line it was
 *  written on; an element a component rendered carries the component's file, so
 *  the nearest ancestor the page file names is the line of the instance. */
export async function installPageProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__liveTokensPageLine = (node: Element, source: string): number => {
      for (let element: Element | null = node; element; element = element.parentElement) {
        const loc = (element as { __svelte_meta?: { loc?: { file?: string; line?: number } } }).__svelte_meta?.loc;
        if (!loc || typeof loc.file !== 'string' || typeof loc.line !== 'number') continue;
        if (loc.file.split('\\').join('/').endsWith(source)) return loc.line;
      }
      return 1;
    };
  });
}

declare global {
  interface Window {
    __liveTokensPageLine: (node: Element, source: string) => number;
  }
}
