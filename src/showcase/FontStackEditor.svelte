<script lang="ts">
  import type {
    FontFamily,
    FontSource,
    FontStack,
    FontStackSlot,
    FontStackVariable,
    GenericFamily,
    SystemCascadePreset,
  } from '../lib/tokenTypes';
  import { fontSources, fontStacks } from '../lib/fontStore';
  import { applyFontStacks, SYSTEM_CASCADES } from '../lib/fontLoader';

  const SYSTEM_PRESETS: SystemCascadePreset[] = ['system-ui-sans', 'system-ui-serif', 'system-ui-mono'];
  const GENERIC_VALUES: GenericFamily[] = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];

  const STACK_VARIABLES: FontStackVariable[] = [
    '--font-display',
    '--font-sans',
    '--font-serif',
    '--font-mono',
  ];

  $: allFamilies = ($fontSources as FontSource[]).flatMap((s) => s.families.map((f) => ({ ...f, sourceLabel: s.label ?? s.kind })));
  $: familyById = new Map<string, FontFamily>(allFamilies.map((f) => [f.id, f]));

  function ensureAllStacksPresent(current: FontStack[]): FontStack[] {
    const byVar = new Map(current.map((s) => [s.variable, s]));
    return STACK_VARIABLES.map((v) => byVar.get(v) ?? { variable: v, slots: [{ kind: 'generic', value: 'sans-serif' } as FontStackSlot] });
  }

  $: stacks = ensureAllStacksPresent($fontStacks);

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
    $fontStacks = next;
    applyFontStacks(next, $fontSources);
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

  function addSlot(variable: FontStackVariable) {
    const stack = stacks.find((s) => s.variable === variable);
    const generic: GenericFamily =
      variable === '--font-mono' ? 'monospace' : variable === '--font-serif' ? 'serif' : 'sans-serif';
    const existing = new Set((stack?.slots ?? []).map(slotKey));
    let newSlot: FontStackSlot = { kind: 'generic', value: generic };
    if (existing.has(slotKey(newSlot))) {
      const preset: SystemCascadePreset =
        variable === '--font-mono' ? 'system-ui-mono' : variable === '--font-serif' ? 'system-ui-serif' : 'system-ui-sans';
      newSlot = { kind: 'system', preset };
    }
    updateStack(variable, (slots) => {
      slots.push(newSlot);
      return slots;
    });
  }

  let dragSource: { variable: FontStackVariable; index: number } | null = null;
  let dragOver: { variable: FontStackVariable; index: number; position: 'before' | 'on' | 'after' } | null = null;

  function onDragStart(e: DragEvent, variable: FontStackVariable, index: number) {
    if (!e.dataTransfer) return;
    dragSource = { variable, index };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-font-slot', JSON.stringify({ variable, index }));
  }

  function onDragOver(e: DragEvent, variable: FontStackVariable, index: number) {
    const types = e.dataTransfer?.types ?? [];
    if (!types.includes('application/x-font-slot')) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const third = rect.height / 3;
    const position = y < third ? 'before' : y > rect.height - third ? 'after' : 'on';
    dragOver = { variable, index, position };
  }

  function onDragLeave() {
    dragOver = null;
  }

  function onDrop(e: DragEvent, variable: FontStackVariable, index: number) {
    e.preventDefault();
    const slotPayload = e.dataTransfer?.getData('application/x-font-slot');
    const position = dragOver?.position ?? 'on';
    dragOver = null;
    if (!slotPayload) return;
    const src = JSON.parse(slotPayload) as { variable: FontStackVariable; index: number };
    if (src.variable !== variable) return;
    if (src.index === index && position === 'on') return;
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
        <span class="stack-variable">{stack.variable}</span>
      </div>
      <div class="font-stack-list">
        {#each stack.slots as slot, i (i + ':' + slotKey(slot))}
          <div
            class="slot-row"
            class:drop-on={dragOver?.variable === stack.variable && dragOver?.index === i && dragOver?.position === 'on'}
            class:drop-before={dragOver?.variable === stack.variable && dragOver?.index === i && dragOver?.position === 'before'}
            class:drop-after={dragOver?.variable === stack.variable && dragOver?.index === i && dragOver?.position === 'after'}
            class:dragging={dragSource?.variable === stack.variable && dragSource?.index === i}
            draggable="true"
            on:dragstart={(e) => onDragStart(e, stack.variable, i)}
            on:dragover={(e) => onDragOver(e, stack.variable, i)}
            on:dragleave={onDragLeave}
            on:drop={(e) => onDrop(e, stack.variable, i)}
            on:dragend={onDragEnd}
          >
            <span class="drag-handle" aria-hidden="true">⋮⋮</span>
            <span class="slot-position">{i + 1}.</span>
            <div class="slot-main">
              <span
                class="slot-preview"
                style="font-family: {slotCssValue(slot)};{stack.variable === '--font-display' ? ' font-size: var(--font-2xl);' : ''}"
              >The quick brown fox jumps over the lazy dog</span>
              <select
                class="form-select slot-select"
                value={slotKey(slot)}
                on:change={(e) => onSelectChange(e, stack.variable, i)}
              >
                {#if allFamilies.length > 0}
                  <optgroup label="Project fonts">
                    {#each allFamilies as fam}
                      <option value={`project:${fam.id}`}>{fam.name}</option>
                    {/each}
                  </optgroup>
                {/if}
                <optgroup label="System cascade">
                  {#each SYSTEM_PRESETS as p}
                    <option value={`system:${p}`}>{p === 'system-ui-sans' ? 'System UI (sans)' : p === 'system-ui-serif' ? 'System UI (serif)' : 'System UI (mono)'}</option>
                  {/each}
                </optgroup>
                <optgroup label="Generic">
                  {#each GENERIC_VALUES as g}
                    <option value={`generic:${g}`}>{g}</option>
                  {/each}
                </optgroup>
              </select>
            </div>
            <button
              type="button"
              class="slot-remove"
              aria-label="Remove slot"
              title="Remove"
              on:click={() => removeSlot(stack.variable, i)}
              disabled={stack.slots.length <= 1}
            >×</button>
          </div>
        {/each}
      </div>
      <button type="button" class="add-fallback" on:click={() => addSlot(stack.variable)}>
        + add fallback
      </button>
    </div>
  {/each}
</div>

<style>
  .font-stacks-columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));
    gap: var(--space-8);
  }

  .font-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-12);
    background: none;
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--radius-md);
  }

  .stack-header {
    display: flex;
    align-items: center;
  }

  .stack-variable {
    font-family: var(--ui-font-mono);
    font-size: var(--font-md);
    color: var(--ui-text-primary);
  }

  .font-stack-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .slot-row {
    display: grid;
    grid-template-columns: auto auto 1fr auto;
    align-items: center;
    gap: var(--space-6);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--ui-border-faint);
    position: relative;
  }
  .slot-row:last-child { border-bottom: none; }

  .drag-handle {
    cursor: grab;
    user-select: none;
    color: var(--ui-text-muted);
    font-size: var(--font-md);
    line-height: 1;
    letter-spacing: -2px;
  }
  .slot-row.dragging .drag-handle { cursor: grabbing; }
  .slot-row.dragging { opacity: 0.55; }

  .slot-row.drop-on { outline: 2px solid var(--ui-focus, #5eb2ff); outline-offset: -2px; }
  .slot-row.drop-before::before,
  .slot-row.drop-after::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: var(--ui-focus, #5eb2ff);
  }
  .slot-row.drop-before::before { top: -1px; }
  .slot-row.drop-after::after { bottom: -1px; }

  .slot-position {
    font-size: var(--font-md);
    color: var(--ui-text-muted);
    min-width: 1.25rem;
    text-align: right;
  }

  .slot-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  .slot-preview {
    font-size: var(--font-md);
    color: var(--ui-text-primary);
    line-height: var(--line-height-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .slot-select {
    width: 100%;
    font-family: var(--ui-font-mono);
    font-size: var(--font-sm);
  }

  .slot-remove {
    background: none;
    border: 1px solid var(--ui-border-faint);
    color: var(--ui-text-muted);
    font-size: var(--font-md);
    line-height: 1;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: var(--radius-sm);
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
    border: 1px dashed var(--ui-border-faint);
    color: var(--ui-text-muted);
    font-size: var(--font-sm);
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .add-fallback:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }
</style>
