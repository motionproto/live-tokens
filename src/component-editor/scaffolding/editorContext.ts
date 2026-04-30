import { getContext, setContext } from 'svelte';
import { writable, type Writable, type Readable } from 'svelte/store';

const KEY = Symbol('editor-context');

export type EditorContext = {
  /** Per-variable rank used by TokenLayout to align shared rows; null when no shared block. */
  sharedOrder: Readable<Map<string, number> | null>;
};

/** Internal mutable handle used by ComponentEditorBase. */
export type EditorContextInternal = EditorContext & {
  _sharedOrder: Writable<Map<string, number> | null>;
};

export function createEditorContext(): EditorContextInternal {
  const _sharedOrder = writable<Map<string, number> | null>(null);
  const ctx: EditorContextInternal = {
    sharedOrder: _sharedOrder,
    _sharedOrder,
  };
  setContext(KEY, ctx);
  return ctx;
}

export function getEditorContext(): EditorContext | undefined {
  return getContext(KEY);
}
