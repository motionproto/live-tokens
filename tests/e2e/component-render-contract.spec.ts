import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Frame } from '@playwright/test';
import { openOverlayEditor } from './support/editor';

interface AliasCase {
  component: string;
  variable: string;
}

function discoverDefaultAliases(): AliasCase[] {
  const root = path.resolve('src/live-tokens/data/component-configs');
  const cases: AliasCase[] = [];
  for (const directory of fs.readdirSync(root).sort()) {
    const file = path.join(root, directory, 'default.json');
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      component?: string;
      aliases?: Record<string, unknown>;
    };
    const component = data.component ?? directory;
    for (const variable of Object.keys(data.aliases ?? {}).sort()) {
      cases.push({ component, variable });
    }
  }
  return cases;
}

const requestedComponent = process.env.LIVE_TOKENS_COMPONENT;
const aliasCases = discoverDefaultAliases()
  .filter(({ component }) => !requestedComponent || component === requestedComponent);
const aliasesByComponent = new Map<string, string[]>();
for (const { component, variable } of aliasCases) {
  const variables = aliasesByComponent.get(component) ?? [];
  variables.push(variable);
  aliasesByComponent.set(component, variables);
}

interface ProbeResult {
  covered: string[];
  unchanged: string[];
}

/**
 * Exercise every property control visible for the current standardized
 * VariantGroup view. The preview and property panel are deliberately siblings:
 * only `.tabs-preview` is fingerprinted, so a selector repaint cannot satisfy
 * the runtime-component contract.
 */
