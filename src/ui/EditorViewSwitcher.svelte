<script lang="ts">
  import { editorView } from '../lib/editorViewStore';

  export let condensed = false;

  function set(v: 'tokens' | 'components') {
    editorView.set(v);
  }

  function toggle() {
    editorView.update((v) => (v === 'tokens' ? 'components' : 'tokens'));
  }
</script>

{#if condensed}
  <button
    type="button"
    class="compact"
    aria-label={$editorView === 'tokens' ? 'Switch to components' : 'Switch to tokens'}
    title={$editorView === 'tokens' ? 'Tokens (click for components)' : 'Components (click for tokens)'}
    on:click={toggle}
  >
    <i class="fas {$editorView === 'tokens' ? 'fa-palette' : 'fa-cubes'}"></i>
  </button>
{:else}
  <div class="seg-group">
    <span class="seg-label">Editor</span>
    <div class="seg" role="tablist" aria-label="Editor view">
      <button
        type="button"
        role="tab"
        class="seg-btn"
        class:active={$editorView === 'tokens'}
        aria-selected={$editorView === 'tokens'}
        on:click={() => set('tokens')}
      >
        <i class="fas fa-palette"></i>
        <span>Tokens</span>
      </button>
      <button
        type="button"
        role="tab"
        class="seg-btn"
        class:active={$editorView === 'components'}
        aria-selected={$editorView === 'components'}
        on:click={() => set('components')}
      >
        <i class="fas fa-cubes"></i>
        <span>Components</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .seg-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    margin: var(--ui-space-12) var(--ui-space-12) var(--ui-space-8);
  }

  .seg-label {
    font-size: 10px;
    font-weight: var(--ui-font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ui-text-muted);
    padding-left: var(--ui-space-2);
  }

  .seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    padding: 3px;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-lg);
  }

  .seg-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-6);
    height: 28px;
    padding: 0 var(--ui-space-8);
    background: none;
    border: none;
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-family: inherit;
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .seg-btn i {
    font-size: 0.85em;
    opacity: 0.85;
  }

  .seg-btn:hover {
    color: var(--ui-text-secondary);
  }

  .seg-btn.active {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .compact {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 36px;
    margin: var(--ui-space-8) 0 var(--ui-space-4);
    background: none;
    border: none;
    color: var(--ui-text-primary);
    cursor: pointer;
    transition: background var(--ui-transition-fast);
  }

  .compact:hover {
    background: var(--ui-hover);
  }
</style>
