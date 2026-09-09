import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import {
  ContractViolation,
  isInapplicable,
  partLocator,
  requiresInteraction,
  type ComponentContract,
  type ContractRule,
  type ControlStep,
  type InteractionAction,
  type InteractionCase,
  type PaintMap,
  type PersistenceCase,
  type SketchExpectation,
  type ThemeExpectation,
  type View,
} from '../componentContract';
import { openComponentsEditor } from './editor';

const STAGE = '.variant-group:visible .sketch-scope';

/**
 * Two frames for Svelte to flush and the browser to lay out, then every
 * in-flight transition jumped to its end. A colour read mid-interpolation is
 * neither the value the state left nor the one it is going to.
 */
const settle = (page: Page) => page.evaluate(async () => {
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  for (const animation of document.getAnimations()) {
    // An editor spinner runs forever and has no end to jump to.
    try { animation.finish(); } catch { /* infinite effect */ }
  }
});

/** Contracts declare; this acts and observes, so mapping a new component stays
 *  a declaration. */
export class ContractHarness {
  private constructor(
    readonly page: Page,
    readonly contract: ComponentContract,
  ) {}

  /** The editor page, with no component selected. The listing obligation runs
   *  from here: an unregistered component has no preview to wait for. */
  static async attach(page: Page, contract: ComponentContract): Promise<ContractHarness> {
    await openComponentsEditor(page);
    return new ContractHarness(page, contract);
  }

  static async open(page: Page, contract: ComponentContract): Promise<ContractHarness> {
    const harness = await ContractHarness.attach(page, contract);
    await harness.selectComponent();
    return harness;
  }

  private fail(rule: ContractRule, message: string): never {
    throw new ContractViolation(rule, this.contract.id, message);
  }

  async selectComponent(): Promise<void> {
    await this.page.evaluate((id) => {
      const editor = window.__liveTokensEditor;
      if (!editor) throw new Error('window.__liveTokensEditor is not present on the components route');
      editor.selectComponent(id);
    }, this.contract.id);
    await this.page.locator('.variant-group').filter({ visible: true }).first().waitFor();
    await settle(this.page);
    await this.selectView(this.contract.view ?? {});
  }

  /** Open the variant group and state tab an obligation is declared against,
   *  then run whatever has to happen before its parts exist. */
  async selectView(view: View): Promise<void> {
    const merged = { ...this.contract.view, ...view };
    if (merged.variant) {
      const tab = this.page.locator('.variant-tab-btn', { hasText: merged.variant }).first();
      if (await tab.count() === 0) {
        this.fail('contract-render', `no variant tab labelled "${merged.variant}"`);
      }
      await tab.click({ force: true });
      await settle(this.page);
    }
    if (merged.state) {
      const tab = this.page
        .locator('.variant-group:visible .tabs-states-block .state-tab-btn', { hasText: merged.state })
        .first();
      if (await tab.count() === 0) {
        this.fail('contract-preview', `no state tab labelled "${merged.state}"`);
      }
      await tab.click({ force: true });
      await settle(this.page);
    }
    for (const step of merged.setup ?? []) {
      if (step.kind === 'control') await this.driveSetupControl(step);
      else await this.performAction(step);
      await settle(this.page);
    }
  }

  private async driveSetupControl(step: ControlStep): Promise<void> {
    const control = this.page.locator('.variant-group:visible').locator(step.selector).first();
    if (await control.count() === 0) {
      this.fail('contract-render', `no control matches "${step.selector}"`);
    }
    if (step.check !== undefined) await control.setChecked(step.check);
    else if (step.value !== undefined) await control.selectOption(step.value);
    else await control.click({ force: true });
  }

  locator(key: string): Locator {
    const locatorSpec = partLocator(this.contract, key);
    return locatorSpec.portal
      ? this.page.locator(locatorSpec.selector).first()
      : this.page.locator(STAGE).first().locator(locatorSpec.selector).first();
  }

  async requirePart(key: string, rule: ContractRule): Promise<Locator> {
    const element = this.locator(key);
    if (await element.count() === 0) {
      this.fail(rule, `part "${key}" (${partLocator(this.contract, key).selector}) is not in the preview`);
    }
    return element;
  }

