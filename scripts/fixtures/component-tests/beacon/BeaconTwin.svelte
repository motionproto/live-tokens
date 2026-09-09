<!--
  BeaconTwin.svelte. Deliberately reuses a shipped component's token name
  (Toggle's, not Beacon's own — a name the running dev server's OWN suites
  also exercise, per LIVE_TOKENS_COMPONENT filtering) verbatim in its own
  :global(:root) block, with no editor and no registration. The dev server's
  boot-time default.json generation is purely file-driven (any
  :global(:root) block under the scanned component dirs, registered or not),
  so this alone gives two components' shipped configs a colliding alias name —
  the fixture for the consumer gate's catalogue-wide fan-out defect
  (component-alias.contract.ts's "every shipped component alias fans out..."
  test, which reads every component-configs/*/default.json unfiltered).
-->
<script lang="ts">
</script>

<div class="beacon-twin"></div>

<style>
  :global(:root) {
    --toggle-track-surface: var(--surface-neutral);
  }
</style>
