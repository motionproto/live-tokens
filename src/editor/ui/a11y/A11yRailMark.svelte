<script lang="ts">
  const label = 'Accessibility issues';
</script>

<span class="a11y-rail-mark" role="img" aria-label={label} title={label}></span>

<style>
  /* The "!" is generated content because the contract harness matches a rail
     item by its exact text. It sits under the unsaved dot, right of the icon,
     so both read in the condensed rail. */
  .a11y-rail-mark {
    position: absolute;
    top: 50%;
    left: 36px;
    line-height: 1;
    pointer-events: none;
  }

  .a11y-rail-mark::after {
    content: '!';
    color: var(--ui-highlight);
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-bold);
  }
</style>
