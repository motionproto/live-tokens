<script lang="ts">
  import InlineEditActions from '../../components/InlineEditActions.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/InlineEditActions.svelte';

  type Token = { label: string; variable: string };

  const saveStates: Record<string, Token[]> = {
    default: [
      { label: 'save surface color', variable: '--inline-edit-save-bg' },
      { label: 'save text color', variable: '--inline-edit-save-text' },
      { label: 'cancel surface color', variable: '--inline-edit-cancel-bg' },
      { label: 'cancel text color', variable: '--inline-edit-cancel-text' },
      { label: 'radius', variable: '--inline-edit-radius' },
    ],
    hover: [
      { label: 'save surface color', variable: '--inline-edit-save-bg-hover' },
      { label: 'save text color', variable: '--inline-edit-save-text' },
      { label: 'cancel surface color', variable: '--inline-edit-cancel-bg-hover' },
      { label: 'cancel text color', variable: '--inline-edit-cancel-text' },
      { label: 'radius', variable: '--inline-edit-radius' },
    ],
    disabled: [
      { label: 'save surface color', variable: '--inline-edit-save-bg' },
      { label: 'save text color', variable: '--inline-edit-save-text' },
      { label: 'cancel surface color', variable: '--inline-edit-cancel-bg' },
      { label: 'cancel text color', variable: '--inline-edit-cancel-text' },
      { label: 'radius', variable: '--inline-edit-radius' },
    ],
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Inline Edit Actions</h2>
  <p class="demo-description">
    Confirm/cancel button pair for inline editing. Import from <code>components/InlineEditActions.svelte</code>
  </p>

  <VariantGroup name="inline-edit" title="Inline Edit Actions" states={saveStates} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const isDisabled = activeState === 'disabled'}
    <div class="inline-edit-demo-row">
      <span style="color: var(--text-secondary);">Editing value...</span>
      <InlineEditActions
        onSave={() => {}}
        onCancel={() => {}}
        disabled={isDisabled}
        class={forceClass}
      />
    </div>
  </VariantGroup>
</div>

<style>
  .inline-edit-demo-row {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
</style>
