import type { Token, TypeGroupConfig } from './types';

/** The four font-shape properties on a TypeGroupConfig that share-block sharing
    targets. Order is the canonical render order and the groupKey order. */
export const TYPE_FONT_PROPS = [
  { key: 'familyVariable', label: 'font family', defaultGroupKey: 'font-family' },
  { key: 'sizeVariable', label: 'font size', defaultGroupKey: 'font-size' },
  { key: 'weightVariable', label: 'font weight', defaultGroupKey: 'font-weight' },
  { key: 'lineHeightVariable', label: 'line height', defaultGroupKey: 'line-height' },
  { key: 'letterSpacingVariable', label: 'letter spacing', defaultGroupKey: 'letter-spacing' },
] as const satisfies ReadonlyArray<{
  key: keyof TypeGroupConfig;
  label: string;
  defaultGroupKey: string;
}>;

export type TypeFontProp = typeof TYPE_FONT_PROPS[number];

/** Declarative inputs that let the helpers derive a slot-scoped groupKey from a
    variable name instead of guessing from its last dash. Pass `component` (the id,
    so the `--<id>-` prefix is stripped) and `variants` (the variant/state segment
    strings exactly as they appear in variable names, e.g. `['default','hover']`).
    The derived key is everything left after removing the prefix and those segments,
    so two parts that share a suffix (`section-text`, `item-text`) stay distinct
    while the same slot across variants collapses to one key. */
export type GroupKeyDerivation = {
  component?: string;
  variants?: readonly string[];
};

export type BuildTypeGroupTokensOptions = GroupKeyDerivation & {
  /** Override the derived groupKey per property. Receives the prop descriptor and the
      type-group config it came from. Return a stable string — siblings sharing the same
      groupKey are linked in the linked block. Wins over structural derivation. */
  groupKeyFor?: (prop: TypeFontProp, group: TypeGroupConfig) => string;
};

/** Color-token derivation: either the legacy single-arg callback form
    `(group) => string`, or the declarative options object. */
export type ColorGroupKeyOption =
  | ((group: TypeGroupConfig) => string)
  | (GroupKeyDerivation & { groupKeyFor?: (group: TypeGroupConfig) => string });

/** Remove the first contiguous run matching each `segment` (a segment may itself
    be multi-part, e.g. `'on-hover'`) from `segs`. */
function stripSegments(segs: string[], remove: readonly string[]): string[] {
  let out = segs;
  for (const r of remove) {
    const rs = r.split('-');
    for (let i = 0; i + rs.length <= out.length; i++) {
      if (rs.every((s, k) => out[i + k] === s)) {
        out = [...out.slice(0, i), ...out.slice(i + rs.length)];
        break;
      }
    }
  }
  return out;
}

/** Slot-scoped key = the variable minus the `--<component>-` prefix and any
    variant/state segments. Falls back to the whole variable if nothing remains. */
export function structuralGroupKey(
  variable: string,
  { component, variants }: GroupKeyDerivation,
): string {
  let body = variable.startsWith('--') ? variable.slice(2) : variable;
  if (component && body.startsWith(component + '-')) body = body.slice(component.length + 1);
  const segs = stripSegments(body.split('-'), variants ?? []);
  return segs.join('-') || variable;
}

/** Derive the Token[] schema entries for every TypeGroupConfig in `typeGroups`. Each
    group emits one `colorVariable` token plus up to 4 font-shape tokens (family/size/
    weight/line-height) for whichever of those are declared on the group. Font-shape
    tokens carry `canBeLinked: true` and a stable `groupKey` so the linked-block linkage
    sees them; the color token is emitted plain (no groupKey, not shareable) unless a
    derivation is supplied, in which case it too gets a slot-scoped key.

    Pass `{ component, variants }` so font keys are slot-scoped
    (`--card-default-title-font-family` → `title-font-family`) instead of the bare
    `font-family` default, which silently merges multiple slots into one link tree.

    Mirrors the `flatMap`/loop pattern in ButtonEditor and RadioButtonEditor so
    editors don't have to hand-list 16+ near-identical Token entries. */
