import type { Token, TypeGroupConfig } from './types';

export type Sibling = {
  name: string;
  label: string;
  states: Record<string, Token[]>;
  typeGroups?: Record<string, TypeGroupConfig[]>;
};

/** Build the `siblings` list a VariantGroup needs for its "Copy from" menu.
    Given the full variant list and per-variant token/typeGroup builders, returns
    every variant *except* `toVariant` shaped as a Sibling. */
export function buildSiblings<V extends string>(
  variants: readonly V[],
  toVariant: V,
  variantTokens: (v: V) => Token[],
  variantTypeGroups?: (v: V) => TypeGroupConfig[],
): Sibling[] {
  return variants
    .filter((v) => v !== toVariant)
    .map((v) => ({
      name: v,
      label: v.charAt(0).toUpperCase() + v.slice(1),
      states: { [v]: variantTokens(v) },
      typeGroups: variantTypeGroups ? { [v]: variantTypeGroups(v) } : undefined,
    }));
}
