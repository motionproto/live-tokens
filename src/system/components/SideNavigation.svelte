<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CollapsibleSection from './CollapsibleSection.svelte';

  export type SideNavItem = {
    /** Full path. Matches `currentPath` exactly when this item is active. */
    path: string;
    title: string;
  };

  export type SideNavSection = {
    /** Unique key for expand-state tracking. Also the section's own page path
        when `hasIndexPage` is true. */
    path: string;
    title: string;
    items: SideNavItem[];
    /** When true, the section header is a link to `hrefFor(section.path)`.
        Defaults to false — the header acts as a toggle only. */
    hasIndexPage?: boolean;
  };

  export type SideNavFooter = {
    path: string;
    title: string;
    icon?: string;
  };

  interface Props {
    sections?: SideNavSection[];
    footer?: SideNavFooter | undefined;
    titleLabel?: string;
    titleHref?: string;
    currentPath?: string;
    open?: boolean;
    /** Builds the href for a section/item/footer path. Default returns `#${path}`. */
    hrefFor?: (path: string) => string;
    /** Force-hover one part for editor previews. */
    forceHoverPart?: 'title' | 'toggle' | 'item' | 'footer' | null;
    /** Force-active one part for editor previews. */
    forceActivePart?: 'title' | 'item' | 'footer' | null;
    class?: string;
    /** Toggle callback. Preferred over `on:toggle` from 0.5.0 onward. */
    ontoggle?: () => void;
  }

  let {
    sections = [],
    footer = undefined,
    titleLabel = '',
    titleHref = '#',
    currentPath = '',
    open = true,
    hrefFor,
    forceHoverPart = null,
    forceActivePart = null,
    class: className = '',
    ontoggle,
  }: Props = $props();

  // Dual-fire bridge — see Button.svelte for the deprecation timeline.
  const dispatch = createEventDispatcher<{ toggle: void }>();

  let expandedSections: Record<string, boolean> = $state({});

  // Auto-expand sections that match the current path or contain an active item.
  $effect(() => {
    for (const section of sections) {
      const containsActive = section.items.some((i) => i.path === currentPath);
      if (currentPath === section.path || containsActive) {
        expandedSections[section.path] = true;
      }
    }
  });

  function toggleSection(path: string) {
    expandedSections[path] = !expandedSections[path];
  }

  function fireToggle() {
    ontoggle?.();
    dispatch('toggle');
  }

  function buildHref(path: string): string {
    return hrefFor ? hrefFor(path) : `#${path}`;
  }

  function sectionHref(section: SideNavSection): string | undefined {
    return section.hasIndexPage ? buildHref(section.path) : undefined;
  }

  // The first section's first / second items are the canonical preview targets
  // when the editor force-activates or force-hovers an item, so token edits
  // always have a row to paint against.
  let activeItemKey = $derived(() => {
    if (forceActivePart !== 'item') return null;
    const s = sections[0];
    if (!s || s.items.length === 0) return null;
    return s.items[0].path;
  });
  let hoverItemKey = $derived(() => {
    if (forceHoverPart !== 'item') return null;
    const s = sections[0];
    if (!s || s.items.length === 0) return null;
    return (s.items[1] ?? s.items[0]).path;
  });

  let titleActive = $derived(forceActivePart === 'title' || currentPath === '');
</script>

<aside
  class="sidenavigation {className}"
  class:collapsed={!open}
  class:force-title-hover={forceHoverPart === 'title'}
  class:force-toggle-hover={forceHoverPart === 'toggle'}
  class:force-footer-hover={forceHoverPart === 'footer'}
  class:force-footer-active={forceActivePart === 'footer'}
