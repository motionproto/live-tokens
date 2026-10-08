<script lang="ts">
  import { tick } from 'svelte';
  import { beginSliderGesture, editorState } from '../../core/store/editorStore';
  import { getDeclaredValue } from '../../core/palettes/tokenRegistry';
  import {
    COMPRESSION_RANGE,
    CUSTOM_RATIO_RANGE,
    EDITABLE_NAMES,
    INTERVALS,
    ROOT_PX,
    STEPS,
    USAGES,
    compressionName,
    formatNumber,
    formatRem,
    usageName,
    type Usage,
    type Viewport,
  } from '../../core/typeScale/typeScale';
  import UIFontFamilySelector from '../UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../UIFontWeightSelector.svelte';
  import UIPillButton from '../UIPillButton.svelte';
  import UISegmentedControl from '../UISegmentedControl.svelte';
  import { TEXT_STYLES, type TextStyle } from '../sections/textStyles';
  import ResetIcon from './ResetIcon.svelte';
  import StepRow from './StepRow.svelte';
  import StyleControl from './StyleControl.svelte';
  import {
    BASE_RANGE_PX,
    COMPRESSED,
    EYEBROW,
    compressionEffect,
    compressionOf,
    hasStored,
    intervalOf,
    isStored,
    ratioLabel,
    settingsOf,
    stepTarget,
    textStyleEdits,
    usageKeys,
    type TokenView,
  } from './textStyleEdits';

  const edits = textStyleEdits(getDeclaredValue);
  const uid = $props.id();

  const USAGE_LABEL: Record<Usage, string> = {
    display: 'Display',
    heading: 'Heading',
    body: 'Body',
    editorial: 'Editorial',
    code: 'Code',
  };
  const VIEWPORT_OPTIONS: { value: Viewport; label: string }[] = [
    { value: 'desktop', label: 'Desktop' },
    { value: 'tablet', label: 'Tablet' },
    { value: 'phone', label: 'Phone' },
  ];
  const STEPS_DOWN = [...STEPS].reverse();
  const STYLE_BY_PREFIX = new Map<string, TextStyle>(TEXT_STYLES.map((s) => [s.prefix, s]));
  const styleOf = (prefix: string): TextStyle => STYLE_BY_PREFIX.get(prefix)!;

  let active: Usage = $state('heading');
  let viewport: Viewport = $state('desktop');
  // A ratio that matches an interval shows that interval until the user picks Custom.
  let customRatio: Partial<Record<Usage, boolean>> = $state({});

  let view: TokenView = $derived({ stored: $editorState.cssVars, declared: getDeclaredValue });
  let settings = $derived(settingsOf(view, active));
  let ratioMode = $derived(customRatio[active] ? 'custom' : intervalOf(settings.ratio).key);

  async function selectTab(usage: Usage) {
    active = usage;
    await tick();
    document.getElementById(`${uid}-tab-${usage}`)?.focus();
  }

  const TAB_MOVES: Record<string, (i: number) => number> = {
    ArrowRight: (i) => (i + 1) % USAGES.length,
    ArrowLeft: (i) => (i - 1 + USAGES.length) % USAGES.length,
    Home: () => 0,
    End: () => USAGES.length - 1,
  };

  function onTabKey(e: KeyboardEvent) {
    const move = TAB_MOVES[e.key];
    if (!move) return;
    e.preventDefault();
    selectTab(USAGES[move(USAGES.indexOf(active))]);
  }

  function chooseRatio(key: string) {
    const interval = INTERVALS.find((i) => i.key === key);
    customRatio[active] = interval?.ratio === null;
    if (interval?.ratio != null) edits.setRatio(active, interval.ratio);
  }

  function resetRatio() {
    customRatio[active] = false;
    edits.resetKey(usageName(active, 'scale-ratio'));
  }

  function resetUsage() {
    customRatio[active] = false;
    edits.resetUsage(active);
  }

  function resetAll() {
    customRatio = {};
    edits.resetAll();
  }

  // A clamped or unchanged value would otherwise stay in the input as typed.
  function editBase(input: HTMLInputElement) {
    edits.setBase(active, input.valueAsNumber);
    input.value = formatNumber(settingsOf(edits.view(), active).base * ROOT_PX);
  }

  function editCustomRatio(input: HTMLInputElement) {
    edits.setRatio(active, input.valueAsNumber);
    input.value = formatNumber(settingsOf(edits.view(), active).ratio);
  }

  const writeSetting = (name: string) => (value: string | null) => edits.writeToken(name, value);
</script>

<div class="group-head">
  <h3 class="group-title">Text Styles</h3>
  <UIPillButton icon="fa-rotate-left" disabled={!hasStored(view, EDITABLE_NAMES)} onclick={resetAll}>
    Reset all
  </UIPillButton>
</div>

