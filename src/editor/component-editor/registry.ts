import type { Component } from 'svelte';
import type { Token } from './scaffolding/types';
import { registerComponentSchema } from '../core/store/editorStore';

import BadgeEditor, { allTokens as badgeTokens } from './BadgeEditor.svelte';
import CalloutEditor, { allTokens as calloutTokens } from './CalloutEditor.svelte';
import CornerBadgeEditor, { allTokens as cornerBadgeTokens } from './CornerBadgeEditor.svelte';
import ButtonEditor, { allTokens as buttonTokens } from './ButtonEditor.svelte';
import CardEditor, { allTokens as cardTokens } from './CardEditor.svelte';
import CollapsibleSectionEditor, { allTokens as collapsibleSectionTokens } from './CollapsibleSectionEditor.svelte';
import DialogEditor, { allTokens as dialogTokens } from './DialogEditor.svelte';
import ImageEditor, { allTokens as imageTokens } from './ImageEditor.svelte';
import InlineEditActionsEditor, { allTokens as inlineEditActionsTokens } from './InlineEditActionsEditor.svelte';
import InputEditor, { allTokens as inputTokens } from './InputEditor.svelte';
import MenuSelectEditor, { allTokens as menuSelectTokens } from './MenuSelectEditor.svelte';
import NotificationEditor, { allTokens as notificationTokens } from './NotificationEditor.svelte';
import ProgressBarEditor, { allTokens as progressBarTokens } from './ProgressBarEditor.svelte';
import RadioButtonEditor, { allTokens as radioButtonTokens } from './RadioButtonEditor.svelte';
import SectionDividerEditor, { allTokens as sectionDividerTokens } from './SectionDividerEditor.svelte';
import SegmentedControlEditor, { allTokens as segmentedControlTokens } from './SegmentedControlEditor.svelte';
import SideNavigationEditor, { allTokens as sideNavigationTokens } from './SideNavigationEditor.svelte';
import TableEditor, { allTokens as tableTokens } from './TableEditor.svelte';
import TabBarEditor, { allTokens as tabBarTokens } from './TabBarEditor.svelte';
import TooltipEditor, { allTokens as tooltipTokens } from './TooltipEditor.svelte';

/** Internal narrowed union of the first-party component ids. Not exposed publicly. */
type BuiltInComponentId =
  | 'segmentedcontrol'
  | 'button'
  | 'notification'
  | 'dialog'
  | 'radiobutton'
  | 'card'
  | 'badge'
  | 'callout'
  | 'cornerbadge'
  | 'image'
  | 'inlineeditactions'
  | 'input'
  | 'menuselect'
  | 'sectiondivider'
  | 'collapsiblesection'
  | 'sidenavigation'
  | 'table'
  | 'tabbar'
  | 'tooltip'
  | 'progressbar';

/**
 * Public component id type. Widened to `string` because consumers can register
 * their own components at runtime via `registerComponent()`. Internal code that
 * needs to narrow to first-party ids can reference `BuiltInComponentId`.
 */
export type ComponentId = string;

export interface RegistryEntry {
  /** Canonical id — lowercase, matches the runtime component filename + server scan + `setComponentAlias` key. */
  id: ComponentId;
  /** Human-readable label for nav and section headers. */
  label: string;
  /** FontAwesome icon class for the nav rail. */
  icon: string;
  /** Path to the runtime component, relative to repo root. */
  sourceFile: string;
  /** The Svelte editor component to mount in the page. */
  editorComponent: Component<any, any, any>;
  /** Flat token list — the editor's declarative description of its token surface. */
  schema: Token[];
  /** `'system'` for first-party entries; `'custom'` for entries added via `registerComponent()`. */
  origin: 'system' | 'custom';
}

/**
 * First-party registry. Frozen; runtime additions go in `customRegistry`.
 * Adding a first-party component:
 *   1. Author `src/system/components/<Name>.svelte` (declares CSS vars in `:global(:root)`)
 *   2. Author `src/editor/component-editor/<Name>Editor.svelte` (exports `allTokens`)
 *   3. Add an entry below.
 */
