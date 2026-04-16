<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '../components/Button.svelte';
  import Notification from '../components/Notification.svelte';
  import Dialog from '../components/Dialog.svelte';
  import RadioButton from '../components/RadioButton.svelte';
  import Card from '../components/Card.svelte';
  import CollapsibleSection from '../components/CollapsibleSection.svelte';
  import TabBar from '../components/TabBar.svelte';
  import Tooltip from '../components/Tooltip.svelte';
  import ProgressBar from '../components/ProgressBar.svelte';
  import Badge from '../components/Badge.svelte';
  import InlineEditActions from '../components/InlineEditActions.svelte';
  import SectionDivider from '../components/SectionDivider.svelte';
  import TokenMap from './TokenMap.svelte';
  import { removeCssVar } from '../lib/cssVarSync';

  export let selectedComponent: string = 'standardButtons';

  // Choice button state
  let selectedChoice = 'option-2';
  function handleChoiceClick(choice: string) {
    selectedChoice = choice;
  }

  // Dialog demo state
  let showDialog = false;

  // Radio button demo state
  let selectedRadio = 'option-b';

  // Tab bar demo state
  let selectedDemoTab = 'overview';
  const demoTabs = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-home' },
    { id: 'details', label: 'Details', icon: 'fas fa-info-circle' },
    { id: 'settings', label: 'Settings', icon: 'fas fa-cog' },
    { id: 'disabled', label: 'Disabled', icon: 'fas fa-ban', disabled: true }
  ];

  // Collapsible section demo state
  let demoExpanded = false;

  // Variant token definitions
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

  const dividerVariants: { variant: 'bg' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special'; label: string }[] = [
    { variant: 'bg', label: 'Background' },
    { variant: 'neutral', label: 'Neutral' },
    { variant: 'alternate', label: 'Alternate' },
    { variant: 'primary', label: 'Primary' },
    { variant: 'accent', label: 'Accent' },
    { variant: 'special', label: 'Special' },
  ];

</script>

