import type { Migration } from './index';

/**
 * 2026-05-24: drop the `active` header state from collapsiblesection.
 *
 * The state only paid rent when the component was used as a nav link (an
 * externally-supplied `active={true}` paired with `href`). No consumer was
 * using it, so the runtime now omits both the prop and the `&.active` CSS
 * branch. Strip the matching saved aliases from every variant.
 */
function dropActiveState(rawVars: Record<string, string>, meta: { component?: string }): Record<string, string> {
  if (meta.component !== 'collapsiblesection') return rawVars;
  const re = /^--collapsiblesection-(chromeless|divider|container)-active-/;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawVars)) {
    if (re.test(key)) continue;
    out[key] = value;
  }
  return out;
}

export const componentMigration_2026_05_24_collapsiblesectionDropActiveState: Migration = {
  id: '2026-05-24-collapsiblesection-drop-active-state',
  fromVersion: 14,
  toVersion: 15,
  appliesTo: 'component-config',
  apply: dropActiveState,
};
