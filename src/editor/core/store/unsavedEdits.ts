import { derived, type Readable } from 'svelte/store';
import { colorsAndTypeDirty, componentDirty } from './editorStore';
import { sketchOffTheme } from '../sketch/sketchStore';

/** The open theme differs from its saved file: colors and type, any component, or the sketch layer. */
export const unsavedEdits: Readable<boolean> = derived(
  [colorsAndTypeDirty, componentDirty, sketchOffTheme],
  ([$colorsAndType, $components, $sketch]) =>
    $colorsAndType || Object.values($components).some(Boolean) || $sketch,
);
