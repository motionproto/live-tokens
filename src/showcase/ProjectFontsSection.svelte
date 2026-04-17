<script lang="ts">
  import type { FontSource } from '../lib/tokenTypes';
  import { editorState, setFontSources, transaction } from '../lib/editorStore';
  import { applyFontSources, applyFontStacks } from '../lib/fontLoader';
  import {
    buildSourceFromFontFaceText,
    buildSourceFromUrl,
    discoverFamiliesFromUrl,
    parseFontFaceText,
    type ParsedFamily,
  } from '../lib/fontParse';
  import googleFontsData from '../data/google-fonts.json';

  interface GoogleFontEntry { family: string; category: string; variants: number[] }
  const GOOGLE_FONTS: GoogleFontEntry[] = (googleFontsData as any).fonts;

  type AddMode = 'closed' | 'google' | 'url' | 'fontface';
  let addMode: AddMode = 'closed';

  // Google search
  let googleQuery = '';
  $: googleMatches = googleQuery.trim().length >= 1
    ? GOOGLE_FONTS
        .filter((f) => f.family.toLowerCase().includes(googleQuery.toLowerCase()))
        .slice(0, 20)
    : GOOGLE_FONTS.slice(0, 10);

  // URL paste
  let urlInput = '';
  let urlError = '';
  let urlDiscovering = false;
  let urlParsed: ParsedFamily[] | null = null;
  let urlPickedNames = new Set<string>();
  let urlNeedsManualFamilies = false;
  let urlManualFamilies = '';

  // @font-face paste
  let fontFaceText = '';
  let fontFaceParsed: ParsedFamily[] = [];

  function reset() {
    addMode = 'closed';
    googleQuery = '';
    urlInput = '';
    urlError = '';
    urlDiscovering = false;
    urlParsed = null;
    urlPickedNames = new Set();
    urlNeedsManualFamilies = false;
    urlManualFamilies = '';
    fontFaceText = '';
    fontFaceParsed = [];
  }

  $: fontSourcesList = $editorState.fonts.sources;
  $: fontStacksList = $editorState.fonts.stacks;

  function commitSources(next: FontSource[]) {
    setFontSources(next);
    applyFontSources(next);
    applyFontStacks(fontStacksList, next);
  }

  function addGoogleFont(entry: GoogleFontEntry) {
    const weightList = entry.variants.length > 0 ? entry.variants : [400];
    const weightSpec = weightList.length > 1
      ? `wght@${weightList.join(';')}`
      : `wght@${weightList[0]}`;
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(entry.family).replace(/%20/g, '+')}:${weightSpec}&display=swap`;
    const source = buildSourceFromUrl(url, [{ name: entry.family, weights: weightList }]);
    commitSources([...fontSourcesList, source]);
    reset();
  }

  async function discoverUrl() {
    urlError = '';
    urlParsed = null;
    urlNeedsManualFamilies = false;
    const url = urlInput.trim();
    if (!url) return;
    urlDiscovering = true;
    try {
      const found = await discoverFamiliesFromUrl(url);
      if (found && found.length > 0) {
        urlParsed = found;
        urlPickedNames = new Set(found.map((f) => f.name));
      } else {
        urlNeedsManualFamilies = true;
      }
    } catch (e) {
      urlError = 'Discovery failed';
      urlNeedsManualFamilies = true;
    }
    urlDiscovering = false;
  }

  function addUrlSource() {
    const url = urlInput.trim();
    if (!url) return;
    let families: ParsedFamily[] = [];
    if (urlParsed) {
      families = urlParsed.filter((f) => urlPickedNames.has(f.name));
    } else if (urlNeedsManualFamilies) {
      families = urlManualFamilies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name }));
    }
    if (families.length === 0) {
      urlError = 'Pick at least one family';
      return;
    }
    const source = buildSourceFromUrl(url, families);
    commitSources([...fontSourcesList, source]);
    reset();
  }

  function parseFontFaceTextInput() {
    fontFaceParsed = parseFontFaceText(fontFaceText);
  }

  function addFontFaceSource() {
    if (!fontFaceText.trim()) return;
    const families = fontFaceParsed.length > 0 ? fontFaceParsed : [];
    if (families.length === 0) {
      fontFaceParsed = parseFontFaceText(fontFaceText);
      if (fontFaceParsed.length === 0) return;
    }
    const source = buildSourceFromFontFaceText(fontFaceText, families.length > 0 ? families : fontFaceParsed);
    commitSources([...fontSourcesList, source]);
    reset();
  }

  function removeFamily(sourceId: string, familyId: string) {
    const next = fontSourcesList
      .map((s) => (s.id === sourceId ? { ...s, families: s.families.filter((f) => f.id !== familyId) } : s))
      .filter((s) => s.families.length > 0);
    const updatedStacks = fontStacksList.map((stack) => ({
      ...stack,
      slots: stack.slots.filter((slot) => !(slot.kind === 'project' && slot.familyId === familyId)),
    }));
    transaction('remove font family', (s) => {
      s.fonts.sources = next;
      s.fonts.stacks = updatedStacks;
    });
    applyFontSources(next);
    applyFontStacks(updatedStacks, next);
  }

  function sourceKindLabel(source: FontSource): string {
    if (source.kind === 'google') return 'Google';
    if (source.kind === 'typekit') return 'Typekit';
    if (source.kind === 'font-face') return 'Local';
    return 'CSS URL';
  }

  function stacksReferencing(familyId: string): string[] {
    return fontStacksList
      .filter((s) => s.slots.some((slot) => slot.kind === 'project' && slot.familyId === familyId))
      .map((s) => s.variable);
  }

  let expanded = new Set<string>();
  function toggleExpanded(familyId: string) {
    const next = new Set(expanded);
    if (next.has(familyId)) next.delete(familyId); else next.add(familyId);
    expanded = next;
  }
</script>

<section class="project-fonts">
  <header class="pf-header">
    <h3 class="group-title">Project Fonts</h3>
  </header>

  {#if fontSourcesList.length === 0}
    <p class="pf-empty">No fonts loaded yet. Use the add button below.</p>
  {/if}

  <div class="pf-sources">
    {#each fontSourcesList as source (source.id)}
      <div class="pf-source">
        <div class="pf-source-head">
          <span class="pf-kind-badge">{sourceKindLabel(source)}</span>
          <span class="pf-source-label">{source.label ?? source.kind}</span>
          {#if source.url}
            <span class="pf-source-url" title={source.url}>{source.url}</span>
          {/if}
        </div>
        <ul class="pf-family-list">
          {#each source.families as fam (fam.id)}
            {@const refs = stacksReferencing(fam.id)}
            {@const isOpen = expanded.has(fam.id)}
            {@const hasMultipleWeights = !!fam.weights && fam.weights.length > 1}
            <li class="pf-family">
              <div class="pf-family-row">
                {#if hasMultipleWeights}
                  <button
                    type="button"
                    class="pf-family-disclosure"
                    class:open={isOpen}
                    on:click={() => toggleExpanded(fam.id)}
                    aria-label={isOpen ? 'Collapse weights' : 'Expand weights'}
                    aria-expanded={isOpen}
                  ><i class="fas fa-chevron-right" aria-hidden="true"></i></button>
                {:else}
                  <span class="pf-family-disclosure-placeholder" aria-hidden="true"></span>
                {/if}
                <span class="pf-family-preview" style="font-family: {fam.cssName}, sans-serif;">Ag</span>
                <span class="pf-family-name">{fam.name}</span>
                <button
                  type="button"
                  class="pf-family-remove"
                  on:click={() => removeFamily(source.id, fam.id)}
                  aria-label={`Remove ${fam.name}`}
                  title="Remove family"
                ><i class="fas fa-xmark" aria-hidden="true"></i></button>
              </div>
              {#if refs.length > 0}
                <div class="pf-family-meta">
                  <span class="pf-meta-label">Used by</span>
                  <span class="pf-meta-value">
                    {#each refs as r (r)}<span class="pf-meta-pill">{r}</span>{/each}
                  </span>
                </div>
              {/if}
              {#if isOpen && hasMultipleWeights && fam.weights}
                <div class="pf-family-meta">
                  <span class="pf-meta-label">Weights</span>
                  <span class="pf-meta-value pf-meta-weights">{fam.weights.join(', ')}</span>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>

  {#if addMode === 'closed'}
    <button type="button" class="pf-add-toggle" on:click={() => (addMode = 'google')}>+ add font</button>
  {:else}
    <div class="pf-add-panel">
      <div class="pf-add-tabs">
        <button type="button" class:active={addMode === 'google'} on:click={() => (addMode = 'google')}>Google search</button>
        <button type="button" class:active={addMode === 'url'} on:click={() => (addMode = 'url')}>Paste URL</button>
        <button type="button" class:active={addMode === 'fontface'} on:click={() => (addMode = 'fontface')}>@font-face</button>
        <button type="button" class="pf-add-close" on:click={reset} aria-label="Cancel">×</button>
      </div>

      {#if addMode === 'google'}
        <input
          type="text"
          class="form-input"
          placeholder="Search Google Fonts (e.g. Inter)"
          bind:value={googleQuery}
        />
        <ul class="pf-results">
          {#each googleMatches as m (m.family)}
            <li class="pf-result">
              <span class="pf-result-preview" style="font-family: '{m.family}', {m.category};">{m.family}</span>
              <span class="pf-result-meta">{m.category} · {m.variants.length}w</span>
              <button type="button" class="pf-result-add" on:click={() => addGoogleFont(m)}>add</button>
            </li>
          {/each}
          {#if googleMatches.length === 0}
            <li class="pf-no-results">No matches</li>
          {/if}
        </ul>
      {:else if addMode === 'url'}
        <input
          type="text"
          class="form-input"
          placeholder="https://fonts.googleapis.com/css2?family=... or Typekit URL"
          bind:value={urlInput}
        />
        <div class="pf-row">
          <button type="button" class="pf-btn" on:click={discoverUrl} disabled={!urlInput.trim() || urlDiscovering}>
            {urlDiscovering ? 'Checking…' : 'Detect families'}
          </button>
        </div>
        {#if urlError}<div class="pf-error">{urlError}</div>{/if}
        {#if urlParsed}
          <div class="pf-detected">Detected families — pick which to add:</div>
          <ul class="pf-checklist">
            {#each urlParsed as f (f.name)}
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={urlPickedNames.has(f.name)}
                    on:change={(e) => {
                      const target = e.currentTarget;
                      const s = new Set(urlPickedNames);
                      if (target.checked) s.add(f.name); else s.delete(f.name);
                      urlPickedNames = s;
                    }}
                  />
                  <span class="pf-check-name">{f.name}</span>
                  {#if f.weights && f.weights.length > 0}
                    <span class="pf-check-meta">{f.weights.length}w</span>
                  {/if}
                </label>
              </li>
            {/each}
          </ul>
          <button type="button" class="pf-btn primary" on:click={addUrlSource}>Add {urlPickedNames.size} selected</button>
        {:else if urlNeedsManualFamilies}
          <div class="pf-detected">Couldn't auto-detect families (CORS or no metadata). Name them:</div>
          <input
            type="text"
            class="form-input"
            placeholder="Comma-separated family names"
            bind:value={urlManualFamilies}
          />
          <button type="button" class="pf-btn primary" on:click={addUrlSource} disabled={!urlManualFamilies.trim()}>Add</button>
        {/if}
      {:else if addMode === 'fontface'}
        <textarea
          class="form-input pf-textarea"
          placeholder={'Paste one or more @font-face { ... } rules'}
          rows="6"
          bind:value={fontFaceText}
          on:input={parseFontFaceTextInput}
        ></textarea>
        {#if fontFaceParsed.length > 0}
          <div class="pf-detected">Detected: {fontFaceParsed.map((f) => f.name).join(', ')}</div>
        {/if}
        <button type="button" class="pf-btn primary" on:click={addFontFaceSource} disabled={fontFaceParsed.length === 0}>Add</button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .project-fonts {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .pf-header {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
    justify-content: space-between;
  }

  .group-title {
    margin: 0;
    font-size: var(--ui-font-lg);
    color: var(--ui-text-primary);
  }

  .pf-empty {
    margin: 0;
    padding: var(--ui-space-8) 0;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-sm);
  }

  .pf-sources {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .pf-source {
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    display: flex;
    flex-direction: column;
  }

  .pf-source-head {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8) var(--ui-space-12);
    border-bottom: 1px solid var(--ui-border-faint);
    background: var(--ui-surface-subtle, rgba(255,255,255,0.02));
    border-radius: var(--ui-radius-md) var(--ui-radius-md) 0 0;
  }

  .pf-kind-badge {
    font-size: var(--ui-font-xs);
    color: var(--ui-text-tertiary);
    border: 1px solid var(--ui-border-faint);
    padding: 0 var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    font-family: var(--ui-font-mono);
  }

  .pf-source-label {
    font-size: var(--ui-font-lg);
    color: var(--ui-text-primary);
    font-weight: 500;
  }

  .pf-source-url {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-xs);
    color: var(--ui-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  .pf-family-list {
    list-style: none;
    margin: 0;
    padding: var(--ui-space-8);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--ui-space-2) var(--ui-space-8);
  }

  .pf-family {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .pf-family-row {
    display: grid;
    grid-template-columns: 24px 1.75rem 1fr 24px;
    align-items: center;
    gap: var(--ui-space-6);
    padding: 0 var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    min-height: 28px;
  }
  .pf-family-row:hover {
    background: var(--ui-surface-subtle, rgba(255,255,255,0.02));
  }

  .pf-family-disclosure,
  .pf-family-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    cursor: pointer;
    font-size: var(--ui-font-sm);
    line-height: 1;
  }
  .pf-family-disclosure:hover,
  .pf-family-remove:hover {
    color: var(--ui-text-primary);
    background: var(--ui-surface-hover, rgba(255,255,255,0.06));
  }
  .pf-family-disclosure i {
    transition: transform 0.12s ease;
  }
  .pf-family-disclosure.open i { transform: rotate(90deg); }
  .pf-family-disclosure-placeholder {
    width: 24px;
    height: 24px;
    display: inline-block;
  }

  .pf-family-preview {
    font-size: var(--ui-font-md);
    color: var(--ui-text-primary);
    min-width: 1.75rem;
    text-align: center;
    line-height: 1.2;
  }

  .pf-family-name {
    font-size: var(--ui-font-sm);
    color: var(--ui-text-primary);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pf-family-meta {
    display: grid;
    grid-template-columns: 4rem 1fr;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-2) var(--ui-space-4) var(--ui-space-2) calc(24px + var(--ui-space-6) + 1.75rem + var(--ui-space-6));
    font-size: var(--ui-font-xs);
    font-family: var(--ui-font-mono);
  }
  .pf-meta-label { color: var(--ui-text-muted); }
  .pf-meta-value {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-2);
    color: var(--ui-text-tertiary);
    min-width: 0;
  }
  .pf-meta-pill {
    padding: 0 var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    background: var(--ui-surface-hover, rgba(255,255,255,0.06));
    color: var(--ui-text-secondary, var(--ui-text-primary));
  }
  .pf-meta-weights { word-break: break-word; }

  .pf-add-toggle {
    align-self: flex-start;
    background: none;
    border: 1px dashed var(--ui-border-faint);
    color: var(--ui-text-muted);
    font-size: var(--ui-font-sm);
    padding: var(--ui-space-4) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
  }
  .pf-add-toggle:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }

  .pf-add-panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
  }

  .pf-add-tabs {
    display: flex;
    gap: var(--ui-space-4);
  }
  .pf-add-tabs button {
    background: none;
    border: 1px solid var(--ui-border-faint);
    color: var(--ui-text-muted);
    font-size: var(--ui-font-sm);
    padding: var(--ui-space-4) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
  }
  .pf-add-tabs button.active {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }
  .pf-add-tabs .pf-add-close {
    margin-left: auto;
  }

  .pf-row {
    display: flex;
    gap: var(--ui-space-8);
    align-items: center;
  }

  .pf-btn {
    background: none;
    border: 1px solid var(--ui-border-faint);
    color: var(--ui-text-primary);
    font-size: var(--ui-font-sm);
    padding: var(--ui-space-4) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
  }
  .pf-btn:hover:not(:disabled) { border-color: var(--ui-border); }
  .pf-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .pf-btn.primary {
    background: var(--ui-focus, #5eb2ff);
    border-color: var(--ui-focus, #5eb2ff);
    color: #000;
  }

  .pf-error { color: var(--ui-text-danger, #ff6b6b); font-size: var(--ui-font-sm); }

  .pf-detected { color: var(--ui-text-tertiary); font-size: var(--ui-font-sm); }

  .pf-checklist {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }
  .pf-checklist label {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    font-size: var(--ui-font-sm);
    cursor: pointer;
  }
  .pf-check-name { color: var(--ui-text-primary); }
  .pf-check-meta { color: var(--ui-text-tertiary); font-family: var(--ui-font-mono); font-size: var(--ui-font-xs); }

  .pf-results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    max-height: 18rem;
    overflow-y: auto;
  }

  .pf-result {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-4);
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
  }
  .pf-result:hover { border-color: var(--ui-border-faint); }

  .pf-result-preview { font-size: var(--ui-font-lg); color: var(--ui-text-primary); }
  .pf-result-meta { font-size: var(--ui-font-xs); color: var(--ui-text-tertiary); font-family: var(--ui-font-mono); }
  .pf-result-add {
    background: none;
    border: 1px solid var(--ui-border-faint);
    color: var(--ui-text-muted);
    font-size: var(--ui-font-sm);
    padding: 2px var(--ui-space-6);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
  }
  .pf-result-add:hover { color: var(--ui-text-primary); border-color: var(--ui-border); }

  .pf-no-results { color: var(--ui-text-muted); font-size: var(--ui-font-sm); padding: var(--ui-space-4); }

  .pf-textarea {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-xs);
    resize: vertical;
  }
</style>
