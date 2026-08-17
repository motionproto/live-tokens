import { expect, test } from '@playwright/test';
import { openOverlayEditor } from './support/editor';

test('the floating token sample label follows its live surface luminance', async ({ page }) => {
  await page.goto('/demo');
  const sample = page.locator('.ftt-box');
  const label = sample.locator('.ftt-box-label');

  const setSurface = (value: string) => page.evaluate(
    ({ value }) => document.documentElement.style.setProperty('--surface-brand-high', value),
    { value },
  );

  const renderedContrastToken = () => sample.evaluate(box => (box as HTMLElement).style
    .getPropertyValue('--ftt-box-contrast-color'));

  await setSurface('#ffffff');
  await expect.poll(renderedContrastToken).toBe('var(--color-black)');
  await expect(label).toHaveCSS('color', 'rgb(0, 0, 0)');

  await setSurface('#000000');
  await expect.poll(renderedContrastToken).toBe('var(--color-white)');
  await expect(label).toHaveCSS('color', 'rgb(255, 255, 255)');

  // This visual aid is intentionally isolated from the real Button component.
  expect(await page.locator('.hero-actions .button').evaluateAll(buttons => buttons.every(button =>
    !(button as HTMLElement).style.getPropertyValue('--ftt-box-contrast-color'),
  ))).toBe(true);
});

test('a primitive token edit flows through semantic and component aliases to the host', async ({ page }) => {
  const frame = await openOverlayEditor(page, 'tokens');
  const button = page.locator('.hero-actions .button.primary').first();

  const before = await page.evaluate(() => {
    const root = document.documentElement.style;
    const target = document.querySelector<HTMLElement>('.hero-actions .button.primary')!;
    return {
      primitive: root.getPropertyValue('--color-brand-500').trim(),
      semantic: root.getPropertyValue('--surface-brand-high').trim(),
      alias: root.getPropertyValue('--button-primary-surface').trim(),
      rendered: getComputedStyle(target).backgroundColor,
    };
  });

  await frame.evaluate(async () => {
    const modulePath = '/src/editor/ui/colors/paletteBaseColor.ts';
    const colors = await import(/* @vite-ignore */ modulePath);
    colors.setBaseColor('Brand', { l: 0.58, c: 0.22, h: 210 });
  });

  await expect.poll(() => button.evaluate((target) => getComputedStyle(target).backgroundColor))
    .not.toBe(before.rendered);

  const after = await frame.evaluate(() => {
    const read = (root: HTMLElement, name: string) => root.style.getPropertyValue(name).trim();
    const self = document.documentElement;
    const host = window.parent.document.documentElement;
    const names = ['--color-brand-500', '--surface-brand-high', '--button-primary-surface'];
    return {
      same: names.every((name) => read(self, name) === read(host, name)),
      primitive: read(host, '--color-brand-500'),
      semantic: read(host, '--surface-brand-high'),
      alias: read(host, '--button-primary-surface'),
    };
  });

  expect(after.same).toBe(true);
  expect(after.primitive).not.toBe(before.primitive);
  expect(after.semantic).not.toBe(before.semantic);
  expect(after.alias).toBe('var(--surface-brand-high)');
  expect(before.alias).toBe('var(--surface-brand-high)');
});

