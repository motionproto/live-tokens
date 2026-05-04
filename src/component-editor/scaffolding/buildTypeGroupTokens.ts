import type { Token, TypeGroupConfig } from './types';

/** The four font-shape properties on a TypeGroupConfig that share-block sharing
    targets. Order is the canonical render order and the groupKey order. */
export const TYPE_FONT_PROPS = [
  { key: 'familyVariable', label: 'font family', defaultGroupKey: 'font-family' },
  { key: 'sizeVariable', label: 'font size', defaultGroupKey: 'font-size' },
  { key: 'weightVariable', label: 'font weight', defaultGroupKey: 'font-weight' },
  { key: 'lineHeightVariable', label: 'line height', defaultGroupKey: 'line-height' },
] as const satisfies ReadonlyArray<{
  key: keyof TypeGroupConfig;
  label: string;
  defaultGroupKey: string;
}>;

export type TypeFontProp = typeof TYPE_FONT_PROPS[number];

export type BuildTypeGroupTokensOptions = {
  /** Override the default groupKey per property. Receives the prop descriptor and the
      type-group config it came from. Return a stable string — siblings sharing the same
      groupKey are linked in the shared block. */
  groupKeyFor?: (prop: TypeFontProp, group: TypeGroupConfig) => string;
};

/** Derive the Token[] schema entries for the typography variables on every TypeGroupConfig
    in `typeGroups`. Each state's groups contribute up to 4 tokens (font-family/size/weight/
    line-height) wherever those variables are declared on the group; missing properties are
    skipped. The emitted tokens carry `canBeShared: true` and a stable `groupKey` so the
    shared-block linkage and "tokens.css declared" check both see them.

    Mirrors the `flatMap`/loop pattern in StandardButtonsEditor and RadioButtonEditor so
    editors don't have to hand-list 16+ near-identical Token entries. */
export function buildTypeGroupTokens(
  typeGroups: Record<string, TypeGroupConfig[]>,
  options: BuildTypeGroupTokensOptions = {},
): Token[] {
  const { groupKeyFor } = options;
  const tokens: Token[] = [];
  for (const groups of Object.values(typeGroups)) {
    for (const group of groups) {
      for (const prop of TYPE_FONT_PROPS) {
        const variable = group[prop.key];
        if (!variable) continue;
        const groupKey = groupKeyFor ? groupKeyFor(prop, group) : prop.defaultGroupKey;
        tokens.push({ label: prop.label, canBeShared: true, groupKey, variable });
      }
    }
  }
  return tokens;
}

/** Companion helper: derive a `shareableContexts` map mapping every typography variable in
    `typeGroups` to its state name. Use to build the shared-block context map without
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
