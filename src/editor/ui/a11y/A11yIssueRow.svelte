<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** A result to check by eye: a "?" in the tertiary text colour in place of the "!". */
    review?: boolean;
    href?: string;
    linkLabel?: string;
    children: Snippet;
    detail?: Snippet;
    /** A line under the detail, such as the property links of a traced finding. */
    links?: Snippet;
    action?: Snippet;
  }

  let { review = false, href, linkLabel = 'Read the guidance', children, detail, links, action }: Props = $props();
</script>

<li class="a11y-issue" class:review>
  <span class="a11y-issue-mark" aria-hidden="true">{review ? '?' : '!'}</span>
  <div class="a11y-issue-body">
    <p class="a11y-issue-text">{@render children()}</p>
    {#if detail}
      <p class="a11y-issue-detail">{@render detail()}</p>
    {/if}
    {#if links}
      <div class="a11y-issue-links">{@render links()}</div>
    {/if}
  </div>
  {#if action || href}
    <div class="a11y-issue-actions">
      {@render action?.()}
      {#if href}
        <a class="a11y-issue-link" {href} target="_blank" rel="noopener" aria-label={linkLabel} title={linkLabel}>
          <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </a>
      {/if}
    </div>
  {/if}
</li>

<style>
  .a11y-issue {
    display: grid;
    grid-template-columns: var(--ui-space-12) minmax(0, 1fr) auto;
    align-items: baseline;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) 0;
  }

  .a11y-issue + :global(.a11y-issue) {
    border-top: 1px solid var(--ui-border-low);
  }

  .a11y-issue-mark {
    color: var(--ui-highlight);
    font-weight: var(--ui-font-weight-bold);
  }

  .review .a11y-issue-mark {
    color: var(--ui-text-tertiary);
  }

  .a11y-issue-body {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    min-width: 0;
  }

  .a11y-issue-text,
  .a11y-issue-detail {
    margin: 0;
    overflow-wrap: anywhere;
  }

  .a11y-issue-text {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
  }

  .a11y-issue-detail {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }

  .a11y-issue-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-2) var(--ui-space-12);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  .a11y-issue-actions {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
  }

  .a11y-issue-link {
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
  }

  .a11y-issue-link:hover {
    color: var(--ui-text-primary);
  }
</style>
