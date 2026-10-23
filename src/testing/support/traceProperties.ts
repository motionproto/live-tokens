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
    force: ['focus', 'focus-visible'],
  },
  'target-size': { target: BOX_SIZE, pseudoElements: BOX_SIZE, ancestors: [] },
};

interface Declaration {
  name: string;
  value: string;
  text?: string;
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

function sessionFor(page: Page): Promise<CDPSession> {
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

async function matchedStyles(cdp: CDPSession, nodeId: number, force: string[] = []) {
  const forcePseudoState = (forcedPseudoClasses: string[]) => cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses });
  if (force.length === 0) return cdp.send('CSS.getMatchedStylesForNode', { nodeId });
  await forcePseudoState(force);
  return cdp.send('CSS.getMatchedStylesForNode', { nodeId }).finally(() => forcePseudoState([]));
}

async function traceNode(
  cdp: CDPSession,
  nodeId: number,
  depth: number,
  axes: TraceAxes,
  known: ReadonlySet<string>,
  longhands: Longhands,
): Promise<string[]> {
  const matched = await matchedStyles(cdp, nodeId, axes.force);
  const own = axes.force
    ? await forcedDeclarations(await matchedStyles(cdp, nodeId), matched, longhands)
    : declarations(matched);
  const pseudo = (matched.pseudoElements ?? []).flatMap(({ matches }) => declarations({ matchedCSSRules: matches }));
  const ancestors = (matched.inherited ?? []).slice(0, depth).flatMap(declarations);
  const pending = [
    ...own.filter((d) => onAxis(d.name, axes.target)),
    ...pseudo.filter((d) => onAxis(d.name, axes.pseudoElements)),
    ...ancestors.filter((d) => onAxis(d.name, axes.ancestors)),
  ].flatMap((d) => references(d.value));

  const custom = [...declarations(matched), ...pseudo, ...ancestors].filter((d) => d.name.startsWith('--'));
  const found = new Set<string>();
  const followed = new Set<string>();
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    if (known.has(name)) found.add(name);
    else if (!followed.has(name)) {
      followed.add(name);
      for (const d of custom) if (d.name === name) pending.push(...references(d.value));
    }
  }
  return [...found];
}

/**
 * The component properties `axes` reads on the element `target.selector`
 * names inside `target.scope` (decisions 1 to 3): each matched declaration on
 * an axis, narrowed under `axes.force` to the ones the force brings in or
 * changes, its `var()` references followed through every private custom
 * property the target or an in-scope ancestor declares, kept where a name is
 * in `known`. Sorted and unique.
 */
export async function traceProperties(
  page: Page,
  target: { selector: string; scope: string },
  axes: TraceAxes,
  known: ReadonlySet<string>,
): Promise<string[]> {
  let depths: number[];
  try {
    depths = await scopeDepths(page, target.selector, target.scope);
  } catch {
    // An Alfa label or an axe frame path need not parse as one selector.
    return [];
  }
  const cdp = await sessionFor(page);
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: target.selector });
  const longhands = longhandsIn(page);
  const found = new Set<string>();
  for (const [index, nodeId] of nodeIds.entries()) {
    if (depths[index] < 0) continue;
    for (const name of await traceNode(cdp, nodeId, depths[index], axes, known, longhands)) found.add(name);
  }
  return [...found].sort();
}
