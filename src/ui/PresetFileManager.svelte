<script lang="ts">
  import { stopPropagation } from 'svelte/legacy';

  import { onMount } from 'svelte';
  import type { Preset, PresetMeta } from '../lib/themeTypes';
  import {
    listPresets,
    deletePreset,
    captureCurrentAsPreset,
    captureProductionAsPreset,
    applyPreset,
    applyPresetToProduction,
    compareActiveToProduction,
    getActivePreset,
  } from '../lib/presetService';
  import { sanitizeFileName } from '../lib/themeService';
  import { dirty, componentDirty } from '../lib/editorStore';
  import { productionRevision, presetProductionComparison } from '../lib/productionPulse';
  import UIDialog from './UIDialog.svelte';
  import UIInfoPopover from './UIInfoPopover.svelte';
  import UnsavedComponentsDialog from './UnsavedComponentsDialog.svelte';
  import SaveAsDialog from '../component-editor/scaffolding/SaveAsDialog.svelte';

  let files: PresetMeta[] = $state([]);
  let showFileList = $state(false);
  let saveAsDialog = $state(false);
  let captureProdDialog = $state(false);

  let activeFileName = $state('default');
  let currentDisplayName = $state('Default Preset');
  let activePreset = $state<Preset | null>(null);

  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');
  let applyStatus: 'idle' | 'applying' = $state('idle');
  let prodApplyStatus: 'idle' | 'applying' | 'done' | 'error' = $state('idle');
  let prodCaptureStatus: 'idle' | 'saving' | 'saved' | 'error' = $state('idle');

  let unsavedDialog = $state(false);
  /** Pending capture target while UnsavedComponentsDialog is open. The dialog
   *  resolves to either "save the preset using current on-disk files" (proceed)
   *  or "user cancelled / closed". */
  let pendingCapture: { fileName: string; displayName: string } | null = null;

  let dirtyComponentIds = $derived(
    Object.entries($componentDirty)
      .filter(([, isDirty]) => isDirty)
      .map(([id]) => id),
  );

  /** True when there are unsaved theme/component edits that won't make it into
   *  the next preset Save (capture reads on-disk files, not the editor). */
  let presetStale = $derived(dirtyComponentIds.length > 0 || $dirty);

  let isDefaultActive = $derived(activeFileName === 'default');

  let prodStatus = $derived($presetProductionComparison?.status ?? 'editor-only');
  let prodPresetName = $derived($presetProductionComparison?.productionPreset?.name ?? '—');
  let prodIsInSync = $derived(prodStatus === 'in-production');
  let prodIsDiverged = $derived(prodStatus === 'diverged');
  /** Editor row is "live" when this preset IS the one in production AND
   *  nothing's pending — mirrors the cfm-row-editor.applied rule so the green
   *  dot vocabulary is consistent across components and presets. */
  let editorIsApplied = $derived(prodIsInSync && !presetStale);

  async function refreshFiles() {
    try {
      files = await listPresets();
      const active = files.find((f) => f.isActive);
      if (active) {
        activeFileName = active.fileName;
        currentDisplayName = active.name;
      }
    } catch {
      // silent — empty list
    }
  }

  async function refreshActive() {
    try {
      const active = await getActivePreset();
      if (active) {
        activePreset = active;
        activeFileName = active._fileName ?? activeFileName;
        currentDisplayName = active.name;
      }
    } catch {
      // silent
    }
  }

  async function refreshProductionComparison() {
    if (!activePreset) return;
    try {
      $presetProductionComparison = await compareActiveToProduction(activePreset);
    } catch {
      // silent — leave previous comparison in place
    }
  }

  onMount(async () => {
    await refreshActive();
    await refreshFiles();
    await refreshProductionComparison();
  });

  // Re-compare when any production pointer ticks (per-component Adopt,
  // theme production change, or our own apply). Skip the initial tick on
  // mount — refreshProductionComparison runs there already. Plain closure
  // variable (not $state) so writing it doesn't add a reactive dependency
  // back to the effect.
  let pulseInitialised = false;
  $effect(() => {
    void $productionRevision;
    if (!pulseInitialised) {
      pulseInitialised = true;
      return;
    }
    refreshProductionComparison();
  });

  /** Standard "save dirty editor first?" gate. If any component has unsaved
   *  edits, defer to UnsavedComponentsDialog (which can save them in place);
   *  callers receive `false` and the dialog's "proceed" path re-invokes the
   *  capture with the pending args. Returns `true` if the caller can capture
   *  immediately (no dirty components). */
  function gateDirtyCapture(fileName: string, displayName: string): boolean {
    if (dirtyComponentIds.length === 0 && !$dirty) return true;
    pendingCapture = { fileName, displayName };
    unsavedDialog = true;
    return false;
  }

  function handleUnsavedProceed() {
    const target = pendingCapture;
    pendingCapture = null;
    if (target) doCapture(target.fileName, target.displayName);
  }

  async function doCapture(fileName: string, displayName: string) {
    saveStatus = 'saving';
    try {
      await captureCurrentAsPreset(fileName, displayName);
      activeFileName = fileName;
      currentDisplayName = displayName;
      saveStatus = 'saved';
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
      await refreshFiles();
      await refreshActive();
      await refreshProductionComparison();
    } catch {
      saveStatus = 'error';
      setTimeout(() => { saveStatus = 'idle'; }, 3000);
    }
  }

  async function handleApplyToProduction() {
    if (!activeFileName) return;
    prodApplyStatus = 'applying';
    try {
      await applyPresetToProduction(activeFileName);
      // applyPresetToProduction bakes css; refresh comparison so the
      // Production card flips to the live state.
      await refreshProductionComparison();
      prodApplyStatus = 'done';
      setTimeout(() => { prodApplyStatus = 'idle'; }, 2000);
    } catch {
      prodApplyStatus = 'error';
      setTimeout(() => { prodApplyStatus = 'idle'; }, 3000);
    }
  }

  function openCaptureFromProduction() {
    captureProdDialog = true;
  }

  async function confirmCaptureFromProduction(detail: { displayName: string; fileName: string }) {
    const { displayName, fileName } = detail;
    prodCaptureStatus = 'saving';
    try {
      await captureProductionAsPreset(fileName, displayName);
      await refreshFiles();
      prodCaptureStatus = 'saved';
      setTimeout(() => { prodCaptureStatus = 'idle'; }, 2000);
    } catch {
      prodCaptureStatus = 'error';
      setTimeout(() => { prodCaptureStatus = 'idle'; }, 3000);
    }
  }

  async function handleSave() {
    // Default is the protected initial-distribution preset — disabled in the
    // UI when active, but guard here too. Callers in that state should route
    // through Save As (which seeds an incremented name).
    if (isDefaultActive) return;
    if (!gateDirtyCapture(activeFileName, currentDisplayName)) return;
    await doCapture(activeFileName, currentDisplayName);
  }

  function openSaveAs() {
    showFileList = false;
    saveAsDialog = true;
  }

  async function confirmSaveAs(detail: { displayName: string; fileName: string }) {
    const { displayName, fileName } = detail;
    if (!gateDirtyCapture(fileName, displayName)) return;
    await doCapture(fileName, displayName);
  }

  async function handleApply(file: PresetMeta) {
    if ($dirty) {
      const ok = window.confirm(
        'Loading a preset will reload the editor and discard unsaved changes. Continue?',
      );
      if (!ok) return;
    }
    showFileList = false;
    applyStatus = 'applying';
    try {
      await applyPreset(file.fileName);
      // Page reload: simplest path — editor rehydrates from the now-active
      // theme + component configs the server just pinned for us.
      window.location.reload();
    } catch (err) {
      applyStatus = 'idle';
      window.alert(`Failed to apply preset: ${(err as Error).message}`);
    }
  }

  async function handleDelete(file: PresetMeta) {
    if (file.fileName === 'default') return;
    try {
      await deletePreset(file.fileName);
      await refreshFiles();
      if (file.fileName === activeFileName) {
        activeFileName = 'default';
        currentDisplayName = 'Default Preset';
      }
    } catch {
      // silent
    }
  }

  function toggleFileList() {
    showFileList = !showFileList;
    if (showFileList) refreshFiles();
  }
