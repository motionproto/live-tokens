<script lang="ts">
  import ProgressBar from '../../components/ProgressBar.svelte';
  import TokenMap from '../TokenMap.svelte';
</script>

<div class="demo-block">
  <h2 class="component-title">Progress Bar Component</h2>
  <p class="demo-description">
    Animated progress bar with variants. Import from <code>components/ProgressBar.svelte</code>
  </p>

  <div class="demo-section">
    <div class="progress-demo-stack">
      <ProgressBar value={25} label="Getting Started" variant="primary" />
      <ProgressBar value={50} label="Halfway There" variant="info" />
      <ProgressBar value={75} label="Almost Done" variant="warning" />
      <ProgressBar value={100} label="Complete" variant="success" />
      <ProgressBar value={33} label="Danger Zone" variant="danger" />
      <ProgressBar value={60} variant="primary" size="compact" />
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Tokens</h3>
    <div class="token-sections">
      <TokenMap title="track" tokens={[
        { label: 'Background', variable: '--surface-neutral-low' },
        { label: 'Border', variable: '--border-neutral-faint' },
        { label: 'Label', variable: '--text-secondary' },
      ]} />
      <TokenMap title="fill colors" tokens={[
        { label: 'Success', variable: '--border-success' },
        { label: 'Warning', variable: '--border-warning' },
        { label: 'Danger', variable: '--border-danger' },
        { label: 'Info', variable: '--border-info' },
      ]} />
    </div>
  </div>
</div>

<style>
  .progress-demo-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    max-width: 400px;
  }

  .token-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }
</style>
