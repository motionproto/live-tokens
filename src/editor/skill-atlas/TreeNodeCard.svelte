<script lang="ts">
  import Badge from '../../system/components/Badge.svelte';
  import Button from '../../system/components/Button.svelte';
  import Card from '../../system/components/Card.svelte';
  import CodeSnippet from '../../system/components/CodeSnippet.svelte';
  import Tooltip from '../../system/components/Tooltip.svelte';
  import type { LineRange, NodeKind, TreeNode } from './types';

  interface Props {
    node: TreeNode;
    selected: string | null;
    onselect: (key: string, label: string, lines: LineRange) => void;
    onopen: (doc: string) => void;
  }

  let { node, selected, onselect, onopen }: Props = $props();

  const KIND_LABEL: Record<NodeKind, string> = {
    trigger: 'trigger',
    step: 'step',
    decide: 'decision',
    cli: 'command',
    hand: 'handoff',
    gate: 'failure',
    ok: 'pass',
    ref: 'reference',
    chipset: 'step',
    done: 'complete',
  };

  /** The structural rule that puts a node in each kind, as the audit enforces it. */
  const KIND_MEANING: Record<NodeKind, string> = {
    trigger: 'The request that starts the skill. Each chart has one, and it quotes the scope of the skill description.',
    step: 'One action the skill takes. It has a single continuation.',
    decide: 'A branch on a fact the skill reads from the request, the report, or a file. Each wire carries the answer that selects it, and there are at least two.',
    cli: 'A CLI command the skill runs. The wires carry its exit outcomes, or a single continuation when it cannot fail.',
    hand: 'The chart ends by invoking the named skill.',
    gate: 'A check that failed. Its one wire returns up the chart to the command that runs again.',
    ok: 'A check that passed, so the chart continues.',
    ref: 'A step that reads a references document. The link opens it beside the source.',
    chipset: 'One action the skill takes. It has a single continuation.',
    done: 'The chart ends.',
  };

  let kindLabel = $derived(node.tag ?? KIND_LABEL[node.kind]);
  let kindMeaning = $derived(node.tag ? undefined : KIND_MEANING[node.kind]);
  let meaningOpen = $state(false);
  let cardSelected = $derived(selected === node.id);
  let range = $derived(node.lines ? rangeLabel(node.lines) : '');

  function rangeLabel([a, b]: LineRange): string {
    return a === b ? `Ln ${a}` : `Ln ${a}–${b}`;
  }

  function selectSelf() {
    if (node.lines) onselect(node.id, node.title, node.lines);
  }
</script>

