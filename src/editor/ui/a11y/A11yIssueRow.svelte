<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** A result to check by eye: its text in grey, where an issue's is amber. */
    review?: boolean;
    /** An issue the editor now measures as passing: its text in green. */
    fixed?: boolean;
    href?: string;
    /** Names what `href` points at, such as "Rule" or "Success criterion 1.4.11". */
    linkLabel?: string;
    children: Snippet;
    detail?: Snippet;
    /** The in-editor links that lead the link group, such as the traced properties. */
    links?: Snippet;
  }

  let { review = false, fixed = false, href, linkLabel = 'Guidance', children, detail, links }: Props = $props();
</script>

<li class="a11y-issue" class:review class:fixed>
  <div class="a11y-issue-head">
    <p class="a11y-issue-text">{@render children()}</p>
    {#if links || href}
      <div class="a11y-issue-links">
        {@render links?.()}
        {#if href}
          <a
            class="a11y-link a11y-issue-guidance"
            {href}
            target="_blank"
            rel="noopener"
            title={href}
            aria-label={`${linkLabel} (opens in a new tab)`}
          >
            {linkLabel}
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
          </a>
        {/if}
      </div>
    {/if}
  </div>
  {#if detail}
    <p class="a11y-issue-detail">{@render detail()}</p>
  {/if}
</li>

<style>
  .a11y-issue {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    padding: var(--ui-space-12) 0;
  }

  .a11y-issue + :global(.a11y-issue) {
    border-top: 1px solid var(--ui-border-low);
  }

  .a11y-issue-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-8) var(--ui-space-16);
  }

  .a11y-issue-text,
  .a11y-issue-detail {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .a11y-issue-text {
    flex: 1 1 16rem;
    min-width: 0;
    font-size: var(--ui-font-size-md);
    color: var(--ui-highlight);
  }

  .review .a11y-issue-text {
    color: var(--ui-text-secondary);
  }

  .fixed .a11y-issue-text {
    color: var(--ui-fixed);
  }

  .a11y-issue-detail {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }

  .a11y-issue-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ui-space-6);
    margin-left: auto;
  }

  .a11y-issue-links :global(.a11y-link) {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-2) var(--ui-space-10);
    background: none;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-full);
    font: inherit;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition: background var(--ui-transition-fast), border-color var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .a11y-issue-links :global(.a11y-link:hover) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-high);
    color: var(--ui-text-primary);
  }

  .a11y-issue-links :global(.a11y-link i) {
    font-size: var(--ui-font-size-xs);
  }
</style>
