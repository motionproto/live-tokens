<script lang="ts">
  import Button from '../components/Button.svelte';
  import Dialog from '../components/Dialog.svelte';
  import VariantGroup from './scaffolding/VariantGroup.svelte';
  import DemoHeader from './scaffolding/DemoHeader.svelte';

  const targetFile = 'src/components/Dialog.svelte';
  const component = 'dialog';

  let showDialog = false;

  const tokens = [
    { label: 'surface color', variable: '--dialog-surface' },
    { label: 'border color', variable: '--dialog-border' },
    { label: 'header surface color', variable: '--dialog-header-surface' },
    { label: 'header border color', variable: '--dialog-header-border' },
    { label: 'title color', variable: '--dialog-title' },
    { label: 'close icon color', variable: '--dialog-close-icon' },
    { label: 'radius', variable: '--dialog-radius' },
  ];
</script>

<div class="demo-block">
  <DemoHeader
    {component}
    title="Dialog Component"
    description="Modal dialog with focus management and slide-in animation. Import from <code>components/Dialog.svelte</code>"
  />

  <VariantGroup name="dialog" title="Dialog" {tokens} {targetFile} {component}>
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
  </VariantGroup>
</div>
