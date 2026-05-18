<script lang="ts">
  import type { FontSource } from '../core/themes/themeTypes';
  import { editorState, setFontSources, transaction } from '../core/store/editorStore';
  import { applyFontSources, applyFontStacks } from '../core/fonts/fontLoader';
  import {
    buildSourceFromFontFaceText,
    buildSourceFromUrl,
    discoverFamiliesFromUrl,
    parseFontFaceText,
    type ParsedFamily,
  } from '../core/fonts/fontParse';
  import UIPillButton from './UIPillButton.svelte';

  type AddMode = 'closed' | 'url' | 'fontface';
  interface Props { addMode?: AddMode }
  let { addMode = $bindable('closed') }: Props = $props();

  // URL paste — accepts a bare URL, a `<link>` tag, or an `@import url(...)` block.
  let urlInput = $state('');
  let urlError = $state('');
  let urlDiscovering = $state(false);
  let urlParsed: ParsedFamily[] | null = $state(null);
  let urlPickedNames = $state(new Set<string>());
  let urlNeedsManualFamilies = $state(false);
  let urlManualFamilies = $state('');

  // @font-face paste
  let fontFaceText = $state('');
  let fontFaceParsed: ParsedFamily[] = $state([]);

  function reset() {
    addMode = 'closed';
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

  // Pull a fonts URL out of whatever the user pastes: bare URL, link tag,
  // @import url(...), or a full style-tag wrapper around an @import.
  function extractFontsUrl(raw: string): string | null {
    const text = raw.trim();
    if (!text) return null;
    const href = text.match(/href\s*=\s*["']([^"']+)["']/i);
    if (href) return href[1];
    const importUrl = text.match(/@import\s+url\(\s*['"]?([^'")]+)['"]?\s*\)/i);
    if (importUrl) return importUrl[1];
    const importBare = text.match(/@import\s+['"]([^'"]+)['"]/i);
    if (importBare) return importBare[1];
    if (/^https?:\/\//i.test(text)) return text;
    return null;
  }

  let fontSourcesList = $derived($editorState.fonts.sources);
  let fontStacksList = $derived($editorState.fonts.stacks);

  function commitSources(next: FontSource[]) {
    setFontSources(next);
    applyFontSources(next);
    applyFontStacks(fontStacksList, next);
  }

  async function discoverUrl() {
    urlError = '';
    urlParsed = null;
    urlNeedsManualFamilies = false;
    const url = extractFontsUrl(urlInput);
    if (!url) {
      urlError = "Couldn't find a fonts URL in that paste";
      return;
    }
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
    const url = extractFontsUrl(urlInput);
    if (!url) {
      urlError = "Couldn't find a fonts URL in that paste";
      return;
    }
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

  let expanded = $state(new Set<string>());
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
                    onclick={() => toggleExpanded(fam.id)}
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
                  onclick={() => removeFamily(source.id, fam.id)}
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
    <div class="pf-add-toggle-row">
      <UIPillButton icon="fa-plus" onclick={() => (addMode = 'url')}>Add Font</UIPillButton>
    </div>
  {:else}
    <div class="pf-add-panel">
      <div class="pf-add-tabs">
        <button type="button" class:active={addMode === 'url'} onclick={() => (addMode = 'url')}>Paste URL or embed</button>
        <button type="button" class:active={addMode === 'fontface'} onclick={() => (addMode = 'fontface')}>@font-face</button>
        <button type="button" class="pf-add-close" onclick={reset} aria-label="Cancel">×</button>
      </div>

      {#if addMode === 'url'}
        <p class="pf-hint">
          Pick fonts on
          <a href="https://fonts.google.com/selection/embed" target="_blank" rel="noopener noreferrer">Google Fonts <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></a>,
          copy either the <code>&lt;link&gt;</code> tag or the <code>@import</code> block, and paste it below. Any CSS URL (Typekit, custom host) also works.
        </p>
        <textarea
          class="ui-form-input pf-textarea pf-url-input"
          placeholder={'<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">\n\nor\n\n@import url(\'https://fonts.googleapis.com/css2?...\');\n\nor just the URL'}
          rows="4"
          bind:value={urlInput}
        ></textarea>
        <div class="pf-row">
          <UIPillButton variant="secondary" onclick={discoverUrl} disabled={!urlInput.trim() || urlDiscovering}>
            {urlDiscovering ? 'Checking…' : 'Detect families'}
          </UIPillButton>
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
                    onchange={(e) => {
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
          <UIPillButton variant="primary" onclick={addUrlSource}>Add {urlPickedNames.size} selected</UIPillButton>
        {:else if urlNeedsManualFamilies}
          <div class="pf-detected">Couldn't auto-detect families (CORS or no metadata). Name them:</div>
          <input
            type="text"
            class="ui-form-input"
            placeholder="Comma-separated family names"
            bind:value={urlManualFamilies}
          />
          <UIPillButton variant="primary" onclick={addUrlSource} disabled={!urlManualFamilies.trim()}>Add</UIPillButton>
        {/if}
      {:else if addMode === 'fontface'}
        <textarea
          class="ui-form-input pf-textarea"
          placeholder={'Paste one or more @font-face { ... } rules'}
          rows="6"
          bind:value={fontFaceText}
          oninput={parseFontFaceTextInput}
        ></textarea>
        {#if fontFaceParsed.length > 0}
          <div class="pf-detected">Detected: {fontFaceParsed.map((f) => f.name).join(', ')}</div>
        {/if}
        <UIPillButton variant="primary" onclick={addFontFaceSource} disabled={fontFaceParsed.length === 0}>Add</UIPillButton>
      {/if}
    </div>
  {/if}
</section>

<style>
  .project-fonts {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    max-width: 56rem;
  }

  .pf-header {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-12);
    justify-content: space-between;
  }

  .group-title {
    margin: 0;
    font-size: var(--ui-font-size-lg);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
  }

  .pf-empty {
    margin: 0;
    padding: var(--ui-space-8) 0;
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-sm);
  }

  .pf-sources {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .pf-source {
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    display: flex;
    flex-direction: column;
  }

  .pf-source-head {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8) var(--ui-space-12);
    border-bottom: 1px solid var(--ui-border-low);
    background: var(--ui-surface-subtle, rgba(255,255,255,0.02));
    border-radius: var(--ui-radius-md) var(--ui-radius-md) 0 0;
  }

  .pf-kind-badge {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    border: 1px solid var(--ui-border-low);
    padding: 0 var(--ui-space-4);
    border-radius: var(--ui-radius-sm);
    font-family: var(--ui-font-mono);
  }

  .pf-source-label {
    font-size: var(--ui-font-size-lg);
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-medium);
  }

  .pf-source-url {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
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
    font-size: var(--ui-font-size-sm);
    line-height: 1;
  }
  .pf-family-disclosure:hover,
  .pf-family-remove:hover {
    color: var(--ui-text-primary);
    background: var(--ui-surface-hover, rgba(255,255,255,0.06));
  }
  .pf-family-disclosure i {
    transition: transform var(--ui-transition-fast);
  }
  .pf-family-disclosure.open i { transform: rotate(90deg); }
  .pf-family-disclosure-placeholder {
    width: 24px;
    height: 24px;
    display: inline-block;
  }

  .pf-family-preview {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
    min-width: 1.75rem;
    text-align: center;
    line-height: 1.2;
  }

  .pf-family-name {
    font-size: var(--ui-font-size-sm);
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
    font-size: var(--ui-font-size-xs);
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

  .pf-add-toggle-row {
    display: flex;
  }

  .pf-add-panel {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-8);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
  }

  .pf-add-tabs {
    display: flex;
    gap: var(--ui-space-4);
  }
  .pf-add-tabs button {
    background: none;
    border: 1px solid var(--ui-border-low);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    padding: var(--ui-space-4) var(--ui-space-8);
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
  }
  .pf-add-tabs button:hover {
    color: var(--ui-text-primary);
    border-color: var(--ui-border-high);
  }
  .pf-add-tabs button.active {
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
    border-color: var(--ui-border-higher);
  }
  .pf-add-tabs .pf-add-close {
    margin-left: auto;
  }

  .pf-row {
    display: flex;
    gap: var(--ui-space-8);
    align-items: center;
  }

  .pf-error { color: var(--ui-text-danger, #ff6b6b); font-size: var(--ui-font-size-sm); }

  .pf-detected { color: var(--ui-text-secondary); font-size: var(--ui-font-size-sm); }

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
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
  }
  .pf-check-name { color: var(--ui-text-primary); }
  .pf-check-meta { color: var(--ui-text-tertiary); font-family: var(--ui-font-mono); font-size: var(--ui-font-size-xs); }

  .pf-textarea {
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-xs);
    resize: vertical;
    color: var(--ui-text-primary);
  }
  .pf-textarea::placeholder { color: var(--ui-text-muted); opacity: 1; }

  .pf-url-input {
    white-space: pre;
    overflow-x: auto;
  }

  .pf-hint {
    margin: 0;
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-sm);
    line-height: 1.4;
  }
  .pf-hint a {
    color: var(--ui-text-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1px;
    white-space: nowrap;
  }
  .pf-hint a:hover { text-decoration-thickness: 2px; }
  .pf-hint a i { font-size: 0.75em; margin-left: var(--ui-space-2); }
  .pf-hint code {
    font-family: var(--ui-font-mono);
    font-size: 0.92em;
    padding: 0 var(--ui-space-2);
    background: var(--ui-surface-hover, rgba(255,255,255,0.06));
    border-radius: var(--ui-radius-sm);
  }
</style>
