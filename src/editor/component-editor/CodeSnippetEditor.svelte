<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'codesnippet';

  // Single variant. Default carries every container, code, and icon token;
  // hover layers a single icon-color override on top.
  const states: Record<string, Token[]> = {
    default: [
      { label: 'surface',          variable: '--codesnippet-surface' },
      { label: 'border',           variable: '--codesnippet-border' },
      { label: 'border width',     variable: '--codesnippet-border-width' },
      { label: 'corner radius',    variable: '--codesnippet-radius' },
      { label: 'padding',          variable: '--codesnippet-padding' },
      { label: 'gap',              variable: '--codesnippet-gap' },
      { label: 'code text',        variable: '--codesnippet-code-text' },
      { label: 'code font family', variable: '--codesnippet-code-font-family' },
      { label: 'code font size',   variable: '--codesnippet-code-font-size' },
      { label: 'code font weight', variable: '--codesnippet-code-font-weight' },
      { label: 'code line height', variable: '--codesnippet-code-line-height' },
      { label: 'icon color',       variable: '--codesnippet-icon' },
      { label: 'icon size',        variable: '--codesnippet-icon-size' },
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
</script>

<ComponentEditorBase
  {component}
  title="Code Snippet"
  description="Single-line code display with a copy button. Shows a brief confirmation popover on copy."
  tokens={allTokens}
>
  <VariantGroup name="codesnippet" title="Code Snippet" {states} {component}>
    {#snippet children({ activeState })}
      <div class="codesnippet-preview">
        <CodeSnippet
          code="npx @motion-proto/live-tokens setup-claude"
          class={activeState === 'hover' ? 'force-hover' : ''}
        />
      </div>
    {/snippet}
  </VariantGroup>
</ComponentEditorBase>

<style>
  .codesnippet-preview {
    display: flex;
    padding: var(--ui-space-16);
  }
</style>
