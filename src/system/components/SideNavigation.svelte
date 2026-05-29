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
    forceHoverPart?: 'title' | 'toggle' | 'item' | 'footer' | 'section' | null;
    /** Force-active one part for editor previews. */
    forceActivePart?: 'title' | 'item' | 'footer' | 'section' | null;
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

  // When the editor force-activates the "section" part, pick the first section
  // that's a valid route (hasIndexPage) so the active styling has somewhere
  // to land in the preview.
  let activeSectionKey = $derived(() => {
    if (forceActivePart !== 'section') return null;
    const s = sections.find((sec) => sec.hasIndexPage) ?? sections[0];
    return s?.path ?? null;
  });
  let hoverSectionKey = $derived(() => {
    if (forceHoverPart !== 'section') return null;
    const s = sections.find((sec) => sec.hasIndexPage) ?? sections[0];
    return s?.path ?? null;
  });

  function isSectionActive(section: SideNavSection): boolean {
    if (!section.hasIndexPage) return false;
    if (activeSectionKey() === section.path) return true;
    return currentPath === section.path;
  }
  function isSectionHover(section: SideNavSection): boolean {
    return hoverSectionKey() === section.path;
  }
</script>

<aside
  class="sidenavigation {className}"
  class:collapsed={!open}
  class:force-title-hover={forceHoverPart === 'title'}
  class:force-toggle-hover={forceHoverPart === 'toggle'}
  class:force-footer-hover={forceHoverPart === 'footer'}
  class:force-footer-active={forceActivePart === 'footer'}
