<script lang="ts">
  import Button from '../../../system/components/Button.svelte';
  import Card from '../../../system/components/Card.svelte';
  import Input from '../../../system/components/Input.svelte';
  import Badge from '../../../system/components/Badge.svelte';
  import Callout from '../../../system/components/Callout.svelte';
  import Toggle from '../../../system/components/Toggle.svelte';
  import { setSketchScope } from '../../core/sketch/sketchLayer';
  import type { SketchSettings } from '../../core/sketch/sketchPresets';

  interface Props {
    settings: SketchSettings;
    enabled: boolean;
  }

  let { settings, enabled }: Props = $props();

  let stage = $state<HTMLDivElement | undefined>(undefined);

  // The scope attribute goes on this container rather than the editor document
  // root, so the editor's own chrome never picks the effect up.
  $effect(() => {
    setSketchScope(stage ?? null, enabled ? settings : null);
  });
</script>

<div class="stage" bind:this={stage}>
  <section class="item">
    <h4>Buttons</h4>
    <div class="cluster">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="danger">Danger</Button>
    </div>
  </section>

  <section class="item">
    <h4>Cards</h4>
    <div class="cluster">
      <Card title="Rough draft">
        <p>Fill and outline displace on different noise seeds, so they disagree at the edges.</p>
      </Card>
      <Card title="Second card">
        <p>Same size and same preset. A different seed keeps the silhouette from repeating.</p>
      </Card>
    </div>
  </section>

  <section class="item">
    <h4>Badges</h4>
    <div class="cluster">
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
    </div>
  </section>

  <section class="item">
    <h4>Form</h4>
    <div class="cluster stack">
      <Input label="Name" placeholder="Ada Lovelace" hint="Helper text stays crisp" />
      <Toggle label="Enabled" checked />
    </div>
  </section>

  <section class="item">
    <h4>Callouts</h4>
    <div class="cluster stack">
      <Callout variant="info" label="Note">Body text is never filtered, so it stays fully legible.</Callout>
      <Callout variant="warning" label="Careful">Only the fill and outline layers move.</Callout>
    </div>
  </section>
</div>

<style>
  .stage {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-24);
    padding: var(--ui-space-24);
    background: var(--surface-neutral-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .item {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-10);
  }

  h4 {
    margin: 0;
    font-family: var(--ui-font-sans);
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ui-text-muted);
  }

  .cluster {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  .cluster.stack {
    flex-direction: column;
    max-width: 28rem;
  }

  .cluster :global(.card) {
    max-width: 20rem;
  }
</style>
