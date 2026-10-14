<script lang="ts">
  import type { Snippet } from 'svelte';
  import SectionDivider from '../system/components/SectionDivider.svelte';

  /** Section wrapper. `variant` picks a SectionDivider preset (lg/md/sm).
   *  Each preset is fully configured in the editor — typography, colors,
   *  background, geometry are all owned by the variant. */
  interface Props {
    title: string;
    description?: string;
    eyebrow?: string;
    variant?: 'lg' | 'md' | 'sm';
    gap?: string;
    class?: string;
    children: Snippet;
  }

  let {
    title,
    description,
    eyebrow,
    variant = 'md',
    gap = 'var(--space-24)',
    class: className,
    children,
  }: Props = $props();
</script>

<section class={['demo-section', className]} style:gap>
  <SectionDivider {title} {description} {eyebrow} {variant} />
  {@render children()}
</section>

<style>
  .demo-section {
    grid-column: var(--kit-content);
    display: flex;
    flex-direction: column;
  }
</style>
