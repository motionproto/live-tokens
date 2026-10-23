import type { Page } from '@playwright/test';
import type { A11yResult } from './a11y';
import { cdpSession } from './traceProperties';

export const FOCUS_INDICATOR_RULE = 'focus-indicator-contrast';
export const BOUNDARY_RULE = 'control-boundary-contrast';

const NON_TEXT_URL = 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html';
const FOCUS_ATTR = 'data-lt-focus-probe';
const NO_TRANSITION_ID = 'lt-focus-probe-no-transition';
const FORCE = ['focus', 'focus-visible'];

/** Where the trace reads a result's properties: `selector` names the element
 *  that paints the colour, `forceOn` the element focus is forced on, and
 *  `ancestorsFrom` the nearest ancestor (1 is the parent, 0 the element
 *  itself) whose surface lies behind the measured edge. */
export interface TraceRequest {
  selector: string;
  forceOn?: string;
  ancestorsFrom?: number;
}

export interface CheckedResult {
  result: A11yResult;
  trace: TraceRequest;
}

/** A part whose border or surface draws a control's visible edge. */
export interface BoundaryPart {
  selector: string;
  label: string;
}

type Snapshot = string[];

type FocusOutcome =
  | { kind: 'none' | 'browser' | 'pass' }
  | {
    kind: 'fail' | 'review';
    channel: string;
    ratio?: number;
    target: string;
    indicator: string;
    html: string;
    ancestorsFrom: number;
  };

type BoundaryOutcome = {
  kind: 'fail' | 'review';
  label: string;
  target: string;
  html: string;
  border: number | null;
  surface: number | null;
  ancestorsFrom: number;
};

type PageRequest =
  | { kind: 'focusables'; scope: string; exclude: string[]; attr: string; styleId: string }
  | { kind: 'snapshot'; attr: string; index: number; scope: string; exclude: string[] }
  | { kind: 'measure'; attr: string; index: number; scope: string; exclude: string[]; before: Snapshot }
  | { kind: 'cleanup'; attr: string; styleId: string }
  | { kind: 'boundaries'; scope: string; exclude: string[]; parts: BoundaryPart[]; root: string };

/**
 * Runs in the page, so it carries every helper it needs. Colours resolve and
 * composite on a 1px canvas, which reads any CSS colour syntax the computed
 * style returns and blends alpha the way the page paints it.
 */
