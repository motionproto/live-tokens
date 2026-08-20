import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Frame } from '@playwright/test';
import { openOverlayEditor } from './support/editor';

// Each test boots its own editor and asserts only over its own component's
// aliases, so the 25 component tests carry no shared state between them.
test.describe.configure({ mode: 'parallel' });

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
 * Exercise each standard token selector through the same click path a designer
 * uses. The rendered-property probe below deliberately writes root variables
 * directly so it can try arbitrary CSS values; this companion gate proves the
 * editor control itself reaches the store, editor root, and host root.
 */
async function exerciseVisibleTokenControls(
  frame: Frame,
  componentAliases: string[],
  exercised: Set<string>,
): Promise<void> {
  const group = frame.locator('.variant-group:visible');
  const settle = () => frame.evaluate(() => new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await settle();
  const variables = await group.locator('.ui-token-selector:visible[data-token-variable]')
    .evaluateAll((elements) => [...new Set(elements
      .map((element) => (element as HTMLElement).dataset.tokenVariable)
      .filter((value): value is string => !!value))]);

  for (const variable of variables) {
    if (!componentAliases.includes(variable) || exercised.has(variable)) continue;
    const selector = group.locator(`.ui-token-selector:visible[data-token-variable="${variable}"]`).first();
    const before = await frame.evaluate((name) => ({
      editor: document.documentElement.style.getPropertyValue(name).trim(),
      host: window.parent.document.documentElement.style.getPropertyValue(name).trim(),
    }), variable);

    const optionSelector = [
      '.ui-ts-dropdown .static-chip:not(.active):not(:disabled)',
      '.ui-ts-dropdown .ui-option-item:not(.active):not(:disabled)',
      '.ui-ts-dropdown .font-size-row:not(.active):not(:disabled)',
    ].join(', ');
    let after = before;
    let foundOption = false;
    // Some semantic options can resolve to the same CSS as the current alias.
    // Try several distinct visible choices before treating the control as dead.
    for (let attempt = 0; attempt < 4 && after.editor === before.editor; attempt++) {
      await settle();
      await selector.locator('.ui-ts-trigger').click();
      const options = selector.locator(optionSelector);
      const count = await options.count();
      if (count === 0) {
        // Close an unsupported dropdown before the traversal moves on. The
        // final coverage assertion reports its precise variable.
        await selector.locator('.ui-ts-trigger').click();
        break;
      }
      foundOption = true;
      await options.nth(attempt % count).click();
      await settle();
      after = await frame.evaluate((name) => ({
        editor: document.documentElement.style.getPropertyValue(name).trim(),
        host: window.parent.document.documentElement.style.getPropertyValue(name).trim(),
      }), variable);
    }
    if (!foundOption) continue;
    expect(after.editor, `${variable} did not write through its editor control`)
      .not.toBe(before.editor);
    expect(after.host, `${variable} did not reach the host root`)
      .not.toBe(before.host);
    expect(after.editor, `${variable} diverged between editor and host`).toBe(after.host);

    after = await frame.evaluate((name) => ({
      editor: document.documentElement.style.getPropertyValue(name).trim(),
      host: window.parent.document.documentElement.style.getPropertyValue(name).trim(),
    }), variable);
    expect(after.editor, `${variable} diverged between editor and host`).toBe(after.host);
    exercised.add(variable);
  }
}

/** Split padding exposes four side selectors and a merge action instead of a
 * selector for the fallback parent value. Merge each visible composite, then
 * exercise the newly rendered parent selector through the standard path. */
async function exerciseVisibleSplitPaddingControls(
  frame: Frame,
  componentAliases: string[],
  exercised: Set<string>,
): Promise<void> {
  const group = frame.locator('.variant-group:visible');
  const variables = await group.locator('.merge-btn:visible[data-padding-parent-variable]')
    .evaluateAll((elements) => [...new Set(elements
      .map((element) => (element as HTMLElement).dataset.paddingParentVariable)
      .filter((value): value is string => !!value))]);

  for (const variable of variables) {
    if (!componentAliases.includes(variable) || exercised.has(variable)) continue;
    const merge = group.locator(`.merge-btn:visible[data-padding-parent-variable="${variable}"]`).first();
    if (await merge.count()) await merge.click();
  }
  if (variables.length > 0) {
    await frame.evaluate(() => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await exerciseVisibleTokenControls(frame, componentAliases, exercised);
  }
}

/** A single semantic control may intentionally own several CSS variables.
 * Every listed variable must change and reach both roots before the component
 * traversal can advance. */
async function exerciseVisibleCompositeControls(
  frame: Frame,
  componentAliases: string[],
  exercised: Set<string>,
): Promise<void> {
  const group = frame.locator('.variant-group:visible');
  const controls = group.locator('[data-token-variables]:visible');
  for (let index = 0; index < await controls.count(); index++) {
    const control = controls.nth(index);
    const variables = ((await control.getAttribute('data-token-variables')) ?? '')
      .split(/\s+/)
      .filter((variable) => componentAliases.includes(variable) && !exercised.has(variable));
    if (variables.length === 0) continue;
    const before = await frame.evaluate((names) => Object.fromEntries(names.map((name) => [name, {
      editor: document.documentElement.style.getPropertyValue(name).trim(),
      host: window.parent.document.documentElement.style.getPropertyValue(name).trim(),
    }])), variables);
    const input = control.locator('input[type="checkbox"], input[type="radio"]').first();
    if (await input.count() === 0) continue;
    await input.click();
    await frame.evaluate(() => new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const after = await frame.evaluate((names) => Object.fromEntries(names.map((name) => [name, {
      editor: document.documentElement.style.getPropertyValue(name).trim(),
      host: window.parent.document.documentElement.style.getPropertyValue(name).trim(),
    }])), variables);
    for (const variable of variables) {
      expect(after[variable].editor, `${variable} did not write through its composite control`)
        .not.toBe(before[variable].editor);
      expect(after[variable].host, `${variable} did not reach the host root`)
        .not.toBe(before[variable].host);
      expect(after[variable].editor, `${variable} diverged between editor and host`)
        .toBe(after[variable].host);
      exercised.add(variable);
    }
  }
}

/** Component-owned gradients use a composite editor instead of a token
 * selector. Pick a real stop colour through its nested palette control and
 * assert the owning component variable—not the scratch stop variable—writes. */
async function exerciseVisibleGradientControls(
  frame: Frame,
  componentAliases: string[],
  exercised: Set<string>,
): Promise<void> {
  const group = frame.locator('.variant-group:visible');
  const editors = group.locator('.gradient-editor:visible[data-token-variable]');
  for (let index = 0; index < await editors.count(); index++) {
    const editor = editors.nth(index);
    const variable = await editor.getAttribute('data-token-variable');
    if (!variable || !componentAliases.includes(variable) || exercised.has(variable)) continue;
    const before = await frame.evaluate((name) =>
      document.documentElement.style.getPropertyValue(name).trim(), variable);

    // Promote an empty/flat background to Solid so its stop picker is present,
    // then select a non-active invariant colour through the real palette UI.
    const solid = editor.getByRole('radio', { name: 'Solid' });
    if (await solid.count() && !await solid.isChecked()) await solid.check({ force: true });
    const picker = editor.locator('.picker-slot .ui-token-selector').first();
    await picker.locator('.ui-ts-trigger').click({ force: true });
    const swatch = picker.locator('.static-chip:not(.active):not(:disabled)').first();
    if (await swatch.count() === 0) continue;
    await swatch.click({ force: true });

    await expect.poll(() => frame.evaluate((name) => ({
      editor: document.documentElement.style.getPropertyValue(name).trim(),
      host: window.parent.document.documentElement.style.getPropertyValue(name).trim(),
    }), variable), { message: `${variable} did not write through its gradient editor` })
      .toEqual({ editor: expect.not.stringMatching(new RegExp(`^${escapeRegExp(before)}$`)), host: expect.any(String) });
    const after = await frame.evaluate((name) => ({
      editor: document.documentElement.style.getPropertyValue(name).trim(),
      host: window.parent.document.documentElement.style.getPropertyValue(name).trim(),
    }), variable);
    expect(after.editor, `${variable} diverged between editor and host`).toBe(after.host);
    exercised.add(variable);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  provenVariables: string[] = [],
): Promise<ProbeResult> {
  return frame.evaluate(async ({ allAliases, forced, proven }) => {
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
      for (const element of group.querySelectorAll<HTMLElement>('[data-token-variables]')) {
        if (element.offsetParent === null) continue;
        for (const variable of (element.dataset.tokenVariables ?? '').split(/\s+/)) {
          if (allAliases.includes(variable)) visibleVariables.add(variable);
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

    // A property already observed repainting cannot become less reactive in a
    // later view, and it is already recorded as both seen and covered. Probing
    // it again in every remaining view is the traversal's dominant cost: a
    // component with 47 views pays for its whole alias set 47 times over.
    for (const variable of proven) visibleVariables.delete(variable);
    if (visibleVariables.size === 0) return { covered: [], unchanged: [] };
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

    const pseudoSelectorsFor = (variable: string) => {
      const pseudoSelectors = ['::before', '::after'];
      if (variable.includes('placeholder')) pseudoSelectors.push('::placeholder');
      if (variable.includes('scrollbar')) {
        pseudoSelectors.push(
          '::-webkit-scrollbar',
          '::-webkit-scrollbar-track',
          '::-webkit-scrollbar-thumb',
        );
      }
      return pseudoSelectors;
    };

    // Fixed overlays are portaled to body and are therefore outside the
    // preview subtree. Dialog roles let the harness include them without a
    // component-specific selector or fixture.
    const fingerprintNodes = () => {
      const roots = [preview, ...document.querySelectorAll<HTMLElement>('[role="dialog"]')];
      return roots.flatMap((root) => [root, ...root.querySelectorAll<HTMLElement>('*')]);
    };

    const nodeFingerprint = (element: HTMLElement, index: number, pseudoSelectors: string[]) => {
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
    };

    const fingerprint = (variable: string) => {
      const pseudoSelectors = pseudoSelectorsFor(variable);
      return fingerprintNodes().map((element, index) =>
        nodeFingerprint(element, index, pseudoSelectors));
    };

    /** Proving a repaint takes one difference, so stop at the node that moved
     *  instead of reading every remaining node's computed style. Each node
     *  costs 58 properties across the element and its pseudo-elements, and this
     *  walk runs once per candidate value per alias, so it is the probe's
     *  dominant cost. Only the negative case has to read everything. */
    const movedFrom = (variable: string, baseline: string[]) => {
      const pseudoSelectors = pseudoSelectorsFor(variable);
      const nodes = fingerprintNodes();
      if (nodes.length !== baseline.length) return true;
      for (let index = 0; index < nodes.length; index++) {
        if (nodeFingerprint(nodes[index], index, pseudoSelectors) !== baseline[index]) return true;
      }
      return false;
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
    // Fast-forward in-flight transitions so the fingerprint samples end states.
    // Reading mid-interpolation makes consecutive samples differ on their own,
    // which reports a dead property as covered. Transition shorthands stay
    // untouched so the duration and easing aliases remain observable.
    const settle = async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      for (const animation of document.getAnimations()) animation.finish();
    };

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
        if (movedFrom(variable, baseline)) {
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
  }, { allAliases: componentAliases, forced: forcedVariables, proven: provenVariables });
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

for (const [component, aliases] of aliasesByComponent) {
  test(`${component} repaints every property in its standardized runtime preview`, async ({ page }) => {
    test.setTimeout(600_000);
    const frame = await openOverlayEditor(page, 'components');
    const covered = new Set<string>();
    const seen = new Set<string>();
    const unchanged = new Set<string>();
    const controlExercised = new Set<string>();

    const probe = async (componentAliases: string[], forced: string[] = []) => {
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

      await exerciseVisibleTokenControls(frame, componentAliases, controlExercised);
      await exerciseVisibleCompositeControls(frame, componentAliases, controlExercised);
      await exerciseVisibleSplitPaddingControls(frame, componentAliases, controlExercised);
      await exerciseVisibleGradientControls(frame, componentAliases, controlExercised);
      const result = await probeCurrentView(frame, componentAliases, remaining, [...covered]);
      result.covered.forEach((variable) => covered.add(variable));
      result.covered.forEach((variable) => seen.add(variable));
      result.unchanged.forEach((variable) => {
        seen.add(variable);
        if (!covered.has(variable)) unchanged.add(variable);
      });
    };

    const traverseComponent = async (
      componentId: string,
      componentAliases: string[],
      forced: string[] = [],
    ) => {
      await selectComponent(frame, componentId);

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

            await probe(componentAliases, forced);
            const primaryTabs = frame.locator(
              '.variant-group:visible .tabs-states-block > .tabs-selectors:first-of-type .state-tab-btn',
            );
            const primaryLabels = await primaryTabs.allTextContents();
            for (let primaryIndex = 0; primaryIndex < primaryLabels.length; primaryIndex++) {
              await frame.locator(
                '.variant-group:visible .tabs-states-block > .tabs-selectors:first-of-type .state-tab-btn',
              ).nth(primaryIndex).click({ force: true });
              await probe(componentAliases, forced);

              const secondaryTabs = frame.locator(
                '.variant-group:visible .tabs-states-block > .tabs-selectors.substrip .state-tab-btn',
              );
              const secondaryLabels = await secondaryTabs.allTextContents();
              for (let secondaryIndex = 0; secondaryIndex < secondaryLabels.length; secondaryIndex++) {
                await frame.locator(
                  '.variant-group:visible .tabs-states-block > .tabs-selectors.substrip .state-tab-btn',
                ).nth(secondaryIndex).click({ force: true });
                await probe(componentAliases, forced);
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

      // A default-off hover gate only paints while the runtime element itself
      // matches :hover. Forced preview classes intentionally bypass that gate,
      // so retry unresolved properties while hovering each visible preview node.
      // This stays component-agnostic and runs only for the small unresolved set.
      // The traversal above leaves a forced state selected, and its preview
      // class outranks the gated `:hover` rule, so return to the first state.
      const firstStateTab = frame.locator(
        '.variant-group:visible .tabs-states-block > .tabs-selectors:first-of-type .state-tab-btn',
      ).first();
      if (await firstStateTab.count()) await firstStateTab.click({ force: true });
      const hoverTargets = frame.locator('.variant-group:visible .tabs-preview *:visible');
      for (let index = 0; index < await hoverTargets.count(); index++) {
        if (forced.every((variable) => covered.has(variable))) return;
        await hoverTargets.nth(index).hover({ force: true });
        await probe(componentAliases, forced);
      }
    };

    await traverseComponent(component, aliases);

    // Retry every property not yet observed repainting. Composite controls,
    // pseudo-elements, optional content, interaction modes and portaled dialogs
    // are all discovered from standard DOM semantics; there is no component
    // exception table.
    const unresolved = aliases.filter((variable) => !covered.has(variable));
    if (unresolved.length > 0) await traverseComponent(component, aliases, unresolved);

    const notExposed = aliases.filter((variable) => !seen.has(variable));
    const notReactive = aliases.filter((variable) => seen.has(variable) && !covered.has(variable));
    const notControlExercised = aliases.filter((variable) => !controlExercised.has(variable));

    expect(notExposed, `Properties not exposed by a standardized component view:\n${notExposed.join('\n')}`)
      .toEqual([]);
    expect(notReactive, `Properties whose rendered preview did not change:\n${notReactive.join('\n')}`)
      .toEqual([]);
    expect(notControlExercised, `Properties not exercised through a rendered editor control:\n${notControlExercised.join('\n')}`)
      .toEqual([]);
    expect(covered.size).toBe(aliases.length);
  });
}

test('component discovery covers every alias exactly once', () => {
  const perComponent = [...aliasesByComponent.values()].reduce((sum, a) => sum + a.length, 0);
  expect(aliasCases.length).toBeGreaterThan(0);
  expect(perComponent).toBe(aliasCases.length);
});
