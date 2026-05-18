<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'default' | 'secondary';
    size?: 'default' | 'compact';
    icon?: string;
    href?: string;
    target?: string;
    disabled?: boolean;
    title?: string;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    variant = 'default',
    size = 'default',
    icon,
    href,
    target,
    disabled = false,
    title,
    type = 'button',
    onclick,
    children,
  }: Props = $props();
</script>

{#if href}
  <a
    class="ui-pill ui-pill-{variant} ui-pill-{size}"
    {href}
    {target}
    {title}
    {onclick}
    rel={target === '_blank' ? 'noopener noreferrer' : undefined}
    aria-disabled={disabled ? 'true' : undefined}
  >
    {#if icon}<i class="fas {icon}" aria-hidden="true"></i>{/if}
    {#if children}{@render children()}{/if}
  </a>
{:else}
  <button
    class="ui-pill ui-pill-{variant} ui-pill-{size}"
    {type}
    {disabled}
    {title}
    {onclick}
  >
    {#if icon}<i class="fas {icon}" aria-hidden="true"></i>{/if}
    {#if children}{@render children()}{/if}
  </button>
{/if}

<style>
  .ui-pill {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.25) 100%);
    border: 1px solid rgba(255, 255, 255, 0.5);
    color: var(--ui-text-primary);
    font-family: inherit;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    line-height: 1;
    padding: var(--ui-space-6) var(--ui-space-16);
    border-radius: var(--ui-radius-full);
    cursor: pointer;
    text-decoration: none;
    transition: background var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }

  .ui-pill:hover:not(:disabled):not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.45) 100%);
    border-color: rgba(255, 255, 255, 0.75);
  }

  .ui-pill:disabled,
  .ui-pill[aria-disabled='true'] {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.10) 100%);
    border-color: rgba(255, 255, 255, 0.22);
    color: var(--ui-text-muted);
    cursor: not-allowed;
    pointer-events: none;
  }
  .ui-pill:disabled i,
  .ui-pill[aria-disabled='true'] i {
    color: rgba(255, 255, 255, 0.28);
  }

  .ui-pill-primary:disabled,
  .ui-pill-primary[aria-disabled='true'] {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.03) 100%);
    border-color: rgba(255, 255, 255, 0.24);
  }

  .ui-pill-secondary:disabled,
  .ui-pill-secondary[aria-disabled='true'] {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .ui-pill i {
    font-size: var(--ui-font-size-xs);
    color: rgba(255, 255, 255, 0.65);
  }

  /* Variant: primary — heavier gradient + brighter border for CTAs */
  .ui-pill-primary {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 100%);
    border-color: rgba(255, 255, 255, 0.55);
  }
  .ui-pill-primary:hover:not(:disabled):not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.12) 100%);
    border-color: rgba(255, 255, 255, 0.7);
  }

  /* Variant: secondary — lighter, for low-emphasis actions */
  .ui-pill-secondary {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%);
    border-color: rgba(255, 255, 255, 0.30);
  }
  .ui-pill-secondary:hover:not(:disabled):not([aria-disabled='true']) {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%);
    border-color: rgba(255, 255, 255, 0.5);
  }

  /* Size: compact — for header bars / chrome rails */
  .ui-pill-compact {
    font-size: var(--ui-font-size-sm);
    padding: var(--ui-space-2) var(--ui-space-12);
  }
</style>
