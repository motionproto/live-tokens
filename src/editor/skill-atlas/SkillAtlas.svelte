<script lang="ts">
  import { tick } from 'svelte';
  import { navigate } from '../core/routing/router';
  import Button from '../../system/components/Button.svelte';
  import TabBar from '../../system/components/TabBar.svelte';
  import SourcePane from './SourcePane.svelte';
  import TreeCanvas from './TreeCanvas.svelte';
  import { SKILL_DOC, skillDocs } from './skillSources';
  import { skillTrees } from './skillTrees';
  import type { LineRange, Selection } from './types';

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

  let treePane: HTMLElement | undefined = $state();
  let sourcePane: HTMLElement | undefined = $state();
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
      The {Object.keys(skillTrees).length} live-tokens authoring skills as decision trees. Select a step and its lines light up in
      the skill on the right; select a line number and the step that owns it lights up on the left.
    </p>
  </header>

  <div class="tabs">
    <TabBar {tabs} selectedTab={active} ontabChange={changeTab} />
  </div>

  <div class="split">
    <section class="pane" aria-label="{tree.id} decision tree">
      <div class="pane-head">
        <span class="pane-title">{tree.id}</span>
        <span class="pane-note">{tree.nodes.length} steps</span>
      </div>
      <div class="pane-body" bind:this={treePane}>
        <h2 class="tagline">{tree.tagline}</h2>

        <TreeCanvas {tree} selected={selection?.key ?? null} onselect={selectTarget} onopen={openDoc} />
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
    margin-bottom: var(--space-32);
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
    margin: 0;
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--body-md-font-weight);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
    color: var(--text-secondary);
  }

  /* Below the desktop lock the page scrolls, and the strip pins at the top;
     it sits outside the masthead so the standfirst can scroll away without
     it. The gap below is padding: a margin would leave a slit the panes show
     through once the strip is pinned. */
  .tabs {
    position: sticky;
    top: 0;
    z-index: 1;
    padding-bottom: var(--space-40);
    background: var(--page-bg);
    background-attachment: var(--page-bg-attachment, fixed);
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

  /* Desktop: the surface locks to the viewport and each pane scrolls on its
     own, so nothing ever slides under the tab strip. The router wrapper
     assumes window-scroll pages (min-height + a 12rem bottom pad); the doubled
     .lt-app outranks its scoped rule on a specificity tie. */
  @media (min-width: 64rem) {
    :global(.lt-app.lt-app:has(.atlas)) {
      height: 100vh;
      min-height: 0;
      padding-bottom: 0;
      overflow: hidden;
    }

    .atlas {
      height: 100%;
      overflow: hidden;
    }

    .masthead,
    .tabs {
      flex: 0 0 auto;
    }

    /* minmax(0, 1fr) pins the row to the remaining height; an auto row would
       grow to the panes' content and break their scroll. */
    .split {
      flex: 1 1 auto;
      min-height: 0;
      grid-template-columns: 3fr 2fr;
      grid-template-rows: minmax(0, 1fr);
    }

    .pane {
      height: 100%;
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

  .tagline {
    text-align: center;
    margin: 0;
    padding: var(--space-24) var(--space-24) 0;
    font-family: var(--heading-xl-font-family);
    font-size: var(--heading-xl-font-size);
    font-weight: var(--heading-xl-font-weight);
    line-height: var(--heading-xl-line-height);
    letter-spacing: var(--heading-xl-letter-spacing);
    color: var(--text-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    .pane-body {
      scroll-behavior: auto;
    }
  }
</style>
