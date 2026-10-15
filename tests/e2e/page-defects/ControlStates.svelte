<script lang="ts">
  import '../../../src/app/site.css';
  import Button from '../../../src/system/components/Button.svelte';
  import RadioButton from '../../../src/system/components/RadioButton.svelte';
  import Toggle from '../../../src/system/components/Toggle.svelte';
</script>

<section class="page">
  <h1>Controls away from rest</h1>
  <div class="row">
    <Button variant="primary" disabled>Save changes</Button>
    <Button variant="outline" disabled>Discard changes</Button>
    <Button variant="secondary">Choose a plan</Button>
  </div>
  <div class="row">
    <RadioButton label="Card" selected />
    <RadioButton label="Bank transfer" />
  </div>
  <div class="row">
    <Toggle label="Email me a receipt" checked />
    <Toggle label="Email me a reminder" />
  </div>
</section>

<style>
  .page {
    display: grid;
    gap: var(--space-24);
    padding: var(--space-32);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-12);
  }
</style>
