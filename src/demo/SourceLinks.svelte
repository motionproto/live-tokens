<script lang="ts">
  import npmLogoUrl from '../system/assets/npm-mark-white.svg';
  import githubLogoUrl from '../system/assets/github-mark-white.svg';
  import { contrastTokenForBackground } from '../system/internal/backgroundContrast';

  let { compact = false }: { compact?: boolean } = $props();

  let navEl: HTMLElement | undefined = $state();

  // Same rule as the kite strings in FloatingTokenTags: the marks are painted
  // through a mask in whichever invariant token out-contrasts the page
  // background, so they survive a theme swap or a live token edit.
  $effect(() => {
    if (!navEl) return;
    const el = navEl;
    let frame = 0;
    let lastBackground = '';
    const sync = () => {
      const background = getComputedStyle(el).getPropertyValue('--page-bg').trim();
      if (background !== lastBackground) {
        lastBackground = background;
        el.style.setProperty('--brand-mark-color', `var(${contrastTokenForBackground(background)})`);
      }
      frame = requestAnimationFrame(sync);
    };
    sync();
    return () => cancelAnimationFrame(frame);
  });
</script>

<nav class="source-links" class:compact aria-label="Project links" bind:this={navEl}>
  <a class="brand-link" href="https://www.npmjs.com/package/@motion-proto/live-tokens" target="_blank" rel="noopener">
    <span class="brand-mark brand-mark--npm" style:--brand-mark-image={`url("${npmLogoUrl}")`}></span>
    <span class="brand-text">
      <span class="brand-caption">Published on</span>
      <span class="brand-name">npm<span class="brand-arrow" aria-hidden="true">↗</span></span>
    </span>
  </a>
  <a class="brand-link" href="https://github.com/motionproto/live-tokens" target="_blank" rel="noopener">
    <span class="brand-mark brand-mark--github" style:--brand-mark-image={`url("${githubLogoUrl}")`}></span>
    <span class="brand-text">
      <span class="brand-caption">Source on</span>
      <span class="brand-name">GitHub<span class="brand-arrow" aria-hidden="true">↗</span></span>
    </span>
  </a>
</nav>

<style>
  .source-links {
    display: flex;
    align-items: center;
    gap: var(--space-48);
    flex: none;
  }

  .brand-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-16);
    text-decoration: none;
  }

  .brand-mark {
    /* Square chips, sized to the caption + name text stack beside them.
       The mask URL must stay quoted: Vite inlines these SVGs as data URIs
       holding single quotes, which an unquoted url() rejects — and a dropped
       mask paints the whole chip as a solid block. */
    height: calc(var(--font-size-md) * 1.1 + var(--font-size-2xl) * 1.1 + var(--space-4));
    width: calc(var(--font-size-md) * 1.1 + var(--font-size-2xl) * 1.1 + var(--space-4));
    display: block;
    background-color: var(--brand-mark-color, var(--color-white));
    -webkit-mask: var(--brand-mark-image) center / contain no-repeat;
    mask: var(--brand-mark-image) center / contain no-repeat;
    opacity: 0.8;
    transition: opacity var(--duration-150, 150ms) ease;
  }

  /* Solid tile reads heavier than the octocat silhouette — soften and trim to match its optical weight. */
  .brand-mark--npm {
    border-radius: var(--radius-md);
    transform: scale(0.86);
  }

  .brand-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 2px);
    line-height: 1.05;
  }

  .brand-caption {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    letter-spacing: 0.01em;
    color: var(--text-tertiary);
  }

  .brand-name {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25em;
    font-family: var(--font-sans);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    transition: color var(--duration-150, 150ms) ease;
  }

  .brand-arrow {
    position: relative;
    top: 0.12em;
    font-size: 1em;
    opacity: 1;
    transition: transform var(--duration-150, 150ms) ease;
  }

  .brand-link:hover .brand-mark {
    opacity: 1;
  }

  .brand-link:hover .brand-name {
    color: var(--text-primary);
  }

  .brand-link:hover .brand-arrow {
    transform: translate(0.15em, -0.15em);
  }

  /* Compact — the in-hero copy, scaled down a step on every axis. */
  .source-links.compact {
    gap: var(--space-32);
  }

  .compact .brand-link {
    gap: var(--space-12);
  }

  .compact .brand-mark {
    height: calc(var(--font-size-sm) * 1.1 + var(--font-size-xl) * 1.1 + var(--space-2));
    width: calc(var(--font-size-sm) * 1.1 + var(--font-size-xl) * 1.1 + var(--space-2));
  }

  .compact .brand-caption {
    font-size: var(--font-size-sm);
  }

  .compact .brand-name {
    font-size: var(--font-size-xl);
  }

  @media (max-width: 960px) {
    .source-links:not(.compact) {
      gap: var(--space-24);
    }
  }
</style>
