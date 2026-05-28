<script lang="ts">
  import { LiveTokensRouter } from '../editor';
  import Home from './Home.svelte';
  import Demo from '../demo/Demo.svelte';
  import Docs from './docs/Docs.svelte';
  import FloatingTagsPlayground from '../demo/FloatingTagsPlayground.svelte';

  // Editor/component-editor routes are owned by <LiveTokensRouter>; consumer
  // pages declared here. Pages without a `label` (the playground) are
  // reachable by URL but absent from the overlay's nav rail.
  const pages = {
    '/': {
      component: Home,
      label: 'Site',
      icon: 'fa-home',
      source: 'src/app/Home.svelte',
    },
    '/demo': {
      component: Demo,
      label: 'Demo',
      icon: 'fa-box-open',
      source: 'src/demo/Demo.svelte',
    },
    '/docs': {
      component: Docs,
      label: 'Docs',
      icon: 'fa-book',
      source: 'src/app/docs/Docs.svelte',
    },
    '/playground/floating-tags': {
      component: FloatingTagsPlayground,
      source: 'src/demo/FloatingTagsPlayground.svelte',
    },
  };
</script>

<LiveTokensRouter {pages} />
