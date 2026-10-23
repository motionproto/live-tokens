import type { CDPSession, Page } from '@playwright/test';

/** The CSS properties a result's verdict reads, per element. A name ending in
 *  `*` matches every property that starts with the rest; `*` alone matches
 *  every property. */
export interface TraceAxes {
  target: string[];
  pseudoElements: string[];
  ancestors: string[];
  /** Pseudo-classes forced on the target while its styles are read. The
   *  target then keeps only the declarations the force brings in or changes. */
  force?: string[];
}

const BOX_SIZE = ['width', 'height', 'min-*', 'inline-size', 'block-size', 'padding*'];
const FOCUS = ['focus', 'focus-visible'];
// Every border property but the radii, which carry no colour or width.
const BORDER_PAINT = ['border-block*', 'border-inline*', ...['', '-top', '-right', '-bottom', '-left']
  .flatMap((side) => [`border${side}`, `border${side}-color`, `border${side}-width`, `border${side}-style`])];

// What sets how long a motion lasts; easing and fill shape it without lengthening it.
const MOTION = ['animation', 'animation-name', 'animation-duration', 'animation-delay', 'animation-iteration-count',
  'transition', 'transition-property', 'transition-duration', 'transition-delay'];

/** Decision 2 of docs/plans/a11y-property-marks.md, keyed by engine rule. An
 *  engine rule absent here traces nothing. */
export const TRACE_AXES: Readonly<Record<string, TraceAxes>> = {
  'color-contrast': {
    target: ['color', 'background*', 'opacity', 'text-shadow'],
    pseudoElements: ['*'],
    ancestors: ['background*', 'opacity'],
  },
  'SIA-R65': {
    target: ['outline*', 'box-shadow', 'border*', 'background*', 'color', 'text-decoration*'],
    pseudoElements: [],
    ancestors: [],
    force: FOCUS,
  },
  'target-size': { target: BOX_SIZE, pseudoElements: BOX_SIZE, ancestors: [] },
  'focus-indicator-contrast': {
    target: ['outline*', 'box-shadow', ...BORDER_PAINT, 'background*', 'color'],
    pseudoElements: [],
    ancestors: ['background*'],
    force: FOCUS,
  },
  'control-boundary-contrast': {
    target: [...BORDER_PAINT, 'outline', 'outline-color', 'outline-width', 'outline-style', 'background*'],
    pseudoElements: [],
    ancestors: ['background*'],
  },
  // Every element's line height is 1.5 under the override, so the theme's own cannot cause the overflow.
  'text-spacing': {
    target: ['height', 'max-height', 'width', 'max-width', 'padding*', 'overflow*', 'white-space'],
    pseudoElements: [],
    ancestors: [],
  },
  // A pseudo-element that does not display does not move, so its display gates the motion, as Button's shimmer does.
  'prefers-reduced-motion': { target: MOTION, pseudoElements: [...MOTION, 'display'], ancestors: [] },
};

interface Declaration {
  name: string;
  value: string;
  text?: string;
  important?: boolean;
}

interface Style {
  cssProperties: Declaration[];
}

interface RuleMatch {
  rule: {
    origin: string;
    style: Style & { range?: unknown };
    styleSheetId?: string;
    selectorList: { text: string };
  };
}

interface ElementStyles {
  inlineStyle?: Style;
  matchedCSSRules?: RuleMatch[];
}

const sessions = new WeakMap<Page, Promise<CDPSession>>();

/** One DevTools session per page, with `DOM` and `CSS` enabled. */
export function cdpSession(page: Page): Promise<CDPSession> {
  let session = sessions.get(page);
  if (!session) {
    session = (async () => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      return cdp;
    })();
    sessions.set(page, session);
  }
  return session;
}

function onAxis(property: string, axis: string[]): boolean {
  return axis.some((name) => (name.endsWith('*') ? property.startsWith(name.slice(0, -1)) : property === name));
}

/** Authored declarations only: Chromium also lists each shorthand's longhands
 *  without text, which would repeat every reference. */
function authored(style: Style | undefined): Declaration[] {
  return (style?.cssProperties ?? []).filter((declaration) => declaration.text);
}

function regularRules(styles: ElementStyles): RuleMatch['rule'][] {
  return (styles.matchedCSSRules ?? []).filter(({ rule }) => rule.origin === 'regular').map(({ rule }) => rule);
}

