<script lang="ts">
  import ComponentFileManager from './ComponentFileManager.svelte';

  export let component: string;
  export let title: string;
  export let description: string = '';
</script>

<h2 class="component-title">{title}</h2>
{#if description}
  <p class="demo-description">{@html description}</p>
{/if}

<div class="demo-header-manager">
  <ComponentFileManager {component} />
</div>

<style>
  .demo-header-manager {
    max-width: 18rem;
    margin-bottom: var(--space-16);
  }
</style>