<div class="components-container">
  {#if selectedComponent === 'choiceButtons'}
  <div class="demo-block">
    <h2 class="component-title">Button-Based Choice Sets</h2>
    <p class="demo-description">
      Interactive example showing all 4 visual states. Click buttons to see selection state.
    </p>

    <div class="demo-section">
      <h3 class="demo-subtitle">Interactive Example</h3>
      <div class="choice-buttons-container">
        <button
          class="choice-button"
          class:selected={selectedChoice === 'option-1'}
          on:click={() => handleChoiceClick('option-1')}
        >
          <i class="fas fa-star"></i>
          <span>Default/Hover</span>
        </button>

        <button
          class="choice-button"
          class:selected={selectedChoice === 'option-2'}
          on:click={() => handleChoiceClick('option-2')}
        >
          <i class="fas fa-check"></i>
          <span>Selected</span>
        </button>

        <button
          class="choice-button"
          class:selected={selectedChoice === 'option-3'}
          on:click={() => handleChoiceClick('option-3')}
        >
          <i class="fas fa-heart"></i>
          <span>Clickable</span>
        </button>

        <button
          class="choice-button"
          disabled
        >
          <i class="fas fa-ban"></i>
          <span>Disabled</span>
        </button>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">State Reference</h3>
      <div class="state-reference">
        <div class="state-item">
          <div class="state-label">Default</div>
          <div class="state-details">
            <code>background: --surface-neutral-high</code>
            <code>border: 1px --border-neutral-default</code>
          </div>
        </div>

        <div class="state-item">
          <div class="state-label">Hover</div>
          <div class="state-details">
            <code>background: --surface-neutral-higher</code>
            <code>border-color: --border-neutral-strong</code>
          </div>
        </div>

        <div class="state-item">
          <div class="state-label">Selected</div>
          <div class="state-details">
            <code>background: --surface-success-high</code>
            <code>outline: 2px --border-success</code>
          </div>
        </div>

        <div class="state-item">
          <div class="state-label">Disabled</div>
          <div class="state-details">
            <code>opacity: 0.4</code>
            <code>cursor: not-allowed</code>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'standardButtons'}
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
  {/if}

  {#if selectedComponent === 'notifications'}
  <div class="demo-block">
    <h2 class="component-title">Notification Components</h2>
    <p class="demo-description">
      Contextual feedback notifications with multiple variants. Import from <code>components/Notification.svelte</code>
    </p>

    <div class="demo-section">
      <h3 class="demo-subtitle">Variants</h3>
      <div class="notification-showcase">
        <Notification
          variant="info"
          title="Information"
          description="This is an informational message to keep you updated."
        />

        <Notification
          variant="success"
          title="Success"
          description="Your action was completed successfully."
        />

        <Notification
          variant="warning"
          title="Warning"
          description="Caution: This action may have unintended consequences."
        />

        <Notification
          variant="danger"
          title="Danger"
          description="Critical error: Please address this issue immediately."
        />
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">With Impact Text</h3>
      <div class="notification-showcase">
        <Notification
          variant="warning"
          title="Food Shortage"
          description="Your kingdom is running low on food supplies."
          impact="-2 to Economy until resolved"
        />
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">With Action Button</h3>
      <div class="notification-showcase">
        <Notification
          variant="info"
          title="Settlement Unmapped"
          description="This settlement has not been placed on the map yet."
          actionText="Place on Map"
          actionIcon="fas fa-map-marker-alt"
          onAction={() => {}}
        />

        <Notification
          variant="success"
          title="Trade Agreement Available"
          description="A neighboring faction has offered a trade deal."
          actionText="View Details"
          actionIcon="fas fa-handshake"
          onAction={() => {}}
          actionInline={true}
        />
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Compact Size & Emphasis</h3>
      <div class="notification-showcase">
        <Notification
          variant="info"
          title="Compact Notification"
          description="A smaller notification for tighter spaces."
          size="compact"
        />

        <Notification
          variant="danger"
          title="Emphasized Alert"
          description="Important notifications can have emphasis styling."
          emphasis={true}
        />
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Dismissible</h3>
      <div class="notification-showcase">
        <Notification
          variant="success"
          title="Dismissible Notification"
          description="Click the X to dismiss this notification."
          dismissible={true}
        />
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <div class="token-sections">
        <TokenMap title="info" tokens={[
          { label: 'Header BG', variable: '--surface-info-low' },
          { label: 'Border', variable: '--border-info' },
          { label: 'Icon', variable: '--text-info' },
        ]} />
        <TokenMap title="success" tokens={[
          { label: 'Header BG', variable: '--surface-success' },
          { label: 'Border', variable: '--border-success' },
          { label: 'Icon', variable: '--text-success' },
        ]} />
        <TokenMap title="warning" tokens={[
          { label: 'Header BG', variable: '--surface-warning' },
          { label: 'Border', variable: '--border-warning' },
          { label: 'Icon', variable: '--text-warning' },
        ]} />
        <TokenMap title="danger" tokens={[
          { label: 'Header BG', variable: '--surface-primary' },
          { label: 'Border', variable: '--border-danger' },
          { label: 'Icon', variable: '--text-danger' },
        ]} />
      </div>
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'dialog'}
  <div class="demo-block">
    <h2 class="component-title">Dialog Component</h2>
    <p class="demo-description">
      Modal dialog with focus management and slide-in animation. Import from <code>components/Dialog.svelte</code>
    </p>

    <div class="demo-section">
      <Button variant="secondary" icon="fas fa-external-link-alt" on:click={() => showDialog = true}>
        Open Dialog
      </Button>

      <Dialog
        bind:show={showDialog}
        title="Sample Dialog"
        confirmLabel="Save"
        cancelLabel="Cancel"
        on:confirm={() => showDialog = false}
      >
        <p style="color: var(--text-secondary); margin: 0;">This is the dialog body content. It supports any slotted content including forms, lists, or other components.</p>
      </Dialog>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <TokenMap tokens={[
        { label: 'Surface', variable: '--surface-neutral-lowest' },
        { label: 'Border', variable: '--border-neutral-strong' },
        { label: 'Header BG', variable: '--empty' },
        { label: 'Header Border', variable: '--border-neutral-subtle' },
        { label: 'Title', variable: '--text-primary' },
        { label: 'Close Icon', variable: '--text-secondary' },
      ]} />
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'radioButtons'}
  <div class="demo-block">
    <h2 class="component-title">Radio Button Component</h2>
    <p class="demo-description">
      Styled radio buttons with icon and color support. Import from <code>components/RadioButton.svelte</code>
    </p>

    <div class="demo-section">
      <div class="radio-demo-row">
        <RadioButton
          icon="fas fa-shield-alt"
          label="Defense"
          color="var(--text-info)"
          active={selectedRadio === 'option-a'}
          on:click={() => selectedRadio = 'option-a'}
        />
        <RadioButton
          icon="fas fa-coins"
          label="Economy"
          color="var(--text-accent)"
          active={selectedRadio === 'option-b'}
          on:click={() => selectedRadio = 'option-b'}
        />
        <RadioButton
          icon="fas fa-users"
          label="Loyalty"
          color="var(--text-success)"
          active={selectedRadio === 'option-c'}
          on:click={() => selectedRadio = 'option-c'}
        />
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <TokenMap tokens={[
        { label: 'Dot Border', variable: '--border-neutral-default' },
        { label: 'Label', variable: '--text-primary' },
        { label: 'Surface', variable: '--surface-neutral-lowest' },
      ]} />
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'cards'}
  <div class="demo-block">
    <h2 class="component-title">Card Component</h2>
    <p class="demo-description">
      Generic card with icon, title, and slotted body. Import from <code>components/Card.svelte</code>
    </p>

    <div class="demo-section">
      <div class="card-demo-grid">
        <Card icon="fas fa-star" iconColor="var(--text-accent)" title="Featured">
          <p style="margin: 0;">A highlighted card with amber accent.</p>
        </Card>

        <Card icon="fas fa-shield-alt" iconColor="var(--text-info)" title="Security">
          <p style="margin: 0;">Card with blue icon color on hover border.</p>
        </Card>

        <Card icon="fas fa-leaf" iconColor="var(--text-success)" title="Compact" size="compact">
          <p style="margin: 0;">A compact-sized card variant.</p>
        </Card>

        <Card title="No Icon">
          <p style="margin: 0;">Cards work without icons too.</p>
        </Card>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <TokenMap tokens={[
        { label: 'Background', variable: '--surface-neutral-high' },
        { label: 'Border', variable: '--border-neutral-default' },
        { label: 'Hover Border', variable: '--border-neutral-strong' },
        { label: 'Title', variable: '--text-primary' },
        { label: 'Body', variable: '--text-secondary' },
      ]} />
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'traitBadges'}
  <div class="demo-block">
    <h2 class="component-title">Badge Component</h2>
    <p class="demo-description">
      Pill-shaped badges with variant support. Import from <code>components/Badge.svelte</code>
    </p>

    <div class="demo-section">
      <div class="trait-demo-row">
        <Badge variant="trait">arcane</Badge>
        <Badge variant="trait">divine</Badge>
        <Badge variant="trait">primal</Badge>
        <Badge variant="accent">scenes</Badge>
        <Badge icon="fa-solid fa-dice-d20">System Agnostic</Badge>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <div class="token-sections">
        <TokenMap title="info" tokens={[
          { label: 'BG', variable: '--surface-neutral-higher' },
          { label: 'Border', variable: '--border-neutral-default' },
          { label: 'Text', variable: '--text-primary' },
        ]} />
        <TokenMap title="accent" tokens={[
          { label: 'BG', variable: '--surface-neutral-higher' },
          { label: 'Border', variable: '--border-accent' },
          { label: 'Text', variable: '--color-accent-300' },
        ]} />
        <TokenMap title="trait" tokens={[
          { label: 'BG', variable: '--surface-primary-high' },
          { label: 'Border', variable: '--border-primary-strong' },
          { label: 'Text', variable: '--text-primary' },
        ]} />
      </div>
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'inlineEdit'}
  <div class="demo-block">
    <h2 class="component-title">Inline Edit Actions</h2>
    <p class="demo-description">
      Confirm/cancel button pair for inline editing. Import from <code>components/InlineEditActions.svelte</code>
    </p>

    <div class="demo-section">
      <div class="inline-edit-demo-row">
        <span style="color: var(--text-secondary);">Editing value...</span>
        <InlineEditActions onSave={() => {}} onCancel={() => {}} />
      </div>
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'sectionDivider'}
  <div class="demo-block">
    <h2 class="component-title">Section Divider Component</h2>
    <p class="demo-description">
      Full-width section banner with display font and palette variants. Import from <code>components/SectionDivider.svelte</code>
    </p>

    <div class="demo-section">
      <h3 class="demo-subtitle">Variants</h3>
      <div class="divider-showcase">
        {#each dividerVariants as item}
          <div class="divider-showcase-item">
            <SectionDivider title={item.label} variant={item.variant} />
            <span class="variant-label">variant="{item.variant}" &nbsp; surface-{item.variant}-highest → surface-{item.variant}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">With Description</h3>
      <div class="divider-showcase">
        <SectionDivider
          title="Community Modules"
          variant="bg"
          description="These modules were created by other authors and are no longer actively maintained."
        />
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens (bg variant)</h3>
      <TokenMap tokens={[
        { label: 'Gradient High', variable: '--surface-bg-highest' },
        { label: 'Gradient Mid', variable: '--surface-bg-higher' },
        { label: 'Gradient Low', variable: '--surface-bg-high' },
        { label: 'Gradient Base', variable: '--surface-bg' },
        { label: 'Text Stroke', variable: '--surface-bg-lowest' },
      ]} />
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'collapsible'}
  <div class="demo-block">
    <h2 class="component-title">Collapsible Section Component</h2>
    <p class="demo-description">
      Expandable section with chevron toggle. Import from <code>components/CollapsibleSection.svelte</code>
    </p>

    <div class="demo-section">
      <div class="collapsible-demo-wrapper">
        <CollapsibleSection
          label="Click to expand"
          expanded={demoExpanded}
          on:toggle={() => demoExpanded = !demoExpanded}
        />
        {#if demoExpanded}
          <div class="collapsible-demo-content">
            <p style="margin: 0; color: var(--text-secondary);">
              This content is revealed when the section is expanded. Any content can go here.
            </p>
          </div>
        {/if}
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <TokenMap tokens={[
        { label: 'Active BG', variable: '--surface-primary-lowest' },
        { label: 'Active Border', variable: '--color-primary-400' },
        { label: 'Label', variable: '--text-primary' },
        { label: 'Toggle Icon', variable: '--text-muted' },
      ]} />
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'tabBar'}
  <div class="demo-block">
    <h2 class="component-title">Tab Bar Component</h2>
    <p class="demo-description">
      Tab navigation with icon support and disabled state. Import from <code>components/TabBar.svelte</code>
    </p>

    <div class="demo-section">
      <TabBar
        tabs={demoTabs}
        selectedTab={selectedDemoTab}
        on:tabChange={(e) => selectedDemoTab = e.detail}
      />
      <div class="tab-content-demo">
        {#if selectedDemoTab === 'overview'}
          <p style="margin: 0;">Overview tab content</p>
        {:else if selectedDemoTab === 'details'}
          <p style="margin: 0;">Details tab content</p>
        {:else if selectedDemoTab === 'settings'}
          <p style="margin: 0;">Settings tab content</p>
        {/if}
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <TokenMap tokens={[
        { label: 'Default Text', variable: '--text-tertiary' },
        { label: 'Hover Text', variable: '--text-secondary' },
        { label: 'Active Text', variable: '--text-primary' },
        { label: 'Active Border', variable: '--color-primary-500' },
        { label: 'Divider', variable: '--border-neutral-subtle' },
      ]} />
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'tooltip'}
  <div class="demo-block">
    <h2 class="component-title">Tooltip Component</h2>
    <p class="demo-description">
      Hover tooltip with configurable position. Import from <code>components/Tooltip.svelte</code>
    </p>

    <div class="demo-section">
      <div class="tooltip-demo-row">
        <Tooltip text="This is a top tooltip">
          <Button variant="outline">Hover me (top)</Button>
        </Tooltip>

        <Tooltip text="Bottom tooltip" position="bottom">
          <Button variant="outline">Hover me (bottom)</Button>
        </Tooltip>

        <Tooltip text="Tooltips work on any element">
          <span class="tooltip-demo-text">Hover this text</span>
        </Tooltip>
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <TokenMap tokens={[
        { label: 'Background', variable: '--surface-neutral-highest' },
        { label: 'Text', variable: '--text-primary' },
      ]} />
    </div>
  </div>
  {/if}

  {#if selectedComponent === 'progressBar'}
  <div class="demo-block">
    <h2 class="component-title">Progress Bar Component</h2>
    <p class="demo-description">
      Animated progress bar with variants. Import from <code>components/ProgressBar.svelte</code>
    </p>

    <div class="demo-section">
      <div class="progress-demo-stack">
        <ProgressBar value={25} label="Getting Started" variant="primary" />
        <ProgressBar value={50} label="Halfway There" variant="info" />
        <ProgressBar value={75} label="Almost Done" variant="warning" />
        <ProgressBar value={100} label="Complete" variant="success" />
        <ProgressBar value={33} label="Danger Zone" variant="danger" />
        <ProgressBar value={60} variant="primary" size="compact" />
      </div>
    </div>

    <div class="demo-section">
      <h3 class="demo-subtitle">Tokens</h3>
      <div class="token-sections">
        <TokenMap title="track" tokens={[
          { label: 'Background', variable: '--surface-neutral-low' },
          { label: 'Border', variable: '--border-neutral-faint' },
          { label: 'Label', variable: '--text-secondary' },
        ]} />
        <TokenMap title="fill colors" tokens={[
          { label: 'Success', variable: '--border-success' },
          { label: 'Warning', variable: '--border-warning' },
          { label: 'Danger', variable: '--border-danger' },
          { label: 'Info', variable: '--border-info' },
        ]} />
      </div>
    </div>
  </div>
  {/if}

</div>

<style>
  @import '../styles/variables.css';

  .components-container {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .demo-block {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    min-width: 0;
  }

  .component-title {
    font-size: var(--font-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-primary);
    margin: 0;
    padding-bottom: var(--space-8);
    border-bottom: 1px solid var(--ui-border-subtle);
  }

  .demo-description {
    font-size: var(--font-sm);
    color: var(--ui-text-tertiary);
    margin: 0;
  }

  .demo-description code {
    font-size: var(--font-xs);
    color: var(--ui-text-accent);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-family: var(--ui-font-mono);
  }

  .demo-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

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

  .demo-subtitle {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-medium);
    color: var(--ui-text-secondary);
    margin: 0;
  }

  /* Choice Button Styles */
  .choice-buttons-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-10);
  }

  .choice-button {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    padding: var(--space-10) var(--space-16);
    background: var(--ui-surface-high);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--radius-lg);
    outline: 2px solid transparent;
    outline-offset: -1px;
    font-size: var(--font-md);
    font-weight: 500;
    color: var(--ui-text-primary);
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .choice-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, var(--ui-hover), transparent);
    transition: left 0.5s ease;
  }

  .choice-button:hover::before {
    left: 100%;
  }

  .choice-button i {
    font-size: var(--font-lg);
    color: var(--ui-text-secondary);
    transition: color 0.2s;
  }

  .choice-button:hover:not(:disabled):not(.selected) {
    background: var(--ui-surface-higher);
    border-color: var(--ui-border-strong);
    transform: translateY(-0.0625rem);
    box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.3);
  }

  .choice-button.selected {
    background: var(--ui-surface-highest);
    outline-color: var(--ui-border-strong);
  }

  .choice-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* State Reference */
  .state-reference {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-12);
  }

  .state-item {
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-12);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .state-label {
    font-size: var(--font-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .state-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .state-details code {
    font-size: var(--font-xs);
    color: var(--ui-text-tertiary);
    background: var(--ui-surface-lowest);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-family: var(--ui-font-mono);
  }

  /* Button Showcase */
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

  /* Notification Showcase */
  .notification-showcase {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  /* Component Demo Styles */
  .radio-demo-row {
    display: flex;
    gap: var(--space-16);
    flex-wrap: wrap;
  }

  .card-demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-16);
  }

  .trait-demo-row {
    display: flex;
    gap: var(--space-8);
    flex-wrap: wrap;
  }

  .inline-edit-demo-row {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }

  .collapsible-demo-wrapper {
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .collapsible-demo-content {
    padding: var(--space-12) var(--space-16);
    background: var(--ui-surface-low);
    border-top: 1px solid var(--ui-border-faint);
  }

  .tab-content-demo {
    padding: var(--space-16);
    color: var(--ui-text-secondary);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
  }

  .tooltip-demo-row {
    display: flex;
    gap: var(--space-24);
    align-items: center;
    padding-top: var(--space-32);
  }

  .tooltip-demo-text {
    color: var(--ui-text-secondary);
    text-decoration: underline;
    text-decoration-style: dotted;
    cursor: help;
  }

  .progress-demo-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
    max-width: 400px;
  }

  /* Token Sections */
  .token-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  /* Section Divider Showcase */
  .divider-showcase {
    display: flex;
    flex-direction: column;
  }

  .divider-showcase-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
</style>
