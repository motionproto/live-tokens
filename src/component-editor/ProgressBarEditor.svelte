<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';

  const component = 'progressbar';

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const variantTokens: Record<string, Token[]> = {
    primary: [
      { label: 'fill color', variable: '--progress-primary-fill' },
      { label: 'track surface color', variable: '--progress-primary-track-bg' },
      { label: 'track border color', variable: '--progress-primary-track-border' },
      { label: 'label color', variable: '--progress-primary-label' },
      { label: 'value color', variable: '--progress-primary-value' },
      { label: 'radius', canBeShared: true, variable: '--progress-primary-radius' },
    ],
    success: [
      { label: 'fill color', variable: '--progress-success-fill' },
      { label: 'track surface color', variable: '--progress-success-track-bg' },
      { label: 'track border color', variable: '--progress-success-track-border' },
      { label: 'label color', variable: '--progress-success-label' },
      { label: 'value color', variable: '--progress-success-value' },
      { label: 'radius', canBeShared: true, variable: '--progress-success-radius' },
    ],
    warning: [
      { label: 'fill color', variable: '--progress-warning-fill' },
      { label: 'track surface color', variable: '--progress-warning-track-bg' },
      { label: 'track border color', variable: '--progress-warning-track-border' },
      { label: 'label color', variable: '--progress-warning-label' },
      { label: 'value color', variable: '--progress-warning-value' },
      { label: 'radius', canBeShared: true, variable: '--progress-warning-radius' },
    ],
    danger: [
      { label: 'fill color', variable: '--progress-danger-fill' },
      { label: 'track surface color', variable: '--progress-danger-track-bg' },
      { label: 'track border color', variable: '--progress-danger-track-border' },
      { label: 'label color', variable: '--progress-danger-label' },
      { label: 'value color', variable: '--progress-danger-value' },
      { label: 'radius', canBeShared: true, variable: '--progress-danger-radius' },
    ],
    info: [
      { label: 'fill color', variable: '--progress-info-fill' },
      { label: 'track surface color', variable: '--progress-info-track-bg' },
      { label: 'track border color', variable: '--progress-info-track-border' },
      { label: 'label color', variable: '--progress-info-label' },
      { label: 'value color', variable: '--progress-info-value' },
      { label: 'radius', canBeShared: true, variable: '--progress-info-radius' },
    ],
  };
</script>

<ComponentEditorBase {component} title="Progress Bar Component" description="Animated progress bar with variants. Import from <code>components/ProgressBar.svelte</code>" let:targetFile>
  <VariantGroup name="primary" title="Primary" tokens={variantTokens.primary} {targetFile} {component}>
    <div class="progress-demo-stack">
      <ProgressBar value={25} label="Getting Started" variant="primary" />
      <ProgressBar value={60} variant="primary" size="compact" />
    </div>
  </VariantGroup>

  <VariantGroup name="success" title="Success" tokens={variantTokens.success} {targetFile} {component}>
    <div class="progress-demo-stack">
      <ProgressBar value={100} label="Complete" variant="success" />
    </div>
  </VariantGroup>

  <VariantGroup name="warning" title="Warning" tokens={variantTokens.warning} {targetFile} {component}>
    <div class="progress-demo-stack">
      <ProgressBar value={75} label="Almost Done" variant="warning" />
    </div>
  </VariantGroup>

  <VariantGroup name="danger" title="Danger" tokens={variantTokens.danger} {targetFile} {component}>
    <div class="progress-demo-stack">
      <ProgressBar value={33} label="Danger Zone" variant="danger" />
    </div>
  </VariantGroup>

  <VariantGroup name="info" title="Info" tokens={variantTokens.info} {targetFile} {component}>
    <div class="progress-demo-stack">
      <ProgressBar value={50} label="Halfway There" variant="info" />
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .progress-demo-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    max-width: 400px;
  }
</style>