>
  <!-- Header is always rendered so the toggle (a child here) survives the
       collapsed state. The label is the only conditional child — when the
       rail is closed, the header reduces to just the toggle, centred via the
       toggle's own `left` calc. Header stays locked to open-width regardless;
       the aside's overflow clips it during the close animation. -->
  <header class="sn-title" class:active={titleActive}>
    {#if open}
      <a href={titleHref} class="sn-title-label">{titleLabel}</a>
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
            class:active={isSectionActive(section)}
            class:force-hover={isSectionHover(section)}
            onclick={(e) => maybeInterceptLabel(e, section)}
          >
            <CollapsibleSection
              variant="chromeless"
              label={section.title}
              href={sectionHref(section)}
              expanded={expandedSections[section.path] || false}
              ontoggle={() => toggleSection(section.path)}
            />
          </div>

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
  {/if}
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
    --sidenavigation-panel-item-padding: var(--space-32);
    --sidenavigation-panel-footer-gap: var(--space-16);
    --sidenavigation-panel-open-width: 16rem;
    --sidenavigation-panel-closed-width: 3rem;
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
    --sidenavigation-title-default-accent: var(--color-transparent);
    --sidenavigation-title-default-accent-width: var(--border-width-3);
    --sidenavigation-title-default-label: var(--text-primary);
    --sidenavigation-title-default-label-font-family: var(--font-display);
    --sidenavigation-title-default-label-font-size: var(--font-size-2xl);
    --sidenavigation-title-default-label-font-weight: var(--font-weight-normal);
    --sidenavigation-title-default-label-line-height: var(--line-height-sm);

    /* Title — hover */
    --sidenavigation-title-hover-surface: var(--color-transparent);
    --sidenavigation-title-hover-border: var(--border-canvas-faint);
    --sidenavigation-title-hover-border-width: var(--border-width-1);
    --sidenavigation-title-hover-padding: var(--space-12);
    --sidenavigation-title-hover-accent: var(--color-transparent);
    --sidenavigation-title-hover-accent-width: var(--border-width-3);
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
    --sidenavigation-title-active-accent: var(--border-brand-medium);
    --sidenavigation-title-active-accent-width: var(--border-width-3);
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

    /* Section header — default. The wrapper paints surface + indicator; the
       text tokens below are forwarded into the inner CollapsibleSection
       (chromeless variant) by shadowing its slots in `.sn-section-header`,
       so section typography can be edited per-state without touching the
       generic chromeless variant used elsewhere. */
    --sidenavigation-section-default-surface: var(--color-transparent);
    --sidenavigation-section-default-accent: var(--color-transparent);
    --sidenavigation-section-default-accent-width: var(--border-width-3);
    --sidenavigation-section-default-text: var(--text-primary);
    --sidenavigation-section-default-text-font-family: var(--font-sans);
    --sidenavigation-section-default-text-font-size: var(--font-size-md);
    --sidenavigation-section-default-text-font-weight: var(--font-weight-normal);
    --sidenavigation-section-default-text-line-height: var(--line-height-md);

    /* Section header — hover */
    --sidenavigation-section-hover-surface: var(--surface-canvas);
    --sidenavigation-section-hover-accent: var(--color-transparent);
    --sidenavigation-section-hover-accent-width: var(--border-width-3);
    --sidenavigation-section-hover-text: var(--text-primary);
    --sidenavigation-section-hover-text-font-family: var(--font-sans);
    --sidenavigation-section-hover-text-font-size: var(--font-size-md);
    --sidenavigation-section-hover-text-font-weight: var(--font-weight-normal);
    --sidenavigation-section-hover-text-line-height: var(--line-height-md);

    /* Section header — active (this section's page is the current route) */
    --sidenavigation-section-active-surface: var(--surface-canvas-low);
    --sidenavigation-section-active-accent: var(--border-brand-medium);
    --sidenavigation-section-active-accent-width: var(--border-width-3);
    --sidenavigation-section-active-text: var(--text-primary);
    --sidenavigation-section-active-text-font-family: var(--font-sans);
    --sidenavigation-section-active-text-font-size: var(--font-size-md);
    --sidenavigation-section-active-text-font-weight: var(--font-weight-normal);
    --sidenavigation-section-active-text-line-height: var(--line-height-md);

    /* Item — default */
    --sidenavigation-item-default-surface: var(--color-transparent);
    --sidenavigation-item-default-padding: var(--space-6);
    --sidenavigation-item-default-accent: var(--color-transparent);
    --sidenavigation-item-default-accent-width: var(--border-width-3);
    --sidenavigation-item-default-text: var(--text-tertiary);
    --sidenavigation-item-default-text-font-family: var(--font-sans);
    --sidenavigation-item-default-text-font-size: var(--font-size-sm);
    --sidenavigation-item-default-text-font-weight: var(--font-weight-light);
    --sidenavigation-item-default-text-line-height: var(--line-height-md);

    /* Item — hover */
    --sidenavigation-item-hover-surface: var(--surface-canvas);
    --sidenavigation-item-hover-padding: var(--space-6);
    --sidenavigation-item-hover-accent: var(--color-transparent);
    --sidenavigation-item-hover-accent-width: var(--border-width-3);
    --sidenavigation-item-hover-text: var(--text-secondary);
    --sidenavigation-item-hover-text-font-family: var(--font-sans);
    --sidenavigation-item-hover-text-font-size: var(--font-size-sm);
    --sidenavigation-item-hover-text-font-weight: var(--font-weight-light);
    --sidenavigation-item-hover-text-line-height: var(--line-height-md);

    /* Item — active */
    --sidenavigation-item-active-surface: var(--surface-canvas-low);
    --sidenavigation-item-active-padding: var(--space-6);
    --sidenavigation-item-active-accent: var(--border-brand-medium);
    --sidenavigation-item-active-accent-width: var(--border-width-3);
    --sidenavigation-item-active-text: var(--text-primary);
    --sidenavigation-item-active-text-font-family: var(--font-sans);
    --sidenavigation-item-active-text-font-size: var(--font-size-sm);
    --sidenavigation-item-active-text-font-weight: var(--font-weight-normal);
    --sidenavigation-item-active-text-line-height: var(--line-height-md);

    /* Footer — default */
    --sidenavigation-footer-default-surface: var(--color-transparent);
    --sidenavigation-footer-default-padding: var(--space-8);
    --sidenavigation-footer-default-gap: var(--space-8);
    --sidenavigation-footer-default-accent: var(--color-transparent);
    --sidenavigation-footer-default-accent-width: var(--border-width-3);
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
    --sidenavigation-footer-hover-accent: var(--color-transparent);
    --sidenavigation-footer-hover-accent-width: var(--border-width-3);
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
    --sidenavigation-footer-active-accent: var(--border-brand-medium);
    --sidenavigation-footer-active-accent-width: var(--border-width-3);
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
    border-radius: var(--sidenavigation-title-radius);
    @include themed-padding(--_padding);
    transition: background var(--duration-150);
  }

  .sn-title:hover:not(.active),
  .sidenavigation.force-title-hover .sn-title:not(.active) {
    --_surface: var(--sidenavigation-title-hover-surface);
    --_border: var(--sidenavigation-title-hover-border);
    --_border-width: var(--sidenavigation-title-hover-border-width);
    --_padding: var(--sidenavigation-title-hover-padding);
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
    --_label: var(--sidenavigation-title-active-label);
    --_label-family: var(--sidenavigation-title-active-label-font-family);
    --_label-size: var(--sidenavigation-title-active-label-font-size);
    --_label-weight: var(--sidenavigation-title-active-label-font-weight);
    --_label-line-height: var(--sidenavigation-title-active-label-line-height);
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
     CollapsibleSection so a section that's also a route can show an active
     state matching the panel's item/footer treatment. Section text tokens
     are forwarded into the inner CollapsibleSection by shadowing its
     chromeless slots — section typography can then be edited per-state
     without touching the generic chromeless variant. */
  .sn-section-header {
    --_surface: var(--sidenavigation-section-default-surface);
    --_indicator: var(--sidenavigation-section-default-accent);
    --_indicator-width: var(--sidenavigation-section-default-accent-width);

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
  .sn-section-header:hover:not(.active),
  .sn-section-header.force-hover:not(.active) {
    --_surface: var(--sidenavigation-section-hover-surface);
    --_indicator: var(--sidenavigation-section-hover-accent);
    --_indicator-width: var(--sidenavigation-section-hover-accent-width);
  }
  .sn-section-header.active {
    --_surface: var(--sidenavigation-section-active-surface);
    --_indicator: var(--sidenavigation-section-active-accent);
    --_indicator-width: var(--sidenavigation-section-active-accent-width);

    /* Inner CollapsibleSection has no "active" state — shadow both the
       default-slot and hover-slot with the active text values so the section
       header keeps painting active typography whether or not it's hovered. */
    --collapsiblesection-chromeless-default-label: var(--sidenavigation-section-active-text);
    --collapsiblesection-chromeless-default-label-font-family: var(--sidenavigation-section-active-text-font-family);
    --collapsiblesection-chromeless-default-label-font-size: var(--sidenavigation-section-active-text-font-size);
    --collapsiblesection-chromeless-default-label-font-weight: var(--sidenavigation-section-active-text-font-weight);
    --collapsiblesection-chromeless-default-label-line-height: var(--sidenavigation-section-active-text-line-height);
    --collapsiblesection-chromeless-hover-label: var(--sidenavigation-section-active-text);
    --collapsiblesection-chromeless-hover-label-font-family: var(--sidenavigation-section-active-text-font-family);
    --collapsiblesection-chromeless-hover-label-font-size: var(--sidenavigation-section-active-text-font-size);
    --collapsiblesection-chromeless-hover-label-font-weight: var(--sidenavigation-section-active-text-font-weight);
    --collapsiblesection-chromeless-hover-label-line-height: var(--sidenavigation-section-active-text-line-height);
  }

  .sn-items {
    display: flex;
    flex-direction: column;
    padding: var(--space-4) 0;
  }

  .sn-item {
    --_surface: var(--sidenavigation-item-default-surface);
    --_padding: var(--sidenavigation-item-default-padding);
    --_indicator: var(--sidenavigation-item-default-accent);
    --_indicator-width: var(--sidenavigation-item-default-accent-width);
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

  .sn-item:hover:not(.active),
  .sn-item.force-hover:not(.active) {
    --_surface: var(--sidenavigation-item-hover-surface);
    --_padding: var(--sidenavigation-item-hover-padding);
    --_indicator: var(--sidenavigation-item-hover-accent);
    --_indicator-width: var(--sidenavigation-item-hover-accent-width);
    --_text: var(--sidenavigation-item-hover-text);
    --_text-family: var(--sidenavigation-item-hover-text-font-family);
    --_text-size: var(--sidenavigation-item-hover-text-font-size);
    --_text-weight: var(--sidenavigation-item-hover-text-font-weight);
    --_text-line-height: var(--sidenavigation-item-hover-text-line-height);
  }

  .sn-item.active {
    --_surface: var(--sidenavigation-item-active-surface);
    --_padding: var(--sidenavigation-item-active-padding);
    --_indicator: var(--sidenavigation-item-active-accent);
    --_indicator-width: var(--sidenavigation-item-active-accent-width);
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
    --_indicator: var(--sidenavigation-footer-default-accent);
    --_indicator-width: var(--sidenavigation-footer-default-accent-width);
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
    --_indicator: var(--sidenavigation-footer-hover-accent);
    --_indicator-width: var(--sidenavigation-footer-hover-accent-width);
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
    --_indicator: var(--sidenavigation-footer-active-accent);
    --_indicator-width: var(--sidenavigation-footer-active-accent-width);
    --_icon: var(--sidenavigation-footer-active-icon);
    --_icon-size: var(--sidenavigation-footer-active-icon-size);
    --_text: var(--sidenavigation-footer-active-text);
    --_text-family: var(--sidenavigation-footer-active-text-font-family);
    --_text-size: var(--sidenavigation-footer-active-text-font-size);
    --_text-weight: var(--sidenavigation-footer-active-text-font-weight);
    --_text-line-height: var(--sidenavigation-footer-active-text-line-height);
  }
</style>
