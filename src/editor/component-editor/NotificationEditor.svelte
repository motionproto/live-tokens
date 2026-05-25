<script module lang="ts">
  import type { Token } from './scaffolding/types';

  export const component = 'notification';
  const variants = ['info', 'success', 'warning', 'danger'] as const;
  type Variant = typeof variants[number];

  // Base part: notification chrome, icon sizing, and both typography stacks.
  // Tagged with `element` so StateBlock partitions the panel into labeled
  // `frame`, `title`, and `body` subsections — the title/body split mirrors the
  // runtime's two type stacks. Section labels mean per-row labels can stay short
  // ('font family', not 'title font family').
  function variantBaseTokens(v: Variant): Token[] {
    return [
      { label: 'padding', canBeLinked: true, groupKey: 'padding', variable: `--notification-${v}-padding`, element: 'frame' },
      { label: 'corner radius', canBeLinked: true, groupKey: 'radius', variable: `--notification-${v}-radius`, element: 'frame' },
      { label: 'border width', canBeLinked: true, groupKey: 'border-width', variable: `--notification-${v}-border-width`, element: 'frame' },
      { label: 'icon size', canBeLinked: true, groupKey: 'icon-size', variable: `--notification-${v}-icon-size`, element: 'frame' },
      { label: 'font family', canBeLinked: true, groupKey: 'title-font-family', variable: `--notification-${v}-title-font-family`, element: 'title' },
      { label: 'font size', canBeLinked: true, groupKey: 'title-font-size', variable: `--notification-${v}-title-font-size`, element: 'title' },
      { label: 'font weight', canBeLinked: true, groupKey: 'title-font-weight', variable: `--notification-${v}-title-font-weight`, element: 'title' },
      { label: 'line height', canBeLinked: true, groupKey: 'title-line-height', variable: `--notification-${v}-title-line-height`, element: 'title' },
      { label: 'font family', canBeLinked: true, groupKey: 'text-font-family', variable: `--notification-${v}-text-font-family`, element: 'body' },
      { label: 'font size', canBeLinked: true, groupKey: 'text-font-size', variable: `--notification-${v}-text-font-size`, element: 'body' },
      { label: 'font weight', canBeLinked: true, groupKey: 'text-font-weight', variable: `--notification-${v}-text-font-weight`, element: 'body' },
      { label: 'line height', canBeLinked: true, groupKey: 'text-line-height', variable: `--notification-${v}-text-line-height`, element: 'body' },
    ];
  }

  // Colors part: the six shades that distinguish info/success/warning/danger.
  function variantColorTokens(v: Variant): Token[] {
    return [
      { label: 'surface color', groupKey: 'surface', variable: `--notification-${v}-surface` },
      { label: 'action surface', groupKey: 'action-surface', variable: `--notification-${v}-action-surface` },
      { label: 'border color', groupKey: 'border', variable: `--notification-${v}-border` },
      { label: 'icon color', groupKey: 'icon', variable: `--notification-${v}-icon` },
      { label: 'title color', groupKey: 'title', variable: `--notification-${v}-title` },
      { label: 'body color', groupKey: 'text', variable: `--notification-${v}-text` },
    ];
  }

  function variantStates(v: Variant): Record<string, Token[]> {
    return { base: variantBaseTokens(v), colors: variantColorTokens(v) };
  }

  export const allTokens: Token[] = variants.flatMap((v) => [
    ...variantBaseTokens(v),
    ...variantColorTokens(v),
  ]);

  const linkableContexts = new Map<string, string>(
    variants.flatMap((v) =>
      variantBaseTokens(v)
        .filter((t) => t.canBeLinked)
        .map((t) => [t.variable, `${v} base`] as [string, string]),
    ),
  );

  const BUTTON_VARIANT_OPTIONS = ['none', 'primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
  type ButtonVariantOption = typeof BUTTON_VARIANT_OPTIONS[number];
  type ButtonVariant = Exclude<ButtonVariantOption, 'none'>;
  function variantLabel(v: ButtonVariantOption): string {
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
  function toVariant(v: ButtonVariantOption): ButtonVariant | null {
    return v === 'none' ? null : v;
  }

  const variantOptions = variants.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
</script>

<script lang="ts">
  import Notification from '../../system/components/Notification.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import ComponentEditorBase from './scaffolding/ComponentEditorBase.svelte';
  import { editorState } from '../core/store/editorStore';
  import { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
  import { buildSiblings } from './scaffolding/siblings';

  let linked = $derived(computeLinkedBlock(component, linkableContexts, allTokens, $editorState));
  let visibleVariantStates = $derived((v: Variant) => Object.fromEntries(
    Object.entries(variantStates(v)).map(([name, list]) => [name, withLinkedDisabled(list, linked.varSet)]),
  ) as Record<string, Token[]>);

  import type { NotificationActions } from '../../system/components/types';

  let dismissible = $state(false);
  let rightOption: ButtonVariantOption = $state('none');
  let leftOption: ButtonVariantOption = $state('none');
  let actions = $derived(((): NotificationActions => {
    const a: NotificationActions = {};
    const right = toVariant(rightOption);
    const left = toVariant(leftOption);
    if (right) a.right = { label: 'Confirm', variant: right, onClick: () => {} };
    if (left) a.left = { label: 'Cancel', variant: left, onClick: () => {} };
    return a;
  })());
</script>

<ComponentEditorBase {component} title="Notification" description="Contextual feedback notifications with multiple variants." tokens={allTokens} {linked} variants={variantOptions}>
  {#each variants as v}
    <VariantGroup
      name={v}
      title={v.charAt(0).toUpperCase() + v.slice(1)}
      states={visibleVariantStates(v)}
      {component}
      siblings={buildSiblings(variants, v, variantStates)}
    >
      {#snippet canvasToolbarExtras()}
        <hr class="canvas-toolbar-divider" />
        <label class="toolbar-check">
          <input type="checkbox" bind:checked={dismissible} />
          <span>Dismissible</span>
        </label>
        <label class="toolbar-field">
          <span>Right button</span>
          <select class="canvas-toolbar-select" bind:value={rightOption}>
            {#each BUTTON_VARIANT_OPTIONS as opt}
              <option value={opt}>{variantLabel(opt)}</option>
            {/each}
          </select>
        </label>
        <label class="toolbar-field">
          <span>Left button</span>
          <select class="canvas-toolbar-select" bind:value={leftOption}>
            {#each BUTTON_VARIANT_OPTIONS as opt}
              <option value={opt}>{variantLabel(opt)}</option>
            {/each}
          </select>
        </label>
      {/snippet}
      <div class="notification-demo">
        {#if v === 'info'}
          <Notification variant="info" title="Information" description="This is an informational message to keep you updated." {dismissible} {actions} />
        {:else if v === 'success'}
          <Notification variant="success" title="Success" description="Your action was completed successfully." {dismissible} {actions} />
        {:else if v === 'warning'}
          <Notification variant="warning" title="Warning" description="Caution: This action may have unintended consequences." {dismissible} {actions} />
        {:else if v === 'danger'}
          <Notification variant="danger" title="Danger" description="Critical error: Please address this issue immediately." {dismissible} {actions} />
        {/if}
      </div>
    </VariantGroup>
  {/each}
</ComponentEditorBase>

<style>
  .notification-demo {
    width: 100%;
    max-width: 46rem;
  }

  .toolbar-check {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: rgba(255, 255, 255, 0.78);
    cursor: pointer;
  }

  /* Stack label above control so a 11rem-wide toolbar isn't crowded. */
  .toolbar-field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: rgba(255, 255, 255, 0.6);
  }
</style>
