// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import {
  BACKDROP_ATTRIBUTE,
  backgroundLuminance,
  declaredPolarity,
  polarityOf,
  polarityOfBackground,
} from './backdrop';
import { watchBackdrop } from './watch';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.style.cssText = '';
});

function panel(css: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = css;
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.body.appendChild(el);
  return el;
}

describe('reading a background value', () => {
  it('reads hex, rgb, and oklch alike', () => {
    expect(polarityOfBackground('#ffffff')).toBe('light');
    expect(polarityOfBackground('rgb(10, 10, 12)')).toBe('dark');
    expect(polarityOfBackground('oklch(0.955 0.012 55)')).toBe('light');
  });

  it('averages a gradient rather than picking a stop', () => {
    const dusk = backgroundLuminance('linear-gradient(0deg, #ffffff 0%, #000000 100%)')!;
    expect(dusk).toBeCloseTo(0.5, 2);
    const mostlyDark = backgroundLuminance('linear-gradient(0deg, #000000 0%, #111111 50%, #ffffff 100%)')!;
    expect(mostlyDark).toBeLessThan(dusk);
  });

  it('ignores a fill you can see through, which hides nothing', () => {
    expect(backgroundLuminance('rgba(0, 0, 0, 0)')).toBeNull();
    expect(backgroundLuminance('#00000080')).toBeNull();
  });

  it('answers null for a value naming no colour', () => {
    expect(backgroundLuminance('none')).toBeNull();
    expect(polarityOfBackground('')).toBeNull();
  });
});

describe('resolving polarity for an element', () => {
  it('measures the nearest ancestor that actually fills', () => {
    const band = panel('background-color: rgb(250, 248, 245)');
    const inner = document.createElement('span');
    band.appendChild(inner);
    expect(polarityOf(inner)).toBe('light');
  });

  it('takes a stated tone over the paint, for art the paint cannot show', () => {
    const hero = panel('background-color: rgb(250, 248, 245)', { [BACKDROP_ATTRIBUTE]: 'dark' });
    expect(declaredPolarity(hero)).toBe('dark');
    expect(polarityOf(hero)).toBe('dark');
  });

  it('inherits a stated tone down the tree', () => {
    const hero = panel('', { [BACKDROP_ATTRIBUTE]: 'dark' });
    const title = document.createElement('h1');
    hero.appendChild(title);
    expect(polarityOf(title)).toBe('dark');
  });

  it('falls back to the theme page canvas when nothing fills', () => {
    document.documentElement.style.setProperty('--page-bg', 'oklch(0.03 0.012 255)');
    expect(polarityOf(panel(''))).toBe('dark');
  });
});

describe('watching', () => {
  it('stamps the element and reports the answer', () => {
    const el = panel('background-color: rgb(8, 8, 10)');
    const seen: string[] = [];
    const stop = watchBackdrop(el, { onChange: (polarity) => seen.push(polarity) });
    expect(el.getAttribute(BACKDROP_ATTRIBUTE)).toBe('dark');
    expect(seen).toEqual(['dark']);
    stop();
    expect(el.hasAttribute(BACKDROP_ATTRIBUTE)).toBe(false);
  });

  it('does not read its own stamp back as a stated tone', () => {
    const el = panel('background-color: rgb(8, 8, 10)');
    const stop = watchBackdrop(el);
    expect(declaredPolarity(el)).toBeNull();
    stop();
  });

  it('leaves a stated tone alone', () => {
    const el = panel('background-color: rgb(250, 248, 245)', { [BACKDROP_ATTRIBUTE]: 'dark' });
    const seen: string[] = [];
    const stop = watchBackdrop(el, { onChange: (polarity) => seen.push(polarity) });
    expect(seen).toEqual(['dark']);
    stop();
  });
});
