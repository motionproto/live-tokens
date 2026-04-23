<script lang="ts">
  import DemoHeader from './DemoHeader.svelte';
  import { componentSourceFile } from './componentSources';

  export let component: string;
  export let title: string;
  export let description: string = '';

  $: targetFile = componentSourceFile(component);
</script>

<div class="demo-block">
  <DemoHeader {component} {title} {description} />
  <slot {targetFile} />
</div>
