import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type Page } from '@playwright/test';
import {
  isInapplicable,
  partLocator,
  type ComponentContract,
  type SetupStep,
  type View,
} from './componentContract';
import { A11Y_THEMES_ENV, UPDATE_ARIA_ENV } from './config';
import { selectedContracts } from './contracts';
import { missingEngine, recordA11y, scanAxe, scanFocusVisible, type A11yResult } from './support/a11y';
import { ContractHarness } from './support/contractHarness';

// Each test opens its own editor and only reads the preview, so the
// components scan side by side.
test.describe.configure({ mode: 'parallel' });

const PRESETS = ['autumn', 'halloween', 'midnight-study', 'ocean', 'royal-velvet', 'sketchy', 'spring-meadow', 'sunset'];

const STAGE_ATTR = 'data-lt-a11y-stage';
const TREE_ATTR = 'data-lt-a11y-tree';
const SCOPE = `[${STAGE_ATTR}]`;
const EXCLUDE = [`${SCOPE} .canvas-toolbar`, '[data-preview-demo]'];

// The Wave 0 probe found every other axe rule, and SIA-R65, reporting the
// same nodes under all nine themes.
const PRESET_RULES = ['color-contrast'];

const VIEW_LIMIT = 4;
const DIFF_LIMIT = 600;
const ARIA_HELP_URL = 'https://playwright.dev/docs/aria-snapshots';

// axe returns every text node under the sticky band's full-size fade as
// incomplete, and the default backdrop paints an editor colour no theme moves.
const STAGE_CSS = `
.tabs-preview::after { display: none !important; }
.preview-stage, .preview-stage .shadow-backdrop { background: var(--page-bg) !important; }
`;

const here = path.dirname(fileURLToPath(import.meta.url));
const compiled = path.basename(here) === 'testing-js';
const sourceAria = path.resolve(here, compiled ? '../testing/contracts/__aria__' : 'contracts/__aria__');
// A tarball ships the compiled suite alone, with the recorded trees copied
// beside it; the repository's compiled suite still reads and writes the source.
const ARIA_DIR = !compiled || fs.existsSync(sourceAria) ? sourceAria : path.join(here, '__aria__');
const ARIA_WRITABLE = !ARIA_DIR.split(path.sep).includes('node_modules');

interface ScanView {
  label: string;
  view: View;
}

function describeStep(step: SetupStep): string {
  if (step.kind === 'control') {
    if (step.value !== undefined) return step.value;
    const named = /:has-text\("([^"]+)"\)/.exec(step.selector)?.[1] ?? step.selector;
    if (step.check !== undefined) return `${named} ${step.check ? 'on' : 'off'}`;
    return named;
  }
  if (step.kind === 'press') return `${step.key} on ${step.part}`;
  return `${step.kind} ${step.part}`;
}

/** Every variant and state pair the contract's properties and states name,
 *  once each, in the order the contract declares them. */
function viewsOf(contract: ComponentContract): ScanView[] {
  const declared: View[] = [...contract.properties, ...(isInapplicable(contract.states) ? [] : contract.states)];
  const byKey = new Map<string, ScanView>();
  const labels = new Set<string>();
  for (const view of declared.length > 0 ? declared : [{}]) {
    const merged = { ...contract.view, ...view };
    const key = JSON.stringify([merged.variant ?? '', merged.state ?? '', merged.setup ?? []]);
    if (byKey.has(key)) continue;
    const own = view.setup?.length ? ` (${view.setup.map(describeStep).join(', ')})` : '';
    const base = `${[merged.variant, merged.state].filter(Boolean).join(' / ') || 'preview'}${own}`;
    let label = base;
    for (let n = 2; labels.has(label); n++) label = `${base} #${n}`;
    labels.add(label);
    byKey.set(key, { label, view });
  }
  return [...byKey.values()];
}

/** Plain views select their tabs again under each preset. A view with a
 *  setup of its own is selected once and scanned with every preset previewed
 *  over it: a toolbar control the setup sets, such as Button's Small size,
 *  stays set and hides the tabs a second selection would click. */
