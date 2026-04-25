<script context="module" lang="ts">
  declare const __PROJECT_ROOT__: string | undefined;
</script>

<script lang="ts">
  import ComponentFileManager from './ComponentFileManager.svelte';
  import { componentSourceFile } from './componentSources';

  const projectRoot: string =
    typeof __PROJECT_ROOT__ !== 'undefined' ? (__PROJECT_ROOT__ ?? '') : '';

  export let component: string;
  export let title: string;
  export let description: string = '';
  export let resetVariables: string[] | null = null;

  $: sourceFile = componentSourceFile(component);
</script>

<div class="demo-header-manager">
  <ComponentFileManager {component} {title} {resetVariables} />
</div>

{#if description || (sourceFile && projectRoot)}
  <div class="demo-description-row">
    {#if description}
      <p class="demo-description">{@html description}</p>
    {/if}
    {#if sourceFile && projectRoot}
      <a
        class="source-link"
        href="vscode://file/{projectRoot}/{sourceFile}"
        title="Open {sourceFile} in VS Code"
      >
        <i class="fas fa-code"></i>
        Source
      </a>
    {/if}
  </div>
{/if}

<style>
  .demo-description-row {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-10);
    justify-content: space-between;
    margin-bottom: var(--space-16);
  }

  .demo-description {
    margin: 0;
    flex: 1;
    color: var(--ui-text-secondary);
  }

  .source-link {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-decoration: none;
    padding: var(--ui-space-2) var(--ui-space-6);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-sm);
    transition: all var(--ui-transition-fast);
    flex-shrink: 0;
  }

  .source-link:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-strong);
    background: var(--ui-hover);
  }

  .demo-header-manager {
    margin-bottom: var(--ui-space-8);
  }
</style>
