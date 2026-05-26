<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { self } from 'svelte/legacy';
  import UIRadio from './UIRadio.svelte';

  type Candidate = { variable: string; alias: string };

  interface Props {
    candidates: Candidate[];
    /** Variable whose lock was clicked — its alias is the default selection. */
    initialVariable: string;
    /** Component prefix to strip when rendering source labels. */
    prefixToStrip?: string;
    onconfirm?: (payload: { alias: string }) => void;
    oncancel?: () => void;
  }

  let { candidates, initialVariable, prefixToStrip = '', onconfirm, oncancel }: Props = $props();

  type Option = { alias: string; sources: string[] };

  function distinctOptions(list: Candidate[], initial: string): Option[] {
    const ordered = [...list].sort((a, b) =>
      a.variable === initial ? -1 : b.variable === initial ? 1 : 0,
    );
    const seen = new Map<string, Option>();
    for (const c of ordered) {
      const label = prefixToStrip && c.variable.startsWith(prefixToStrip)
        ? c.variable.slice(prefixToStrip.length)
        : c.variable;
      const existing = seen.get(c.alias);
      if (existing) existing.sources.push(label);
      else seen.set(c.alias, { alias: c.alias, sources: [label] });
    }
    return [...seen.values()];
  }

  let options = $derived(distinctOptions(candidates, initialVariable));
  let selected = $state('');
  $effect(() => {
    if (selected === '' && options.length > 0) selected = options[0].alias;
  });

  function handleConfirm() {
    if (!selected) return;
    onconfirm?.({ alias: selected });
  }

  function handleCancel() {
    oncancel?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancel();
    } else if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
      e.preventDefault();
      handleConfirm();
    }
  }

  let confirmBtn: HTMLButtonElement | undefined = $state();

  onMount(() => {
    confirmBtn?.focus();
    document.addEventListener('keydown', handleKeydown, true);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown, true);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions a11y_no_static_element_interactions -->
<div class="ui-relink-backdrop" onclick={self(handleCancel)}>
  <div
    class="ui-relink-dialog"
    role="dialog"
    aria-label="Confirm link"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="ui-relink-header">
      {#if options.length > 1}
        <span class="ui-relink-title">{candidates.length} variants disagree — pick one to broadcast</span>
      {:else}
        <span class="ui-relink-title">Link this property across {candidates.length} variants?</span>
      {/if}
      <button
        type="button"
        class="ui-relink-close"
        onclick={handleCancel}
        aria-label="Close"
      >
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="ui-relink-body" role="radiogroup">
      {#each options as opt}
        <label class="ui-relink-row" class:selected={selected === opt.alias}>
          <UIRadio bind:group={selected} value={opt.alias} />
          <div class="ui-relink-row-info">
            <code class="ui-relink-alias">{opt.alias}</code>
            <span class="ui-relink-sources">
              from {opt.sources.join(', ')}
            </span>
          </div>
        </label>
      {/each}
    </div>

    <div class="ui-relink-footer">
      <button type="button" class="ui-relink-btn ui-relink-btn-cancel" onclick={handleCancel}>Cancel</button>
      <button
        type="button"
        class="ui-relink-btn ui-relink-btn-confirm"
        onclick={handleConfirm}
        bind:this={confirmBtn}
      >Link</button>
    </div>
  </div>
</div>

<style>
  .ui-relink-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }

  .ui-relink-dialog {
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--ui-shadow-lg);
    min-width: 22rem;
    max-width: 28rem;
    display: flex;
    flex-direction: column;
    animation: uiRelinkDialogIn 140ms ease-out;
  }
  .ui-relink-dialog:focus { outline: none; }

  @keyframes uiRelinkDialogIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .ui-relink-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8) var(--ui-space-12);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .ui-relink-title {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-weight: var(--ui-font-weight-medium);
  }

  .ui-relink-close {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    background: transparent;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-tertiary);
    cursor: pointer;
    font-size: var(--ui-font-size-xs);
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }
  .ui-relink-close:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .ui-relink-body {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    padding: var(--ui-space-8) var(--ui-space-8);
  }

  .ui-relink-row {
    display: flex;
    align-items: flex-start;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-8);
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition:
      background var(--ui-transition-fast),
      border-color var(--ui-transition-fast);
  }
  .ui-relink-row:hover { background: var(--ui-hover); }
  .ui-relink-row.selected {
    background: var(--ui-hover);
    border-color: var(--ui-border-high);
  }

  /* Lift the radio so it visually aligns with the first line of the row label. */
  .ui-relink-row :global(.ui-radio) { margin-top: 0.2rem; }

  .ui-relink-row-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }

  .ui-relink-alias {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ui-relink-sources {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ui-relink-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--ui-space-6);
    padding: var(--ui-space-8) var(--ui-space-12);
    border-top: 1px solid var(--ui-border-low);
  }

  .ui-relink-btn {
    padding: var(--ui-space-4) var(--ui-space-12);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-medium);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .ui-relink-btn-cancel {
    background: transparent;
    border: 1px solid var(--ui-border);
    color: var(--ui-text-secondary);
  }
  .ui-relink-btn-cancel:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .ui-relink-btn-confirm {
    background: var(--ui-text-accent);
    border: 1px solid var(--ui-text-accent);
    color: var(--ui-surface-lowest);
  }
  .ui-relink-btn-confirm:hover { filter: brightness(1.1); }
</style>
