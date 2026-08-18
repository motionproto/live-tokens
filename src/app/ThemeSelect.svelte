<script lang="ts">
  import { onMount } from 'svelte';
  import { listThemes, applyTheme } from '../editor/core/themes/themeService';
  import { openThemeSlug } from '../editor/core/store/editorConfigStore';

  let themes = $state<{ fileName: string; name: string }[]>([]);
  let busy = $state(false);
  let error = $state('');
  let selectEl: HTMLSelectElement;

  onMount(async () => {
    const files = await listThemes();
    themes = files
      .map(({ fileName, name }) => ({ fileName, name: name || fileName }))
      .sort((a, b) =>
        a.fileName === 'default' ? -1
          : b.fileName === 'default' ? 1
          : a.name.localeCompare(b.name),
      );
  });

  async function changeTheme(fileName: string) {
    if (busy || fileName === $openThemeSlug) return;
    busy = true;
    error = '';
    try {
      await applyTheme(fileName);
    } catch (reason) {
      selectEl.value = $openThemeSlug;
      error = reason instanceof Error ? reason.message : 'Could not change theme';
    } finally {
      busy = false;
    }
  }
</script>

<!-- The open theme drives the selection, so applies from the Themes panel or
     another tab show up here too. -->
<div class="theme-select">
  <label for="app-theme">Theme</label>
  <div class="select-wrap">
    <select
      id="app-theme"
      bind:this={selectEl}
      value={$openThemeSlug}
      disabled={busy || themes.length === 0}
      aria-describedby={error ? 'app-theme-error' : undefined}
      onchange={(event) => changeTheme(event.currentTarget.value)}
    >
      {#each themes as theme (theme.fileName)}
        <option value={theme.fileName}>{theme.name}</option>
      {/each}
    </select>
    <i class="fas fa-chevron-down" aria-hidden="true"></i>
  </div>
  {#if error}
    <span id="app-theme-error" class="error" aria-live="polite">{error}</span>
  {/if}
</div>

<style>
  .theme-select {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-6);
  }

  label {
    color: var(--text-secondary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-wide);
    line-height: var(--line-height-tighter);
    text-transform: uppercase;
  }

  .select-wrap {
    position: relative;
    width: min(100%, 20rem);
  }

  select {
    box-sizing: border-box;
    width: 100%;
    appearance: none;
    padding: var(--space-10) calc(var(--space-40) + var(--space-4)) var(--space-10) var(--space-12);
    color: var(--text-primary);
    background: color-mix(in srgb, var(--surface-neutral-lower) 88%, transparent);
    border: var(--border-width-1) solid var(--border-neutral-medium);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    font-family: var(--font-sans);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    line-height: var(--line-height-normal);
    cursor: pointer;
  }

  select:hover:not(:disabled) {
    border-color: var(--border-neutral-strong);
  }

  select:focus-visible {
    outline: var(--border-width-2) solid var(--border-brand);
    outline-offset: var(--border-width-2);
  }

  select:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .select-wrap i {
    position: absolute;
    top: 50%;
    right: var(--space-12);
    color: var(--text-secondary);
    font-size: var(--icon-size-sm);
    pointer-events: none;
    transform: translateY(-50%);
  }

  .error {
    max-width: 20rem;
    color: var(--text-danger);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-normal);
  }
</style>
