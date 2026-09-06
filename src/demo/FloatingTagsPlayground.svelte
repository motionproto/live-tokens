<script lang="ts">
  import FloatingTokenTags from './FloatingTokenTags.svelte';
  import Badge from '../system/components/Badge.svelte';
</script>

<main class="playground">
  <header class="meta">
    <div class="meta-eyebrow">
      <Badge variant="neutral" icon="fas fa-flask">Iteration sandbox</Badge>
    </div>
    <h1>FloatingTokenTags</h1>
    <p>
      Edit <code>src/components/FloatingTokenTags.svelte</code> and the canvas below
      hot-reloads. Stable URL: <code>/playground/floating-tags</code>.
    </p>
  </header>

  <section class="canvas-grid">
    <article class="frame">
      <div class="frame-stage">
        <FloatingTokenTags />
      </div>
    </article>
  </section>
</main>

<style>
  .playground {
    max-width: var(--columns-max-width);
    margin: 0 auto;
    padding: var(--space-48) var(--space-32);
    display: flex;
    flex-direction: column;
    gap: var(--space-48);
    min-height: 100vh;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .meta-eyebrow {
    margin-bottom: var(--space-4);
  }

  .meta h1 {
    font-family: var(--heading-xl-font-family);
    font-size: var(--heading-xl-font-size);
    font-weight: var(--heading-xl-font-weight);
    line-height: var(--heading-xl-line-height);
    letter-spacing: var(--heading-xl-letter-spacing);
    color: var(--text-primary);
    margin: 0;
  }

  .meta p {
    font-family: var(--editorial-md-font-family);
    font-size: var(--editorial-md-font-size);
    font-weight: var(--editorial-md-font-weight);
    line-height: var(--editorial-md-line-height);
    letter-spacing: var(--editorial-md-letter-spacing);
    font-style: italic;
    color: var(--text-secondary);
    margin: 0;
    max-width: 44rem;
  }

  .meta :global(code) {
    font-family: var(--code-font-family);
    font-size: var(--code-font-size);
    font-weight: var(--code-font-weight);
    line-height: var(--code-line-height);
    letter-spacing: var(--code-letter-spacing);
    color: var(--text-primary);
    background: var(--tint-low);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
    font-style: normal;
  }

  .canvas-grid {
    display: block;
  }

  .frame {
    background: var(--surface-canvas-lower);
    border: var(--border-width-1) solid var(--border-canvas-subtle);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-md);
    /* No overflow clipping — the dropdown from a bottom-positioned tag must
       be free to extend past the frame edge. The stage carries the matching
       border-radius below so its background still reads as rounded. */
  }

  .frame-stage {
    position: relative;
    height: 32rem;
    background:
      radial-gradient(80% 60% at 50% 50%, var(--surface-canvas) 0%, var(--surface-canvas-lower) 80%);
    border-radius: var(--radius-2xl);
  }

  @media (max-width: 600px) {
    .playground {
      padding: var(--space-32) var(--space-16);
      gap: var(--space-32);
    }
  }
</style>
