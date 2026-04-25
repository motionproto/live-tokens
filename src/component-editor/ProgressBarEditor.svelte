<script lang="ts">
  import ProgressBar from '../components/ProgressBar.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';

  const component = 'progressbar';

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const variantTokens: Record<string, Token[]> = {
    primary: [
      { label: 'fill color', variable: '--progressbar-primary-fill' },
      { label: 'track surface color', variable: '--progressbar-primary-track-surface' },
      { label: 'track border color', variable: '--progressbar-primary-track-border' },
      { label: 'label color', variable: '--progressbar-primary-label' },
      { label: 'value color', variable: '--progressbar-primary-value' },
      { label: 'radius', canBeShared: true, variable: '--progressbar-primary-radius' },
    ],
    success: [
      { label: 'fill color', variable: '--progressbar-success-fill' },
      { label: 'track surface color', variable: '--progressbar-success-track-surface' },
      { label: 'track border color', variable: '--progressbar-success-track-border' },
      { label: 'label color', variable: '--progressbar-success-label' },
      { label: 'value color', variable: '--progressbar-success-value' },
      { label: 'radius', canBeShared: true, variable: '--progressbar-success-radius' },
    ],
    warning: [
      { label: 'fill color', variable: '--progressbar-warning-fill' },
      { label: 'track surface color', variable: '--progressbar-warning-track-surface' },
      { label: 'track border color', variable: '--progressbar-warning-track-border' },
      { label: 'label color', variable: '--progressbar-warning-label' },
      { label: 'value color', variable: '--progressbar-warning-value' },
      { label: 'radius', canBeShared: true, variable: '--progressbar-warning-radius' },
    ],
    danger: [
      { label: 'fill color', variable: '--progressbar-danger-fill' },
      { label: 'track surface color', variable: '--progressbar-danger-track-surface' },
      { label: 'track border color', variable: '--progressbar-danger-track-border' },
      { label: 'label color', variable: '--progressbar-danger-label' },
      { label: 'value color', variable: '--progressbar-danger-value' },
      { label: 'radius', canBeShared: true, variable: '--progressbar-danger-radius' },
    ],
    info: [
      { label: 'fill color', variable: '--progressbar-info-fill' },
      { label: 'track surface color', variable: '--progressbar-info-track-surface' },
      { label: 'track border color', variable: '--progressbar-info-track-border' },
      { label: 'label color', variable: '--progressbar-info-label' },
      { label: 'value color', variable: '--progressbar-info-value' },
      { label: 'radius', canBeShared: true, variable: '--progressbar-info-radius' },
    ],
  };
</script>

<ComponentEditorBase {component} title="Progress Bar" description="Animated progress bar with variants. Import from <code>components/ProgressBar.svelte</code>" let:targetFile>
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
