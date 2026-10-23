<script lang="ts">
  import ComponentFileManager from './ComponentFileManager.svelte';
  import A11yPanel from '../../ui/a11y/A11yPanel.svelte';

  interface Props {
    component: string;
    title: string;
    description?: string;
    resetVariables?: string[] | null;
  }

  let {
    component,
    title,
    description = '',
    resetVariables = null
  }: Props = $props();
</script>

<ComponentFileManager {component} {title} {resetVariables} />
<A11yPanel {component} />

{#if description}
  <p class="demo-description">{@html description}</p>
{/if}

<style>
  .demo-description {
    margin: 0;
    color: var(--ui-text-secondary);
  }
</style>