function declarations(styles: ElementStyles): Declaration[] {
  return [authored(styles.inlineStyle), ...regularRules(styles).map((rule) => authored(rule.style))].flat();
}

/** One element's declarations from lowest to highest precedence: its rules
 *  in cascade order, then its inline style. */
function cascadeOrder(styles: ElementStyles): Declaration[] {
  return [...regularRules(styles).flatMap((rule) => authored(rule.style)), ...authored(styles.inlineStyle)];
}

/** The declaration of `name` that wins among `ordered`, or none. */
function winning(ordered: Declaration[], name: string): Declaration | undefined {
  const all = ordered.filter((d) => d.name === name);
  // Chromium flags `important` on standard properties and leaves it in a custom property's value.
  return all.filter((d) => d.important || /!\s*important\s*$/i.test(d.value)).at(-1) ?? all.at(-1);
}

function ruleKey(rule: RuleMatch['rule']): string {
  return JSON.stringify([rule.styleSheetId, rule.selectorList.text, rule.style.range]);
}

type Longhands = (names: string[]) => Promise<Map<string, string[]>>;

/** The longhands each property sets, read from the page's CSSOM, so that
 *  `outline` and `outline-color` count as the same property. */
function longhandsIn(page: Page): Longhands {
  return async (names) => new Map(await page.evaluate((names) => names.map((name): [string, string[]] => {
    if (name.startsWith('--')) return [name, [name]];
    const style = document.createElement('div').style;
    style.setProperty(name, 'initial');
    return [name, style.length ? Array.from({ length: style.length }, (_, i) => style.item(i)) : [name]];
  }), names));
}

/**
 * The target's declarations under `forced` that the force brings in or
 * changes: every declaration of a rule that matches only under the force,
 * and every declaration of a later rule, or of the inline style, that sets a
 * property one of those rules sets. Rules that match in every state drop, so
 * a field's resting border and surface never name a focus finding.
 */
async function forcedDeclarations(plain: ElementStyles, forced: ElementStyles, longhands: Longhands): Promise<Declaration[]> {
  const before = new Set(regularRules(plain).map(ruleKey));
  const cascade = [
    ...regularRules(forced).map((rule) => ({ forcedOnly: !before.has(ruleKey(rule)), declarations: authored(rule.style) })),
    { forcedOnly: false, declarations: authored(forced.inlineStyle) },
  ];
  const expanded = await longhands([...new Set(cascade.flatMap((entry) => entry.declarations.map((d) => d.name)))]);
  const changed = new Set<string>();
  const kept: Declaration[] = [];
  for (const { forcedOnly, declarations } of cascade) {
    for (const d of declarations) {
      const sets = expanded.get(d.name) ?? [d.name];
      if (forcedOnly) sets.forEach((name) => changed.add(name));
      if (forcedOnly || sets.some((name) => changed.has(name))) kept.push(d);
    }
  }
  return kept;
}

function references(value: string): string[] {
  return [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1]);
}

/** How many ancestors separate each element `selector` matches from the
 *  nearest element `scope` matches, in document order, or -1 outside it. */
function scopeDepths(page: Page, selector: string, scope: string): Promise<number[]> {
  return page.evaluate(({ selector, scope }) => [...document.querySelectorAll(selector)].map((element) => {
    let depth = 0;
    for (let node: Element | null = element; node; node = node.parentElement, depth++) {
      if (node.matches(scope)) return depth;
    }
    return -1;
  }), { selector, scope });
}

async function matchedStyles(cdp: CDPSession, nodeId: number, force: string[] = [], forceNodeId = nodeId) {
  const forcePseudoState = (forcedPseudoClasses: string[]) => cdp.send('CSS.forcePseudoState', { nodeId: forceNodeId, forcedPseudoClasses });
  if (force.length === 0) return cdp.send('CSS.getMatchedStylesForNode', { nodeId });
  await forcePseudoState(force);
  return cdp.send('CSS.getMatchedStylesForNode', { nodeId }).finally(() => forcePseudoState([]));
}

interface TraceNode {
  nodeId: number;
  depth: number;
  forceNodeId?: number;
  ancestorsFrom: number;
}

