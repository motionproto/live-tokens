<script lang="ts">
  import { tick } from 'svelte';

  export let show: boolean = false;
  export let title: string = '';
  export let cancelLabel: string = 'Cancel';
  export let showCancel: boolean = true;
  export let width: string = '500px';

  let closeButtonRef: HTMLButtonElement;
  let cancelButtonRef: HTMLButtonElement;

  $: if (show) {
    tick().then(() => {
      if (showCancel && cancelButtonRef) cancelButtonRef.focus();
      else if (closeButtonRef) closeButtonRef.focus();
    });
  }

  function handleClose() {
    show = false;
  }
</script>

{#if show}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
  <div class="ed-backdrop" on:click|self={handleClose}>
    <div class="ed-dialog" style="width: {width}; max-width: {width};">
      {#if title}
        <div class="ed-header">
          <h3 class="ed-title">{title}</h3>
          <button bind:this={closeButtonRef} class="ed-close" on:click={handleClose} aria-label="Close">
            <i class="fas fa-times"></i>
          </button>
        </div>
      {/if}

      <div class="ed-body">
        <slot />
      </div>

      {#if showCancel}
        <div class="ed-footer">
          <button bind:this={cancelButtonRef} class="ed-btn" on:click={handleClose}>
            {cancelLabel}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .ed-backdrop {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .ed-dialog {
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 6px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
    animation: edSlideIn 0.15s ease-out;
  }

  @keyframes edSlideIn {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .ed-header {
    padding: 10px 16px;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .ed-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .ed-close {
    background: none;
    border: none;
    color: #888;
    font-size: 14px;
    cursor: pointer;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  }

  .ed-close:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ccc;
  }

  .ed-body {
    padding: 12px 16px;
  }

  .ed-footer {
    padding: 10px 16px;
    border-top: 1px solid #333;
    display: flex;
    justify-content: flex-end;
  }

  .ed-btn {
    padding: 6px 14px;
    background: transparent;
    border: 1px solid #555;
    border-radius: 4px;
    color: #ccc;
    font-size: 14px;
    cursor: pointer;
  }

  .ed-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: #777;
    color: #e0e0e0;
  }
</style>
