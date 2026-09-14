<script module lang="ts">
  import type { CatalogueEntry } from '../../editor/component-editor/scaffolding/types';

  export const catalogue = {
    description: 'A section the reader opens and closes.',
    useFor: 'secondary content that most readers skip.',
    notFor: 'content every reader needs (Card); moving between pages (SideNavigation).',
    props: {
      variant: '`heading` uses a borderless H3 heading, `chromeless` sits inside other content, `hairline` draws a line under the header, `container` frames the whole section.',
    },
  } satisfies CatalogueEntry;
</script>

<script lang="ts">
   import { createEventDispatcher } from 'svelte';

   interface Props {
      label: string;
      open?: boolean;
      href?: string | undefined;
      variant?: 'chromeless' | 'heading' | 'hairline' | 'container';
      /** false → the section stops pinning body typography so the consumer fully owns slotted content's styling. */
      prose?: boolean;
      class?: string;
      /** Toggle callback. Preferred over `on:toggle` from 0.5.0 onward. */
      ontoggle?: () => void;
      summary?: import('svelte').Snippet;
      children?: import('svelte').Snippet;
   }

   let {
      label,
      open = false,
      href = undefined,
      variant = 'container',
      prose = true,
      class: className = '',
      ontoggle,
      summary,
      children
   }: Props = $props();

   // Dual-fire bridge — see Button.svelte for the deprecation timeline.
   const dispatch = createEventDispatcher<{
      toggle: void;
   }>();

   function fireToggle() {
      ontoggle?.();
      dispatch('toggle');
   }
</script>