</script>

<div class="preset-file-manager">
  <div class="pfm-header">
    <span class="pfm-header-label">Preset</span>
    <UIInfoPopover title="Presets" ariaLabel="About presets">
      <p>
        A <strong>preset</strong> saves a theme plus all component configurations as one bundle.
      </p>
    </UIInfoPopover>
  </div>

  <div class="pfm-cards" class:in-sync={prodIsInSync}>
    <div
      class="pfm-card pfm-card-editor"
      class:dirty={presetStale}
      class:applied={editorIsApplied}
    >
      <span class="pfm-rail" aria-hidden="true"></span>
      <div class="pfm-card-head">
        <span class="pfm-card-label">Editor</span>
        <span
          class="pfm-card-status"
          class:dirty={presetStale}
          class:applied={editorIsApplied}
        >
          <i class="pfm-status-dot" aria-hidden="true"></i>
          <span>{presetStale ? 'unsaved' : editorIsApplied ? 'live' : 'saved'}</span>
        </span>
      </div>
      <div class="pfm-pill" class:dirty={presetStale} class:applied={editorIsApplied}>
        <span class="pfm-pill-name" title={currentDisplayName}>{currentDisplayName}</span>
      </div>
      {#if presetStale}
        <span class="pfm-stale-note" aria-live="polite">unsaved edits won't be captured</span>
      {/if}
      <div class="pfm-card-actions pfm-card-actions-stack">
        <button
          class="pfm-btn pfm-btn-row save-btn"
          class:saving={saveStatus === 'saving'}
          class:saved={saveStatus === 'saved'}
          class:error={saveStatus === 'error'}
          onclick={handleSave}
          disabled={saveStatus === 'saving' || applyStatus === 'applying' || isDefaultActive}
          title={isDefaultActive
            ? 'Default is read-only — use Save As to capture under a new name'
            : 'Capture the current theme + component configs into this preset'}
        >
          <i
            class="fas"
            class:fa-save={saveStatus === 'idle'}
            class:fa-spinner={saveStatus === 'saving'}
            class:fa-check={saveStatus === 'saved'}
            class:fa-times={saveStatus === 'error'}
          ></i>
          <span>
            {#if saveStatus === 'idle'}Save{:else if saveStatus === 'saving'}Saving{:else if saveStatus === 'saved'}Saved{:else}Error{/if}
          </span>
        </button>
        <button class="pfm-btn pfm-btn-row" onclick={openSaveAs} title="Save as new preset">
          <i class="fas fa-copy"></i>
          <span>Save As…</span>
        </button>
        <button
          class="pfm-btn pfm-btn-row"
          class:active={showFileList}
          onclick={toggleFileList}
          disabled={applyStatus === 'applying'}
          title="Load a preset"
        >
          <i class="fas fa-folder-open"></i>
          <span>Load…</span>
        </button>
      </div>
    </div>

    <button
      class="pfm-adopt-btn"
      class:saving={prodApplyStatus === 'applying'}
      class:saved={prodApplyStatus === 'done'}
      class:error={prodApplyStatus === 'error'}
      class:in-sync={prodIsInSync}
      onclick={handleApplyToProduction}
      disabled={prodApplyStatus === 'applying' || prodIsInSync}
      title={prodIsInSync
        ? 'This preset is already in production'
        : prodIsDiverged
          ? `Re-adopt "${currentDisplayName}" — discards individual component adopts`
          : `Adopt "${currentDisplayName}" as the production preset`}
    >
      <i
        class="fas"
        class:fa-arrow-down={prodApplyStatus === 'idle'}
        class:fa-spinner={prodApplyStatus === 'applying'}
        class:fa-check={prodApplyStatus === 'done'}
        class:fa-xmark={prodApplyStatus === 'error'}
      ></i>
      <span>
        {#if prodApplyStatus === 'idle'}Adopt{:else if prodApplyStatus === 'applying'}Adopting{:else if prodApplyStatus === 'done'}Adopted{:else}Error{/if}
      </span>
    </button>

    <div
      class="pfm-card pfm-card-production"
      class:in-sync={prodIsInSync}
      class:diverged={prodIsDiverged}
    >
      <span class="pfm-rail" aria-hidden="true"></span>
      <div class="pfm-card-head">
        <span class="pfm-card-label">Production</span>
        <span
          class="pfm-card-status"
          class:applied={prodIsInSync}
          class:diverged={prodIsDiverged}
        >
          <i class="pfm-status-dot" aria-hidden="true"></i>
          <span>
            {#if prodIsInSync}live{:else if prodIsDiverged}diverged{:else}out of sync{/if}
          </span>
        </span>
      </div>
      <div class="pfm-pill" class:applied={prodIsInSync} class:diverged={prodIsDiverged}>
        <span class="pfm-pill-name" title={prodPresetName}>{prodPresetName}</span>
      </div>
      {#if prodIsDiverged && $presetProductionComparison}
        <span class="pfm-diverged-note" aria-live="polite">
          {$presetProductionComparison.driftedComponents.length > 0
            ? `${$presetProductionComparison.driftedComponents.length} component${
                $presetProductionComparison.driftedComponents.length === 1 ? '' : 's'
              } adopted individually`
            : 'theme production differs from this preset'}
        </span>
      {/if}
      {#if prodIsDiverged}
        <div class="pfm-card-actions">
          <button
            class="pfm-btn pfm-btn-wide"
            onclick={openCaptureFromProduction}
            disabled={prodCaptureStatus === 'saving'}
            title="Save the current production state as a new named preset"
          >
            <i
              class="fas"
              class:fa-bookmark={prodCaptureStatus === 'idle'}
              class:fa-spinner={prodCaptureStatus === 'saving'}
              class:fa-check={prodCaptureStatus === 'saved'}
              class:fa-times={prodCaptureStatus === 'error'}
            ></i>
            <span>
              {#if prodCaptureStatus === 'idle'}Capture as preset{:else if prodCaptureStatus === 'saving'}Saving{:else if prodCaptureStatus === 'saved'}Saved{:else}Error{/if}
            </span>
          </button>
        </div>
      {/if}
    </div>
  </div>

  {#if applyStatus === 'applying'}
    <span class="apply-status">Applying preset…</span>
  {/if}
</div>

<UIDialog bind:show={showFileList} title="Load Preset" cancelLabel="Close" width="420px">
  <div class="load-list">
    {#each files as file}
      <div class="load-item" class:active={file.fileName === activeFileName}>
        <button class="load-name-btn" onclick={() => handleApply(file)}>
          {file.name}
        </button>
        {#if file.fileName === activeFileName}
          <span class="active-badge">active</span>
        {/if}
        {#if file.fileName !== 'default'}
          <button
            class="file-delete-btn"
            onclick={stopPropagation(() => handleDelete(file))}
            title="Delete {file.name}"
          >
            <i class="fas fa-trash-alt"></i>
          </button>
        {/if}
      </div>
    {/each}
    {#if files.length === 0}
      <div class="load-item empty">No saved presets</div>
    {/if}
  </div>
</UIDialog>

<SaveAsDialog
  bind:show={saveAsDialog}
  {currentDisplayName}
  {files}
  title="Save Preset As"
  placeholder="Preset name…"
  reservedNameMessage='The name "default" is reserved for the initial distribution.'
  onsave={confirmSaveAs}
/>

<SaveAsDialog
  bind:show={captureProdDialog}
  currentDisplayName={prodPresetName}
  {files}
  title="Capture Production as Preset"
  placeholder="Preset name…"
  reservedNameMessage='The name "default" is reserved for the initial distribution.'
  onsave={confirmCaptureFromProduction}
/>

<UnsavedComponentsDialog
  bind:show={unsavedDialog}
  dirtyComponents={dirtyComponentIds}
  onproceed={handleUnsavedProceed}
/>

<style>
  .preset-file-manager {
    --pfm-applied: #5aa85e;
    --pfm-rail-neutral: var(--ui-border-default);
    --pfm-rail-dirty: var(--ui-highlight);
    --pfm-rail-applied: var(--pfm-applied);

    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .pfm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-4);
    padding: 0 var(--ui-space-4);
  }

  .pfm-header-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ── two-card pipeline (Editor → Production) ─────────────────────────────
     Mirrors the cfm-rows pattern in ComponentFileManager so the preset reads
     as the same kind of artifact as themes and components, just one level up. */
  .pfm-cards {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .pfm-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-10) var(--ui-space-16);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
  }

  .pfm-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    background: var(--pfm-rail-neutral);
    transition: background var(--ui-transition-base);
  }

  .pfm-card-editor.dirty .pfm-rail { background: var(--pfm-rail-dirty); }
  .pfm-card-editor.applied .pfm-rail { background: var(--pfm-rail-applied); }
  .pfm-card-production.in-sync .pfm-rail { background: var(--pfm-rail-applied); }
  .pfm-card-production.diverged .pfm-rail { background: var(--ui-highlight); }

  .pfm-card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .pfm-card-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ui-text-secondary);
    line-height: 1.1;
  }

  .pfm-card-status {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: 0.7rem;
    letter-spacing: 0.02em;
    color: var(--ui-text-muted);
    line-height: 1;
  }

  .pfm-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .pfm-card-status.dirty,
  .pfm-card-status.diverged {
    color: var(--ui-highlight);
  }

  .pfm-card-status.dirty .pfm-status-dot,
  .pfm-card-status.diverged .pfm-status-dot {
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent);
    animation: pfm-pulse 1.6s ease-in-out infinite;
  }

  .pfm-card-status.applied {
    color: var(--pfm-applied);
  }
  .pfm-card-status.applied .pfm-status-dot {
    opacity: 1;
  }

  /* filename pill — matches the cfm-pill vocabulary so the editor side and
     the preset side use one visual idiom for "this is a named file". */
  .pfm-pill {
    display: flex;
    align-items: center;
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    transition: border-color var(--ui-transition-fast), box-shadow var(--ui-transition-fast);
  }

  .pfm-pill.dirty {
    border-color: color-mix(in srgb, var(--ui-highlight) 60%, var(--ui-border-subtle));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ui-highlight) 35%, transparent);
  }

  .pfm-pill.applied {
    border-color: color-mix(in srgb, var(--pfm-applied) 50%, var(--ui-border-subtle));
  }

  .pfm-pill.diverged {
    border-color: color-mix(in srgb, var(--ui-highlight) 50%, var(--ui-border-subtle));
  }

  .pfm-pill-name {
    flex: 1;
    min-width: 0;
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pfm-stale-note,
  .pfm-diverged-note {
    font-size: 0.7rem;
    letter-spacing: 0.02em;
    color: var(--ui-highlight);
    line-height: 1.2;
  }

  .pfm-card-actions {
    display: flex;
    gap: var(--ui-space-4);
    flex-wrap: wrap;
  }

  /* Stack variant — Save / Save As / Load as left-aligned rows. */
  .pfm-card-actions-stack {
    flex-direction: column;
  }

  .pfm-btn-row {
    width: 100%;
    justify-content: flex-start;
    gap: var(--ui-space-8);
    flex: 0 0 auto;
    text-align: left;
  }

  .pfm-btn-row i {
    width: 1rem;
    text-align: center;
    flex: 0 0 auto;
  }

  .pfm-btn-row span {
    flex: 1 1 auto;
    text-align: left;
  }

  /* Bridge button — lives between the Editor and Production cards so the
     promote action visually IS the arrow that connects them. Matches the
     .cfm-btn.primary geometry (--ui-radius-md, --ui-space-6/12 padding) so
     it reads as the same affordance as the per-component Adopt. */
  .pfm-adopt-btn {
    align-self: stretch;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-6);
    margin: calc(var(--ui-space-2) * -1) 0;
    padding: var(--ui-space-6) var(--ui-space-12);
    background: color-mix(in srgb, var(--pfm-applied) 18%, var(--ui-surface-high));
    border: 1px solid color-mix(in srgb, var(--pfm-applied) 45%, var(--ui-border-medium));
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
    position: relative;
    z-index: 1;
  }

  .pfm-adopt-btn i {
    width: 1rem;
    text-align: center;
    font-size: 0.85em;
  }

  .pfm-adopt-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--pfm-applied) 30%, var(--ui-surface-higher));
    border-color: color-mix(in srgb, var(--pfm-applied) 70%, var(--ui-border-strong));
  }

  .pfm-adopt-btn:disabled {
    cursor: not-allowed;
  }

  .pfm-adopt-btn.in-sync {
    background: transparent;
    border-color: var(--ui-border-subtle);
    color: var(--ui-text-muted);
    opacity: 0.7;
  }

  .pfm-adopt-btn.saving i { animation: spin 1s linear infinite; }
  .pfm-adopt-btn.saved {
    background: color-mix(in srgb, var(--pfm-applied) 30%, var(--ui-surface-high));
    color: var(--pfm-applied);
  }
  .pfm-adopt-btn.error { color: var(--ui-text-muted); }

  .pfm-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-4);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-medium);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    white-space: nowrap;
    flex: 1 1 0;
    min-width: 0;
  }

  .pfm-btn i {
    width: 1rem;
    text-align: center;
    font-size: 0.85em;
  }

  .pfm-btn:hover:not(:disabled) {
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .pfm-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .pfm-btn.active {
    background: var(--ui-surface);
    border-color: var(--ui-border-default);
    color: var(--ui-text-primary);
  }

  .pfm-btn-wide {
    flex: 1 1 100%;
    width: 100%;
  }

  .save-btn {
    background: var(--ui-surface-high);
    border-color: var(--ui-border-medium);
    color: var(--ui-text-primary);
  }

  .save-btn:hover:not(:disabled) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-strong);
  }

  .save-btn.saving i { animation: spin 1s linear infinite; }
  .save-btn.saved {
    background: var(--ui-surface-highest);
    color: var(--ui-text-success);
  }
  .save-btn.error {
    background: var(--ui-surface-high);
    color: var(--ui-text-muted);
  }


  .load-list {
    display: flex;
    flex-direction: column;
    max-height: 60vh;
    overflow-y: auto;
  }

  .load-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    border-bottom: 1px solid #2a2a2a;
  }

  .load-item:last-child {
    border-bottom: none;
  }

  .load-item.empty {
    padding: 16px;
    color: #888;
    font-size: 14px;
    text-align: center;
  }

  .load-name-btn {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 6px 4px;
    background: none;
    border: none;
    color: #aaa;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    border-radius: 3px;
  }

  .load-name-btn:hover {
    color: #e0e0e0;
  }

  .load-item.active .load-name-btn {
    color: #e0e0e0;
    font-weight: 600;
  }

  .active-badge {
    flex-shrink: 0;
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 3px;
    background: #333;
    color: #ccc;
  }

  .file-delete-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    color: #555;
    font-size: 12px;
    cursor: pointer;
    opacity: 0;
  }

  .load-item:hover .file-delete-btn {
    opacity: 1;
  }

  .file-delete-btn:hover {
    color: #ccc;
  }

  .apply-status {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    padding: 0 var(--ui-space-4);
    letter-spacing: 0.02em;
  }

  @keyframes pfm-pulse {
    0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent); }
    50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--ui-highlight) 10%, transparent); }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
