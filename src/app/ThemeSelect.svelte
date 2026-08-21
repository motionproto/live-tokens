<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../system/components/Button.svelte';
  import MenuSelect from '../system/components/MenuSelect.svelte';
  import { portal } from '../system/internal/portal';
  import { listThemes, applyTheme } from '../editor/core/themes/themeService';
  import { openThemeSlug } from '../editor/core/store/editorConfigStore';

  let themes = $state<{ value: string; label: string }[]>([]);
  let busy = $state(false);
  let error = $state('');
  let open = $state(false);
  let wrapperEl: HTMLDivElement | undefined = $state();
  let panelEl: HTMLDivElement | undefined = $state();
  let buttonRef: HTMLButtonElement | undefined = $state();

  const uid = $props.id();
  const labelId = `${uid}-label`;
  const buttonId = `${uid}-button`;

  const placeholder = 'Theme';
  const selectedLabel = $derived(
    themes.find((theme) => theme.value === $openThemeSlug)?.label ?? placeholder,
  );

  onMount(async () => {
    const files = await listThemes();
    themes = files
      .map(({ fileName, name }) => ({ value: fileName, label: name || fileName }))
      .sort((a, b) =>
        a.value === 'default' ? -1
          : b.value === 'default' ? 1
          : a.label.localeCompare(b.label),
      );
  });

  // Button.svelte has no aria-* passthrough, so the popover semantics are
  // set imperatively on its underlying <button> via the bindable ref.
  $effect(() => {
    buttonRef?.setAttribute('aria-haspopup', 'listbox');
    buttonRef?.setAttribute('aria-expanded', String(open));
    buttonRef?.setAttribute('id', buttonId);
    buttonRef?.setAttribute('aria-labelledby', `${labelId} ${buttonId}`);
  });

  /* Anchored below the trigger, left edges aligned; flips above when the space
     below runs out, and clamps to the viewport on both axes. Placed rather than
     laid out because the panel is portaled: it has no ancestor left to position
     against. Visibility is inline rather than a state flag so the focus below
     lands on an already-visible item (hidden elements refuse focus). */
  function position(): void {
    const btn = buttonRef;
    const panel = panelEl;
    if (!btn || !panel) return;
    const margin = 8;
    const br = btn.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = br.left;
    if (left + pr.width > vw - margin) left = vw - margin - pr.width;
    if (left < margin) left = margin;

    let top = br.bottom + margin;
    if (top + pr.height > vh - margin) {
      top = br.top - margin - pr.height;
      if (top < margin) top = margin;
    }

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.visibility = 'visible';
  }

  $effect(() => {
    if (!open || !panelEl) return;
    position();
    const target =
      panelEl.querySelector<HTMLButtonElement>('.menuselect-item.selected') ??
      panelEl.querySelector<HTMLButtonElement>('.menuselect-item');
    target?.focus();
    // Fixed to the viewport, so the panel has to be re-placed against a trigger
    // that scrolls. Capture, to catch scrolls in any pane between here and the
    // window.
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    return () => {
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
    };
  });

  $effect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      // The panel is portaled out, so it is no longer inside the wrapper and
      // has to be tested on its own — otherwise picking a theme dismisses the
      // list before the click reaches it.
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (wrapperEl?.contains(target) || panelEl?.contains(target)) return;
      open = false;
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        open = false;
        buttonRef?.focus();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  async function changeTheme(fileName: string) {
    open = false;
    if (!fileName || fileName === $openThemeSlug || busy) return;
    busy = true;
    error = '';
    try {
      await applyTheme(fileName);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Could not change theme';
    } finally {
      busy = false;
    }
  }
</script>

<!-- The open theme drives the selection, so applies from the Themes panel or
     another tab show up here too. -->
<div class="theme-select" bind:this={wrapperEl}>
  <span class="theme-select-label" id={labelId}>Theme</span>

  <div class="theme-select-trigger">
    <Button
      bind:buttonRef
      class="theme-select-button"
      fullWidth
      variant="secondary"
      disabled={busy || themes.length === 0}
      icon={open ? 'fas fa-chevron-up' : 'fas fa-chevron-down'}
      iconPosition="right"
      onclick={() => (open = !open)}
    >
      {selectedLabel}
    </Button>

    <!-- Ghost copies size the trigger to its widest label so the row never
         reflows on theme change. Real Buttons, so the metrics stay exact. -->
    {#each [placeholder, ...themes.map((theme) => theme.label)] as label (label)}
      <div class="theme-select-ghost" aria-hidden="true" inert>
        <Button class="theme-select-button" variant="secondary" icon="fas fa-chevron-down" iconPosition="right">
          {label}
        </Button>
      </div>
    {/each}
  </div>

  {#if open}
    <div class="theme-select-panel" bind:this={panelEl} use:portal>
      <MenuSelect items={themes} value={$openThemeSlug} minWidth="12rem" onchange={changeTheme} />
    </div>
  {/if}

  {#if error}
    <span class="error" aria-live="polite">{error}</span>
  {/if}
</div>

<style>
  .theme-select {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-4);
  }

  .theme-select-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    line-height: var(--line-height-normal);
    color: var(--text-secondary);
  }

  .theme-select-trigger {
    position: relative;
    display: grid;
    grid-template-areas: 'trigger';
  }

  .theme-select-trigger > :global(*) {
    grid-area: trigger;
  }

  .theme-select-trigger :global(.theme-select-button) {
    justify-content: space-between;
  }

  .theme-select-ghost {
    height: 0;
    visibility: hidden;
    pointer-events: none;
  }

  /* Fixed and portaled to <body>: absolute positioning is clipped by any
     ancestor overflow (the Home card) and trapped by any stacking context (the
     demo hero), and the overflow it caused made that ancestor scrollable, so
     moving focus into the list scrolled the page out from under it. */
  .theme-select-panel {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    visibility: hidden;
  }

  .error {
    max-width: 20rem;
    color: var(--text-danger);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
  }
</style>
