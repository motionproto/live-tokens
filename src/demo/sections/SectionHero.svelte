<script lang="ts">
  import { get } from 'svelte/store';
  import Button from '../../system/components/Button.svelte';
  import FloatingTokenTags from '../../system/components/FloatingTokenTags.svelte';
  import { setEditorView } from '../../editor/core/store/editorViewStore';
  import { overlayOpen } from '../../editor/overlay/overlayState';
  import ThemeSelect from '../../app/ThemeSelect.svelte';
  import SourceLinks from '../SourceLinks.svelte';

  const isDev = import.meta.env.DEV;

  function openOverlay(view: 'tokens' | 'components') {
    setEditorView(view);
    if (!get(overlayOpen)) {
      window.dispatchEvent(new CustomEvent('lt-overlay-toggle'));
    }
  }
</script>

<header class="hero">
  <div class="hero-kite">
    <FloatingTokenTags />
  </div>

  <div class="hero-text">
    <h1 class="hero-title">
      LiveTokens<br />
      <span class="hero-italic">The design system with an editor.</span>
    </h1>

    <p class="hero-tagline">
      Design system authoring for Svelte.<br />
      Edit tokens and components directly in the browser.<br />Ship plain CSS.
    </p>
  </div>

  <div class="hero-actions">
    {#if isDev}
      <ThemeSelect />
      <Button variant="secondary" onclick={() => openOverlay('components')} icon="fas fa-puzzle-piece" iconPosition="left">
        Browse Components
      </Button>
      <Button onclick={() => openOverlay('tokens')} icon="fas fa-sliders" iconPosition="left">
        Open Token Editor
      </Button>
    {:else}
      <Button variant="outline" disabled>Editor &nbsp;·&nbsp; dev only</Button>
    {/if}
  </div>

  <div class="hero-footer">
    <SourceLinks compact />

    <p class="hero-byline">
      by <a href="mailto:hello@motionproto.com">Mark</a> at
      <a href="https://motionproto.com/" target="_blank" rel="noopener">MotionProto</a>
    </p>
  </div>
</header>

<style>
  .hero {
    grid-column: 1 / -1;
    position: relative;
    padding: var(--space-48) 0 var(--space-16);
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
  }

  .hero-text {
    grid-column: 2 / span 5;
    grid-row: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    position: relative;
    padding: var(--space-96) 0 0;
  }

  .hero-kite {
    grid-column: 5 / span 8;
    grid-row: 1;
    height: 32rem;
    margin-top: 1rem;
    position: relative;
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: var(--font-size-7xl);
    font-weight: var(--font-weight-semibold);
    font-variation-settings: 'opsz' 144, 'SOFT' 30;
    color: var(--text-primary);
    line-height: .9;
    margin: 0;
  }

  .hero-italic {
    font-family: var(--heading-xl-font-family);
    font-size: var(--font-size-6xl);
    font-weight: var(--font-weight-normal);
    color: var(--text-brand);
    font-variation-settings: 'opsz' 144, 'SOFT' 100;
    white-space: nowrap;
  }

  .hero-tagline {
    font-family: var(--body-md-font-family);
    font-size: var(--font-size-2xl);
    color: var(--text-primary);
    line-height: 1.2;
    max-width: 48rem;
    margin: var(--space-8) 0 0;
  }

  .hero-actions {
    grid-column: 2 / -2;
    grid-row: 2;
    display: flex;
    /* The theme select carries a label above its trigger; bottom alignment
       keeps every control in the row sitting on one line. */
    align-items: flex-end;
    gap: var(--space-12);
    flex-wrap: wrap;
    margin-top: var(--space-16);
  }

  .hero-actions > :global(.labeled-select) {
    margin-right: var(--space-20);
  }

  .hero-footer {
    grid-column: 2 / span 5;
    grid-row: 3;
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    margin-top: var(--space-40);
  }

  .hero-byline {
    font-family: var(--font-sans);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-normal);
    line-height: var(--line-height-normal);
    color: var(--text-secondary);
    margin: 0;
  }

  .hero-byline a {
    color: var(--text-brand);
    text-decoration: none;
  }

  .hero-byline a:hover {
    text-decoration: underline;
  }

  @media (max-width: 960px) {
    .hero-kite {
      grid-column: 1 / -1;
      grid-row: 1;
      height: 28rem;
    }
    .hero-text {
      grid-column: 1 / -1;
      grid-row: 2;
      padding: 0;
    }
    .hero-actions {
      grid-column: 1 / -1;
      grid-row: 3;
      margin-top: var(--space-12);
    }
    .hero-footer {
      grid-column: 1 / -1;
      grid-row: 4;
    }
  }

  @media (max-width: 600px) {
    .hero-title {
      font-size: var(--font-size-5xl);
    }
  }
</style>