async function traceNode(
  cdp: CDPSession,
  node: TraceNode,
  axes: TraceAxes,
  known: ReadonlySet<string>,
  longhands: Longhands,
): Promise<string[]> {
  const matched = await matchedStyles(cdp, node.nodeId, axes.force, node.forceNodeId);
  const own = axes.force
    ? await forcedDeclarations(await matchedStyles(cdp, node.nodeId), matched, longhands)
    : declarations(matched);
  const pseudo = (matched.pseudoElements ?? []).flatMap(({ matches }) => declarations({ matchedCSSRules: matches }));
  const chain = (matched.inherited ?? []).slice(0, node.depth);

  // A reference resolves on the element whose declaration holds it: level 0
  // is the target, level n its nth ancestor, and PSEUDO its pseudo-elements.
  // Only the winning declaration of a private property counts there, so a
  // selected tab traces its selected binding and leaves the default one out.
  const PSEUDO = -1;
  const levels = [cascadeOrder(matched), ...chain.map(cascadeOrder)];
  const pseudoCustom = pseudo.filter((d) => d.name.startsWith('--'));
  const from = Math.max(node.ancestorsFrom - 1, 0);
  const pending: { name: string; level: number }[] = [
    ...own.filter((d) => onAxis(d.name, axes.target)).map((d) => ({ d, level: 0 })),
    ...pseudo.filter((d) => onAxis(d.name, axes.pseudoElements)).map((d) => ({ d, level: PSEUDO })),
    ...chain.slice(from).flatMap((entry, i) => declarations(entry)
      .filter((d) => onAxis(d.name, axes.ancestors))
      .map((d) => ({ d, level: from + i + 1 }))),
  ].flatMap(({ d, level }) => references(d.value).map((name) => ({ name, level })));

  const resolve = (name: string, level: number): { declarations: Declaration[]; level: number } => {
    if (level === PSEUDO) {
      const own = pseudoCustom.filter((d) => d.name === name);
      if (own.length > 0) return { declarations: own, level: PSEUDO };
    }
    for (let at = Math.max(level, 0); at < levels.length; at++) {
      const won = winning(levels[at], name);
      if (won) return { declarations: [won], level: at };
    }
    return { declarations: [], level };
  };

  const found = new Set<string>();
  const followed = new Set<string>();
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    const { name, level } = next;
    const key = `${name}@${level}`;
    if (known.has(name)) found.add(name);
    else if (!followed.has(key)) {
      followed.add(key);
      const resolved = resolve(name, level);
      for (const d of resolved.declarations) pending.push(...references(d.value).map((ref) => ({ name: ref, level: resolved.level })));
    }
  }
  return [...found];
}

/** The element a trace reads, inside `scope`. `forceOn`, when set, names the
 *  element `axes.force` applies to, for a focus style drawn on another
 *  element. `ancestorsFrom` is the nearest ancestor whose `axes.ancestors`
 *  declarations count, 1 being the parent and the default. */
export interface TraceTarget {
  selector: string;
  scope: string;
  forceOn?: string;
  ancestorsFrom?: number;
}

/**
 * The component properties `axes` reads on the element `target.selector`
 * names inside `target.scope` (decisions 1 to 3): each matched declaration on
 * an axis, narrowed under `axes.force` to the ones the force brings in or
 * changes, its `var()` references followed through the winning declaration
 * of each private custom property on the target or an in-scope ancestor,
 * kept where a name is in `known`. Sorted and unique.
 */
export async function traceProperties(
  page: Page,
  target: TraceTarget,
  axes: TraceAxes,
  known: ReadonlySet<string>,
): Promise<string[]> {
  let depths: number[];
  let forceDepths: number[] = [];
  try {
    depths = await scopeDepths(page, target.selector, target.scope);
    if (target.forceOn) forceDepths = await scopeDepths(page, target.forceOn, target.scope);
  } catch {
    // An Alfa label or an axe frame path need not parse as one selector.
    return [];
  }
  const cdp = await cdpSession(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const query = async (selector: string) => (await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector })).nodeIds;
  const nodeIds = await query(target.selector);
  const forceNodeId = target.forceOn
    ? (await query(target.forceOn)).find((_, index) => forceDepths[index] >= 0)
    : undefined;
  if (target.forceOn && forceNodeId === undefined) return [];
  const longhands = longhandsIn(page);
  const found = new Set<string>();
  for (const [index, nodeId] of nodeIds.entries()) {
    if (depths[index] < 0) continue;
    const node = { nodeId, depth: depths[index], forceNodeId, ancestorsFrom: target.ancestorsFrom ?? 1 };
    for (const name of await traceNode(cdp, node, axes, known, longhands)) found.add(name);
  }
  return [...found].sort();
}
