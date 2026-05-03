<script lang="ts">
  import Dialog from '../components/Dialog.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentAlias, registerComponentSchema } from '../lib/editorStore';
  import type { Token, TypeGroupConfig } from './scaffolding/types';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import ShadowBackdropControls from './scaffolding/ShadowBackdropControls.svelte';
  const component = 'dialog';

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
      { label: 'corner radius', variable: '--dialog-radius' },
      { label: 'dialog shadow', variable: '--dialog-shadow' },
      { label: 'background blur', variable: '--dialog-blur' },
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

  function variantLabel(v: ButtonVariant): string {
    return v.charAt(0).toUpperCase() + v.slice(1);
  }

  let bgMode: 'image' | 'color' = 'image';
  const bgVar = '--backdrop-dialog-surface';
</script>

<ComponentEditorBase {component} title="Dialog" description="Modal dialog with focus management and slide-in animation. Import from <code>components/Dialog.svelte</code>" tokens={allTokens} tabbable>
  <svelte:fragment slot="config">
    <label>
      <span>Cancel button (left)</span>
      <select class="form-select" value={cancelVariant} on:change={setCancelVariant}>
        {#each BUTTON_VARIANTS as v}
          <option value={v}>{variantLabel(v)}</option>
        {/each}
      </select>
    </label>
    <label>
      <span>Confirm button (right)</span>
      <select class="form-select" value={confirmVariant} on:change={setConfirmVariant}>
        {#each BUTTON_VARIANTS as v}
          <option value={v}>{variantLabel(v)}</option>
        {/each}
      </select>
    </label>
    <ShadowBackdropControls bind:mode={bgMode} colorVariable={bgVar} />
  </svelte:fragment>
  <ShadowBackdrop mode={bgMode} colorVariable={bgVar}>
    <Dialog
      show
      inline
      title="Sample Dialog"
      confirmLabel="Save"
      cancelLabel="Cancel"
      onCancel={() => {}}
    >
      <p style="color: var(--text-secondary); margin: 0;">This is the dialog body content. It supports any slotted content including forms, lists, or other components.</p>
    </Dialog>
  </ShadowBackdrop>
  <VariantGroup name="dialog" title="Dialog" states={frameStates} typeGroups={frameTypeGroups} {component} />
</ComponentEditorBase>

