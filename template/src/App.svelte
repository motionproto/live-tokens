<script lang="ts">
  import { LiveTokensRouter } from '@motion-proto/live-tokens';

  // <LiveTokensRouter> owns the dev-only /editor and /components routes.
  // Declare your own pages here. Lazy imports keep each page's CSS
  // side-effects out of the editor routes; omit `label` to keep a route
  // reachable by URL but hidden from the overlay nav rail.
  const pages = {
    '/': {
      lazy: () => import('./pages/Home.svelte'),
      label: 'Home',
      icon: 'fa-home',
      source: 'src/pages/Home.svelte',
    },
  };
</script>

<LiveTokensRouter {pages} />