function viewGroups(contract: ComponentContract): { plain: ScanView[]; setUp: ScanView[] } {
  const views = viewsOf(contract);
  return {
    plain: views.filter(({ view }) => !view.setup?.length),
    setUp: views.filter(({ view }) => view.setup?.length),
  };
}

function portalSelectors(contract: ComponentContract): string[] {
  return Object.keys(contract.parts)
    .map((key) => partLocator(contract, key))
    .filter((part) => part.portal)
    .map((part) => part.selector);
}

/** Marks the visible stage and every portaled part, so both engines scope to
 *  one selector, and the component's own tree for the snapshot. */
async function markStage(page: Page, portals: string[]): Promise<void> {
  await page.evaluate(({ stageAttr, treeAttr, portals }) => {
    for (const element of document.querySelectorAll(`[${stageAttr}], [${treeAttr}]`)) {
      element.removeAttribute(stageAttr);
      element.removeAttribute(treeAttr);
    }
    const group = [...document.querySelectorAll<HTMLElement>('.variant-group')].find((g) => g.checkVisibility());
    const stage = group?.querySelector('.preview-stage, .sketch-scope');
    if (!group || !stage) throw new Error('the visible variant group has no preview stage');
    stage.setAttribute(stageAttr, '');
    stage.scrollIntoView({ block: 'nearest' });
    group.querySelector('.sketch-scope')?.setAttribute(treeAttr, '');
    for (const selector of portals) {
      for (const element of document.querySelectorAll(selector)) {
        if (element.closest(`[${stageAttr}]`)) continue;
        element.setAttribute(stageAttr, '');
        element.setAttribute(treeAttr, '');
      }
    }
  }, { stageAttr: STAGE_ATTR, treeAttr: TREE_ATTR, portals });
}

async function readTree(page: Page): Promise<string> {
  const roots = page.locator(`[${TREE_ATTR}]`);
  const trees: string[] = [];
  for (let i = 0; i < await roots.count(); i++) trees.push(await roots.nth(i).ariaSnapshot());
  return trees.filter(Boolean).join('\n');
}

function serializeTrees(trees: Map<string, string>): string {
  return [...trees].map(([label, tree]) => tree
    ? `${JSON.stringify(label)}: |\n${tree.split('\n').map((line) => `  ${line}`).join('\n')}\n`
    : `${JSON.stringify(label)}: ""\n`).join('');
}

function parseTrees(text: string): Map<string, string> {
  const trees = new Map<string, string>();
  let label: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    if (label !== null) trees.set(label, lines.join('\n'));
  };
  for (const line of text.split('\n')) {
    const key = /^(".*"): (?:\||"")$/.exec(line);
    if (key) {
      flush();
      label = JSON.parse(key[1]) as string;
      lines = [];
    } else if (line.startsWith('  ')) {
      lines.push(line.slice(2));
    }
  }
  flush();
  return trees;
}

function lineChanges(before: string, after: string): { removed: string[]; added: string[] } {
  const added = after.split('\n');
  const removed: string[] = [];
  for (const line of before.split('\n')) {
    const index = added.indexOf(line);
    if (index >= 0) added.splice(index, 1);
    else removed.push(line);
  }
  return { removed, added };
}

function describeChange(before: string | undefined, after: string | undefined): string {
  if (before === undefined) return 'The view has no recorded accessibility tree';
  if (after === undefined) return 'The recorded accessibility tree names a view the contract no longer declares';
  const { removed, added } = lineChanges(before, after);
  const quote = (lines: string[]) => lines.length === 0 ? 'nothing' : lines.slice(0, 2).map((line) => `\`${line.trim()}\``).join(', ')
    + (lines.length > 2 ? ` and ${lines.length - 2} more` : '');
  return `The accessibility tree differs from the recorded one: recorded ${quote(removed)}, now ${quote(added)}`;
}

function listViews(views: string[]): string {
  return [...views.slice(0, VIEW_LIMIT), ...(views.length > VIEW_LIMIT ? [`and ${views.length - VIEW_LIMIT} more`] : [])]
    .join('; ');
}

/** Decision 12: each view's tree beside the one recorded for it, one result
 *  per distinct change. A missing file, or `--update-aria`, records the trees
 *  instead. */
