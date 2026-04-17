<script lang="ts">
  import Button from '../../components/Button.svelte';
  import Tooltip from '../../components/Tooltip.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/Tooltip.svelte';

  const tokens = [
    { label: 'BG', variable: '--tooltip-surface' },
    { label: 'Text', variable: '--tooltip-text' },
    { label: 'Radius', variable: '--tooltip-radius' },
  ];
</script>

<div class="demo-block">
  <h2 class="component-title">Tooltip Component</h2>
  <p class="demo-description">
    Hover tooltip with configurable position. Import from <code>components/Tooltip.svelte</code>
  </p>

  <VariantGroup name="tooltip" title="Tooltip" {tokens} {targetFile}>
    <div class="tooltip-demo-row">
      <Tooltip text="This is a top tooltip">
        <Button variant="outline">Hover me (top)</Button>
      </Tooltip>
      <Tooltip text="Bottom tooltip" position="bottom">
        <Button variant="outline">Hover me (bottom)</Button>
      </Tooltip>
      <Tooltip text="Tooltips work on any element">
        <span class="tooltip-demo-text">Hover this text</span>
      </Tooltip>
    </div>
  </VariantGroup>
</div>

<style>
  .tooltip-demo-row {
    display: flex;
    gap: var(--space-24);
    align-items: center;
    padding-top: var(--space-32);
  }

  .tooltip-demo-text {
    color: var(--ui-text-secondary);
    text-decoration: underline;
    text-decoration-style: dotted;
    cursor: help;
  }
</style>
