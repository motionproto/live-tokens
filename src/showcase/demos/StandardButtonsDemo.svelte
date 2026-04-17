<script lang="ts">
  import Button from '../../components/Button.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/Button.svelte';

  let small = false;
  $: size = (small ? 'small' : 'default') as 'small' | 'default';

  type Token = { label: string; variable: string };

  const variantStates: Record<string, Record<string, Token[]>> = {
    primary: {
      default: [
        { label: 'surface color', variable: '--button-primary-surface' },
        { label: 'text color', variable: '--button-primary-text' },
        { label: 'border color', variable: '--button-primary-border' },
        { label: 'radius', variable: '--button-primary-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-primary-hover-surface' },
        { label: 'text color', variable: '--button-primary-hover-text' },
        { label: 'border color', variable: '--button-primary-hover-border' },
        { label: 'radius', variable: '--button-primary-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-primary-disabled-surface' },
        { label: 'text color', variable: '--button-primary-disabled-text' },
        { label: 'border color', variable: '--button-primary-disabled-border' },
        { label: 'radius', variable: '--button-primary-radius' },
      ],
    },
    secondary: {
      default: [
        { label: 'surface color', variable: '--button-secondary-surface' },
        { label: 'text color', variable: '--button-secondary-text' },
        { label: 'border color', variable: '--button-secondary-border' },
        { label: 'radius', variable: '--button-secondary-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-secondary-hover-surface' },
        { label: 'text color', variable: '--button-secondary-hover-text' },
        { label: 'border color', variable: '--button-secondary-hover-border' },
        { label: 'radius', variable: '--button-secondary-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-secondary-disabled-surface' },
        { label: 'text color', variable: '--button-secondary-disabled-text' },
        { label: 'border color', variable: '--button-secondary-disabled-border' },
        { label: 'radius', variable: '--button-secondary-radius' },
      ],
    },
    outline: {
      default: [
        { label: 'text color', variable: '--button-outline-text' },
        { label: 'border color', variable: '--button-outline-border' },
        { label: 'radius', variable: '--button-outline-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-outline-hover-surface' },
        { label: 'text color', variable: '--button-outline-hover-text' },
        { label: 'border color', variable: '--button-outline-hover-border' },
        { label: 'radius', variable: '--button-outline-radius' },
      ],
      disabled: [
        { label: 'text color', variable: '--button-outline-disabled-text' },
        { label: 'border color', variable: '--button-outline-disabled-border' },
        { label: 'radius', variable: '--button-outline-radius' },
      ],
    },
    success: {
      default: [
        { label: 'surface color', variable: '--button-success-surface' },
        { label: 'text color', variable: '--button-success-text' },
        { label: 'border color', variable: '--button-success-border' },
        { label: 'radius', variable: '--button-success-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-success-hover-surface' },
        { label: 'text color', variable: '--button-success-hover-text' },
        { label: 'border color', variable: '--button-success-hover-border' },
        { label: 'radius', variable: '--button-success-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-success-disabled-surface' },
        { label: 'text color', variable: '--button-success-disabled-text' },
        { label: 'border color', variable: '--button-success-disabled-border' },
        { label: 'radius', variable: '--button-success-radius' },
      ],
    },
    danger: {
      default: [
        { label: 'surface color', variable: '--button-danger-surface' },
        { label: 'text color', variable: '--button-danger-text' },
        { label: 'border color', variable: '--button-danger-border' },
        { label: 'radius', variable: '--button-danger-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-danger-hover-surface' },
        { label: 'text color', variable: '--button-danger-hover-text' },
        { label: 'border color', variable: '--button-danger-hover-border' },
        { label: 'radius', variable: '--button-danger-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-danger-disabled-surface' },
        { label: 'text color', variable: '--button-danger-disabled-text' },
        { label: 'border color', variable: '--button-danger-disabled-border' },
        { label: 'radius', variable: '--button-danger-radius' },
      ],
    },
    warning: {
      default: [
        { label: 'surface color', variable: '--button-warning-surface' },
        { label: 'text color', variable: '--button-warning-text' },
        { label: 'border color', variable: '--button-warning-border' },
        { label: 'radius', variable: '--button-warning-radius' },
      ],
      hover: [
        { label: 'surface color', variable: '--button-warning-hover-surface' },
        { label: 'text color', variable: '--button-warning-hover-text' },
        { label: 'border color', variable: '--button-warning-hover-border' },
        { label: 'radius', variable: '--button-warning-radius' },
      ],
      disabled: [
        { label: 'surface color', variable: '--button-warning-disabled-surface' },
        { label: 'text color', variable: '--button-warning-disabled-text' },
        { label: 'border color', variable: '--button-warning-disabled-border' },
        { label: 'radius', variable: '--button-warning-radius' },
      ],
    },
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Standard Button Component</h2>
  <p class="demo-description">
    Reusable button component with multiple variants and sizes. Import from <code>components/Button.svelte</code>
  </p>

  <label class="size-toggle">
    <input type="checkbox" bind:checked={small} />
    size="small"
  </label>

  <VariantGroup name="primary" title="Primary" states={variantStates.primary} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="primary" {size} disabled={isDisabled} class={forceClass}>Primary</Button>
        <span class="variant-label">primary</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="primary" {size} icon="fas fa-star" iconPosition="left" disabled={isDisabled} class={forceClass}>With Icon</Button>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="secondary" title="Secondary" states={variantStates.secondary} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="secondary" {size} disabled={isDisabled} class={forceClass}>Secondary</Button>
        <span class="variant-label">secondary</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="secondary" {size} icon="fas fa-check" iconPosition="right" disabled={isDisabled} class={forceClass}>Icon Right</Button>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="outline" title="Outline" states={variantStates.outline} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="outline" {size} disabled={isDisabled} class={forceClass}>Outline</Button>
        <span class="variant-label">outline</span>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="success" title="Success" states={variantStates.success} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="success" {size} disabled={isDisabled} class={forceClass}>Success</Button>
        <span class="variant-label">success</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="success" {size} icon="fas fa-plus" disabled={isDisabled} class={forceClass}>Add Item</Button>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="danger" title="Danger" states={variantStates.danger} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="danger" {size} disabled={isDisabled} class={forceClass}>Danger</Button>
        <span class="variant-label">danger</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="danger" {size} icon="fas fa-trash" disabled={isDisabled} class={forceClass}>Delete</Button>
      </div>
    </div>
  </VariantGroup>

  <VariantGroup name="warning" title="Warning" states={variantStates.warning} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="warning" {size} disabled={isDisabled} class={forceClass}>Warning</Button>
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

  .size-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--space-8);
    margin-bottom: var(--space-16);
    font-family: var(--ui-font-mono);
    font-size: var(--font-xs);
    color: var(--ui-text-secondary);
    cursor: pointer;
  }
</style>
