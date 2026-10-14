<script lang="ts">
  import SourceLinks from '../SourceLinks.svelte';
</script>

<footer class="provenance">
  <div class="colophon">
    <p class="license">
      Open source under the
      <a href="https://github.com/motionproto/live-tokens/blob/main/LICENSE" target="_blank" rel="noopener">MIT License</a>.
    </p>
    <p class="copyright">© 2026 Mark Pearce</p>
  </div>

  <SourceLinks />
</footer>

<style>
  .provenance {
    grid-column: var(--kit-content);
    padding-top: var(--space-24);
    border-top: var(--border-width-2) solid var(--border-neutral);
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
    font-size: var(--body-lg-font-size);
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
    font-size: var(--body-md-font-size);
    color: var(--text-secondary);
  }

  @media (max-width: 1200px) {
    .provenance {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-24);
    }
  }
</style>
