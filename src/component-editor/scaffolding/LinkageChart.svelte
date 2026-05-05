<script context="module" lang="ts">
  type CellStatus = 'linked' | 'broken' | 'absent';
  /** A 1D row carries both a display label (what the user sees) and a key (the original
      context string used for status lookup). They differ when an invariant token is stripped. */
  type RowEntry = { label: string; key: string };
  type Axes =
    | { kind: '1d'; rows: RowEntry[] }
    | { kind: '2d'; rows: string[]; cols: string[] };

  function deriveAxes(contexts: string[]): Axes {
    if (contexts.length === 0) return { kind: '1d', rows: [] };
    const split = contexts.map((c) => c.split(/\s+/));
    const arity = split[0].length;
    const consistent = arity === 2 && split.every((s) => s.length === 2);
    if (!consistent) {
      return { kind: '1d', rows: contexts.map((c) => ({ label: c, key: c })) };
    }
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const rows: string[] = [];
    const cols: string[] = [];
    for (const [r, c] of split) {
      if (!rowSet.has(r)) { rowSet.add(r); rows.push(r); }
      if (!colSet.has(c)) { colSet.add(c); cols.push(c); }
    }
    // Collapsed axis: if one side has only a single distinct value the matrix is really 1D.
    // Keep the full context string as the displayed label so it matches the variant/state
    // tab strip the editor renders — cropping a "shared" token loses the link between the
    // chart row and the tab a click should activate.
    if (cols.length === 1) {
      return { kind: '1d', rows: rows.map((r) => ({ label: `${r} ${cols[0]}`, key: `${r} ${cols[0]}` })) };
    }
    if (rows.length === 1) {
      return { kind: '1d', rows: cols.map((c) => ({ label: `${rows[0]} ${c}`, key: `${rows[0]} ${c}` })) };
    }
    return { kind: '2d', rows, cols };
  }

</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /**
   * Visual chart of which contexts share a token alias and which have been
   * overridden out of the group. Rendered alongside the controls inside a
   * shared-properties bucket.
   *
   * Auto-detects 1D vs 2D from the context strings: single-token strings
   * (e.g. "info") render as a labeled column; two-token strings (e.g.
   * "primary default") render as a row × column matrix.
   *
   * Clicking any cell in a row dispatches `select` with the row's label.
   * Parents typically forward this to the editor context's `focusedVariant`.
   */

  /** Full context list in display order (e.g. variant declaration order from the editor).
      The chart derives row order from this list, so the caller controls visual ordering. */
  export let contexts: string[] = [];
  /** Subset of `contexts` whose alias has been overridden out of the shared group. */
  export let broken: string[] = [];
  /** Header for the lone column when the data is 1D. The row labels are self-explanatory,
      so this is blank by default; pass a string to override. */
  export let singleAxisLabel: string = '';

  const dispatch = createEventDispatcher<{ select: string }>();

  $: axes = deriveAxes(contexts);
  $: status = (() => {
    const brokenSet = new Set(broken);
    const m = new Map<string, CellStatus>();
    for (const c of contexts) m.set(c, brokenSet.has(c) ? 'broken' : 'linked');
    return m;
  })();

  let hoveredRow: number = -1;

  function key2d(r: string, c: string): string { return `${r} ${c}`; }
  function selectRow(label: string) { dispatch('select', label); }
</script>

