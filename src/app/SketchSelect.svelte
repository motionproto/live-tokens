<script lang="ts">
  import { onMount } from 'svelte';
  import LabeledSelect from './LabeledSelect.svelte';
  import { SKETCH_PRESETS } from '../editor/core/sketch/sketchPresets';
  import {
    sketchEnabled,
    sketchPreset,
    userSketchPresets,
    refreshUserPresets,
    selectSketchPreset,
    selectUserSketchPreset,
    setSketchEnabled,
    USER_PRESET_PREFIX,
  } from '../editor/core/sketch/sketchStore';

  const NONE = '';

  let busy = $state(false);
  let error = $state('');

  const items = $derived([
    { value: NONE, label: 'None' },
    ...Object.entries(SKETCH_PRESETS).map(([value, preset]) => ({ value, label: preset.label })),
    ...$userSketchPresets.map(({ fileName, name }) => ({
      value: USER_PRESET_PREFIX + fileName,
      label: name || fileName,
    })),
  ]);

  /* Off is its own choice here, so the picked preset only shows while the
     effect is on. Turning it off in the Sketch Style view leaves that
     preset selected there; this reads as None until it is switched back on. */
  const value = $derived($sketchEnabled ? $sketchPreset : NONE);

  onMount(() => {
    // No dev plugin (a built preview, say) means no saved presets. That is a
    // missing door, not a fault worth reporting here.
    refreshUserPresets().catch(() => {});
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
      if (next.startsWith(USER_PRESET_PREFIX)) {
        await selectUserSketchPreset(next.slice(USER_PRESET_PREFIX.length));
      } else {
        selectSketchPreset(next);
      }
      setSketchEnabled(true);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Could not apply that sketch style';
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
