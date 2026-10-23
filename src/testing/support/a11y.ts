import { test, type Page } from '@playwright/test';

export type A11yRule =
  | 'a11y-component'
  | 'a11y-page'
  | 'a11y-review'
  | 'a11y-focus-visible'
  | 'a11y-text-spacing'
  | 'a11y-reduced-motion'
  | 'a11y-keyboard';

/** One element one engine flagged. `line` is the page file line, which only
 *  the page suite can resolve; a component finding anchors on its runtime. */
export interface A11yResult {
  rule: A11yRule;
  engineRule: string;
  impact: string | null;
  target: string;
  html: string;
  help: string;
  helpUrl: string;
  line?: number;
}

const A11Y_ANNOTATION = 'a11y';

export type A11yEngine = 'axe' | 'alfa';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const SCOPE_ATTR = 'data-lt-a11y-scope';
const EXCLUDE_ATTR = 'data-lt-a11y-exclude';
const HTML_LIMIT = 300;

class EngineMissing extends Error {}

export async function importEngine<T>(packageName: string, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_MODULE_NOT_FOUND') throw new EngineMissing(`${packageName} is not installed`);
    throw error;
  }
}

let axeModules: ReturnType<typeof importAxe> | null = null;
async function importAxe() {
  await importEngine('axe-core', () => import('axe-core'));
  const { AxeBuilder } = await importEngine('@axe-core/playwright', () => import('@axe-core/playwright'));
  return { AxeBuilder };
}
const loadAxe = () => (axeModules ??= importAxe());

let alfaModules: ReturnType<typeof importAlfa> | null = null;
async function importAlfa() {
  const { Audit, Outcome } = await importEngine('@siteimprove/alfa-act', () => import('@siteimprove/alfa-act'));
  const { Rules } = await importEngine('@siteimprove/alfa-rules', () => import('@siteimprove/alfa-rules'));
  const { Node } = await importEngine('@siteimprove/alfa-dom', () => import('@siteimprove/alfa-dom'));
  const { Native: DomNative } = await importEngine('@siteimprove/alfa-dom', () => import('@siteimprove/alfa-dom/native'));
  const { Device } = await importEngine('@siteimprove/alfa-device', () => import('@siteimprove/alfa-device'));
  const { Native: DeviceNative } = await importEngine('@siteimprove/alfa-device', () => import('@siteimprove/alfa-device/native'));
  const { Page: AlfaPage } = await importEngine('@siteimprove/alfa-web', () => import('@siteimprove/alfa-web'));
  const http = await importEngine('@siteimprove/alfa-http', () => import('@siteimprove/alfa-http'));
  const { URL } = await importEngine('@siteimprove/alfa-url', () => import('@siteimprove/alfa-url'));
  return {
    Audit, Outcome, R65: Rules.get('R65').getUnsafe(), Node, DomNative, Device, DeviceNative, AlfaPage, http, URL,
  };
}
const loadAlfa = () => (alfaModules ??= importAlfa());

/** The reason to annotate a test `inapplicable` with when one of `engines`
 *  cannot load, or null when all of them load. */
export async function missingEngine(engines: A11yEngine[]): Promise<string | null> {
  try {
    for (const name of engines) await (name === 'axe' ? loadAxe() : loadAlfa());
    return null;
  } catch (error) {
    if (error instanceof EngineMissing) return error.message;
    throw error;
  }
}

interface AxeNode {
  target: unknown[];
  html: string;
  impact?: string | null;
  any: { message: string }[];
  all: { message: string }[];
  none: { message: string }[];
}

