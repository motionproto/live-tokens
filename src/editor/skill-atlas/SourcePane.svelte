<script lang="ts">
  import type { LineRange } from './types';

  interface Props {
    lines: string[];
    highlight: LineRange | null;
    /** The skill's other documents, so only a reference that exists links. */
    siblings: string[];
    onpick: (lineNumber: number) => void;
    onopen: (doc: string) => void;
  }

  let { lines, highlight, siblings, onpick, onopen }: Props = $props();

  type Segment = { text: string; kind: 'plain' | 'code' | 'strong' | 'em' | 'link' };

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
          const inner = part.slice(1, -1);
          // Every skill names its references in backticks, so the prose already
          // marks them; the pane only has to make them go somewhere.
          return { text: inner, kind: siblings.includes(inner) ? ('link' as const) : ('code' as const) };
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

  let container: HTMLElement | undefined = $state();
  let band: { top: number; height: number } | null = $state(null);

  /** The band stands a little proud of the rows so the brackets clear the text. */
  const BLEED = 4;

  function measure() {
    const first = highlight && container?.querySelector<HTMLElement>(`[data-line="${highlight[0]}"]`);
    const last = highlight && container?.querySelector<HTMLElement>(`[data-line="${highlight[1]}"]`);
    band =
      first && last
        ? {
            top: first.offsetTop - BLEED,
            height: last.offsetTop + last.offsetHeight - first.offsetTop + BLEED * 2,
          }
        : null;
  }

  $effect(() => {
    // `rows` because a document switch renumbers every line under the band.
    rows;
    measure();
  });

  // Wrapping reflows the rows under a fixed band, so width alone must re-measure.
  $effect(() => {
    if (!container) return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  });
</script>

<div class="source" bind:this={container}>
  {#if band}
    <!-- Keyed on the range so a new selection replays the flash. -->
    {#key highlight}
      <div class="band" style="top: {band.top}px; height: {band.height}px" aria-hidden="true">
        <span class="wash"></span>
        <span class="frame">
          <span class="corner tl"></span>
          <span class="corner tr"></span>
          <span class="corner bl"></span>
          <span class="corner br"></span>
        </span>
      </div>
    {/key}
  {/if}
  {#each rows as row (row.n)}
    <div class="row role-{row.role}" class:hl={marked(row.n)} data-line={row.n}>
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
          {#if seg.kind === 'link'}<button
              type="button"
              class="tick link"
              onclick={() => onopen(seg.text)}>{seg.text}</button>
          {:else if seg.kind === 'code'}<span class="tick">{seg.text}</span>
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
    position: relative;
    /* The band sits behind the rows, so the source needs its own stacking
       context to keep it off the pane background. */
    isolation: isolate;
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

  /* The link inherits the code run it replaces, so a reference reads as the
     same token in the prose whether or not the pane can open it. */
  .link {
    border: none;
    font: inherit;
    letter-spacing: inherit;
    background: var(--surface-accent-lower);
    color: var(--text-accent);
    text-decoration: underline;
    text-underline-offset: var(--space-2);
    cursor: pointer;
  }

  .link:hover {
    background: var(--surface-accent-low);
  }

  strong {
    color: var(--text-primary);
    font-weight: var(--font-weight-bold);
  }

  em {
    color: var(--text-primary);
  }

  .hl .text {
    color: var(--text-primary);
  }

  .hl .gutter {
    color: var(--text-accent);
  }

  /* The selected range is one block, so it is drawn as one shape spanning the
     text column rather than as a stack of per-row backgrounds. */
  .band {
    position: absolute;
    z-index: -1;
    left: calc(var(--space-48) + var(--space-8));
    right: var(--space-24);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--text-accent) 12%, transparent);
    pointer-events: none;
  }

  .wash {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: color-mix(in srgb, var(--text-accent) 26%, transparent);
    animation: wash var(--duration-1000) var(--ease-out-quad) forwards;
  }

  .frame {
    position: absolute;
    inset: 0;
    animation: settle var(--duration-500) var(--ease-out-cubic) both;
  }

  .corner {
    position: absolute;
    width: var(--space-16);
    height: var(--space-16);
    border: 0 solid var(--text-accent);
  }

  .tl {
    top: 0;
    left: 0;
    border-top-width: var(--border-width-2);
    border-left-width: var(--border-width-2);
    border-top-left-radius: var(--radius-md);
  }

  .tr {
    top: 0;
    right: 0;
    border-top-width: var(--border-width-2);
    border-right-width: var(--border-width-2);
    border-top-right-radius: var(--radius-md);
  }

  .bl {
    bottom: 0;
    left: 0;
    border-bottom-width: var(--border-width-2);
    border-left-width: var(--border-width-2);
    border-bottom-left-radius: var(--radius-md);
  }

  .br {
    bottom: 0;
    right: 0;
    border-bottom-width: var(--border-width-2);
    border-right-width: var(--border-width-2);
    border-bottom-right-radius: var(--radius-md);
  }

  @keyframes wash {
    0% {
      opacity: 0;
    }
    12% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes settle {
    from {
      inset: calc(-1 * var(--space-8));
      opacity: 0;
    }
    to {
      inset: 0;
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .wash {
      animation: none;
      opacity: 0;
    }

    .frame {
      animation: none;
    }
  }
</style>
