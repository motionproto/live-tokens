<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    source: string;
  }
  let { source }: Props = $props();

  let host: HTMLDivElement | undefined = $state();
  let status: 'idle' | 'rendering' | 'error' = $state('idle');
  let errorMsg = $state('');

  /* Mermaid is heavy (~700kB). Lazy-load and cache the singleton. */
  let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;
  function loadMermaid() {
    if (!mermaidPromise) {
      mermaidPromise = import('mermaid').then((m) => {
        const mermaid = m.default;
        const get = (name: string, fallback: string) => {
          if (typeof window === 'undefined') return fallback;
          const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
          return v || fallback;
        };
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          fontFamily: get('--font-sans', 'system-ui, sans-serif'),
          themeVariables: {
            background:           get('--surface-neutral-lower', '#162027'),
            primaryColor:         get('--surface-accent-low', '#003c3b'),
            primaryTextColor:     get('--text-primary', '#ffffff'),
            primaryBorderColor:   get('--border-accent', '#006f6d'),
            lineColor:            get('--border-neutral', '#5a6267'),
            secondaryColor:       get('--surface-neutral-low', '#2c353c'),
            tertiaryColor:        get('--surface-special-low', '#3d0084'),
            clusterBkg:           get('--surface-neutral-lowest', '#040c13'),
            clusterBorder:        get('--border-neutral-subtle', '#3a4146'),
            actorBkg:             get('--surface-accent-low', '#003c3b'),
            actorBorder:          get('--border-accent', '#006f6d'),
            actorTextColor:       get('--text-primary', '#ffffff'),
            actorLineColor:       get('--border-neutral', '#5a6267'),
            labelBoxBkgColor:     get('--surface-neutral-low', '#2c353c'),
            labelBoxBorderColor:  get('--border-neutral-subtle', '#3a4146'),
            labelTextColor:       get('--text-primary', '#ffffff'),
            loopTextColor:        get('--text-secondary', '#c2cacf'),
            noteBkgColor:         get('--surface-warning-lower', '#2d1a00'),
            noteTextColor:        get('--text-primary', '#ffffff'),
            noteBorderColor:      get('--border-warning-subtle', '#5a3700'),
          },
          flowchart: { curve: 'basis', useMaxWidth: true },
          sequence: { useMaxWidth: true, wrap: true, mirrorActors: false },
        });
        return mermaid;
      });
    }
    return mermaidPromise;
  }

  onMount(async () => {
    if (!host) return;
    status = 'rendering';
    try {
      const mermaid = await loadMermaid();
      const id = `mmd-${Math.random().toString(36).slice(2)}`;
      const { svg } = await mermaid.render(id, source);
      if (host) host.innerHTML = svg;
      status = 'idle';
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
      status = 'error';
    }
  });
</script>

<div class="mermaid-frame" class:rendering={status === 'rendering'} class:error={status === 'error'}>
  {#if status === 'rendering'}
    <span class="placeholder">Rendering diagram...</span>
  {:else if status === 'error'}
    <span class="placeholder">Mermaid error: {errorMsg}</span>
  {/if}
  <div class="host" bind:this={host}></div>
</div>

<style>
  .mermaid-frame {
    background: color-mix(in srgb, var(--surface-neutral-lower, #162027) 70%, transparent);
    border: 1px solid var(--border-neutral-subtle, #3a4146);
    border-radius: var(--radius-xl, 0.5rem);
    padding: var(--space-20, 1.25rem);
    margin: 0 0 var(--space-24, 1.5rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60px;
    overflow-x: auto;
  }

  .mermaid-frame.error {
    border-color: var(--border-warning-subtle, #5a3700);
    background: var(--surface-warning-lowest, #140800);
  }

  .placeholder {
    font-family: var(--font-mono, monospace);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--text-tertiary, #7e8285);
  }
  .error .placeholder { color: var(--text-warning, #d8a040); }

  .host { width: 100%; display: flex; justify-content: center; }
  .host :global(svg) { max-width: 100%; height: auto; }
</style>
