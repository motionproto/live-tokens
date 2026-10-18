<script lang="ts">
  import Badge from '../../../src/system/components/Badge.svelte';
  import Table from '../../../src/system/components/Table.svelte';
</script>

<div class="page">
  <section class="band">
    <Table>
      <table>
        <thead>
          <tr><th>Invoice</th><th>Issued</th><th>Plan</th><th>Amount</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>INV-2026-0142</td><td>1 September 2026</td><td>Roastery annual</td><td>€1,240.00</td><td><Badge variant="success">Paid</Badge></td></tr>
        </tbody>
      </table>
    </Table>
  </section>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    padding: var(--space-32);
  }

  /* A grid item's automatic minimum is its content's min-content width, so
     without this the track would grow to hold the table rather than let the
     table's wrapper scroll. */
  .band {
    grid-column: 1 / -1;
    min-width: 0;
  }

  /* The exception: a row wider than a phone, in the Table's own wrapper, which
     scrolls rather than clips, so the badge at the row's end is in reach. */
  table {
    white-space: nowrap;
  }

  /* At 390 the theme's 32px gutter alone is wider than the content box, so a
     twelve-column grid overflows every phone. The grid rule is inapplicable
     below 768 and the page collapses to one column there, which is the shape
     a page has to take. */
  @media (max-width: 767px) {
    .page {
      grid-template-columns: 1fr;
      column-gap: 0;
    }
  }
</style>
