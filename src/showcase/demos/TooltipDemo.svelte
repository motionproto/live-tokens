<script lang="ts">
  import Button from '../../components/Button.svelte';
  import Tooltip from '../../components/Tooltip.svelte';
  import TokenMap from '../TokenMap.svelte';
</script>

<div class="demo-block">
  <h2 class="component-title">Tooltip Component</h2>
  <p class="demo-description">
    Hover tooltip with configurable position. Import from <code>components/Tooltip.svelte</code>
  </p>

  <div class="demo-section">
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
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Tokens</h3>
    <TokenMap tokens={[
      { label: 'Background', variable: '--surface-neutral-highest' },
      { label: 'Text', variable: '--text-primary' },
    ]} />
  </div>
</div>

<style>
  @import '../../styles/variables.css';

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
