<script lang="ts">
  import hljs from 'highlight.js/lib/core';

  interface Props {
    lang?: string;
    text: string;
  }
  let { lang, text }: Props = $props();

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  let resolvedLang = $derived(lang && hljs.getLanguage(lang) ? lang : null);
  let highlighted = $derived.by(() => {
    if (!resolvedLang) return escapeHtml(text);
    try {
      return hljs.highlight(text, { language: resolvedLang, ignoreIllegals: true }).value;
    } catch {
      return escapeHtml(text);
    }
  });
</script>

<div class="code-block">
  <pre><code class="hljs">{@html highlighted}</code></pre>
  {#if lang}
    <span class="lang-tag">{lang}</span>
  {/if}
</div>

<style>
  .code-block {
    position: relative;
    margin: 0 0 var(--space-20, 1.25rem);
    background: var(--surface-neutral-lower, #162027);
    border: var(--border-width-1, 1px) solid var(--border-neutral-subtle, #3a4146);
    border-radius: var(--radius-xl, 0.5rem);
    overflow: hidden;
  }

  pre {
    margin: 0;
    padding: var(--space-16, 1rem) var(--space-20, 1.25rem);
    overflow-x: auto;
    font-size: var(--font-size-sm, 0.875rem);
    line-height: var(--line-height-md, 1.6);
  }

  pre code {
    font-family: var(--font-mono, ui-monospace, monospace);
    background: none;
    color: var(--text-primary, #fff);
    padding: 0;
    border: 0;
    white-space: pre;
  }

  .lang-tag {
    position: absolute;
    top: 0;
    right: 0;
    padding: var(--space-4, 0.25rem) var(--space-12, 0.75rem);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--text-tertiary, #7e8285);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wider, 0.06em);
    background: color-mix(in srgb, var(--surface-neutral-lowest, #040c13) 60%, transparent);
    border-left: var(--border-width-1, 1px) solid var(--border-neutral-faint, #1c2327);
    border-bottom: var(--border-width-1, 1px) solid var(--border-neutral-faint, #1c2327);
    border-radius: 0 var(--radius-xl, 0.5rem) 0 var(--radius-md, 0.25rem);
    pointer-events: none;
  }

  /* highlight.js token overrides keyed to design-system tokens */
  pre code :global(.hljs-keyword),
  pre code :global(.hljs-built_in) { color: var(--text-brand, #ff75b1); }
  pre code :global(.hljs-string)   { color: var(--text-accent, #009d9a); }
  pre code :global(.hljs-comment)  { color: var(--text-tertiary, #7e8285); font-style: italic; }
  pre code :global(.hljs-number)   { color: var(--text-brand-secondary, #df2d88); }
  pre code :global(.hljs-title),
  pre code :global(.hljs-title.function_),
  pre code :global(.hljs-attr)     { color: var(--text-secondary, #c2cacf); }
  pre code :global(.hljs-name),
  pre code :global(.hljs-variable) { color: var(--text-primary, #fff); }
  pre code :global(.hljs-tag),
  pre code :global(.hljs-meta)     { color: var(--text-accent-secondary, #1f7673); }
</style>
