<script lang="ts">
  import InlineEditActions from '../../components/InlineEditActions.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/InlineEditActions.svelte';

  type Token = { label: string; variable: string };

  const saveStates: Record<string, Token[]> = {
    default: [
      { label: 'Save BG', variable: '--inline-edit-save-bg' },
      { label: 'Save Text', variable: '--inline-edit-save-text' },
      { label: 'Cancel BG', variable: '--inline-edit-cancel-bg' },
      { label: 'Cancel Text', variable: '--inline-edit-cancel-text' },
      { label: 'Radius', variable: '--inline-edit-radius' },
    ],
    hover: [
      { label: 'Save BG', variable: '--inline-edit-save-bg-hover' },
      { label: 'Save Text', variable: '--inline-edit-save-text' },
      { label: 'Cancel BG', variable: '--inline-edit-cancel-bg-hover' },
      { label: 'Cancel Text', variable: '--inline-edit-cancel-text' },
      { label: 'Radius', variable: '--inline-edit-radius' },
    ],
    disabled: [
      { label: 'Save BG', variable: '--inline-edit-save-bg' },
      { label: 'Save Text', variable: '--inline-edit-save-text' },
      { label: 'Cancel BG', variable: '--inline-edit-cancel-bg' },
      { label: 'Cancel Text', variable: '--inline-edit-cancel-text' },
      { label: 'Radius', variable: '--inline-edit-radius' },
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
