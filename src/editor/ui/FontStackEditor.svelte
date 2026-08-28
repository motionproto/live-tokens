<script lang="ts">
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import type {
    FontFamily,
    FontSource,
    FontStack,
    FontStackSlot,
    FontStackVariable,
    GenericFamily,
    SystemCascadePreset,
  } from '../core/themes/themeTypes';
  import { editorState, setFontStacks } from '../core/store/editorStore';
  import { SYSTEM_CASCADES } from '../core/fonts/fontLoader';

  const SYSTEM_PRESETS: SystemCascadePreset[] = ['system-ui-sans', 'system-ui-serif', 'system-ui-mono'];
  // `cursive` and `fantasy` are CSS-spec generics whose rendering varies wildly
  // across OSes (cursive → Comic Sans / Snell Roundhand; fantasy → Impact /
  // Papyrus). They're rarely what a designer means by "fallback," so we don't
  // offer them in the editor.
  const GENERIC_VALUES: GenericFamily[] = ['sans-serif', 'serif', 'monospace'];

  const STACK_VARIABLES: FontStackVariable[] = [
    '--font-display',
    '--font-sans',
    '--font-serif',
    '--font-mono',
    '--font-editorial',
  ];

  // Each stack's terminal fallback (bottom slot). It's locked to system or
  // generic so text always renders even if every project font 404s. The
  // fallback maps by stack variable; chosen to match the stack's purpose.
  const TERMINAL_FALLBACK_BY_VAR: Record<FontStackVariable, GenericFamily> = {
    '--font-display': 'serif',
    '--font-sans': 'sans-serif',
    '--font-serif': 'serif',
    '--font-mono': 'monospace',
    '--font-editorial': 'sans-serif',
  };

  // The single matching System UI preset paired with each stack — the only two
  // options offered in the terminal slot's dropdown.
  const TERMINAL_SYSTEM_BY_VAR: Record<FontStackVariable, SystemCascadePreset> = {
    '--font-display': 'system-ui-serif',
    '--font-sans': 'system-ui-sans',
    '--font-serif': 'system-ui-serif',
    '--font-mono': 'system-ui-mono',
    '--font-editorial': 'system-ui-sans',
  };

  let fontSourcesList = $derived($editorState.fonts.sources);
  let fontStacksList = $derived($editorState.fonts.stacks);
  let allFamilies = $derived((fontSourcesList as FontSource[]).flatMap((s) => s.families.map((f) => ({ ...f, sourceLabel: s.label ?? s.kind }))));
  let familyById = $derived(new Map<string, FontFamily>(allFamilies.map((f) => [f.id, f])));

  /** Ensure the slot list ends in a system/generic terminal. If it doesn't,
   *  append the variable's default generic so the stack is always renderable. */
  function withTerminalFallback(variable: FontStackVariable, slots: FontStackSlot[]): FontStackSlot[] {
    const fallback: FontStackSlot = { kind: 'generic', value: TERMINAL_FALLBACK_BY_VAR[variable] };
    if (slots.length === 0) return [fallback];
    const last = slots[slots.length - 1];
    if (last.kind === 'project') return [...slots, fallback];
    return slots;
  }

  /** A repeated slot contributes nothing to the CSS list, and two identical
   *  rows are indistinguishable — dragging one past the other looks like a
   *  dead control. Stacks written by the pre-0.64 "+ add fallback" bug are
   *  still in localStorage, so drop repeats on the way in. */
  function dedupeSlots(slots: FontStackSlot[]): FontStackSlot[] {
    const seen = new Set<string>();
    return slots.filter((slot) => {
      const key = slotKey(slot);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function ensureAllStacksPresent(current: FontStack[]): FontStack[] {
    const byVar = new Map(current.map((s) => [s.variable, s]));
    return STACK_VARIABLES.map((v) => {
      const stack = byVar.get(v);
      const slots = withTerminalFallback(v, dedupeSlots(stack?.slots ?? []));
      return stack ? { ...stack, slots } : { variable: v, slots };
    });
  }

  let stacks = $derived(ensureAllStacksPresent(fontStacksList));

  function variableLabel(v: string): string {
    return v.replace(/^--/, '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  function slotKey(slot: FontStackSlot): string {
    if (slot.kind === 'project') return `project:${slot.familyId}`;
    if (slot.kind === 'system') return `system:${slot.preset}`;
    return `generic:${slot.value}`;
  }

  function slotFromKey(key: string): FontStackSlot | null {
    const [kind, ...rest] = key.split(':');
    const value = rest.join(':');
    if (kind === 'project') return { kind: 'project', familyId: value };
    if (kind === 'system') return { kind: 'system', preset: value as SystemCascadePreset };
    if (kind === 'generic') return { kind: 'generic', value: value as GenericFamily };
    return null;
  }

  function slotDisplayName(slot: FontStackSlot): string {
    if (slot.kind === 'project') return familyById.get(slot.familyId)?.name ?? '(missing)';
    if (slot.kind === 'system') {
      return slot.preset === 'system-ui-sans' ? 'System UI (sans)'
        : slot.preset === 'system-ui-serif' ? 'System UI (serif)'
        : 'System UI (mono)';
    }
    return slot.value;
  }

  function slotCssValue(slot: FontStackSlot): string {
    if (slot.kind === 'project') return familyById.get(slot.familyId)?.cssName ?? 'sans-serif';
    if (slot.kind === 'system') return SYSTEM_CASCADES[slot.preset];
    return slot.value;
  }

  function updateStack(variable: FontStackVariable, updater: (slots: FontStackSlot[]) => FontStackSlot[]) {
    const next = stacks.map((s) => (s.variable === variable ? { ...s, slots: updater([...s.slots]) } : s));
    setFontStacks(next);
  }

  function handleSelectChange(variable: FontStackVariable, index: number, value: string) {
    const slot = slotFromKey(value);
    if (!slot) return;
    updateStack(variable, (slots) => {
      slots[index] = slot;
      return slots;
    });
  }

  function onSelectChange(event: Event, variable: FontStackVariable, index: number) {
    const target = event.currentTarget as HTMLSelectElement;
    handleSelectChange(variable, index, target.value);
  }

  function removeSlot(variable: FontStackVariable, index: number) {
    updateStack(variable, (slots) => {
      slots.splice(index, 1);
      return slots;
    });
  }

  /** What the add button reaches for, in order of preference: a project font
   *  the stack doesn't carry yet, then the variable's preferred generic and
   *  preset, then the rest of the system-and-generic ladder. Project fonts lead
   *  because a stack that already holds every fallback otherwise had no way to
   *  gain a second font — the row's own <select> could only retarget a row that
   *  the button had to create first. */
  function addCandidates(variable: FontStackVariable): FontStackSlot[] {
    const generic: GenericFamily =
      variable === '--font-mono' ? 'monospace' : variable === '--font-serif' ? 'serif' : 'sans-serif';
    const preset: SystemCascadePreset =
      variable === '--font-mono' ? 'system-ui-mono' : variable === '--font-serif' ? 'system-ui-serif' : 'system-ui-sans';
    return [
      ...allFamilies.map((f) => ({ kind: 'project' as const, familyId: f.id })),
      { kind: 'generic', value: generic },
      { kind: 'system', preset },
      ...SYSTEM_PRESETS.map((p) => ({ kind: 'system' as const, preset: p })),
      ...GENERIC_VALUES.map((g) => ({ kind: 'generic' as const, value: g })),
    ];
  }

  /** The terminal row offers its stack's matching preset and generic, minus
   *  whatever a row above holds — plus its own current value whatever that is.
   *  A <select> with no option matching its value renders the first option
   *  instead, so the row would read as a slot the stack doesn't have. */
  function terminalOptions(variable: FontStackVariable, slot: FontStackSlot, taken: Set<string>): FontStackSlot[] {
    const current = slotKey(slot);
    const pair: FontStackSlot[] = [
      { kind: 'system', preset: TERMINAL_SYSTEM_BY_VAR[variable] },
      { kind: 'generic', value: TERMINAL_FALLBACK_BY_VAR[variable] },
    ];
    const offered = pair.filter((c) => slotKey(c) === current || !taken.has(slotKey(c)));
    return offered.some((c) => slotKey(c) === current) ? offered : [slot, ...offered];
  }

  /** A slot duplicated within a stack collides with itself in the keyed each,
   *  so only one the stack doesn't already hold may be added. */
  function nextAddableSlot(variable: FontStackVariable): FontStackSlot | null {
    const stack = stacks.find((s) => s.variable === variable);
    const existing = new Set((stack?.slots ?? []).map(slotKey));
    return addCandidates(variable).find((c) => !existing.has(slotKey(c))) ?? null;
  }

  function addLabel(variable: FontStackVariable): string {
    return nextAddableSlot(variable)?.kind === 'project' ? '+ add font' : '+ add fallback';
  }

  /** A font joins the other fonts, above the fallbacks; a fallback lands just
   *  above the terminal, which stays at the bottom. */
  function insertIndexFor(slots: FontStackSlot[], slot: FontStackSlot): number {
    if (slot.kind !== 'project') return Math.max(0, slots.length - 1);
    return slots.reduce((acc, s, i) => (s.kind === 'project' ? i : acc), -1) + 1;
  }

  function addSlot(variable: FontStackVariable) {
    const newSlot = nextAddableSlot(variable);
    if (!newSlot) return;
    updateStack(variable, (slots) => {
      slots.splice(insertIndexFor(slots, newSlot), 0, newSlot);
      return slots;
    });
  }

  /** Two identical slots in one stack would collide in the keyed each and throw
   *  `each_key_duplicate`, taking the whole tab down — and the bad stack is
   *  already persisted by then, so the crash repeats on every reload. Suffix
   *  repeats so such a stack renders and can be edited back into shape. */
  function keyedSlots(slots: FontStackSlot[]): { slot: FontStackSlot; key: string }[] {
    const seen = new Map<string, number>();
    return slots.map((slot) => {
      const base = slotKey(slot);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return { slot, key: n === 0 ? base : `${base}#${n}` };
    });
  }

  /* Drag UX: the source row lifts (opacity, shadow); a white insertion bar
     sits in the gap between rows at the projected drop position. The array
     is only mutated on drop. animate:flip then slides every row to its new
     spot, so the commit doesn't snap.

     Only the drag handle is `draggable="true"` — putting it on the whole row
     swallowed clicks on the inner <button>/<select> in real browsers because
     mousedown started a drag gesture before `click` could fire. The handle
     starts the drag and calls setDragImage(rowEl, ...) so the visual drag
     image is still the whole row. */
  let dragSource: { variable: FontStackVariable; index: number } | null = $state(null);
  let dragOver: { variable: FontStackVariable; index: number; position: 'before' | 'after' } | null = $state(null);

  function onDragStart(e: DragEvent, variable: FontStackVariable, index: number) {
    if (!e.dataTransfer) return;
    dragSource = { variable, index };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-font-slot', JSON.stringify({ variable, index }));
    const rowEl = (e.currentTarget as HTMLElement).closest('.slot-row') as HTMLElement | null;
    if (rowEl) {
      const rect = rowEl.getBoundingClientRect();
      e.dataTransfer.setDragImage(rowEl, e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  function onDragOver(e: DragEvent, variable: FontStackVariable, index: number) {
    const types = e.dataTransfer?.types ?? [];
    if (!types.includes('application/x-font-slot')) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let position: 'before' | 'after' = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
    // Terminal fallback stays at the bottom — never accept a drop after it.
    const stack = stacks.find((s) => s.variable === variable);
    if (stack && index === stack.slots.length - 1 && position === 'after') {
      position = 'before';
    }
    dragOver = { variable, index, position };
  }

  function onDragLeave() {
    dragOver = null;
  }

  function onDrop(e: DragEvent, variable: FontStackVariable, index: number) {
    e.preventDefault();
    const slotPayload = e.dataTransfer?.getData('application/x-font-slot');
    const position = dragOver?.position ?? 'before';
    dragOver = null;
    if (!slotPayload) return;
    const src = JSON.parse(slotPayload) as { variable: FontStackVariable; index: number };
    if (src.variable !== variable) return;
    if (src.index === index) return;
    updateStack(variable, (slots) => {
      const [moved] = slots.splice(src.index, 1);
      let target = index;
      if (src.index < index) target -= 1;
      if (position === 'after') target += 1;
      slots.splice(target, 0, moved);
      return slots;
    });
  }

  function onDragEnd() {
    dragSource = null;
    dragOver = null;
  }
</script>

<div class="font-stacks-columns">
  {#each stacks as stack (stack.variable)}
    <div class="font-stack">
      <div class="stack-header">
        <span class="stack-variable">{variableLabel(stack.variable)}</span>
      </div>
      <div class="font-stack-list">
        {#each keyedSlots(stack.slots) as { slot, key }, i (key)}
          {@const isTerminal = i === stack.slots.length - 1}
          <!-- A value another row already holds is off this row's menu, so the
               stack can't be edited back into the duplicate state. -->
          {@const taken = new Set(stack.slots.filter((_, j) => j !== i).map(slotKey))}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="slot-row"
            class:terminal={isTerminal}
            class:drop-before={dragOver?.variable === stack.variable && dragOver?.index === i && dragOver?.position === 'before'}
            class:drop-after={dragOver?.variable === stack.variable && dragOver?.index === i && dragOver?.position === 'after'}
            class:dragging={dragSource?.variable === stack.variable && dragSource?.index === i}
            ondragover={(e) => onDragOver(e, stack.variable, i)}
            ondragleave={onDragLeave}
            ondrop={(e) => onDrop(e, stack.variable, i)}
            ondragend={onDragEnd}
            animate:flip={{ duration: 220, easing: cubicOut }}
          >
            <div class="slot-controls">
              {#if isTerminal}
                <i class="fas fa-lock slot-locked-glyph" aria-hidden="true" title="Final fallback — can't be removed"></i>
              {:else}
                <span
                  class="drag-handle"
                  aria-hidden="true"
                  draggable="true"
                  ondragstart={(e) => onDragStart(e, stack.variable, i)}
                >⋮⋮</span>
              {/if}
              <span class="slot-position">{i + 1}.</span>
              <select
                class="ui-form-select slot-select"
                value={slotKey(slot)}
                onchange={(e) => onSelectChange(e, stack.variable, i)}
              >
                {#if isTerminal}
                  {#each terminalOptions(stack.variable, slot, taken) as opt}
                    <option value={slotKey(opt)}>{slotDisplayName(opt)}</option>
                  {/each}
                {:else}
                  {@const families = allFamilies.filter((f) => !taken.has(`project:${f.id}`))}
                  {@const presets = SYSTEM_PRESETS.filter((p) => !taken.has(`system:${p}`))}
                  {@const generics = GENERIC_VALUES.filter((g) => !taken.has(`generic:${g}`))}
                  {#if families.length > 0}
                    <optgroup label="Project fonts">
                      {#each families as fam}
                        <option value={`project:${fam.id}`}>{fam.name}</option>
                      {/each}
                    </optgroup>
                  {/if}
                  {#if presets.length > 0}
                    <optgroup label="System cascade">
                      {#each presets as p}
                        <option value={`system:${p}`}>{p === 'system-ui-sans' ? 'System UI (sans)' : p === 'system-ui-serif' ? 'System UI (serif)' : 'System UI (mono)'}</option>
                      {/each}
                    </optgroup>
                  {/if}
                  {#if generics.length > 0}
                    <optgroup label="Generic">
                      {#each generics as g}
                        <option value={`generic:${g}`}>{g}</option>
                      {/each}
                    </optgroup>
                  {/if}
                {/if}
              </select>
              {#if isTerminal}
                <span class="slot-remove-placeholder" aria-hidden="true"></span>
              {:else}
                <button
                  type="button"
                  class="slot-remove"
                  aria-label="Remove slot"
                  title="Remove"
                  onclick={() => removeSlot(stack.variable, i)}
                >×</button>
              {/if}
            </div>
            <span
              class="slot-preview"
              style="font-family: {slotCssValue(slot)};{stack.variable === '--font-display' ? ' font-size: var(--ui-font-size-2xl);' : ''}"
            >The quick brown fox jumps over the lazy dog</span>
          </div>
        {/each}
      </div>
      <button
        type="button"
        class="add-fallback"
        disabled={nextAddableSlot(stack.variable) === null}
        title={nextAddableSlot(stack.variable) === null ? 'Every project font and fallback is already in this stack' : undefined}
        onclick={() => addSlot(stack.variable)}
      >
        {addLabel(stack.variable)}
      </button>
    </div>
  {/each}
</div>

<style>
  .font-stacks-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--ui-space-24);
  }

  @media (max-width: 720px) {
    .font-stacks-columns {
      grid-template-columns: 1fr;
    }
  }

  /* Track: each font family is a bordered channel that the slot cards drop into.
     The interior sits a step deeper than the page surface, so the slot cards
     (surface-low) read as raised inside the depression. */
  .font-stack {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    padding: var(--ui-space-20) var(--ui-space-12) var(--ui-space-16);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-lg);
  }

  /* Legend: knock through the top border like a native <fieldset>'s <legend>.
     Editor content bg is solid black; the header paints over the border line
     to cut it. */
  .stack-header {
    position: absolute;
    top: 0;
    left: var(--ui-space-12);
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    padding: 0 var(--ui-space-6);
    background: black;
    line-height: 1;
  }

  .stack-variable {
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-bold);
    color: var(--ui-text-primary);
  }

  .font-stack-list {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .slot-row {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-10);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface-low);
    position: relative;
    transition:
      opacity var(--ui-transition-fast),
      transform var(--ui-transition-fast),
      border-color var(--ui-transition-fast);
  }

  .slot-controls {
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    align-items: center;
    gap: var(--ui-space-8);
  }

  /* Reorder UX: a thin white bar sits in the existing 8px gap between rows
     as the insertion indicator. The bar is absolutely positioned and consumes
     no layout space, so the parent track stays the same height. On drop, the
     array commits and animate:flip slides each row to its new position. */
  .slot-row.drop-before::before,
  .slot-row.drop-after::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--ui-text-primary);
    border-radius: 1px;
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.45);
  }
  .slot-row.drop-before::before { top: -5px; }
  .slot-row.drop-after::after   { bottom: -5px; }

  .slot-row.dragging {
    opacity: 0.55;
    z-index: 2;
    border-color: var(--ui-border-high);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
  }

  .drag-handle {
    cursor: grab;
    user-select: none;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-md);
    line-height: 1;
  }
  .slot-row.dragging .drag-handle { cursor: grabbing; }

  /* Terminal-row lock glyph sits in the drag-handle's grid track; the row's
     right-hand X column is left empty (see .slot-remove-placeholder) so the
     lock is the only chrome and reads as "this row is fixed." */
  .slot-locked-glyph {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-sm);
    opacity: 0.55;
  }

  /* Empty grid track on terminal rows where the X button sits on others,
     so columns stay aligned. */
  .slot-remove-placeholder {
    width: 1.5rem;
    height: 1.5rem;
  }

  .slot-position {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-muted);
    min-width: 1.25rem;
    text-align: right;
  }

  .slot-preview {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
    line-height: var(--ui-line-height-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .slot-select {
    width: 100%;
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
  }

  .slot-remove {
    background: none;
    border: 1px solid var(--ui-border-low);
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-md);
    line-height: 1;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
  }
  .slot-remove:hover:not(:disabled) {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }
  .slot-remove:disabled { opacity: 0.35; cursor: not-allowed; }

  .add-fallback {
    align-self: flex-start;
    background: none;
    border: 1px dashed var(--ui-border-low);
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-sm);
    padding: var(--ui-space-4) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
  }
  .add-fallback:hover:not(:disabled) {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }
  .add-fallback:disabled { opacity: 0.35; cursor: not-allowed; }
</style>
