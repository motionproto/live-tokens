// @vitest-environment happy-dom
//
// Full-bleed media in a Card. Without the prop a page has to zero the five
// --card-default-body-padding* tokens at its own scope, which reaches around
// the component to undo something it did.

import { describe, it, expect, beforeEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Card from '../Card.svelte';

const here = dirname(fileURLToPath(import.meta.url));
const styleBlock = readFileSync(resolve(here, '../Card.svelte'), 'utf8')
  .match(/<style[^>]*>([\s\S]*?)<\/style>/)![1];
const css = compileString(styleBlock, {
  loadPaths: [resolve(here, '../../styles')],
}).css;

beforeEach(() => {
  document.body.innerHTML = '';
});

const media = () => createRawSnippet(() => ({ render: () => '<img alt="" />' }));

function bodyClasses(props: Record<string, unknown>): DOMTokenList {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const c = mount(Card, { target, props: { children: media(), ...props } });
  flushSync();
  const body = target.querySelector('.card-body');
  if (!body) throw new Error('.card-body not rendered');
  const classes = body.classList;
  unmount(c);
  return classes;
}

describe('Card flush', () => {
  it('is off by default', () => {
    expect(bodyClasses({}).contains('flush')).toBe(false);
  });

  it('wires the class the rule keys on', () => {
    expect(bodyClasses({ flush: true }).contains('flush')).toBe(true);
  });

  it('composes with prose={false}, the pairing full-bleed media wants', () => {
    const classes = bodyClasses({ flush: true, prose: false });
    expect(classes.contains('flush')).toBe(true);
    expect(classes.contains('prose')).toBe(false);
  });

  it('zeroes the body inset through the space scale, not a literal', () => {
    expect(css).toMatch(/\.card-body\.flush\s*\{\s*padding:\s*var\(--space-0\)/);
  });

  it('outweighs the compact size, so a flush card is flush at either size', () => {
    // Equal specificity (0,2,0), so source order decides: flush has to come last.
    const flushAt = css.indexOf('.card-body.flush');
    const compactAt = css.lastIndexOf('.card.compact .card-body');
    expect(flushAt).toBeGreaterThan(compactAt);
  });
});
