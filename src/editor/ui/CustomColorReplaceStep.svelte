<script module lang="ts">
  let replaceVarSeq = 0;
</script>

<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { get } from 'svelte/store';
  import {
    editorState,
    customColorUsages,
    describeCustomColorUsages,
    nearestColorToken,
  } from '../core/store/editorStore';
  import { setCssVar, removeCssVar } from '../core/cssVarSync';
  import type { Oklch } from '../core/palettes/oklch';
  import UIPaletteSelector from './UIPaletteSelector.svelte';
  import UIPillButton from './UIPillButton.svelte';

  interface Props {
    /** The custom colour that remove would delete. */
    variable: string;
    /** The colour the stand-in is chosen nearest to. */
    color: Oklch;
    onconfirm: (replacement: string) => void;
    oncancel: () => void;
  }

  let { variable, color, onconfirm, oncancel }: Props = $props();

  // The step is a snapshot of the theme at the moment remove was asked for;
  // the parent mounts a fresh step for each remove.
  const usages = untrack(() => customColorUsages(get(editorState), variable));
  const nearest = untrack(() => nearestColorToken(color, get(editorState), variable));
  let replacement = $state(nearest);
  let usageLine = $state(describeCustomColorUsages(usages, (id) => id));

  const replaceVar = `--__custom-replace-${++replaceVarSeq}`;
  // Written before the nested picker mounts, so it opens on the preselection.
  setCssVar(replaceVar, `var(${nearest})`);
  onDestroy(() => removeCssVar(replaceVar));

  // Loaded on demand: the registry imports every component editor, and those
  // editors import the picker that imports this step.
  import('../component-editor/registry').then(({ getComponentRegistry }) => {
    const registry = getComponentRegistry();
    usageLine = describeCustomColorUsages(usages, (id) => registry[id]?.label ?? id);
  });

  function write(value: string | null) {
    if (!value?.startsWith('--')) return;
    replacement = value;
    setCssVar(replaceVar, `var(${value})`);
  }
</script>

<div class="replace-step">
  <p class="replace-usage">{usageLine}</p>
  <div class="replace-pick">
    <span class="replace-label">Replace with</span>
    <div class="replace-picker">
      <UIPaletteSelector
        variable={replaceVar}
        replacing={variable}
        showNone={false}
        showOpacity={false}
        onwrite={write}
      />
    </div>
  </div>
  <div class="replace-actions">
    <UIPillButton size="compact" variant="primary" onclick={() => onconfirm(replacement)}>Replace and remove</UIPillButton>
    <UIPillButton size="compact" variant="outline" onclick={oncancel}>Cancel</UIPillButton>
  </div>
</div>

<style>
  .replace-step {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .replace-usage {
    margin: 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
  }

  .replace-pick {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .replace-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    flex-shrink: 0;
  }

  /* The nested picker lays itself out on its parent row's subgrid; this grid
     stands in for that row. */
  .replace-picker {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(3rem, 1fr) auto;
  }

  .replace-actions {
    display: flex;
    gap: var(--ui-space-6);
  }
</style>
