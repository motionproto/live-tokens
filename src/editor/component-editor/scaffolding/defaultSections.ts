import type { ComponentSection } from './componentSectionType';
import { getComponentRegistryEntries } from '../registry';

/**
 * Default editor sections — derived from the merged component registry. Each
 * section's `id` is the canonical lowercase component id (matches the runtime
 * filename, server scan, and `setComponentAlias` key); `label` is the display
 * string; `component` is the editor Svelte component.
 *
 * Recomputed on each call so consumer-registered components (added via
 * `registerComponent()`) appear after the first-party set in iteration order.
 *
 * To add or reorder first-party sections, edit `src/editor/component-editor/registry.ts`.
 */
export function getDefaultSections(): ComponentSection[] {
  return getComponentRegistryEntries().map((entry) => ({
    id: entry.id,
    label: entry.label,
    component: entry.editorComponent,
  }));
}
