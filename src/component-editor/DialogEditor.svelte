<script context="module" lang="ts">
  import { buildTypeGroupColorTokens } from './scaffolding/buildTypeGroupTokens';
  import type { Token, TypeGroupConfig } from './scaffolding/types';

  export const component = 'dialog';

  const BUTTON_VARIANTS = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
  type ButtonVariant = typeof BUTTON_VARIANTS[number];

  const CONFIRM_VAR = '--dialog-confirm-variant';
  const CANCEL_VAR = '--dialog-cancel-variant';
  const DEFAULT_CONFIRM: ButtonVariant = 'primary';
  const DEFAULT_CANCEL: ButtonVariant = 'outline';

  // Frame-level tokens (the dialog box itself + overlay + header + body + footer + close icon).
  // Button styling lives in Button.svelte — the dialog only owns its own chrome.
  const frameStates: Record<string, Token[]> = {
    overlay: [
      { label: 'backdrop color', groupKey: 'surface', variable: '--dialog-overlay-surface' },
    ],
    dialog: [
      { label: 'surface color', variable: '--dialog-surface' },
      { label: 'border color', variable: '--dialog-border' },
      { label: 'border width', groupKey: 'width', variable: '--dialog-border-width' },
      { label: 'corner radius', variable: '--dialog-radius' },
      { label: 'dialog shadow', variable: '--dialog-shadow' },
      { label: 'background blur', variable: '--dialog-blur' },
    ],
    header: [
      { label: 'surface color', groupKey: 'surface', variable: '--dialog-header-surface' },
      { label: 'border color', groupKey: 'border', variable: '--dialog-header-border' },
      { label: 'border width', groupKey: 'width', variable: '--dialog-header-border-width' },
      { label: 'padding', groupKey: 'padding', variable: '--dialog-header-padding' },
      { label: 'close icon color', groupKey: 'icon', variable: '--dialog-close-icon' },
      { label: 'close icon size', groupKey: 'size', variable: '--dialog-close-icon-size' },
    ],
    body: [
      { label: 'padding', groupKey: 'padding', variable: '--dialog-body-padding' },
    ],
    footer: [
      { label: 'border color', groupKey: 'border', variable: '--dialog-footer-border' },
      { label: 'border width', groupKey: 'width', variable: '--dialog-footer-border-width' },
      { label: 'padding', groupKey: 'padding', variable: '--dialog-footer-padding' },
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
    body: [{
      legend: 'body text',
      colorVariable: '--dialog-body',
      familyVariable: '--dialog-body-font-family',
      sizeVariable: '--dialog-body-font-size',
      weightVariable: '--dialog-body-font-weight',
      lineHeightVariable: '--dialog-body-line-height',
    }],
  };
  // Slot-prefixed groupKeys keep title and body typography independent.
  // Sharing a groupKey would phantom-link the two slots in the schema without
  // surfacing the link in the LinkedBlock.
  const frameTypeGroupTokens: Token[] = [
    { label: 'font family', groupKey: 'title-font-family', variable: '--dialog-title-font-family' },
    { label: 'font size', groupKey: 'title-font-size', variable: '--dialog-title-font-size' },
    { label: 'font weight', groupKey: 'title-font-weight', variable: '--dialog-title-font-weight' },
    { label: 'line height', groupKey: 'title-line-height', variable: '--dialog-title-line-height' },
    { label: 'font family', groupKey: 'body-font-family', variable: '--dialog-body-font-family' },
    { label: 'font size', groupKey: 'body-font-size', variable: '--dialog-body-font-size' },
    { label: 'font weight', groupKey: 'body-font-weight', variable: '--dialog-body-font-weight' },
    { label: 'line height', groupKey: 'body-line-height', variable: '--dialog-body-line-height' },
  ];

  export const allTokens: Token[] = [
    ...Object.values(frameStates).flat(),
    ...buildTypeGroupColorTokens(frameTypeGroups),
    ...frameTypeGroupTokens,
  ];

  function variantLabel(v: ButtonVariant): string {
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
</script>

<script lang="ts">
  import Dialog from '../components/Dialog.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState, setComponentConfig } from '../lib/editorStore';
  import ShadowBackdrop from './scaffolding/ShadowBackdrop.svelte';
  import ShadowBackdropControls from './scaffolding/ShadowBackdropControls.svelte';

  $: config = $editorState.components.dialog?.config ?? {};
  $: confirmVariant = (BUTTON_VARIANTS.includes(config[CONFIRM_VAR] as ButtonVariant) ? config[CONFIRM_VAR] : DEFAULT_CONFIRM) as ButtonVariant;
  $: cancelVariant = (BUTTON_VARIANTS.includes(config[CANCEL_VAR] as ButtonVariant) ? config[CANCEL_VAR] : DEFAULT_CANCEL) as ButtonVariant;

  function setConfirmVariant(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    setComponentConfig(component, CONFIRM_VAR, v);
  }
  function setCancelVariant(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    setComponentConfig(component, CANCEL_VAR, v);
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
  <div class="dialog-preview">
    <ShadowBackdrop mode={bgMode} colorVariable={bgVar} padding="0">
      <Dialog
        show
        inline
        title="Sample Dialog"
        confirm={{ label: 'Save', onClick: () => {} }}
        cancel={{ label: 'Cancel', onClick: () => {} }}
      >
        <p style="margin: 0;">This is the dialog body content. It supports any slotted content including forms, lists, or other components.</p>
      </Dialog>
    </ShadowBackdrop>
  </div>
  <VariantGroup name="dialog" title="Dialog" states={frameStates} typeGroups={frameTypeGroups} {component} />
</ComponentEditorBase>

<style>
  .dialog-preview :global(.dialog-backdrop.inline) {
    padding: 128px;
  }
</style>

