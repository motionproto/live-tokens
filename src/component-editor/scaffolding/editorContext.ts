import { getContext, setContext } from 'svelte';
import { writable, type Writable, type Readable } from 'svelte/store';

const KEY = Symbol('editor-context');

export type ViewMode = 'list' | 'tabs';

export type EditorContext = {
  /** Per-variable rank used by TokenLayout to align linked rows; null when no linked block. */
  linkedOrder: Readable<Map<string, number> | null>;
  /** True when this editor opted into the List/Tabs view toggle in its header. */
  tabbable: Readable<boolean>;
  /** Current view mode; honored by every multi-state VariantGroup whose editor is tabbable. */
  viewMode: Writable<ViewMode>;
  /** In tabs mode, the variant currently focused in the preview. Null = list mode (all variants visible). */
  focusedVariant: Writable<string | null>;
  /** Cross-group hint for which state tab to activate. VariantGroups whose `stateNames`
      contain the value adopt it as their `activeTab`; others ignore it. Used to forward
      LinkageChart row clicks to the state tab strip when the chart spans states. */
  focusedState: Writable<string | null>;
};

/** Internal mutable handle used by ComponentEditorBase. */
export type EditorContextInternal = EditorContext & {
  _linkedOrder: Writable<Map<string, number> | null>;
  _tabbable: Writable<boolean>;
};

export function createEditorContext(): EditorContextInternal {
  const _linkedOrder = writable<Map<string, number> | null>(null);
  const _tabbable = writable(false);
  const viewMode = writable<ViewMode>('tabs');
  const focusedVariant = writable<string | null>(null);
  const focusedState = writable<string | null>(null);
  const ctx: EditorContextInternal = {
    linkedOrder: _linkedOrder,
    tabbable: _tabbable,
    viewMode,
    focusedVariant,
    focusedState,
    _linkedOrder,
    _tabbable,
  };
  setContext(KEY, ctx);
  return ctx;
}

export function getEditorContext(): EditorContext | undefined {
  return getContext(KEY);
}
