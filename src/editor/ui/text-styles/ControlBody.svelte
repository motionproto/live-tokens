<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    width: string;
    /** Null draws no link bar. */
    linked: boolean | null;
    children: Snippet;
    /** Content after the body, such as a lock or a unit. */
    after?: Snippet;
  }

  let { width, linked, children, after }: Props = $props();
</script>

{#if linked === null}
  <div class="ctl-body" style:--w={width}>{@render children()}</div>
{:else}
  <div class="linkwrap" class:is-unlinked={!linked}>
    <div class="ctl-body" style:--w={width}>{@render children()}</div>
    {@render after?.()}
  </div>
{/if}

<style>
  /* The link bar matches the editor's token selectors: a white bar flush
     against a linked control, an amber tick beside an indented unlinked one. */
  .linkwrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    min-width: 0;
    padding-left: 4px;
  }

  .linkwrap::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    width: 4px;
    height: 1.75rem;
    background: var(--ui-text-primary);
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    transform: translateY(-50%);
    pointer-events: none;
    transition:
      width 220ms cubic-bezier(0.4, 0, 0.2, 1),
      height 220ms cubic-bezier(0.4, 0, 0.2, 1),
      background-color 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .linkwrap.is-unlinked {
    padding-left: 10px;
  }

  .linkwrap.is-unlinked::before {
    width: 2px;
    height: 0.875rem;
    background: var(--ui-link-broken);
    border-radius: 1px;
  }

  /* Unlinking indents the body by 6px and narrows it by as much, so whatever
     follows holds its position. */
  .ctl-body {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: var(--w);
    min-width: 0;
  }

  .is-unlinked > .ctl-body {
    width: calc(var(--w) - 6px);
  }

  .ctl-body > :global(*) {
    flex: 1 1 auto;
    min-width: 0;
  }

  .ctl-body :global(.ui-token-selector) {
    display: block;
    width: 100%;
  }

  /* The trigger names the value; a resolved-value line under it would push
     the lock off the trigger's centre line. */
  .ctl-body :global(.ui-ts-meta-text) {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .linkwrap::before {
      transition: none;
    }
  }
</style>
