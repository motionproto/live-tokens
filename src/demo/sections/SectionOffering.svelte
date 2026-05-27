<script lang="ts">
  import offeringUrl from '../../system/assets/offering.webp';
</script>

<section class="offering">
  <div class="offering-frame">
    <img src={offeringUrl} alt="" />

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
  </div>
</section>

<style>
  .offering {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    margin-top: var(--space-32);
  }

  .offering-frame {
    grid-column: 3 / span 8;
    position: relative;
  }

  .offering-frame img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius-lg);
  }

  .offering-quote {
    position: absolute;
    left: var(--space-24);
    right: var(--space-24);
    bottom: var(--space-24);
    margin: 0;
    padding: 1rem 2rem;
    background: color-mix(in srgb, var(--surface-canvas) 62%, transparent);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid color-mix(in srgb, var(--text-primary) 8%, transparent);
    border-radius: var(--radius-md);
    box-shadow: 0 18px 48px -24px color-mix(in srgb, var(--color-canvas-950) 50%, transparent);
  }

  .offering-quote blockquote {
    margin: 0;
  }

  .offering-quote p {
    font-family: var(--font-serif);
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-normal);
    color: var(--text-primary);
    line-height: 1.2;
    margin: 0;
    hyphens: none;
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
    font-size: var(--font-size-3xl);
    font-variation-settings: 'opsz' 144, 'SOFT' 100;
    letter-spacing: 0.01em;
    color: var(--text-primary);
    text-align: right;
    padding-right: 0.4em;
  }

  @media (max-width: 960px) {
    .offering-frame {
      grid-column: 2 / span 10;
    }
    .offering-quote p {
      font-size: var(--font-size-xl);
    }
  }

  @media (max-width: 600px) {
    .offering-frame {
      grid-column: 1 / -1;
    }
    .offering-quote {
      position: static;
      margin-top: calc(var(--space-16) * -1);
      padding: var(--space-16);
    }
    .offering-quote p {
      font-size: var(--font-size-4xl);
    }
  }
</style>
