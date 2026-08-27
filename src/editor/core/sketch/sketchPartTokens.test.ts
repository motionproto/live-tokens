// @vitest-environment happy-dom

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as sass from 'sass';
import { buildStylesheet, PART_SELECTORS } from './sketchLayer';
import { SKETCH_STYLES } from './sketchStyles';

/**
 * The sketch layer hides a component's real background and border and repaints
 * them onto two pseudo-elements. Whatever token it paints with is therefore the
 * only colour that part has left, and a token that belongs to some other
 * element of the same component — a menu's items, a notification's header strip
 * — repaints the wrong box, or repaints the whole component on a hover that
 * should only have lit one row of it.
 *
 * So: every colour the layer paints must be one the component itself assigns to
 * that same element. The component's compiled CSS is the authority.
 */

const COMPONENTS = join(process.cwd(), 'src/system/components');

interface Rule {
  file: string;
  sel: string;
  decls: [string, string][];
}

function compiledRules(): Rule[] {
  const out: Rule[] = [];
  const files = readdirSync(COMPONENTS)
    .filter((f) => f.endsWith('.svelte') && !f.endsWith('Editor.svelte'));
  for (const file of files) {
    const block = readFileSync(join(COMPONENTS, file), 'utf8')
      .match(/<style[^>]*>([\s\S]*?)<\/style>/);
    if (!block) continue;
    const css = sass
      .compileString(block[1], { loadPaths: [join(process.cwd(), 'src/system/styles')] })
      .css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = m[1].trim();
      if (!selectors || selectors.startsWith('@')) continue;
      const decls = [...m[2].matchAll(/([\w-]+)\s*:\s*([^;]+)/g)]
        .map((d) => [d[1], d[2].trim()] as [string, string]);
      for (const sel of selectors.split(',')) out.push({ file, sel: sel.trim(), decls });
    }
  }
  return out;
}

/** Class + pseudo set of one compound selector, with the noise the two sides
    spell differently taken out: `:not()` narrows a rule without changing which
    element it paints, and `.force-hover` is the editor's preview of `:hover`. */
function compound(part: string): Set<string> {
  const bits = part
    .replace(/:not\([^)]*\)/g, '')
    .replace(/\.force-hover/g, ':hover')
    .match(/[.:]+[\w-]+/g);
  return new Set(bits ?? []);
}

function subset(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function parse(sel: string): Set<string>[] {
  return sel.replace(/\s*>\s*/g, ' ').split(/\s+/).filter(Boolean).map(compound);
}

/**
 * Does `rule` paint the element `part` selects? The two selectors are written
 * independently, so match on the element itself — the last compound, which the
 * rule may narrow but never widen — and require the rule's ancestors to be a
 * subsequence of the part's. That keeps a sibling state out (`.tab.active` does
 * not paint plain `.tab`) while letting a base rule in (`.notification` does
 * paint `.notification.info`).
 */
function applies(ruleSel: string, partSel: string): boolean {
  const rule = parse(ruleSel);
  const part = parse(partSel);
  if (rule.length === 0 || !subset(rule[rule.length - 1], part[part.length - 1])) return false;
  let i = 0;
  for (const anc of rule.slice(0, -1)) {
    while (i < part.length - 1 && !subset(anc, part[i])) i++;
    if (i === part.length - 1) return false;
    i++;
  }
  return true;
}

const tokensIn = (value: string) =>
  [...value.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]);

/**
 * Tokens the component may be painting this element with. A component that
 * rebinds through a private `--_name` (TabBar and SectionDivider both do, to
 * keep one painting rule across four states) counts under either name: the
 * private one, which the layer can name too because it inherits, and the public
 * token one hop behind it.
 */
function painted(rules: Rule[], partSel: string, props: RegExp): Set<string> {
  const applicable = rules.filter((r) => applies(r.sel, partSel));
  const locals = new Map<string, string[]>();
  for (const r of applicable) {
    for (const [prop, value] of r.decls) {
      if (prop.startsWith('--_')) locals.set(prop, [...(locals.get(prop) ?? []), value]);
    }
  }
  const found = new Set<string>();
  for (const r of applicable) {
    for (const [prop, value] of r.decls) {
      if (!props.test(prop)) continue;
      for (const token of tokensIn(value)) {
        found.add(token);
        for (const bound of locals.get(token) ?? []) tokensIn(bound).forEach((t) => found.add(t));
      }
    }
  }
  return found;
}

