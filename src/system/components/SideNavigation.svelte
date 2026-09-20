<script module lang="ts">
  import type { CatalogueEntry } from '../../editor/component-editor/scaffolding/types';

  export const catalogue = {
    description: 'The rail that moves between the pages of a site.',
    family: 'display',
    whenToUse: 'navigation that follows the current path.',
    whenNotToUse: [
      { when: 'the switch stays inside one page, with no URL change.', use: 'tabbar' },
      { when: 'the list holds actions.', use: 'menuselect' },
    ],
  } satisfies CatalogueEntry;
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CollapsibleSection from './CollapsibleSection.svelte';

  export type SideNavItem = {
    /** Full path. Matches `currentPath` exactly when this item is selected. */
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
    /** Wash the hovered surface with the theme's tint. `undefined` inherits the
        global default; `true`/`false` force this instance on/off. */
    hoverTint?: boolean | undefined;
    sections?: SideNavSection[];
    footer?: SideNavFooter | undefined;
    title?: string;
    titleHref?: string;
    currentPath?: string;
    open?: boolean;
    /** Builds the href for a section/item/footer path. Default returns `#${path}`. */
    hrefFor?: (path: string) => string;
    /** Force-hover one part for editor previews. */
    forceHoverPart?: 'title' | 'toggle' | 'item' | 'footer' | 'section' | null;
    /** Force the selected state on one part for editor previews. */
    forceSelectedPart?: 'title' | 'item' | 'footer' | 'section' | null;
    class?: string;
    /** Toggle callback. Preferred over `on:toggle` from 0.5.0 onward. */
    ontoggle?: () => void;
    /** Optional content rendered at the top of the rail, above the title
        (e.g. a logo or company name). Hidden while collapsed. No spacing is
        imposed — the consumer controls it. */
    lead?: import('svelte').Snippet;
    /** Optional content rendered at the foot of the nav list, inside the panel.
        Hidden while collapsed. No spacing is imposed — the consumer controls it. */
    actions?: import('svelte').Snippet;
  }

  let {
    hoverTint = undefined,
    sections = [],
    footer = undefined,
    title = '',
    titleHref = '#',
    currentPath = '',
    open = true,
    hrefFor,
    forceHoverPart = null,
    forceSelectedPart = null,
    class: className = '',
    ontoggle,
    lead,
    actions,
  }: Props = $props();

  // Per-instance override of the global hover-tint intrinsic; undefined leaves :root in charge.
  let hoverTintValue = $derived(
    hoverTint === undefined ? undefined : hoverTint ? 'var(--sidenavigation-hover-tint)' : 'var(--color-transparent)',
  );

  // Dual-fire bridge — see Button.svelte for the deprecation timeline.
  const dispatch = createEventDispatcher<{ toggle: void }>();

  let expandedSections: Record<string, boolean> = $state({});

  // Auto-expand sections that match the current path or contain the selected item.
  $effect(() => {
    for (const section of sections) {
      const containsSelected = section.items.some((i) => i.path === currentPath);
      if (currentPath === section.path || containsSelected) {
        expandedSections[section.path] = true;
      }
    }
  });

  function toggleSection(path: string) {
    expandedSections[path] = !expandedSections[path];
  }

  // Clicking a section label whose route is already current would otherwise be
  // a no-op navigation. Make it a toggle in that case so the user can collapse
  // the section they just opened without having to chase the chevron. The
  // chevron's own onclick is unaffected — its event target isn't inside an <a>.
  function maybeInterceptLabel(e: MouseEvent, section: SideNavSection) {
    if (!section.hasIndexPage || currentPath !== section.path) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = e.target as Element | null;
    if (!target?.closest('a')) return;
    e.preventDefault();
    toggleSection(section.path);
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
  // when the editor forces an item selected or hovered, so token edits
  // always have a row to paint against.
  let selectedItemKey = $derived(() => {
    if (forceSelectedPart !== 'item') return null;
    const s = sections[0];
    if (!s || s.items.length === 0) return null;
    return s.items[0].path;
  });
  let hoverItemKey = $derived(() => {
    if (forceHoverPart !== 'item') return null;
    const s = sections[0];
    if (!s || s.items.length === 0) return null;
    return s.items.find((item) => item.path !== currentPath)?.path ?? s.items[0].path;
  });

  let titleSelected = $derived(forceSelectedPart === 'title' || currentPath === '');

  // When the editor forces the "section" part selected, pick the first section
  // that's a valid route (hasIndexPage) so the selected styling has somewhere
  // to land in the preview.
  let selectedSectionKey = $derived(() => {
    if (forceSelectedPart !== 'section') return null;
    const s = sections.find((sec) => sec.hasIndexPage) ?? sections[0];
    return s?.path ?? null;
  });
  let hoverSectionKey = $derived(() => {
    if (forceHoverPart !== 'section') return null;
    const s = sections.find((sec) => sec.hasIndexPage) ?? sections[0];
    return s?.path ?? null;
  });

  function isSectionSelected(section: SideNavSection): boolean {
    if (!section.hasIndexPage) return false;
    if (selectedSectionKey() === section.path) return true;
    return currentPath === section.path;
  }
  function isSectionHover(section: SideNavSection): boolean {
    return hoverSectionKey() === section.path;
  }
</script>

<aside
  style:--sidenavigation-hover-tint-enabled={hoverTintValue}
  class="sidenavigation {className}"
  class:collapsed={!open}
  class:force-title-hover={forceHoverPart === 'title'}
  class:force-toggle-hover={forceHoverPart === 'toggle'}
  class:force-footer-hover={forceHoverPart === 'footer'}
  class:force-footer-selected={forceSelectedPart === 'footer'}
>
  {#if open && lead}{@render lead()}{/if}

  <!-- Header is always rendered so the toggle (a child here) survives the
       collapsed state. The label is the only conditional child — when the
       rail is closed, the header reduces to just the toggle, centred via the
       toggle's own `left` calc. Header stays locked to open-width regardless;
       the aside's overflow clips it during the close animation. -->
  <header class="sn-title" class:selected={titleSelected}>
    {#if open}
      <a href={titleHref} class="sn-title-label">{title}</a>
    {/if}

    <button
      type="button"
      class="sn-toggle"
      onclick={fireToggle}
      aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-expanded={open}
    >
      <i class="fa-solid fa-angles-right" aria-hidden="true"></i>
    </button>
  </header>

  {#if open}
    <div class="sn-menu">
      {#each sections as section (section.path)}
        <div class="sn-section">
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions, a11y_no_static_element_interactions -->
          <div
            class="sn-section-header"
            class:selected={isSectionSelected(section)}
            class:force-hover={isSectionHover(section)}
            onclick={(e) => maybeInterceptLabel(e, section)}
          >
            <CollapsibleSection
              variant="chromeless"
              label={section.title}
              href={sectionHref(section)}
              open={expandedSections[section.path] || false}
              ontoggle={() => toggleSection(section.path)}
            />
          </div>

          {#if expandedSections[section.path]}
            <div class="sn-items">
              {#each section.items as item (item.path)}
                <a
                  href={buildHref(item.path)}
                  class="sn-item"
                  class:selected={item.path === currentPath || item.path === selectedItemKey()}
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
          class:selected={currentPath === footer.path}
        >
          {#if footer.icon}<i class={footer.icon} aria-hidden="true"></i>{/if}
          <span>{footer.title}</span>
        </a>
      {/if}

      {#if actions}{@render actions()}{/if}
    </div>
  {/if}
</aside>

<style lang="scss">
  @use '../styles/padding' as *;

  :global(:root) {
    /* Hover tint: an optional wash over the hovered surface, one stop for the
       whole component. Off by default; the gate holds the tint when enabled. */
    --sidenavigation-hover-tint: var(--tint);
    --sidenavigation-hover-tint-enabled: var(--color-transparent);

    /* Panel — outer chrome + layout. No states. */
    --sidenavigation-panel-surface: var(--surface-canvas-lower);
    --sidenavigation-panel-border: var(--border-canvas-faint);
    --sidenavigation-panel-border-width: var(--border-width-1);
    --sidenavigation-panel-padding: var(--space-16);
    --sidenavigation-panel-section-gap: var(--space-4);
    --sidenavigation-panel-item-padding: var(--space-32);
    --sidenavigation-panel-footer-gap: var(--space-16);
    --sidenavigation-panel-open-width: calc(var(--space-64) * 4);
    --sidenavigation-panel-closed-width: calc(var(--space-64) * 0.75);
    --sidenavigation-open-duration: var(--duration-200);
    --sidenavigation-open-easing: var(--ease-out-quart);
    --sidenavigation-close-duration: var(--duration-150);
    --sidenavigation-close-easing: var(--ease-out-quart);

    /* Title — layout (stateless). The header is a flex container that hosts
       the label box and the toggle box side-by-side; gap and radius drive
       the card-like outer shell. */
    --sidenavigation-title-gap: var(--space-8);
    --sidenavigation-title-radius: var(--radius-md);

    /* Title label — structural inner box (stateless). Renders as a row inside
       the title bar so the header reads as: outer card → [label box] [toggle
       box]. align-items: stretch on the header equalises its height with the
       toggle's. */
    --sidenavigation-title-label-surface: var(--color-transparent);
    --sidenavigation-title-label-border: var(--border-canvas-faint);
    --sidenavigation-title-label-border-width: var(--border-width-1);
    --sidenavigation-title-label-radius: var(--radius-md);
    --sidenavigation-title-label-padding: var(--space-6);

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
    --sidenavigation-title-default-label-font-weight: var(--font-weight-bold);
    --sidenavigation-title-default-label-line-height: var(--line-height-tighter);

    /* Title — hover */
    --sidenavigation-title-hover-surface: var(--color-transparent);
    --sidenavigation-title-hover-border: var(--border-canvas-faint);
    --sidenavigation-title-hover-border-width: var(--border-width-1);
    --sidenavigation-title-hover-padding: var(--space-12);
    --sidenavigation-title-hover-indicator: var(--color-transparent);
    --sidenavigation-title-hover-indicator-width: var(--border-width-3);
    --sidenavigation-title-hover-label: var(--text-primary);
    --sidenavigation-title-hover-label-font-family: var(--font-display);
    --sidenavigation-title-hover-label-font-size: var(--font-size-2xl);
    --sidenavigation-title-hover-label-font-weight: var(--font-weight-bold);
    --sidenavigation-title-hover-label-line-height: var(--line-height-tighter);

    /* Title — selected */
    --sidenavigation-title-selected-surface: var(--surface-canvas-low);
    --sidenavigation-title-selected-border: var(--border-canvas-faint);
    --sidenavigation-title-selected-border-width: var(--border-width-1);
    --sidenavigation-title-selected-padding: var(--space-12);
    --sidenavigation-title-selected-indicator: var(--border-brand-medium);
    --sidenavigation-title-selected-indicator-width: var(--border-width-3);
    --sidenavigation-title-selected-label: var(--text-primary);
    --sidenavigation-title-selected-label-font-family: var(--font-display);
    --sidenavigation-title-selected-label-font-size: var(--font-size-2xl);
    --sidenavigation-title-selected-label-font-weight: var(--font-weight-bold);
    --sidenavigation-title-selected-label-line-height: var(--line-height-tighter);

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

    /* Section header — default. The wrapper paints surface + indicator; the
       text tokens below are forwarded into the inner CollapsibleSection
       (chromeless variant) by shadowing its slots in `.sn-section-header`,
       so section typography can be edited per-state without touching the
       generic chromeless variant used elsewhere. */
    --sidenavigation-section-default-surface: var(--color-transparent);
    --sidenavigation-section-default-indicator: var(--color-transparent);
    --sidenavigation-section-default-indicator-width: var(--border-width-3);
    --sidenavigation-section-default-text: var(--text-primary);
    --sidenavigation-section-default-text-font-family: var(--font-sans);
    --sidenavigation-section-default-text-font-size: var(--font-size-lg);
    --sidenavigation-section-default-text-font-weight: var(--font-weight-medium);
    --sidenavigation-section-default-text-line-height: var(--line-height-normal);

    /* Section header — hover */
    --sidenavigation-section-hover-surface: var(--surface-canvas);
    --sidenavigation-section-hover-indicator: var(--color-transparent);
    --sidenavigation-section-hover-indicator-width: var(--border-width-3);
    --sidenavigation-section-hover-text: var(--text-primary);
    --sidenavigation-section-hover-text-font-family: var(--font-sans);
    --sidenavigation-section-hover-text-font-size: var(--font-size-lg);
    --sidenavigation-section-hover-text-font-weight: var(--font-weight-medium);
    --sidenavigation-section-hover-text-line-height: var(--line-height-normal);

    /* Section header — selected (this section's page is the current route) */
    --sidenavigation-section-selected-surface: var(--surface-canvas-low);
    --sidenavigation-section-selected-indicator: var(--border-brand-medium);
    --sidenavigation-section-selected-indicator-width: var(--border-width-3);
    --sidenavigation-section-selected-text: var(--text-primary);
    --sidenavigation-section-selected-text-font-family: var(--font-sans);
    --sidenavigation-section-selected-text-font-size: var(--font-size-lg);
    --sidenavigation-section-selected-text-font-weight: var(--font-weight-medium);
    --sidenavigation-section-selected-text-line-height: var(--line-height-normal);

    /* Item — default */
    --sidenavigation-item-default-surface: var(--color-transparent);
    --sidenavigation-item-default-padding: var(--space-6);
    --sidenavigation-item-default-indicator: var(--color-transparent);
    --sidenavigation-item-default-indicator-width: var(--border-width-3);
    --sidenavigation-item-default-text: var(--text-tertiary);
    --sidenavigation-item-default-text-font-family: var(--font-sans);
    --sidenavigation-item-default-text-font-size: var(--font-size-md);
    --sidenavigation-item-default-text-font-weight: var(--font-weight-semibold);
    --sidenavigation-item-default-text-line-height: var(--line-height-normal);

    /* Item — hover */
    --sidenavigation-item-hover-surface: var(--surface-canvas);
    --sidenavigation-item-hover-padding: var(--space-6);
    --sidenavigation-item-hover-indicator: var(--color-transparent);
    --sidenavigation-item-hover-indicator-width: var(--border-width-3);
    --sidenavigation-item-hover-text: var(--text-secondary);
    --sidenavigation-item-hover-text-font-family: var(--font-sans);
    --sidenavigation-item-hover-text-font-size: var(--font-size-md);
    --sidenavigation-item-hover-text-font-weight: var(--font-weight-light);
    --sidenavigation-item-hover-text-line-height: var(--line-height-normal);

    /* Item — selected */
    --sidenavigation-item-selected-surface: var(--surface-canvas-low);
    --sidenavigation-item-selected-padding: var(--space-6);
    --sidenavigation-item-selected-indicator: var(--border-brand-medium);
    --sidenavigation-item-selected-indicator-width: var(--border-width-3);
    --sidenavigation-item-selected-text: var(--text-primary);
    --sidenavigation-item-selected-text-font-family: var(--font-sans);
    --sidenavigation-item-selected-text-font-size: var(--font-size-md);
    --sidenavigation-item-selected-text-font-weight: var(--font-weight-normal);
    --sidenavigation-item-selected-text-line-height: var(--line-height-normal);

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
    --sidenavigation-footer-default-text-line-height: var(--line-height-normal);

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
    --sidenavigation-footer-hover-text-line-height: var(--line-height-normal);

    /* Footer — selected */
    --sidenavigation-footer-selected-surface: var(--surface-canvas-low);
    --sidenavigation-footer-selected-padding: var(--space-8);
    --sidenavigation-footer-selected-gap: var(--space-8);
    --sidenavigation-footer-selected-indicator: var(--border-brand-medium);
    --sidenavigation-footer-selected-indicator-width: var(--border-width-3);
    --sidenavigation-footer-selected-icon: var(--text-primary);
    --sidenavigation-footer-selected-icon-size: var(--icon-size-xs);
    --sidenavigation-footer-selected-text: var(--text-primary);
    --sidenavigation-footer-selected-text-font-family: var(--font-sans);
    --sidenavigation-footer-selected-text-font-size: var(--font-size-sm);
    --sidenavigation-footer-selected-text-font-weight: var(--font-weight-normal);
    --sidenavigation-footer-selected-text-line-height: var(--line-height-normal);
  }

  .sidenavigation {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--sidenavigation-panel-surface);
    border-right: var(--sidenavigation-panel-border-width) solid var(--sidenavigation-panel-border);
    @include themed-padding(--sidenavigation-panel-padding, $h: 0);
    scrollbar-width: thin;
    width: var(--sidenavigation-panel-open-width);
    /* Opening uses the open-* timing tokens; the .collapsed rule below
       overrides with the close-* tokens for the reverse direction. */
    transition: width var(--sidenavigation-open-duration) var(--sidenavigation-open-easing);
  }
  .sidenavigation.collapsed {
    width: var(--sidenavigation-panel-closed-width);
    transition: width var(--sidenavigation-close-duration) var(--sidenavigation-close-easing);
  }

  /* The .sidenavigation needs to be the positioning context for the
     absolutely-anchored toggle. Set on the outer aside so the toggle's
     `left` calc is relative to the rail's left edge. */
  .sidenavigation {
    position: relative;
  }

  /* Per-state token rebinds — layout-affecting properties are written exactly
     once on the element, then state rules rebind only the `--_*` values they
     need. Matches the TabBar pattern: paint-only repaint, no reshape. */
  .sn-title {
    --_surface: var(--sidenavigation-title-default-surface);
    --_border: var(--sidenavigation-title-default-border);
    --_border-width: var(--sidenavigation-title-default-border-width);
    --_indicator: var(--sidenavigation-title-default-indicator);
    --_indicator-width: var(--sidenavigation-title-default-indicator-width);
    --_padding: var(--sidenavigation-title-default-padding);
    --_label: var(--sidenavigation-title-default-label);
    --_label-family: var(--sidenavigation-title-default-label-font-family);
    --_label-size: var(--sidenavigation-title-default-label-font-size);
    --_label-weight: var(--sidenavigation-title-default-label-font-weight);
    --_label-line-height: var(--sidenavigation-title-default-label-line-height);

    /* The header is a pure flex row: card-like outer with the label box and
       toggle box as siblings. No absolute positioning — the label fills with
       flex:1, the toggle is a fixed-size sibling. justify-content: center
       takes over when the label is removed in the collapsed state and the
       toggle becomes the only child. */
    flex: 0 0 auto;
    box-sizing: border-box;
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: var(--sidenavigation-title-gap);
    background: var(--_surface);
    border: var(--_border-width) solid var(--_border);
    border-left: var(--_indicator-width) solid var(--_indicator);
    border-radius: var(--sidenavigation-title-radius);
    @include themed-padding(--_padding);
    transition: background var(--duration-150);
  }

  .sn-title:hover:not(.selected),
  .sidenavigation.force-title-hover .sn-title:not(.selected) {
    background-image: linear-gradient(var(--sidenavigation-hover-tint-enabled), var(--sidenavigation-hover-tint-enabled));
    --_surface: var(--sidenavigation-title-hover-surface);
    --_border: var(--sidenavigation-title-hover-border);
    --_border-width: var(--sidenavigation-title-hover-border-width);
    --_indicator: var(--sidenavigation-title-hover-indicator);
    --_indicator-width: var(--sidenavigation-title-hover-indicator-width);
    --_padding: var(--sidenavigation-title-hover-padding);
    --_label: var(--sidenavigation-title-hover-label);
    --_label-family: var(--sidenavigation-title-hover-label-font-family);
    --_label-size: var(--sidenavigation-title-hover-label-font-size);
    --_label-weight: var(--sidenavigation-title-hover-label-font-weight);
    --_label-line-height: var(--sidenavigation-title-hover-label-line-height);
  }

  .sn-title.selected {
    --_surface: var(--sidenavigation-title-selected-surface);
    --_border: var(--sidenavigation-title-selected-border);
    --_border-width: var(--sidenavigation-title-selected-border-width);
    --_indicator: var(--sidenavigation-title-selected-indicator);
    --_indicator-width: var(--sidenavigation-title-selected-indicator-width);
    --_padding: var(--sidenavigation-title-selected-padding);
    --_label: var(--sidenavigation-title-selected-label);
    --_label-family: var(--sidenavigation-title-selected-label-font-family);
    --_label-size: var(--sidenavigation-title-selected-label-font-size);
    --_label-weight: var(--sidenavigation-title-selected-label-font-weight);
    --_label-line-height: var(--sidenavigation-title-selected-label-line-height);
  }

  /* In the collapsed state the header narrows with the rail. Drop horizontal
     padding so the toggle (single remaining flex child) still fits in the
     closed-width aside — open-state padding alone would push it out. */
  .sidenavigation.collapsed .sn-title {
    padding-left: 0;
    padding-right: 0;
  }

  .sn-title-label {
    background: var(--sidenavigation-title-label-surface);
    border: var(--sidenavigation-title-label-border-width) solid var(--sidenavigation-title-label-border);
    border-radius: var(--sidenavigation-title-label-radius);
    @include themed-padding(--sidenavigation-title-label-padding);
    color: var(--_label);
    font-family: var(--_label-family);
    font-size: var(--_label-size);
    font-weight: var(--_label-weight);
    line-height: var(--_label-line-height);
    text-decoration: none;
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
  }

  .sn-toggle {
    --_surface: var(--sidenavigation-toggle-default-surface);
    --_border: var(--sidenavigation-toggle-default-border);
    --_border-width: var(--sidenavigation-toggle-default-border-width);
    --_radius: var(--sidenavigation-toggle-default-radius);
    --_padding: var(--sidenavigation-toggle-default-padding);
    --_icon: var(--sidenavigation-toggle-default-icon);
    --_icon-size: var(--sidenavigation-toggle-default-icon-size);

    /* Regular flex child of .sn-title — no absolute positioning. The header
       row's justify-content+flex:1-on-label combo puts the toggle at the
       right edge when the label is present and centres it when the label
       is removed in the collapsed state. */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    box-sizing: border-box;
    background: var(--_surface);
    border: var(--_border-width) solid var(--_border);
    border-radius: var(--_radius);
    color: var(--_icon);
    @include themed-padding(--_padding);
    cursor: pointer;
    transition:
      background var(--duration-150),
      border-color var(--duration-150),
      color var(--duration-150);
  }

  .sn-toggle i {
    font-size: var(--_icon-size);
    line-height: 1;
    /* Icon points right by default (expand). Open state flips it to point
       left (collapse). Rotation tweens with the rail's width transition so
       the affordance morphs smoothly between the two states. */
    transition: transform var(--sidenavigation-open-duration) var(--sidenavigation-open-easing);
  }
  .sidenavigation:not(.collapsed) .sn-toggle i {
    transform: rotate(180deg);
  }
  .sidenavigation.collapsed .sn-toggle i {
    transition: transform var(--sidenavigation-close-duration) var(--sidenavigation-close-easing);
  }

  .sn-toggle:hover,
  .sidenavigation.force-toggle-hover .sn-toggle {
    background-image: linear-gradient(var(--sidenavigation-hover-tint-enabled), var(--sidenavigation-hover-tint-enabled));
    --_surface: var(--sidenavigation-toggle-hover-surface);
    --_border: var(--sidenavigation-toggle-hover-border);
    --_border-width: var(--sidenavigation-toggle-hover-border-width);
    --_radius: var(--sidenavigation-toggle-hover-radius);
    --_padding: var(--sidenavigation-toggle-hover-padding);
    --_icon: var(--sidenavigation-toggle-hover-icon);
    --_icon-size: var(--sidenavigation-toggle-hover-icon-size);
  }

  /* Menu wraps everything below the title header. Scroll lives here so the
     title (with its toggle) stays pinned while a tall menu list scrolls.
     Locked to the open-width (matching .sn-title) so the menu's intrinsic
     layout doesn't shift as the rail expands on open — items can't wrap
     and re-flow if their container width never changes. The rail's
     `overflow: hidden` clips them on the right until the rail catches up. */
  .sn-menu {
    flex: 1 1 auto;
    box-sizing: border-box;
    width: var(--sidenavigation-panel-open-width);
    overflow-y: auto;
    overflow-x: hidden;
  }

  .sn-section {
    margin-top: var(--sidenavigation-panel-section-gap);
  }

  /* Section header wrapper. Paints background + left indicator around the
     CollapsibleSection so a section that's also a route can show a selected
     state matching the panel's item/footer treatment. Section text tokens
     are forwarded into the inner CollapsibleSection by shadowing its
     chromeless slots — section typography can then be edited per-state
     without touching the generic chromeless variant. */
  .sn-section-header {
    --_surface: var(--sidenavigation-section-default-surface);
    --_indicator: var(--sidenavigation-section-default-indicator);
    --_indicator-width: var(--sidenavigation-section-default-indicator-width);

    --collapsiblesection-chromeless-default-label: var(--sidenavigation-section-default-text);
    --collapsiblesection-chromeless-default-label-font-family: var(--sidenavigation-section-default-text-font-family);
    --collapsiblesection-chromeless-default-label-font-size: var(--sidenavigation-section-default-text-font-size);
    --collapsiblesection-chromeless-default-label-font-weight: var(--sidenavigation-section-default-text-font-weight);
    --collapsiblesection-chromeless-default-label-line-height: var(--sidenavigation-section-default-text-line-height);
    --collapsiblesection-chromeless-hover-label: var(--sidenavigation-section-hover-text);
    --collapsiblesection-chromeless-hover-label-font-family: var(--sidenavigation-section-hover-text-font-family);
    --collapsiblesection-chromeless-hover-label-font-size: var(--sidenavigation-section-hover-text-font-size);
    --collapsiblesection-chromeless-hover-label-font-weight: var(--sidenavigation-section-hover-text-font-weight);
    --collapsiblesection-chromeless-hover-label-line-height: var(--sidenavigation-section-hover-text-line-height);

    background: var(--_surface);
    border-left: var(--_indicator-width) solid var(--_indicator);
    transition: background var(--duration-150), border-color var(--duration-150);
  }
  .sn-section-header:hover:not(.selected),
  .sn-section-header.force-hover:not(.selected) {
    background-image: linear-gradient(var(--sidenavigation-hover-tint-enabled), var(--sidenavigation-hover-tint-enabled));
    --_surface: var(--sidenavigation-section-hover-surface);
    --_indicator: var(--sidenavigation-section-hover-indicator);
    --_indicator-width: var(--sidenavigation-section-hover-indicator-width);
    --collapsiblesection-chromeless-default-label: var(--sidenavigation-section-hover-text);
    --collapsiblesection-chromeless-default-label-font-family: var(--sidenavigation-section-hover-text-font-family);
    --collapsiblesection-chromeless-default-label-font-size: var(--sidenavigation-section-hover-text-font-size);
    --collapsiblesection-chromeless-default-label-font-weight: var(--sidenavigation-section-hover-text-font-weight);
    --collapsiblesection-chromeless-default-label-line-height: var(--sidenavigation-section-hover-text-line-height);
  }
  .sn-section-header.selected {
    --_surface: var(--sidenavigation-section-selected-surface);
    --_indicator: var(--sidenavigation-section-selected-indicator);
    --_indicator-width: var(--sidenavigation-section-selected-indicator-width);

    /* Inner CollapsibleSection has no selected state — shadow both the
       default-slot and hover-slot with the selected text values so the section
       header keeps painting selected typography whether or not it's hovered. */
    --collapsiblesection-chromeless-default-label: var(--sidenavigation-section-selected-text);
    --collapsiblesection-chromeless-default-label-font-family: var(--sidenavigation-section-selected-text-font-family);
    --collapsiblesection-chromeless-default-label-font-size: var(--sidenavigation-section-selected-text-font-size);
    --collapsiblesection-chromeless-default-label-font-weight: var(--sidenavigation-section-selected-text-font-weight);
    --collapsiblesection-chromeless-default-label-line-height: var(--sidenavigation-section-selected-text-line-height);
    --collapsiblesection-chromeless-hover-label: var(--sidenavigation-section-selected-text);
    --collapsiblesection-chromeless-hover-label-font-family: var(--sidenavigation-section-selected-text-font-family);
    --collapsiblesection-chromeless-hover-label-font-size: var(--sidenavigation-section-selected-text-font-size);
    --collapsiblesection-chromeless-hover-label-font-weight: var(--sidenavigation-section-selected-text-font-weight);
    --collapsiblesection-chromeless-hover-label-line-height: var(--sidenavigation-section-selected-text-line-height);
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
    padding-left: var(--sidenavigation-panel-item-padding);
    color: var(--_text);
    font-family: var(--_text-family);
    font-size: var(--_text-size);
    font-weight: var(--_text-weight);
    line-height: var(--_text-line-height);
    text-decoration: none;
    transition: background var(--duration-150), color var(--duration-150);
  }

  .sn-item:hover:not(.selected),
  .sn-item.force-hover:not(.selected) {
    background-image: linear-gradient(var(--sidenavigation-hover-tint-enabled), var(--sidenavigation-hover-tint-enabled));
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

  .sn-item.selected {
    --_surface: var(--sidenavigation-item-selected-surface);
    --_padding: var(--sidenavigation-item-selected-padding);
    --_indicator: var(--sidenavigation-item-selected-indicator);
    --_indicator-width: var(--sidenavigation-item-selected-indicator-width);
    --_text: var(--sidenavigation-item-selected-text);
    --_text-family: var(--sidenavigation-item-selected-text-font-family);
    --_text-size: var(--sidenavigation-item-selected-text-font-size);
    --_text-weight: var(--sidenavigation-item-selected-text-font-weight);
    --_text-line-height: var(--sidenavigation-item-selected-text-line-height);
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

  .sn-footer:hover:not(.selected),
  .sidenavigation.force-footer-hover .sn-footer:not(.selected) {
    background-image: linear-gradient(var(--sidenavigation-hover-tint-enabled), var(--sidenavigation-hover-tint-enabled));
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

  .sn-footer.selected,
  .sidenavigation.force-footer-selected .sn-footer {
    --_surface: var(--sidenavigation-footer-selected-surface);
    --_padding: var(--sidenavigation-footer-selected-padding);
    --_gap: var(--sidenavigation-footer-selected-gap);
    --_indicator: var(--sidenavigation-footer-selected-indicator);
    --_indicator-width: var(--sidenavigation-footer-selected-indicator-width);
    --_icon: var(--sidenavigation-footer-selected-icon);
    --_icon-size: var(--sidenavigation-footer-selected-icon-size);
    --_text: var(--sidenavigation-footer-selected-text);
    --_text-family: var(--sidenavigation-footer-selected-text-font-family);
    --_text-size: var(--sidenavigation-footer-selected-text-font-size);
    --_text-weight: var(--sidenavigation-footer-selected-text-font-weight);
    --_text-line-height: var(--sidenavigation-footer-selected-text-line-height);
  }
</style>
