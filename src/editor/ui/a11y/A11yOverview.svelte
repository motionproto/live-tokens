<script lang="ts">
  import { issueTotals, issuesLabel, type A11yComponentRow, type A11yIssueTotals } from './a11yView';

  interface Props {
    rows: A11yComponentRow[];
    onjump: (component: string) => void;
  }

  let { rows, onjump }: Props = $props();

  const KINDS: { key: keyof A11yIssueTotals; label: string; column: string }[] = [
    { key: 'property', label: 'Fix with a property', column: 'Property' },
    { key: 'code', label: "Fix in the component's code", column: 'Code' },
    { key: 'review', label: 'Check by eye', column: 'By eye' },
  ];

  let tallies = $derived(rows.map((row) => ({ row, totals: issueTotals(row.issues) })));
  let sums = $derived(
    tallies.reduce(
      (acc, { totals }) => ({ property: acc.property + totals.property, code: acc.code + totals.code, review: acc.review + totals.review }),
      { property: 0, code: 0, review: 0 },
    ),
  );
  let total = $derived(sums.property + sums.code + sums.review);
  let withIssues = $derived(rows.filter((row) => row.count > 0).length);
  let fixed = $derived(rows.reduce((sum, row) => sum + row.issues.fixed.length, 0));
  let widest = $derived(Math.max(1, ...rows.map((row) => row.count)));
</script>

<section class="editor-section-card a11y-overview" aria-label="Overview">
  <div class="a11y-stats">
    <div class="a11y-stat a11y-stat-total">
      <span class="a11y-stat-value">{total}</span>
      <span class="a11y-stat-label">
        {total === 1 ? 'issue' : 'issues'} in {withIssues} {withIssues === 1 ? 'component' : 'components'}
      </span>
    </div>
    {#each KINDS as kind (kind.key)}
      <div class="a11y-stat">
        <span class="a11y-stat-value" class:zero={sums[kind.key] === 0}>{sums[kind.key]}</span>
        <span class="a11y-stat-label">
          <span class="a11y-swatch {kind.key}" aria-hidden="true"></span>{kind.label}
        </span>
      </div>
    {/each}
    {#if fixed > 0}
      <div class="a11y-stat a11y-stat-fixed">
        <span class="a11y-stat-value">{fixed}</span>
        <span class="a11y-stat-label">
          <i class="fa-solid fa-check" aria-hidden="true"></i>Fixed since the run
        </span>
      </div>
    {/if}
  </div>

  <table class="a11y-table">
    <thead>
      <tr>
        <th scope="col">Component</th>
        {#each KINDS as kind (kind.key)}
          <th scope="col" class="num">{kind.column}</th>
        {/each}
        {#if fixed > 0}
          <th scope="col" class="num">Fixed</th>
        {/if}
        <th scope="col" class="bar-col"><span class="a11y-hidden">Issues</span></th>
      </tr>
    </thead>
    <tbody>
      {#each tallies as { row, totals } (row.component)}
        <tr>
          <th scope="row">
            <button type="button" class="a11y-jump" onclick={() => onjump(row.component)}>
              <i class={row.icon} aria-hidden="true"></i>{row.label}
            </button>
          </th>
          {#each KINDS as kind (kind.key)}
            <td class="num" class:zero={totals[kind.key] === 0}>{totals[kind.key]}</td>
          {/each}
          {#if fixed > 0}
            <td class="num fixed" class:zero={row.issues.fixed.length === 0}>{row.issues.fixed.length}</td>
          {/if}
          <td class="bar-col">
            <span class="a11y-bar" style:width={`${(row.count / widest) * 100}%`} title={issuesLabel(row.count)}>
              {#each KINDS as kind (kind.key)}
                {#if totals[kind.key] > 0}
                  <span class="a11y-bar-part {kind.key}" style:flex-grow={totals[kind.key]}></span>
                {/if}
              {/each}
            </span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  .a11y-overview {
    gap: var(--ui-space-20);
  }

  .a11y-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--ui-space-16);
  }

  .a11y-stat {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    padding-left: var(--ui-space-16);
    border-left: 1px solid var(--ui-border-low);
  }

  .a11y-stat-total {
    padding-left: 0;
    border-left: none;
  }

  .a11y-stat-value {
    font-size: var(--ui-font-size-3xl);
    font-weight: var(--ui-font-weight-semibold);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: var(--ui-text-primary);
  }

  .a11y-stat-total .a11y-stat-value {
    font-size: var(--ui-font-size-4xl);
  }

  .a11y-stat-label {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-tertiary);
  }

  .zero {
    color: var(--ui-text-muted);
  }

  .a11y-stat-fixed .a11y-stat-value,
  .a11y-stat-fixed i,
  .a11y-table td.fixed:not(.zero) {
    color: var(--ui-fixed);
  }

  .a11y-swatch {
    flex: none;
    width: var(--ui-space-8);
    height: var(--ui-space-8);
    border-radius: var(--ui-radius-full);
  }

  .property {
    background: var(--ui-text-primary);
  }

  .code {
    background: var(--ui-border-high);
  }

  .review {
    border: 1px solid var(--ui-border-high);
  }

  .a11y-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--ui-font-size-sm);
  }

  .a11y-table th,
  .a11y-table td {
    padding: var(--ui-space-6) var(--ui-space-8);
    text-align: left;
    font-weight: var(--ui-font-weight-normal);
    white-space: nowrap;
  }

  .a11y-table th:first-child {
    padding-left: 0;
  }

  .a11y-table thead th {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    border-bottom: 1px solid var(--ui-border-low);
  }

  .a11y-table tbody tr + tr > * {
    border-top: 1px solid var(--ui-border-low);
  }

  .a11y-table .num {
    width: 1%;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--ui-text-primary);
  }

  .a11y-table td.zero {
    color: var(--ui-text-muted);
  }

  .bar-col {
    width: 40%;
  }

  .a11y-jump {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: 0;
    background: none;
    border: none;
    font: inherit;
    color: var(--ui-text-secondary);
    cursor: pointer;
  }

  .a11y-jump i {
    width: var(--ui-space-16);
    color: var(--ui-text-tertiary);
    text-align: center;
  }

  .a11y-jump:hover {
    color: var(--ui-text-primary);
    text-decoration: underline;
    text-underline-offset: var(--ui-space-2);
  }

  .a11y-bar {
    display: flex;
    gap: var(--ui-space-2);
    height: var(--ui-space-8);
    min-width: var(--ui-space-8);
  }

  .a11y-bar-part {
    flex-basis: 0;
    border-radius: var(--ui-radius-full);
  }

  .a11y-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (max-width: 600px) {
    .bar-col {
      display: none;
    }
  }
</style>
