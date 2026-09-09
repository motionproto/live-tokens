import type { Readable } from 'svelte/store';
import type { RegistryEntry } from '../component-editor/registry';
import type { EditorState } from '../core/store/editorTypes';

/**
 * The components route's dev-only window handle. It lives beside the page that
 * publishes it, not in the test tree, so the page typechecks from its own
 * source: `src/testing` ships in the tarball but a consumer runs `svelte-check`
 * over the page without it.
 */
export interface LiveTokensEditorHandle {
  editorState: Readable<EditorState>;
  mutate: (label: string, fn: (draft: EditorState) => void) => void;
  getComponentRegistryEntries: () => ReadonlyArray<RegistryEntry>;
  selectComponent: (id: string) => void;
  setSketch: (id: string | null) => void;
}

declare global {
  interface Window {
    __liveTokensEditor?: LiveTokensEditorHandle;
  }
}
