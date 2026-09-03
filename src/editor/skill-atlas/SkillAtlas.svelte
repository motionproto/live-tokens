<script lang="ts">
  import { tick } from 'svelte';
  import { navigate } from '../core/routing/router';
  import Button from '../../system/components/Button.svelte';
  import Callout from '../../system/components/Callout.svelte';
  import TabBar from '../../system/components/TabBar.svelte';
  import SourcePane from './SourcePane.svelte';
  import TreeNodeCard from './TreeNodeCard.svelte';
  import { SKILL_DOC, skillDocs } from './skillSources';
  import { skillTrees } from './skillTrees';
  import type { Edge, LineRange, Selection, TreeNode } from './types';

  // `/skills#set-type` opens that skill, so a link can hand someone one tree
  // rather than the atlas front door.
  const linked = window.location.hash.slice(1);
  let active = $state(linked in skillTrees ? linked : Object.keys(skillTrees)[0]);
  let selection: Selection | null = $state(null);
  /** Which of the skill's documents the source pane shows. */
  let doc: string = $state(SKILL_DOC);

  let tree = $derived(skillTrees[active]);
  let docs = $derived(skillDocs[active]);
  let lines = $derived(docs[doc] ?? docs[SKILL_DOC]);
  let siblings = $derived(Object.keys(docs).filter((name) => name !== SKILL_DOC));

  let tabs = $derived(
    Object.entries(skillTrees).map(([id, t]) => ({
      id,
      label: `${t.title}\n${skillDocs[id][SKILL_DOC].length} lines`,
    })),
  );

  let docTabs = $derived(
    Object.keys(docs).map((name) => ({
      id: name,
      label: name.replace('references/', '').replace(/\.md$/, ''),
    })),
  );

  function openDoc(name: string) {
    doc = name;
    sourcePane?.scrollTo({ top: 0 });
  }

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
    // Every range cites SKILL.md, so a step selected while a reference is open
    // would otherwise highlight nothing.
    doc = SKILL_DOC;
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

  async function scrollSourceTo(lineNumber: number) {
    // The row only exists once a switch back to SKILL.md has rendered.
    await tick();
    sourcePane
      ?.querySelector(`[data-line="${lineNumber}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function changeTab(id: string) {
    active = id;
    selection = null;
    doc = SKILL_DOC;
    history.replaceState(null, '', `${window.location.pathname}#${id}`);
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
    /** Trunks and buses carry no arrowhead; only the segment that arrives does. */
    arrow: boolean;
  }

  interface Label {
    x: number;
    y: number;
    text: string;
    lit: boolean;
    /** Lane labels run along the lane; branch labels sit across the drop. */
    rotate: boolean;
  }

  interface Box {
    left: number;
    right: number;
    top: number;
    bottom: number;
    midX: number;
    midY: number;
  }

  interface Drawing {
    wires: Wire[];
    labels: Label[];
  }

  let wires: Wire[] = $state([]);
  let labels: Label[] = $state([]);
  let canvasSize = $state({ w: 0, h: 0 });

  /** Clearance between a card border and the wire, so the arrowhead reads as
   *  an arrival rather than as part of the card outline. */
  const STANDOFF = 6;
  const CORNER = 12;
  /** How far outside the cards a lane sits, and how far one lane nests
   *  inside the next when two share a stretch of gutter. */
  const LANE_INSET = 40;
  const LANE_STEP = 16;

  /** Cards laid out in one row share a top to within a pixel; cards pushed onto
   *  a second wrapped line do not, and a single bus cannot serve both. */
  function aligned(values: number[]): boolean {
    return Math.max(...values) - Math.min(...values) < 4;
  }

  function push<T>(map: Map<string, T[]>, key: string, value: T) {
    const list = map.get(key);
    if (list) list.push(value);
    else map.set(key, [value]);
  }

  function label(out: Drawing, text: string | undefined, x: number, y: number, lit: boolean, rotate = false) {
    if (text) out.labels.push({ x, y, text, lit, rotate });
  }

  /** One trunk down from the parent, one bus across, one drop into each child —
   *  so a split reads as a single decision rather than as N crossing curves.
   *  Each answer sits on its own drop. */
  function fanOut(out: Drawing, a: Box, kids: Box[], edges: Edge[], lit: (i: number) => boolean) {
    const top = kids[0].top;
    const busY = (a.bottom + top) / 2;
    const xs = kids.map((k) => k.midX);
    const r = Math.max(
      0,
      Math.min(CORNER, (Math.max(...xs) - Math.min(...xs)) / 2, (busY - a.bottom) / 2, (top - busY) / 2),
    );
    const turns = xs.map((x) => (x < a.midX ? x + r : x > a.midX ? x - r : x));
    const busLeft = Math.min(...turns, a.midX);
    const busRight = Math.max(...turns, a.midX);
    const anyLit = kids.some((_, i) => lit(i));

    out.wires.push({
      back: false,
      arrow: false,
      lit: anyLit,
      d: `M ${a.midX} ${a.bottom + STANDOFF} L ${a.midX} ${busY} M ${busLeft} ${busY} L ${busRight} ${busY}`,
    });
    kids.forEach((k, i) => {
      const x = k.midX;
      const turn = turns[i];
      out.wires.push({
        back: false,
        arrow: true,
        lit: lit(i),
        d:
          turn === x
            ? `M ${x} ${busY} L ${x} ${top - STANDOFF}`
            : `M ${turn} ${busY} Q ${x} ${busY}, ${x} ${busY + r} L ${x} ${top - STANDOFF}`,
      });
      label(out, edges[i].label, x, (busY + r + top - STANDOFF) / 2, lit(i));
    });
  }

  /** The mirror of `fanOut`: risers up to a shared bus, one trunk into the child,
   *  so several outcomes converging land as one arrow instead of a pile. */
  function fanIn(out: Drawing, parents: Box[], b: Box, edges: Edge[], lit: (i: number) => boolean) {
    const bottom = parents[0].bottom;
    const busY = (bottom + b.top) / 2;
    const xs = parents.map((p) => p.midX);
    const r = Math.max(
      0,
      Math.min(CORNER, (Math.max(...xs) - Math.min(...xs)) / 2, (busY - bottom) / 2, (b.top - busY) / 2),
    );
    const turns = xs.map((x) => (x < b.midX ? x + r : x > b.midX ? x - r : x));
    const anyLit = parents.some((_, i) => lit(i));

    parents.forEach((p, i) => {
      const x = p.midX;
      const turn = turns[i];
      out.wires.push({
        back: false,
        arrow: false,
        lit: lit(i),
        d:
          turn === x
            ? `M ${x} ${bottom + STANDOFF} L ${x} ${busY}`
            : `M ${x} ${bottom + STANDOFF} L ${x} ${busY - r} Q ${x} ${busY}, ${turn} ${busY}`,
      });
      label(out, edges[i].label, x, (bottom + STANDOFF + busY - r) / 2, lit(i));
    });
    out.wires.push({
      back: false,
      arrow: true,
      lit: anyLit,
      d:
        `M ${Math.min(...turns, b.midX)} ${busY} L ${Math.max(...turns, b.midX)} ${busY}` +
        ` M ${b.midX} ${busY} L ${b.midX} ${b.top - STANDOFF}`,
    });
  }

  /** A plain parent-to-child curve, and the fallback wherever a bus would have
   *  to cross a card: children wrapped onto a second line, or parents staggered
   *  across rows. */
  function curve(out: Drawing, a: Box, b: Box, edge: Edge, lit: boolean) {
    const y1 = a.bottom + STANDOFF;
    const y2 = b.top - STANDOFF;
    const bend = Math.max(16, (y2 - y1) * 0.55);
    out.wires.push({
      back: false,
      arrow: true,
      lit,
      d: `M ${a.midX} ${y1} C ${a.midX} ${y1 + bend}, ${b.midX} ${y2 - bend}, ${b.midX} ${y2}`,
    });
    label(out, edge.label, (a.midX + b.midX) / 2, (y1 + y2) / 2, lit);
  }

  /** Every card the span passes between, not just the two it joins. */
  function crossed(a: Box, b: Box, all: Box[]): Box[] {
    const top = Math.min(a.midY, b.midY);
    const bottom = Math.max(a.midY, b.midY);
    return all.filter((x) => x !== a && x !== b && x.bottom > top && x.top < bottom);
  }

  /** On the spine: no other card shares its row. A wrapped branch row also
   *  "crosses" cards on its way down, and those stay curves. */
  function alone(box: Box, all: Box[]): boolean {
    return all.every((x) => x === box || !aligned([x.top, box.top]));
  }

  /** Re-run loops ride a lane in the left gutter the centred spine opens up,
   *  rather than bulging around the card they leave. */
  function backEdge(out: Drawing, a: Box, b: Box, lane: number, edge: Edge, lit: boolean) {
    const dir = Math.sign(b.midY - a.midY) || -1;
    const r = Math.max(
      0,
      Math.min(CORNER, (a.left - STANDOFF - lane) / 2, Math.abs(a.midY - b.midY) / 2),
    );
    out.wires.push({
      back: true,
      arrow: true,
      lit,
      d:
        `M ${a.left - STANDOFF} ${a.midY} L ${lane + r} ${a.midY}` +
        ` Q ${lane} ${a.midY}, ${lane} ${a.midY + dir * r}` +
        ` L ${lane} ${b.midY - dir * r} Q ${lane} ${b.midY}, ${lane + r} ${b.midY}` +
        ` L ${b.left - STANDOFF} ${b.midY}`,
    });
    label(out, edge.label ?? 're-run', lane, (a.midY + b.midY) / 2, lit, true);
  }

  /** A branch that skips a row rides the right gutter, the mirror of a loop,
   *  so a "no" never has to be drawn through the card the "yes" leads to. */
  function skipEdge(out: Drawing, a: Box, b: Box, lane: number, edge: Edge, lit: boolean) {
    const r = Math.max(
      0,
      Math.min(CORNER, (lane - a.right - STANDOFF) / 2, Math.abs(a.midY - b.midY) / 2),
    );
    out.wires.push({
      back: false,
      arrow: true,
      lit,
      d:
        `M ${a.right + STANDOFF} ${a.midY} L ${lane - r} ${a.midY}` +
        ` Q ${lane} ${a.midY}, ${lane} ${a.midY + r}` +
        ` L ${lane} ${b.midY - r} Q ${lane} ${b.midY}, ${lane - r} ${b.midY}` +
        ` L ${b.right + STANDOFF} ${b.midY}`,
    });
    label(out, edge.label, lane, (a.midY + b.midY) / 2, lit, true);
  }

  function drawWires() {
    if (!canvas) return;
    const base = canvas.getBoundingClientRect();
    canvasSize = { w: base.width, h: base.height };
    const selectedNode = selection?.key.split(':')[0] ?? null;
    const lit = (...ids: string[]) => ids.includes(selectedNode ?? '');

    const box = (id: string): Box | null => {
      const el = canvas?.querySelector(`[data-node="${id}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        left: r.left - base.left,
        right: r.right - base.left,
        top: r.top - base.top,
        bottom: r.bottom - base.top,
        midX: r.left + r.width / 2 - base.left,
        midY: r.top + r.height / 2 - base.top,
      };
    };

    const boxes = new Map<string, Box>();
    for (const node of tree.nodes) {
      const b = box(node.id);
      if (b) boxes.set(node.id, b);
    }
    const all = [...boxes.values()];

    const edges = tree.edges as Edge[];
    const children = new Map<string, Edge[]>();
    const parents = new Map<string, Edge[]>();
    for (const edge of edges) {
      if (edge.back) continue;
      push(children, edge.from, edge);
      push(parents, edge.to, edge);
    }

    const out: Drawing = { wires: [], labels: [] };
    const claimed = new Set<Edge>();

    for (const [from, kidEdges] of children) {
      const a = boxes.get(from);
      const kids = kidEdges.map((e) => boxes.get(e.to));
      if (!a || kidEdges.length < 2 || kids.some((k) => !k)) continue;
      const kept = kids as Box[];
      if (!aligned(kept.map((k) => k.top))) continue;
      kidEdges.forEach((e) => claimed.add(e));
      fanOut(out, a, kept, kidEdges, (i) => lit(from, kidEdges[i].to));
    }

    for (const [to, parentEdges] of parents) {
      const open = parentEdges.filter((e) => !claimed.has(e));
      const b = boxes.get(to);
      const ups = open.map((e) => boxes.get(e.from));
      if (!b || open.length < 2 || ups.some((u) => !u)) continue;
      const kept = ups as Box[];
      if (!aligned(kept.map((u) => u.bottom))) continue;
      open.forEach((e) => claimed.add(e));
      fanIn(out, kept, b, open, (i) => lit(open[i].from, to));
    }

    // Longest skip first, so a long one always rides outside the skips it spans.
    const skips: { edge: Edge; a: Box; b: Box; over: Box[] }[] = [];
    for (const edge of edges) {
      if (edge.back || claimed.has(edge)) continue;
      const a = boxes.get(edge.from);
      const b = boxes.get(edge.to);
      if (!a || !b) continue;
      const over = alone(a, all) && alone(b, all) ? crossed(a, b, all) : [];
      if (over.length > 0) skips.push({ edge, a, b, over });
      else curve(out, a, b, edge, lit(edge.from, edge.to));
    }
    skips.sort((x, y) => Math.abs(y.a.midY - y.b.midY) - Math.abs(x.a.midY - x.b.midY));
    let outer = -Infinity;
    for (const { edge, a, b, over } of skips) {
      const lane = Math.max(
        ...over.map((x) => x.right),
        a.right,
        b.right,
      ) + LANE_INSET;
      const placed = Math.max(lane, outer + LANE_STEP);
      outer = placed;
      skipEdge(out, a, b, placed, edge, lit(edge.from, edge.to));
    }

    // Shortest loop first, so a long one always nests outside the loops it spans.
    const loops = edges
      .filter((e) => e.back)
      .map((edge) => ({ edge, a: boxes.get(edge.from), b: boxes.get(edge.to) }))
      .filter((e): e is { edge: Edge; a: Box; b: Box } => !!e.a && !!e.b)
      .sort((x, y) => Math.abs(x.a.midY - x.b.midY) - Math.abs(y.a.midY - y.b.midY));

    let inner = Infinity;
    for (const { edge, a, b } of loops) {
      const clear = Math.min(...crossed(a, b, all).map((x) => x.left), a.left, b.left) - LANE_INSET;
      const lane = Math.max(4, Math.min(clear, inner - LANE_STEP));
      inner = lane;
      backEdge(out, a, b, lane, edge, lit(edge.from, edge.to));
    }

    wires = out.wires;
    labels = out.labels;
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
    <div class="masthead-top">
      <h1>Skill Atlas</h1>
      <Button variant="primary" onclick={() => navigate('/')} icon="fas fa-arrow-left" iconPosition="left">
        Back to Demo
      </Button>
    </div>
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
          <Callout variant="info" label="The skill in one line">{tree.tagline}</Callout>
        </div>

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
                {label.text}
              </text>
            {/each}
          </svg>

          <div class="flow">
            {#each rows as group, i (i)}
              <div class="row" data-count={group.length} style="--n: {group.length}">
                {#each group as node (node.id)}
                  <TreeNodeCard
                    {node}
                    selected={selection?.key ?? null}
                    onselect={selectTarget}
                    onopen={openDoc}
                  />
                {/each}
              </div>
            {/each}
          </div>
        </div>
      </div>
    </section>

    <section class="pane pane-source" aria-label="{tree.id} source">
      <div class="pane-head">
        <span class="pane-title">{tree.id}/{doc}</span>
        <span class="pane-note">{lines.length} lines</span>
      </div>
      <div class="doc-tabs">
        <TabBar tabs={docTabs} selectedTab={doc} ontabChange={openDoc} />
      </div>
      <div class="pane-body" bind:this={sourcePane}>
        <SourcePane
          {lines}
          {siblings}
          highlight={doc === SKILL_DOC ? (selection?.lines ?? null) : null}
          onpick={selectFromLine}
          onopen={openDoc}
        />
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

  .masthead-top {
    display: flex;
    align-items: center;
    /* Beside the title, not at the far right: the editor overlay pins top-right
       and would cover a button parked there. */
    gap: var(--space-24);
    flex-wrap: wrap;
    /* The row carries the heading's own bottom margin; a margin left on the h1
       would centre the button against the margin box, not the title. */
    margin-bottom: var(--space-12);
  }

  .masthead-top h1 {
    font-family: var(--heading-xl-font-family);
    font-size: var(--heading-xl-font-size);
    font-weight: var(--heading-xl-font-weight);
    line-height: var(--heading-xl-line-height);
    letter-spacing: var(--heading-xl-letter-spacing);
    color: var(--text-primary);
    margin-bottom: 0;
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

  /* The label carries its own newline, so the line count sits under the skill
     name instead of wrapping wherever the strip happens to run out. */
  .tabs :global(.tab span) {
    white-space: pre-line;
    text-align: center;
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

  /* The reference tabs only exist on the source pane, so a body of its own
     fixed height would leave the two panes ending at different places. */
  .pane {
    display: flex;
    flex-direction: column;
    height: 82vh;
    min-width: 0;
    border: var(--border-width-1) solid var(--border-neutral-subtle);
    border-radius: var(--radius-3xl);
    background: var(--surface-neutral-lowest);
    overflow: hidden;
  }

  .pane-head {
    flex: 0 0 auto;
    display: flex;
    align-items: baseline;
    gap: var(--space-16);
    padding: var(--space-16) var(--space-24);
    border-bottom: var(--border-width-1) solid var(--border-neutral-faint);
  }

  /* The tab row carries the rule under the source head, so the head drops its
     own; two lines a tab apart read as a second window. */
  .pane-source .pane-head {
    border-bottom: none;
    padding-bottom: var(--space-8);
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

  /* Fixed: the body's own basis is the whole document, so a shrinkable tab row
     loses height to it and clips. */
  .doc-tabs {
    flex: 0 0 auto;
    /* The rule spans the pane, not the scrolled tab strip, so the component's
       own divider steps aside. */
    --tabbar-bar-divider: var(--color-transparent);
    padding: 0 var(--space-16);
    border-bottom: var(--border-width-1) solid var(--border-neutral-faint);
    overflow-x: auto;
  }

  .pane-body {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    scroll-behavior: smooth;
  }

  .intro {
    padding: var(--space-24) var(--space-24) 0;
  }

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
  }

  /* A flat step would spend the same gap on "next" as on "the tree splits
     here". The extra margin lets a branch announce itself before it is read. */
  .row:not([data-count='1']) {
    margin-block: var(--space-48);
  }

  /* Past four, one line would shave the cards past reading; wrap them in pairs
     and let the connectors fall back to curves. */
  .row[data-count='5'],
  .row[data-count='6'],
  .row[data-count='7'] {
    --track: 17rem;
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
