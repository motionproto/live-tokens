<script lang="ts">
  import DemoHeader from './DemoHeader.svelte';
  import { componentSourceFile } from './componentSources';

  export let component: string;
  export let title: string;
  export let description: string = '';
  export let resetVariables: string[] | null = null;

  $: targetFile = componentSourceFile(component);
</script>

<div class="demo-block">
  <DemoHeader {component} {title} {description} {resetVariables} />
  <slot {targetFile} />
</div>
