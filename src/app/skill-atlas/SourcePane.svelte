<script lang="ts">
  import type { LineRange } from './types';

  interface Props {
    lines: string[];
    highlight: LineRange | null;
    onpick: (lineNumber: number) => void;
  }

  let { lines, highlight, onpick }: Props = $props();

  type Segment = { text: string; kind: 'plain' | 'code' | 'strong' | 'em' };

  /** Line-level role, used for weight and colour only. */
  type Role = 'frontmatter' | 'heading' | 'subheading' | 'code' | 'table' | 'text';

  interface Row {
    n: number;
    role: Role;
    segments: Segment[];
  }

  const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;

  function segment(text: string): Segment[] {
    if (text === '') return [{ text: ' ', kind: 'plain' }];
    return text
      .split(INLINE)
      .filter((part) => part !== '')
      .map((part) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return { text: part.slice(1, -1), kind: 'code' as const };
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return { text: part.slice(2, -2), kind: 'strong' as const };
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return { text: part.slice(1, -1), kind: 'em' as const };
        }
        return { text: part, kind: 'plain' as const };
      });
  }

  let rows: Row[] = $derived.by(() => {
    let inFence = false;
    let delimiters = 0;

    return lines.map((raw, i) => {
      const isDelimiter = raw.trim() === '---' && delimiters < 2;
      if (isDelimiter) delimiters += 1;
      const isFence = raw.startsWith('```');
      if (isFence) inFence = !inFence;

      let role: Role = 'text';
      if (isFence || (inFence && !isFence)) role = 'code';
      else if (isDelimiter || delimiters < 2) role = 'frontmatter';
      else if (raw.startsWith('# ')) role = 'heading';
      else if (/^#{2,}\s/.test(raw)) role = 'subheading';
      else if (raw.startsWith('|')) role = 'table';

      // Inside a fence the markers are literal, so they stay unparsed.
      const segments = role === 'code' ? [{ text: raw === '' ? ' ' : raw, kind: 'plain' as const }] : segment(raw);
      return { n: i + 1, role, segments };
    });
  });

  function marked(n: number): boolean {
    return highlight !== null && n >= highlight[0] && n <= highlight[1];
  }
</script>

<div class="source">
  {#each rows as row (row.n)}
    <div
      class="row role-{row.role}"
      class:hl={marked(row.n)}
      class:hl-first={highlight !== null && row.n === highlight[0]}
      class:hl-last={highlight !== null && row.n === highlight[1]}
      data-line={row.n}
    >
      <button
        type="button"
        class="gutter"
        aria-label="Select the step covering line {row.n}"
        onclick={() => onpick(row.n)}
      >
        {row.n}
      </button>
      <code class="text">
        {#each row.segments as seg, i (i)}
          {#if seg.kind === 'code'}<span class="tick">{seg.text}</span>
          {:else if seg.kind === 'strong'}<strong>{seg.text}</strong>
          {:else if seg.kind === 'em'}<em>{seg.text}</em>
          {:else}{seg.text}{/if}
        {/each}
      </code>
    </div>
  {/each}
</div>

<style>
  .source {
    padding: var(--space-16) 0 var(--space-96);
  }

  .row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-8);
    padding-right: var(--space-24);
    scroll-margin-block: var(--space-96);
  }

  .gutter {
    flex: 0 0 auto;
    width: var(--space-48);
    padding: 0 var(--space-12) 0 0;
    border: none;
    background: transparent;
    text-align: right;
    font-family: var(--code-font-family);
    font-size: var(--font-size-md);
    line-height: var(--code-line-height);
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
    cursor: pointer;
  }

  .gutter:hover {
    color: var(--text-accent);
  }

  .text {
    flex: 1 1 auto;
    min-width: 0;
    padding-left: var(--space-16);
    border-left: var(--border-width-2) solid transparent;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    font-family: var(--code-font-family);
    font-size: var(--font-size-md);
    font-weight: var(--code-font-weight);
    line-height: var(--code-line-height);
    letter-spacing: var(--code-letter-spacing);
    color: var(--text-secondary);
  }

  .role-frontmatter .text {
    color: var(--text-muted);
    font-style: italic;
  }

  .role-heading .text,
  .role-subheading .text {
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
  }

  .role-heading .text {
    font-size: var(--font-size-lg);
  }

  .role-code .text {
    color: var(--text-accent);
  }

  .role-table .text {
    color: var(--text-tertiary);
  }

  .tick {
    padding: 0 var(--space-4);
    border-radius: var(--radius-sm);
    background: var(--surface-neutral-lower);
    color: var(--text-primary);
  }

  strong {
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
  }

  em {
    color: var(--text-primary);
  }

  .hl .text {
    background: var(--surface-accent-lowest);
    border-left-color: var(--text-accent);
    color: var(--text-primary);
  }

  .hl .gutter {
    color: var(--text-accent);
  }

  .hl-first .text {
    border-top-right-radius: var(--radius-md);
  }

  .hl-last .text {
    border-bottom-right-radius: var(--radius-md);
  }
</style>
