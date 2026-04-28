<script lang="ts">
  import Button from '../components/Button.svelte';
  import Toggle from '../components/Toggle.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import FieldsetWrapper from './scaffolding/FieldsetWrapper.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias } from '../lib/editorStore';

  const component = 'button';

  $: shimmerEnabled = $editorState.components.button?.aliases['--button-shimmer'] !== '--shimmer-off';

  function handleShimmerChange(e: CustomEvent<boolean>) {
    setComponentAlias('button', '--button-shimmer', e.detail ? '--shimmer-on' : '--shimmer-off');
  }

  type Token = { label: string; variable: string; canBeShared?: boolean };

  const variantStates: Record<string, Record<string, Token[]>> = {
    primary: {
      default: [
        { label: 'surface color', variable: '--button-primary-surface' },
        { label: 'text color', variable: '--button-primary-text' },
        { label: 'border color', variable: '--button-primary-border' },
        { label: 'radius', canBeShared: true, variable: '--button-primary-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-primary-hover-surface' },
        { label: 'text color', variable: '--button-primary-hover-text' },
        { label: 'border color', variable: '--button-primary-hover-border' },
        { label: 'radius', canBeShared: true, variable: '--button-primary-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-primary-disabled-surface' },
        { label: 'text color', variable: '--button-primary-disabled-text' },
        { label: 'border color', variable: '--button-primary-disabled-border' },
        { label: 'radius', canBeShared: true, variable: '--button-primary-radius' },
      ],
    },
    secondary: {
      default: [
        { label: 'surface color', variable: '--button-secondary-surface' },
        { label: 'text color', variable: '--button-secondary-text' },
        { label: 'border color', variable: '--button-secondary-border' },
        { label: 'radius', canBeShared: true, variable: '--button-secondary-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-secondary-hover-surface' },
        { label: 'text color', variable: '--button-secondary-hover-text' },
        { label: 'border color', variable: '--button-secondary-hover-border' },
        { label: 'radius', canBeShared: true, variable: '--button-secondary-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-secondary-disabled-surface' },
        { label: 'text color', variable: '--button-secondary-disabled-text' },
        { label: 'border color', variable: '--button-secondary-disabled-border' },
        { label: 'radius', canBeShared: true, variable: '--button-secondary-radius' },
      ],
    },
    outline: {
      default: [
        { label: 'surface color', variable: '--button-outline-surface' },
        { label: 'text color', variable: '--button-outline-text' },
        { label: 'border color', variable: '--button-outline-border' },
        { label: 'radius', canBeShared: true, variable: '--button-outline-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-outline-hover-surface' },
        { label: 'text color', variable: '--button-outline-hover-text' },
        { label: 'border color', variable: '--button-outline-hover-border' },
        { label: 'radius', canBeShared: true, variable: '--button-outline-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-outline-disabled-surface' },
        { label: 'text color', variable: '--button-outline-disabled-text' },
        { label: 'border color', variable: '--button-outline-disabled-border' },
        { label: 'radius', canBeShared: true, variable: '--button-outline-radius' },
      ],
    },
    success: {
      default: [
        { label: 'surface color', variable: '--button-success-surface' },
        { label: 'text color', variable: '--button-success-text' },
        { label: 'border color', variable: '--button-success-border' },
        { label: 'radius', canBeShared: true, variable: '--button-success-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-success-hover-surface' },
        { label: 'text color', variable: '--button-success-hover-text' },
        { label: 'border color', variable: '--button-success-hover-border' },
        { label: 'radius', canBeShared: true, variable: '--button-success-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-success-disabled-surface' },
        { label: 'text color', variable: '--button-success-disabled-text' },
        { label: 'border color', variable: '--button-success-disabled-border' },
        { label: 'radius', canBeShared: true, variable: '--button-success-radius' },
      ],
    },
    danger: {
      default: [
        { label: 'surface color', variable: '--button-danger-surface' },
        { label: 'text color', variable: '--button-danger-text' },
        { label: 'border color', variable: '--button-danger-border' },
        { label: 'radius', canBeShared: true, variable: '--button-danger-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-danger-hover-surface' },
        { label: 'text color', variable: '--button-danger-hover-text' },
        { label: 'border color', variable: '--button-danger-hover-border' },
        { label: 'radius', canBeShared: true, variable: '--button-danger-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-danger-disabled-surface' },
        { label: 'text color', variable: '--button-danger-disabled-text' },
        { label: 'border color', variable: '--button-danger-disabled-border' },
        { label: 'radius', canBeShared: true, variable: '--button-danger-radius' },
      ],
    },
    warning: {
      default: [
        { label: 'surface color', variable: '--button-warning-surface' },
        { label: 'text color', variable: '--button-warning-text' },
        { label: 'border color', variable: '--button-warning-border' },
        { label: 'radius', canBeShared: true, variable: '--button-warning-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-warning-hover-surface' },
        { label: 'text color', variable: '--button-warning-hover-text' },
        { label: 'border color', variable: '--button-warning-hover-border' },
        { label: 'radius', canBeShared: true, variable: '--button-warning-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-warning-disabled-surface' },
        { label: 'text color', variable: '--button-warning-disabled-text' },
        { label: 'border color', variable: '--button-warning-disabled-border' },
        { label: 'radius', canBeShared: true, variable: '--button-warning-radius' },
      ],
    },
  };
</script>

