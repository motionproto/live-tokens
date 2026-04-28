<script lang="ts">
  import DemoHeader from './DemoHeader.svelte';

  export let component: string;
  export let title: string;
  export let description: string = '';
  export let resetVariables: string[] | null = null;
</script>

<div class="demo-block">
  <DemoHeader {component} {title} {description} {resetVariables} />
  <slot />
</div>