<div class="scaling">
  <h4 class="sub-title scaling-wide">Responsive scaling</h4>
  {#each COMPRESSED as vp (vp)}
    {@const c = compressionOf(view, vp)}
    {@const id = `${uid}-${vp}-scaling`}
    <div class="scaling-field" data-reset-scope>
      <div class="scaling-top">
        <div class="ctl-head">
          <label class="field-label" for={id}>{vp === 'tablet' ? 'Tablet' : 'Phone'} scaling</label>
          <ResetIcon
            label="{vp} scaling"
            visible={isStored(view, compressionName(vp))}
            onreset={() => edits.resetKey(compressionName(vp))}
          />
        </div>
        <span class="scaling-value">{c.toFixed(2)}</span>
      </div>
      <input
        {id}
        type="range"
        min={COMPRESSION_RANGE.min}
        max={COMPRESSION_RANGE.max}
        step="0.01"
        value={c}
        onpointerdown={() => beginSliderGesture(`drag ${vp} scaling`)}
        oninput={(e) => edits.setCompression(vp, e.currentTarget.valueAsNumber)}
      />
      <span class="scaling-effect">{compressionEffect(c)}</span>
    </div>
  {/each}
  <p class="hint scaling-wide">
    Sets the recommended tablet and phone size for every step. Sizes above 16px move toward 16px.
    Lower values fit large type to small screens and narrow the gap between levels, and higher values
    keep more of the desktop hierarchy. Every recommendation stays at or below its desktop size.
  </p>
</div>

<div>
  <div class="tabs" role="tablist" aria-label="Usages">
    {#each USAGES as usage (usage)}
      {@const selected = usage === active}
      <button
        type="button"
        role="tab"
        class="tab"
        id="{uid}-tab-{usage}"
        aria-selected={selected}
        aria-controls="{uid}-panel"
        tabindex={selected ? 0 : -1}
        onclick={() => selectTab(usage)}
        onkeydown={onTabKey}
      >
        {USAGE_LABEL[usage]}
        <span class="tab-ratio">{ratioLabel(settingsOf(view, usage).ratio)}</span>
      </button>
    {/each}
  </div>

  <div class="tab-panel" id="{uid}-panel" role="tabpanel" aria-labelledby="{uid}-tab-{active}">
    {#key active}
      <div class="scale">
        <StyleControl
          label="Face"
          name="{active} face"
          width="10rem"
          resetVisible={isStored(view, usageName(active, 'font-family'))}
          onreset={() => edits.resetKey(usageName(active, 'font-family'))}
        >
          <UIFontFamilySelector
            variable={usageName(active, 'font-family')}
            onwrite={writeSetting(usageName(active, 'font-family'))}
          />
        </StyleControl>
        <StyleControl
          label="Weight"
          name="{active} weight"
          width="8rem"
          resetVisible={isStored(view, usageName(active, 'font-weight'))}
          onreset={() => edits.resetKey(usageName(active, 'font-weight'))}
        >
          <UIFontWeightSelector
            variable={usageName(active, 'font-weight')}
            onwrite={writeSetting(usageName(active, 'font-weight'))}
          />
        </StyleControl>
        <div class="field" data-reset-scope>
          <div class="ctl-head">
            <label class="field-label" for="{uid}-base">Base</label>
            <ResetIcon
              label="{active} base"
              visible={isStored(view, usageName(active, 'scale-base'))}
              onreset={() => edits.resetKey(usageName(active, 'scale-base'))}
            />
          </div>
          <div class="inline">
            <input
              id="{uid}-base"
              class="num-input"
              type="number"
              min={BASE_RANGE_PX.min}
              max={BASE_RANGE_PX.max}
              step="any"
              value={formatNumber(settings.base * ROOT_PX)}
              onchange={(e) => editBase(e.currentTarget)}
            />
            <span class="unit">px</span>
            <span class="rem">{formatRem(settings.base)}</span>
          </div>
        </div>
        <div class="field" data-reset-scope>
          <div class="ctl-head">
            <label class="field-label" for="{uid}-ratio">Ratio</label>
            <ResetIcon
              label="{active} ratio"
              visible={isStored(view, usageName(active, 'scale-ratio'))}
              onreset={resetRatio}
            />
          </div>
          <div class="inline">
            <select
              id="{uid}-ratio"
              class="select-input"
              value={ratioMode}
              onchange={(e) => chooseRatio(e.currentTarget.value)}
            >
              {#each INTERVALS as interval (interval.key)}
                <option value={interval.key}>
                  {interval.ratio === null ? interval.label : `${interval.label} · ${interval.ratio}`}
                </option>
              {/each}
            </select>
            {#if ratioMode === 'custom'}
              <input
                class="num-input"
                type="number"
                min={CUSTOM_RATIO_RANGE.min}
                max={CUSTOM_RATIO_RANGE.max}
                step="any"
                value={formatNumber(settings.ratio)}
                aria-label="{USAGE_LABEL[active]} custom ratio"
                onchange={(e) => editCustomRatio(e.currentTarget)}
              />
            {/if}
          </div>
        </div>
        <p class="hint">
          Desktop sizes follow from the base and ratio. Every step uses this face and weight until you unlink it.
        </p>
        <UIPillButton icon="fa-rotate-left" disabled={!hasStored(view, usageKeys(active))} onclick={resetUsage}>
          Reset {USAGE_LABEL[active]}
        </UIPillButton>
      </div>

      <div class="ramp-head">
        <h4 class="sub-title">Steps</h4>
        <UISegmentedControl bind:value={viewport} options={VIEWPORT_OPTIONS} ariaLabel="Preview viewport" />
      </div>
      <div class="ramp">
        {#each STEPS_DOWN as step (step)}
          {@const target = stepTarget(active, step)}
          <StepRow {target} style={styleOf(target.prefix)} {view} {viewport} {edits} />
        {/each}
      </div>
      {#if active === EYEBROW.usage}
        <h4 class="sub-title">Eyebrow</h4>
        <div class="ramp">
          <StepRow target={EYEBROW} style={styleOf(EYEBROW.prefix)} {view} {viewport} {edits} />
        </div>
      {/if}
    {/key}
  </div>
</div>

<style>
  .group-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--ui-space-12);
  }

  .group-title {
    font-size: var(--ui-font-size-xl);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
    margin: 0;
  }

  .sub-title {
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .scaling {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-10) var(--ui-space-24);
    padding: var(--ui-space-12) var(--ui-space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-lg);
  }

  .scaling-wide {
    flex: 1 1 100%;
  }

  .scaling-field {
    flex: 1 1 16rem;
    display: grid;
    gap: var(--ui-space-4);
    min-width: 0;
  }

  .scaling-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .scaling-value {
    color: var(--ui-text-primary);
    font-variant-numeric: tabular-nums;
    font-weight: var(--ui-font-weight-semibold);
  }

  .scaling-field input[type="range"] {
    width: 100%;
    margin: 0;
    accent-color: var(--ui-text-primary);
  }

  .scaling-effect {
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-xs);
    font-variant-numeric: tabular-nums;
  }

  /* The active tab carries the bright underline the editor gives section
     titles, sitting on the bar's own hairline. */
  .tabs {
    display: flex;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--ui-border-low);
  }

  .tab {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ui-space-2);
    margin-bottom: -1px;
    padding: var(--ui-space-10) var(--ui-space-20) var(--ui-space-8);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--ui-text-tertiary);
    font: inherit;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    text-align: left;
    cursor: pointer;
    transition:
      color var(--ui-transition-fast),
      border-color var(--ui-transition-fast);
  }

  .tab:hover {
    color: var(--ui-text-primary);
    border-bottom-color: var(--ui-border-high);
  }

  .tab[aria-selected="true"] {
    color: var(--ui-text-primary);
    border-bottom-color: var(--ui-text-primary);
  }

  .tab:focus-visible {
    outline: 2px solid var(--ui-text-primary);
    outline-offset: -2px;
  }

  .tab-ratio {
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-normal);
  }

  .tab[aria-selected="true"] .tab-ratio {
    color: var(--ui-text-secondary);
  }

  .tab-panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-16);
    padding-top: var(--ui-space-16);
  }

  .scale {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--ui-space-16);
    padding: var(--ui-space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-lg);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-width: 0;
  }

  .ctl-head {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
    height: 18px;
    min-width: 0;
  }

  .field-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  .inline {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    min-width: 0;
  }

  .num-input,
  .select-input {
    box-sizing: border-box;
    height: 1.75rem;
    min-width: 0;
    padding: 0 var(--ui-space-8);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font: inherit;
    font-size: var(--ui-font-size-sm);
  }

  .num-input {
    width: 5.5rem;
    font-variant-numeric: tabular-nums;
  }

  .num-input:hover,
  .select-input:hover {
    border-color: var(--ui-border-high);
  }

  .num-input:focus-visible,
  .select-input:focus-visible,
  .scaling-field input[type="range"]:focus-visible {
    outline: 2px solid var(--ui-text-primary);
    outline-offset: 2px;
  }

  .unit {
    flex: none;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-xs);
  }

  .rem {
    flex: none;
    width: 9ch;
    color: var(--ui-text-muted);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    font-variant-numeric: tabular-nums;
  }

  .hint {
    flex: 1 1 14rem;
    margin: 0;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-xs);
    line-height: var(--ui-line-height-relaxed);
  }

  .ramp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--ui-space-12);
  }

  /* No overflow clipping: the pickers' dropdowns spill past the frame. */
  .ramp {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--ui-border);
  }

  @media (prefers-reduced-motion: reduce) {
    .tab {
      transition: none;
    }
  }
</style>
