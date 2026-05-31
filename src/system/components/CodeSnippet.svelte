<!--
  CodeSnippet.svelte — code display with a copy button pinned top-right. Click
  the button to copy `code` to the clipboard; a Tooltip-rendered confirmation
  ("Copied") flashes briefly above the button.
-->
<script lang="ts">
  import Tooltip from './Tooltip.svelte';

  interface Props {
    code: string;
    /** ARIA label for the copy button. */
    copyLabel?: string;
    /** Editor preview hook: adds `.force-hover` so hover tokens paint without a pointer. */
    class?: string;
  }

  let {
    code,
    copyLabel = 'Copy to clipboard',
    class: className = '',
  }: Props = $props();

  let copied = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard unavailable (insecure context, denied permission). Still flash
      // the confirmation so the editor preview shows the popover behavior.
    }
    copied = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { copied = false; }, 1500);
  }
</script>

<div class="codesnippet {className}">
  <code class="code">{code}</code>
  <Tooltip text={copied ? 'Copied' : ''} open={copied} position="top">
    <button
      type="button"
      class="copy"
      onclick={copy}
      aria-label={copyLabel}
    >
      <i class="fas fa-copy" aria-hidden="true"></i>
    </button>
  </Tooltip>
</div>

<style>
  :global(:root) {
    /* Container. */
    --codesnippet-surface: color-mix(in srgb, var(--surface-neutral-lowest) 76%, transparent);
    --codesnippet-border: var(--border-neutral);
    --codesnippet-border-width: var(--border-width-1);
    --codesnippet-radius: var(--radius-md);
    --codesnippet-padding: var(--space-16);
    --codesnippet-gap: var(--space-16);

    /* Code text. */
    --codesnippet-code-text: var(--text-brand-secondary);
    --codesnippet-code-font-family: var(--font-mono);
    --codesnippet-code-font-size: var(--font-size-md);
    --codesnippet-code-font-weight: var(--font-weight-normal);
    --codesnippet-code-line-height: var(--line-height-md);

    /* Copy icon (default + hover). */
    --codesnippet-icon: var(--text-secondary);
    --codesnippet-icon-size: var(--font-size-md);
    --codesnippet-hover-icon: var(--text-primary);

    /* Horizontal-scroll scrollbar. */
    --codesnippet-scrollbar-border-width: var(--border-width-6);
    --codesnippet-scrollbar-thumb: var(--text-tertiary);
  }

  .codesnippet {
    display: inline-flex;
    align-items: flex-start;
    gap: var(--codesnippet-gap);
    max-width: 100%;
    padding: var(--codesnippet-padding);
    background: var(--codesnippet-surface);
    border: var(--codesnippet-border-width) solid var(--codesnippet-border);
    border-radius: var(--codesnippet-radius);
  }

  .code {
    flex: 1 1 auto;
    min-width: 0;
    color: var(--codesnippet-code-text);
    font-family: var(--codesnippet-code-font-family);
    font-size: var(--codesnippet-code-font-size);
    font-weight: var(--codesnippet-code-font-weight);
    line-height: var(--codesnippet-code-line-height);
    white-space: pre;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--codesnippet-scrollbar-thumb) transparent;
  }

  .code::-webkit-scrollbar {
    height: var(--codesnippet-scrollbar-border-width);
  }

  .code::-webkit-scrollbar-track {
    background: transparent;
  }

  .code::-webkit-scrollbar-thumb {
    background: var(--codesnippet-scrollbar-thumb);
    border-radius: var(--radius-full);
  }

  .copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--codesnippet-icon);
    font-size: var(--codesnippet-icon-size);
    cursor: pointer;
    transition: color var(--duration-150);
  }

  .copy:hover,
  .codesnippet.force-hover .copy {
    color: var(--codesnippet-hover-icon);
  }
</style>
