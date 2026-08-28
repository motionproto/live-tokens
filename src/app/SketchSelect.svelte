<script lang="ts">
  import LabeledSelect from './LabeledSelect.svelte';
  import { setSketch, sketchLooks, themeSketchLook } from '../editor/core/sketch';
  import { sketchEnabled, sketchStyleName } from '../editor/core/sketch/sketchStore';

  const NONE = '';

  let busy = $state(false);
  let error = $state('');

  const items = $derived([
    { value: NONE, label: 'None' },
    /* The look the open theme carries, when nothing in the pool names it.
       Without the row the select reads None over a drawn page, and a visitor
       who picks something else cannot get back. */
    ...($themeSketchLook ? [{ value: $themeSketchLook.id, label: $themeSketchLook.label }] : []),
    ...$sketchLooks.map((look) => ({ value: look.id, label: look.label })),
  ]);

  /* Off is its own choice here, so the picked sketchstyle only shows while the
     effect is on. Turning it off in the Sketchstyle view leaves that
     sketchstyle selected there; this reads as None until it is switched back on. */
  const value = $derived($sketchEnabled ? $sketchStyleName : NONE);

  function changeSketch(next: string) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      setSketch(next === NONE ? null : next);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Could not apply that sketchstyle';
    } finally {
      busy = false;
    }
  }
</script>

<LabeledSelect
  label="Sketch"
  items={items}
  {value}
  disabled={busy}
  {error}
  onchange={changeSketch}
/>
