<script lang="ts">
  import SectionDivider from '../../components/SectionDivider.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/SectionDivider.svelte';

  type Token = { label: string; variable: string };

  const paletteFor = (palette: string): Token[] => [
    { label: 'Gradient High', variable: `--section-divider-${palette}-gradient-high` },
    { label: 'Gradient Mid', variable: `--section-divider-${palette}-gradient-mid` },
    { label: 'Gradient Low', variable: `--section-divider-${palette}-gradient-low` },
    { label: 'Gradient Base', variable: `--section-divider-${palette}-gradient-base` },
    { label: 'Text Stroke', variable: `--section-divider-${palette}-text-stroke` },
    { label: 'Radius', variable: `--section-divider-${palette}-radius` },
  ];

  const variants: { key: 'bg' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special'; title: string }[] = [
    { key: 'bg', title: 'Background' },
    { key: 'neutral', title: 'Neutral' },
    { key: 'alternate', title: 'Alternate' },
    { key: 'primary', title: 'Primary' },
    { key: 'accent', title: 'Accent' },
    { key: 'special', title: 'Special' },
  ];
</script>

<div class="demo-block">
  <h2 class="component-title">Section Divider Component</h2>
  <p class="demo-description">
    Full-width section banner with display font and palette variants. Import from <code>components/SectionDivider.svelte</code>
  </p>

  {#each variants as v}
    <VariantGroup name={v.key} title={v.title} tokens={paletteFor(v.key)} {targetFile}>
      <SectionDivider title={v.title} variant={v.key} />
    </VariantGroup>
  {/each}

  <VariantGroup
    name="with-description"
    title="With Description"
    tokens={paletteFor('bg')}
    {targetFile}
  >
    <SectionDivider
      title="Community Modules"
      variant="bg"
      description="These modules were created by other authors and are no longer actively maintained."
    />
  </VariantGroup>
</div>
