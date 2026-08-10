<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    /** Heading line inside the menu; also its accessible name. */
    header: string;
    /** Accessible name for an icon-only trigger; a text trigger names itself. */
    triggerLabel?: string;
    /** Lets the caller style the trigger as its own furniture via `:global`. */
    triggerClass?: string;
    menuMinWidth?: string;
    trigger: Snippet;
    children: Snippet<[{ close: () => void }]>;
  }

  let {
    header,
    triggerLabel,
    triggerClass = '',
    menuMinWidth = '14rem',
    trigger,
    children,
  }: Props = $props();

  let open = $state(false);
  let btnEl = $state<HTMLButtonElement | undefined>(undefined);
  let menuEl = $state<HTMLDivElement | undefined>(undefined);
  let initialItem = $state<'first' | 'last'>('first');

  function items(): HTMLButtonElement[] {
    return menuEl ? Array.from(menuEl.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')) : [];
  }

  function close(refocusTrigger = true) {
    if (!open) return;
    open = false;
    if (refocusTrigger) btnEl?.focus();
  }

  function toggle() {
    if (open) {
      close();
    } else {
      initialItem = 'first';
      open = true;
    }
  }

  function onTriggerKeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    initialItem = e.key === 'ArrowUp' ? 'last' : 'first';
    open = true;
  }

  // Enter and Space activate the focused item natively: items are real buttons.
  function onMenuKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      close();
      return;
    }
    const list = items();
    if (list.length === 0) return;
    const idx = list.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown') next = idx === -1 ? 0 : (idx + 1) % list.length;
    else if (e.key === 'ArrowUp') next = idx === -1 ? list.length - 1 : (idx - 1 + list.length) % list.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = list.length - 1;
    if (next === -1) return;
    e.preventDefault();
    list[next].focus();
  }

  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) close();
  }

  function onDocumentMousedown(e: MouseEvent) {
    if (!open) return;
    const target = e.target as Node | null;
    if (target && (btnEl?.contains(target) || menuEl?.contains(target))) return;
    // The user is directing attention elsewhere; refocusing the trigger would
    // steal focus from whatever they clicked.
    close(false);
  }

  onMount(() => {
    window.addEventListener('keydown', onWindowKeydown);
    document.addEventListener('mousedown', onDocumentMousedown, true);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', onWindowKeydown);
    document.removeEventListener('mousedown', onDocumentMousedown, true);
  });

  /* Reparented out of the row: a trigger's surroundings can carry opacity
     (dimmed rows do), which fades every descendant and would show the page
     through the popup. Fixed positioning alone cannot escape that.
     The host is the enclosing .editor-page, not <body>: every --ui-* token is
     scoped to it, so a popup parked outside renders with no background at all.
     Reparenting takes the node out of the range the component tears down, so
     removal is the action's to do: a menu open when its trigger disappears
     (selecting a family swaps the row's trigger) would otherwise be stranded. */
  function portal(node: HTMLElement) {
    (node.closest('.editor-page') ?? document.body).appendChild(node);
    return { destroy: () => node.remove() };
  }

  /* Fixed positioning escapes any parent overflow/stacking context. Anchored
     below the trigger, right edges aligned; flips above near the viewport
     bottom. Inline visibility rather than a state flag so the item focus that
     follows lands on an already-visible menu (hidden elements refuse focus). */
  function position(): void {
    const btn = btnEl;
    const menu = menuEl;
    if (!btn || !menu) return;
    const br = btn.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = br.right - mr.width;
    if (left < margin) left = margin;
    if (left + mr.width > vw - margin) left = vw - margin - mr.width;
    let top = br.bottom + margin / 2;
    if (top + mr.height > vh - margin) {
      top = br.top - margin / 2 - mr.height;
      if (top < margin) top = margin;
    }
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    // A container-type (or transformed) ancestor re-parents the fixed
    // containing block off the viewport origin; measure where the menu landed
    // and re-anchor so the viewport math above still holds.
    const placed = menu.getBoundingClientRect();
    if (Math.abs(placed.left - left) > 0.5 || Math.abs(placed.top - top) > 0.5) {
      menu.style.left = `${left - (placed.left - left)}px`;
      menu.style.top = `${top - (placed.top - top)}px`;
    }
    menu.style.visibility = 'visible';
  }

  $effect(() => {
    if (!open) return;
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        // The composed option primitives expose no role prop; stamping
        // menuitem + tabindex here is what makes the popup a real menu with
        // roving focus instead of a cluster of tab stops.
        for (const b of items()) {
          b.setAttribute('role', 'menuitem');
          b.tabIndex = -1;
        }
        position();
        const list = items();
        (initialItem === 'last' ? list[list.length - 1] : list[0])?.focus();
      });
    });
    window.addEventListener('scroll', position, true);
    window.addEventListener('resize', position);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', position, true);
      window.removeEventListener('resize', position);
    };
  });
</script>

<button
  type="button"
  class="menu-trigger {triggerClass}"
  aria-haspopup="menu"
  aria-expanded={open}
  aria-label={triggerLabel}
  bind:this={btnEl}
  onclick={toggle}
  onkeydown={onTriggerKeydown}
>
  {@render trigger()}
</button>

{#if open}
  <div
    class="menu"
    role="menu"
    tabindex="-1"
    aria-label={header}
    style="min-width: {menuMinWidth};"
    bind:this={menuEl}
    onkeydown={onMenuKeydown}
    use:portal
  >
    <div class="menu-header" role="presentation">{header}</div>
    {@render children({ close })}
  </div>
{/if}

<style>
  .menu-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-4);
    padding: 0;
    background: transparent;
    border: 0;
    color: inherit;
    font: inherit;
    line-height: 1;
    cursor: pointer;
  }

  .menu-trigger:focus-visible {
    outline: 2px solid var(--ui-border-higher);
    outline-offset: 2px;
  }

  .menu {
    position: fixed;
    top: 0;
    left: 0;
    max-width: calc(100vw - var(--ui-space-24));
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-high);
    border-radius: var(--ui-radius-lg);
    box-shadow: var(--ui-shadow-lg);
    z-index: 1000;
    overflow: hidden;
    visibility: hidden;
  }

  .menu-header {
    padding: var(--ui-space-8) var(--ui-space-12);
    border-bottom: 1px solid var(--ui-border-low);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    line-height: 1.2;
  }

  /* Roving focus is the menu's selection cursor; the inset ring keeps it
     inside the clipped rounded corners. */
  .menu :global(button:focus-visible) {
    background: var(--ui-hover);
    outline: 2px solid var(--ui-border-higher);
    outline-offset: -2px;
  }
</style>
