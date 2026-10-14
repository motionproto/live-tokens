<script lang="ts">
  import { get } from 'svelte/store';
  import Button from '../../system/components/Button.svelte';
  import FloatingTokenTags from '../FloatingTokenTags.svelte';
  import { setEditorView } from '../../editor/core/store/editorViewStore';
  import { overlayOpen } from '../../editor/overlay/overlayState';
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
      Edit tokens and components directly in the browser.<br class="desktop-break" /> Ship plain CSS.
    </p>
  </div>

  <div class="hero-actions">
    {#if isDev}
      <div class="hero-controls">
        <Button variant="secondary" onclick={() => openOverlay('components')} icon="fas fa-puzzle-piece" iconPosition="left">
          Browse Components
        </Button>
        <Button onclick={() => openOverlay('tokens')} icon="fas fa-sliders" iconPosition="left">
          Open Token Editor
        </Button>
      </div>
    {:else}
      <div class="hero-controls">
        <Button variant="outline" disabled>Editor &nbsp;·&nbsp; dev only</Button>
      </div>
    {/if}

    <div class="hero-meta">
      <SourceLinks compact />
      <p class="hero-byline">
        by <a href="mailto:hello@motionproto.com">Mark</a> at
        <a href="https://motionproto.com/" target="_blank" rel="noopener">MotionProto</a>
      </p>
    </div>
  </div>
</header>

<style>
  .hero {
    grid-column: 1 / -1;
    position: relative;
    padding: var(--space-48) 0 var(--space-16);
    display: grid;
    grid-template-columns: subgrid;
  }

  /* The title runs across the kite on the full content width; the tagline
     keeps the first five columns. */
  .hero-text {
    grid-column: var(--kit-content);
    grid-row: 1;
    display: grid;
    grid-template-columns: subgrid;
    align-content: start;
    row-gap: var(--space-16);
    position: relative;
    padding: var(--space-96) 0 0;
  }

  .hero-kite {
    grid-column: 5 / span 8;
    grid-row: 1;
    height: 32rem;
    margin-top: var(--space-16);
    position: relative;
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: var(--display-xl-font-size);
    font-weight: var(--font-weight-semibold);
    font-variation-settings: 'opsz' 144, 'SOFT' 30;
    color: var(--text-primary);
    line-height: .9;
    margin: 0;
    grid-column: 1 / -1;
  }

  .hero-italic {
    font-family: var(--heading-xl-font-family);
    font-size: var(--display-lg-font-size);
    font-weight: var(--font-weight-normal);
    color: var(--text-brand);
    font-variation-settings: 'opsz' 144, 'SOFT' 100;
  }

  .hero-tagline {
    font-family: var(--body-md-font-family);
    font-size: var(--body-2xl-font-size);
    color: var(--text-primary);
    line-height: 1.2;
    grid-column: 1 / span 5;
    margin: var(--space-8) 0 0;
    text-wrap: pretty;
  }

  /* One row: the CTAs on the left rail, the credits on the right, sharing a
     top edge so the buttons sit on the brand-mark line. */
  .hero-actions {
    grid-column: var(--kit-content);
    grid-row: 2;
    display: grid;
    grid-template-columns: max-content 1fr;
    align-items: start;
    column-gap: var(--space-32);
    margin-top: var(--space-16);
  }

  /* Two cells of one width. Equal `1fr` tracks floored at `max-content` take
     the wider button's size in an indefinitely-sized parent, so the pair stays
     even as a theme swap changes the label metrics. */
  .hero-controls {
    grid-column: 1;
    display: grid;
    grid-template-columns: repeat(2, minmax(max-content, 1fr));
    column-gap: var(--space-12);
  }

  .hero-meta {
    grid-column: 2;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-16);
    text-align: right;
  }

  .hero-byline {
    font-family: var(--font-sans);
    font-size: var(--body-md-font-size);
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

  @media (max-width: 1200px) {
    /* Stacked, the illustration sits between the title and the tagline, so the
       wrapper steps aside and each takes its own row of the hero grid. */
    .hero-text {
      display: contents;
    }
    .hero-title {
      grid-row: 1;
    }
    .hero-kite {
      grid-column: 1 / -1;
      grid-row: 2;
      height: 28rem;
      margin-top: var(--space-32);
    }
    .hero-tagline {
      grid-column: 1 / -1;
      grid-row: 3;
      margin-top: var(--space-16);
    }
    .desktop-break {
      display: none;
    }
    .hero-actions {
      grid-row: 4;
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--space-16);
      margin-top: var(--space-12);
    }
    .hero-meta {
      grid-column: 1;
      align-items: flex-start;
      text-align: left;
    }
  }

  /* A phone wraps the second line, so the title steps up a size and the two
     lines get a gap to tell them apart. */
  @media (max-width: 600px) {
    .hero-title {
      font-size: var(--display-2xl-font-size);
    }
    .hero-italic {
      display: block;
      margin-top: var(--space-16);
    }
    .hero-controls {
      grid-template-columns: minmax(0, 1fr);
      row-gap: var(--space-12);
    }
  }
</style>
