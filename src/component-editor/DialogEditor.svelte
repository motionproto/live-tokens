<script lang="ts">
  import Dialog from '../components/Dialog.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, registerComponentSchema, setComponentAlias } from '../lib/editorStore';
  const component = 'dialog';
  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; hidden?: boolean };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    sizeVariable?: string;
    weightVariable?: string;
    lineHeightVariable?: string;
  };

  const BUTTON_VARIANTS = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
  type ButtonVariant = typeof BUTTON_VARIANTS[number];

  const CONFIRM_VAR = '--dialog-confirm-variant';
  const CANCEL_VAR = '--dialog-cancel-variant';
  const DEFAULT_CONFIRM: ButtonVariant = 'primary';
  const DEFAULT_CANCEL: ButtonVariant = 'outline';

  $: aliases = $editorState.components.dialog?.aliases ?? {};
  $: confirmVariant = (BUTTON_VARIANTS.includes(aliases[CONFIRM_VAR] as ButtonVariant) ? aliases[CONFIRM_VAR] : DEFAULT_CONFIRM) as ButtonVariant;
  $: cancelVariant = (BUTTON_VARIANTS.includes(aliases[CANCEL_VAR] as ButtonVariant) ? aliases[CANCEL_VAR] : DEFAULT_CANCEL) as ButtonVariant;

  function setConfirmVariant(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    setComponentAlias(component, CONFIRM_VAR, v);
  }
  function setCancelVariant(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    setComponentAlias(component, CANCEL_VAR, v);
  }

  // Frame-level tokens (the dialog box itself + overlay + header + body + footer + close icon).
  // Button styling lives in Button.svelte — the dialog only owns its own chrome.
  const frameStates: Record<string, Token[]> = {
    overlay: [
      { label: 'backdrop color', variable: '--dialog-overlay-surface' },
    ],
    dialog: [
      { label: 'surface color', variable: '--dialog-surface' },
      { label: 'border color', variable: '--dialog-border' },
      { label: 'border width', variable: '--dialog-border-width' },
      { label: 'radius', variable: '--dialog-radius' },
      { label: 'shadow', variable: '--dialog-shadow' },
    ],
    header: [
      { label: 'surface color', variable: '--dialog-header-surface' },
      { label: 'border color', variable: '--dialog-header-border' },
      { label: 'border width', variable: '--dialog-header-border-width' },
      { label: 'padding', variable: '--dialog-header-padding' },
      { label: 'close icon color', variable: '--dialog-close-icon' },
      { label: 'close icon size', variable: '--dialog-close-icon-size' },
    ],
    body: [
      { label: 'padding', variable: '--dialog-body-padding' },
    ],
    footer: [
      { label: 'border color', variable: '--dialog-footer-border' },
      { label: 'border width', variable: '--dialog-footer-border-width' },
      { label: 'padding', variable: '--dialog-footer-padding' },
    ],
  };

  const frameTypeGroups: Record<string, TypeGroupConfig[]> = {
    header: [{
      legend: 'title',
      colorVariable: '--dialog-title',
      familyVariable: '--dialog-title-font-family',
      sizeVariable: '--dialog-title-font-size',
      weightVariable: '--dialog-title-font-weight',
      lineHeightVariable: '--dialog-title-line-height',
    }],
  };
  const frameTypeGroupTokens: Token[] = [
    { label: 'font family', variable: '--dialog-title-font-family' },
    { label: 'font size', variable: '--dialog-title-font-size' },
    { label: 'font weight', variable: '--dialog-title-font-weight' },
    { label: 'line height', variable: '--dialog-title-line-height' },
  ];

  const allTokens: Token[] = [
    ...Object.values(frameStates).flat(),
    ...frameTypeGroupTokens,
  ];
  registerComponentSchema(component, allTokens);

  const allVariables = allTokens.map((t) => t.variable);

  function variantLabel(v: ButtonVariant): string {
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
</script>

<ComponentEditorBase {component} title="Dialog" description="Modal dialog with focus management and slide-in animation. Import from <code>components/Dialog.svelte</code>" resetVariables={allVariables}>
  <div class="dialog-preview">
    <Dialog
      show
      inline
      title="Sample Dialog"
      confirmLabel="Save"
      cancelLabel="Cancel"
    >
      <p style="color: var(--text-secondary); margin: 0;">This is the dialog body content. It supports any slotted content including forms, lists, or other components.</p>
    </Dialog>
  </div>
  <div class="preview-options">
    <label class="preview-select">
      <span>Cancel button (left)</span>
      <select class="form-select" value={cancelVariant} on:change={setCancelVariant}>
        {#each BUTTON_VARIANTS as v}
          <option value={v}>{variantLabel(v)}</option>
        {/each}
      </select>
    </label>
    <label class="preview-select">
      <span>Confirm button (right)</span>
      <select class="form-select" value={confirmVariant} on:change={setConfirmVariant}>
        {#each BUTTON_VARIANTS as v}
          <option value={v}>{variantLabel(v)}</option>
        {/each}
      </select>
    </label>
  </div>
  <VariantGroup name="dialog" title="Dialog" states={frameStates} typeGroups={frameTypeGroups} {component} />
</ComponentEditorBase>

<style>
  .dialog-preview {
    margin-bottom: var(--ui-space-12);
  }

  .preview-options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    padding: 0 var(--ui-space-4) var(--ui-space-12);
  }

  .preview-select {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  .preview-select select {
    font-size: var(--ui-font-size-sm);
  }
</style>