  /** Computed values for one part: CSS properties and custom properties alike. */
  async read(key: string, properties: string[], rule: ContractRule = 'contract-render'): Promise<Record<string, string>> {
    const pseudo = partLocator(this.contract, key).pseudo ?? null;
    const element = await this.requirePart(key, rule);
    return element.evaluate((node, { names, on }) => {
      const style = getComputedStyle(node, on ?? undefined);
      return Object.fromEntries(names.map((name) => [
        name,
        (name.startsWith('--')
          ? style.getPropertyValue(name)
          : (style as unknown as Record<string, string>)[name] ?? '').trim(),
      ]));
    }, { names: properties, on: pseudo });
  }

  /**
   * A raw token value as the browser computes it for one CSS property, measured
   * beside the part so inherited font size and colour resolve the same way. A
   * token holding `#fff` and a computed `rgb(255, 255, 255)` are the same paint,
   * and only the browser can say so.
   */
  async normalize(key: string, css: string, rawValue: string): Promise<string> {
    return this.locator(key).evaluate((node, { property, raw }) => {
      const probe = document.createElement('div');
      probe.style.display = 'none';
      // A border width computes to 0 while the border style is `none`, so the
      // probe would answer 0px for every stroke thickness.
      probe.style.borderStyle = 'solid';
      probe.style.outlineStyle = 'solid';
      (node.parentElement ?? document.body).appendChild(probe);
      probe.style.setProperty(property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), raw);
      const computed = (getComputedStyle(probe) as unknown as Record<string, string>)[property];
      probe.remove();
      return (computed ?? '').trim();
    }, { property: css, raw: rawValue });
  }

  // ── 1. Listed ────────────────────────────────────────────────────────────

  async assertListed(): Promise<void> {
    const entry = await this.page.evaluate((id) => {
      const found = window.__liveTokensEditor?.getComponentRegistryEntries().find((e) => e.id === id);
      return found ? { id: found.id, origin: found.origin, label: found.label } : null;
    }, this.contract.id);
    if (!entry) this.fail('contract-listed', 'no registry entry');
    if (entry.origin !== this.contract.origin) {
      this.fail('contract-listed', `registry origin is "${entry.origin}", contract declares "${this.contract.origin}"`);
    }

    const placement = await this.page.evaluate((label) => {
      const children = [...document.querySelectorAll('.nav-items > *')];
      const divider = children.findIndex((el) => el.classList.contains('nav-divider'));
      const item = children.findIndex((el) =>
        el.classList.contains('nav-item') && el.textContent?.trim() === label);
      return { item, divider };
    }, entry.label);
    if (placement.item < 0) this.fail('contract-listed', `"${entry.label}" is not in the component rail`);
    const group = placement.divider >= 0 && placement.item > placement.divider ? 'custom' : 'system';
    if (group !== this.contract.origin) {
      this.fail('contract-listed', `rail lists "${entry.label}" under ${group}, contract declares ${this.contract.origin}`);
    }
  }

  // ── 2. Property projection ───────────────────────────────────────────────

  /**
   * Drive one design token to a probe value and require the declared part's
   * declared CSS property to adopt it. A repaint anywhere else in the preview
   * cannot satisfy this.
   */
  async assertPaintsFromToken(key: string, css: string, variable: string, rule: ContractRule): Promise<void> {
    await this.requirePart(key, rule);
    const probe = probeValueFor(css)
      ?? this.fail(rule, `no probe value for CSS property "${css}"; declare one in probeValueFor`);
    const expected = await this.normalize(key, css, probe);
    const before = (await this.read(key, [css]))[css];
    const restore = await this.page.evaluate(({ name, value }) => {
      const root = document.documentElement;
      const prior = { value: root.style.getPropertyValue(name), priority: root.style.getPropertyPriority(name) };
      root.style.setProperty(name, value, 'important');
      return prior;
    }, { name: variable, value: probe });
    await settle(this.page);
    const after = (await this.read(key, [css]))[css];
    await this.page.evaluate(({ name, prior }) => {
      const root = document.documentElement;
      if (prior.value) root.style.setProperty(name, prior.value, prior.priority);
      else root.style.removeProperty(name);
    }, { name: variable, prior: restore });
    await settle(this.page);
    if (after !== expected) {
      this.fail(rule, `${variable} set to ${probe} left ${key}.${css} at ${after} (was ${before}), expected ${expected}`);
    }
  }

  async assertProperties(): Promise<number> {
    let asserted = 0;
    for (const expectation of this.contract.properties) {
      await this.selectView(expectation);
      for (const [key, map] of Object.entries(expectation.paints)) {
        for (const [css, variable] of Object.entries(map)) {
          await this.assertPaintsFromToken(key, css, variable, 'contract-render');
          asserted++;
        }
      }
    }
    return asserted;
  }

  // ── 3. Alias resolution ──────────────────────────────────────────────────

  /** Every alias the component ships. The alias contract proves each one fans
   *  out to the root; this proves each one resolves to a value once it is
   *  there, which a fan-out cannot see. */
  shippedAliases(): string[] {
    const file = path.resolve(
      process.env.LIVE_TOKENS_DATA_DIR ?? 'src/live-tokens/data',
      'component-configs',
      this.contract.id,
      'default.json',
    );
    if (!fs.existsSync(file)) {
      this.fail('contract-alias', `no shipped config at ${file}`);
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { aliases?: Record<string, unknown> };
    return Object.keys(data.aliases ?? {}).sort();
  }

  async assertAliasesResolve(): Promise<void> {
    const aliases = this.shippedAliases();
    if (aliases.length === 0) this.fail('contract-alias', 'the shipped config declares no aliases');
    const unresolved = await this.page.evaluate((names) => {
      const style = getComputedStyle(document.documentElement);
      return names.filter((name) => style.getPropertyValue(name).trim() === '');
    }, aliases);
    if (unresolved.length > 0) {
      this.fail('contract-alias', `aliases resolve to nothing at the root: ${unresolved.join(', ')}`);
    }
  }

  /**
   * What the contract leaves out. Every shipped alias has to reach a paint map
   * or carry a reason it cannot, every declared part has to resolve, and every
   * state tab the editor renders has to be declared. Without this a contract
   * naming three tokens passes as completely as one naming all eighty.
   */
  async assertInventory(): Promise<void> {
    await this.selectView({});
    for (const key of Object.keys(this.contract.parts)) {
      await this.requirePart(key, 'contract-render');
    }

    const declared = new Set<string>(Object.keys(this.contract.uncovered ?? {}));
    const collect = (map: PaintMap) => {
      for (const properties of Object.values(map)) {
        for (const variable of Object.values(properties)) declared.add(variable);
      }
    };
    for (const expectation of this.contract.properties) collect(expectation.paints);
    if (!isInapplicable(this.contract.states)) {
      for (const state of this.contract.states) if (state.paints) collect(state.paints);
    }
    const missing = this.shippedAliases().filter((alias) => !declared.has(alias));
    if (missing.length > 0) {
      this.fail('contract-render', `${missing.length} shipped aliases reach no paint map and carry no reason:\n${missing.join('\n')}`);
    }

    const tabs = await this.page
      .locator('.variant-group:visible .tabs-states-block .tabs-selectors:first-of-type .state-tab-btn')
      .allTextContents();
    if (isInapplicable(this.contract.states)) return;
    const named = new Set(this.contract.states.map((state) => state.state));
    const unnamed = tabs.map((tab) => tab.trim()).filter((tab) => tab && !named.has(tab));
    if (unnamed.length > 0) {
      this.fail('contract-preview', `the editor renders state tabs the contract does not name: ${unnamed.join(', ')}`);
    }
  }

  // ── 4. States, preview and interaction ───────────────────────────────────

  /** Computed-value equality between a part's CSS property and its token. */
  async assertPaintMap(map: PaintMap, rule: ContractRule): Promise<void> {
    for (const [key, properties] of Object.entries(map)) {
      const cssNames = Object.keys(properties);
      const observed = await this.read(key, [...cssNames, ...Object.values(properties)]);
      for (const [css, variable] of Object.entries(properties)) {
        const token = observed[variable];
        if (!token) this.fail(rule, `${variable} resolves to nothing on part "${key}"`);
        const expected = await this.normalize(key, css, token);
        if (observed[css] !== expected) {
          this.fail(rule, `${key}.${css} is ${observed[css]}, ${variable} resolves to ${expected}`);
        }
      }
    }
  }

  async assertStates(): Promise<void> {
    const declared = this.contract.states;
    if (isInapplicable(declared)) {
      const tabs = await this.page.locator('.variant-group:visible .tabs-states-block .state-tab-btn').count();
      if (tabs > 0) {
        this.fail('contract-preview', `the editor renders ${tabs} state tabs but the contract marks states inapplicable: ${declared.reason}`);
      }
      return;
    }
    for (const state of declared) {
      await this.selectView(state);
      const classes = await this.locator(this.contract.root).evaluate((node) => [...node.classList]);
      if (state.forceClass && !classes.includes(state.forceClass)) {
        this.fail('contract-preview', `state "${state.state}" does not put "${state.forceClass}" on the preview`);
      }
      for (const [key, attributes] of Object.entries(state.attributes ?? {})) {
        const observed = await this.locator(key).evaluate((node, names) =>
          Object.fromEntries(names.map((name) => [name, node.getAttribute(name)])), Object.keys(attributes));
        for (const [name, value] of Object.entries(attributes)) {
          if (observed[name] !== value) {
            this.fail('contract-preview', `state "${state.state}" has ${key}[${name}]="${observed[name]}", expected "${value}"`);
          }
        }
      }
      if (state.paints) await this.assertPaintMap(state.paints, 'contract-preview');
    }
  }

  private async roleOf(key: string): Promise<string | null> {
    return this.locator(key).evaluate((node) => {
      const explicit = node.getAttribute('role');
      if (explicit) return explicit;
      const tag = node.tagName.toLowerCase();
      if (tag === 'button') return 'button';
      if (tag === 'a') return 'link';
      if (tag === 'input') {
        const type = (node as HTMLInputElement).type;
        return type === 'range' ? 'slider' : type === 'checkbox' ? 'checkbox' : 'textbox';
      }
      return null;
    });
  }

  async assertInteraction(): Promise<void> {
    const declared = this.contract.interaction;
    if (isInapplicable(declared)) {
      for (const key of Object.keys(this.contract.parts)) {
        const role = await this.roleOf(key);
        if (requiresInteraction(role)) {
          this.fail('contract-preview', `part "${key}" carries role "${role}" but the contract marks interaction inapplicable: ${declared.reason}`);
        }
      }
      return;
    }
    const role = await this.roleOf(declared.part);
    if (role !== declared.role) {
      this.fail('contract-preview', `part "${declared.part}" carries role "${role}", contract declares "${declared.role}"`);
    }
    if (declared.cases.length === 0) {
      this.fail('contract-preview', `role "${declared.role}" is interactive and declares no action`);
    }
    for (const testCase of declared.cases) await this.runInteraction(testCase);
  }

  private async valueOf(key: string): Promise<string> {
    return this.locator(key).evaluate((node) =>
      (node as HTMLInputElement).value ?? node.getAttribute('aria-valuenow') ?? '');
  }

  private async performAction(action: InteractionAction): Promise<void> {
    if (action.kind === 'press') {
      // A disabled control refuses focus, which is part of what the disabled
      // case asserts. The outcome check decides whether that is right.
      await this.locator(action.part).focus().catch(() => undefined);
      await this.page.keyboard.press(action.key);
      return;
    }
    if (action.kind === 'click') {
      await this.locator(action.part).click({ force: true });
      return;
    }
    if (action.kind === 'type') {
      await this.locator(action.part).click({ force: true }).catch(() => undefined);
      await this.page.keyboard.type(action.text);
      return;
    }
    const from = await this.locator(action.part).boundingBox();
    const along = await this.locator(action.along).boundingBox();
    if (!from || !along) this.fail('contract-preview', `"${action.part}" or "${action.along}" has no box to drag along`);
    await this.page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(along.x + along.width * action.fraction, along.y + along.height / 2, { steps: 8 });
    await this.page.mouse.up();
  }

  private async isFocused(key: string): Promise<boolean> {
    return this.locator(key).evaluate((node) => document.activeElement === node);
  }

  private async runInteraction(testCase: InteractionCase): Promise<void> {
    await this.selectView(testCase);
    const outcome = testCase.expect;
    const tracksValue = outcome.kind === 'valueMoves'
      || outcome.kind === 'valueBecomes'
      || outcome.kind === 'valueChanges'
      || outcome.kind === 'valueHolds';
    const before = tracksValue ? await this.valueOf(outcome.part) : '';

    await this.performAction(testCase.action);
    await settle(this.page);

    if (outcome.kind === 'attribute') {
      const actual = await this.locator(outcome.part)
        .evaluate((node, name) => node.getAttribute(name), outcome.name);
      if (actual !== outcome.value) {
        this.fail('contract-preview', `${testCase.name}: ${outcome.part}[${outcome.name}] is "${actual}", expected "${outcome.value}"`);
      }
      return;
    }
    if (outcome.kind === 'focused') {
      const focused = await this.isFocused(outcome.part);
      if (focused !== outcome.value) {
        this.fail('contract-preview', `${testCase.name}: ${outcome.part} is ${focused ? '' : 'not '}focused, expected ${outcome.value ? '' : 'not '}focused`);
      }
      return;
    }

    const after = await this.valueOf(outcome.part);
    if (outcome.kind === 'valueHolds') {
      if (after !== before) {
        this.fail('contract-preview', `${testCase.name}: value moved from ${before} to ${after}`);
      }
      return;
    }
    if (outcome.kind === 'valueChanges') {
      if (after === before) {
        this.fail('contract-preview', `${testCase.name}: value held at ${before}`);
      }
      return;
    }
    if (outcome.kind === 'valueBecomes') {
      if (after !== outcome.value) {
        this.fail('contract-preview', `${testCase.name}: value is ${after}, expected ${outcome.value}`);
      }
      return;
    }
    const moved = Number(after) - Number(before);
    const wanted = outcome.direction === 'up' ? moved > 0 : moved < 0;
    if (!wanted) {
      this.fail('contract-preview', `${testCase.name}: value went ${before} -> ${after}, expected to move ${outcome.direction}`);
    }
  }

  // ── 5. Persistence and reset ─────────────────────────────────────────────

  /** Every alias and config value the component holds, for restoring the buffer. */
  async captureSlice(): Promise<unknown> {
    return this.page.evaluate((id) => {
      let slice: unknown;
      const stop = window.__liveTokensEditor!.editorState.subscribe((state) => {
        slice = structuredClone(state.components[id] ?? { aliases: {}, config: {} });
      });
      stop();
      return slice;
    }, this.contract.id);
  }

  async restoreSlice(slice: unknown): Promise<void> {
    await this.page.evaluate(({ id, value }) => {
      window.__liveTokensEditor!.mutate('contract: restore component slice', (state) => {
        (state.components as Record<string, unknown>)[id] = structuredClone(value);
      });
    }, { id: this.contract.id, value: slice });
    await settle(this.page);
  }

  async rootValue(variable: string): Promise<string> {
    return this.page.evaluate((name) =>
      document.documentElement.style.getPropertyValue(name).trim(), variable);
  }

  /** Drive one control the way a designer does, and return the value it wrote. */
  async driveControl(testCase: PersistenceCase): Promise<string> {
    await this.selectView(testCase);
    const group = this.page.locator('.variant-group:visible');
    if (testCase.shape === 'config' || testCase.shape === 'literal') {
      const control = group.locator(testCase.control!).first();
      if (await control.count() === 0) {
        this.fail('contract-persist', `no control matches "${testCase.control}"`);
      }
      const tag = await control.evaluate((element) => element.tagName.toLowerCase());
      if (tag === 'select') {
        const options = await control.locator('option').evaluateAll((elements) =>
          elements.map((element) => (element as HTMLOptionElement).value));
        const current = await control.inputValue();
        const next = options.find((option) => option !== current);
        if (!next) this.fail('contract-persist', `"${testCase.control}" offers no second option`);
        await control.selectOption(next);
      } else {
        await control.click({ force: true });
      }
      await settle(this.page);
      return testCase.shape === 'config'
        ? this.configValue(testCase.configKey!)
        : this.rootValue(testCase.variable!);
    }

    const variable = testCase.variable!;
    const selector = group
      .locator(`.ui-token-selector:visible[data-token-variable="${variable}"]:not(.disabled):not(.locked)`)
      .first();
    if (testCase.shape === 'gradient') {
      const editor = group.locator(`.gradient-editor:visible[data-token-variable="${variable}"]`).first();
      if (await editor.count() === 0) {
        this.fail('contract-persist', `no gradient editor for ${variable}`);
      }
      const solid = editor.getByRole('radio', { name: 'Solid' });
      if (await solid.count() && !await solid.isChecked()) await solid.check({ force: true });
      const picker = editor.locator('.picker-slot .ui-token-selector').first();
      await picker.locator('.ui-ts-trigger').click({ force: true });
      const swatch = picker.locator('.static-chip:not(.active):not(:disabled)').first();
      if (await swatch.count() === 0) this.fail('contract-persist', `gradient picker for ${variable} offers no stop colour`);
      await swatch.click({ force: true });
      await settle(this.page);
      return this.rootValue(variable);
    }

    if (await selector.count() === 0) {
      this.fail('contract-persist', `no editor control for ${variable}`);
    }
    if (testCase.shape === 'opacity') {
      await selector.locator('.ui-ts-trigger').click();
      const opacity = this.page.locator('.ui-ts-dropdown .opacity-input').first();
      if (await opacity.count() === 0) this.fail('contract-persist', `${variable} has no opacity control`);
      await opacity.fill('37');
      await opacity.blur();
      await settle(this.page);
      await this.page.keyboard.press('Escape');
      await settle(this.page);
      return this.rootValue(variable);
    }

    const before = await this.rootValue(variable);
    await selector.locator('.ui-ts-trigger').click();
    const option = this.page.locator(
      '.ui-ts-dropdown .static-chip:not(.active):not(:disabled), '
      + '.ui-ts-dropdown .ui-option-item:not(.active):not(:disabled), '
      + '.ui-ts-dropdown .font-size-row:not(.active):not(:disabled)',
    ).first();
    if (await option.count() === 0) this.fail('contract-persist', `${variable}'s control offers no other value`);
    await option.click();
    await settle(this.page);
    const after = await this.rootValue(variable);
    if (after === before) this.fail('contract-persist', `${variable}'s control did not write a new value`);
    return after;
  }

  async configValue(key: string): Promise<string> {
    const value = await this.page.evaluate(({ id, configKey }) => {
      let held: unknown;
      const stop = window.__liveTokensEditor!.editorState.subscribe((state) => {
        held = (state.components[id]?.config ?? {})[configKey];
      });
      stop();
      return held === undefined ? null : JSON.stringify(held);
    }, { id: this.contract.id, configKey: key });
    // An absent key would otherwise read the same before and after the edit,
    // and the readback below would compare one sentinel against another.
    if (value === null) this.fail('contract-persist', `nothing holds config key "${key}"`);
    return value;
  }

  /** File > Save, waiting for the working buffer to reach disk. */
  async save(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((response) =>
        response.url().includes(`/component-configs/${this.contract.id}/working`)
        && response.request().method() === 'PUT'
        && response.ok()),
      (async () => {
        await this.page.locator('.file-menu button').first().click();
        await this.page.locator('.file-menu-item', { hasText: 'Save' }).first().click();
      })(),
    ]);
    await settle(this.page);
  }

  async reset(): Promise<void> {
    const button = this.page.locator('.cfm-bar button', { hasText: 'Reset' }).first();
    if (await button.isDisabled()) this.fail('contract-persist', 'Reset is disabled while the component is dirty');
    await Promise.all([
      this.page.waitForResponse((response) =>
        response.url().includes(`/component-configs/${this.contract.id}/active`) && response.ok()),
      button.click(),
    ]);
    await settle(this.page);
  }

  /** Wait for a root variable to leave a value a repaint is about to replace. */
  private async awaitRootChange(variable: string, from: string): Promise<void> {
    await this.page.waitForFunction(({ name, previous }) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() !== previous,
    { name: variable, previous: from }, { timeout: 10_000 }).catch(() => undefined);
    await settle(this.page);
  }

  /** Re-open the route so the assertion reads the config off the server. */
  async reopen(): Promise<void> {
    await openComponentsEditor(this.page);
    await this.selectComponent();
  }

  /**
   * Every declared value shape, driven through its control, saved, and read
   * back after a reload; then Reset against the value the server holds.
   *
   * Reset restores the config the server holds, which is the working buffer
   * once one exists and the open theme's copy until then. The sequence saves
   * first, so the value the component booted with and the value the server
   * holds are different by the time Reset runs and a Reset landing on the
   * wrong one is visible.
   */
  async assertPersistence(): Promise<void> {
    const original = await this.captureSlice();
    try {
      const first = this.contract.persistence.cases[0];
      if (!first) this.fail('contract-persist', 'no persistence case is declared');
      const shipped = await this.rootValue(this.contract.persistence.resetVariable);

      for (const testCase of this.contract.persistence.cases) {
        await this.selectView(testCase);
        const { part, css } = testCase.observe;
        const before = (await this.read(part, [css]))[css];
        const written = await this.driveControl(testCase);
        const edited = (await this.read(part, [css]))[css];
        if (edited === before) {
          this.fail('contract-persist', `the ${testCase.shape} edit left ${part}.${css} at ${before}`);
        }
        await this.save();
        await this.reopen();
        await this.selectView(testCase);
        const stored = testCase.shape === 'config'
          ? await this.configValue(testCase.configKey!)
          : await this.rootValue(testCase.variable!);
        if (stored !== written) {
          this.fail('contract-persist', `the ${testCase.shape} edit read back as ${stored} after a reload, was ${written}`);
        }
        const reloaded = (await this.read(part, [css]))[css];
        if (reloaded !== edited) {
          this.fail('contract-persist', `the reloaded preview paints ${part}.${css} as ${reloaded}, was ${edited}`);
        }
      }

      const saved = await this.rootValue(this.contract.persistence.resetVariable);
      if (saved === shipped) {
        this.fail('contract-persist', `${this.contract.persistence.resetVariable} still holds its shipped value ${shipped}; Reset cannot tell the two baselines apart`);
      }
      // `first.setup` is about to replay a third time. A `ControlStep` is
      // idempotent (`setChecked` doesn't care what came before), but an
      // `InteractionAction` click that toggles something (a modal open/closed,
      // for instance) is not: replaying it against whatever state the loop
      // above happened to leave the page in can land on the wrong side of the
      // toggle. A fresh load puts every component back in the one state
      // `setup` was written against before it replays. `saved`, read above
      // from the server-backed root value, isn't invalidated by the reload.
      await this.reopen();
      await this.driveControl({
        variant: first.variant,
        state: first.state,
        setup: first.setup,
        shape: 'token',
        variable: this.contract.persistence.resetVariable,
        observe: first.observe,
      });
      const dirty = await this.rootValue(this.contract.persistence.resetVariable);
      if (dirty === saved) this.fail('contract-persist', 'the unsaved edit wrote nothing to reset');
      await this.reset();
      const restored = await this.rootValue(this.contract.persistence.resetVariable);
      if (restored !== saved) {
        this.fail('contract-persist', `Reset left ${this.contract.persistence.resetVariable} at ${restored}, the server holds ${saved}`);
      }
    } finally {
      await this.restoreSlice(original);
      await this.save();
    }
  }

  // ── 6. Theme projection ──────────────────────────────────────────────────

  /** `settleOn` is a variable the theme is expected to move, so the read that
   *  follows lands after the repaint. */
  async previewTheme(slug: string, settleOn?: { variable: string; from: string }): Promise<void> {
    await this.page.locator('.theme-name-trigger').click();
    await this.page.locator('[role="dialog"][aria-label="Theme Picker"]').waitFor();
    const row = this.page.locator(`.load-item[data-file-name="theme:${slug}"] .load-name-btn`);
    if (await row.count() === 0) this.fail('contract-theme', `the Theme Picker has no theme "${slug}"`);
    await Promise.all([
      this.page.waitForResponse((response) => response.url().includes('/themes/') && response.ok()),
      row.click(),
    ]);
    await settle(this.page);
    if (settleOn) await this.awaitRootChange(settleOn.variable, settleOn.from);
  }

  async cancelThemePreview(settleOn?: { variable: string; from: string }): Promise<void> {
    const dialog = this.page.locator('[role="dialog"][aria-label="Theme Picker"]');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    await settle(this.page);
    if (settleOn) await this.awaitRootChange(settleOn.variable, settleOn.from);
  }

  async rootValues(names: string[]): Promise<Record<string, string>> {
    return this.page.evaluate((variables) => {
      const style = getComputedStyle(document.documentElement);
      return Object.fromEntries(variables.map((name) => [name, style.getPropertyValue(name).trim()]));
    }, names);
  }

  async assertThemeProjection(expectation: ThemeExpectation): Promise<void> {
    await this.selectView(expectation);
    const watched = [
      ...expectation.changed,
      ...expectation.unchanged,
      ...Object.keys(expectation.aliasedTo),
      ...Object.values(expectation.aliasedTo),
      expectation.observe.variable,
    ];
    const before = await this.rootValues(watched);
    const moved = expectation.changed[0];
    if (!moved) this.fail('contract-theme', `${expectation.theme} is declared to change nothing`);
    await this.previewTheme(expectation.theme, { variable: moved, from: before[moved] });
    const after = await this.rootValues(watched);

    for (const name of expectation.changed) {
      if (after[name] === before[name]) {
        this.fail('contract-theme', `${expectation.theme} left ${name} at ${after[name]}`);
      }
    }
    for (const name of expectation.unchanged) {
      if (after[name] !== before[name]) {
        this.fail('contract-theme', `${expectation.theme} moved ${name} from ${before[name]} to ${after[name]}`);
      }
    }
    for (const [variable, token] of Object.entries(expectation.aliasedTo)) {
      if (after[variable] !== after[token]) {
        this.fail('contract-theme', `under ${expectation.theme} ${variable} is ${after[variable]}, ${token} is ${after[token]}`);
      }
    }
    await this.assertPaintMap(
      { [expectation.observe.part]: { [expectation.observe.css]: expectation.observe.variable } },
      'contract-theme',
    );

    await this.cancelThemePreview({ variable: moved, from: after[moved] });
    const reverted = await this.rootValues(watched);
    for (const name of watched) {
      if (reverted[name] !== before[name]) {
        this.fail('contract-theme', `cancelling the ${expectation.theme} preview left ${name} at ${reverted[name]}, was ${before[name]}`);
      }
    }
  }

  // ── 7. Sketch paint ──────────────────────────────────────────────────────

  async setSketch(style: string | null): Promise<void> {
    await this.page.evaluate((id) => window.__liveTokensEditor!.setSketch(id), style);
    await settle(this.page);
  }

  /** The claim that a component is not drawn: the effect is on and none of its
   *  parts carries a layer. */
  async assertNoSketchPaint(style: string): Promise<void> {
    await this.setSketch(style);
    try {
      for (const part of Object.keys(this.contract.parts)) {
        const element = this.locator(part);
        const drawn = await element.count() === 0
          ? 'none'
          : await element.evaluate((node) => getComputedStyle(node, '::before').content);
        if (drawn !== 'none') {
          this.fail('contract-sketch', `part "${part}" is drawn under "${style}" but the contract marks Sketch inapplicable`);
        }
      }
    } finally {
      await this.setSketch(null);
    }
  }

  async assertSketchPaint(expectation: SketchExpectation): Promise<void> {
    await this.selectView(expectation);
    const watched = ['backgroundColor', 'borderTopColor', 'borderTopWidth', 'borderRadius'];
    const baseline: Record<string, Record<string, string>> = {};
    for (const { part } of expectation.parts) baseline[part] = await this.read(part, watched, 'contract-sketch');

    await this.setSketch(expectation.style);
    const scoped = await this.page.locator(STAGE).first().getAttribute('data-sketch');
    if (scoped === null) {
      this.fail('contract-sketch', `the preview stage carries no data-sketch under "${expectation.style}"`);
    }

    const fills = new Map<string, string>();
    for (const { part, fill, stroke } of expectation.parts) {
      const drawn = await (await this.requirePart(part, 'contract-sketch'))
        .evaluate((node) => getComputedStyle(node, '::before').content);
      if (drawn === 'none') this.fail('contract-sketch', `part "${part}" carries no drawn layer under "${expectation.style}"`);

      const names = ['--sketch-fill', '--sketch-stroke', ...(fill ? [fill] : []), ...(stroke ? [stroke] : [])];
      const observed = await this.read(part, names, 'contract-sketch');
      if (fill) {
        if (observed['--sketch-fill'] !== observed[fill]) {
          this.fail('contract-sketch', `part "${part}" draws its fill from ${observed['--sketch-fill']}, ${fill} is ${observed[fill]}`);
        }
        const twin = [...fills].find(([, value]) => value === observed['--sketch-fill'])?.[0];
        if (twin) {
          this.fail('contract-sketch', `parts "${twin}" and "${part}" are drawn in one colour, ${observed['--sketch-fill']}`);
        }
        fills.set(part, observed['--sketch-fill']);
      }
      if (stroke && observed['--sketch-stroke'] !== observed[stroke]) {
        this.fail('contract-sketch', `part "${part}" draws its stroke from ${observed['--sketch-stroke']}, ${stroke} is ${observed[stroke]}`);
      }
    }

    await this.setSketch(null);
    for (const { part } of expectation.parts) {
      const restored = await this.read(part, watched, 'contract-sketch');
      for (const property of watched) {
        if (restored[property] !== baseline[part][property]) {
          this.fail('contract-sketch', `leaving Sketch mode left ${part}.${property} at ${restored[property]}, was ${baseline[part][property]}`);
        }
      }
    }
  }
}

const COLOUR = /(^|[a-z])(color|fill|stroke)$/i;
// `height` also catches lineHeight, `spacing` letterSpacing.
const LENGTH = /(width|height|radius|padding|margin|gap|spacing|size|offset|inset|top|right|bottom|left)/i;

/**
 * A value the CSS property adopts verbatim, so the assertion pins the mapping
 * to one part and one property. Returns null for a property no probe covers,
 * which fails the obligation.
 */
export function probeValueFor(css: string): string | null {
  if (css === 'fontWeight') return '850';
  if (css === 'fontFamily') return 'monospace';
  if (css === 'boxShadow') return 'rgb(1, 2, 3) 7px 9px 0px 3px';
  if (css === 'textTransform') return 'uppercase';
  if (css === 'opacity') return '0.37';
  if (css === 'backgroundImage') return 'linear-gradient(90deg, rgb(1, 2, 3), rgb(4, 5, 6))';
  if (COLOUR.test(css)) return 'rgb(1, 2, 3)';
  if (LENGTH.test(css)) return '37px';
  return null;
}
