import { blankHtmlExpressions, styleBlockDeclarations, tagAttributes } from '../lib/pageSource.mjs';

export const pageRules = {
  'unknown-component': { severity: 'error', fix: 'page-component', repair: 'authored' },
  'unknown-prop': { severity: 'error', fix: 'page-component', repair: 'choice' },
  'unknown-prop-value': { severity: 'error', fix: 'page-component', repair: 'choice' },
  'control-size': { severity: 'warn', fix: 'page-component', repair: 'auto' },
  'multiple-primary': { severity: 'warn', fix: 'page-component', repair: 'authored' },
  'danger-without-dialog': { severity: 'warn', fix: 'page-component', repair: 'authored' },
  'native-control': { severity: 'warn', fix: 'page-component', repair: 'authored' },
  'property-override': { severity: 'warn', fix: 'page-component', repair: 'auto' },
};

export const COMPONENT_IMPORT =
  /(?:@motion-proto\/live-tokens\/components|[./][^'"]*\/system\/components)\/([A-Za-z0-9]+)\.svelte$/;

/** `unknown-component` for one import statement. A catalogue component's local
 *  name joins `imports`, which the tag rules read. */
export function resolveComponentImport({ index, clause, specifier }, vocab, imports, add) {
  const comp = specifier.match(COMPONENT_IMPORT);
  if (!comp) return;
  const entry = vocab.components.get(comp[1].toLowerCase());
  if (!entry) {
    add(
      'unknown-component',
      index,
      `'${comp[1]}' is not in the component catalogue; author it with live-tokens-create-component or pick a shipped one`,
    );
    return;
  }
  const local = clause?.trim().match(/^(\w+)$/)?.[1];
  if (local) imports.set(local, entry);
}

export function checkComponentTags(code, imports, add) {
  checkComponentUsage(code, imports, add);
  checkPrimaryActions(code, imports, add);
  checkDestructiveActions(code, imports, add);
  checkNativeControls(code, add);
}

// The shipped component that owns each native control's paint.
const NATIVE_CONTROLS = {
  button: 'Button or IconButton',
  input: 'Input',
  select: 'MenuSelect',
  textarea: 'Input',
};

/** A raw `<button>`, `<input>`, `<select>`, or `<textarea>` where a shipped
    component belongs. `<input type="hidden">` paints nothing and is exempt.
    A tag inside `<script>` is markup the page assembles into a string, not
    markup it renders, so the script block is blanked the same way
    `codeRegion` blanks `<style>`, keeping offsets aligned with `code`. */
function checkNativeControls(code, add) {
  const scan = blankHtmlExpressions(code).replace(/<script[^>]*>[\s\S]*?<\/script>/g, (m) => ' '.repeat(m.length));
  for (const tag of Object.keys(NATIVE_CONTROLS)) {
    for (const m of scan.matchAll(new RegExp(`<${tag}(?=[\\s/>])`, 'g'))) {
      const parsed = tagAttributes(scan, m.index);
      if (tag === 'input' && parsed?.attrs.some((a) => a.name.toLowerCase() === 'type' && a.value?.toLowerCase() === 'hidden')) {
        continue;
      }
      add(
        'native-control',
        m.index,
        `<${tag}> is a native control; use ${NATIVE_CONTROLS[tag]} so it paints from the theme.`,
      );
    }
  }
}

/**
 * Props a page passes that the component does not declare, values outside a
 * prop's union, and a shipped component the page sizes itself.
 */
function checkComponentUsage(code, imports, add) {
  for (const [local, entry] of imports) {
    const props = entry.props;
    if (!props) continue;
    const re = new RegExp(`<${local}(?=[\\s/>])`, 'g');
    for (const m of code.matchAll(re)) {
      const tag = tagAttributes(code, m.index);
      if (!tag) continue;
      for (const { name, value, index, end } of tag.attrs) {
        if (name.includes(':') || name.startsWith('@') || name === 'children') continue;
        if (!props.props.has(name)) {
          add('unknown-prop', index, `${entry.name} has no prop '${name}'; it accepts ${[...props.props].join(', ')}`, {
            details: { accepts: [...props.props] },
          });
          continue;
        }
        const allowed = props.enums.get(name);
        if (allowed && value !== null && !allowed.has(value)) {
          add('unknown-prop-value', index, `${entry.name} ${name}="${value}" is not one of ${[...allowed].join(', ')}`, {
            details: { accepts: [...allowed] },
          });
        }
        if (name === 'size' && entry.origin === 'shipped') {
          // An attribute no fixer can delete whole has nothing auto to
          // apply, so it lowers to a choice.
          const patch = attributeDeletion(code, index, end);
          add(
            'control-size',
            index,
            `${entry.name} ${value === null ? 'is sized here' : `size="${value}"`}. Drop it for the shipped default, or retune ${entry.name} for the whole project in /live-tokens/components.`,
            { details: { site: 'attribute', ...(patch ? { patch } : {}) }, ...(patch ? {} : { repair: 'choice' }) },
          );
        }
      }
    }
  }
}

/** The exact text a fixer deletes for one attribute: its own span, plus one
 *  leading space or tab if present, so removal doesn't leave a double space or
 *  a lone trailing one before the tag's `>`. A span that crosses a newline
 *  yields no patch: the patch has to stay inside the line the finding names,
 *  and `applyFixes` applies a file's patches in line order on the assumption
 *  that none of them moves a later line. A span stopping at its own `=` is an
 *  attribute whose value starts on the next line, so deleting the span would
 *  leave the value behind as orphan markup. */
function attributeDeletion(code, index, end) {
  const start = /[^\S\n]/.test(code[index - 1] ?? '') ? index - 1 : index;
  const from = code.slice(start, end);
  if (from.includes('\n') || from.endsWith('=')) return null;
  return { from, to: '' };
}

/**
 * One finding when a page holds more than one primary Button, at the second of
 * them. Emphasis is what the variant carries, so a second primary leaves the
 * page with no single most important action. A Button with no variant is
 * primary, the component's default.
 */
function checkPrimaryActions(code, imports, add) {
  const primaries = [];
  for (const [local, entry] of imports) {
    if (entry.id !== 'button') continue;
    for (const m of code.matchAll(new RegExp(`<${local}(?=[\\s/>])`, 'g'))) {
      const tag = tagAttributes(code, m.index);
      const variant = tag?.attrs.find((a) => a.name === 'variant');
      if (tag && (variant === undefined || variant.value === 'primary')) primaries.push(m.index);
    }
  }
  if (primaries.length < 2) return;
  primaries.sort((a, b) => a - b);
  add(
    'multiple-primary',
    primaries[1],
    `${primaries.length} primary Buttons in this page. Keep the most important action primary and make the other ${primaries.length - 1} secondary.`,
  );
}

/**
 * One finding when a page holds a danger Button and imports no Dialog. A
 * danger action destroys saved work, and the page has nothing to confirm it.
 */
function checkDestructiveActions(code, imports, add) {
  if ([...imports.values()].some((entry) => entry.id === 'dialog')) return;
  for (const [local, entry] of imports) {
    if (entry.id !== 'button' && entry.id !== 'iconbutton') continue;
    for (const m of code.matchAll(new RegExp(`<${local}(?=[\\s/>])`, 'g'))) {
      const tag = tagAttributes(code, m.index);
      if (!tag?.attrs.some((a) => a.name === 'variant' && a.value === 'danger')) continue;
      add(
        'danger-without-dialog',
        m.index,
        `${entry.name} variant="danger" with no Dialog in this page. A destructive action confirms in a Dialog before it runs.`,
      );
      return;
    }
  }
}

// Which component's :global(:root) block declared each component token,
// cached per vocabulary since checkFile runs once per page.
const tokenOwnersCache = new WeakMap();
function componentTokenOwners(vocab) {
  let owners = tokenOwnersCache.get(vocab);
  if (owners) return owners;
  owners = new Map();
  for (const comp of vocab.components.values()) {
    for (const name of comp.tokens.keys()) {
      if (!owners.has(name)) owners.set(name, comp.name);
    }
  }
  tokenOwnersCache.set(vocab, owners);
  return owners;
}

/** A `--name: value;` CSS declaration, deleted whole. The match is anchored at
 *  `index`, which sits either on the name or on the boundary character before
 *  it (a style-block match keeps that char as its own delimiter), and the
 *  declaration stops at `}` and at a newline as well as at `;`, the gaps
 *  around its colon included. Unanchored and unbounded, the search ran past
 *  its own rule and deleted the next same-named declaration, or the text of a
 *  string literal further down the file. A declaration no `;` terminates
 *  inside its own block yields no patch, since deleting it whole would need
 *  one. A declaration wrapped onto a second line yields none either: the
 *  patch has to stay inside the line the finding names, since `applyFixes`
 *  assumes no patch moves a later line. The match runs on `clean`, the
 *  neutralised text from `index` on, and the span it bounds has to read the
 *  same in the file: matched on the raw text, a `;` inside a comment in the
 *  value ended the match there, and the deletion left the comment's tail
 *  behind.
 */
function declarationDeletion(text, name, index, clean) {
  const m = new RegExp(`^[;{]?\\s*(${name}[^\\S\\n]*:[^\\S\\n]*[^;}\\n]+;)`).exec(clean);
  if (!m) return null;
  const start = index + m[0].length - m[1].length;
  const from = text.slice(start, start + m[1].length);
  return from === m[1] ? { from, to: '' } : null;
}

/** A `style:--name="value"` directive, deleted whole. `overrideAt` always
 *  records `index` at the start of `style:` itself, so the match is anchored
 *  there and its length measures this directive. Unanchored, a directive whose
 *  value is an expression (`style:--name={r}`) matched a quoted namesake
 *  further down the file and cut that match's length out of this tag's markup.
 *  An expression value has no patch: the value is code, not text to delete.
 */
function directiveDeletion(text, name, index) {
  const m = new RegExp(`^style:${name}=(["'])[^"']*\\1`).exec(text.slice(index));
  if (!m) return null;
  const start = /[^\S\n]/.test(text[index - 1] ?? '') ? index - 1 : index;
  const from = text.slice(start, index + m[0].length);
  // A quoted value may run over a line, and deleting it would move every later
  // finding's line out from under `applyFixes`.
  if (from.includes('\n')) return null;
  return { from, to: '' };
}

export function checkPropertyOverrides({ text, regions, inlineRegions, vocab }, add) {
  // property-override needs a narrower set than `pageDeclaredNames`: its
  // bare-quote alternative exists only to suppress unknown-token on a name any
  // quoted string mentions, so it also matches a read like
  // getPropertyValue("--x"). A real declaration is a style-block rule, an
  // inline `style="--x: ..."` attribute, a `style:--x=` directive, or a
  // setProperty('--x', ...) call.
  const overrideSites = new Map();
  const overrideAt = (name, index, site, clean) => {
    if (!overrideSites.has(name) || index < overrideSites.get(name).index) overrideSites.set(name, { index, site, clean });
  };
  styleBlockDeclarations(regions, overrideAt);
  styleBlockDeclarations(inlineRegions, overrideAt);
  for (const m of text.matchAll(/(?:style:|setProperty\(\s*['"`])(--[a-z0-9-]+)/g)) {
    overrideAt(m[1], m.index, m[0].startsWith('style:') ? 'directive' : 'script');
  }

  // A name the vocabulary already ties to a component is that component's
  // token, so declaring it here is one instance overriding the whole
  // project's retuning surface at /live-tokens/components.
  for (const [name, { index, site, clean }] of overrideSites) {
    if (!vocab.componentTokens.has(name)) continue;
    const owner = componentTokenOwners(vocab).get(name) ?? 'a shipped component';
    const patch =
      site === 'declaration'
        ? declarationDeletion(text, name, index, clean)
        : site === 'directive'
          ? directiveDeletion(text, name, index)
          : null;
    // A setProperty call is code around the value, not a value to delete, so
    // it is always authored. Any other site with no patch (an inline
    // attribute, or a declaration a fixer could not bound safely) has
    // nothing auto to apply, so it is a choice rather than the rule's ceiling.
    const repair = site === 'script' ? 'authored' : patch ? undefined : 'choice';
    add(
      'property-override',
      index,
      `${name} overrides ${owner}'s token here instead of the whole project; retune it at /live-tokens/components.`,
      { details: { site, ...(patch ? { patch } : {}) }, ...(repair ? { repair } : {}) },
    );
  }
}
