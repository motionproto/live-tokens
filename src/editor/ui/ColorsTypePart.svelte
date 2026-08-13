<script lang="ts">
  // The Colors & Type part of the Theme panel: what the theme's colors and type
  // are right now, and whether production is running them. It is a layer of the
  // theme, not a file the user manages, so there is no save, no save as and no
  // file list here. Loading colors and type happens in the Theme panel's own
  // Load window, with the toggle.
  import { listThemes, setProductionFile } from '../core/themes/themeService';
  import { listManifests, saveAsManifest } from '../core/manifests/manifestService';
  import { fontPairingLabel } from '../core/fonts/fontPairing';
  import { activeFileName } from '../core/store/editorConfigStore';
  import { dirty, editorState } from '../core/store/editorStore';
  import { bumpProductionRevision, themeProductionInfo } from '../core/productionPulse';
  import { flashStatus } from '../core/flashStatus';
  import FilePill from './FilePill.svelte';

  interface Props {
    /** Display name of the active colors and type file, read by the panel. */
    displayName: string;
    /** Flush the editor's unsaved colors and type to the active file. */
    onsave: (payload: { fileName: string; displayName: string }) => Promise<void>;
    /** Re-read a colors and type file into the editor (discard). */
    onload: (payload: { fileName: string }) => void;
  }

  let { displayName, onsave, onload }: Props = $props();

  type ProdApplyStatus = 'idle' | 'applying' | 'done' | 'error';
  let prodApplyStatus: ProdApplyStatus = $state('idle');
  const setProdApplyStatus = (s: ProdApplyStatus) => (prodApplyStatus = s);

  let prodIsInSync = $derived($themeProductionInfo?.fileName === $activeFileName);
  let editorIsApplied = $derived(prodIsInSync && !$dirty);
  let prodName = $derived($themeProductionInfo?.name ?? '—');

  let pairing = $derived(fontPairingLabel($editorState.fonts.stacks, $editorState.fonts.sources));

  // Adopt writes files the user never named, so both auto-names step past
  // anything on disk rather than clobbering a file made earlier.
  function freshName(base: string, taken: Set<string>): string {
    if (!taken.has(base)) return base;
    for (let n = 1; n < 1000; n++) {
      const candidate = `${base}_${String(n).padStart(2, '0')}`;
      if (!taken.has(candidate)) return candidate;
    }
    return `${base}_${Date.now()}`;
  }

  async function handleApplyToProduction() {
    // The default colors and type are read-only, so unsaved edits on them have
    // nowhere to go. Give them a file of their own and carry on: the user
    // clicked one button, and the file name is bookkeeping now that the theme
    // above is the artifact.
    if ($activeFileName === 'default' && $dirty) {
      prodApplyStatus = 'applying';
      try {
        const taken = new Set((await listThemes()).map((f) => f.fileName));
        await onsave({ fileName: freshName('my-colors', taken), displayName: 'My Colors' });
      } catch {
        flashStatus(setProdApplyStatus, 'error', { durationMs: 3000 });
        return;
      }
    }

    // Already adopted with nothing unsaved to push.
    if (prodIsInSync && !$dirty) return;

    prodApplyStatus = 'applying';
    try {
      // Flush unsaved edits to the active file first, so production adopts the
      // current editor state rather than a stale on-disk snapshot.
      if ($dirty) await onsave({ fileName: $activeFileName, displayName });
      await setProductionFile($activeFileName);
      bumpProductionRevision();
      flashStatus(setProdApplyStatus, 'done');
    } catch (err) {
      const e = err as Error & { code?: string };
      if (e.code === 'ACTIVE_IS_PROTECTED') {
        // The protected Default theme is active — auto-create a user theme and
        // retry. No dialog: the user clicked Adopt, and which theme file the
        // adoption lands in is bookkeeping they shouldn't have to think about.
        prodApplyStatus = 'idle';
        try {
          const taken = new Set((await listManifests()).map((m) => m.fileName));
          await saveAsManifest(freshName('my-theme', taken), 'My Theme');
        } catch {
          flashStatus(setProdApplyStatus, 'error', { durationMs: 3000 });
          return;
        }
        await handleApplyToProduction();
        return;
      }
      flashStatus(setProdApplyStatus, 'error', { durationMs: 3000 });
    }
  }

  // Two-step arm pattern. First click flips `revertArmed` so the button
  // morphs into a "Discard?" affordance; second click commits. Click-out,
  // Escape, a 3s timeout, or the dirty flag clearing all disarm.
  let revertArmed = $state(false);
  let revertTimer: ReturnType<typeof setTimeout> | null = null;

  function disarmRevert() {
    revertArmed = false;
    if (revertTimer) {
      clearTimeout(revertTimer);
      revertTimer = null;
    }
  }

  function handleRevert() {
    if (!$dirty) return;
    if (!revertArmed) {
      revertArmed = true;
      revertTimer = setTimeout(disarmRevert, 3000);
      return;
    }
    disarmRevert();
    onload({ fileName: $activeFileName });
  }

  $effect(() => {
    if (!$dirty && revertArmed) disarmRevert();
  });

  $effect(() => {
    if (!revertArmed) return;
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.ctp-revert-btn')) disarmRevert();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') disarmRevert();
    };
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<div class="colors-type-part">
  <div class="ctp-cards" class:in-sync={prodIsInSync}>
    <div
      class="ctp-card ctp-card-editor"
      class:dirty={$dirty}
      class:applied={editorIsApplied}
    >
      <span class="ctp-rail" aria-hidden="true"></span>
      <div class="ctp-card-head">
        <span class="ctp-card-label">Editor</span>
        <span
          class="ctp-card-status"
          class:dirty={$dirty}
          class:applied={editorIsApplied}
        >
          <i class="ctp-status-dot" aria-hidden="true"></i>
          <span>{$dirty ? 'unsaved' : editorIsApplied ? 'live' : 'saved'}</span>
          {#if $dirty}
            <button
              type="button"
              class="ctp-revert-btn"
              class:armed={revertArmed}
              onclick={handleRevert}
              title={revertArmed
                ? 'Click again to discard unsaved changes'
                : 'Revert to last saved version'}
              aria-label={revertArmed ? 'Confirm discard unsaved changes' : 'Revert unsaved changes'}
            >
              <i class="fas fa-rotate-left" aria-hidden="true"></i>
              {#if revertArmed}<span class="ctp-revert-label">Discard?</span>{/if}
            </button>
          {/if}
        </span>
      </div>
      <dl class="ctp-identity">
        <dt>Colors</dt>
        <dd title={displayName}>{displayName}</dd>
        <dt>Type</dt>
        <dd title={pairing}>{pairing || '—'}</dd>
      </dl>
    </div>

    <button
      class="ctp-adopt-btn"
      class:saving={prodApplyStatus === 'applying'}
      class:saved={prodApplyStatus === 'done'}
      class:error={prodApplyStatus === 'error'}
      class:in-sync={prodIsInSync}
      onclick={handleApplyToProduction}
      disabled={prodApplyStatus === 'applying' || prodIsInSync}
      title={prodIsInSync
        ? 'These colors and type are already in production'
        : `Adopt "${displayName}" for production`}
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
      class="ctp-card ctp-card-production"
      class:in-sync={prodIsInSync}
    >
      <span class="ctp-rail" aria-hidden="true"></span>
      <div class="ctp-card-head">
        <span class="ctp-card-label">Production</span>
        <span
          class="ctp-card-status"
          class:applied={prodIsInSync}
        >
          <i class="ctp-status-dot" aria-hidden="true"></i>
          <span>{prodIsInSync ? 'live' : 'out of sync'}</span>
        </span>
      </div>
      <FilePill
        name={prodName}
        isProtected={$themeProductionInfo?.fileName === 'default'}
        applied={prodIsInSync}
        protectedTitle="Protected default colors and type"
        title={prodName}
        style="display: flex;"
      />
    </div>
  </div>
</div>

<style>
  .colors-type-part {
    --ctp-applied: #5aa85e;
    --ctp-rail-neutral: var(--ui-border);
    --ctp-rail-dirty: var(--ui-highlight);
    --ctp-rail-applied: var(--ctp-applied);

    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  /* Two-card pipeline (Editor → Production). The Theme panel this part sits
     in tracks active vs default rather than editor vs production. */
  .ctp-cards {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .ctp-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    padding: var(--ui-space-8) var(--ui-space-10) var(--ui-space-10) var(--ui-space-16);
    background: var(--ui-surface-lower);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .ctp-rail {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: var(--ui-radius-md) 0 0 var(--ui-radius-md);
    background: var(--ctp-rail-neutral);
    transition: background var(--ui-transition-base);
  }

  .ctp-card-editor.dirty .ctp-rail { background: var(--ctp-rail-dirty); }
  .ctp-card-editor.applied .ctp-rail { background: var(--ctp-rail-applied); }
  .ctp-card-production.in-sync .ctp-rail { background: var(--ctp-rail-applied); }

  .ctp-card-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .ctp-card-label {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    line-height: 1.1;
  }

  .ctp-card-status {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: 0.7rem;
    color: var(--ui-text-muted);
    line-height: 1;
  }

  .ctp-status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .ctp-card-status.dirty {
    color: var(--ui-highlight);
  }

  .ctp-card-status.dirty .ctp-status-dot {
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent);
    animation: ctp-pulse 1.6s ease-in-out infinite;
  }

  .ctp-card-status.applied {
    color: var(--ctp-applied);
  }
  .ctp-card-status.applied .ctp-status-dot {
    opacity: 1;
  }

  /* Read-only identity: what the theme's colors and type are, not a file to
     act on. */
  .ctp-identity {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--ui-space-2) var(--ui-space-8);
    margin: 0;
    font-size: var(--ui-font-size-sm);
  }

  .ctp-identity dt {
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-xs);
    line-height: 1.4;
  }

  .ctp-identity dd {
    margin: 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--ui-text-secondary);
    line-height: 1.4;
  }

  /* Revert button — paired with the "unsaved" status label. Lives only when
     dirty, in the highlight color so it reads as part of the status group
     rather than a peer of the action stack below. Two-step arm: first click
     adds .armed (label appears, fills with highlight), second click commits. */
  .ctp-revert-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 18px;
    margin-left: 2px;
    padding: 0 4px;
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--ui-highlight) 35%, transparent);
    border-radius: 4px;
    color: var(--ui-highlight);
    font-size: 0.65rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.85;
    overflow: hidden;
    transition:
      background var(--ui-transition-fast),
      border-color var(--ui-transition-fast),
      color var(--ui-transition-fast),
      opacity var(--ui-transition-fast),
      padding var(--ui-transition-fast);
  }

  .ctp-revert-btn:hover {
    background: color-mix(in srgb, var(--ui-highlight) 18%, transparent);
    border-color: color-mix(in srgb, var(--ui-highlight) 65%, transparent);
    opacity: 1;
  }

  .ctp-revert-btn:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--ui-highlight) 60%, transparent);
    outline-offset: 1px;
  }

  .ctp-revert-btn i {
    font-size: 0.65rem;
    transition: transform var(--ui-transition-fast);
  }

  .ctp-revert-btn.armed {
    background: var(--ui-highlight);
    border-color: var(--ui-highlight);
    color: var(--ui-surface-lowest, #111);
    opacity: 1;
    padding: 0 6px;
  }

  .ctp-revert-btn.armed i {
    transform: rotate(-35deg);
  }

  .ctp-revert-label {
    font-weight: var(--ui-font-weight-semibold, 600);
    white-space: nowrap;
  }

  /* Time-window cue — thin bar drains across the bottom edge as the 3s
     auto-disarm window elapses. Pure CSS, runs once per arm cycle. */
  .ctp-revert-btn.armed::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    height: 2px;
    width: 100%;
    background: color-mix(in srgb, var(--ui-surface-lowest, #111) 70%, transparent);
    transform-origin: left center;
    animation: ctp-revert-drain 3s linear forwards;
  }

  @keyframes ctp-revert-drain {
    from { transform: scaleX(1); }
    to   { transform: scaleX(0); }
  }

  /* Bridge button — sits between Editor and Production cards as the arrow that
     promotes the editor colors and type into production. */
  .ctp-adopt-btn {
    align-self: stretch;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--ui-space-6);
    margin: calc(var(--ui-space-2) * -1) 0;
    padding: var(--ui-space-6) var(--ui-space-12);
    background: color-mix(in srgb, var(--ctp-applied) 18%, var(--ui-surface-high));
    border: 1px solid color-mix(in srgb, var(--ctp-applied) 45%, var(--ui-border-high));
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

  .ctp-adopt-btn i {
    width: 1rem;
    text-align: center;
    font-size: 0.85em;
  }

  .ctp-adopt-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--ctp-applied) 30%, var(--ui-surface-higher));
    border-color: color-mix(in srgb, var(--ctp-applied) 70%, var(--ui-border-higher));
  }

  .ctp-adopt-btn:disabled {
    cursor: not-allowed;
  }

  .ctp-adopt-btn.in-sync {
    background: transparent;
    border-color: var(--ui-border-low);
    color: var(--ui-text-muted);
    opacity: 0.7;
  }

  .ctp-adopt-btn.saving i { animation: spin 1s linear infinite; }
  .ctp-adopt-btn.saved {
    background: color-mix(in srgb, var(--ctp-applied) 30%, var(--ui-surface-high));
    color: var(--ctp-applied);
  }
  .ctp-adopt-btn.error { color: var(--ui-text-muted); }

  @keyframes ctp-pulse {
    0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--ui-highlight) 22%, transparent); }
    50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--ui-highlight) 10%, transparent); }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
