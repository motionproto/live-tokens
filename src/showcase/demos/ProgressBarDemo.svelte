<script lang="ts">
  import ProgressBar from '../../components/ProgressBar.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/ProgressBar.svelte';

  type Token = { label: string; variable: string };

  const trackTokensFor = (variant: string): Token[] => [
    { label: 'Track BG', variable: `--progress-${variant}-track-bg` },
    { label: 'Track Border', variable: `--progress-${variant}-track-border` },
    { label: 'Label', variable: `--progress-${variant}-label` },
    { label: 'Value', variable: `--progress-${variant}-value` },
    { label: 'Radius', variable: `--progress-${variant}-radius` },
  ];

  const variantTokens: Record<string, Token[]> = {
    primary: [...trackTokensFor('primary')],
    success: [{ label: 'Fill', variable: '--progress-success-fill' }, ...trackTokensFor('success')],
    warning: [{ label: 'Fill', variable: '--progress-warning-fill' }, ...trackTokensFor('warning')],
    danger: [{ label: 'Fill', variable: '--progress-danger-fill' }, ...trackTokensFor('danger')],
    info: [{ label: 'Fill', variable: '--progress-info-fill' }, ...trackTokensFor('info')],
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Progress Bar Component</h2>
  <p class="demo-description">
    Animated progress bar with variants. Import from <code>components/ProgressBar.svelte</code>
  </p>

  <VariantGroup name="primary" title="Primary" tokens={variantTokens.primary} {targetFile}>
    <div class="progress-demo-stack">
      <ProgressBar value={25} label="Getting Started" variant="primary" />
      <ProgressBar value={60} variant="primary" size="compact" />
    </div>
  </VariantGroup>

  <VariantGroup name="success" title="Success" tokens={variantTokens.success} {targetFile}>
    <div class="progress-demo-stack">
      <ProgressBar value={100} label="Complete" variant="success" />
    </div>
  </VariantGroup>

  <VariantGroup name="warning" title="Warning" tokens={variantTokens.warning} {targetFile}>
    <div class="progress-demo-stack">
      <ProgressBar value={75} label="Almost Done" variant="warning" />
    </div>
  </VariantGroup>

  <VariantGroup name="danger" title="Danger" tokens={variantTokens.danger} {targetFile}>
    <div class="progress-demo-stack">
      <ProgressBar value={33} label="Danger Zone" variant="danger" />
    </div>
  </VariantGroup>

  <VariantGroup name="info" title="Info" tokens={variantTokens.info} {targetFile}>
    <div class="progress-demo-stack">
      <ProgressBar value={50} label="Halfway There" variant="info" />
    </div>
  </VariantGroup>
</div>

<style>
  .progress-demo-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    max-width: 400px;
  }
</style>
