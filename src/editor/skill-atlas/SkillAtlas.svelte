<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { MediaQuery } from 'svelte/reactivity';
  import { navigate, route } from '../core/routing/router';
  import LabeledSelect from '../../demo/LabeledSelect.svelte';
  import Button from '../../system/components/Button.svelte';
  import SegmentedControl from '../../system/components/SegmentedControl.svelte';
  import TabBar from '../../system/components/TabBar.svelte';
  import SourcePane from './SourcePane.svelte';
  import TreeCanvas from './TreeCanvas.svelte';
  import { linkHash, linkTargets, resolveLink } from './atlasLink';
  import { SKILL_DOC, skillDocs } from './skillSources';
  import { skillTrees } from './skillTrees';
  import type { LineRange, Selection } from './types';

  // `#set-type` opens that skill and `#set-type/write-the-font-pairing/voice`
  // also selects that block, so a link can hand someone one step of one tree.
  const firstSkill = Object.keys(skillTrees)[0];

  const linked = resolveLink(window.location.hash, skillTrees);
  let active = $state(linked?.skill ?? firstSkill);
  let selection: Selection | null = $state(linked?.target ?? null);
  /** Which of the skill's documents the source pane shows. */
  let doc: string = $state(SKILL_DOC);
  /** Which pane shows below the desktop lock, where the two would stack. */
  let view: 'graph' | 'text' = $state('graph');

  let tree = $derived(skillTrees[active]);
  let docs = $derived(skillDocs[active]);
  let lines = $derived(docs[doc] ?? docs[SKILL_DOC]);
  let siblings = $derived(Object.keys(docs).filter((name) => name !== SKILL_DOC));

  const tabs = Object.entries(skillTrees).map(([id, t]) => ({
    id,
    label: `${t.title}\n${skillDocs[id][SKILL_DOC].length} lines`,
  }));

  const skillItems = Object.entries(skillTrees).map(([id, t]) => ({ value: id, label: t.title }));

  const views = [
    { value: 'graph', label: 'Graph' },
    { value: 'text', label: 'Text' },
  ];

  let docTabs = $derived(
    Object.keys(docs).map((name) => ({
      id: name,
      label: name.replace('references/', '').replace(/\.md$/, ''),
    })),
  );

  // Matches the desktop lock in the styles: above it each pane scrolls on its
  // own, below it the page does.
  const locked = new MediaQuery('min-width: 64rem');

  function toTop(pane: HTMLElement | undefined) {
    if (locked.current) pane?.scrollTo({ top: 0 });
    else window.scrollTo({ top: 0 });
  }

  function openDoc(name: string) {
    doc = name;
    view = 'text';
    toTop(sourcePane);
  }

  function selectTarget(key: string, label: string, range: LineRange) {
    selection = { key, label, lines: range };
    shareSelection();
    // Every range cites SKILL.md, so a step selected while a reference is open
    // would otherwise highlight nothing.
    doc = SKILL_DOC;
    scrollSourceTo(range[0]);
  }

  function shareSelection() {
    const target = linkTargets(tree).find((t) => t.key === selection?.key) ?? null;
    history.replaceState(null, '', `${window.location.pathname}${linkHash(active, target)}`);
  }

  /** Reverse lookup: the narrowest target whose range covers this line wins. */
  function selectFromLine(lineNumber: number) {
    const covering = linkTargets(tree)
      .filter(({ lines: [from, to] }) => lineNumber >= from && lineNumber <= to)
      .sort((a, b) => a.lines[1] - a.lines[0] - (b.lines[1] - b.lines[0]));

    const best = covering[0];
    if (!best) return;

    selection = best;
    shareSelection();
    scrollTreeTo(best.key);
  }

  function scrollTreeTo(key: string) {
    treePane
      ?.querySelector(`[data-node="${key.split(':')[0]}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  async function scrollSourceTo(lineNumber: number) {
    // The row only exists once a switch back to SKILL.md has rendered.
    await tick();
    sourcePane
      ?.querySelector(`[data-line="${lineNumber}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // A pane hidden behind the switch has no layout, so its scroll to the
  // selection has to wait until it shows.
  async function changeView(next: string) {
    view = next as typeof view;
    if (!selection) return;
    if (view === 'graph') {
      await tick();
      scrollTreeTo(selection.key);
    } else if (doc === SKILL_DOC) {
      scrollSourceTo(selection.lines[0]);
    }
  }

  function changeTab(id: string) {
    active = id;
    selection = null;
    doc = SKILL_DOC;
    shareSelection();
    toTop(treePane);
    toTop(sourcePane);
  }

  function openLink(hash: string) {
    // The eval report moved to the testing page; replace, so Back skips the old link.
    if (hash === '#measured-value') {
      history.replaceState(null, '', '/testing-loops#measured-value');
      route.set('/testing-loops');
      return;
    }
    const link = resolveLink(hash, skillTrees);
    if (!link) return;
    active = link.skill;
    selection = link.target;
    doc = SKILL_DOC;
    if (!link.target) return;
    const { key, lines: [from] } = link.target;
    // The cards and source rows of a newly opened tab exist only after render.
    tick().then(() => {
      scrollTreeTo(key);
      scrollSourceTo(from);
    });
  }

  onMount(() => {
    openLink(window.location.hash);
    // A link pasted into this tab changes only the hash, so the page never reloads.
    const onHash = () => openLink(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  });

  let treePane: HTMLElement | undefined = $state();
  let sourcePane: HTMLElement | undefined = $state();
</script>

<div class="skill-atlas">
  <header class="masthead">
    <div class="masthead-top">
      <Button variant="primary" onclick={() => navigate('/')} icon="fas fa-arrow-left" iconPosition="left">
        Back to Demo
      </Button>
      <h1>Skill Atlas</h1>
    </div>
  </header>

  <div class="tabs">
    <div class="tab-strip">
      <TabBar {tabs} value={active} onchange={changeTab} />
    </div>
    <div class="picker">
      <LabeledSelect label="Skill" items={skillItems} value={active} onchange={changeTab} />
      <SegmentedControl segments={views} value={view} onchange={changeView} />
    </div>
  </div>

  <div class="split" data-view={view}>
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
        <TabBar tabs={docTabs} value={doc} onchange={openDoc} />
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
     column position, so the grid would only be capping the working surface. */
  .skill-atlas {
    display: flex;
    flex-direction: column;
    padding: var(--space-48) var(--space-32) var(--space-32);
  }

  .masthead {
    /* Replaces the 0.67em the user agent put on the h1, which the row's own
       spacing now carries so the heading can sit at margin zero. */
    margin-top: var(--space-24);
    margin-bottom: var(--space-32);
  }

  .masthead-top {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-32);
  }

  /* The home page's heading style, so the two pages title alike. */
  .masthead-top h1 {
    font-family: var(--display-xl-font-family);
    font-size: var(--display-xl-font-size);
    font-weight: var(--display-xl-font-weight);
    line-height: var(--display-xl-line-height);
    letter-spacing: var(--display-xl-letter-spacing);
    color: var(--text-primary);
    margin: 0;
  }

  /* Below the desktop lock the page scrolls, and the strip pins at the top;
     it sits outside the masthead so the title can scroll away without it. The
     gap below is padding: a margin would leave a slit the panes show through
     once the strip is pinned. */
  .tabs {
    position: sticky;
    top: 0;
    z-index: 1;
    padding-bottom: var(--space-40);
    background: var(--page-bg);
    background-attachment: var(--page-bg-attachment, fixed);
  }

  /* Below the desktop lock a dropdown replaces the strip, which would scroll
     sideways past most of the skills. */
  .tab-strip {
    display: none;
    overflow-x: auto;
  }

  .picker {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-16);
  }

  .picker :global(.labeled-select) {
    align-self: stretch;
    align-items: stretch;
  }

  .picker :global(.segmented-control) {
    align-self: stretch;
  }

  .picker :global(.segment) {
    flex: 1;
    justify-content: center;
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

  .split[data-view='graph'] .pane-source,
  .split[data-view='text'] .pane:not(.pane-source) {
    display: none;
  }

  /* Below the desktop lock a pane grows to its content and the page scrolls:
     a scroll area nested in a scrolling page traps a phone's swipe. Isolated,
     so the cards' raised badges stay under the pinned strip. */
  .pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    isolation: isolate;
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
       own hairline steps aside. */
    --tabbar-bar-hairline-color: var(--color-transparent);
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

  /* Desktop: the surface locks to the viewport and each pane scrolls on its
     own, so nothing ever slides under the tab strip. The router wrapper
     assumes window-scroll pages (min-height + a 12rem bottom pad); the doubled
     .lt-app outranks its scoped rule on a specificity tie. The child
     combinator keeps the demo home out: it has an .atlas of its own. */
  @media (min-width: 64rem) {
    :global(.lt-app.lt-app:has(> .skill-atlas)) {
      height: 100vh;
      min-height: 0;
      padding-bottom: 0;
      overflow: hidden;
    }

    /* border-box: with no global reset the frame is content-box, so its own
       padding would push the panes' bottom edge past the wrapper's clip. */
    .skill-atlas {
      box-sizing: border-box;
      height: 100%;
      overflow: hidden;
    }

    .masthead,
    .tabs {
      flex: 0 0 auto;
    }

    .tab-strip {
      display: block;
    }

    .picker {
      display: none;
    }

    .split[data-view] .pane {
      display: flex;
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
      box-sizing: border-box;
      height: 100%;
    }
  }

  @media (max-width: 600px) {
    .skill-atlas {
      padding-inline: var(--space-16);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pane-body {
      scroll-behavior: auto;
    }
  }
</style>
