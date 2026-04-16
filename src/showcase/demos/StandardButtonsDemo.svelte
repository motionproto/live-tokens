<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../../components/Button.svelte';
  import TokenMap from '../TokenMap.svelte';
  import { removeCssVar } from '../../lib/cssVarSync';

  const variantTokens: Record<string, { label: string; variable: string }[]> = {
    primary: [
      { label: 'BG', variable: '--surface-primary-high' },
      { label: 'Border', variable: '--border-primary' },
      { label: 'Text', variable: '--text-primary' },
      { label: 'Hover BG', variable: '--surface-primary-higher' },
      { label: 'Hover Border', variable: '--border-primary-strong' },
    ],
    secondary: [
      { label: 'BG', variable: '--surface-neutral-high' },
      { label: 'Border', variable: '--border-neutral-default' },
      { label: 'Hover BG', variable: '--surface-neutral-higher' },
      { label: 'Hover Border', variable: '--border-neutral-strong' },
    ],
    outline: [
      { label: 'Border', variable: '--border-neutral-default' },
      { label: 'Hover BG', variable: '--hover-low' },
      { label: 'Hover Border', variable: '--border-neutral-strong' },
    ],
    small_secondary: [
      { label: 'BG', variable: '--hover' },
      { label: 'Border', variable: '--border-neutral-default' },
      { label: 'Hover BG', variable: '--hover-high' },
      { label: 'Hover Border', variable: '--border-neutral-strong' },
    ],
    success: [
      { label: 'BG', variable: '--surface-success-low' },
      { label: 'Border', variable: '--border-success' },
      { label: 'Text', variable: '--text-success' },
    ],
    danger: [
      { label: 'BG', variable: '--surface-danger-low' },
      { label: 'Border', variable: '--border-danger' },
      { label: 'Text', variable: '--text-danger' },
    ],
    warning: [
      { label: 'BG', variable: '--surface-warning-low' },
      { label: 'Border', variable: '--border-warning' },
      { label: 'Text', variable: '--text-warning' },
    ],
  };

  let resetKeys: Record<string, number> = {};

  function resetVariant(key: string) {
    for (const t of variantTokens[key]) {
      removeCssVar(t.variable);
    }
    resetKeys[key] = (resetKeys[key] || 0) + 1;
    resetKeys = resetKeys;
  }

  let copiedPrompts: Record<string, string> = {};

  function copyVariantPrompt(key: string) {
    const tokens = variantTokens[key];
    const changes: string[] = [];
    for (const t of tokens) {
      const override = document.documentElement.style.getPropertyValue(t.variable).trim();
      if (override) {
        changes.push(`- Change ${t.label.toLowerCase()} from \`var(${t.variable})\` to \`${override}\``);
      }
    }
    if (changes.length === 0) {
      copiedPrompts[key] = '';
      copiedPrompts = copiedPrompts;
      return;
    }
    const prompt = `In \`src/components/Button.svelte\`, update the **${key}** variant:\n${changes.join('\n')}`;
    navigator.clipboard.writeText(prompt);
    copiedPrompts[key] = prompt;
    copiedPrompts = copiedPrompts;
  }

  function variantHasOverrides(key: string): boolean {
    for (const t of variantTokens[key]) {
      if (document.documentElement.style.getPropertyValue(t.variable).trim()) return true;
    }
    return false;
  }

  let dirtyVariants: Record<string, boolean> = {};

  function updateDirtyState() {
    const next: Record<string, boolean> = {};
    for (const key of Object.keys(variantTokens)) {
      next[key] = variantHasOverrides(key);
    }
    dirtyVariants = next;
  }

  onMount(updateDirtyState);

  $: if (resetKeys) updateDirtyState();
</script>

