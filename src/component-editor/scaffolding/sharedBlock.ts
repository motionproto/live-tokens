import {
  isComponentPropertyShared,
  getComponentPropertySiblings,
} from '../../lib/editorStore';
import type { Token } from './types';

/** `Token` enriched by the shared-block computation. The base fields are inherited from
    `Token`; the extra commentary on `mergeVariables` here is shared-block-specific. */
export interface SharedToken extends Token {
  /** Other groupKey lead variables whose current alias matches this row's. The row writes
      the same alias to each of these (and their siblings) so the merged display stays in sync. */
  mergeVariables?: string[];
}

export type SharedGroup = {
  token: SharedToken;
  contexts: string[];
  variables: string[];
  shared: boolean;
};

export type SharedBlockResult = {
  groups: SharedGroup[];
  varSet: Set<string>;
  contextsByVar: Record<string, string[]>;
  sharedOrder: Map<string, number>;
};

/**
 * Compute shared-block groups for the given component.
 * Each entry in `shareableContexts` maps a representative variable to a context label.
 * A group is formed when ≥2 sibling variables (same component, same groupKey) exist.
 *
 * Reads editor state internally via `getComponentPropertySiblings` (which `get`s the store).
 * Reactivity is the caller's responsibility: do `$: shared = computeSharedBlock(...);
 * void $editorState;` so the reactive statement re-runs when state changes.
 */
export function computeSharedBlock(
  component: string,
  shareableContexts: Map<string, string>,
  allTokens: SharedToken[],
): SharedBlockResult {
  const groups: SharedGroup[] = [];
  const varSet = new Set<string>();
  const seen = new Set<string>();
  const seenGroupKeys = new Set<string>();
  const tokensByVar = new Map(allTokens.map((t) => [t.variable, t]));

  // Topology peers per groupKey (everything the editor declared as part of one sharing set).
  // Used to mirror writes from a row's lead onto sibling variables that aren't yet in the
  // slice, so a single user change propagates to the full declared topology.
  const topologyByGroupKey = new Map<string, string[]>();
  for (const [variable] of shareableContexts) {
    const gk = tokensByVar.get(variable)?.groupKey;
    if (!gk) continue;
    const list = topologyByGroupKey.get(gk) ?? [];
    list.push(variable);
    topologyByGroupKey.set(gk, list);
  }

  for (const [variable] of shareableContexts) {
    if (seen.has(variable)) continue;
    const rep = tokensByVar.get(variable);
    if (!rep) continue;
    if (rep.groupKey && seenGroupKeys.has(rep.groupKey)) continue;
    const siblings = getComponentPropertySiblings(component, variable);
    if (siblings.length < 2) continue;
    for (const s of siblings) seen.add(s);
    if (rep.groupKey) {
      seenGroupKeys.add(rep.groupKey);
      // Mark every other declared peer in shareableContexts as seen so they don't spawn dupe groups
      // when the slice covers only a subset of the declared topology.
      for (const peer of topologyByGroupKey.get(rep.groupKey) ?? []) seen.add(peer);
    }

    const isShared = isComponentPropertyShared(component, variable);
    const ctxs = [
      ...new Set(siblings.map((s) => shareableContexts.get(s)).filter((c): c is string => !!c)),
    ];
    const declaredPeers = rep.groupKey ? topologyByGroupKey.get(rep.groupKey) ?? [] : [];
    const mergePeers = declaredPeers.filter((v) => v !== variable && !siblings.includes(v));
    const tok: SharedToken = {
      ...rep,
      canBeShared: true,
      ...(mergePeers.length ? { mergeVariables: mergePeers } : {}),
    };
    groups.push({ token: tok, contexts: ctxs, variables: siblings, shared: isShared });
    if (isShared) for (const s of siblings) varSet.add(s);
  }

  const contextsByVar = Object.fromEntries(groups.map((g) => [g.token.variable, g.contexts]));
  const sharedOrder = new Map<string, number>(
    groups.flatMap((g, i) => [
      [g.token.variable, i] as const,
      ...g.variables.map((v) => [v, i] as const),
    ]),
  );

  return { groups, varSet, contextsByVar, sharedOrder };
}

export function withSharedDisabled<T extends { variable: string }>(tokens: T[], shared: Set<string>): (T & { disabled?: boolean })[] {
  return tokens.map((t) => (shared.has(t.variable) ? { ...t, disabled: true } : t));
}
