import type { Migration } from './index';

/**
 * The data half of the tokens.css migration `2026-07-20-line-height-rename`,
 * which reshaped the line-height scale from size vocabulary to leading
 * vocabulary. That pass renames the definitions in `tokens.css`; a saved file
 * still references the old names, and a reference to a token that no longer
 * exists renders as nothing. Both layers reference the scale, so both migrate:
 * colors-and-type through its `cssVariables`, a component config through its
 * alias values.
 *
 * `xl` (2) has no slot in the leading scale, so it lands on `relaxed` (1.75),
 * the nearest surviving step. That is a visible change to a line that used it,
 * and the only alternative is a dangling reference.
 *
 * Values alone, never keys: a key is a definition (or, in a component config,
 * the component's own token), and remapping `--line-height-xl` onto
 * `--line-height-relaxed` would redefine a surviving step at 2 for everything
 * that references it.
 */
const RENAMED: Record<string, string> = {
  '--line-height-xs': '--line-height-none',
  '--line-height-sm': '--line-height-tighter',
  '--line-height-md': '--line-height-normal',
  '--line-height-lg': '--line-height-relaxed',
  '--line-height-xl': '--line-height-relaxed',
};

// Bare (`--line-height-md`) and wrapped (`var(--line-height-md)`) references
// both occur; the lookahead keeps `--line-height-md` from matching inside a
// longer name.
const REFERENCE = /--line-height-(?:xs|sm|md|lg|xl)(?![\w-])/g;

function renameValues(rawVars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawVars)) {
    out[key] =
      typeof value === 'string' ? value.replace(REFERENCE, (name) => RENAMED[name]) : value;
  }
  return out;
}

export const colorsAndTypeMigration_2026_08_15_lineHeightScaleRename: Migration = {
  id: '2026-08-15-line-height-scale-rename-colors-and-type',
  fromVersion: 4,
  toVersion: 5,
  appliesTo: 'colors-and-type',
  apply: renameValues,
};

export const componentMigration_2026_08_15_lineHeightScaleRename: Migration = {
  id: '2026-08-15-line-height-scale-rename-component',
  fromVersion: 20,
  toVersion: 21,
  appliesTo: 'component-config',
  apply: renameValues,
};
