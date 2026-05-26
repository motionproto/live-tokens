<script lang="ts">
  import offeringUrl from '../../system/assets/offering.webp';
</script>

<section class="offering">
  <img src={offeringUrl} alt="" />
</section>

<style>
  .offering {
    grid-column: 2 / span 10;
  }

  .offering img {
    display: block;
    width: 100%;
    height: auto;
  }

  @media (max-width: 960px) {
    .offering {
      grid-column: 1 / -1;
    }
  }
</style>
