<script lang="ts">
  import LabeledSelect from './LabeledSelect.svelte';
  import { setSketch, sketchPick, sketchStyles, unsavedSketchStyle } from '../editor/core/sketch';

  let { inline = false, size = 'default', onpick }: { inline?: boolean; size?: 'default' | 'small'; onpick?: (id: string | null) => void } = $props();

  // The empty string is the placeholder's value, so off needs a name of its own.
  const OFF = 'none';

  let busy = $state(false);
  let error = $state('');

  const items = $derived([
    { value: OFF, label: 'None' },
    /* The style the open theme carries, when nothing in the pool names it.
       Without the row the select reads None over a drawn page, and a visitor
       who picks something else cannot get back. */
    ...($unsavedSketchStyle ? [{ value: $unsavedSketchStyle.id, label: $unsavedSketchStyle.label }] : []),
    ...$sketchStyles.map((style) => ({ value: style.id, label: style.label })),
  ]);

  /* Off is its own choice here, so the picked sketchstyle only shows while the
     effect is on. Turning it off in the Sketchstyle view leaves that
     sketchstyle selected there; this reads as None until it is switched back on.
     Dials moved off every named style land on the placeholder. */
  const selected = $derived(
    $sketchPick.state === 'off' ? OFF
    : $sketchPick.state === 'style' ? $sketchPick.style.id
    : '',
  );

  function changeSketch(next: string) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      const id = next === OFF ? null : next;
      setSketch(id);
      onpick?.(id);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Could not apply that sketchstyle';
    } finally {
      busy = false;
    }
  }
</script>

<LabeledSelect
  {inline}
  {size}
  label="Sketch"
  {items}
  value={selected}
  placeholder="Custom"
  disabled={busy}
  {error}
  onchange={changeSketch}
/>