const builtInRegistry: Readonly<Record<BuiltInComponentId, RegistryEntry>> = Object.freeze({
  segmentedcontrol: {
    id: 'segmentedcontrol',
    label: 'Segmented Control',
    icon: 'fas fa-hand-pointer',
    sourceFile: 'src/system/components/SegmentedControl.svelte',
    editorComponent: SegmentedControlEditor,
    schema: segmentedControlTokens,
    origin: 'system',
  },
  button: {
    id: 'button',
    label: 'Button',
    icon: 'fas fa-square',
    sourceFile: 'src/system/components/Button.svelte',
    editorComponent: ButtonEditor,
    schema: buttonTokens,
    origin: 'system',
  },
  notification: {
    id: 'notification',
    label: 'Notification',
    icon: 'fas fa-bell',
    sourceFile: 'src/system/components/Notification.svelte',
    editorComponent: NotificationEditor,
    schema: notificationTokens,
    origin: 'system',
  },
  dialog: {
    id: 'dialog',
    label: 'Dialog',
    icon: 'fas fa-window-restore',
    sourceFile: 'src/system/components/Dialog.svelte',
    editorComponent: DialogEditor,
    schema: dialogTokens,
    origin: 'system',
  },
  radiobutton: {
    id: 'radiobutton',
    label: 'Radio Button',
    icon: 'fas fa-dot-circle',
    sourceFile: 'src/system/components/RadioButton.svelte',
    editorComponent: RadioButtonEditor,
    schema: radioButtonTokens,
    origin: 'system',
  },
  card: {
    id: 'card',
    label: 'Card',
    icon: 'fas fa-id-card',
    sourceFile: 'src/system/components/Card.svelte',
    editorComponent: CardEditor,
    schema: cardTokens,
    origin: 'system',
  },
  badge: {
    id: 'badge',
    label: 'Badge',
    icon: 'fas fa-tag',
    sourceFile: 'src/system/components/Badge.svelte',
    editorComponent: BadgeEditor,
    schema: badgeTokens,
    origin: 'system',
  },
  callout: {
    id: 'callout',
    label: 'Callout',
    icon: 'fas fa-quote-left',
    sourceFile: 'src/system/components/Callout.svelte',
    editorComponent: CalloutEditor,
    schema: calloutTokens,
    origin: 'system',
  },
  cornerbadge: {
    id: 'cornerbadge',
    label: 'Corner Badge',
    icon: 'fas fa-tags',
    sourceFile: 'src/system/components/CornerBadge.svelte',
    editorComponent: CornerBadgeEditor,
    schema: cornerBadgeTokens,
    origin: 'system',
  },
  image: {
    id: 'image',
    label: 'Image',
    icon: 'fas fa-image',
    sourceFile: 'src/system/components/Image.svelte',
    editorComponent: ImageEditor,
    schema: imageTokens,
    origin: 'system',
  },
  inlineeditactions: {
    id: 'inlineeditactions',
    label: 'Inline Edit Actions',
    icon: 'fas fa-pen',
    sourceFile: 'src/system/components/InlineEditActions.svelte',
    editorComponent: InlineEditActionsEditor,
    schema: inlineEditActionsTokens,
    origin: 'system',
  },
  input: {
    id: 'input',
    label: 'Input',
    icon: 'fas fa-i-cursor',
    sourceFile: 'src/system/components/Input.svelte',
    editorComponent: InputEditor,
    schema: inputTokens,
    origin: 'system',
  },
  menuselect: {
    id: 'menuselect',
    label: 'Menu Select',
    icon: 'fas fa-list',
    sourceFile: 'src/system/components/MenuSelect.svelte',
    editorComponent: MenuSelectEditor,
    schema: menuSelectTokens,
    origin: 'system',
  },
  sectiondivider: {
    id: 'sectiondivider',
    label: 'Section Divider',
    icon: 'fas fa-minus',
    sourceFile: 'src/system/components/SectionDivider.svelte',
    editorComponent: SectionDividerEditor,
    schema: sectionDividerTokens,
    origin: 'system',
  },
  collapsiblesection: {
    id: 'collapsiblesection',
    label: 'Collapsible Section',
    icon: 'fas fa-chevron-down',
    sourceFile: 'src/system/components/CollapsibleSection.svelte',
    editorComponent: CollapsibleSectionEditor,
    schema: collapsibleSectionTokens,
    origin: 'system',
  },
  sidenavigation: {
    id: 'sidenavigation',
    label: 'Side Navigation',
    icon: 'fas fa-bars-staggered',
    sourceFile: 'src/system/components/SideNavigation.svelte',
    editorComponent: SideNavigationEditor,
    schema: sideNavigationTokens,
    origin: 'system',
  },
  table: {
    id: 'table',
    label: 'Table',
    icon: 'fas fa-table',
    sourceFile: 'src/system/components/Table.svelte',
    editorComponent: TableEditor,
    schema: tableTokens,
    origin: 'system',
  },
  tabbar: {
    id: 'tabbar',
    label: 'Tab Bar',
    icon: 'fas fa-columns',
    sourceFile: 'src/system/components/TabBar.svelte',
    editorComponent: TabBarEditor,
    schema: tabBarTokens,
    origin: 'system',
  },
  tooltip: {
    id: 'tooltip',
    label: 'Tooltip',
    icon: 'fas fa-comment-dots',
    sourceFile: 'src/system/components/Tooltip.svelte',
    editorComponent: TooltipEditor,
    schema: tooltipTokens,
    origin: 'system',
  },
  progressbar: {
    id: 'progressbar',
    label: 'Progress Bar',
    icon: 'fas fa-tasks',
    sourceFile: 'src/system/components/ProgressBar.svelte',
    editorComponent: ProgressBarEditor,
    schema: progressBarTokens,
    origin: 'system',
  },
});

