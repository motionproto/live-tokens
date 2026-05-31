<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'codesnippet';

  // `element` tags partition the panel into labeled groups (text / frame / icon /
  // scrollbar) via StateBlock; labels drop the prefix the group heading carries.
  // Order is permanent → impermanent. Hover overrides the icon color only.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'color',         element: 'text', variable: '--codesnippet-code-text' },
      { label: 'font family',   element: 'text', variable: '--codesnippet-code-font-family' },
      { label: 'font size',     element: 'text', variable: '--codesnippet-code-font-size' },
      { label: 'font weight',   element: 'text', variable: '--codesnippet-code-font-weight' },
      { label: 'line height',   element: 'text', variable: '--codesnippet-code-line-height' },

      { label: 'surface',       element: 'frame', variable: '--codesnippet-surface' },
      { label: 'border',        element: 'frame', variable: '--codesnippet-border' },
      { label: 'border width',  element: 'frame', variable: '--codesnippet-border-width' },
      { label: 'corner radius', element: 'frame', variable: '--codesnippet-radius' },
      { label: 'padding',       element: 'frame', variable: '--codesnippet-padding' },
      { label: 'gap',           element: 'frame', variable: '--codesnippet-gap' },

      { label: 'color',         element: 'icon', variable: '--codesnippet-icon' },
      { label: 'size',          element: 'icon', variable: '--codesnippet-icon-size' },

      { label: 'thumb',         element: 'scrollbar', variable: '--codesnippet-scrollbar-thumb' },
      { label: 'width',         element: 'scrollbar', variable: '--codesnippet-scrollbar-border-width' },
    ],
    hover: [
      { label: 'icon color', variable: '--codesnippet-hover-icon' },
    ],
  };

  export const allTokens: Token[] = Object.values(states).flat();
</script>

<script lang="ts">
  import CodeSnippet from '../../system/components/CodeSnippet.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';

  let previewCode = $state('npx @motion-proto/live-tokens setup-claude');
</script>

<ComponentEditorBase
  {component}
  title="Code Snippet"
  description="Code display with a copy button. Long lines scroll horizontally; the copy button stays pinned top-right. Shows a brief confirmation popover on copy."
  tokens={allTokens}
>
  <VariantGroup name="codesnippet" title="Code Snippet" {states} {component}>
    {#snippet children({ activeState })}
      <div class="codesnippet-preview">
        <label class="preview-text">
          <span>Preview text</span>
          <textarea
            bind:value={previewCode}
            rows="2"
            spellcheck="false"
            placeholder="Paste a long command or block to preview scrolling"
          ></textarea>
        </label>
        <CodeSnippet
          code={previewCode}
          class={activeState === 'hover' ? 'force-hover' : ''}
        />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .codesnippet-preview {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    padding: var(--ui-space-16);
  }

  /* Fixed width so pasted content overflows and demonstrates horizontal scroll. */
  .codesnippet-preview :global(.codesnippet) {
    width: 24rem;
    max-width: 100%;
  }

  .preview-text {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  .preview-text textarea {
    width: 100%;
    padding: var(--ui-space-8);
    background: var(--ui-surface-lowest);
    color: var(--ui-text-primary);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    resize: vertical;
  }
  .preview-text textarea::placeholder { color: var(--ui-text-muted); opacity: 1; }
</style>