export function buildTypeGroupTokens(
  typeGroups: Record<string, TypeGroupConfig[]>,
  options: BuildTypeGroupTokensOptions = {},
): Token[] {
  const { groupKeyFor, component, variants } = options;
  const derive = component !== undefined || variants !== undefined;
  const tokens: Token[] = [];
  for (const groups of Object.values(typeGroups)) {
    for (const group of groups) {
      const colorToken: Token = { label: group.colorLabel ?? 'color', variable: group.colorVariable };
      if (group.colorGroupKey) colorToken.groupKey = group.colorGroupKey;
      else if (derive) colorToken.groupKey = structuralGroupKey(group.colorVariable, { component, variants });
      tokens.push(colorToken);
      for (const prop of TYPE_FONT_PROPS) {
        const variable = group[prop.key];
        if (!variable) continue;
        const groupKey = groupKeyFor
          ? groupKeyFor(prop, group)
          : derive
            ? structuralGroupKey(variable, { component, variants })
            : prop.defaultGroupKey;
        tokens.push({ label: prop.label, canBeLinked: true, groupKey, variable });
      }
    }
  }
  return tokens;
}

/** Color-only counterpart for editors that hand-roll their font-shape tokens (because
    they use a custom groupKey scheme) but still want their `colorVariable`s in
    `allTokens` — needed so the reset-button and the design-token resolution test see
    them. Accepts either the full `Record` shape or a flat group array, so it slots
    cleanly into both `Object.values(typeGroups).flat()` chains and per-variant
    `flatMap` constructions.

    groupKey precedence per group: explicit `group.colorGroupKey` > the second
    argument (`groupKeyFor` callback) > structural derivation (`{ component, variants }`).
    With none of these the color token is emitted without a groupKey (solo, no
    siblings) — the contract is explicit, there is no name-based inference. Pass
    `{ component, variants }` to group a slot's color across variants; structural
    derivation keeps several slots ending in the same word (SideNavigation's
    section / item / footer) distinct, so `editor color/font link-group parity`
    stays satisfied. */
export function buildTypeGroupColorTokens(
  typeGroups: Record<string, TypeGroupConfig[]> | TypeGroupConfig[],
  option?: ColorGroupKeyOption,
): Token[] {
  const groups: TypeGroupConfig[] = Array.isArray(typeGroups)
    ? typeGroups
    : Object.values(typeGroups).flat();
  const legacyFn = typeof option === 'function' ? option : undefined;
  const opts = typeof option === 'object' ? option : undefined;
  const groupKeyFor = legacyFn ?? opts?.groupKeyFor;
  const derive = opts && (opts.component !== undefined || opts.variants !== undefined);
  return groups.map((g) => {
    const groupKey = g.colorGroupKey
      ? g.colorGroupKey
      : groupKeyFor
        ? groupKeyFor(g)
        : derive
          ? structuralGroupKey(g.colorVariable, opts)
          : undefined;
    const token: Token = { label: g.colorLabel ?? 'color', variable: g.colorVariable };
    if (groupKey) token.groupKey = groupKey;
    return token;
  });
}

/** Font-only counterpart: the family/size/weight/line-height tokens for each group
    with slot-scoped, linkable groupKeys, but no color token. Use alongside
    `buildTypeGroupColorTokens` when a component wants its type-group colors and fonts
    emitted separately (e.g. Table keeps per-slot colors but a custom layout). Keys
    derive structurally from `{ component, variants }`; without a derivation they fall
    back to the bare `font-family`/`font-size`/… defaults. */
export function buildTypeGroupFontTokens(
  typeGroups: Record<string, TypeGroupConfig[]> | TypeGroupConfig[],
  options: BuildTypeGroupTokensOptions = {},
): Token[] {
  const { groupKeyFor, component, variants } = options;
  const derive = component !== undefined || variants !== undefined;
  const groups: TypeGroupConfig[] = Array.isArray(typeGroups)
    ? typeGroups
    : Object.values(typeGroups).flat();
  const tokens: Token[] = [];
  for (const group of groups) {
    for (const prop of TYPE_FONT_PROPS) {
      const variable = group[prop.key];
      if (!variable) continue;
      const groupKey = groupKeyFor
        ? groupKeyFor(prop, group)
        : derive
          ? structuralGroupKey(variable, { component, variants })
          : prop.defaultGroupKey;
      tokens.push({ label: prop.label, canBeLinked: true, groupKey, variable });
    }
  }
  return tokens;
}

/** Companion helper: derive a `linkableContexts` map mapping every typography variable in
    `typeGroups` to its state name. Use to build the linked-block context map without
    spelling out 16+ entries; merge with non-typography entries via spread. */
export function buildTypeGroupShareableContexts(
  typeGroups: Record<string, TypeGroupConfig[]>,
): Array<readonly [string, string]> {
  const entries: Array<readonly [string, string]> = [];
  for (const [stateName, groups] of Object.entries(typeGroups)) {
    for (const group of groups) {
      for (const prop of TYPE_FONT_PROPS) {
        const variable = group[prop.key];
        if (!variable) continue;
        entries.push([variable, stateName] as const);
      }
    }
  }
  return entries;
}