function inPage(request: PageRequest): unknown {
  const scopes = [...document.querySelectorAll<HTMLElement>(('scope' in request && request.scope) || ':not(*)')];
  const excluded = (el: Element) => 'exclude' in request && request.exclude.some((selector) => el.closest(selector));
  const inScope = (el: Element) => scopes.some((scope) => scope.contains(el)) && !excluded(el);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const paint = (layers: string[]): number[] => {
    ctx.clearRect(0, 0, 1, 1);
    for (const layer of ['#fff', ...layers]) {
      ctx.fillStyle = 'transparent';
      ctx.fillStyle = layer;
      ctx.fillRect(0, 0, 1, 1);
    }
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  };
  const alpha = (color: string): number => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'transparent';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return ctx.getImageData(0, 0, 1, 1).data[3] / 255;
  };
  const rgb = (channels: number[]) => `rgb(${channels.join(' ')})`;
  const luminance = (channels: number[]) => {
    const [r, g, b] = channels.map((c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number[], b: number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const selectorFor = (el: Element): string => {
    const count = (selector: string) => scopes.reduce((n, scope) => n + (scope.matches(selector) ? 1 : 0) + scope.querySelectorAll(selector).length, 0);
    const own = (e: Element) => e.tagName.toLowerCase()
      + [...e.classList].filter((name) => !name.startsWith('svelte-') && /^[\w-]+$/.test(name)).map((name) => `.${name}`).join('');
    const path: string[] = [];
    for (let e: Element | null = el; e; e = e.parentElement) {
      const step = own(e);
      path.unshift(step);
      if (count(path.join(' > ')) === 1) break;
      const same = [...(e.parentElement?.children ?? [])].filter((c) => c.tagName === e!.tagName);
      if (same.length > 1) path[0] = `${step}:nth-of-type(${same.indexOf(e) + 1})`;
      if (count(path.join(' > ')) === 1 || scopes.includes(e as HTMLElement)) break;
    }
    return path.join(' > ');
  };

  /** The surfaces behind `ring`, from the nearest box that contains it up to
   *  the first opaque one, composited over white. A gradient or image among
   *  them leaves the colour unknown. */
  const backdrop = (from: Element, ring: DOMRect) => {
    const layers: string[] = [];
    let level = 0;
    let first = -1;
    for (let e: Element | null = from; e; e = e.parentElement, level++) {
      const box = e.getBoundingClientRect();
      const contains = box.left <= ring.left + 0.5 && box.top <= ring.top + 0.5
        && box.right >= ring.right - 0.5 && box.bottom >= ring.bottom - 0.5;
      if (!contains) continue;
      if (first < 0) first = level;
      const style = getComputedStyle(e);
      if (style.backgroundImage !== 'none') return { color: null, first };
      const a = alpha(style.backgroundColor);
      if (a > 0) layers.unshift(style.backgroundColor);
      if (a >= 1) break;
    }
    return { color: paint(layers), first: Math.max(first, 0) };
  };
  const inflate = (box: DOMRect, by: number) => new DOMRect(box.x - by, box.y - by, box.width + 2 * by, box.height + 2 * by);
  const px = (value: string) => parseFloat(value) || 0;
  const html = (el: Element) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 300);

  const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
  const visibleSide = (style: CSSStyleDeclaration, side: string) => {
    const s = style as unknown as Record<string, string>;
    return !['none', 'hidden'].includes(s[`border${side}Style`]) && px(s[`border${side}Width`]) >= 0.99
      ? s[`border${side}Color`] : null;
  };

  const candidates = (target: Element): Element[] => {
    const list = [target, ...target.querySelectorAll('*')];
    for (const sibling of target.parentElement?.children ?? []) {
      if (sibling !== target) list.push(sibling, ...sibling.querySelectorAll('*'));
    }
    return list.filter(inScope);
  };
  const signature = (el: Element) => {
    const s = getComputedStyle(el);
    return JSON.stringify([
      [s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset],
      s.boxShadow,
      SIDES.map((side) => visibleSide(s, side)),
    ]);
  };

  /** The colour focus brings in on `el`, by decision 8's order: an outline,
   *  else the first outer box shadow, else a border. A channel focus leaves
   *  alone, or paints fully transparent, is no indicator. */
  const indicatorOf = (el: Element, before: string) => {
    const [outlineBefore, shadowBefore, bordersBefore] = JSON.parse(before);
    const s = getComputedStyle(el);
    const outline = [s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset];
    if (JSON.stringify(outline) !== JSON.stringify(outlineBefore) && s.outlineStyle !== 'none' && px(s.outlineWidth) > 0) {
      if (s.outlineStyle === 'auto') return { channel: 'browser', color: '', extent: 0 };
      if (alpha(s.outlineColor) > 0) return { channel: 'outline', color: s.outlineColor, extent: px(s.outlineOffset) + px(s.outlineWidth) };
    }
    if (s.boxShadow !== shadowBefore && s.boxShadow !== 'none') {
      const shadows = s.boxShadow.split(/,(?![^(]*\))/).map((part) => part.trim());
      for (const shadow of shadows) {
        if (/\binset\b/.test(shadow)) continue;
        const color = /^(?:[a-z-]+\([^)]*\)|#[\da-f]+|[a-z]+)/i.exec(shadow)?.[0] ?? '';
        if (!color || alpha(color) === 0) continue;
        const [x = 0, y = 0, blur = 0, spread = 0] = (shadow.slice(color.length).match(/-?[\d.]+px/g) ?? []).map(px);
        return { channel: 'shadow', color, extent: Math.max(Math.abs(x), Math.abs(y)) + blur + spread };
      }
    }
    const borders = SIDES.map((side) => visibleSide(s, side));
    for (const [i, color] of borders.entries()) {
      if (color && color !== bordersBefore[i] && alpha(color) > 0) return { channel: 'border', color, extent: 0 };
    }
    return null;
  };

  switch (request.kind) {
    case 'focusables': {
      // A focus transition would leave the computed colour at its start.
      const style = document.createElement('style');
      style.id = request.styleId;
      style.textContent = '*, *::before, *::after { transition: none !important; }';
      document.head.append(style);
      const focusable = 'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, [tabindex], [contenteditable]:not([contenteditable="false"])';
      const found = scopes.flatMap((scope) => [scope, ...scope.querySelectorAll(focusable)])
        .filter((el, i, all) => all.indexOf(el) === i && el.matches(focusable) && inScope(el))
        .filter((el) => (el as HTMLElement).tabIndex >= 0 && !el.matches(':disabled') && el.checkVisibility({ visibilityProperty: true }));
      found.forEach((el, i) => el.setAttribute(request.attr, String(i)));
      return found.length;
    }
    case 'snapshot': {
      const target = document.querySelector(`[${request.attr}="${request.index}"]`)!;
      return candidates(target).map(signature);
    }
    case 'measure': {
      const target = document.querySelector(`[${request.attr}="${request.index}"]`)!;
      const list = candidates(target);
      for (const [i, el] of list.entries()) {
        if (request.before[i] === undefined || request.before[i] === signature(el)) continue;
        const found = indicatorOf(el, request.before[i]);
        if (!found) continue;
        if (found.channel === 'browser') return { kind: 'browser' };
        const ring = inflate(el.getBoundingClientRect(), Math.max(found.extent, 0));
        const behind = backdrop(found.channel === 'border' ? el.parentElement! : el, found.extent < 0 ? el.getBoundingClientRect() : ring);
        const offset = found.channel === 'border' ? 1 : 0;
        const common = {
          channel: found.channel,
          target: selectorFor(target),
          indicator: selectorFor(el),
          html: html(target),
          ancestorsFrom: behind.first + offset,
        };
        if (!behind.color) return { kind: 'review', ...common };
        const ratio = contrast(paint([rgb(behind.color), found.color]), behind.color);
        return ratio < 3 ? { kind: 'fail', ratio, ...common } : { kind: 'pass' };
      }
      return { kind: 'none' };
    }
    case 'cleanup': {
      document.getElementById(request.styleId)?.remove();
      for (const el of document.querySelectorAll(`[${request.attr}]`)) el.removeAttribute(request.attr);
      return null;
    }
    case 'boundaries': {
      const outcomes: BoundaryOutcome[] = [];
      const control = 'button, input, select, textarea, [aria-disabled]';
      const inactive = (el: Element) => {
        const root = el.closest(request.root) ?? el;
        const controls = [root, ...root.querySelectorAll(control)].filter((c) => c.matches(control));
        return controls.length > 0 && controls.every((c) => c.matches(':disabled') || c.getAttribute('aria-disabled') === 'true');
      };
      for (const part of request.parts) {
        const elements = scopes.flatMap((scope) => [scope, ...scope.querySelectorAll(part.selector)])
          .filter((el, i, all) => all.indexOf(el) === i && el.matches(part.selector) && inScope(el))
          .filter((el) => el.checkVisibility({ visibilityProperty: true }) && el.getBoundingClientRect().width > 0 && !inactive(el));
        for (const el of elements) {
          const style = getComputedStyle(el);
          const behind = backdrop(el.parentElement!, el.getBoundingClientRect());
          const common = { label: part.label, target: selectorFor(el), html: html(el), ancestorsFrom: behind.first + 1 };
          if (!behind.color) {
            outcomes.push({ kind: 'review', border: null, surface: null, ...common });
            continue;
          }
          const surfaceColor = paint([rgb(behind.color), style.backgroundColor]);
          const surface = style.backgroundImage === 'none' ? contrast(surfaceColor, behind.color) : null;
          const edge = SIDES.map((side) => visibleSide(style, side)).find(Boolean);
          const under = style.backgroundClip === 'border-box' ? surfaceColor : behind.color;
          const border = edge ? contrast(paint([rgb(under), edge]), behind.color) : null;
          if ((border ?? 0) >= 3 || (surface ?? 0) >= 3) continue;
          outcomes.push({ kind: surface === null ? 'review' : 'fail', border, surface, ...common });
        }
      }
      return outcomes;
    }
  }
}

function run<T>(page: Page, request: PageRequest): Promise<T> {
  return page.evaluate(inPage, request) as Promise<T>;
}

/** Below 3:1 fails; WCAG does not round, so neither does the reading. */
function ratioText(ratio: number): string {
  return `${Math.floor(ratio * 100) / 100}:1`;
}

/**
 * Decision 8: focus forced on each focusable element in `scope`, the colour
 * it brings in measured against the surfaces behind it. The indicator is the
 * first of the element, its descendants and its siblings whose outline, box
 * shadow or border focus changes, so a ring drawn on a sibling, as Slider
 * draws it, counts. Chromium's own `auto` ring pairs a dark and a light band,
 * one of which contrasts with any backdrop, so it passes. An element focus
 * leaves unchanged is SIA-R65's finding and adds none here.
 */
export async function scanFocusIndicators(page: Page, scope: string, exclude: string[]): Promise<CheckedResult[]> {
  const cdp = await cdpSession(page);
  const count = await run<number>(page, { kind: 'focusables', scope, exclude, attr: FOCUS_ATTR, styleId: NO_TRANSITION_ID });
  const checked: CheckedResult[] = [];
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    for (let index = 0; index < count; index++) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[${FOCUS_ATTR}="${index}"]` });
      const before = await run<Snapshot>(page, { kind: 'snapshot', attr: FOCUS_ATTR, index, scope, exclude });
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: FORCE });
      let outcome: FocusOutcome;
      try {
        outcome = await run<FocusOutcome>(page, { kind: 'measure', attr: FOCUS_ATTR, index, scope, exclude, before });
      } finally {
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      }
      if (outcome.kind !== 'fail' && outcome.kind !== 'review') continue;
      const where = outcome.indicator === outcome.target ? '' : ` on ${outcome.indicator}`;
      checked.push({
        result: {
          rule: outcome.kind === 'fail' ? 'a11y-component' : 'a11y-review',
          engineRule: FOCUS_INDICATOR_RULE,
          impact: null,
          target: outcome.target,
          html: outcome.html,
          help: outcome.kind === 'fail'
            ? `Focus ${outcome.channel}${where} ${ratioText(outcome.ratio!)} against the backdrop, needs 3:1`
            : `Focus ${outcome.channel}${where} sits over a gradient or image. Check by eye that it contrasts 3:1 with the backdrop`,
          helpUrl: NON_TEXT_URL,
        },
        trace: { selector: outcome.indicator, forceOn: outcome.target, ancestorsFrom: outcome.ancestorsFrom },
      });
    }
  } finally {
    await run(page, { kind: 'cleanup', attr: FOCUS_ATTR, styleId: NO_TRANSITION_ID });
  }
  return checked;
}

/**
 * Decision 9: each visible element of each boundary part in `scope` passes
 * when its border, 1px or wider, or its surface contrasts 3:1 with the
 * surfaces behind it. A part of a control whose every form control is
 * disabled is inactive, which SC 1.4.11 exempts. `root` names the component's
 * root part, the extent of the control.
 */
export async function scanBoundaries(
  page: Page,
  scope: string,
  exclude: string[],
  parts: BoundaryPart[],
  root: string,
): Promise<CheckedResult[]> {
  if (parts.length === 0) return [];
  const outcomes = await run<BoundaryOutcome[]>(page, { kind: 'boundaries', scope, exclude, parts, root });
  return outcomes.map((outcome) => {
    const border = outcome.border === null ? 'no border' : `border ${ratioText(outcome.border)}`;
    return {
      result: {
        rule: outcome.kind === 'fail' ? 'a11y-component' : 'a11y-review',
        engineRule: BOUNDARY_RULE,
        impact: null,
        target: outcome.target,
        html: outcome.html,
        help: outcome.kind === 'fail'
          ? `${outcome.label} ${border} and surface ${ratioText(outcome.surface!)} against the backdrop, needs 3:1`
          : `${outcome.label} sits on or carries a gradient or image. Check by eye that its edge contrasts 3:1 with the backdrop`,
        helpUrl: NON_TEXT_URL,
      },
      trace: { selector: outcome.target, ancestorsFrom: outcome.ancestorsFrom },
    };
  });
}
