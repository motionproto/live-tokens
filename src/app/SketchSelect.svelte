<script lang="ts">
  import { onMount } from 'svelte';
  import LabeledSelect from './LabeledSelect.svelte';
  import { SKETCH_STYLES } from '../editor/core/sketch/sketchStyles';
  import {
    sketchEnabled,
    sketchStyleName,
    savedSketchStyles,
    refreshSavedSketchStyles,
    selectSketchStyle,
    selectSavedSketchStyle,
    setSketchEnabled,
    USER_STYLE_PREFIX,
  } from '../editor/core/sketch/sketchStore';

  const NONE = '';

  let busy = $state(false);
  let error = $state('');

  const items = $derived([
    { value: NONE, label: 'None' },
    ...Object.entries(SKETCH_STYLES).map(([value, style]) => ({ value, label: style.label })),
    ...$savedSketchStyles.map(({ fileName, name }) => ({
      value: USER_STYLE_PREFIX + fileName,
      label: name || fileName,
    })),
  ]);

  /* Off is its own choice here, so the picked sketchstyle only shows while the
     effect is on. Turning it off in the Sketchstyle view leaves that
     sketchstyle selected there; this reads as None until it is switched back on. */
  const value = $derived($sketchEnabled ? $sketchStyleName : NONE);

  onMount(() => {
    // No dev plugin (a built preview, say) means no saved sketchstyles. That is
    // a missing door, not a fault worth reporting here.
    refreshSavedSketchStyles().catch(() => {});
  });

  async function changeSketch(next: string) {
    if (busy) return;
    busy = true;
    error = '';
    try {
      if (next === NONE) {
        setSketchEnabled(false);
        return;
      }
      if (next.startsWith(USER_STYLE_PREFIX)) {
        await selectSavedSketchStyle(next.slice(USER_STYLE_PREFIX.length));
      } else {
        selectSketchStyle(next);
      }
      setSketchEnabled(true);
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
