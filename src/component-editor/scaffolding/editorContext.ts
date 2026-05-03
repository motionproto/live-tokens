import { getContext, setContext } from 'svelte';
import { writable, type Writable, type Readable } from 'svelte/store';

const KEY = Symbol('editor-context');

export type ViewMode = 'list' | 'tabs';

export type EditorContext = {
  /** Per-variable rank used by TokenLayout to align shared rows; null when no shared block. */
  sharedOrder: Readable<Map<string, number> | null>;
  /** True when this editor opted into the List/Tabs view toggle in its header. */
  tabbable: Readable<boolean>;
  /** Current view mode; honored by every multi-state VariantGroup whose editor is tabbable. */
  viewMode: Writable<ViewMode>;
  /** In tabs mode, the variant currently focused in the preview. Null = list mode (all variants visible). */
  focusedVariant: Writable<string | null>;
};

/** Internal mutable handle used by ComponentEditorBase. */
export type EditorContextInternal = EditorContext & {
  _sharedOrder: Writable<Map<string, number> | null>;
  _tabbable: Writable<boolean>;
};

export function createEditorContext(): EditorContextInternal {
  const _sharedOrder = writable<Map<string, number> | null>(null);
  const _tabbable = writable(false);
  const viewMode = writable<ViewMode>('tabs');
  const focusedVariant = writable<string | null>(null);
  const ctx: EditorContextInternal = {
    sharedOrder: _sharedOrder,
    tabbable: _tabbable,
    viewMode,
    focusedVariant,
    _sharedOrder,
    _tabbable,
  };
  setContext(KEY, ctx);
  return ctx;
}

export function getEditorContext(): EditorContext | undefined {
  return getContext(KEY);
}
