import { blankStrings } from './cssValues.mjs';

/** Blank out comments, url() payloads, and string contents so none of them can match a rule. */
export function neutralise(css) {
  return blankStrings(
    css
      .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
      .replace(/url\((?:[^()]|\([^()]*\))*\)/g, (m) => ' '.repeat(m.length)),
  );
}

/** `<style>` blocks with their absolute offset in the file; whole file for .css.
 *  `site` is what a repair would edit, which the finding carries. */
export function styleRegions(text, file) {
  if (file.endsWith('.css')) return [{ text, offset: 0, site: 'declaration' }];
  const out = [];
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    out.push({ text: m[1], offset: m.index + m[0].indexOf(m[1]), site: 'declaration' });
  }
  return out;
}

/**
 * Inline styles in markup, as declaration lists the value rules can read: a
 * `style="..."` attribute verbatim, and a `style:prop="value"` directive
 * rewritten as `prop: value;`. A `{...}` expression is dynamic and skipped.
 * The directive keeps its source text as `raw`, since the rewritten
 * declaration is not text a patch would find on disk.
 */
export function inlineStyleRegions(code) {
  const out = [];
  for (const m of code.matchAll(/\sstyle=(["'])([^"']*)\1/g)) {
    out.push({ text: `${m[2]};`, offset: m.index + m[0].indexOf(m[2]), site: 'attribute' });
  }
  for (const m of code.matchAll(/\sstyle:([a-z-]+)=(["'])([^"']*)\2/g)) {
    out.push({ text: `${m[1]}: ${m[3]};`, offset: m.index + 1, site: 'directive', raw: m[0].slice(1) });
  }
  return out;
}

/** Everything outside `<style>`: script and markup. */
export function codeRegion(text, file) {
  if (file.endsWith('.css')) return null;
  return text.replace(/<style[^>]*>[\s\S]*?<\/style>/g, (m) => ' '.repeat(m.length));
}

/**
 * Declarations in a stylesheet, with at-rule preludes excluded. A breakpoint in
 * `@media (max-width: 768px)` is structural geometry, not a themeable value.
 * A property name is read from its start, so `--heading-2xl` is one custom
 * property and never the property `xl`.
 */
export function declarations(css) {
  const body = css.replace(/@[a-z-]+[^;{]*(?=\{)/gi, (m) => ' '.repeat(m.length));
  const out = [];
  for (const m of body.matchAll(/(?<![\w-])((?:--)?[a-z][\w-]*)\s*:\s*([^;{}]+)[;}]/gi)) {
    out.push({ prop: m[1].toLowerCase(), value: m[2].trim(), index: m.index, text: m[0].slice(0, -1).trimEnd() });
  }
  return out;
}

/** Each custom property the regions declare, passed to `at` with its offset in
 *  the file, its region's site, and the neutralised text from the match on,
 *  which a deletion patch bounds itself against. */
export function styleBlockDeclarations(regionList, at) {
  for (const region of regionList) {
    const clean = neutralise(region.text);
    for (const m of clean.matchAll(/(?:^|[;{])\s*(--[a-z0-9-]+)\s*:/gim)) {
      at(m[1], region.offset + m.index, region.site, clean.slice(m.index));
    }
  }
}

/**
 * Every custom property a page declares, at the earliest offset it appears. A
 * page may also mint one outside its <style> block, in a `style:--x={...}`
 * directive or an el.style.setProperty call, and those are just as declared as
 * one written in CSS. A bare quoted name counts too, so a name the page only
 * reads through getPropertyValue("--x") is never an unknown token.
 */
export function pageDeclaredNames(text, regions) {
  const sites = new Map();
  const declareAt = (name, index) => {
    if (!sites.has(name) || index < sites.get(name)) sites.set(name, index);
  };
  styleBlockDeclarations(regions, declareAt);
  for (const m of text.matchAll(/(?:style:|setProperty\(\s*['"`]|['"`])(--[a-z0-9-]+)/g)) {
    declareAt(m[1], m.index);
  }
  return sites;
}

/** A dimension-literal patch anchored at the declaration the finding names:
 *  its property through its value in a style block or a `style` attribute,
 *  or the whole `style:` directive. A value-only patch (`8px` → `var(...)`)
 *  applied at the first `8px` at or after the finding's line, which in
 *  `width: 8px; padding: 8px` was a property the rule never flags. No patch
 *  when the source under the declaration differs from the text the census
 *  read (a comment or a string the neutralised copy blanked), since a `from`
 *  built from the blanked copy would never match the file. */
export function declarationPatch(text, region, decl, rewritten) {
  if (region.site === 'directive') {
    const from = region.raw;
    const quote = from.at(-1);
    const open = from.indexOf(quote);
    const inner = from.slice(open + 1, -1);
    if (inner.trim() !== decl.value) return null;
    return { from, to: from.slice(0, open + 1) + inner.replace(decl.value, rewritten) + quote };
  }
  const start = region.offset + decl.index;
  const from = text.slice(start, start + decl.text.length);
  if (from !== decl.text) return null;
  return { from, to: from.slice(0, -decl.value.length) + rewritten };
}
