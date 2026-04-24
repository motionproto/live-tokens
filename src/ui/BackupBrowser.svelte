<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Dialog from '../components/Dialog.svelte';
  import {
    listBackups,
    getBackupContent,
    getCurrentCss,
    loadTheme,
    restoreBackup,
    type BackupEntry,
  } from '../lib/themeService';
  import { activeFileName } from '../lib/editorConfigStore';

  export let open = false;

  const dispatch = createEventDispatcher<{ close: void; restored: { type: string } }>();

  let backups: BackupEntry[] = [];
  let selected: BackupEntry | null = null;
  let backupContent = '';
  let currentContent = '';
  let diffLines: DiffLine[] = [];
  let loading = false;
  let restoring = false;
  let restoreConfirm = false;
  let filterType: 'all' | 'css' | 'themes' = 'all';

  interface DiffLine {
    type: 'same' | 'add' | 'remove' | 'context';
    lineOld?: number;
    lineNew?: number;
    text: string;
  }

  $: filteredBackups = filterType === 'all'
    ? backups
    : backups.filter(b => b.type === filterType);

  $: if (open) loadBackups();

  async function loadBackups() {
    loading = true;
    try {
      backups = await listBackups();
    } catch {
      backups = [];
    }
    loading = false;
  }

  async function selectBackup(backup: BackupEntry) {
    selected = backup;
    restoreConfirm = false;
    loading = true;
    try {
      backupContent = await getBackupContent(backup.type, backup.file);
      if (backup.type === 'css') {
        currentContent = await getCurrentCss();
      } else {
        const themeData = await loadTheme(backup.name);
        currentContent = JSON.stringify(themeData, null, 2);
        try {
          backupContent = JSON.stringify(JSON.parse(backupContent), null, 2);
        } catch { /* keep as-is */ }
      }
      diffLines = computeDiff(backupContent, currentContent);
    } catch {
      diffLines = [];
    }
    loading = false;
  }

  async function handleRestore() {
    if (!selected) return;
    restoring = true;
    try {
      await restoreBackup(selected.type, selected.file);
      restoreConfirm = false;
      dispatch('restored', { type: selected.type });
      await loadBackups();
      await selectBackup(selected);
    } catch {
      // silent
    }
    restoring = false;
  }

  function close() {
    open = false;
    selected = null;
    diffLines = [];
    restoreConfirm = false;
    dispatch('close');
  }

  function formatTimestamp(ts: string): string {
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch {
      return ts;
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  // ── LCS-based line diff ──────────────────────────────────

  function computeDiff(oldText: string, newText: string): DiffLine[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const ops = myersDiff(oldLines, newLines);
    const result: DiffLine[] = [];
    let oldIdx = 0;
    let newIdx = 0;

    for (const op of ops) {
      if (op === 'equal') {
        result.push({ type: 'same', lineOld: oldIdx + 1, lineNew: newIdx + 1, text: oldLines[oldIdx] });
        oldIdx++;
        newIdx++;
      } else if (op === 'delete') {
        result.push({ type: 'remove', lineOld: oldIdx + 1, text: oldLines[oldIdx] });
        oldIdx++;
      } else if (op === 'insert') {
        result.push({ type: 'add', lineNew: newIdx + 1, text: newLines[newIdx] });
        newIdx++;
      }
    }

    return collapseUnchanged(result);
  }

  function myersDiff(a: string[], b: string[]): ('equal' | 'delete' | 'insert')[] {
    const n = a.length;
    const m = b.length;
    const max = n + m;
    const v: Record<number, number> = { 1: 0 };
    const trace: Record<number, number>[] = [];

    for (let d = 0; d <= max; d++) {
      const vSnap: Record<number, number> = {};
      for (const k in v) vSnap[Number(k)] = v[Number(k)];
      trace.push(vSnap);

      for (let k = -d; k <= d; k += 2) {
        let x: number;
        if (k === -d || (k !== d && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) {
          x = v[k + 1] ?? 0;
        } else {
          x = (v[k - 1] ?? 0) + 1;
        }
        let y = x - k;
        while (x < n && y < m && a[x] === b[y]) {
          x++;
          y++;
        }
        v[k] = x;
        if (x >= n && y >= m) {
          return backtrack(trace, a, b);
        }
      }
    }
    return [];
  }

  function backtrack(trace: Record<number, number>[], a: string[], b: string[]): ('equal' | 'delete' | 'insert')[] {
    let x = a.length;
    let y = b.length;
    const ops: ('equal' | 'delete' | 'insert')[] = [];

    for (let d = trace.length - 1; d > 0; d--) {
      const v = trace[d - 1];
      const k = x - y;
      let prevK: number;
      if (k === -d || (k !== d && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }
      const prevX = v[prevK] ?? 0;
      const prevY = prevX - prevK;

      while (x > prevX && y > prevY) {
        ops.push('equal');
        x--;
        y--;
      }
      if (x > prevX) {
        ops.push('delete');
        x--;
      } else if (y > prevY) {
        ops.push('insert');
        y--;
      }
    }
    while (x > 0 && y > 0) {
      ops.push('equal');
      x--;
      y--;
    }
    return ops.reverse();
  }

  function collapseUnchanged(lines: DiffLine[], contextSize = 3): DiffLine[] {
    const keep = new Array(lines.length).fill(false);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].type !== 'same') {
        for (let j = Math.max(0, i - contextSize); j <= Math.min(lines.length - 1, i + contextSize); j++) {
          keep[j] = true;
        }
      }
    }

    const result: DiffLine[] = [];
    let skipping = false;
    for (let i = 0; i < lines.length; i++) {
      if (keep[i]) {
        skipping = false;
        result.push(lines[i]);
      } else if (!skipping) {
        skipping = true;
        result.push({ type: 'context', text: '...' });
      }
    }
    return result;
  }
</script>

<Dialog
  bind:show={open}
  title="Backup History"
  showConfirm={false}
  showCancel={false}
  width="90vw"
  onCancel={close}
>
  <div class="browser-header">
    <div class="filter-tabs">
      <button class:active={filterType === 'all'} on:click={() => filterType = 'all'}>All</button>
      <button class:active={filterType === 'css'} on:click={() => filterType = 'css'}>CSS</button>
      <button class:active={filterType === 'themes'} on:click={() => filterType = 'themes'}>Themes</button>
    </div>
    {#if selected}
      <div class="diff-actions">
        {#if restoreConfirm}
          <span class="restore-warn">Restore this backup?</span>
          <button class="action-btn confirm" on:click={handleRestore} disabled={restoring}>
            {restoring ? 'Restoring...' : 'Confirm'}
          </button>
          <button class="action-btn cancel" on:click={() => restoreConfirm = false}>Cancel</button>
        {:else}
          <button class="action-btn restore" on:click={() => restoreConfirm = true}>
            <i class="fas fa-undo"></i> Restore
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <div class="browser-body">
    <div class="backup-list">
      {#if loading && !selected}
        <div class="empty-state">Loading...</div>
      {:else if filteredBackups.length === 0}
        <div class="empty-state">No backups yet</div>
      {:else}
        {#each filteredBackups as backup}
          <button
            class="backup-item"
            class:selected={selected?.file === backup.file}
            on:click={() => selectBackup(backup)}
          >
            <span class="backup-badge" class:css={backup.type === 'css'} class:theme={backup.type === 'themes'}>
              {backup.type === 'css' ? 'CSS' : 'THM'}
            </span>
            <div class="backup-info">
              <span class="backup-name">{backup.name}</span>
              <span class="backup-meta">{formatTimestamp(backup.timestamp)} &middot; {formatSize(backup.size)}</span>
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <div class="diff-panel">
      {#if !selected}
        <div class="empty-state">Select a backup to view changes</div>
      {:else if loading}
        <div class="empty-state">Loading diff...</div>
      {:else}
        <div class="diff-meta">
          <span class="backup-badge" class:css={selected.type === 'css'} class:theme={selected.type === 'themes'}>
            {selected.type === 'css' ? 'CSS' : 'THM'}
          </span>
          <strong>{selected.name}</strong>
          <span class="diff-timestamp">{formatTimestamp(selected.timestamp)}</span>
        </div>
        <div class="diff-legend">
          <span class="legend-item legend-remove">
            <span class="legend-swatch"></span> Backup (restore to this)
          </span>
          <span class="legend-item legend-add">
            <span class="legend-swatch"></span> Current file
          </span>
        </div>
        <div class="diff-content">
          {#each diffLines as line}
            {#if line.type === 'context'}
              <div class="diff-line context">
                <span class="line-num"></span>
                <span class="line-num"></span>
                <span class="line-text">{line.text}</span>
              </div>
            {:else if line.type === 'remove'}
              <div class="diff-line remove">
                <span class="line-num">{line.lineOld ?? ''}</span>
                <span class="line-num"></span>
                <span class="line-text">- {line.text}</span>
              </div>
            {:else if line.type === 'add'}
              <div class="diff-line add">
                <span class="line-num"></span>
                <span class="line-num">{line.lineNew ?? ''}</span>
                <span class="line-text">+ {line.text}</span>
              </div>
            {:else}
              <div class="diff-line same">
                <span class="line-num">{line.lineOld ?? ''}</span>
                <span class="line-num">{line.lineNew ?? ''}</span>
                <span class="line-text">  {line.text}</span>
              </div>
            {/if}
          {/each}
          {#if diffLines.length === 0}
            <div class="empty-state">Files are identical</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</Dialog>

<style>
  .browser-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--ui-space-12);
    border-bottom: 1px solid var(--border-neutral-subtle);
    margin-bottom: var(--ui-space-12);
  }

  .filter-tabs {
    display: flex;
    gap: 2px;
    background: var(--surface-neutral-low, #1a1a1a);
    border-radius: var(--ui-radius-md);
    padding: 2px;
  }

  .filter-tabs button {
    padding: var(--ui-space-4) var(--ui-space-12);
    font-size: var(--ui-font-size-sm);
    background: none;
    border: none;
    color: var(--text-tertiary);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .filter-tabs button:hover { color: var(--text-secondary); }
  .filter-tabs button.active { background: var(--surface-neutral-medium, #333); color: var(--text-primary); }

  .diff-actions {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  .restore-warn {
    font-size: var(--ui-font-size-sm);
    color: var(--text-warning, #e6a030);
  }

  .action-btn {
    padding: var(--ui-space-4) var(--ui-space-12);
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-medium);
    border: 1px solid var(--border-neutral-subtle);
    border-radius: var(--ui-radius-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .action-btn.restore {
    background: var(--surface-success-low, #1a2a1a);
    color: var(--text-success, #8ecf8e);
    border-color: var(--border-success-subtle, #2a4a2a);
  }
  .action-btn.restore:hover { background: var(--surface-success-medium, #2a3a2a); }

  .action-btn.confirm {
    background: var(--surface-success-medium, #3a5a3a);
    color: var(--text-success-strong, #c0f0c0);
    border-color: var(--border-success-medium, #4a7a4a);
  }
  .action-btn.confirm:hover { background: var(--surface-success-high, #4a6a4a); }
  .action-btn.confirm:disabled { opacity: var(--ui-opacity-disabled, 0.5); cursor: not-allowed; }

  .action-btn.cancel {
    background: var(--surface-neutral-low, #1a1a1a);
    color: var(--text-secondary);
  }
  .action-btn.cancel:hover { background: var(--surface-neutral-medium, #2a2a2a); }

  /* ── Layout ── */
  .browser-body {
    display: flex;
    height: 60vh;
    min-width: 0;
    border: 1px solid var(--border-neutral-subtle);
    border-radius: var(--ui-radius-md);
    overflow: hidden;
  }

  /* ── Backup list ── */
  .backup-list {
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid var(--border-neutral-subtle);
    overflow-y: auto;
    background: var(--surface-neutral-lowest, #0d0d0d);
  }

  @media (max-width: 1280px) {
    .backup-list {
      width: 180px;
    }
  }

  @media (max-width: 1024px) {
    .backup-list {
      width: 140px;
    }
    .line-num {
      width: 32px;
    }
  }

  .backup-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    width: 100%;
    padding: var(--ui-space-8) var(--ui-space-12);
    background: none;
    border: none;
    border-bottom: 1px solid var(--border-neutral-faint, #1a1a1a);
    color: var(--text-tertiary);
    cursor: pointer;
    text-align: left;
    transition: background var(--ui-transition-fast);
  }
  .backup-item:hover { background: var(--ui-hover-low, rgba(255,255,255,0.04)); }
  .backup-item.selected { background: var(--surface-neutral-low, #1f1f1f); color: var(--text-primary); }

  .backup-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 2px 6px;
    border-radius: var(--ui-radius-sm);
    flex-shrink: 0;
  }
  .backup-badge.css { background: var(--surface-success-low, #1a3a2a); color: var(--text-success, #6dcf97); }
  .backup-badge.theme { background: var(--surface-warning-low, #2a2a1a); color: var(--text-warning, #cfb86d); }

  .backup-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .backup-name {
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-medium);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .backup-meta {
    font-size: var(--ui-font-size-xs);
    color: var(--text-muted);
  }

  /* ── Diff panel ── */
  .diff-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--surface-neutral-lowest, #0a0a0a);
  }

  .diff-meta {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8) var(--ui-space-16);
    border-bottom: 1px solid var(--border-neutral-faint);
    font-size: var(--ui-font-size-sm);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .diff-timestamp {
    color: var(--text-muted);
    font-weight: 400;
  }

  .diff-legend {
    display: flex;
    gap: var(--ui-space-16);
    padding: var(--ui-space-4) var(--ui-space-16);
    border-bottom: 1px solid var(--border-neutral-faint);
    flex-shrink: 0;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: var(--text-muted);
  }

  .legend-swatch {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }

  .legend-remove .legend-swatch { background: rgba(220, 80, 80, 0.25); border: 1px solid rgba(220, 80, 80, 0.4); }
  .legend-add .legend-swatch { background: rgba(80, 180, 80, 0.25); border: 1px solid rgba(80, 180, 80, 0.4); }

  .diff-content {
    flex: 1;
    overflow: auto;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.5;
  }

  .diff-line {
    display: flex;
    white-space: pre;
    min-width: fit-content;
  }

  .line-num {
    width: 44px;
    flex-shrink: 0;
    text-align: right;
    padding-right: 8px;
    color: var(--text-muted, #444);
    user-select: none;
    border-right: 1px solid var(--border-neutral-faint, #1a1a1a);
  }

  .line-text {
    padding: 0 12px;
    flex: 1;
  }

  .diff-line.same { color: var(--text-muted, #777); }
  .diff-line.same:hover { background: rgba(255, 255, 255, 0.02); }

  .diff-line.remove {
    background: rgba(220, 80, 80, 0.12);
    color: #e09090;
  }
  .diff-line.remove .line-num { color: #a06060; }

  .diff-line.add {
    background: rgba(80, 180, 80, 0.12);
    color: #90c890;
  }
  .diff-line.add .line-num { color: #60a060; }

  .diff-line.context {
    color: var(--text-muted, #444);
    padding: var(--ui-space-4) 0;
    justify-content: center;
    font-style: italic;
  }
  .diff-line.context .line-num { border: none; }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 80px;
    color: var(--text-muted);
    font-size: var(--ui-font-size-sm);
  }
</style>
