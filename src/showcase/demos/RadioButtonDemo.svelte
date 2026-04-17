<script lang="ts">
  import RadioButton from '../../components/RadioButton.svelte';
  import TokenMap from '../TokenMap.svelte';

  let selectedRadio = 'option-b';
</script>

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

<style>
  .radio-demo-row {
    display: flex;
    gap: var(--space-16);
    flex-wrap: wrap;
  }
</style>
