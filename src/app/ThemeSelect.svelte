<script lang="ts">
  import { onMount } from 'svelte';
  import LabeledSelect from './LabeledSelect.svelte';
  import { listThemes, applyTheme } from '../editor/core/themes/themeService';
  import { openThemeSlug } from '../editor/core/store/editorConfigStore';

  let themes = $state<{ value: string; label: string }[]>([]);
  let busy = $state(false);
  let error = $state('');

  onMount(async () => {
    const files = await listThemes();
    themes = files
      .map(({ fileName, name }) => ({ value: fileName, label: name || fileName }))
      .sort((a, b) =>
        a.value === 'default' ? -1
          : b.value === 'default' ? 1
          : a.label.localeCompare(b.label),
      );
  });

  async function changeTheme(fileName: string) {
    if (!fileName || busy) return;
    busy = true;
    error = '';
    try {
      await applyTheme(fileName);
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Could not change theme';
    } finally {
      busy = false;
    }
  }
</script>

<!-- The open theme drives the selection, so applies from the Themes panel or
     another tab show up here too. -->
<LabeledSelect
  label="Theme"
  items={themes}
  value={$openThemeSlug}
  disabled={busy}
  {error}
  onchange={changeTheme}
/>