<ComponentEditorBase {component} title="Button" description="Reusable button component with multiple variants and sizes. Import from <code>components/Button.svelte</code>" let:targetFile>
  <FieldsetWrapper legend="shared">
    <div class="shared-row">
      <span class="shared-label">hover shimmer</span>
      <Toggle checked={shimmerEnabled} on:change={handleShimmerChange} />
    </div>
  </FieldsetWrapper>

  <VariantGroup name="primary" title="Primary" states={variantStates.primary} {targetFile} {component} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="size-row">
      <div class="size-section">
        <span class="size-label">size="default"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="primary" disabled={isDisabled} class={forceClass}>Primary</Button>
            <span class="variant-label">primary</span>
          </div>
          <div class="button-showcase-item">
            <Button variant="primary" icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
          </div>
        </div>
      </div>
      <div class="size-divider"></div>
      <div class="size-section">
        <span class="size-label">size="small"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="primary" size="small" disabled={isDisabled} class={forceClass}>Primary</Button>
          </div>
          <div class="button-showcase-item">
            <Button variant="primary" size="small" icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
          </div>
        </div>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="secondary" title="Secondary" states={variantStates.secondary} {targetFile} {component} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="size-row">
      <div class="size-section">
        <span class="size-label">size="default"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="secondary" disabled={isDisabled} class={forceClass}>Secondary</Button>
            <span class="variant-label">secondary</span>
          </div>
          <div class="button-showcase-item">
            <Button variant="secondary" icon="fas fa-check" iconPosition="right" disabled={isDisabled} class={forceClass}>Icon Right</Button>
          </div>
        </div>
      </div>
      <div class="size-divider"></div>
      <div class="size-section">
        <span class="size-label">size="small"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="secondary" size="small" disabled={isDisabled} class={forceClass}>Secondary</Button>
          </div>
          <div class="button-showcase-item">
            <Button variant="secondary" size="small" icon="fas fa-check" iconPosition="right" disabled={isDisabled} class={forceClass}>Icon Right</Button>
          </div>
        </div>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="outline" title="Outline" states={variantStates.outline} {targetFile} {component} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="size-row">
      <div class="size-section">
        <span class="size-label">size="default"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="outline" disabled={isDisabled} class={forceClass}>Outline</Button>
            <span class="variant-label">outline</span>
          </div>
        </div>
      </div>
      <div class="size-divider"></div>
      <div class="size-section">
        <span class="size-label">size="small"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="outline" size="small" disabled={isDisabled} class={forceClass}>Outline</Button>
          </div>
        </div>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="success" title="Success" states={variantStates.success} {targetFile} {component} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="size-row">
      <div class="size-section">
        <span class="size-label">size="default"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="success" disabled={isDisabled} class={forceClass}>Success</Button>
            <span class="variant-label">success</span>
          </div>
          <div class="button-showcase-item">
            <Button variant="success" icon="fas fa-plus" disabled={isDisabled} class={forceClass}>Add Item</Button>
          </div>
        </div>
      </div>
      <div class="size-divider"></div>
      <div class="size-section">
        <span class="size-label">size="small"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="success" size="small" disabled={isDisabled} class={forceClass}>Success</Button>
          </div>
          <div class="button-showcase-item">
            <Button variant="success" size="small" icon="fas fa-plus" disabled={isDisabled} class={forceClass}>Add Item</Button>
          </div>
        </div>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="danger" title="Danger" states={variantStates.danger} {targetFile} {component} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="size-row">
      <div class="size-section">
        <span class="size-label">size="default"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="danger" disabled={isDisabled} class={forceClass}>Danger</Button>
            <span class="variant-label">danger</span>
          </div>
          <div class="button-showcase-item">
            <Button variant="danger" icon="fas fa-trash" disabled={isDisabled} class={forceClass}>Delete</Button>
          </div>
        </div>
      </div>
      <div class="size-divider"></div>
      <div class="size-section">
        <span class="size-label">size="small"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="danger" size="small" disabled={isDisabled} class={forceClass}>Danger</Button>
          </div>
          <div class="button-showcase-item">
            <Button variant="danger" size="small" icon="fas fa-trash" disabled={isDisabled} class={forceClass}>Delete</Button>
          </div>
        </div>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="warning" title="Warning" states={variantStates.warning} {targetFile} {component} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="size-row">
      <div class="size-section">
        <span class="size-label">size="default"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="warning" disabled={isDisabled} class={forceClass}>Warning</Button>
            <span class="variant-label">warning</span>
          </div>
        </div>
      </div>
      <div class="size-divider"></div>
      <div class="size-section">
        <span class="size-label">size="small"</span>
        <div class="button-showcase-grid">
          <div class="button-showcase-item">
            <Button variant="warning" size="small" disabled={isDisabled} class={forceClass}>Warning</Button>
          </div>
        </div>
      </div>
    </div>
  </VariantGroup>
</ComponentEditorBase>

<style>
  .size-row {
    display: flex;
    gap: var(--space-16);
    align-items: flex-start;
  }

  .size-divider {
    width: 1px;
    background: var(--ui-border-faint);
    align-self: stretch;
  }

  .size-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .size-label {
    font-size: var(--font-size-xs);
    font-family: var(--ui-font-mono);
    color: var(--ui-text-tertiary);
  }

  .button-showcase-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-16);
    align-items: start;
  }

  .button-showcase-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    align-items: flex-start;
  }

  .variant-label {
    font-size: var(--font-size-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
  }

  .shared-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
    padding: var(--ui-space-4) var(--ui-space-12);
  }

  .shared-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }
</style>
