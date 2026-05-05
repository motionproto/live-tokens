/**
 * Components slice — per-component `{ activeFile, aliases, config, unlinked? }`.
 *
 * `aliases` are the typed component-token → semantic-token map (each entry is
 * a `CssVarRef` discriminated union: `{ kind: 'token', name }` or
 * `{ kind: 'literal', value }`). The renderer emits each alias entry as
 * `var(<name>)` for tokens or as the raw literal for literals.
 *
 * `config` carries literal-valued knobs that don't follow the alias →
 * `var(...)` shape (e.g. `--dialog-confirm-variant: 'primary'`). The set of
 * keys routed to config lives in `componentConfigKeys`.
 *
 * Themes and components are orthogonal: `loadFromFile` preserves
 * `state.components`.
 *
 * Sharing semantics: tokens with the same groupKey (registered explicitly
 * via `registerComponentSchema`, or inferred from the last-dash suffix)
 * are siblings. `setComponentAliasLinked` writes the same alias to every
 * sibling; `unlinkComponentProperty` flags a groupKey as independently
 * editable. The `unlinked` list lives on the slice so it persists across
 * theme loads.
 *
 * Dirty tracking: `savedComponents` is the on-disk snapshot baseline (one
 * stringified `{aliases, config}` bag per component). `componentDirty`
 * re-evaluates on any state change or baseline bump. The baseline is set
 * explicitly by the load path (`setSavedComponentBaseline`) — `loadComponentActive`
 * and `seedComponentsFromApi` in editorStore call into this from their migration
 * pipeline.
 */
import { writable, derived, get, type Readable } from 'svelte/store';
import type { CssVarRef, EditorState } from '../editorTypes';
import { store, mutate } from '../editorCore';

const EMPTY_COMPONENT_BASELINE = JSON.stringify({ aliases: {}, config: {} });

export function componentBaseline(slice: { aliases: Record<string, CssVarRef>; config: Record<string, unknown> }): string {
  return JSON.stringify({ aliases: slice.aliases, config: slice.config });
}

export function componentsToVars(components: EditorState['components']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slice of Object.values(components)) {
    for (const [varName, ref] of Object.entries(slice.aliases)) {
      out[varName] = ref.kind === 'token' ? `var(${ref.name})` : ref.value;
    }
  }
  return out;
}

export function getComponentOwnedVarNames(state: EditorState): string[] {
  const names: string[] = [];
  for (const slice of Object.values(state.components)) {
    for (const name of Object.keys(slice.aliases)) names.push(name);
  }
  return names;
}

/**
 * Loader: themes and components are orthogonal — component aliases live
 * in their own files, not the theme JSON. Preserve the current slice
 * across theme loads and strip any component-owned vars that may have
 * leaked into the theme's cssVariables bag. Mutates `next` and `rawVars`
 * in place.
 */
export function loadComponentsFromVars(
  next: EditorState,
  rawVars: Record<string, string>,
): void {
  next.components = structuredClone(get(store).components);
  for (const name of getComponentOwnedVarNames(next)) delete rawVars[name];
}

// Module-private baseline for per-component dirty detection. Parallels
// `savedAtIndex` + `historyTick` for the global flag; `componentSavedTick`
// drives re-derivation when the baseline changes.
const savedComponents: Record<string, string> = {};
const componentSavedTick = writable(0);
function bumpComponentSavedTick(): void { componentSavedTick.update((n) => n + 1); }

export const componentDirty: Readable<Record<string, boolean>> = derived(
  [store, componentSavedTick],
  ([$state]) => {
    const out: Record<string, boolean> = {};
    for (const [comp, slice] of Object.entries($state.components)) {
      out[comp] = componentBaseline(slice) !== (savedComponents[comp] ?? EMPTY_COMPONENT_BASELINE);
    }
    return out;
  },
);

export function setComponentAlias(component: string, varName: string, ref: CssVarRef): void {
  mutate(`set alias ${component}/${varName}`, (s) => {
    const existing = s.components[component];
    if (existing) {
      existing.aliases[varName] = ref;
    } else {
      s.components[component] = { activeFile: 'default', aliases: { [varName]: ref }, config: {} };
    }
  });
}

export function clearComponentAlias(component: string, varName: string): void {
  mutate(`clear alias ${component}/${varName}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    delete slice.aliases[varName];
  });
}

export function setComponentConfig(component: string, key: string, value: unknown): void {
  mutate(`set config ${component}/${key}`, (s) => {
    const existing = s.components[component];
    if (existing) {
      existing.config[key] = value;
    } else {
      s.components[component] = { activeFile: 'default', aliases: {}, config: { [key]: value } };
    }
  });
}

export function clearComponentConfig(component: string, key: string): void {
  mutate(`clear config ${component}/${key}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    delete slice.config[key];
  });
}

function componentVarPrefix(component: string): string {
  return `--${component}-`;
}

/**
 * Per-component groupKey schema registered by editor modules. Maps each
 * declared variable to its groupKey (the explicit sibling-set identifier).
 * Tokens with the same groupKey are siblings; tokens not in the schema fall
 * back to last-dash property inference so unmigrated editors keep working.
 */
const componentSchemas: Record<string, Map<string, string>> = {};

/**
 * Register a component's token → groupKey mapping. Editors call this at
 * module load (top of `<script>`) so sibling lookups can prefer explicit
 * groupKeys over name-derived inference. Re-registration overwrites prior
 * entries for the same component.
 */
