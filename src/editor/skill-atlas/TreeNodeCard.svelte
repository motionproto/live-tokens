<script lang="ts">
  import Button from '../../system/components/Button.svelte';
  import Card from '../../system/components/Card.svelte';
  import CodeSnippet from '../../system/components/CodeSnippet.svelte';
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
    hand: 'hands off',
    gate: 'failure',
    ok: 'pass',
    ref: 'reference',
    ask: 'question',
    chipset: 'reference set',
    done: 'verify',
  };

  let kindLabel = $derived(node.tag ?? KIND_LABEL[node.kind]);
  let cardSelected = $derived(selected === node.id);
  let range = $derived(node.lines ? rangeLabel(node.lines) : '');

  function rangeLabel([a, b]: LineRange): string {
    return a === b ? `line ${a}` : `lines ${a}–${b}`;
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

  <Card title={node.title} prose={false}>
    <div class="meta">
      <h3 class="kind">
        {#if node.n}<span class="step-n">{node.n}</span>{/if}{kindLabel}
      </h3>
      {#if range}<span class="range">{range}</span>{/if}
    </div>

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
          <li>
            <Button
              variant={selected === key ? 'secondary' : 'outline'}
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
  .shell :global(.card-title) {
    white-space: normal;
    overflow-wrap: anywhere;
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
  .doclink {
    position: relative;
    z-index: 2;
  }

  .doclink {
    max-width: 100%;
    padding: var(--space-4) var(--space-8);
    border: var(--border-width-1) solid var(--border-accent-subtle);
    border-radius: var(--radius-sm);
    background: var(--surface-accent-lower);
    font-family: var(--code-font-family);
    font-size: var(--font-size-sm);
    color: var(--text-accent);
    overflow-wrap: break-word;
    text-align: left;
    cursor: pointer;
  }

  .doclink:hover {
    background: var(--surface-accent-low);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: var(--space-12);
    flex-wrap: wrap;
    margin-bottom: var(--space-12);
  }

  .kind {
    margin: 0;
    font-family: var(--heading-sm-font-family);
    font-size: var(--heading-sm-font-size);
    font-weight: var(--heading-sm-font-weight);
    line-height: var(--heading-sm-line-height);
    letter-spacing: var(--heading-sm-letter-spacing);
    color: var(--text-secondary);
  }

  .step-n {
    margin-right: var(--space-8);
    font-weight: var(--font-weight-bold);
  }

  .range {
    font-family: var(--code-font-family);
    font-size: var(--font-size-md);
    color: var(--text-tertiary);
  }

  .desc {
    margin: 0;
    font-family: var(--body-md-font-family);
    font-size: var(--body-md-font-size);
    font-weight: var(--body-md-font-weight);
    line-height: var(--body-md-line-height);
    letter-spacing: var(--body-md-letter-spacing);
    color: var(--text-secondary);
  }

  .command {
    margin-top: var(--space-16);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
    margin: var(--space-20) 0 0;
    padding: 0;
    list-style: none;
  }
</style>