/** Mutable map of consumer-registered components, populated by `registerComponent()`. */
const customRegistry = new Map<string, RegistryEntry>();

/** Argument shape for `registerComponent()`. `origin` is set internally to `'custom'`. */
export type RegisterComponentEntry = Omit<RegistryEntry, 'origin'>;

/**
 * Register a consumer-authored component at runtime. Call from `main.ts`
 * before app mount.
 *
 * Collision rule: if `entry.id` matches a built-in id, a warning is logged and
 * the custom entry wins (the custom editor and schema replace the built-in for
 * the rest of the session).
 *
 * Side effect: registers the schema with the editor store so reset-to-default
 * and sibling-group resolution work for the new component.
 */
export function registerComponent(entry: RegisterComponentEntry): void {
  if (entry.id in builtInRegistry) {
    console.warn(
      `[registerComponent] custom component "${entry.id}" overrides a built-in. The custom editor will be used.`,
    );
  }
  const stored: RegistryEntry = { ...entry, origin: 'custom' };
  customRegistry.set(entry.id, stored);
  registerComponentSchema(entry.id, entry.schema);
}

/**
 * Merged registry: built-ins overlaid with customs (custom wins on id collision).
 * Recomputed on each call so callers see runtime registrations made after their
 * own module-load order.
 */
export function getComponentRegistry(): Readonly<Record<string, RegistryEntry>> {
  const merged: Record<string, RegistryEntry> = { ...builtInRegistry };
  for (const [id, entry] of customRegistry) {
    merged[id] = entry;
  }
  return merged;
}

/**
 * Display-ordered entries: system first (alphabetical by label), then custom
 * (alphabetical by label). Iteration order matches the nav rail's grouping.
 * The nav rail renders a divider between the two groups when customs exist.
 */
export function getComponentRegistryEntries(): ReadonlyArray<RegistryEntry> {
  const merged = getComponentRegistry();
  const system: RegistryEntry[] = [];
  const custom: RegistryEntry[] = [];
  for (const entry of Object.values(merged)) {
    (entry.origin === 'system' ? system : custom).push(entry);
  }
  system.sort((a, b) => a.label.localeCompare(b.label));
  custom.sort((a, b) => a.label.localeCompare(b.label));
  return [...system, ...custom];
}

/** All component ids, in display order. */
export function getComponentIds(): ReadonlyArray<string> {
  return getComponentRegistryEntries().map((e) => e.id);
}

// Eager schema registration for built-ins. Customs register lazily inside
// `registerComponent()` so the store knows about every component before any
// editor instance mounts.
for (const entry of Object.values(builtInRegistry)) {
  registerComponentSchema(entry.id, entry.schema);
}

/**
 * Validate that the server's filesystem scan matches the merged registry's id list.
 * Logs a warning when ids drift. Called at boot from the editor page.
 */
export function validateRegistryAgainstServerScan(serverIds: ReadonlyArray<string>): void {
  const ids = getComponentIds();
  const registrySet = new Set<string>(ids);
  const serverSet = new Set<string>(serverIds);
  const missingOnServer = ids.filter((id) => !serverSet.has(id));
  const extraOnServer = serverIds.filter((id) => !registrySet.has(id));
  if (missingOnServer.length > 0) {
    console.warn(
      '[componentRegistry] registered components missing from server scan:',
      missingOnServer.join(', '),
    );
  }
  if (extraOnServer.length > 0) {
    console.warn(
      '[componentRegistry] components on disk not in registry (will be ignored by editor):',
      extraOnServer.join(', '),
    );
  }
}