const FILL_PROPS = /^background(-color)?$/;
const STROKE_PROPS = /^(border|outline)(-(top|right|bottom|left|block|inline))?(-color)?$/;

/** Every `--sketch-fill` / `--sketch-stroke` the layer emits, per selector. */
function paintedBySketch(): { sel: string; fill?: string; stroke?: string }[] {
  const css = buildStylesheet(SKETCH_STYLES.marker);
  const out: { sel: string; fill?: string; stroke?: string }[] = [];
  for (const m of css.matchAll(/\[data-sketch\] ([^{]+)\{((?:--sketch-\w+:[^;]*;)+)\}/g)) {
    const fill = m[2].match(/--sketch-fill:([^;]*);/)?.[1];
    const stroke = m[2].match(/--sketch-stroke:([^;]*);/)?.[1];
    if (!fill && !stroke) continue;
    for (const sel of m[1].split(',')) {
      out.push({ sel: sel.replace('[data-sketch] ', '').trim(), fill, stroke });
    }
  }
  return out;
}

describe('what the layer paints a part with', () => {
  const rules = compiledRules();
  const sketched = paintedBySketch();

  // A part the consumer colours itself has no component rule to check against;
  // nothing else may go unmatched.
  const CONSUMER_OWNED = ['.sketch-surface', '.sketch-container', '.sketch-chip', '.sketch-rule'];

  it('reads its fill off a background the component sets on that same element', () => {
    const wrong: string[] = [];
    for (const { sel, fill } of sketched) {
      if (!fill || CONSUMER_OWNED.includes(sel)) continue;
      const [token] = tokensIn(fill);
      if (!token) continue;
      const own = painted(rules, sel, FILL_PROPS);
      if (!own.has(token)) wrong.push(`${sel}\n  paints ${token}\n  sets   ${[...own].join(', ') || '(no background)'}`);
    }
    expect(wrong.join('\n')).toBe('');
  });

  it('reads its stroke off a border the component sets on that same element', () => {
    const wrong: string[] = [];
    for (const { sel, stroke } of sketched) {
      if (!stroke || CONSUMER_OWNED.includes(sel)) continue;
      const [token] = tokensIn(stroke);
      if (!token) continue;
      const own = painted(rules, sel, STROKE_PROPS);
      if (!own.has(token)) wrong.push(`${sel}\n  paints ${token}\n  sets   ${[...own].join(', ') || '(no border)'}`);
    }
    expect(wrong.join('\n')).toBe('');
  });

  it('selects an element some component actually styles', () => {
    const unmatched = sketched
      .filter((s) => !CONSUMER_OWNED.includes(s.sel))
      .filter((s) => !rules.some((r) => applies(r.sel, s.sel)))
      .map((s) => s.sel);
    expect(unmatched).toEqual([]);
  });
});

/**
 * The consumer hooks are the only way a page element or a consumer-authored
 * component joins the effect, so the layer has to draw them and must not name a
 * colour for them: the element's own declaration is the whole point.
 */
describe('the consumer opt-in classes', () => {
  const CONSUMER_HOOKS = ['.sketch-surface', '.sketch-container', '.sketch-chip', '.sketch-rule'];

  it('are drawn', () => {
    const missing = CONSUMER_HOOKS.filter((sel) => !PART_SELECTORS.includes(sel));
    expect(missing).toEqual([]);
  });

  it("are left uncoloured, so the element's own --sketch-fill survives", () => {
    const coloured = paintedBySketch()
      .filter((s) => CONSUMER_HOOKS.includes(s.sel))
      .map((s) => s.sel);
    expect(coloured).toEqual([]);
  });

  it('sort by size the same way the shipped parts do', () => {
    const css = buildStylesheet(SKETCH_STYLES.marker);
    // The container damping and the chip profile are single rules listing every
    // part that takes them; a hook is in the right band or it is not there.
    const band = (member: string) =>
      css.split('\n').find((line) => line.includes(member)) ?? '';
    expect(band('.sidenavigation')).toContain('.sketch-container');
    expect(band('.toggle .track')).toContain('.sketch-chip');
  });
});
