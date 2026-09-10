import type { ElementHandle, Page } from '@playwright/test';
import {
  DEFAULT_PAGE_VIEWPORTS,
  PAGES_ENV,
  PAGE_VIEWPORTS_ENV,
  type PageViewport,
} from '../config';
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
 * states (hover, focused), component states (disabled, selected, error), and
 * views that only exist once something is opened (an active tab, a menu and
 * its options). Everything else — a bare label, `base`, `default`, and the
 * structural part labels (Header, Body, Footer, ...) — paints at rest.
 */
const TRANSIENT_STATE = /\b(?:hover|active|disabled|focused|error|selected|open|menu|option)\b/;

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
  variant: string | null;
  checks: PaintCheck[];
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
 * variant-keyed entry is matched against the instance's own root classes,
 * which is the convention every shipped component follows (`class="button
 * primary"`).
 */
export function restingPaintSpec(contract: ComponentContract): ContractPaintSpec | null {
  const rootSelector = contract.parts[contract.root];
  if (typeof rootSelector !== 'string') return null;
  const entries: PaintEntry[] = [];
  const inherited = contract.view ?? {};
  for (const expectation of contract.properties) {
    if ((expectation.setup ?? inherited.setup ?? []).length > 0) continue;
    if (!restingState(expectation.state ?? inherited.state)) continue;
    const checks = paintChecks(contract, expectation.paints);
    if (checks.length === 0) continue;
    entries.push({ variant: (expectation.variant ?? inherited.variant)?.toLowerCase() ?? null, checks });
  }
  // A component whose only resting paint map hangs off a state tab still
  // paints its default state on a page.
  if (!isInapplicable(contract.states)) {
    for (const state of contract.states) {
      if (!state.paints || !restingState(state.state)) continue;
      if ((state.setup ?? inherited.setup ?? []).length > 0) continue;
      const checks = paintChecks(contract, state.paints);
      if (checks.length === 0) continue;
      entries.push({ variant: (state.variant ?? inherited.variant)?.toLowerCase() ?? null, checks });
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

export interface PaintObservation {
  instances: number;
  asserted: number;
  failures: PaintFailure[];
  /** Contracts whose entries are all variant-keyed and matched no instance:
   *  decision 6's exception, reported rather than passed over. */
  unmatchedVariants: string[];
}

export interface TextObservation {
  elements: number;
  failures: { line: number; tag: string; nearest: string; axis: string; actual: string; expected: string }[];
}

export interface TextBundle {
  name: string;
  prefix: string;
}

const TEXT_AXES = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'] as const;

/** Displays that make an element a block of its own. Text sitting directly in
 *  anything else is a run inside a line, and the line's own block owns it. */
const BLOCK_DISPLAYS = ['block', 'flow-root', 'list-item', 'flex', 'grid', 'table-cell', 'table-caption'];

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
        for (const element of root.querySelectorAll(spec.root)) {
          if (element.closest(chrome)) continue;
          const variants = new Set<string>();
          for (const entry of spec.entries) if (entry.variant) variants.add(entry.variant);
          const matched = [...element.classList].find((name) => variants.has(name)) ?? null;
          found.push({ id: spec.id, variant: matched, line: window.__liveTokensPageLine(element, source) });
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
      const unmatchedVariants: string[] = [];
      let instances = 0;
      let asserted = 0;
      const root = document.querySelector(container);
      if (!root) return { instances, asserted, failures, unmatchedVariants };

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
        let matchedAny = false;
        let seen = 0;
        let variantKeyed = false;
        for (const entry of spec.entries) if (entry.variant) variantKeyed = true;
        for (const element of root.querySelectorAll(spec.root)) {
          if (element.closest(chrome)) continue;
          instances++;
          seen++;
          const classes = new Set(element.classList);
          const line = window.__liveTokensPageLine(element, source);
          for (const entry of spec.entries) {
            if (entry.variant && !classes.has(entry.variant)) continue;
            if (entry.variant) matchedAny = true;
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
        }
        // Only when the page renders one: a component the page never uses is
        // not an exception to decision 6, it is absent.
        if (seen > 0 && variantKeyed && !matchedAny) unmatchedVariants.push(spec.id);
      }
      return { instances, asserted, failures, unmatchedVariants };
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
