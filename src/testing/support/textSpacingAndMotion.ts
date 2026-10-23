import type { Page } from '@playwright/test';
import type { A11yResult } from './a11y';
import { describeTagged, type CheckedResult } from './nonTextContrast';

export const TEXT_SPACING_URL = 'https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html';

/** An animation that ends within this many milliseconds of its start reads as
 *  a fade or a state change, which reduced motion leaves alone. */
export const MOTION_MS = 200;
export const MOTION_URL = 'https://www.w3.org/WAI/WCAG22/Techniques/css/C39';

export const TEXT_SPACING_RULE = 'text-spacing';
export const REDUCED_MOTION_RULE = 'prefers-reduced-motion';

const SPACING_ATTR = 'data-lt-spacing-probe';
const MOTION_ATTR = 'data-lt-motion-probe';
const STILL_ID = 'lt-spacing-probe-still';
const TOLERANCE = 1;

/** The override SC 1.4.12 names, as the W3C's own text spacing bookmarklet
 *  applies it, over the whole page or inside `scope`. */
export function textSpacingCss(scope?: string): string {
  const every = scope ? `${scope}, ${scope} *` : '*';
  const paragraphs = scope ? `${scope} p` : 'p';
  return `
${every} { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
${paragraphs} { margin-bottom: 2em !important; }
`;
}

/**
 * What `observe` finds under the SC 1.4.12 override and not without it. The
 * pixel counts in a failure move under the override, so `key` names a failure
 * by what fails and where; a key found n times without the override excuses n
 * under it.
 */
export async function newUnderTextSpacing<T>(
  page: Page,
  observe: () => Promise<T[]>,
  key: (failure: T) => string,
  scope?: string,
): Promise<T[]> {
  const before = await observe();
  const style = await page.addStyleTag({ content: textSpacingCss(scope) });
  let after: T[];
  try {
    after = await observe();
  } finally {
    await style.evaluate((node) => (node as Element).remove());
  }
  const known = new Map<string, number>();
  for (const failure of before) known.set(key(failure), (known.get(key(failure)) ?? 0) + 1);
  return after.filter((failure) => {
    const left = known.get(key(failure)) ?? 0;
    if (left > 0) known.set(key(failure), left - 1);
    return left === 0;
  });
}

/** Tags with its index under `attr` each element inside `scope`, outside
 *  `exclude`, that is or sits inside one of `own`, and returns how many it
 *  tagged. `own` names the component's root and portaled parts, so the
 *  editor's scaffolding around the preview stays out. */
function tagInScope(page: Page, scope: string, exclude: string[], own: string[], attr: string): Promise<number> {
  return page.evaluate(({ scope, exclude, own, attr }) => {
    const found = [...document.querySelectorAll(scope)].flatMap((root) => [root, ...root.querySelectorAll('*')])
      .filter((el, i, all) => all.indexOf(el) === i && el.closest(own) && !exclude.some((selector) => el.closest(selector)));
    found.forEach((el, i) => el.setAttribute(attr, String(i)));
    return found.length;
  }, { scope, exclude, own: own.join(', '), attr });
}

function untag(page: Page, attr: string, styleId?: string): Promise<void> {
  return page.evaluate(({ attr, styleId }) => {
    if (styleId) document.getElementById(styleId)?.remove();
    for (const el of document.querySelectorAll(`[${attr}]`)) el.removeAttribute(attr);
  }, { attr, styleId });
}

interface Overflow {
  index: string;
  axis: 'x' | 'y';
  tag: string;
  content: number;
  box: number;
  overflow: string;
}

/** Each tagged element whose content runs past its box on an axis it does not
 *  scroll. */
function observeOverflow(page: Page): Promise<Overflow[]> {
  return page.evaluate(({ attr, tolerance }) => [...document.querySelectorAll(`[${attr}]`)].flatMap((el) => {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.display === 'contents') return [];
    // An inline box reports 0 for both, so it would read as overflowing its own zero size.
    if (el.clientWidth === 0 && el.clientHeight === 0) return [];
    // A box with no text under it holds icon glyphs, which letter spacing pads with nothing visible.
    if (!el.textContent?.trim()) return [];
    const index = el.getAttribute(attr)!;
    const tag = el.tagName.toLowerCase();
    const found: Overflow[] = [];
    const axes = [
      ['x', el.scrollWidth, el.clientWidth, style.overflowX],
      ['y', el.scrollHeight, el.clientHeight, style.overflowY],
    ] as const;
    for (const [axis, content, box, overflow] of axes) {
      if (overflow === 'auto' || overflow === 'scroll' || content <= box + tolerance) continue;
      found.push({ index, axis, tag, content, box, overflow });
    }
    return found;
  }), { attr: SPACING_ATTR, tolerance: TOLERANCE });
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

/**
 * Decision 10: each element of the component in `scope` that overflows or
 * clips under the SC 1.4.12 override, applied inside `scope`, and did not
 * without it. A transition would leave the box at its start size, so
 * transitions stay off while the check reads.
 */
