<script lang="ts">
  import Button from '../../components/Button.svelte';
  import Dialog from '../../components/Dialog.svelte';
  import TokenMap from '../TokenMap.svelte';

  let showDialog = false;
</script>

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
