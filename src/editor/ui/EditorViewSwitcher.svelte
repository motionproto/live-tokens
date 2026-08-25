<script lang="ts">
  import { editorView, type EditorView } from '../core/store/editorViewStore';
  import { parentRoute } from '../core/routing/parentRouteStore';
  import { DEFAULT_COMPONENTS_PATH, DEFAULT_COLORS_PATH } from '../core/routing/ownedRoutes';

  interface Props {
    condensed?: boolean;
  }

  let { condensed = false }: Props = $props();

  // On the components or colors route the host page already renders that
  // surface — the overlay's matching view would just stack on top, so disable
  // the switch. The switcher renders inside the editor iframe, so we read the
  // *parent* route, not this iframe's own. Compares the default paths:
  // editorRoutes relocation isn't plumbed across the iframe, so a relocated
  // route won't disable the switch.
  let componentsDisabled = $derived($parentRoute === DEFAULT_COMPONENTS_PATH);
  let colorsDisabled = $derived($parentRoute === DEFAULT_COLORS_PATH);

  // Editing flow order: Tokens → Colors → Components → Sketch. The condensed rail cycles
  // through these; a view is skipped while it's disabled (already on that
  // page) so the cycle never lands on a dead view.
  const CYCLE: readonly EditorView[] = ['tokens', 'colors', 'components', 'sketch'];
  const ICONS: Record<EditorView, string> = {
    tokens: 'fa-sliders',
    colors: 'fa-palette',
    components: 'fa-cubes',
    sketch: 'fa-pen-nib',
  };
  const LABELS: Record<EditorView, string> = {
    tokens: 'Tokens',
    colors: 'Colors',
    components: 'Components',
    sketch: 'Sketch',
  };

  function set(v: EditorView) {
    editorView.set(v);
  }

  function cycle() {
    editorView.update((current) => {
      let i = CYCLE.indexOf(current);
      for (let n = 0; n < CYCLE.length; n++) {
        i = (i + 1) % CYCLE.length;
        const next = CYCLE[i];
        if (next === 'components' && componentsDisabled) continue;
        if (next === 'colors' && colorsDisabled) continue;
        return next;
      }
      return current;
    });
  }
</script>

{#if condensed}
  <button
    type="button"
    class="compact"
    aria-label={`Editor view: ${LABELS[$editorView]} (click to cycle)`}
    title={`${LABELS[$editorView]} (click to cycle views)`}
    onclick={cycle}
  >
    <i class="fas {ICONS[$editorView]}"></i>
  </button>
{:else}
  <div class="seg-group">
    <span class="seg-label">Editor Mode</span>
    <div class="seg" role="tablist" aria-label="Editor view">
      <button
        type="button"
        role="tab"
        class="seg-btn"
        class:active={$editorView === 'tokens'}
        aria-selected={$editorView === 'tokens'}
        onclick={() => set('tokens')}
      >
        <span class="radio" aria-hidden="true"></span>
        <span>Tokens</span>
      </button>
      <button
        type="button"
        role="tab"
        class="seg-btn"
        class:active={$editorView === 'colors'}
        aria-selected={$editorView === 'colors'}
        disabled={colorsDisabled}
        title={colorsDisabled ? 'Already viewing the Colors page' : undefined}
        onclick={() => set('colors')}
      >
        <span class="radio" aria-hidden="true"></span>
        <span>Colors</span>
      </button>
      <button
        type="button"
        role="tab"
        class="seg-btn"
        class:active={$editorView === 'components'}
        aria-selected={$editorView === 'components'}
        disabled={componentsDisabled}
        title={componentsDisabled ? 'Already viewing the Components page' : undefined}
        onclick={() => set('components')}
      >
        <span class="radio" aria-hidden="true"></span>
        <span>Components</span>
      </button>
      <button
        type="button"
        role="tab"
        class="seg-btn"
        class:active={$editorView === 'sketch'}
        aria-selected={$editorView === 'sketch'}
        onclick={() => set('sketch')}
      >
        <span class="radio" aria-hidden="true"></span>
        <span>Sketch</span>
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
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    padding-left: var(--ui-space-2);
    margin-bottom: 2px;
  }

  .seg {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    margin-bottom: 4px;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-text-primary);
    border-radius: var(--ui-radius-lg);
    /* Fill the sidebar's content area so the box width is fixed by the rail,
       not by which label happens to be active. Buttons inherit this width via
       the default `align-items: stretch` on the column flex. */
    width: 100%;
    box-sizing: border-box;
  }

  .seg-btn {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--ui-space-8);
    width: 100%;
    height: 28px;
    padding: 0 var(--ui-space-10);
    background: none;
    border: none;
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-family: inherit;
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-medium);
    text-align: left;
    box-sizing: border-box;
    cursor: pointer;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .radio {
    flex-shrink: 0;
    width: 12px;
    height: 12px;
    border-radius: var(--ui-radius-full);
    border: 1.5px solid var(--ui-text-tertiary);
    background: transparent;
    transition: border-color var(--ui-transition-fast), background var(--ui-transition-fast),
      box-shadow var(--ui-transition-fast);
  }

  .seg-btn.active .radio {
    border-color: var(--ui-text-primary);
    /* Inner dot via inset shadow keeps the box-model identical to the inactive
       ring — no border-thickness shift between states. */
    box-shadow: inset 0 0 0 2.5px var(--ui-surface-high), inset 0 0 0 6px var(--ui-text-primary);
  }

  .seg-btn:hover:not(.active) .radio {
    border-color: var(--ui-text-secondary);
  }

  .seg-btn:hover {
    color: var(--ui-text-secondary);
  }

  .seg-btn.active {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .seg-btn:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .seg-btn:disabled:hover {
    color: var(--ui-text-tertiary);
  }

  .seg-btn:disabled:hover .radio {
    border-color: var(--ui-text-tertiary);
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
