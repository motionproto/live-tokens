<script lang="ts">
  import { onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import {
    editorState,
    beginScope,
    commitScope,
    cancelScope,
    beginSliderGesture,
    setCustomColor,
    removeCustomColor,
    replaceAndRemoveCustomColor,
    type Scope,
  } from '../../core/store/editorStore';
  import type { Oklch } from '../../core/palettes/oklch';
  import ColorEditPanel from '../ColorEditPanel.svelte';
  import CustomColorReplaceStep from '../CustomColorReplaceStep.svelte';

  interface Props {
    copiedVar?: string | null;
    oncopy?: (variable: string) => void;
  }

  let { copiedVar = null, oncopy }: Props = $props();

  const PREFIX = '--color-custom-';
  const customNumber = (v: string) => v.slice(PREFIX.length);

  let tokens = $derived(
    [...$editorState.customColors.tokens]
      .sort((a, b) => Number(customNumber(a.variable)) - Number(customNumber(b.variable))),
  );

  /** An open edit of one custom colour, or the replace step of its remove. */
  interface Session {
    mode: 'edit' | 'replace';
    variable: string;
    draft: Oklch;
  }
  let session = $state<Session | null>(null);
  // Held outside $state: the store matches an open scope by identity, and a
  // proxied handle would never match.
  let sessionScope: Scope | null = null;

  function tokenColor(variable: string): Oklch | undefined {
    return get(editorState).customColors.tokens.find((t) => t.variable === variable)?.color;
  }

  function openEdit(variable: string) {
    const color = tokenColor(variable);
    if (!color) return;
    sessionScope = beginScope({ label: `edit custom colour ${variable}`, collapseToOne: true, clipUndoFloor: true });
    session = { mode: 'edit', variable, draft: { ...color } };
  }

  function editDraft(h: number, c: number, lPct: number) {
    if (!session) return;
    session.draft = { l: lPct / 100, c, h };
    setCustomColor(session.variable, session.draft);
  }

  function closeEdit(commit: boolean) {
    if (sessionScope) {
      if (commit) commitScope(sessionScope);
      else cancelScope(sessionScope);
    }
    sessionScope = null;
    session = null;
  }

  function requestRemove(variable: string) {
    if (removeCustomColor(variable)) return;
    const color = tokenColor(variable);
    if (color) session = { mode: 'replace', variable, draft: { ...color } };
  }

  function confirmReplace(replacement: string) {
    if (!session) return;
    const { variable } = session;
    session = null;
    replaceAndRemoveCustomColor(variable, replacement);
  }

  onDestroy(() => {
    if (sessionScope) cancelScope(sessionScope);
  });
</script>

<section class="section" id="custom-colors">
  <h2 class="section-title">Custom Colours</h2>
  <p class="editor-intro">A custom colour holds its own OKLCH value, and every slot that names it follows its edits. Add one from the Custom row of any colour picker. Removing a colour in use first asks which token takes its place.</p>
  {#if tokens.length === 0}
    <p class="custom-empty">This theme has no custom colours.</p>
  {:else}
    <div class="custom-grid">
      {#each tokens as token (token.variable)}
        {@const active = session?.variable === token.variable}
        <div class={['custom-item', { active }]}>
          <div class="custom-box" style="background: var({token.variable});"></div>
          <div class="token-info">
            <button class={['token-variable copyable', { copied: copiedVar === token.variable }]} onclick={() => oncopy?.(token.variable)}>{copiedVar === token.variable ? 'copied!' : token.variable}</button>
            {#if !active}
              <div class="custom-actions">
                <button
                  class="custom-btn"
                  aria-label="Edit {token.variable}"
                  disabled={session !== null}
                  onclick={() => openEdit(token.variable)}
                >Edit</button>
                <button
                  class="custom-btn"
                  aria-label="Remove {token.variable}"
                  disabled={session !== null}
                  onclick={() => requestRemove(token.variable)}
                >Remove</button>
              </div>
            {/if}
          </div>
          {#if active && session}
            <div class="custom-editor-host">
              {#if session.mode === 'edit'}
                <ColorEditPanel
                  title="Custom › {customNumber(session.variable)}"
                  hue={session.draft.h}
                  chroma={session.draft.c}
                  lightness={session.draft.l * 100}
                  onHueChromaChange={editDraft}
                  onSliderStart={() => beginSliderGesture(`edit ${session?.variable ?? 'custom colour'}`)}
                  onConfirm={() => closeEdit(true)}
                  onCancel={() => closeEdit(false)}
                />
              {:else}
                <CustomColorReplaceStep
                  variable={session.variable}
                  color={session.draft}
                  onconfirm={confirmReplace}
                  oncancel={() => (session = null)}
                />
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
  }

  .section-title {
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--ui-space-8);
    border-bottom: 2px solid var(--ui-border-high);
  }

  .editor-intro,
  .custom-empty {
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  .token-variable.copyable {
    all: unset;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    cursor: pointer;
    transition: color var(--ui-transition-fast);
  }

  .token-variable.copyable:hover {
    color: var(--ui-text-accent);
  }

  .token-variable.copyable.copied {
    color: var(--ui-text-success);
  }

  .custom-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
    gap: var(--ui-space-16);
  }

  .custom-item {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-lg);
    background: var(--ui-surface-lowest);
    min-width: 0;
  }

  .custom-item.active {
    grid-column: 1 / -1;
    border-color: var(--ui-text-primary);
  }

  .custom-box {
    height: 3rem;
    border-radius: var(--ui-radius-md);
  }

  .token-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
  }

  .custom-actions {
    display: flex;
    gap: var(--ui-space-4);
  }

  .custom-btn {
    padding: var(--ui-space-2) var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
    font-family: inherit;
  }

  .custom-btn:hover:not(:disabled) {
    color: var(--ui-text-primary);
    border-color: var(--ui-border);
  }

  .custom-btn:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .custom-editor-host {
    max-width: 28rem;
    margin-top: var(--ui-space-8);
    padding-top: var(--ui-space-12);
    border-top: 1px dashed var(--ui-border-low);
  }
</style>