export function registerComponentSchema(
  component: string,
  tokens: ReadonlyArray<{ variable: string; groupKey?: string }>,
): void {
  const map = new Map<string, string>();
  for (const t of tokens) {
    if (t.groupKey) map.set(t.variable, t.groupKey);
  }
  componentSchemas[component] = map;
}

/**
 * Resolve a variable's groupKey. Schema entries win; otherwise fall back to
 * the last-dash property suffix (legacy behaviour). Returns null when the
 * variable is not under the component prefix.
 */
function getGroupKey(component: string, varName: string): string | null {
  const schema = componentSchemas[component];
  const explicit = schema?.get(varName);
  if (explicit) return explicit;
  const prefix = componentVarPrefix(component);
  if (!varName.startsWith(prefix)) return null;
  const rest = varName.slice(prefix.length);
  const lastDash = rest.lastIndexOf('-');
  if (lastDash <= 0) return null;
  return rest.slice(lastDash + 1);
}

/**
 * All keys in the component slice that share `varName`'s groupKey.
 * Includes `varName` itself if it lives in the slice.
 */
export function getComponentPropertySiblings(component: string, varName: string): string[] {
  const groupKey = getGroupKey(component, varName);
  if (!groupKey) return [];
  const slice = get(store).components[component];
  if (!slice) return [];
  const siblings: string[] = [];
  for (const v of Object.keys(slice.aliases)) {
    if (getGroupKey(component, v) === groupKey) siblings.push(v);
  }
  return siblings;
}

function cssVarRefEqual(a: CssVarRef | undefined, b: CssVarRef | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind === 'token'
    ? a.name === (b as { kind: 'token'; name: string }).name
    : a.value === (b as { kind: 'literal'; value: string }).value;
}

/** True iff `varName` has ≥2 siblings, all resolve to the same alias, and the groupKey is not explicitly unlinked. */
export function isComponentPropertyLinked(component: string, varName: string): boolean {
  const slice = get(store).components[component];
  if (!slice) return false;
  const groupKey = getGroupKey(component, varName);
  if (groupKey && slice.unlinked?.includes(groupKey)) return false;
  const siblings = getComponentPropertySiblings(component, varName);
  if (siblings.length < 2) return false;
  const first = slice.aliases[siblings[0]];
  if (!first) return false;
  return siblings.every((v) => cssVarRefEqual(slice.aliases[v], first));
}

/** Write `ref` to every sibling that shares `varName`'s groupKey, and clear the unlinked flag. */
export function setComponentAliasLinked(component: string, varName: string, ref: CssVarRef): void {
  const groupKey = getGroupKey(component, varName);
  const siblings = getComponentPropertySiblings(component, varName);
  if (!groupKey || siblings.length === 0) {
    setComponentAlias(component, varName, ref);
    return;
  }
  mutate(`share ${component}/${groupKey}`, (s) => {
    const slice = s.components[component] ?? (s.components[component] = { activeFile: 'default', aliases: {}, config: {} });
    for (const v of siblings) slice.aliases[v] = ref;
    if (!siblings.includes(varName)) slice.aliases[varName] = ref;
    if (slice.unlinked) {
      slice.unlinked = slice.unlinked.filter((p) => p !== groupKey);
      if (slice.unlinked.length === 0) delete slice.unlinked;
    }
  });
}

/** Clear every sibling that shares `varName`'s groupKey. */
export function clearComponentAliasLinked(component: string, varName: string): void {
  const groupKey = getGroupKey(component, varName);
  const siblings = getComponentPropertySiblings(component, varName);
  if (!groupKey || siblings.length === 0) {
    clearComponentAlias(component, varName);
    return;
  }
  mutate(`clear linked ${component}/${groupKey}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    for (const v of siblings) delete slice.aliases[v];
  });
}

/** Mark `varName`'s groupKey as unlinked so siblings are independently editable. Aliases are preserved. */
export function unlinkComponentProperty(component: string, varName: string): void {
  const groupKey = getGroupKey(component, varName);
  if (!groupKey) return;
  const siblings = getComponentPropertySiblings(component, varName);
  if (siblings.length < 2) return;
  mutate(`unlink ${component}/${groupKey}`, (s) => {
    const slice = s.components[component];
    if (!slice) return;
    const unlinked = slice.unlinked ?? [];
    if (!unlinked.includes(groupKey)) {
      slice.unlinked = [...unlinked, groupKey];
    }
  });
}

export function markComponentSaved(component: string): void {
  const slice = get(store).components[component];
  if (!slice) return;
  savedComponents[component] = componentBaseline(slice);
  bumpComponentSavedTick();
}

/**
 * Set the on-disk baseline for a component without touching the store.
 * Called by `loadComponentActive` / `seedComponentsFromApi` after their
 * migration step so the post-load state reads clean.
 */
export function setSavedComponentBaseline(component: string, baseline: string): void {
  savedComponents[component] = baseline;
}

/** Notify subscribers that the dirty baseline changed. */
export function notifyComponentSavedChanged(): void {
  bumpComponentSavedTick();
}

/** Test-only: clear the baseline and the dirty signal. */
export function __resetComponentsForTests(): void {
  for (const k of Object.keys(savedComponents)) delete savedComponents[k];
  bumpComponentSavedTick();
}
