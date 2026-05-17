import { getContext, setContext } from 'svelte';
import { writable, type Writable, type Readable } from 'svelte/store';

const KEY = Symbol('editor-context');

export type EditorContext = {
  /** Per-variable rank used by TokenLayout to align linked rows; null when no linked block. */
  linkedOrder: Readable<Map<string, number> | null>;
  /** Variant currently focused in the preview when multiple sibling variants exist. */
  focusedVariant: Writable<string | null>;
  /** Cross-group hint for which state tab to activate. VariantGroups whose `stateNames`
      contain the value adopt it as their `activeTab`; others ignore it. Used to forward
      LinkageChart row clicks to the state tab strip when the chart spans states. */
  focusedState: Writable<string | null>;
  /** Variable currently hovered in either the per-state Properties grid or the
      Linked-properties block. Bidirectional cue: a hover in one surface lights up
      the matching row in the other so the user can see the linkage at a glance. */
  hoveredLinkedVariable: Writable<string | null>;
};

/** Internal mutable handle used by ComponentEditorBase. */
export type EditorContextInternal = EditorContext & {
  _linkedOrder: Writable<Map<string, number> | null>;
};

export function createEditorContext(): EditorContextInternal {
  const _linkedOrder = writable<Map<string, number> | null>(null);
  const focusedVariant = writable<string | null>(null);
  const focusedState = writable<string | null>(null);
  const hoveredLinkedVariable = writable<string | null>(null);
  const ctx: EditorContextInternal = {
    linkedOrder: _linkedOrder,
    focusedVariant,
    focusedState,
    hoveredLinkedVariable,
    _linkedOrder,
  };
  setContext(KEY, ctx);
  return ctx;
}

export function getEditorContext(): EditorContext | undefined {
  return getContext(KEY);
}