test('component controls repaint the host without save, adopt, or reload', async ({ page }) => {
  const frame = await openOverlayEditor(page, 'components');

  // Reproduce the reported path: hydrate a complete preset into an already
  // open host/editor pair, then edit the loaded component graph.
  await page.evaluate(async () => {
    const modulePath = '/src/editor/core/themes/themeService.ts';
    const themes = await import(/* @vite-ignore */ modulePath);
    await themes.applyTheme('autumn');
    await themes.applyTheme('spring-meadow');
  });
  await expect(frame.locator('.theme-name-trigger')).toContainText('Spring Meadow');

  await frame.getByRole('button', { name: 'Section Divider' }).click();
  // The demo's prominent `The Kit` divider uses the runtime default (`md`).
  // Opening this editor on Large made linked family edits look live while
  // variant-specific colour/size edits appeared broken on the page.
  await expect(frame.getByRole('tab', { name: 'Medium' }))
    .toHaveAttribute('aria-selected', 'true');

  const expected = await page.evaluate(() => {
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    probe.style.fontSize = 'var(--font-size-6xl)';
    probe.style.color = 'var(--color-black)';
    const fontSize = getComputedStyle(probe).fontSize;
    const titleColor = getComputedStyle(probe).color;
    probe.remove();
    const borderWidth = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--border-width-12'),
    );
    return { fontSize, outlineRadius: String(borderWidth / 2), titleColor };
  });

  const selectOption = async (variable: string, label: string) => {
    const selector = frame.locator(`[data-token-variable="${variable}"]`);
    await selector.locator('.ui-ts-trigger').click();
    await selector.locator('button', { hasText: label }).last().click();
  };

  await page.evaluate(() => ((window as any).__playwrightLiveMarker = 'still-here'));
  const beforeSvg = await page.locator('.section-divider.variant-md').first().evaluate((divider) => {
    const svg = divider.querySelector<SVGSVGElement>('svg.divider-label')!;
    const text = svg.querySelector<SVGTextElement>('text')!;
    return {
      height: svg.getBoundingClientRect().height,
      textBoxHeight: text.getBBox().height,
      fontSize: getComputedStyle(text).fontSize,
      fill: getComputedStyle(text).fill,
    };
  });

  await selectOption('--sectiondivider-md-title', 'Black');
  await expect.poll(() => page.locator('.section-divider.variant-md').first().evaluate((divider) => {
    const text = divider.querySelector('svg.divider-label text')!;
    return {
      root: document.documentElement.style.getPropertyValue('--sectiondivider-md-title').trim(),
      fill: getComputedStyle(text).fill,
    };
  })).toEqual({ root: 'var(--color-black)', fill: expected.titleColor });

  await selectOption('--sectiondivider-md-title-font-size', '6XL');
  await expect.poll(() => page.locator('.section-divider.variant-md').first().evaluate((divider) => {
    const svg = divider.querySelector<SVGSVGElement>('svg.divider-label')!;
    const text = svg.querySelector<SVGTextElement>('text')!;
    return {
      root: document.documentElement.style.getPropertyValue('--sectiondivider-md-title-font-size').trim(),
      fontSize: getComputedStyle(text).fontSize,
      height: svg.getBoundingClientRect().height,
      textBoxHeight: text.getBBox().height,
    };
  })).toEqual({
    root: 'var(--font-size-6xl)',
    fontSize: expected.fontSize,
    height: expect.any(Number),
    textBoxHeight: expect.any(Number),
  });

  const afterSvg = await page.locator('.section-divider.variant-md').first().evaluate((divider) => {
    const svg = divider.querySelector<SVGSVGElement>('svg.divider-label')!;
    const text = svg.querySelector<SVGTextElement>('text')!;
    return { height: svg.getBoundingClientRect().height, textBoxHeight: text.getBBox().height };
  });
  expect(afterSvg.height).toBeGreaterThan(0);
  expect(afterSvg.textBoxHeight).toBeGreaterThan(0);
  expect(afterSvg.height).not.toBe(beforeSvg.height);
  expect(afterSvg.textBoxHeight).not.toBe(beforeSvg.textBoxHeight);

  await selectOption('--sectiondivider-md-title-font-weight', 'Black');
  await selectOption('--sectiondivider-md-title-outline-width', '12px');

  await expect.poll(() => page.evaluate(() => {
    const root = document.documentElement.style;
    return {
      color: root.getPropertyValue('--sectiondivider-md-title').trim(),
      weight: root.getPropertyValue('--sectiondivider-md-title-font-weight').trim(),
      size: root.getPropertyValue('--sectiondivider-md-title-font-size').trim(),
      outline: root.getPropertyValue('--sectiondivider-md-title-outline-width').trim(),
    };
  })).toEqual({
    color: 'var(--color-black)',
    weight: 'var(--font-weight-black)',
    size: 'var(--font-size-6xl)',
    outline: 'var(--border-width-12)',
  });

  const rendered = await page.locator('.section-divider.variant-md').first().evaluate((divider) => {
    const text = divider.querySelector('svg.divider-label text')!;
    const morphology = divider.querySelector('feMorphology')!;
    return {
      color: getComputedStyle(text).color,
      fill: getComputedStyle(text).fill,
      fontWeight: getComputedStyle(text).fontWeight,
      fontSize: getComputedStyle(text).fontSize,
      outlineRadius: morphology.getAttribute('radius'),
    };
  });
  expect(rendered).toEqual({
    color: expected.titleColor,
    fill: expected.titleColor,
    fontWeight: '900',
    fontSize: expected.fontSize,
    outlineRadius: expected.outlineRadius,
  });
  expect(await page.evaluate(() => (window as any).__playwrightLiveMarker)).toBe('still-here');
  expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(1);
});