export async function scanTextSpacing(page: Page, scope: string, exclude: string[], own: string[]): Promise<A11yResult[]> {
  await page.evaluate(({ id, scope }) => {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `${scope} *, ${scope} *::before, ${scope} *::after { transition: none !important; }`;
    document.head.append(style);
  }, { id: STILL_ID, scope });
  try {
    if (await tagInScope(page, scope, exclude, own, SPACING_ATTR) === 0) return [];
    const found = await newUnderTextSpacing(page, () => observeOverflow(page), (o) => `${o.index}|${o.axis}`, scope);
    if (found.length === 0) return [];
    const byElement = groupBy(found, (o) => o.index);
    const described = await describeTagged(page, scope, exclude, SPACING_ATTR, [...byElement.keys()]);
    return [...byElement.values()].map((overflows, i) => ({
      rule: 'a11y-text-spacing',
      engineRule: TEXT_SPACING_RULE,
      impact: null,
      target: described[i].target,
      html: described[i].html,
      help: `Under the text spacing override, ${overflows.map((o) =>
        `<${o.tag}> holds ${o.content}px of content in ${o.box}px of ${o.axis === 'x' ? 'width' : 'height'}, `
        + `and its overflow-${o.axis} is ${o.overflow}`).join('; ')}`,
      helpUrl: TEXT_SPACING_URL,
    }));
  } finally {
    await untag(page, SPACING_ATTR, STILL_ID);
  }
}

interface Motion {
  index: string;
  pseudo: string;
  kind: 'animation' | 'transition' | 'script';
  name: string;
  end: number;
}

/** Each tagged element's animations and transitions, and its pseudo-elements',
 *  that last past `MOTION_MS`. The harness finishes every finite animation
 *  when it selects a view, so the read takes each declared one at its length,
 *  run or not. A script animation counts while it runs. */
function observeMotion(page: Page): Promise<Motion[]> {
  return page.evaluate(({ attr, limit }) => {
    const ms = (time: string) => parseFloat(time) * (time.trim().endsWith('ms') ? 1 : 1000) || 0;
    const list = (value: string) => value.split(/,(?![^(]*\))/).map((part) => part.trim());
    const at = (values: string[], i: number) => values[i % values.length];
    const found: Motion[] = [];
    const tagged = [...document.querySelectorAll(`[${attr}]`)].filter((el) => el.checkVisibility());
    for (const el of tagged) {
      const index = el.getAttribute(attr)!;
      for (const pseudo of ['', '::before', '::after']) {
        const style = getComputedStyle(el, pseudo || null);
        if (pseudo && (style.content === 'none' || style.content === 'normal' || style.display === 'none')) continue;
        const durations = list(style.animationDuration);
        const counts = list(style.animationIterationCount);
        const delays = list(style.animationDelay);
        list(style.animationName).forEach((name, i) => {
          if (name === 'none') return;
          const count = at(counts, i);
          const end = ms(at(delays, i)) + (count === 'infinite' ? Infinity : ms(at(durations, i)) * parseFloat(count));
          // Svelte scopes a component's keyframes with a hash its source never spells.
          if (end > limit) found.push({ index, pseudo, kind: 'animation', name: name.replace(/^svelte-[a-z0-9]+-/, ''), end });
        });
        const transitionDurations = list(style.transitionDuration);
        const transitionDelays = list(style.transitionDelay);
        list(style.transitionProperty).forEach((name, i) => {
          const end = ms(at(transitionDurations, i)) + ms(at(transitionDelays, i));
          if (name !== 'none' && end > limit) found.push({ index, pseudo, kind: 'transition', name, end });
        });
      }
    }
    for (const animation of document.getAnimations()) {
      if (animation instanceof CSSAnimation || animation instanceof CSSTransition || animation.playState !== 'running') continue;
      const effect = animation.effect;
      if (!(effect instanceof KeyframeEffect) || !effect.target?.hasAttribute(attr)) continue;
      const end = Number(effect.getComputedTiming().endTime ?? 0);
      if (end > limit) {
        found.push({ index: effect.target.getAttribute(attr)!, pseudo: effect.pseudoElement ?? '', kind: 'script', name: animation.id, end });
      }
    }
    return found;
  }, { attr: MOTION_ATTR, limit: MOTION_MS });
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function describeMotion({ kind, name, end }: Motion): string {
  const what = kind === 'animation' ? `the animation ${name}`
    : kind === 'transition' ? `a transition of ${name}` : `a script animation${name ? ` ${name}` : ''}`;
  return `${what} ${Number.isFinite(end) ? `lasts ${Math.round(end)} ms` : 'runs without end'}`;
}

/**
 * Decision 11: the animations and transitions of the component in `scope`
 * that last past `MOTION_MS`, read again under `prefers-reduced-motion:
 * reduce`. Each one still that long reports. A view with none skips the
 * second read, and the emulation lifts before the check returns.
 */
export async function scanReducedMotion(page: Page, scope: string, exclude: string[], own: string[]): Promise<CheckedResult[]> {
  try {
    if (await tagInScope(page, scope, exclude, own, MOTION_ATTR) === 0) return [];
    if ((await observeMotion(page)).length === 0) return [];
    let reduced: Motion[];
    await page.emulateMedia({ reducedMotion: 'reduce' });
    try {
      // A script that listens for the preference reacts on a later frame.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      reduced = await observeMotion(page);
    } finally {
      await page.emulateMedia({ reducedMotion: null });
    }
    if (reduced.length === 0) return [];
    const byTarget = groupBy(reduced, (m) => `${m.index}\n${m.pseudo}`);
    const groups = [...byTarget.values()];
    const described = await describeTagged(page, scope, exclude, MOTION_ATTR, groups.map((motions) => motions[0].index));
    return groups.map((motions, i) => ({
      result: {
        rule: 'a11y-reduced-motion',
        engineRule: REDUCED_MOTION_RULE,
        impact: null,
        target: `${described[i].target}${motions[0].pseudo}`,
        html: described[i].html,
        help: capitalize(`${motions.map(describeMotion).join('; ')} under prefers-reduced-motion: reduce`),
        helpUrl: MOTION_URL,
      },
      trace: { selector: described[i].target },
    }));
  } finally {
    await untag(page, MOTION_ATTR);
  }
}
