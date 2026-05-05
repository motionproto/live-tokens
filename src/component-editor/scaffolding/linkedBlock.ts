import { get } from 'svelte/store';
import {
  isComponentPropertyShared,
  getComponentPropertySiblings,
  editorState,
} from '../../lib/editorStore';
import type { CssVarRef } from '../../lib/editorTypes';
import type { Token } from './types';

function aliasKey(ref: CssVarRef | undefined): string {
  if (!ref) return '';
  return ref.kind === 'token' ? `t:${ref.name}` : `v:${ref.value}`;
}

/** `Token` enriched by the shared-block computation. The base fields are inherited from
    `Token`; the extra commentary on `mergeVariables` here is shared-block-specific. */
export interface SharedToken extends Token {
  /** Other groupKey lead variables whose current alias matches this row's. The row writes
      the same alias to each of these (and their siblings) so the merged display stays in sync. */
  mergeVariables?: string[];
}

export type SharedGroup = {
  token: SharedToken;
  /** Full set of contexts participating in this group (linked + broken), ordered by the
      caller's `shareableContexts` insertion order so the LinkageChart row order matches the
      variant tab strip. `brokenContexts` is a subset; the difference is currently linked. */
  contexts: string[];
  /** Subset of `contexts` whose alias has been overridden out of the shared group.
      Renders as broken cells in the LinkageChart so the historical relationship stays visible. */
  brokenContexts: string[];
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
 * Pass `$editorState` as the final argument so the call site subscribes and Svelte re-runs
 * the reactive statement when state changes. The argument itself is ignored:
 *
 *   $: shared = computeSharedBlock(component, shareableContexts, allTokens, $editorState);
 */
export function computeSharedBlock(
  component: string,
  shareableContexts: Map<string, string>,
  allTokens: SharedToken[],
  // Reactivity hook — see JSDoc. The runtime state is read via `get(store)` internally;
  // this parameter exists only so callers can pass `$editorState` to create the subscription.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _stateForReactivity?: unknown,
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
    const declaredPeers = rep.groupKey ? topologyByGroupKey.get(rep.groupKey) ?? [] : [];
    const mergePeers = declaredPeers.filter((v) => v !== variable && !siblings.includes(v));

    // Partition siblings by current alias. The "canonical" group is the most populous
    // alias bucket — that way overriding a single context flips it to broken instead of
    // making it look like the rest of the group walked away.
    const aliases = get(editorState).components[component]?.aliases ?? {};
    const buckets = new Map<string, string[]>();
    for (const s of siblings) {
      const k = aliasKey(aliases[s]);
      const arr = buckets.get(k) ?? [];
      arr.push(s);
      buckets.set(k, arr);
    }
    let canonicalKey = aliasKey(aliases[variable]);
    let canonicalSize = buckets.get(canonicalKey)?.length ?? 0;
    for (const [k, arr] of buckets) {
      if (arr.length > canonicalSize) {
        canonicalKey = k;
        canonicalSize = arr.length;
      }
    }
    const linkedSiblings = buckets.get(canonicalKey) ?? [];
    const divergedSiblings: string[] = [];
    for (const [k, arr] of buckets) {
      if (k !== canonicalKey) divergedSiblings.push(...arr);
    }

    // Build context lists in canonical (shareableContexts insertion) order so the
    // LinkageChart row order matches the variant tab strip the editor declared.
    const linkedSet = new Set(linkedSiblings);
    const brokenVarSet = new Set([...divergedSiblings, ...mergePeers]);
    const seenAll = new Set<string>();
    const seenBroken = new Set<string>();
    const ctxs: string[] = [];
    const brokenContexts: string[] = [];
    for (const [peer, ctx] of shareableContexts) {
      if (rep.groupKey && tokensByVar.get(peer)?.groupKey !== rep.groupKey) continue;
      const isLinked = linkedSet.has(peer);
      const isBroken = brokenVarSet.has(peer);
      if (!isLinked && !isBroken) continue;
      if (!seenAll.has(ctx)) {
        seenAll.add(ctx);
        ctxs.push(ctx);
      }
      if (isBroken && !seenBroken.has(ctx)) {
        seenBroken.add(ctx);
        brokenContexts.push(ctx);
      }
    }
    const tok: SharedToken = {
      ...rep,
      canBeShared: true,
      ...(mergePeers.length ? { mergeVariables: mergePeers } : {}),
    };
    groups.push({ token: tok, contexts: ctxs, brokenContexts, variables: siblings, shared: isShared });
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