<div class="chart">
  <span class="chart-label">Linked Properties</span>
  <div class="chart-grid-wrap" role="grid" aria-label="Linked contexts">
  {#if axes.kind === '2d'}
    <div class="grid grid-2d" style="--cols: {axes.cols.length};">
      <div class="corner"></div>
      {#each axes.cols as c (c)}
        <div class="col-h">{c}</div>
      {/each}
      {#each axes.rows as r, i (r)}
        <button
          type="button"
          class="row-h row-target"
          class:hovered={hoveredRow === i}
          on:click={() => selectRow(r)}
          on:mouseenter={() => (hoveredRow = i)}
          on:mouseleave={() => (hoveredRow = -1)}
          on:focus={() => (hoveredRow = i)}
          on:blur={() => (hoveredRow = -1)}
        >{r}</button>
        {#each axes.cols as c (c)}
          {@const st = status.get(key2d(r, c)) ?? 'absent'}
          <button
            type="button"
            tabindex="-1"
            class="cell row-target {st}"
            class:hovered={hoveredRow === i}
            aria-label="{r} {c}: {st}"
            on:click={() => selectRow(r)}
            on:mouseenter={() => (hoveredRow = i)}
            on:mouseleave={() => (hoveredRow = -1)}
          >
            {#if st === 'linked'}
              <span class="dot" aria-hidden="true"></span>
            {:else if st === 'broken'}
              <svg class="lock" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3.5" y="7.5" width="9" height="6" rx="1.2"/>
                <path d="M5.5 7.5V5.2a2.5 2.5 0 0 1 4.6-1.4"/>
              </svg>
            {:else}
              <span class="absent" aria-hidden="true"></span>
            {/if}
          </button>
        {/each}
      {/each}
    </div>
  {:else}
    <div class="grid grid-1d">
      <div class="corner"></div>
      <div class="col-h">{singleAxisLabel}</div>
      {#each axes.rows as r, i (r.key)}
        {@const st = status.get(r.key) ?? 'absent'}
        <button
          type="button"
          class="row-h row-target"
          class:hovered={hoveredRow === i}
          on:click={() => selectRow(r.label)}
          on:mouseenter={() => (hoveredRow = i)}
          on:mouseleave={() => (hoveredRow = -1)}
          on:focus={() => (hoveredRow = i)}
          on:blur={() => (hoveredRow = -1)}
        >{r.label}</button>
        <button
          type="button"
          tabindex="-1"
          class="cell row-target {st}"
          class:hovered={hoveredRow === i}
          aria-label="{r.label}: {st}"
          on:click={() => selectRow(r.label)}
          on:mouseenter={() => (hoveredRow = i)}
          on:mouseleave={() => (hoveredRow = -1)}
        >
          {#if st === 'linked'}
            <span class="dot" aria-hidden="true"></span>
          {:else if st === 'broken'}
            <svg class="lock" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3.5" y="7.5" width="9" height="6" rx="1.2"/>
              <path d="M5.5 7.5V5.2a2.5 2.5 0 0 1 4.6-1.4"/>
            </svg>
          {:else}
            <span class="absent" aria-hidden="true"></span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  </div>
</div>

<style>
  .chart {
    /* Local linkage tokens. Promote to editor.css if reused elsewhere. */
    --linkage-dot: var(--ui-text-tertiary);
    --linkage-broken-fg: #f0a338;
    --linkage-broken-tint: rgba(240, 163, 56, 0.09);

    flex: 0 0 auto;
    align-self: flex-start;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .chart-label {
    display: block;
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }

  .grid {
    display: grid;
    gap: 1px;
    background: var(--ui-border-faint);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    overflow: hidden;
  }
  .grid-2d { grid-template-columns: auto repeat(var(--cols, 1), minmax(64px, 1fr)); }
  .grid-1d { grid-template-columns: auto 40px; }

  .grid > * {
    background: var(--ui-gray-250);
    padding: var(--ui-space-6) var(--ui-space-10);
    font-size: var(--ui-font-size-xs);
    display: flex;
    align-items: center;
  }
  .corner { background: var(--ui-gray-200); }
  .col-h, .row-h {
    font-family: var(--ui-font-mono);
    color: var(--ui-text-tertiary);
    text-transform: lowercase;
    letter-spacing: 0.04em;
    background: var(--ui-gray-200);
  }
  .col-h { justify-content: center; }
  .cell { justify-content: center; }

  /* Reset button defaults so .row-h / .cell render like before. */
  button.row-target {
    border: 0;
    margin: 0;
    font: inherit;
    text-align: left;
    cursor: pointer;
    color: inherit;
  }
  button.cell.row-target {
    text-align: center;
  }
  button.row-target:focus-visible {
    outline: 1px solid var(--ui-border-default, var(--ui-gray-700));
    outline-offset: -2px;
  }

  /* Whole-row hover treatment: every cell in the same row lifts together. */
  .row-target.hovered {
    background: var(--ui-gray-300);
  }
  .row-target.row-h.hovered {
    color: var(--ui-text-primary);
  }
  .cell.broken.row-target.hovered {
    background: var(--linkage-broken-tint);
    filter: brightness(1.15);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--linkage-dot);
  }

  .cell.broken {
    color: var(--linkage-broken-fg);
    background: var(--linkage-broken-tint);
  }
  .lock {
    width: 13px;
    height: 13px;
  }

  .absent {
    width: 5px;
    height: 1px;
    background: var(--ui-border-subtle);
    opacity: 0.6;
  }
</style>
