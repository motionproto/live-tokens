<script lang="ts">
  import { LiveTokensRouter } from '../editor';

  // Editor/component-editor routes are owned by <LiveTokensRouter>; consumer
  // pages declared here. Pages are lazy-loaded so each module's CSS
  // side-effect imports (e.g. site.css on Home) only evaluate when that
  // route is visited and don't leak into the editor routes. Pages without a
  // `label` (the playground) are reachable by URL but absent from the nav.
  const pages = {
    '/': {
      lazy: () => import('./Home.svelte'),
      label: 'Site',
      icon: 'fa-home',
      source: 'src/app/Home.svelte',
    },
    '/demo': {
      lazy: () => import('../demo/Demo.svelte'),
      label: 'Demo',
      icon: 'fa-box-open',
      source: 'src/demo/Demo.svelte',
    },
    '/playground/floating-tags': {
      lazy: () => import('../demo/FloatingTagsPlayground.svelte'),
      source: 'src/demo/FloatingTagsPlayground.svelte',
    },
  };
</script>

<LiveTokensRouter {pages} />
