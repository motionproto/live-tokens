<script lang="ts">
  import TreeNodeCard from './TreeNodeCard.svelte';
  import { mergeParallelEdges } from './edges';
  import { routeWires, type Box, type Label, type Wire } from './wireLayout';
  import type { LineRange, SkillTree, TreeNode } from './types';

  interface Props {
    tree: SkillTree;
    /** The selection key: a node id, or `node:chip`. */
    selected: string | null;
    onselect: (key: string, label: string, lines: LineRange) => void;
    onopen: (doc: string) => void;
  }

  let { tree, selected, onselect, onopen }: Props = $props();

  /** The cards of each row, with the tallest stacked answer leaving it so the
   *  row can reserve room for the label under its fan-out. */
  let rows = $derived.by(() => {
    const byRow = new Map<number, TreeNode[]>();
    for (const node of tree.nodes) {
      const group = byRow.get(node.row);
      if (group) group.push(node);
      else byRow.set(node.row, [node]);
    }
    const edges = mergeParallelEdges(tree.edges);
    return [...byRow.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, nodes]) => ({
        nodes,
        answerLines: Math.max(
          0,
          ...edges
            .filter((edge) => nodes.some((node) => node.id === edge.from))
            .map((edge) => (edge.label?.split('\n').length ?? 1) - 1),
        ),
      }));
  });

  // Connectors are measured from the laid-out cards, so they survive wrapping,
  // theme changes, and the geometry skill moving every radius and padding.
  let canvas: HTMLElement | undefined = $state();
  let wires: Wire[] = $state([]);
  let labels: Label[] = $state([]);
  let canvasSize = $state({ w: 0, h: 0 });

  function drawWires() {
    if (!canvas) return;
    const base = canvas.getBoundingClientRect();
    canvasSize = { w: base.width, h: base.height };
    const selectedNode = selected?.split(':')[0] ?? '';

    const boxes = new Map<string, Box>();
    for (const node of tree.nodes) {
      const el = canvas.querySelector(`[data-node="${node.id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      boxes.set(node.id, {
        left: r.left - base.left,
        right: r.right - base.left,
        top: r.top - base.top,
        bottom: r.bottom - base.top,
        midX: r.left + r.width / 2 - base.left,
        midY: r.top + r.height / 2 - base.top,
      });
    }

    const drawing = routeWires(boxes, tree.edges, (...ids) => ids.includes(selectedNode));
    wires = drawing.wires;
    labels = drawing.labels;
  }

  $effect(() => {
    // Re-read on tab change and on selection (which only relights existing wires).
    void tree;
    void selected;
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

<div class="canvas" bind:this={canvas}>
  <svg
    class="wires"
    viewBox="0 0 {canvasSize.w} {canvasSize.h}"
    width={canvasSize.w}
    height={canvasSize.h}
    aria-hidden="true"
  >
    <defs>
      <marker
        id="atlas-arrow"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="9"
        markerHeight="9"
        markerUnits="userSpaceOnUse"
        orient="auto"
      >
        <path d="M 0 1 L 9 5 L 0 9 z" />
      </marker>
    </defs>

    {#each wires as wire, i (i)}
      <path
        d={wire.d}
        class:back={wire.back}
        class:lit={wire.lit}
        marker-end={wire.arrow ? 'url(#atlas-arrow)' : undefined}
      />
    {/each}

    {#each labels as label, i (i)}
      <text
        class="wire-label"
        class:lit={label.lit}
        x={label.x}
        y={label.y}
        transform={label.rotate ? `rotate(-90 ${label.x} ${label.y})` : undefined}
        text-anchor="middle"
        dominant-baseline="central"
      >
        {#each label.lines as answer, j (j)}
          <tspan x={label.x} dy={j === 0 ? `${-(label.lines.length - 1) * 0.6}em` : '1.2em'}>{answer}</tspan>
        {/each}
      </text>
    {/each}
  </svg>

  <div class="flow">
    {#each rows as { nodes, answerLines }, i (i)}
      <div class="row" data-count={nodes.length} style="--n: {nodes.length}; --answer-lines: {answerLines}">
        {#each nodes as node (node.id)}
          <TreeNodeCard {node} {selected} {onselect} {onopen} />
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  /* The side padding is the lanes: re-run loops on the left, row-skipping
     branches on the right. A branch row runs the full width of the flow, so
     without reserved room a lane would have nowhere to go but over the cards
     it is routing around. */
  .canvas {
    position: relative;
    padding: var(--space-32) var(--space-64) var(--space-64);
  }

  .wires {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .wires > path {
    fill: none;
    stroke: var(--border-neutral-medium);
    stroke-width: var(--border-width-2);
    stroke-linecap: round;
  }

  .wires > path.lit {
    stroke: var(--text-accent);
    stroke-width: var(--border-width-3);
  }

  /* A re-run loop is a route, not a failure — danger red overstated it. */
  .wires > path.back {
    stroke: var(--border-accent-medium);
    stroke-dasharray: 6 8;
  }

  .wires > path.back.lit {
    stroke: var(--text-accent);
  }

  .wires marker path {
    fill: context-stroke;
  }

  /* The halo breaks the wire so the answer reads on its own ground. */
  .wire-label {
    font-family: var(--code-font-family);
    font-size: var(--font-size-sm);
    fill: var(--text-tertiary);
    stroke: var(--surface-neutral-lowest);
    stroke-width: calc(var(--border-width-2) * 3);
    stroke-linejoin: round;
    paint-order: stroke;
  }

  .wire-label.lit {
    fill: var(--text-accent);
  }

  .flow {
    /* Nearly every row holds one node, so the pane's full width would only
       stretch a card that has nothing to say at its right edge. Capping the
       track turns the column into a spine and gives the wires somewhere to
       travel. */
    --node-w: 30rem;

    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-40);
  }

  /* Sibling branch rows share a column count so a family and its follow-up
     question stay in the same column when they wrap. */
  .row {
    /* A fan only earns a trunk-and-bus while it fits on one line, so branches
       narrow enough to stay unwrapped are worth more than uniform columns. */
    --track: 9rem;

    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--track)), 1fr));
    gap: var(--space-24);
    align-items: start;
    /* The auto margins that centre the row also switch off the flex stretch,
       so the width has to be asked for rather than inherited. */
    width: 100%;
    max-width: calc(var(--n) * var(--node-w) + (var(--n) - 1) * var(--space-24));
    margin-inline: auto;
    margin-bottom: calc(var(--answer-lines) * var(--space-20));
  }

  /* A flat step would spend the same gap on "next" as on "the tree splits
     here". The extra margin lets a branch announce itself before it is read. */
  .row:not([data-count='1']) {
    margin-top: var(--space-48);
    margin-bottom: calc(var(--space-48) + var(--answer-lines) * var(--space-20));
  }

  /* Past four, one line would shave the cards past reading; wrap them in pairs
     and let the connectors fall back to curves. */
  .row[data-count='5'],
  .row[data-count='6'],
  .row[data-count='7'] {
    --track: 17rem;
  }
</style>