<section class="es-root variant-{variant} {className}">
   {#if href}
      <!-- Linked header: the chevron is a standalone toggle button so the
           section can still be collapsed even when the label is a link. Both
           live inside the same `.section-header` flex row so paint (hover,
           background, indicator) continues to land on the row as a whole. -->
      <div class="section-header section-header--linked" class:open>
         <button
            type="button"
            class="section-toggle-button"
            onclick={fireToggle}
            aria-label={open ? 'Collapse section' : 'Expand section'}
            aria-expanded={open}
         >
            <i class="fas fa-chevron-right toggle-icon"></i>
         </button>
         <a {href} class="section-link">
            <svelte:element this={variant === 'heading' ? 'h3' : 'span'} class="section-label">{label}</svelte:element>
         </a>
         {@render summary?.()}
      </div>
   {:else}
      <div class="section-header section-header--toggle" class:open>
         <div class="section-toggle">
            <button
               type="button"
               class="section-toggle-button"
               onclick={fireToggle}
               aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
               aria-expanded={open}
            >
               <i class="fas fa-chevron-right toggle-icon"></i>
            </button>
            <svelte:element this={variant === 'heading' ? 'h3' : 'span'} class="section-label">{label}</svelte:element>
         </div>
         {#if summary}
            <div class="section-summary">{@render summary()}</div>
         {/if}
      </div>
   {/if}
   {#if open && children}
      <div class="section-content" class:prose>
         {@render children?.()}
      </div>
   {/if}
</section>

<style lang="scss">
   @use '../styles/padding' as *;
   @use '../styles/slot-prose' as *;

   :global(:root) {
      /* Chromeless — default */
      --collapsiblesection-chromeless-default-surface: var(--color-transparent);
      --collapsiblesection-chromeless-default-padding: var(--space-4);
      --collapsiblesection-chromeless-default-label: var(--text-primary);
      --collapsiblesection-chromeless-default-label-font-family: var(--font-sans);
      --collapsiblesection-chromeless-default-label-font-size: var(--font-size-md);
      --collapsiblesection-chromeless-default-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-chromeless-default-label-line-height: var(--line-height-normal);
      --collapsiblesection-chromeless-default-icon: var(--text-primary);
      --collapsiblesection-chromeless-default-icon-size: var(--icon-size-xs);
      /* Chromeless — hover */
      --collapsiblesection-chromeless-hover-surface: var(--color-transparent);
      --collapsiblesection-chromeless-hover-padding: var(--space-4);
      --collapsiblesection-chromeless-hover-label: var(--text-primary);
      --collapsiblesection-chromeless-hover-label-font-family: var(--font-sans);
      --collapsiblesection-chromeless-hover-label-font-size: var(--font-size-md);
      --collapsiblesection-chromeless-hover-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-chromeless-hover-label-line-height: var(--line-height-normal);
      --collapsiblesection-chromeless-hover-icon: var(--text-primary);
      --collapsiblesection-chromeless-hover-icon-size: var(--icon-size-xs);
      /* Chromeless — open */
      --collapsiblesection-chromeless-open-padding: var(--space-4);

      /* Heading — default */
      --collapsiblesection-heading-default-surface: var(--tint-low);
      --collapsiblesection-heading-default-padding: var(--space-8);
      --collapsiblesection-heading-default-label: var(--text-primary);
      --collapsiblesection-heading-default-label-font-family: var(--heading-md-font-family);
      --collapsiblesection-heading-default-label-font-size: var(--heading-md-font-size);
      --collapsiblesection-heading-default-label-font-weight: var(--heading-md-font-weight);
      --collapsiblesection-heading-default-label-line-height: var(--heading-md-line-height);
      --collapsiblesection-heading-default-label-letter-spacing: var(--heading-md-letter-spacing);
      --collapsiblesection-heading-default-icon: var(--text-primary);
      --collapsiblesection-heading-default-icon-size: var(--icon-size-xs);
      /* Heading — hover */
      --collapsiblesection-heading-hover-surface: var(--tint);
      --collapsiblesection-heading-hover-padding: var(--space-8);
      --collapsiblesection-heading-hover-label: var(--text-primary);
      --collapsiblesection-heading-hover-label-font-family: var(--heading-md-font-family);
      --collapsiblesection-heading-hover-label-font-size: var(--heading-md-font-size);
      --collapsiblesection-heading-hover-label-font-weight: var(--heading-md-font-weight);
      --collapsiblesection-heading-hover-label-line-height: var(--heading-md-line-height);
      --collapsiblesection-heading-hover-label-letter-spacing: var(--heading-md-letter-spacing);
      --collapsiblesection-heading-hover-icon: var(--text-primary);
      --collapsiblesection-heading-hover-icon-size: var(--icon-size-xs);
      /* Heading — open */
      --collapsiblesection-heading-open-padding: var(--space-4);

      /* Hairline — default */
      --collapsiblesection-hairline-default-surface: var(--color-transparent);
      --collapsiblesection-hairline-default-hairline-color: var(--border-brand);
      --collapsiblesection-hairline-default-hairline-width: var(--border-width-1);
      --collapsiblesection-hairline-default-padding: var(--space-4);
      --collapsiblesection-hairline-default-label: var(--text-primary);
      --collapsiblesection-hairline-default-label-font-family: var(--font-sans);
      --collapsiblesection-hairline-default-label-font-size: var(--font-size-md);
      --collapsiblesection-hairline-default-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-hairline-default-label-line-height: var(--line-height-normal);
      --collapsiblesection-hairline-default-icon: var(--text-primary);
      --collapsiblesection-hairline-default-icon-size: var(--icon-size-xs);
      /* Hairline — hover */
      --collapsiblesection-hairline-hover-surface: var(--color-transparent);
      --collapsiblesection-hairline-hover-hairline-color: var(--border-neutral);
      --collapsiblesection-hairline-hover-hairline-width: var(--border-width-1);
      --collapsiblesection-hairline-hover-padding: var(--space-4);
      --collapsiblesection-hairline-hover-label: var(--text-primary);
      --collapsiblesection-hairline-hover-label-font-family: var(--font-sans);
      --collapsiblesection-hairline-hover-label-font-size: var(--font-size-md);
      --collapsiblesection-hairline-hover-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-hairline-hover-label-line-height: var(--line-height-normal);
      --collapsiblesection-hairline-hover-icon: var(--text-primary);
      --collapsiblesection-hairline-hover-icon-size: var(--icon-size-xs);
      /* Hairline — open */
      --collapsiblesection-hairline-open-padding: var(--space-4);

      /* Container — frame (always-on outer chrome) */
      --collapsiblesection-container-frame-border: var(--border-neutral);
      --collapsiblesection-container-frame-border-width: var(--border-width-1);
      --collapsiblesection-container-frame-radius: var(--radius-md);
      /* Container — default header strip */
      --collapsiblesection-container-default-surface: var(--surface-neutral-lowest);
      --collapsiblesection-container-default-padding: var(--space-4);
      --collapsiblesection-container-default-label: var(--text-primary);
      --collapsiblesection-container-default-label-font-family: var(--font-sans);
      --collapsiblesection-container-default-label-font-size: var(--font-size-md);
      --collapsiblesection-container-default-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-container-default-label-line-height: var(--line-height-normal);
      --collapsiblesection-container-default-icon: var(--text-primary);
      --collapsiblesection-container-default-icon-size: var(--icon-size-xs);
      /* Container — hover header strip */
      --collapsiblesection-container-hover-surface: var(--surface-neutral-low);
      --collapsiblesection-container-hover-padding: var(--space-4);
      --collapsiblesection-container-hover-label: var(--text-primary);
      --collapsiblesection-container-hover-label-font-family: var(--font-sans);
      --collapsiblesection-container-hover-label-font-size: var(--font-size-md);
      --collapsiblesection-container-hover-label-font-weight: var(--font-weight-normal);
      --collapsiblesection-container-hover-label-line-height: var(--line-height-normal);
      --collapsiblesection-container-hover-icon: var(--text-primary);
      --collapsiblesection-container-hover-icon-size: var(--icon-size-xs);
      /* Container — open content area */
      --collapsiblesection-container-open-surface: var(--surface-neutral-lower);
      --collapsiblesection-container-open-padding: var(--space-4);
   }

   .es-root {
      display: flex;
      flex-direction: column;
   }

   .section-header {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-12);
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      transition: all var(--duration-150);

      &.open .toggle-icon {
         transform: rotate(90deg);
      }
   }

   .section-toggle {
      display: flex;
      align-items: center;
      gap: var(--space-8);
      flex-shrink: 1;
      min-width: 0;
   }

   /* Linked header: chevron is a sibling button next to the label link, not a
      child of an enveloping <a>. Use the tighter gap that the inner
      `.section-toggle` wrapper provides in the no-href branch, so both
      layouts read the same visually. */
   .section-header.section-header--linked {
      gap: var(--space-8);
   }

   .section-toggle-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: transparent;
      border: none;
      padding: 0;
      margin: 0;
      color: inherit;
      font: inherit;
      cursor: pointer;
   }

   /* Extend the native button over the label and header padding. Linked
      headers keep their separate navigation and toggle targets. */
   .section-header--toggle .section-toggle-button::after {
      content: '';
      position: absolute;
      inset: 0;
   }

   .section-header--toggle .section-toggle-button:focus-visible {
      outline: none;

      &::after {
         outline: var(--border-width-2) solid currentColor;
         outline-offset: calc(var(--border-width-2) * -1);
      }
   }

   /* Optional summary controls remain independent of the header toggle. */
   .section-summary {
      position: relative;
   }

   .section-link {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      color: inherit;
      text-decoration: none;
      flex: 1 1 auto;
   }

   @mixin header-paint($variant, $state) {
      background: var(--collapsiblesection-#{$variant}-#{$state}-surface);
      @if $variant == heading {
         @include themed-padding(--collapsiblesection-#{$variant}-#{$state}-padding);
      } @else {
         @include themed-padding(--collapsiblesection-#{$variant}-#{$state}-padding, $h: 2);
      }

      .section-label {
         margin: 0;
         @if $variant == heading {
            letter-spacing: var(--collapsiblesection-heading-#{$state}-label-letter-spacing);
         }
         color: var(--collapsiblesection-#{$variant}-#{$state}-label);
         font-family: var(--collapsiblesection-#{$variant}-#{$state}-label-font-family);
         font-size: var(--collapsiblesection-#{$variant}-#{$state}-label-font-size);
         font-weight: var(--collapsiblesection-#{$variant}-#{$state}-label-font-weight);
         line-height: var(--collapsiblesection-#{$variant}-#{$state}-label-line-height);
      }

      .toggle-icon {
         color: var(--collapsiblesection-#{$variant}-#{$state}-icon);
         font-size: var(--collapsiblesection-#{$variant}-#{$state}-icon-size);
         transition: transform var(--duration-150);
      }
   }

   @mixin hairline-bottom($state) {
      border-bottom: var(--collapsiblesection-hairline-#{$state}-hairline-width) solid var(--collapsiblesection-hairline-#{$state}-hairline-color);
   }

   .es-root.variant-chromeless {
      > .section-header {
         @include header-paint(chromeless, default);
         &:hover { @include header-paint(chromeless, hover); }
      }
      &.force-hover > .section-header { @include header-paint(chromeless, hover); }
      > .section-content {
         @include themed-padding(--collapsiblesection-chromeless-open-padding, $h: 2);
      }
   }

   .es-root.variant-heading {
      > .section-header {
         @include header-paint(heading, default);
         &:hover { @include header-paint(heading, hover); }
      }
      &.force-hover > .section-header { @include header-paint(heading, hover); }
      > .section-content {
         @include themed-padding(--collapsiblesection-heading-open-padding, $h: 2);
      }
   }

   .es-root.variant-hairline {
      > .section-header {
         @include header-paint(hairline, default);
         @include hairline-bottom(default);
         &:hover {
            @include header-paint(hairline, hover);
            @include hairline-bottom(hover);
         }
      }
      &.force-hover > .section-header {
         @include header-paint(hairline, hover);
         @include hairline-bottom(hover);
      }
      > .section-content {
         @include themed-padding(--collapsiblesection-hairline-open-padding, $h: 2);
      }
   }

   .es-root.variant-container {
      border: var(--collapsiblesection-container-frame-border-width) solid var(--collapsiblesection-container-frame-border);
      border-radius: var(--collapsiblesection-container-frame-radius);
      overflow: hidden;

      > .section-header {
         @include header-paint(container, default);
         &:hover { @include header-paint(container, hover); }
      }
      &.force-hover > .section-header { @include header-paint(container, hover); }
      > .section-content {
         background: var(--collapsiblesection-container-open-surface);
         @include themed-padding(--collapsiblesection-container-open-padding, $h: 2);
      }
   }

   .section-content {
      color: var(--text-secondary);
      font-size: var(--font-size-md);
      line-height: var(--line-height-normal);

      @include slot-prose;
   }
</style>
