<script lang="ts">
  // site.css carries the themed page typography; importing it here rather than
  // from main.ts keeps it off the editor routes.
  import '../site.css';

  import Callout from '../../system/components/Callout.svelte';
  import TabBar from '../../system/components/TabBar.svelte';
  import SourcePane from './SourcePane.svelte';
  import TreeNodeCard from './TreeNodeCard.svelte';
  import { skillSources } from './skillSources';
  import { skillTrees } from './skillTrees';
  import type { Edge, LineRange, Selection, TreeNode } from './types';

  let active = $state(Object.keys(skillTrees)[0]);
  let selection: Selection | null = $state(null);

  let tree = $derived(skillTrees[active]);
  let lines = $derived(skillSources[active]);

  let tabs = $derived(
    Object.entries(skillTrees).map(([id, t]) => ({
      id,
      label: `${t.title} · ${skillSources[id].length} lines`,
    })),
  );

  let rows = $derived.by(() => {
    const byRow = new Map<number, TreeNode[]>();
    for (const node of tree.nodes) {
      const group = byRow.get(node.row);
      if (group) group.push(node);
      else byRow.set(node.row, [node]);
    }
    return [...byRow.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => group);
  });

  function selectTarget(key: string, label: string, range: LineRange) {
    selection = { key, label, lines: range };
    scrollSourceTo(range[0]);
  }

  /** Every target a line could belong to, node and chip alike. */
  function targets(): Selection[] {
    return tree.nodes.flatMap((node) => [
      ...(node.lines ? [{ key: node.id, label: node.title, lines: node.lines }] : []),
      ...(node.chips ?? []).map((chip, i) => ({
        key: `${node.id}:${i}`,
        label: chip.label,
        lines: chip.lines,
      })),
    ]);
  }

  /** Reverse lookup: the narrowest target whose range covers this line wins. */
  function selectFromLine(lineNumber: number) {
    const covering = targets()
      .filter(({ lines: [from, to] }) => lineNumber >= from && lineNumber <= to)
      .sort((a, b) => a.lines[1] - a.lines[0] - (b.lines[1] - b.lines[0]));

    const best = covering[0];
    if (!best) return;

    selection = best;
    treePane
      ?.querySelector(`[data-node="${best.key.split(':')[0]}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function scrollSourceTo(lineNumber: number) {
    sourcePane
      ?.querySelector(`[data-line="${lineNumber}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function changeTab(id: string) {
    active = id;
    selection = null;
    treePane?.scrollTo({ top: 0 });
    sourcePane?.scrollTo({ top: 0 });
  }

  // ---- wires -------------------------------------------------------------
  // Connectors are measured from the laid-out cards, so they survive wrapping,
  // theme changes, and the geometry skill moving every radius and padding.
  let canvas: HTMLElement | undefined = $state();
  let treePane: HTMLElement | undefined = $state();
  let sourcePane: HTMLElement | undefined = $state();
  interface Wire {
    d: string;
    back: boolean;
    lit: boolean;
  }

  let wires: Wire[] = $state([]);
  let canvasSize = $state({ w: 0, h: 0 });

  function drawWires() {
    if (!canvas) return;
    const base = canvas.getBoundingClientRect();
    canvasSize = { w: base.width, h: base.height };
    const selectedNode = selection?.key.split(':')[0] ?? null;

    const box = (id: string) => {
      const el = canvas?.querySelector(`[data-node="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: r.left - base.left,
        top: r.top - base.top,
        bottom: r.bottom - base.top,
        midX: r.left + r.width / 2 - base.left,
        midY: r.top + r.height / 2 - base.top,
      };
    };

    wires = (tree.edges as Edge[]).flatMap((edge): Wire[] => {
      const [from, to, style] = edge;
      const a = box(from);
      const b = box(to);
      if (!a || !b) return [];
      const lit = selectedNode === from || selectedNode === to;

      if (style === 'back') {
        const x = Math.min(a.left, b.left) - 24;
        return [{ back: true, lit, d: `M ${a.left} ${a.midY} C ${x} ${a.midY}, ${x} ${b.midY}, ${b.left} ${b.midY}` }];
      }
      const bend = Math.max(16, (b.top - a.bottom) * 0.55);
      return [
        {
          back: false,
          lit,
          d: `M ${a.midX} ${a.bottom} C ${a.midX} ${a.bottom + bend}, ${b.midX} ${b.top - bend}, ${b.midX} ${b.top}`,
        },
      ];
    });
  }

  $effect(() => {
    // Re-read on tab change and on selection (which only relights existing wires).
    void tree;
    void selection;
    const frame = requestAnimationFrame(drawWires);
    return () => cancelAnimationFrame(frame);
  });

  $effect(() => {
    if (!canvas) return;
    const observer = new ResizeObserver(() => drawWires());
    observer.observe(canvas);
    return () => observer.disconnect();
  });
</script>

<div class="atlas">
  <header class="masthead">
    <h1>Skill atlas</h1>
    <p class="standfirst">
      The eight live-tokens authoring skills as decision trees. Select a step and its lines light up in
      the skill on the right; select a line number and the step that owns it lights up on the left.
    </p>
    <div class="tabs">
      <TabBar {tabs} selectedTab={active} ontabChange={changeTab} />
    </div>
  </header>

  <div class="split">
    <section class="pane" aria-label="{tree.id} decision tree">
      <div class="pane-head">
        <span class="pane-title">{tree.id}</span>
        <span class="pane-note">{tree.nodes.length} steps</span>
      </div>
      <div class="pane-body" bind:this={treePane}>
        <div class="intro">
          <Callout variant="info" label="What this skill decides">{tree.tagline}</Callout>
        </div>

        <div class="canvas" bind:this={canvas}>
          <svg
            class="wires"
            viewBox="0 0 {canvasSize.w} {canvasSize.h}"
            width={canvasSize.w}
            height={canvasSize.h}
            aria-hidden="true"
          >
            {#each wires as wire, i (i)}
              <path d={wire.d} class:back={wire.back} class:lit={wire.lit} />
            {/each}
          </svg>

          <div class="flow">
            {#each rows as group, i (i)}
              <div class="row" data-count={group.length}>
                {#each group as node (node.id)}
                  <TreeNodeCard {node} selected={selection?.key ?? null} onselect={selectTarget} />
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <section class="pane" aria-label="{tree.id} source">
      <div class="pane-head">
        <span class="pane-title">{tree.id}/SKILL.md</span>
        <span class="pane-note">{lines.length} lines</span>
      </div>
      <div class="pane-body" bind:this={sourcePane}>
        <SourcePane {lines} highlight={selection?.lines ?? null} onpick={selectFromLine} />
      </div>
    </section>
  </div>

  <footer class="statusbar">
    {#if selection}
      <span class="status-label">{selection.label}</span>
      <span class="status-range">
        SKILL.md {selection.lines[0] === selection.lines[1]
          ? `line ${selection.lines[0]}`
          : `lines ${selection.lines[0]}–${selection.lines[1]}`}
      </span>
    {:else}
      <span class="status-range">Select a step to map it onto the skill.</span>
    {/if}
  </footer>
</div>

<style>
  /* A two-pane tool rather than a reading column. Nothing here sits at a page
     column position, so the grid would only be capping the working surface;
     the standfirst keeps its own measure instead. */
  .atlas {
    display: flex;
    flex-direction: column;
    padding: var(--space-48) var(--space-32) var(--space-32);
  }

  .masthead {
    margin-bottom: var(--space-40);
  }

  .standfirst {
    max-width: 68ch;
    margin: 0 0 var(--space-32);
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--body-md-font-weight);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
    color: var(--text-secondary);
  }

  .tabs {
    overflow-x: auto;
  }

  .split {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-32);
  }

  @media (min-width: 64rem) {
    .split {
      grid-template-columns: 3fr 2fr;
      align-items: start;
    }
  }

  .pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: var(--border-width-1) solid var(--border-neutral-subtle);
    border-radius: var(--radius-3xl);
    background: var(--surface-neutral-lowest);
    overflow: hidden;
  }

  .pane-head {
    display: flex;
    align-items: baseline;
    gap: var(--space-16);
    padding: var(--space-16) var(--space-24);
    border-bottom: var(--border-width-1) solid var(--border-neutral-faint);
  }

  .pane-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--code-font-family);
    font-size: var(--font-size-md);
    color: var(--text-primary);
  }

  .pane-note {
    flex: 0 0 auto;
    margin-left: auto;
    font-family: var(--code-font-family);
    font-size: var(--font-size-md);
    color: var(--text-tertiary);
  }

  .pane-body {
    overflow: auto;
    height: 78vh;
    scroll-behavior: smooth;
  }

  .intro {
    padding: var(--space-24) var(--space-24) 0;
  }

  .canvas {
    position: relative;
    padding: var(--space-32) var(--space-24) var(--space-64);
  }

  .wires {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .wires path {
    fill: none;
    stroke: var(--border-neutral-subtle);
    stroke-width: var(--border-width-1);
  }

  .wires path.lit {
    stroke: var(--text-accent);
    stroke-width: var(--border-width-2);
  }

  .wires path.back {
    stroke: var(--text-danger);
    stroke-dasharray: 6 6;
  }

  .flow {
    position: relative;
    display: flex;
    flex-direction: column;
    /* The generous step is the point: the tree should read as a sequence of
       stops, not a stack of cards. */
    gap: var(--space-64);
  }

  .row {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-24);
    align-items: start;
  }

  /* Sibling branch rows share a column count so a family and its follow-up
     question stay in the same column when they wrap. */
  .row[data-count='2'],
  .row[data-count='3'],
  .row[data-count='4'],
  .row[data-count='5'] {
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  }

  .statusbar {
    display: flex;
    align-items: baseline;
    gap: var(--space-16);
    flex-wrap: wrap;
    margin-top: var(--space-24);
    padding-top: var(--space-16);
    border-top: var(--border-width-1) solid var(--border-neutral-faint);
  }

  .status-label {
    font-family: var(--body-md-font-family);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--text-primary);
  }

  .status-range {
    font-family: var(--code-font-family);
    font-size: var(--font-size-md);
    color: var(--text-tertiary);
  }

  @media (prefers-reduced-motion: reduce) {
    .pane-body {
      scroll-behavior: auto;
    }
  }
</style>
