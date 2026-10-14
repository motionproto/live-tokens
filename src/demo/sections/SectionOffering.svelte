<script lang="ts"></script>

<section class="offering">
  <figure class="offering-quote">
    <blockquote>
      <p>
        <span class="open-quote" aria-hidden="true">&ldquo;</span>I built live
        tokens to help me quickly set up and style single-page apps and microsites.
        I found it useful. I hope you do too.<span class="close-quote" aria-hidden="true">&rdquo;</span>
      </p>
    </blockquote>
    <figcaption>-Mark</figcaption>
  </figure>
</section>

<style>
  .offering {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: subgrid;
  }

  .offering-quote {
    grid-column: var(--kit-narrow);
    justify-self: center;
    max-width: 24em;
    margin: 0;
    font-size: var(--heading-lg-font-size);
  }

  .offering-quote blockquote {
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    border-radius: 0;
    color: inherit;
    font-style: normal;
  }

  .offering-quote p {
    font-family: var(--font-serif);
    font-size: var(--heading-lg-font-size);
    font-weight: var(--font-weight-normal);
    color: var(--text-primary);
    line-height: 1.2;
    margin: 0;
    hyphens: none;
    text-wrap: pretty;
    text-indent: -0.55em;
  }

  .open-quote,
  .close-quote {
    font-family: var(--font-serif);
    color: var(--color-brand-300);
  }

  .open-quote {
    margin-right: 0.2em;
  }

  .close-quote {
    margin-left: 0.05em;
  }

  .offering-quote figcaption {
    margin-top: 0;
    font-family: var(--font-serif);
    font-weight: var(--font-weight-normal);
    font-size: var(--heading-lg-font-size);
    font-variation-settings: 'opsz' 144, 'SOFT' 100;
    letter-spacing: 0.01em;
    color: var(--text-primary);
    text-align: right;
    padding-right: 0.4em;
  }
</style>
