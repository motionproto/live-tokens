<script lang="ts">
  import InlineEditActions from '../components/InlineEditActions.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';

  const component = 'inlineeditactions';

  type Token = { label: string; variable: string };

  const saveStates: Record<string, Token[]> = {
    default: [
      { label: 'save surface color', variable: '--inlineeditactions-save-surface' },
      { label: 'save text color', variable: '--inlineeditactions-save-text' },
      { label: 'cancel surface color', variable: '--inlineeditactions-cancel-surface' },
      { label: 'cancel text color', variable: '--inlineeditactions-cancel-text' },
      { label: 'radius', variable: '--inlineeditactions-radius' },
    ],
    hover: [
      { label: 'save surface color', variable: '--inlineeditactions-save-hover-surface' },
      { label: 'save text color', variable: '--inlineeditactions-save-text' },
      { label: 'cancel surface color', variable: '--inlineeditactions-cancel-hover-surface' },
      { label: 'cancel text color', variable: '--inlineeditactions-cancel-text' },
      { label: 'radius', variable: '--inlineeditactions-radius' },
    ],
    disabled: [
      { label: 'save surface color', variable: '--inlineeditactions-save-surface' },
      { label: 'save text color', variable: '--inlineeditactions-save-text' },
      { label: 'cancel surface color', variable: '--inlineeditactions-cancel-surface' },
      { label: 'cancel text color', variable: '--inlineeditactions-cancel-text' },
      { label: 'radius', variable: '--inlineeditactions-radius' },
    ],
  };
</script>

<ComponentEditorBase {component} title="Inline Edit Actions" description="Confirm/cancel button pair for inline editing. Import from <code>components/InlineEditActions.svelte</code>" let:targetFile>
  <VariantGroup name="inline-edit" title="Inline Edit Actions" states={saveStates} {targetFile} {component} let:activeState>
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
</ComponentEditorBase>

<style>
  .inline-edit-demo-row {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
</style>
