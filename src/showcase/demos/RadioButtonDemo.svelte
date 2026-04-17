<script lang="ts">
  import RadioButton from '../../components/RadioButton.svelte';
  import VariantGroup from '../VariantGroup.svelte';

  const targetFile = 'src/components/RadioButton.svelte';

  let selectedRadio = 'option-b';

  type Token = { label: string; variable: string };

  const radioStates: Record<string, Token[]> = {
    default: [
      { label: 'Dot Border', variable: '--radio-dot-border' },
      { label: 'Label', variable: '--radio-label' },
      { label: 'Surface', variable: '--radio-surface' },
      { label: 'Radius', variable: '--radio-radius' },
    ],
    hover: [
      { label: 'Dot Border', variable: '--radio-dot-border' },
      { label: 'Label', variable: '--radio-label' },
      { label: 'Surface', variable: '--radio-surface' },
      { label: 'Radius', variable: '--radio-radius' },
    ],
    active: [
      { label: 'Dot Border', variable: '--radio-dot-border' },
      { label: 'Label', variable: '--radio-label' },
      { label: 'Surface', variable: '--radio-surface' },
      { label: 'Radius', variable: '--radio-radius' },
    ],
  };
</script>

<div class="demo-block">
  <h2 class="component-title">Radio Button Component</h2>
  <p class="demo-description">
    Styled radio buttons with icon and color support. Import from <code>components/RadioButton.svelte</code>
  </p>

  <VariantGroup name="radio" title="Radio Button" states={radioStates} {targetFile} let:activeState>
    {@const forceClass = activeState === 'hover' ? 'force-hover' : ''}
    {@const forceActive = activeState === 'active'}
    <div class="radio-demo-row">
      <RadioButton
        icon="fas fa-shield-alt"
        label="Defense"
        color="var(--text-info)"
        active={forceActive || selectedRadio === 'option-a'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-a')}
      />
      <RadioButton
        icon="fas fa-coins"
        label="Economy"
        color="var(--text-accent)"
        active={forceActive || selectedRadio === 'option-b'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-b')}
      />
      <RadioButton
        icon="fas fa-users"
        label="Loyalty"
        color="var(--text-success)"
        active={forceActive || selectedRadio === 'option-c'}
        class={forceClass}
        on:click={() => (selectedRadio = 'option-c')}
      />
    </div>
  </VariantGroup>
</div>

<style>
  .radio-demo-row {
    display: flex;
    gap: var(--space-16);
    flex-wrap: wrap;
  }
</style>
