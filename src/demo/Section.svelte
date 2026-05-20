<script lang="ts">
  import SectionDivider from '../system/components/SectionDivider.svelte';

  interface Props {
    title: string;
    description?: string;
    variant?: 'canvas' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special';
    gap?: string;
    children: () => unknown;
  }

  let {
    title,
    description,
    variant = 'accent',
    gap = 'var(--space-24)',
    children,
  }: Props = $props();
</script>

<section class="demo-section" style:gap>
  <SectionDivider {title} {description} {variant} />
  {@render children()}
</section>

<style>
  .demo-section {
    grid-column: 2 / span 10;
    display: flex;
    flex-direction: column;
  }

  @media (max-width: 960px) {
    .demo-section {
      grid-column: 1 / -1;
    }
  }
</style>