interface AxeRuleResult {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

function axeResults(rule: A11yRule, results: AxeRuleResult[], withReasons: boolean): A11yResult[] {
  return results.flatMap((result) =>
    result.nodes.map((node) => {
      const reasons = withReasons
        ? [...new Set([...node.any, ...node.all, ...node.none].map((check) => check.message).filter(Boolean))]
        : [];
      return {
        rule,
        engineRule: result.id,
        impact: node.impact ?? result.impact ?? null,
        target: node.target.map((part) => (Array.isArray(part) ? part.join(' >>> ') : String(part))).join(' | '),
        html: node.html.slice(0, HTML_LIMIT),
        help: [result.help, ...reasons].join('. '),
        helpUrl: result.helpUrl,
      };
    }),
  );
}

/** axe over `scope` (a selector), minus `exclude`. Violations report under
 *  `rule`, and the results axe cannot decide under `a11y-review`. A page scan
 *  leaves contrast to `page-contrast` (decision 8). */
export async function scanAxe(
  page: Page,
  scope: string,
  exclude: string[],
  rule: 'a11y-component' | 'a11y-page',
): Promise<A11yResult[]> {
  const { AxeBuilder } = await loadAxe();
  let builder = new AxeBuilder({ page }).include(scope).withTags(AXE_TAGS);
  for (const selector of exclude) builder = builder.exclude(selector);
  if (rule === 'a11y-page') builder = builder.disableRules(['color-contrast']);
  const result = await builder.analyze();
  return [
    ...axeResults(rule, result.violations as AxeRuleResult[], false),
    ...axeResults('a11y-review', result.incomplete as AxeRuleResult[], true),
  ];
}

interface SerialNode {
  type: string;
  name?: string;
  attributes?: { name: string }[];
  children?: SerialNode[];
}

/** Keeps the head, every scope's ancestor chain, and each scope's subtree
 *  whole. The style sheets travel on the document node, so the cascade stays
 *  intact, and SIA-R65 skips the editor's own controls: 0.3 to 0.8 s a scan
 *  against 2.5 s for the whole document, with the same outcomes. */
function pruneToScope(node: SerialNode): boolean {
  if (node.type === 'element' && node.attributes?.some((a) => a.name === SCOPE_ATTR)) return true;
  if (!node.children) return false;
  if (node.type === 'element' && node.name === 'head') return true;
  node.children = node.children.filter((child) => child.type === 'type' || pruneToScope(child));
  return node.type === 'document' || node.children.some((child) => child.type === 'element');
}

const FOCUS_HELP = {
  failed: 'Focusing the element changes nothing visible',
  cantTell: 'Focusing the element changes no style on it, its descendants, or its ancestors',
};

/** Alfa's SIA-R65 over `scope` (a selector), minus `exclude`. A cantTell
 *  outcome means Alfa found no focus style at all, so it reports beside a
 *  failure under `a11y-focus-visible`. */
export async function scanFocusVisible(page: Page, scope: string, exclude: string[]): Promise<A11yResult[]> {
  const alfa = await loadAlfa();
  await page.evaluate(({ scope, exclude, scopeAttr, excludeAttr }) => {
    for (const element of document.querySelectorAll(scope)) element.setAttribute(scopeAttr, '');
    for (const selector of exclude) {
      for (const element of document.querySelectorAll(selector)) element.setAttribute(excludeAttr, '');
    }
  }, { scope, exclude, scopeAttr: SCOPE_ATTR, excludeAttr: EXCLUDE_ATTR });
  let json: SerialNode;
  try {
    const handle = await page.evaluateHandle(() => document);
    json = (await handle.evaluate(alfa.DomNative.fromNode as (node: Document) => Promise<unknown>)) as SerialNode;
    await handle.dispose();
  } finally {
    await page.evaluate((attrs) => {
      for (const attr of attrs) for (const element of document.querySelectorAll(`[${attr}]`)) element.removeAttribute(attr);
    }, [SCOPE_ATTR, EXCLUDE_ATTR]);
  }
  pruneToScope(json);

  const fromWindow = alfa.DeviceNative.fromWindow as () => ReturnType<typeof alfa.DeviceNative.fromWindow>;
  const device = alfa.Device.from(await page.evaluate(fromWindow));
  const url = alfa.URL.parse(page.url()).getUnsafe();
  const { Request, Response, Headers, Header } = alfa.http;
  const alfaPage = alfa.AlfaPage.of(
    Request.of('GET', url),
    Response.of(url, 200, Headers.of([Header.of('Content-Type', 'text/html')])),
    alfa.Node.from(json as Parameters<typeof alfa.Node.from>[0], device) as Parameters<typeof alfa.AlfaPage.of>[2],
    device,
  );

  const results: A11yResult[] = [];
  for (const outcome of await alfa.Audit.of(alfaPage, [alfa.R65]).evaluate()) {
    const kind = alfa.Outcome.isFailed(outcome) ? 'failed' : alfa.Outcome.isCantTell(outcome) ? 'cantTell' : null;
    if (!kind) continue;
    const target = outcome.target as unknown as AlfaElement;
    if (!inScope(target)) continue;
    results.push({
      rule: 'a11y-focus-visible',
      engineRule: 'SIA-R65',
      impact: null,
      target: elementLabel(target),
      html: target.toString().replace(/\s+/g, ' ').slice(0, HTML_LIMIT),
      help: FOCUS_HELP[kind],
      helpUrl: alfa.R65.uri,
    });
  }
  return results;
}

interface AlfaElement {
  name: string;
  classes: Iterable<string>;
  id: { isSome(): boolean; get(): string };
  attribute?: (name: string) => { isSome(): boolean };
  inclusiveAncestors(): Iterable<AlfaElement>;
  toString(): string;
}

function inScope(target: AlfaElement): boolean {
  for (const node of target.inclusiveAncestors()) {
    if (typeof node.attribute !== 'function') continue;
    if (node.attribute(EXCLUDE_ATTR).isSome()) return false;
    if (node.attribute(SCOPE_ATTR).isSome()) return true;
  }
  return false;
}

function elementLabel(target: AlfaElement): string {
  const id = target.id.isSome() ? `#${target.id.get()}` : '';
  return `${target.name}${id}${[...target.classes].map((name) => `.${name}`).join('')}`;
}

/** Records `results` on the running test as the annotation the runner turns
 *  into findings (decision 3). The test itself passes. */
export function recordA11y(results: A11yResult[]): void {
  if (results.length === 0) return;
  test.info().annotations.push({ type: A11Y_ANNOTATION, description: JSON.stringify(results) });
}
