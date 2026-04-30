import { getContext, setContext } from 'svelte';
import { writable, type Writable, type Readable } from 'svelte/store';

const KEY = Symbol('editor-context');

export type EditorContext = {
  /** Currently-highlighted variables (e.g. all variables in a hovered shared group). */
  highlightedVars: Readable<Set<string>>;
  /** Per-variable rank used by TokenLayout to align shared rows; null when no shared block. */
  sharedOrder: Readable<Map<string, number> | null>;
  /** Set the hovered variable; scaffolding resolves group membership and updates highlightedVars. */
  setHovered: (variable: string | null) => void;
};

/** Internal mutable handle used by ComponentEditorBase. */
export type EditorContextInternal = EditorContext & {
  _highlights: Writable<Set<string>>;
  _sharedOrder: Writable<Map<string, number> | null>;
};

export function createEditorContext(): EditorContextInternal {
  const _highlights = writable<Set<string>>(new Set());
  const _sharedOrder = writable<Map<string, number> | null>(null);
  const ctx: EditorContextInternal = {
    highlightedVars: _highlights,
    sharedOrder: _sharedOrder,
    setHovered: () => {},
    _highlights,
    _sharedOrder,
  };
  setContext(KEY, ctx);
  return ctx;
}

export function getEditorContext(): EditorContext | undefined {
  return getContext(KEY);
}
