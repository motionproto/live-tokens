<script lang="ts">
  interface Props {
    value?: number;
    label?: string;
    /** Bar fill. Accepts either a design-system var name (`--gradient-1`,
        `--color-brand-500`) or a literal CSS value (`red`, `#ff0000`,
        `linear-gradient(...)`, etc.). When omitted, the themed
        `--progressbar-fill` default is used. Values containing characters that
        could break out of the inline style attribute or inject extra CSS rules
        are dropped and the default is used instead. */
    fill?: string;
  }

  let {
    value = 0,
    label = '',
    fill,
  }: Props = $props();

  let clampedValue = $derived(Math.min(100, Math.max(0, value)));
  // Inline-style injection guard: reject chars that could escape the value
  // context (quotes, backslashes, newlines) or terminate the declaration to
  // smuggle another property (`;`, `{`, `}`, `<`, `>`). Everything else —
  // including `(`/`)` for gradient/rgb syntax — is safe inside `background:`.
  let fillStyle = $derived.by(() => {
    if (!fill) return '';
    if (/^--[\w-]+$/.test(fill)) return `background: var(${fill});`;
    if (/["'\\;{}<>\n\r]/.test(fill)) return '';
    return `background: ${fill};`;
  });
</script>

<div class="progress" class:has-label={!!label}>
  {#if label}
    <div class="progress-label">
      <span>{label}</span>
      <span class="progress-value">{clampedValue}%</span>
    </div>
  {/if}
  <div class="progress-track">
    <div
      class="progress-fill"
      style="width: {clampedValue}%; {fillStyle}"
    ></div>
  </div>
</div>

<style>
  :global(:root) {
    --progressbar-track-surface: var(--surface-neutral-low);
    --progressbar-track-border: var(--border-neutral-faint);
    --progressbar-track-border-width: var(--border-width-1);
    --progressbar-track-height: var(--space-8);
    --progressbar-radius: var(--radius-full);
    --progressbar-fill: var(--gradient-1);
    --progressbar-label-gap: var(--space-6);
    --progressbar-label: var(--text-secondary);
    --progressbar-label-font-family: var(--font-sans);
    --progressbar-label-font-size: var(--font-size-sm);
    --progressbar-label-font-weight: var(--font-weight-light);
    --progressbar-label-line-height: var(--line-height-md);
    --progressbar-value: var(--text-tertiary);
    --progressbar-value-font-family: var(--font-mono);
    --progressbar-value-font-size: var(--font-size-xs);
    --progressbar-value-font-weight: var(--font-weight-light);
    --progressbar-value-line-height: var(--line-height-md);
  }

  .progress {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "track";
    row-gap: var(--progressbar-label-gap);
    width: 100%;
  }

  .progress.has-label {
    grid-template-areas:
      "label"
      "track";
  }

  .progress-label {
    grid-area: label;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-label > span {
    color: var(--progressbar-label);
    font-family: var(--progressbar-label-font-family);
    font-size: var(--progressbar-label-font-size);
    font-weight: var(--progressbar-label-font-weight);
    line-height: var(--progressbar-label-line-height);
  }

  .progress-label > .progress-value {
    color: var(--progressbar-value);
    font-family: var(--progressbar-value-font-family);
    font-size: var(--progressbar-value-font-size);
    font-weight: var(--progressbar-value-font-weight);
    line-height: var(--progressbar-value-line-height);
  }

  .progress-track {
    grid-area: track;
    align-self: center;
    width: 100%;
    overflow: hidden;
    border-style: solid;
    background: var(--progressbar-track-surface);
    border-color: var(--progressbar-track-border);
    border-width: var(--progressbar-track-border-width);
    border-radius: var(--progressbar-radius);
    height: var(--progressbar-track-height);
  }

  .progress-fill {
    height: 100%;
    background: var(--progressbar-fill);
    border-radius: var(--progressbar-radius);
    transition: width 0.4s ease;
  }
</style>