>
  <!-- Title header. Toggle lives inside it (anchored to the right edge of the
       header) so the two read as one component. The header itself stays
       mounted at all widths so the toggle remains clickable when collapsed;
       the label fades + clips as the panel narrows. -->
  <header class="sn-title" class:active={titleActive}>
    <a href={titleHref} class="sn-title-label">{titleLabel}</a>
    <button
      type="button"
      class="sn-toggle"
      onclick={fireToggle}
      aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-expanded={open}
    >
      <i class="fa-solid {open ? 'fa-angles-left' : 'fa-angles-right'}" aria-hidden="true"></i>
    </button>
  </header>

  <div class="sn-menu" aria-hidden={!open}>
    {#each sections as section (section.path)}
      <div class="sn-section">
        <CollapsibleSection
          variant="chromeless"
          label={section.title}
          href={sectionHref(section)}
          expanded={expandedSections[section.path] || false}
          ontoggle={() => toggleSection(section.path)}
        />

        {#if expandedSections[section.path]}
          <div class="sn-items">
            {#each section.items as item (item.path)}
              <a
                href={buildHref(item.path)}
                class="sn-item"
                class:active={item.path === currentPath || item.path === activeItemKey()}
                class:force-hover={item.path === hoverItemKey()}
              >
                {item.title}
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/each}

    {#if footer}
      <a
        href={buildHref(footer.path)}
        class="sn-footer"
        class:active={currentPath === footer.path}
      >
        {#if footer.icon}<i class={footer.icon} aria-hidden="true"></i>{/if}
        <span>{footer.title}</span>
      </a>
    {/if}
  </div>
</aside>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    /* Panel — outer chrome + layout. No states. */
    --sidenavigation-panel-surface: var(--surface-canvas-lower);
    --sidenavigation-panel-border: var(--border-canvas-faint);
    --sidenavigation-panel-border-width: var(--border-width-1);
    --sidenavigation-panel-padding: var(--space-16);
    --sidenavigation-panel-section-gap: var(--space-4);
    --sidenavigation-panel-item-indent: var(--space-32);
    --sidenavigation-panel-footer-gap: var(--space-16);

    /* Title — default */
    --sidenavigation-title-default-surface: var(--color-transparent);
    --sidenavigation-title-default-border: var(--border-canvas-faint);
    --sidenavigation-title-default-border-width: var(--border-width-1);
    --sidenavigation-title-default-padding: var(--space-12);
    --sidenavigation-title-default-indicator: var(--color-transparent);
    --sidenavigation-title-default-indicator-width: var(--border-width-3);
    --sidenavigation-title-default-label: var(--text-primary);
    --sidenavigation-title-default-label-font-family: var(--font-display);
    --sidenavigation-title-default-label-font-size: var(--font-size-2xl);
    --sidenavigation-title-default-label-font-weight: var(--font-weight-normal);
    --sidenavigation-title-default-label-line-height: var(--line-height-sm);

    /* Title — hover */
    --sidenavigation-title-hover-surface: var(--surface-canvas);
    --sidenavigation-title-hover-border: var(--border-canvas-faint);
    --sidenavigation-title-hover-border-width: var(--border-width-1);
    --sidenavigation-title-hover-padding: var(--space-12);
    --sidenavigation-title-hover-indicator: var(--color-transparent);
    --sidenavigation-title-hover-indicator-width: var(--border-width-3);
    --sidenavigation-title-hover-label: var(--text-primary);
    --sidenavigation-title-hover-label-font-family: var(--font-display);
    --sidenavigation-title-hover-label-font-size: var(--font-size-2xl);
    --sidenavigation-title-hover-label-font-weight: var(--font-weight-normal);
    --sidenavigation-title-hover-label-line-height: var(--line-height-sm);

    /* Title — active */
    --sidenavigation-title-active-surface: var(--surface-canvas-low);
    --sidenavigation-title-active-border: var(--border-canvas-faint);
    --sidenavigation-title-active-border-width: var(--border-width-1);
    --sidenavigation-title-active-padding: var(--space-12);
    --sidenavigation-title-active-indicator: var(--border-brand-medium);
    --sidenavigation-title-active-indicator-width: var(--border-width-3);
    --sidenavigation-title-active-label: var(--text-primary);
    --sidenavigation-title-active-label-font-family: var(--font-display);
    --sidenavigation-title-active-label-font-size: var(--font-size-2xl);
    --sidenavigation-title-active-label-font-weight: var(--font-weight-normal);
    --sidenavigation-title-active-label-line-height: var(--line-height-sm);

    /* Toggle — default */
    --sidenavigation-toggle-default-surface: var(--color-transparent);
    --sidenavigation-toggle-default-border: var(--border-brand-medium);
    --sidenavigation-toggle-default-border-width: var(--border-width-1);
    --sidenavigation-toggle-default-radius: var(--radius-md);
    --sidenavigation-toggle-default-padding: var(--space-8);
    --sidenavigation-toggle-default-icon: var(--text-primary);
    --sidenavigation-toggle-default-icon-size: var(--icon-size-md);

    /* Toggle — hover */
    --sidenavigation-toggle-hover-surface: var(--surface-brand-lowest);
    --sidenavigation-toggle-hover-border: var(--border-brand);
    --sidenavigation-toggle-hover-border-width: var(--border-width-1);
    --sidenavigation-toggle-hover-radius: var(--radius-md);
    --sidenavigation-toggle-hover-padding: var(--space-8);
    --sidenavigation-toggle-hover-icon: var(--text-brand);
    --sidenavigation-toggle-hover-icon-size: var(--icon-size-md);

    /* Item — default */
    --sidenavigation-item-default-surface: var(--color-transparent);
    --sidenavigation-item-default-padding: var(--space-6);
    --sidenavigation-item-default-indicator: var(--color-transparent);
    --sidenavigation-item-default-indicator-width: var(--border-width-3);
    --sidenavigation-item-default-text: var(--text-tertiary);
    --sidenavigation-item-default-text-font-family: var(--font-sans);
    --sidenavigation-item-default-text-font-size: var(--font-size-sm);
    --sidenavigation-item-default-text-font-weight: var(--font-weight-light);
    --sidenavigation-item-default-text-line-height: var(--line-height-md);

    /* Item — hover */
    --sidenavigation-item-hover-surface: var(--surface-canvas);
    --sidenavigation-item-hover-padding: var(--space-6);
    --sidenavigation-item-hover-indicator: var(--color-transparent);
    --sidenavigation-item-hover-indicator-width: var(--border-width-3);
    --sidenavigation-item-hover-text: var(--text-secondary);
    --sidenavigation-item-hover-text-font-family: var(--font-sans);
    --sidenavigation-item-hover-text-font-size: var(--font-size-sm);
    --sidenavigation-item-hover-text-font-weight: var(--font-weight-light);
    --sidenavigation-item-hover-text-line-height: var(--line-height-md);

    /* Item — active */
    --sidenavigation-item-active-surface: var(--surface-canvas-low);
    --sidenavigation-item-active-padding: var(--space-6);
    --sidenavigation-item-active-indicator: var(--border-brand-medium);
    --sidenavigation-item-active-indicator-width: var(--border-width-3);
    --sidenavigation-item-active-text: var(--text-primary);
    --sidenavigation-item-active-text-font-family: var(--font-sans);
    --sidenavigation-item-active-text-font-size: var(--font-size-sm);
    --sidenavigation-item-active-text-font-weight: var(--font-weight-normal);
    --sidenavigation-item-active-text-line-height: var(--line-height-md);

    /* Footer — default */
    --sidenavigation-footer-default-surface: var(--color-transparent);
    --sidenavigation-footer-default-padding: var(--space-8);
    --sidenavigation-footer-default-gap: var(--space-8);
    --sidenavigation-footer-default-indicator: var(--color-transparent);
    --sidenavigation-footer-default-indicator-width: var(--border-width-3);
    --sidenavigation-footer-default-icon: var(--text-muted);
    --sidenavigation-footer-default-icon-size: var(--icon-size-xs);
    --sidenavigation-footer-default-text: var(--text-tertiary);
    --sidenavigation-footer-default-text-font-family: var(--font-sans);
    --sidenavigation-footer-default-text-font-size: var(--font-size-sm);
    --sidenavigation-footer-default-text-font-weight: var(--font-weight-light);
    --sidenavigation-footer-default-text-line-height: var(--line-height-md);

    /* Footer — hover */
    --sidenavigation-footer-hover-surface: var(--surface-canvas);
    --sidenavigation-footer-hover-padding: var(--space-8);
    --sidenavigation-footer-hover-gap: var(--space-8);
    --sidenavigation-footer-hover-indicator: var(--color-transparent);
    --sidenavigation-footer-hover-indicator-width: var(--border-width-3);
    --sidenavigation-footer-hover-icon: var(--text-secondary);
    --sidenavigation-footer-hover-icon-size: var(--icon-size-xs);
    --sidenavigation-footer-hover-text: var(--text-secondary);
    --sidenavigation-footer-hover-text-font-family: var(--font-sans);
    --sidenavigation-footer-hover-text-font-size: var(--font-size-sm);
    --sidenavigation-footer-hover-text-font-weight: var(--font-weight-light);
    --sidenavigation-footer-hover-text-line-height: var(--line-height-md);

    /* Footer — active */
    --sidenavigation-footer-active-surface: var(--surface-canvas-low);
    --sidenavigation-footer-active-padding: var(--space-8);
    --sidenavigation-footer-active-gap: var(--space-8);
    --sidenavigation-footer-active-indicator: var(--border-brand-medium);
    --sidenavigation-footer-active-indicator-width: var(--border-width-3);
    --sidenavigation-footer-active-icon: var(--text-primary);
    --sidenavigation-footer-active-icon-size: var(--icon-size-xs);
    --sidenavigation-footer-active-text: var(--text-primary);
    --sidenavigation-footer-active-text-font-family: var(--font-sans);
    --sidenavigation-footer-active-text-font-size: var(--font-size-sm);
    --sidenavigation-footer-active-text-font-weight: var(--font-weight-normal);
    --sidenavigation-footer-active-text-line-height: var(--line-height-md);
  }

  .sidenavigation {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--sidenavigation-panel-surface);
    border-right: var(--sidenavigation-panel-border-width) solid var(--sidenavigation-panel-border);
    @include themed-padding(--sidenavigation-panel-padding, $h: 0);
    scrollbar-width: thin;
  }

  /* Per-state token rebinds — layout-affecting properties are written exactly
     once on the element, then state rules rebind only the `--_*` values they
     need. Matches the TabBar pattern: paint-only repaint, no reshape. */
  .sn-title {
    --_surface: var(--sidenavigation-title-default-surface);
    --_border: var(--sidenavigation-title-default-border);
    --_border-width: var(--sidenavigation-title-default-border-width);
    --_padding: var(--sidenavigation-title-default-padding);
    --_indicator: var(--sidenavigation-title-default-indicator);
    --_indicator-width: var(--sidenavigation-title-default-indicator-width);
    --_label: var(--sidenavigation-title-default-label);
    --_label-family: var(--sidenavigation-title-default-label-font-family);
    --_label-size: var(--sidenavigation-title-default-label-font-size);
    --_label-weight: var(--sidenavigation-title-default-label-font-weight);
    --_label-line-height: var(--sidenavigation-title-default-label-line-height);

    /* Positioning context for the absolutely-anchored toggle button. */
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: var(--space-12);
    background: var(--_surface);
    border-bottom: var(--_border-width) solid var(--_border);
    border-left: var(--_indicator-width) solid var(--_indicator);
    @include themed-padding(--_padding);
    /* Right padding clears the absolutely-positioned toggle inside this
       header (toggle width ~36px + 8px breathing room). */
    padding-right: calc(var(--space-12) + 44px);
    transition: background var(--duration-150), border-color var(--duration-150);
  }

  .sn-title:hover:not(.active),
  .sidenavigation.force-title-hover .sn-title:not(.active) {
    --_surface: var(--sidenavigation-title-hover-surface);
    --_border: var(--sidenavigation-title-hover-border);
    --_border-width: var(--sidenavigation-title-hover-border-width);
    --_padding: var(--sidenavigation-title-hover-padding);
    --_indicator: var(--sidenavigation-title-hover-indicator);
    --_indicator-width: var(--sidenavigation-title-hover-indicator-width);
    --_label: var(--sidenavigation-title-hover-label);
    --_label-family: var(--sidenavigation-title-hover-label-font-family);
    --_label-size: var(--sidenavigation-title-hover-label-font-size);
    --_label-weight: var(--sidenavigation-title-hover-label-font-weight);
    --_label-line-height: var(--sidenavigation-title-hover-label-line-height);
  }

  .sn-title.active {
    --_surface: var(--sidenavigation-title-active-surface);
    --_border: var(--sidenavigation-title-active-border);
    --_border-width: var(--sidenavigation-title-active-border-width);
    --_padding: var(--sidenavigation-title-active-padding);
    --_indicator: var(--sidenavigation-title-active-indicator);
    --_indicator-width: var(--sidenavigation-title-active-indicator-width);
    --_label: var(--sidenavigation-title-active-label);
    --_label-family: var(--sidenavigation-title-active-label-font-family);
    --_label-size: var(--sidenavigation-title-active-label-font-size);
    --_label-weight: var(--sidenavigation-title-active-label-font-weight);
    --_label-line-height: var(--sidenavigation-title-active-label-line-height);
  }

  .sn-title-label {
    color: var(--_label);
    font-family: var(--_label-family);
    font-size: var(--_label-size);
    font-weight: var(--_label-weight);
    line-height: var(--_label-line-height);
    text-decoration: none;
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
    /* Cross-fades with the menu when the panel collapses. Slight delay on
       reopen so the slide-out is well underway before the label re-appears. */
    opacity: 1;
    transition: opacity var(--duration-200, 200ms) ease 80ms;
  }
  .sidenavigation.collapsed .sn-title-label {
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-150, 150ms) ease;
  }

  .sn-toggle {
    --_surface: var(--sidenavigation-toggle-default-surface);
    --_border: var(--sidenavigation-toggle-default-border);
    --_border-width: var(--sidenavigation-toggle-default-border-width);
    --_radius: var(--sidenavigation-toggle-default-radius);
    --_padding: var(--sidenavigation-toggle-default-padding);
    --_icon: var(--sidenavigation-toggle-default-icon);
    --_icon-size: var(--sidenavigation-toggle-default-icon-size);

    /* Anchored to the title header's right edge so the button rides the
       panel's right edge as it slides open/closed. */
    position: absolute;
    top: 50%;
    right: var(--space-8);
    transform: translateY(-50%);
    z-index: 1;

    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--_surface);
    border: var(--_border-width) solid var(--_border);
    border-radius: var(--_radius);
    color: var(--_icon);
    @include themed-padding(--_padding);
    cursor: pointer;
    transition: background var(--duration-150), border-color var(--duration-150), color var(--duration-150);
  }

  .sn-toggle i {
    font-size: var(--_icon-size);
    line-height: 1;
  }

  .sn-toggle:hover,
  .sidenavigation.force-toggle-hover .sn-toggle {
    --_surface: var(--sidenavigation-toggle-hover-surface);
    --_border: var(--sidenavigation-toggle-hover-border);
    --_border-width: var(--sidenavigation-toggle-hover-border-width);
    --_radius: var(--sidenavigation-toggle-hover-radius);
    --_padding: var(--sidenavigation-toggle-hover-padding);
    --_icon: var(--sidenavigation-toggle-hover-icon);
    --_icon-size: var(--sidenavigation-toggle-hover-icon-size);
  }

  /* Menu wraps everything below the title header. Scroll lives here so the
     title (with its toggle) stays pinned while a tall menu list scrolls. */
  .sn-menu {
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    opacity: 1;
    transition: opacity var(--duration-200, 200ms) ease 80ms;
  }
  .sidenavigation.collapsed .sn-menu {
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-150, 150ms) ease;
  }

  .sn-section {
    margin-top: var(--sidenavigation-panel-section-gap);
  }

  .sn-items {
    display: flex;
    flex-direction: column;
    padding: var(--space-4) 0;
  }

  .sn-item {
    --_surface: var(--sidenavigation-item-default-surface);
    --_padding: var(--sidenavigation-item-default-padding);
    --_indicator: var(--sidenavigation-item-default-indicator);
    --_indicator-width: var(--sidenavigation-item-default-indicator-width);
    --_text: var(--sidenavigation-item-default-text);
    --_text-family: var(--sidenavigation-item-default-text-font-family);
    --_text-size: var(--sidenavigation-item-default-text-font-size);
    --_text-weight: var(--sidenavigation-item-default-text-font-weight);
    --_text-line-height: var(--sidenavigation-item-default-text-line-height);

    display: block;
    background: var(--_surface);
    border-left: var(--_indicator-width) solid var(--_indicator);
    @include themed-padding(--_padding);
    padding-left: var(--sidenavigation-panel-item-indent);
    color: var(--_text);
    font-family: var(--_text-family);
    font-size: var(--_text-size);
    font-weight: var(--_text-weight);
    line-height: var(--_text-line-height);
    text-decoration: none;
    transition: background var(--duration-150), color var(--duration-150);
  }

  .sn-item:hover:not(.active),
  .sn-item.force-hover:not(.active) {
    --_surface: var(--sidenavigation-item-hover-surface);
    --_padding: var(--sidenavigation-item-hover-padding);
    --_indicator: var(--sidenavigation-item-hover-indicator);
    --_indicator-width: var(--sidenavigation-item-hover-indicator-width);
    --_text: var(--sidenavigation-item-hover-text);
    --_text-family: var(--sidenavigation-item-hover-text-font-family);
    --_text-size: var(--sidenavigation-item-hover-text-font-size);
    --_text-weight: var(--sidenavigation-item-hover-text-font-weight);
    --_text-line-height: var(--sidenavigation-item-hover-text-line-height);
  }

  .sn-item.active {
    --_surface: var(--sidenavigation-item-active-surface);
    --_padding: var(--sidenavigation-item-active-padding);
    --_indicator: var(--sidenavigation-item-active-indicator);
    --_indicator-width: var(--sidenavigation-item-active-indicator-width);
    --_text: var(--sidenavigation-item-active-text);
    --_text-family: var(--sidenavigation-item-active-text-font-family);
    --_text-size: var(--sidenavigation-item-active-text-font-size);
    --_text-weight: var(--sidenavigation-item-active-text-font-weight);
    --_text-line-height: var(--sidenavigation-item-active-text-line-height);
  }

  .sn-footer {
    --_surface: var(--sidenavigation-footer-default-surface);
    --_padding: var(--sidenavigation-footer-default-padding);
    --_gap: var(--sidenavigation-footer-default-gap);
    --_indicator: var(--sidenavigation-footer-default-indicator);
    --_indicator-width: var(--sidenavigation-footer-default-indicator-width);
    --_icon: var(--sidenavigation-footer-default-icon);
    --_icon-size: var(--sidenavigation-footer-default-icon-size);
    --_text: var(--sidenavigation-footer-default-text);
    --_text-family: var(--sidenavigation-footer-default-text-font-family);
    --_text-size: var(--sidenavigation-footer-default-text-font-size);
    --_text-weight: var(--sidenavigation-footer-default-text-font-weight);
    --_text-line-height: var(--sidenavigation-footer-default-text-line-height);

    display: flex;
    align-items: center;
    gap: var(--_gap);
    margin-top: var(--sidenavigation-panel-footer-gap);
    background: var(--_surface);
    border-left: var(--_indicator-width) solid var(--_indicator);
    @include themed-padding(--_padding);
    color: var(--_text);
    font-family: var(--_text-family);
    font-size: var(--_text-size);
    font-weight: var(--_text-weight);
    line-height: var(--_text-line-height);
    text-decoration: none;
    transition: background var(--duration-150), color var(--duration-150);
  }

  .sn-footer i {
    color: var(--_icon);
    font-size: var(--_icon-size);
    line-height: 1;
  }

  .sn-footer:hover:not(.active),
  .sidenavigation.force-footer-hover .sn-footer:not(.active) {
    --_surface: var(--sidenavigation-footer-hover-surface);
    --_padding: var(--sidenavigation-footer-hover-padding);
    --_gap: var(--sidenavigation-footer-hover-gap);
    --_indicator: var(--sidenavigation-footer-hover-indicator);
    --_indicator-width: var(--sidenavigation-footer-hover-indicator-width);
    --_icon: var(--sidenavigation-footer-hover-icon);
    --_icon-size: var(--sidenavigation-footer-hover-icon-size);
    --_text: var(--sidenavigation-footer-hover-text);
    --_text-family: var(--sidenavigation-footer-hover-text-font-family);
    --_text-size: var(--sidenavigation-footer-hover-text-font-size);
    --_text-weight: var(--sidenavigation-footer-hover-text-font-weight);
    --_text-line-height: var(--sidenavigation-footer-hover-text-line-height);
  }

  .sn-footer.active,
  .sidenavigation.force-footer-active .sn-footer {
    --_surface: var(--sidenavigation-footer-active-surface);
    --_padding: var(--sidenavigation-footer-active-padding);
    --_gap: var(--sidenavigation-footer-active-gap);
    --_indicator: var(--sidenavigation-footer-active-indicator);
    --_indicator-width: var(--sidenavigation-footer-active-indicator-width);
    --_icon: var(--sidenavigation-footer-active-icon);
    --_icon-size: var(--sidenavigation-footer-active-icon-size);
    --_text: var(--sidenavigation-footer-active-text);
    --_text-family: var(--sidenavigation-footer-active-text-font-family);
    --_text-size: var(--sidenavigation-footer-active-text-font-size);
    --_text-weight: var(--sidenavigation-footer-active-text-font-weight);
    --_text-line-height: var(--sidenavigation-footer-active-text-line-height);
  }
</style>
