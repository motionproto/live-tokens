import { get } from 'svelte/store';
import {
  isComponentPropertyLinked,
  getComponentPropertySiblings,
  editorState,
} from '../../lib/editorStore';
import type { CssVarRef } from '../../lib/editorTypes';
import type { Token } from './types';

function aliasKey(ref: CssVarRef | undefined): string {
  if (!ref) return '';
  return ref.kind === 'token' ? `t:${ref.name}` : `v:${ref.value}`;
}

/** `Token` enriched by the linked-block computation. The base fields are inherited from
    `Token`; the extra commentary on `mergeVariables` here is linked-block-specific. */
export interface LinkedToken extends Token {
  /** Other groupKey lead variables whose current alias matches this row's. The row writes
      the same alias to each of these (and their siblings) so the merged display stays in sync. */
  mergeVariables?: string[];
}

export type LinkedGroup = {
  token: LinkedToken;
  /** Full set of contexts participating in this group (linked + broken), ordered by the
      caller's `linkableContexts` insertion order so the LinkageChart row order matches the
      variant tab strip. `brokenContexts` is a subset; the difference is currently linked. */
  contexts: string[];
  /** Subset of `contexts` whose alias has been overridden out of the linked group.
      Renders as broken cells in the LinkageChart so the historical relationship stays visible. */
  brokenContexts: string[];
  variables: string[];
  linked: boolean;
};

export type LinkedBlockResult = {
  groups: LinkedGroup[];
  varSet: Set<string>;
  contextsByVar: Record<string, string[]>;
  linkedOrder: Map<string, number>;
};

/**
 * Compute linked-block groups for the given component.
 * Each entry in `linkableContexts` maps a representative variable to a context label.
 * A group is formed when ≥2 sibling variables (same component, same groupKey) exist.
 *
 * Reads editor state internally via `getComponentPropertySiblings` (which `get`s the store).
 * Pass `$editorState` as the final argument so the call site subscribes and Svelte re-runs
 * the reactive statement when state changes. The argument itself is ignored:
 *
 *   $: linked = computeLinkedBlock(component, linkableContexts, allTokens, $editorState);
 */
export function computeLinkedBlock(
  component: string,
  linkableContexts: Map<string, string>,
  allTokens: LinkedToken[],
  // Reactivity hook — see JSDoc. The runtime state is read via `get(store)` internally;
  // this parameter exists only so callers can pass `$editorState` to create the subscription.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _stateForReactivity?: unknown,
): LinkedBlockResult {
  const groups: LinkedGroup[] = [];
  const varSet = new Set<string>();
  const seen = new Set<string>();
  const seenGroupKeys = new Set<string>();
  const tokensByVar = new Map(allTokens.map((t) => [t.variable, t]));

  // Topology peers per groupKey (everything the editor declared as part of one sharing set).
  // Used to mirror writes from a row's lead onto sibling variables that aren't yet in the
  // slice, so a single user change propagates to the full declared topology.
  const topologyByGroupKey = new Map<string, string[]>();
  for (const [variable] of linkableContexts) {
    const gk = tokensByVar.get(variable)?.groupKey;
    if (!gk) continue;
    const list = topologyByGroupKey.get(gk) ?? [];
    list.push(variable);
    topologyByGroupKey.set(gk, list);
  }

  for (const [variable] of linkableContexts) {
    if (seen.has(variable)) continue;
    const rep = tokensByVar.get(variable);
    if (!rep) continue;
    if (rep.groupKey && seenGroupKeys.has(rep.groupKey)) continue;
    const siblings = getComponentPropertySiblings(component, variable);
    if (siblings.length < 2) continue;
    for (const s of siblings) seen.add(s);
    if (rep.groupKey) {
      seenGroupKeys.add(rep.groupKey);
      // Mark every other declared peer in linkableContexts as seen so they don't spawn dupe groups
      // when the slice covers only a subset of the declared topology.
      for (const peer of topologyByGroupKey.get(rep.groupKey) ?? []) seen.add(peer);
    }

    const propertyLinked = isComponentPropertyLinked(component, variable);
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

    // Build context lists in canonical (linkableContexts insertion) order so the
    // LinkageChart row order matches the variant tab strip the editor declared.
    const linkedSet = new Set(linkedSiblings);
    const brokenVarSet = new Set([...divergedSiblings, ...mergePeers]);
    const seenAll = new Set<string>();
    const seenBroken = new Set<string>();
    const ctxs: string[] = [];
    const brokenContexts: string[] = [];
    for (const [peer, ctx] of linkableContexts) {
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
    const tok: LinkedToken = {
      ...rep,
      canBeLinked: true,
      ...(mergePeers.length ? { mergeVariables: mergePeers } : {}),
    };
    groups.push({ token: tok, contexts: ctxs, brokenContexts, variables: siblings, linked: propertyLinked });
    if (propertyLinked) for (const s of siblings) varSet.add(s);
  }

  const contextsByVar = Object.fromEntries(groups.map((g) => [g.token.variable, g.contexts]));
  const linkedOrder = new Map<string, number>(
    groups.flatMap((g, i) => [
      [g.token.variable, i] as const,
      ...g.variables.map((v) => [v, i] as const),
    ]),
  );

  return { groups, varSet, contextsByVar, linkedOrder };
}

export function withLinkedDisabled<T extends { variable: string }>(tokens: T[], linked: Set<string>): (T & { disabled?: boolean })[] {
  return tokens.map((t) => (linked.has(t.variable) ? { ...t, disabled: true } : t));
}
