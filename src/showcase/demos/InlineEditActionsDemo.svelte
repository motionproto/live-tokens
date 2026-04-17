<script lang="ts">
  import InlineEditActions from '../../components/InlineEditActions.svelte';
</script>

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

<style>
  .inline-edit-demo-row {
    display: flex;
    align-items: center;
    gap: var(--space-12);
  }
</style>
