import {
  isComponentPropertyShared,
  getComponentPropertySiblings,
} from '../../lib/editorStore';
import type { EditorState } from '../../lib/editorTypes';

export type SharedToken = {
  label: string;
  variable: string;
  canBeShared?: boolean;
  groupKey?: string;
  hidden?: boolean;
  disabled?: boolean;
  /** Other groupKey lead variables whose current alias matches this row's. The row writes
      the same alias to each of these (and their siblings) so the merged display stays in sync. */
  mergeVariables?: string[];
};

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
 * Pass `$editorState` to make the caller's reactive statement re-run when state changes.
 */
export function computeSharedBlock(
  component: string,
  shareableContexts: Map<string, string>,
  allTokens: SharedToken[],
  _state: EditorState,
): SharedBlockResult {
  void _state;
  const groups: SharedGroup[] = [];
  const varSet = new Set<string>();
  const seen = new Set<string>();

  for (const [variable] of shareableContexts) {
    if (seen.has(variable)) continue;
    const siblings = getComponentPropertySiblings(component, variable);
    if (siblings.length < 2) continue;
    for (const s of siblings) seen.add(s);

    const rep = allTokens.find((t) => t.variable === variable);
    if (!rep) continue;

    const isShared = isComponentPropertyShared(component, variable);
    const ctxs = [
      ...new Set(siblings.map((s) => shareableContexts.get(s)).filter((c): c is string => !!c)),
    ];
    groups.push({ token: { ...rep, canBeShared: true }, contexts: ctxs, variables: siblings, shared: isShared });
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