function compareTrees(id: string, trees: Map<string, string>): A11yResult[] {
  const file = path.join(ARIA_DIR, `${id}.yml`);
  if (process.env[UPDATE_ARIA_ENV] === '1' || !fs.existsSync(file)) {
    if (ARIA_WRITABLE) {
      fs.mkdirSync(ARIA_DIR, { recursive: true });
      fs.writeFileSync(file, serializeTrees(trees));
    }
    return [];
  }
  const recorded = parseTrees(fs.readFileSync(file, 'utf8'));
  const changes = new Map<string, { diff: string; views: string[] }>();
  for (const label of new Set([...recorded.keys(), ...trees.keys()])) {
    const before = recorded.get(label);
    const after = trees.get(label);
    if (before === after) continue;
    const help = describeChange(before, after);
    const { removed, added } = lineChanges(before ?? '', after ?? '');
    let change = changes.get(help);
    if (!change) {
      const diff = [...removed.map((line) => `-${line}`), ...added.map((line) => `+${line}`)].join('\n');
      changes.set(help, (change = { diff, views: [] }));
    }
    change.views.push(label);
  }
  return [...changes].map(([help, { diff, views }]) => ({
    rule: 'a11y-component',
    engineRule: 'aria-snapshot',
    impact: null,
    target: `__aria__/${id}.yml`,
    html: diff.slice(0, DIFF_LIMIT),
    help: `${help}. Rerun with --update-aria once the change is deliberate`,
    helpUrl: ARIA_HELP_URL,
    view: listViews(views),
  }));
}

/** One result per element and engine rule, naming every view it failed in. */
class Occurrences {
  private readonly entries = new Map<string, { result: A11yResult; views: string[] }>();

  add(view: string, results: A11yResult[]): void {
    for (const result of results) {
      const key = [result.rule, result.engineRule, result.target].join('\n');
      let entry = this.entries.get(key);
      if (!entry) this.entries.set(key, (entry = { result, views: [] }));
      if (!entry.views.includes(view)) entry.views.push(view);
    }
  }

  results(): A11yResult[] {
    return [...this.entries.values()].map(({ result, views }) => ({ ...result, view: listViews(views) }));
  }
}

for (const contract of await selectedContracts()) {
  test(`${contract.id} records its accessibility findings in every variant and state`, async ({ page }) => {
    test.setTimeout(10 * 60_000);
    const missing = await missingEngine(['axe', 'alfa']);
    if (missing) {
      test.info().annotations.push({ type: 'inapplicable', description: missing });
      return;
    }

    const harness = await ContractHarness.open(page, contract);
    await page.addStyleTag({ content: STAGE_CSS });
    const { plain, setUp } = viewGroups(contract);
    const portals = portalSelectors(contract);
    const presets = process.env[A11Y_THEMES_ENV] === 'all' ? PRESETS : [];
    const found = new Occurrences();
    const trees = new Map<string, string>();

    const scan = async ({ label, view }: ScanView) => {
      await harness.selectView(view);
      await markStage(page, portals);
      found.add(label, await scanAxe(page, SCOPE, EXCLUDE, 'a11y-component'));
      found.add(label, await scanFocusVisible(page, SCOPE, EXCLUDE));
      trees.set(label, await readTree(page));
    };
    const scanContrast = async (label: string, theme: string) => {
      await markStage(page, portals);
      found.add(`${label} under ${theme}`, await scanAxe(page, SCOPE, EXCLUDE, 'a11y-component', PRESET_RULES));
    };

    for (const scanView of plain) await scan(scanView);
    for (const theme of presets) {
      await harness.previewThemeUncovered(theme);
      for (const { label, view } of plain) {
        await harness.selectView(view);
        await scanContrast(label, theme);
      }
      await harness.cancelUncoveredPreview();
    }
    for (const scanView of setUp) {
      await scan(scanView);
      for (const theme of presets) {
        await harness.previewThemeUncovered(theme);
        await scanContrast(scanView.label, theme);
        await harness.cancelUncoveredPreview();
      }
    }

    recordA11y([...found.results(), ...compareTrees(contract.id, trees)]);
  });
}
