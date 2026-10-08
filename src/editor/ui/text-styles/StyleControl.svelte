<script lang="ts">
  import type { Snippet } from 'svelte';
  import ControlBody from './ControlBody.svelte';
  import ResetIcon from './ResetIcon.svelte';

  interface Link {
    linked: boolean;
    /** What the linked value shows, such as the usage's face. */
    text: string;
    /** The link expression, shown as the linked value's tooltip. */
    title: string;
    ontoggle: () => void;
  }

  interface Props {
    label: string;
    /** Names the control in accessible labels, such as `heading-xl face`. */
    name: string;
    width: string;
    resetVisible: boolean;
    onreset: () => void;
    link?: Link;
    children: Snippet;
  }

  let { label, name, width, resetVisible, onreset, link, children }: Props = $props();
</script>

<div class="ctl" data-reset-scope>
  <div class="ctl-head">
    <span class="ctl-label">{label}</span>
    <ResetIcon label={name} visible={resetVisible} {onreset} />
  </div>
  <ControlBody {width} linked={link ? link.linked : null}>
    {#if link?.linked}
      <span class="linked-value" title={link.title}>{link.text}</span>
    {:else}
      {@render children()}
    {/if}
    {#snippet after()}
      {#if link}
        <button
          type="button"
          class="lock"
          class:is-unlinked={!link.linked}
          aria-pressed={link.linked}
          aria-label="{link.linked ? 'Unlink' : 'Relink'} {name}"
          title={link.linked ? 'Unlink' : 'Relink'}
          onclick={link.ontoggle}
        >
          <i class="fas {link.linked ? 'fa-lock' : 'fa-lock-open'}" aria-hidden="true"></i>
        </button>
      {/if}
    {/snippet}
  </ControlBody>
</div>

<style>
  .ctl {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-width: 0;
  }

  /* The label line has a fixed height and the reset icon trails the label, so
     showing or hiding the icon moves nothing. */
  .ctl-head {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
    height: 18px;
    min-width: 0;
  }

  .ctl-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    white-space: nowrap;
  }

  .linked-value {
    box-sizing: border-box;
    display: block;
    height: 1.75rem;
    padding: 0 var(--ui-space-8);
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-low);
    border-left: none;
    border-radius: 0 var(--ui-radius-md) var(--ui-radius-md) 0;
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    line-height: calc(1.75rem - 2px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lock {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-tertiary);
    font-size: 0.8125rem;
    cursor: pointer;
  }

  .lock:hover {
    color: var(--ui-text-primary);
    background: var(--ui-surface-higher);
  }

  .lock:focus-visible {
    outline: 2px solid var(--ui-text-primary);
    outline-offset: 1px;
  }

  .lock.is-unlinked {
    color: var(--ui-link-broken);
  }
</style>