test('literal, token-opacity, gradient, intrinsic, padding, font, undo, and redo transforms stay live', async ({ page }) => {
  const frame = await openOverlayEditor(page, 'components');

  await frame.evaluate(async () => {
    const modulePath = '/src/editor/core/store/editorStore.ts';
    const editor = await import(/* @vite-ignore */ modulePath);
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-font-weight', {
      kind: 'literal', value: '800',
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-font-size', {
      kind: 'literal', value: '52px',
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-outline-width', {
      kind: 'literal', value: '12px',
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-outline-color', {
      kind: 'token', name: '--color-danger-600', opacity: 36,
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-background', {
      kind: 'gradient',
      value: {
        type: 'linear',
        angle: 90,
        stops: [
          { position: 0, color: '--color-brand-300' },
          { position: 100, color: '--color-accent-700', opacity: 40 },
        ],
      },
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-padding-top', {
      kind: 'literal', value: '11px',
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-padding-right', {
      kind: 'literal', value: '13px',
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-padding-bottom', {
      kind: 'literal', value: '17px',
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-title-padding-left', {
      kind: 'literal', value: '19px',
    });
    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-description-display', {
      kind: 'literal', value: 'none',
    });

    editor.setFontSources([{
      id: 'playwright-font',
      kind: 'font-face',
      cssText: '@font-face { font-family: "Playwright Live"; src: local("Arial"); }',
      families: [{ id: 'playwright-family', name: 'Playwright Live', cssName: '"Playwright Live"' }],
    }]);
    editor.setFontStacks([{
      variable: '--font-display',
      slots: [
        { kind: 'project', familyId: 'playwright-family' },
        { kind: 'generic', value: 'sans-serif' },
      ],
    }]);

    editor.setComponentAlias('sectiondivider', '--sectiondivider-md-hairline-thickness', {
      kind: 'literal', value: '7px',
    });
    editor.undo();
  });

  const roots = await frame.evaluate(() => {
    const read = (root: HTMLElement, name: string) => root.style.getPropertyValue(name).trim();
    const self = document.documentElement;
    const host = window.parent.document.documentElement;
    const names = [
      '--sectiondivider-md-title-font-weight',
      '--sectiondivider-md-title-font-size',
      '--sectiondivider-md-title-outline-width',
      '--sectiondivider-md-title-outline-color',
      '--sectiondivider-md-background',
      '--sectiondivider-md-description-display',
      '--font-display',
    ];
    return {
      same: names.every((name) => read(self, name) === read(host, name)),
      values: Object.fromEntries(names.map((name) => [name, read(host, name)])),
      selfFontNode: !!document.head.querySelector('[data-font-source-id="playwright-font"]'),
      hostFontNode: !!window.parent.document.head.querySelector('[data-font-source-id="playwright-font"]'),
      undoValue: read(host, '--sectiondivider-md-hairline-thickness'),
    };
  });

  expect(roots.same).toBe(true);
  expect(roots.values['--sectiondivider-md-title-outline-color'])
    .toBe('color-mix(in srgb, var(--color-danger-600) 36%, transparent)');
  expect(roots.values['--sectiondivider-md-background']).toContain('linear-gradient(90deg');
  expect(roots.values['--sectiondivider-md-background']).toContain('40%');
  expect(roots.values['--sectiondivider-md-description-display']).toBe('none');
  expect(roots.values['--font-display']).toBe('"Playwright Live", sans-serif');
  expect(roots.selfFontNode && roots.hostFontNode).toBe(true);
  expect(roots.undoValue).not.toBe('7px');

  const resolvedDanger = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-danger-600').trim(),
  );

  await expect.poll(() => page.locator('.section-divider.variant-md').first().evaluate((divider) => {
    const text = divider.querySelector('svg.divider-label text')!;
    const titleRow = divider.querySelector('.title-row')!;
    const description = divider.querySelector('.description-row')!;
    const morphology = divider.querySelector('feMorphology')!;
    const flood = divider.querySelector('feFlood')!;
    const style = getComputedStyle(divider);
    return {
      fontWeight: getComputedStyle(text).fontWeight,
      fontSize: getComputedStyle(text).fontSize,
      outlineRadius: morphology.getAttribute('radius'),
      outlineColor: flood.getAttribute('flood-color'),
      background: style.backgroundImage,
      padding: getComputedStyle(titleRow).padding,
      descriptionDisplay: getComputedStyle(description).display,
    };
  })).toEqual({
    fontWeight: '800',
    fontSize: '52px',
    outlineRadius: '6',
    outlineColor: `color-mix(in srgb, ${resolvedDanger} 36%, transparent)`,
    background: expect.stringContaining('linear-gradient'),
    padding: '11px 13px 17px 19px',
    descriptionDisplay: 'none',
  });

  await frame.evaluate(async () => {
    const modulePath = '/src/editor/core/store/editorStore.ts';
    const editor = await import(/* @vite-ignore */ modulePath);
    editor.redo();
  });
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.style
      .getPropertyValue('--sectiondivider-md-hairline-thickness')
      .trim(),
  )).toBe('7px');
});
