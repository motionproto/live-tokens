<script module lang="ts">
  import type { CatalogueEntry } from '@motion-proto/live-tokens';

  export const catalogue = {
    description: "Deliberately reuses Toggle's own token name, verbatim, in its own :global(:root) block.",
    useFor:
      "giving two components' shipped configs a colliding alias name: the dev server's boot-time default.json generation is purely file-driven over any :global(:root) block under the scanned component dirs, registered or not.",
    notFor:
      "anything a real component would do; it has no editor and no registration, and exists only to trip component-alias.contract.ts's catalogue-wide fan-out test.",
  } satisfies CatalogueEntry;
</script>

<script lang="ts">
</script>

<div class="beacon-twin"></div>

<style>
  :global(:root) {
    --toggle-track-surface: var(--surface-neutral);
  }
</style>