async function probeCurrentView(
  frame: Frame,
  componentAliases: string[],
  forcedVariables: string[] = [],
): Promise<ProbeResult> {
  return frame.evaluate(async ({ allAliases, forced }) => {
    const group = Array.from(document.querySelectorAll<HTMLElement>('.variant-group'))
      .find((element) => element.offsetParent !== null);
    const preview = group?.querySelector<HTMLElement>('.tabs-preview');
    if (!group || !preview) return { covered: [], unchanged: [] };

    const visibleVariables = new Set<string>();
    if (forced.length > 0) {
      for (const variable of forced) {
        if (allAliases.includes(variable)) visibleVariables.add(variable);
      }
    } else {
      for (const element of group.querySelectorAll<HTMLElement>('[data-token-variable]')) {
        const variable = element.dataset.tokenVariable;
        if (element.offsetParent !== null && variable && allAliases.includes(variable)) {
          visibleVariables.add(variable);
        }
      }
    }

    // Split padding's four override slots are intentionally hidden controls.
    // The standardized padding control owns them, so include their default-file
    // variables whenever their base padding row is visible.
    for (const variable of [...visibleVariables]) {
      if (!variable.endsWith('-padding')) continue;
      for (const side of ['top', 'right', 'bottom', 'left']) {
        const sideVariable = `${variable}-${side}`;
        if (allAliases.includes(sideVariable)) visibleVariables.add(sideVariable);
      }
    }
    const properties = [
      'display', 'visibility', 'opacity', 'position', 'zIndex',
      'color', 'background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition',
      'border', 'borderColor', 'borderWidth', 'borderStyle',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius',
      'borderBottomRightRadius', 'borderBottomLeftRadius',
      'outline', 'outlineColor', 'outlineWidth', 'boxShadow',
      'filter', 'backdropFilter', 'mixBlendMode',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
      'textAlign', 'textDecoration', 'textTransform', 'textShadow', 'whiteSpace',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'gap', 'rowGap', 'columnGap',
      'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
      'top', 'right', 'bottom', 'left',
      'transform', 'transformOrigin', 'translate', 'rotate', 'scale',
      'justifyContent', 'justifyItems', 'justifySelf', 'alignContent', 'alignItems', 'alignSelf',
      'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'flex', 'flexDirection',
      'overflow', 'overflowX', 'overflowY', 'clipPath', 'objectFit', 'objectPosition',
      'fill', 'stroke', 'strokeWidth', 'strokeDasharray', 'strokeDashoffset',
      'cursor', 'pointerEvents', 'content',
      'transitionProperty', 'transitionDuration', 'transitionTimingFunction', 'transitionDelay',
      'scrollbarColor', 'scrollbarWidth',
    ] as const;

    const ignoredAttribute = /^(class|style|data-|aria-)/;
    const stableAttributes = (element: Element) => Array.from(element.attributes)
      .filter((attribute) => !ignoredAttribute.test(attribute.name))
      .map((attribute) => `${attribute.name}=${attribute.value}`)
      .sort()
      .join(';');

    const fingerprint = (variable: string) => {
      const pseudoSelectors = ['::before', '::after'];
      if (variable.includes('placeholder')) pseudoSelectors.push('::placeholder');
      if (variable.includes('scrollbar')) {
        pseudoSelectors.push(
          '::-webkit-scrollbar',
          '::-webkit-scrollbar-track',
          '::-webkit-scrollbar-thumb',
        );
      }
      // Fixed overlays are portaled to body and are therefore outside the
      // preview subtree. Dialog roles let the harness include them without a
      // component-specific selector or fixture.
      const roots = [preview, ...document.querySelectorAll<HTMLElement>('[role="dialog"]')];
      const nodes = roots.flatMap((root) => [root, ...root.querySelectorAll<HTMLElement>('*')]);
      return nodes.map((element, index) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const values = properties.map((property) => style[property]).join('|');
        const pseudoValues = pseudoSelectors.map((selector) => {
          const pseudo = getComputedStyle(element, selector);
          return properties.map((property) => pseudo[property]).join('|');
        }).join('~');
        return [
          index,
          element.tagName,
          values,
          pseudoValues,
          `${rect.x},${rect.y},${rect.width},${rect.height}`,
          `${element.scrollWidth},${element.scrollHeight}`,
          stableAttributes(element),
        ].join('~');
      }).join('\n');
    };

    const alternateValues = (variable: string, current: string): string[] => {
      const values: string[] = [];
      const add = (...candidates: string[]) => {
        for (const candidate of candidates) {
          if (candidate !== current && !values.includes(candidate)) values.push(candidate);
        }
      };
      if (/(surface|color|text|border)(?!-width)|-icon$|outline-color/.test(variable)) {
        add('rgb(1, 2, 3)', 'rgb(253, 127, 3)');
      }
      if (variable.includes('font-family')) add('monospace', 'serif');
      if (variable.includes('font-weight')) add('900', '200');
      if (variable.includes('line-height')) add('2.75', '0.75');
      if (variable.includes('letter-spacing')) add('7px', '-2px');
      if (variable.includes('shadow')) add('rgb(1, 2, 3) 7px 9px 0 3px', 'none');
      if (variable.includes('blur')) add('blur(7px)', 'none');
      if (variable.includes('gradient') || variable.endsWith('-background')) {
        add('linear-gradient(90deg, rgb(1, 2, 3), rgb(253, 127, 3))', 'none');
      }
      if (variable.includes('duration') || variable.includes('transition')) add('9s', '0s');
      if (variable.includes('opacity')) add('0.17', '0.83');
      if (variable.includes('display')) add(current === 'none' ? 'block' : 'none', 'contents');
      if (variable.includes('align')) add('right', 'center', 'flex-end');
      if (variable.includes('position')) add('above-label', 'below-description', 'center');
      if (variable.includes('button-variant')) add('danger', 'outline');
      if (variable.includes('shimmer')) {
        add('linear-gradient(90deg, transparent, rgb(255 255 255 / 80%), transparent)', 'none');
      }
      if (/(padding|margin|radius|width|height|size|gap|offset|inset|thickness)/.test(variable)) {
        add('37px', '3px');
      }
      if (variable.includes('scale')) add('1.73', '0.53');
      add('__live_tokens_invalid_probe__', '37px', 'rgb(1, 2, 3)', 'none', '2');
      return values;
    };

    const root = document.documentElement;
    const covered: string[] = [];
    const unchanged: string[] = [];
    const settle = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    // Remove animation noise from the fingerprint. The contract concerns the
    // end-state projection, not interpolation frames.
    const freeze = document.createElement('style');
    freeze.dataset.reactivityProbe = 'true';
    freeze.textContent = '*,*::before,*::after{animation:none!important;caret-color:transparent!important}';
    document.head.appendChild(freeze);
    await document.fonts?.ready;
    await settle();

    for (const variable of visibleVariables) {
      // A split padding control edits its base plus all materialized sides as
      // one standardized transformation. Probe that same transformation so a
      // base fallback is not incorrectly reported dead merely because the
      // active theme already contains side overrides.
      const mutatedVariables = [variable];
      if (variable.endsWith('-padding')) {
        for (const side of ['top', 'right', 'bottom', 'left']) {
          const sideVariable = `${variable}-${side}`;
          if (allAliases.includes(sideVariable)) mutatedVariables.push(sideVariable);
        }
      }
      const previous = mutatedVariables.map((name) => ({
        name,
        value: root.style.getPropertyValue(name),
        priority: root.style.getPropertyPriority(name),
      }));
      const current = getComputedStyle(root).getPropertyValue(variable).trim();
      const baseline = fingerprint(variable);
      let changed = false;
      for (const candidate of alternateValues(variable, current)) {
        for (const name of mutatedVariables) root.style.setProperty(name, candidate, 'important');
        // CSS updates synchronously. One animation frame also gives the few
        // JavaScript-backed components (SVG/filter bridges) time to reconcile.
        await settle();
        if (fingerprint(variable) !== baseline) {
          changed = true;
          break;
        }
      }
      for (const prior of previous) {
        if (prior.value) root.style.setProperty(prior.name, prior.value, prior.priority);
        else root.style.removeProperty(prior.name);
      }
      await settle();
      (changed ? covered : unchanged).push(variable);
    }

    freeze.remove();
    return { covered, unchanged };
  }, { allAliases: componentAliases, forced: forcedVariables });
}

