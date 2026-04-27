<script lang="ts">
  import ComponentFileManager from './ComponentFileManager.svelte';

  export let component: string;
  export let title: string;
  export let description: string = '';
  export let resetVariables: string[] | null = null;
</script>

<ComponentFileManager {component} {title} {resetVariables} />

{#if description}
  <p class="demo-description">{@html description}</p>
{/if}

<style>
  .demo-description {
    margin: 0;
    color: var(--ui-text-secondary);
  }
</style>