<div class="demo-block">
  <h2 class="component-title">Standard Button Component</h2>
  <p class="demo-description">
    Reusable button component with multiple variants and sizes. Import from <code>components/Button.svelte</code>
  </p>

  <div class="demo-section variant-group">
    <div class="variant-header">
      <h3 class="demo-subtitle">Primary</h3>
      <div class="variant-actions">
        <button class="variant-action-btn" on:click={() => resetVariant('primary')} title="Reset to defaults">
          <i class="fas fa-undo"></i> Reset
        </button>
        <button class="variant-action-btn" on:click={() => copyVariantPrompt('primary')} title="Copy prompt" disabled={!dirtyVariants['primary']}>
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="primary">Primary</Button>
        <span class="variant-label">primary</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="primary" icon="fas fa-star" iconPosition="left">With Icon</Button>
      </div>
      <div class="button-showcase-item">
        <Button variant="primary" size="default">Default Size</Button>
        <span class="variant-label">size="default"</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="primary" size="small">Small Size</Button>
        <span class="variant-label">size="small"</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="primary" disabled>Disabled</Button>
        <span class="variant-label">disabled</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="primary" fullWidth>Full Width</Button>
        <span class="variant-label">fullWidth</span>
      </div>
    </div>
    {#key resetKeys['primary']}
      <TokenMap title="primary" tokens={variantTokens['primary']} on:change={updateDirtyState} />
    {/key}
    {#if copiedPrompts['primary']}
      <div class="prompt-preview-wrapper">
        <button class="prompt-close" on:click={() => { copiedPrompts['primary'] = ''; copiedPrompts = copiedPrompts; }}><i class="fas fa-times"></i></button>
        <pre class="prompt-preview">{copiedPrompts['primary']}</pre>
      </div>
    {/if}
  </div>

  <div class="demo-section variant-group">
    <div class="variant-header">
      <h3 class="demo-subtitle">Secondary</h3>
      <div class="variant-actions">
        <button class="variant-action-btn" on:click={() => resetVariant('secondary')} title="Reset to defaults">
          <i class="fas fa-undo"></i> Reset
        </button>
        <button class="variant-action-btn" on:click={() => copyVariantPrompt('secondary')} title="Copy prompt" disabled={!dirtyVariants['secondary']}>
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="secondary">Secondary</Button>
        <span class="variant-label">secondary</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="secondary" icon="fas fa-check" iconPosition="right">Icon Right</Button>
      </div>
    </div>
    {#key resetKeys['secondary']}
      <TokenMap title="secondary" tokens={variantTokens['secondary']} on:change={updateDirtyState} />
    {/key}
    {#if copiedPrompts['secondary']}
      <div class="prompt-preview-wrapper">
        <button class="prompt-close" on:click={() => { copiedPrompts['secondary'] = ''; copiedPrompts = copiedPrompts; }}><i class="fas fa-times"></i></button>
        <pre class="prompt-preview">{copiedPrompts['secondary']}</pre>
      </div>
    {/if}
  </div>

  <div class="demo-section variant-group">
    <div class="variant-header">
      <h3 class="demo-subtitle">Outline</h3>
      <div class="variant-actions">
        <button class="variant-action-btn" on:click={() => resetVariant('outline')} title="Reset to defaults">
          <i class="fas fa-undo"></i> Reset
        </button>
        <button class="variant-action-btn" on:click={() => copyVariantPrompt('outline')} title="Copy prompt" disabled={!dirtyVariants['outline']}>
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="outline">Outline</Button>
        <span class="variant-label">outline</span>
      </div>
    </div>
    {#key resetKeys['outline']}
      <TokenMap title="outline" tokens={variantTokens['outline']} on:change={updateDirtyState} />
    {/key}
    {#if copiedPrompts['outline']}
      <div class="prompt-preview-wrapper">
        <button class="prompt-close" on:click={() => { copiedPrompts['outline'] = ''; copiedPrompts = copiedPrompts; }}><i class="fas fa-times"></i></button>
        <pre class="prompt-preview">{copiedPrompts['outline']}</pre>
      </div>
    {/if}
  </div>

  <div class="demo-section variant-group">
    <div class="variant-header">
      <h3 class="demo-subtitle">Small Secondary</h3>
      <div class="variant-actions">
        <button class="variant-action-btn" on:click={() => resetVariant('small_secondary')} title="Reset to defaults">
          <i class="fas fa-undo"></i> Reset
        </button>
        <button class="variant-action-btn" on:click={() => copyVariantPrompt('small_secondary')} title="Copy prompt" disabled={!dirtyVariants['small_secondary']}>
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="small_secondary">Small Secondary</Button>
        <span class="variant-label">small_secondary</span>
      </div>
    </div>
    {#key resetKeys['small_secondary']}
      <TokenMap title="small_secondary" tokens={variantTokens['small_secondary']} on:change={updateDirtyState} />
    {/key}
    {#if copiedPrompts['small_secondary']}
      <div class="prompt-preview-wrapper">
        <button class="prompt-close" on:click={() => { copiedPrompts['small_secondary'] = ''; copiedPrompts = copiedPrompts; }}><i class="fas fa-times"></i></button>
        <pre class="prompt-preview">{copiedPrompts['small_secondary']}</pre>
      </div>
    {/if}
  </div>

  <div class="demo-section variant-group">
    <div class="variant-header">
      <h3 class="demo-subtitle">Success</h3>
      <div class="variant-actions">
        <button class="variant-action-btn" on:click={() => resetVariant('success')} title="Reset to defaults">
          <i class="fas fa-undo"></i> Reset
        </button>
        <button class="variant-action-btn" on:click={() => copyVariantPrompt('success')} title="Copy prompt" disabled={!dirtyVariants['success']}>
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="success">Success</Button>
        <span class="variant-label">success</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="success" icon="fas fa-plus">Add Item</Button>
      </div>
    </div>
    {#key resetKeys['success']}
      <TokenMap title="success" tokens={variantTokens['success']} on:change={updateDirtyState} />
    {/key}
    {#if copiedPrompts['success']}
      <div class="prompt-preview-wrapper">
        <button class="prompt-close" on:click={() => { copiedPrompts['success'] = ''; copiedPrompts = copiedPrompts; }}><i class="fas fa-times"></i></button>
        <pre class="prompt-preview">{copiedPrompts['success']}</pre>
      </div>
    {/if}
  </div>

  <div class="demo-section variant-group">
    <div class="variant-header">
      <h3 class="demo-subtitle">Danger</h3>
      <div class="variant-actions">
        <button class="variant-action-btn" on:click={() => resetVariant('danger')} title="Reset to defaults">
          <i class="fas fa-undo"></i> Reset
        </button>
        <button class="variant-action-btn" on:click={() => copyVariantPrompt('danger')} title="Copy prompt" disabled={!dirtyVariants['danger']}>
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="danger">Danger</Button>
        <span class="variant-label">danger</span>
      </div>
      <div class="button-showcase-item">
        <Button variant="danger" icon="fas fa-trash">Delete</Button>
      </div>
    </div>
    {#key resetKeys['danger']}
      <TokenMap title="danger" tokens={variantTokens['danger']} on:change={updateDirtyState} />
    {/key}
    {#if copiedPrompts['danger']}
      <div class="prompt-preview-wrapper">
        <button class="prompt-close" on:click={() => { copiedPrompts['danger'] = ''; copiedPrompts = copiedPrompts; }}><i class="fas fa-times"></i></button>
        <pre class="prompt-preview">{copiedPrompts['danger']}</pre>
      </div>
    {/if}
  </div>

  <div class="demo-section variant-group">
    <div class="variant-header">
      <h3 class="demo-subtitle">Warning</h3>
      <div class="variant-actions">
        <button class="variant-action-btn" on:click={() => resetVariant('warning')} title="Reset to defaults">
          <i class="fas fa-undo"></i> Reset
        </button>
        <button class="variant-action-btn" on:click={() => copyVariantPrompt('warning')} title="Copy prompt" disabled={!dirtyVariants['warning']}>
          <i class="fas fa-copy"></i> Copy
        </button>
      </div>
    </div>
    <div class="button-showcase-grid">
      <div class="button-showcase-item">
        <Button variant="warning">Warning</Button>
        <span class="variant-label">warning</span>
      </div>
    </div>
    {#key resetKeys['warning']}
      <TokenMap title="warning" tokens={variantTokens['warning']} on:change={updateDirtyState} />
    {/key}
    {#if copiedPrompts['warning']}
      <div class="prompt-preview-wrapper">
        <button class="prompt-close" on:click={() => { copiedPrompts['warning'] = ''; copiedPrompts = copiedPrompts; }}><i class="fas fa-times"></i></button>
        <pre class="prompt-preview">{copiedPrompts['warning']}</pre>
      </div>
    {/if}
  </div>
</div>

<style>
  @import '../../styles/variables.css';

  .variant-group {
    padding: var(--space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--radius-md);
    gap: var(--space-12);
  }

  .variant-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .variant-header .demo-subtitle {
    margin: 0;
  }

  .variant-actions {
    display: flex;
    gap: var(--space-4);
  }

  .variant-action-btn {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-8);
    background: none;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-sm);
    color: var(--ui-text-muted);
    font-size: var(--font-xs);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .variant-action-btn:hover:not(:disabled) {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .variant-action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .prompt-preview-wrapper {
    position: relative;
  }

  .prompt-close {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--ui-text-muted);
    font-size: 0.625rem;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .prompt-close:hover {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .prompt-preview {
    margin: 0;
    padding: var(--space-8) var(--space-10);
    padding-right: var(--space-24);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-sm);
    color: var(--ui-text-secondary);
    font-size: 0.625rem;
    font-family: var(--ui-font-mono);
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }

  .button-showcase-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-16);
    align-items: start;
  }

  .button-showcase-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    align-items: flex-start;
  }

  .variant-label {
    font-size: var(--font-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-6);
    border-radius: var(--radius-sm);
  }
</style>