async function selectComponent(frame: Frame, component: string): Promise<void> {
  await frame.evaluate(async (id) => {
    const modulePath = '/src/editor/core/store/editorViewStore.ts';
    const view = await import(/* @vite-ignore */ modulePath);
    view.selectedComponent.set(id);
    await new Promise<void>((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(() => resolve())));
  }, component);
  await frame.locator('.variant-group').filter({ visible: true }).waitFor();
}

test('every component property repaints its standardized runtime preview', async ({ page }) => {
  test.setTimeout(180_000);
  const frame = await openOverlayEditor(page, 'components');
  const covered = new Set<string>();
  const seen = new Set<string>();
  const unchanged = new Set<string>();

  const probe = async (aliases: string[], forced: string[] = []) => {
    const remaining = forced.length > 0
      ? forced.filter((variable) => !covered.has(variable))
      : [];
    if (forced.length > 0 && remaining.length === 0) return;

    // Exercise standardized preview toggles (zoom, hover enablement, optional
    // content) when retrying a property that is dormant in the default mode.
    if (forced.length > 0) {
      const unchecked = frame.locator(
        '.variant-group:visible .tabs-preview input[type="checkbox"]:not(:checked):not(:disabled), '
        + '.variant-group:visible .properties-header input[type="checkbox"]:not(:checked):not(:disabled)',
      );
      for (let index = 0; index < await unchecked.count(); index++) {
        await unchecked.nth(index).click({ force: true });
      }
    }

    // Portaled dialogs sit outside `.tabs-preview`; hover their first action
    // so hover-only chrome aliases are painted too. Role-based discovery keeps
    // this independent of any component name or DOM implementation class.
    const dialogAction = frame.locator('[role="dialog"] button:not(:disabled)').first();
    if (await dialogAction.count()) await dialogAction.hover({ force: true });

    const result = await probeCurrentView(frame, aliases, remaining);
    result.covered.forEach((variable) => covered.add(variable));
    result.covered.forEach((variable) => seen.add(variable));
    result.unchanged.forEach((variable) => {
      seen.add(variable);
      if (!covered.has(variable)) unchanged.add(variable);
    });
  };

  const traverseComponent = async (component: string, aliases: string[], forced: string[] = []) => {
    await selectComponent(frame, component);

    const visitViews = async () => {
      if (forced.length > 0 && forced.every((variable) => covered.has(variable))) return;
      const sizeSelect = frame.locator('.variant-group:visible .preview-actions select').first();
      const sizeValues = await sizeSelect.count()
        ? await sizeSelect.locator('option').evaluateAll((options) =>
            options.map((option) => (option as HTMLOptionElement).value))
        : [''];

      for (const sizeValue of sizeValues) {
        const currentSizeSelect = frame.locator('.variant-group:visible .preview-actions select').first();
        if (sizeValue && await currentSizeSelect.count()) await currentSizeSelect.selectOption(sizeValue);

        const variantTabs = frame.locator('.variant-group:visible .variant-tabs .variant-tab-btn');
        const variantLabels = await variantTabs.count()
          ? await variantTabs.allTextContents()
          : [''];

        for (let variantIndex = 0; variantIndex < variantLabels.length; variantIndex++) {
          if (variantLabels[variantIndex]) {
            await frame.locator('.variant-group:visible .variant-tabs .variant-tab-btn')
              .nth(variantIndex)
              .click({ force: true });
          }

          await probe(aliases, forced);
          const primaryTabs = frame.locator(
            '.variant-group:visible .tabs-states-block > .tabs-selectors:first-of-type .state-tab-btn',
          );
          const primaryLabels = await primaryTabs.allTextContents();
          for (let primaryIndex = 0; primaryIndex < primaryLabels.length; primaryIndex++) {
            await frame.locator(
              '.variant-group:visible .tabs-states-block > .tabs-selectors:first-of-type .state-tab-btn',
            ).nth(primaryIndex).click({ force: true });
            await probe(aliases, forced);

            const secondaryTabs = frame.locator(
              '.variant-group:visible .tabs-states-block > .tabs-selectors.substrip .state-tab-btn',
            );
            const secondaryLabels = await secondaryTabs.allTextContents();
            for (let secondaryIndex = 0; secondaryIndex < secondaryLabels.length; secondaryIndex++) {
              await frame.locator(
                '.variant-group:visible .tabs-states-block > .tabs-selectors.substrip .state-tab-btn',
              ).nth(secondaryIndex).click({ force: true });
              await probe(aliases, forced);
            }
          }
        }
      }
    };

    await visitViews();
    if (forced.length === 0 || forced.every((variable) => covered.has(variable))) return;

    // Open any dialog-capable preview and repeat the same registry traversal.
    const dialogTrigger = frame.locator(
      '.variant-group:visible .tabs-preview [aria-haspopup="dialog"][aria-expanded="false"]',
    ).first();
    if (await dialogTrigger.count()) {
      await dialogTrigger.click({ force: true });
      await frame.locator('[role="dialog"]').waitFor();
      await visitViews();
    }

    // Exercise every option of standardized canvas selects. This covers modes
    // such as Input type and optional Notification actions without any
    // per-component fixture or test case.
    const canvasSelects = frame.locator('.variant-group:visible .tabs-preview .canvas-toolbar select');
    for (let selectIndex = 0; selectIndex < await canvasSelects.count(); selectIndex++) {
      const values = await canvasSelects.nth(selectIndex).locator('option').evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value));
      for (const value of values) {
        if (forced.every((variable) => covered.has(variable))) return;
        await canvasSelects.nth(selectIndex).selectOption(value);
        await visitViews();
      }
    }

    // Expanded/collapsed previews expose motion aliases whose computed style
    // is different in each direction.
    const expanders = frame.locator(
      '.variant-group:visible .tabs-preview [aria-expanded]:not([aria-haspopup="dialog"])',
    );
    for (let index = 0; index < await expanders.count(); index++) {
      if (forced.every((variable) => covered.has(variable))) return;
      await expanders.nth(index).click({ force: true });
      await visitViews();
    }
  };

  for (const [component, aliases] of aliasesByComponent) {
    await traverseComponent(component, aliases);
  }

  // Retry every property not yet observed repainting. Composite controls,
  // pseudo-elements, optional content, interaction modes and portaled dialogs
  // are all discovered from standard DOM semantics; there is no component
  // exception table.
  const firstPassUnresolved = aliasCases.filter(({ variable }) => !covered.has(variable));
  for (const [component, aliases] of aliasesByComponent) {
    const forced = firstPassUnresolved
      .filter((entry) => entry.component === component)
      .map((entry) => entry.variable);
    if (forced.length > 0) await traverseComponent(component, aliases, forced);
  }

  const allVariables = aliasCases.map(({ variable }) => variable);
  const notExposed = allVariables.filter((variable) => !seen.has(variable));
  const notReactive = allVariables.filter((variable) => seen.has(variable) && !covered.has(variable));

  expect(notExposed, `Properties not exposed by a standardized component view:\n${notExposed.join('\n')}`)
    .toEqual([]);
  expect(notReactive, `Properties whose rendered preview did not change:\n${notReactive.join('\n')}`)
    .toEqual([]);
  expect(covered.size).toBe(aliasCases.length);
});
