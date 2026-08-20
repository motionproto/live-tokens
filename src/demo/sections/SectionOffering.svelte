<script lang="ts">
  import offeringUrl from '../../system/assets/offering.webp';
</script>

<section class="offering">
  <img class="offering-image" src={offeringUrl} alt="" />

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
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    position: relative;
    z-index: 1;
  }

  /* Roughly a third of the content width, parked on the left edge so it
     overlaps the left-hand card above without dominating the section. */
  .offering-image {
    grid-column: 2 / 7;
    grid-row: 1;
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius-lg);
    z-index: 1;
  }

  /* Sits in the open space to the right of the image. No glass background.
     align-self centers it on the image, then translateY drops it by half the
     image's upward overlap (the extra -space-64 in Demo.svelte) so it lands in
     the middle of the actual gap between the cards above and Get Started below. */
  .offering-quote {
    grid-column: 7 / -2;
    grid-row: 1;
    align-self: center;
    transform: translateY(calc(var(--space-64) / 2));
    margin: 0;
    /* Align body text to the card text above. The cards split this same span
       in half, so the right card's left edge sits half a gutter right of line 7;
       its body text is then inset by the card's --space-20 padding. Match both,
       and the open quote dangles left into this padding (text-indent on p). */
    padding-left: calc(var(--columns-gutter) / 2 + var(--space-20));
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
    font-size: var(--font-size-3xl);
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
    .offering-image {
      grid-column: 2 / 7;
    }
    .offering-quote {
      grid-column: 7 / -2;
    }
    .offering-quote p {
      font-size: var(--font-size-xl);
    }
  }

  @media (max-width: 600px) {
    .offering-image {
      grid-column: 1 / -1;
      grid-row: 1;
    }
    .offering-quote {
      grid-column: 1 / -1;
      grid-row: 2;
      align-self: auto;
      width: auto;
      margin: var(--space-16) 0 0;
      padding-left: 0;
    }
    .offering-quote p {
      font-size: var(--font-size-4xl);
    }
  }
</style>
