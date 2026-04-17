<script lang="ts">
  import Button from '../../components/Button.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/Button.svelte';

  type Token = { label: string; variable: string };

  const variantStates: Record<string, Record<string, Token[]>> = {
    primary: {
      default: [
        { label: 'BG', variable: '--button-primary-surface' },
        { label: 'Text', variable: '--button-primary-text' },
        { label: 'Border', variable: '--button-primary-border' },
        { label: 'Radius', variable: '--button-primary-radius' },
      ],
      hover: [
        { label: 'BG', variable: '--button-primary-hover-surface' },
        { label: 'Text', variable: '--button-primary-hover-text' },
        { label: 'Border', variable: '--button-primary-hover-border' },
        { label: 'Radius', variable: '--button-primary-radius' },
      ],
      disabled: [
        { label: 'BG', variable: '--button-primary-disabled-surface' },
        { label: 'Text', variable: '--button-primary-disabled-text' },
        { label: 'Border', variable: '--button-primary-disabled-border' },
        { label: 'Radius', variable: '--button-primary-radius' },
      ],
    },
    secondary: {
      default: [
        { label: 'BG', variable: '--button-secondary-surface' },
        { label: 'Text', variable: '--button-secondary-text' },
        { label: 'Border', variable: '--button-secondary-border' },
        { label: 'Radius', variable: '--button-secondary-radius' },
      ],
      hover: [
        { label: 'BG', variable: '--button-secondary-hover-surface' },
        { label: 'Text', variable: '--button-secondary-hover-text' },
        { label: 'Border', variable: '--button-secondary-hover-border' },
        { label: 'Radius', variable: '--button-secondary-radius' },
      ],
      disabled: [
        { label: 'BG', variable: '--button-secondary-disabled-surface' },
        { label: 'Text', variable: '--button-secondary-disabled-text' },
        { label: 'Border', variable: '--button-secondary-disabled-border' },
        { label: 'Radius', variable: '--button-secondary-radius' },
      ],
    },
    outline: {
      default: [
        { label: 'Text', variable: '--button-outline-text' },
        { label: 'Border', variable: '--button-outline-border' },
        { label: 'Radius', variable: '--button-outline-radius' },
      ],
      hover: [
        { label: 'BG', variable: '--button-outline-hover-surface' },
        { label: 'Text', variable: '--button-outline-hover-text' },
        { label: 'Border', variable: '--button-outline-hover-border' },
        { label: 'Radius', variable: '--button-outline-radius' },
      ],
      disabled: [
        { label: 'Text', variable: '--button-outline-disabled-text' },
        { label: 'Border', variable: '--button-outline-disabled-border' },
        { label: 'Radius', variable: '--button-outline-radius' },
      ],
    },
    small_secondary: {
      default: [
        { label: 'BG', variable: '--button-small_secondary-surface' },
        { label: 'Text', variable: '--button-small_secondary-text' },
        { label: 'Border', variable: '--button-small_secondary-border' },
        { label: 'Radius', variable: '--button-small_secondary-radius' },
      ],
      hover: [
        { label: 'BG', variable: '--button-small_secondary-hover-surface' },
        { label: 'Text', variable: '--button-small_secondary-hover-text' },
        { label: 'Border', variable: '--button-small_secondary-hover-border' },
        { label: 'Radius', variable: '--button-small_secondary-radius' },
      ],
      disabled: [
        { label: 'Text', variable: '--button-small_secondary-disabled-text' },
        { label: 'Border', variable: '--button-small_secondary-disabled-border' },
        { label: 'Radius', variable: '--button-small_secondary-radius' },
      ],
    },
    success: {
      default: [
        { label: 'BG', variable: '--button-success-surface' },
        { label: 'Text', variable: '--button-success-text' },
        { label: 'Border', variable: '--button-success-border' },
        { label: 'Radius', variable: '--button-success-radius' },
      ],
      hover: [
        { label: 'BG', variable: '--button-success-hover-surface' },
        { label: 'Text', variable: '--button-success-hover-text' },
        { label: 'Border', variable: '--button-success-hover-border' },
        { label: 'Radius', variable: '--button-success-radius' },
      ],
      disabled: [
        { label: 'BG', variable: '--button-success-disabled-surface' },
        { label: 'Text', variable: '--button-success-disabled-text' },
        { label: 'Border', variable: '--button-success-disabled-border' },
        { label: 'Radius', variable: '--button-success-radius' },
      ],
    },
    danger: {
      default: [
        { label: 'BG', variable: '--button-danger-surface' },
        { label: 'Text', variable: '--button-danger-text' },
        { label: 'Border', variable: '--button-danger-border' },
        { label: 'Radius', variable: '--button-danger-radius' },
      ],
      hover: [
        { label: 'BG', variable: '--button-danger-hover-surface' },
        { label: 'Text', variable: '--button-danger-hover-text' },
        { label: 'Border', variable: '--button-danger-hover-border' },
        { label: 'Radius', variable: '--button-danger-radius' },
      ],
      disabled: [
        { label: 'BG', variable: '--button-danger-disabled-surface' },
        { label: 'Text', variable: '--button-danger-disabled-text' },
        { label: 'Border', variable: '--button-danger-disabled-border' },
        { label: 'Radius', variable: '--button-danger-radius' },
      ],
    },
    warning: {
      default: [
        { label: 'BG', variable: '--button-warning-surface' },
        { label: 'Text', variable: '--button-warning-text' },
        { label: 'Border', variable: '--button-warning-border' },
        { label: 'Radius', variable: '--button-warning-radius' },
      ],
      hover: [
        { label: 'BG', variable: '--button-warning-hover-surface' },
        { label: 'Text', variable: '--button-warning-hover-text' },
        { label: 'Border', variable: '--button-warning-hover-border' },
        { label: 'Radius', variable: '--button-warning-radius' },
      ],
      disabled: [
        { label: 'BG', variable: '--button-warning-disabled-surface' },
        { label: 'Text', variable: '--button-warning-disabled-text' },
        { label: 'Border', variable: '--button-warning-disabled-border' },
        { label: 'Radius', variable: '--button-warning-radius' },
      ],
    },
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Standard Button Component</h2>
  <p class="demo-description">
    Reusable button component with multiple variants and sizes. Import from <code>components/Button.svelte</code>
  </p>

  <VariantGroup name="primary" title="Primary" states={variantStates.primary} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="primary" disabled={isDisabled} class={forceClass}>Primary</Button>
        <span class="variant-label">primary</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="primary" icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
      </div>
      <div class="button-showcase-item">
        <Button variant="primary" size="small" disabled={isDisabled} class={forceClass}>Small Size</Button>
        <span class="variant-label">size="small"</span>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="secondary" title="Secondary" states={variantStates.secondary} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="secondary" disabled={isDisabled} class={forceClass}>Secondary</Button>
        <span class="variant-label">secondary</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="secondary" icon="fas fa-check" iconPosition="right" disabled={isDisabled} class={forceClass}>Icon Right</Button>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="outline" title="Outline" states={variantStates.outline} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="outline" disabled={isDisabled} class={forceClass}>Outline</Button>
        <span class="variant-label">outline</span>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="small_secondary" title="Small Secondary" states={variantStates.small_secondary} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="small_secondary" disabled={isDisabled} class={forceClass}>Small Secondary</Button>
        <span class="variant-label">small_secondary</span>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="success" title="Success" states={variantStates.success} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="success" disabled={isDisabled} class={forceClass}>Success</Button>
        <span class="variant-label">success</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="success" icon="fas fa-plus" disabled={isDisabled} class={forceClass}>Add Item</Button>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="danger" title="Danger" states={variantStates.danger} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="danger" disabled={isDisabled} class={forceClass}>Danger</Button>
        <span class="variant-label">danger</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="danger" icon="fas fa-trash" disabled={isDisabled} class={forceClass}>Delete</Button>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="warning" title="Warning" states={variantStates.warning} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="warning" disabled={isDisabled} class={forceClass}>Warning</Button>
        <span class="variant-label">warning</span>
      </div>
    </div>
  </VariantGroup>
</div>

<style>
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
    font-size: var(--font-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
  }
</style>
