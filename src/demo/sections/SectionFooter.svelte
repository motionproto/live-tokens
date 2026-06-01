<script lang="ts">
  import npmLogoUrl from '../../system/assets/npm-mark-white.svg';
  import githubLogoUrl from '../../system/assets/github-mark-white.svg';
</script>

<footer class="provenance">
  <div class="colophon">
    <p class="license">
      Open source under the
      <a href="https://github.com/motionproto/live-tokens/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>.
    </p>
    <p class="copyright">© 2026 Mark Pearce</p>
  </div>

  <nav class="provenance-links" aria-label="Project links">
    <a class="brand-link" href="https://www.npmjs.com/package/@motion-proto/live-tokens" target="_blank" rel="noopener">
      <img class="brand-mark brand-mark--npm" src={npmLogoUrl} alt="" />
      <span class="brand-text">
        <span class="brand-caption">Published on</span>
        <span class="brand-name">npm<span class="brand-arrow" aria-hidden="true">↗</span></span>
      </span>
    </a>
    <a class="brand-link" href="https://github.com/motionproto/live-tokens" target="_blank" rel="noopener">
      <img class="brand-mark brand-mark--github" src={githubLogoUrl} alt="" />
      <span class="brand-text">
        <span class="brand-caption">Source on</span>
        <span class="brand-name">GitHub<span class="brand-arrow" aria-hidden="true">↗</span></span>
      </span>
    </a>
  </nav>
</footer>

<style>
  .provenance {
    grid-column: 2 / -2;
    padding-top: var(--space-24);
    border-top: var(--border-width-1) solid var(--border-neutral);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-32);
  }

  .colophon {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .license {
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--font-size-lg);
    color: var(--text-secondary);
  }

  .license a {
    color: var(--text-brand);
    text-decoration: underline;
    text-underline-offset: 0.15em;
    transition: color var(--duration-150, 150ms) ease;
  }

  .license a:hover {
    color: var(--text-primary);
  }

  .copyright {
    margin: 0;
    font-family: var(--font-sans);
    font-size: var(--font-size-md);
    color: var(--text-secondary);
  }

  .provenance-links {
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
    /* Square chips, sized to the caption + name text stack beside them. */
    height: calc(var(--font-size-md) * 1.1 + var(--font-size-2xl) * 1.1 + var(--space-4));
    width: calc(var(--font-size-md) * 1.1 + var(--font-size-2xl) * 1.1 + var(--space-4));
    object-fit: contain;
    display: block;
    opacity: 0.8;
    transition: opacity var(--duration-150, 150ms) ease;
  }

  /* Solid tile reads heavier than the octocat silhouette — soften and trim to match its optical weight. */
  .brand-mark--npm {
    border-radius: var(--radius-2, 4px);
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

  @media (max-width: 960px) {
    .provenance {
      grid-column: 1 / -1;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-24);
    }

    .provenance-links {
      gap: var(--space-24);
    }
  }
</style>