<div class="shell" class:on={cardSelected} data-node={node.id}>
  {#if node.lines}
    <button
      type="button"
      class="hit"
      aria-pressed={cardSelected}
      aria-label="{node.title}. SKILL.md {range}"
      onclick={selectSelf}
    ></button>
  {/if}

  <Card title={node.title} size="compact" prose={false}>
    {#snippet aside()}
      <div class="meta">
        <Tooltip text={kindMeaning} position="bottom" open={meaningOpen}>
          <button
            type="button"
            class="kind"
            aria-pressed={meaningOpen}
            aria-label="{kindLabel}. What this kind of node means"
            onclick={() => (meaningOpen = !meaningOpen)}
          >
            <Badge variant="neutral" size="small">
              {kindLabel}
            </Badge>
          </button>
        </Tooltip>
        {#if range}<span class="range">{range}</span>{/if}
      </div>
    {/snippet}

    {#if node.desc}<p class="desc">{node.desc}</p>{/if}

    {#if node.reference}
      <button type="button" class="doclink" onclick={() => onopen(node.reference!)}>
        {node.reference.replace('references/', '')}
      </button>
    {/if}

    {#if node.command}
      <div class="command"><CodeSnippet code={node.command} /></div>
    {/if}

    {#if node.chips}
      <ul class="chips">
        {#each node.chips as chip, i (chip.label)}
          {@const key = `${node.id}:${i}`}
          <li class:picked={selected === key}>
            <Button
              variant="outline"
              size="small"
              onclick={() => onselect(key, chip.label, chip.lines)}
            >
              {chip.label}
            </Button>
          </li>
        {/each}
      </ul>
    {/if}
  </Card>
</div>

<style>
  .shell {
    position: relative;
    border-radius: var(--card-default-radius);
    /* Without the blur (below), the shipped 70% lets the wires read through
       the body. */
    --card-default-surface: color-mix(in srgb, var(--surface-neutral-lower) 80%, transparent);
  }

  /* A transparent overlay makes the whole card the click target without
     nesting the chip buttons inside another button. */
  .hit {
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 0;
    border: none;
    border-radius: inherit;
    background: transparent;
    cursor: pointer;
  }

  /* The package Card clips its title to one line; a node title is the step
     itself, so it has to read whole. */
  .shell :global(.card.compact .card-title) {
    font-weight: var(--font-weight-bold);
    line-height: var(--line-height-tight);
    white-space: normal;
    overflow-wrap: anywhere;
  }

  /* The package Card clips to its corners and its backdrop blur makes it a
     stacking context, which would both clip the kind tooltip and keep the
     chips under the hit overlay. The header takes the rounding instead. */
  .shell :global(.card.compact) {
    overflow: visible;
    backdrop-filter: none;
  }

  .shell :global(.card.compact .card-header) {
    align-items: flex-start;
    border-radius: calc(var(--card-default-radius) - var(--card-default-border-width))
      calc(var(--card-default-radius) - var(--card-default-border-width)) 0 0;
  }

  .shell:has(.hit:hover) {
    outline: var(--border-width-1) solid var(--border-accent-medium);
    outline-offset: var(--space-2);
  }

  .shell.on {
    outline: var(--border-width-2) solid var(--text-accent);
    outline-offset: var(--space-2);
  }

  /* Chips, the copy button and the reference link sit above the overlay so they
     stay clickable. */
  .chips,
  .command,
  .doclink,
  .meta :global(.tooltip-wrapper) {
    position: relative;
    z-index: 2;
  }

  /* A shown tooltip hangs over the command block and the row below, which
     also sit at z-index 2 and come later in the DOM. Hover reveals it
     without the open class. */
  .meta :global(.tooltip-wrapper:hover),
  .meta :global(.tooltip-wrapper.open) {
    z-index: var(--z-tooltip);
  }

  .doclink {
    max-width: 100%;
    padding: var(--space-2) var(--space-6);
    border: var(--border-width-1) solid var(--border-accent-subtle);
    border-radius: var(--radius-sm);
    background: var(--surface-accent-lower);
    font-family: var(--code-font-family);
    font-size: var(--font-size-xs);
    color: var(--text-accent);
    overflow-wrap: break-word;
    text-align: left;
    cursor: pointer;
  }

  .doclink:hover {
    background: var(--surface-accent-low);
  }

  /* The title's half-leading pushes its glyphs below the header padding;
     the badge gets the same offset so the two tops line up. */
  .meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
    padding-top: calc(var(--font-size-md) * (var(--line-height-tight) - 1) / 2);
    font-size: var(--font-size-xs);
  }

  .kind {
    --badge-neutral-text-font-size: 1em;
    --badge-neutral-padding: var(--space-2);
    --badge-neutral-padding-right: var(--space-6);
    --badge-neutral-padding-left: var(--space-6);
    display: inline-flex;
    margin: 0;
    padding: 0;
    font-size: inherit;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .range {
    font-family: var(--code-font-family);
    font-size: inherit;
    color: var(--text-tertiary);
  }

  /* The package Tooltip is a one-line hint; a kind's meaning is a sentence
     or two, so it wraps and hangs from the badge's right edge, which sits at
     the card's edge. */
  .meta :global(.tooltip.bottom) {
    right: 0;
    left: auto;
    width: max-content;
    max-width: 36ch;
    transform: none;
    white-space: normal;
    text-align: left;
  }

  .meta :global(.tooltip.bottom)::after {
    right: var(--space-16);
    left: auto;
    transform: none;
  }

  .desc {
    margin: 0;
    font-family: var(--body-sm-font-family);
    font-size: var(--body-sm-font-size);
    font-weight: var(--body-sm-font-weight);
    line-height: var(--body-sm-line-height);
    letter-spacing: var(--body-sm-letter-spacing);
    color: var(--text-secondary);
    white-space: pre-line;
  }

  .command {
    --codesnippet-padding: var(--space-8);
    --codesnippet-code-font-size: var(--font-size-sm);

    margin-top: var(--space-8);
  }

  .desc + .command,
  .doclink + .command {
    margin-top: var(--space-12);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
    margin: var(--space-12) 0 0;
    padding: 0;
    list-style: none;
  }

  /* The selected badge takes the lit wire's colour, and its focus ring does
     too, so a click never shows the browser's blue ring over it. */
  .chips li.picked {
    --button-outline-border: var(--text-accent);
    --button-outline-hover-border: var(--text-accent);
    --button-outline-text: var(--text-accent);
    --button-outline-surface: var(--surface-accent-lower);
  }

  .chips :global(button:focus-visible) {
    outline: var(--border-width-2) solid var(--text-accent);
    outline-offset: var(--space-2);
  }
</style>
