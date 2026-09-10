<script lang="ts">
  import { LiveTokensRouter } from '../editor';
  import type { RouteEntry } from '../editor';

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
    '/skills': {
      lazy: () => import('../editor/skill-atlas/SkillAtlas.svelte'),
      label: 'Skills',
      icon: 'fa-diagram-project',
      source: 'src/editor/skill-atlas/SkillAtlas.svelte',
    },
    '/playground/floating-tags': {
      lazy: () => import('../demo/FloatingTagsPlayground.svelte'),
      source: 'src/demo/FloatingTagsPlayground.svelte',
    },
    // One deliberate defect per page rule, one exception per status the rules
    // report, and one page that keeps every obligation. `import.meta.env.DEV`
    // is a constant at build time, so a production bundle drops the branch and
    // every module it names: the fixtures reach no consumer. The fixtures also
    // sit outside the type program (`tsconfig.json` includes `src`), where a
    // `.svelte` import resolves to the ambient module in
    // `component-editor/editors.d.ts` rather than to the component, so the
    // block carries one cast.
    ...(import.meta.env.DEV
      ? ({
          '/page-defects/clean': {
            lazy: () => import('../../tests/e2e/page-defects/CleanPage.svelte'),
            source: 'tests/e2e/page-defects/CleanPage.svelte',
          },
          '/page-defects/paint': {
            lazy: () => import('../../tests/e2e/page-defects/PaintDefect.svelte'),
            source: 'tests/e2e/page-defects/PaintDefect.svelte',
          },
          '/page-defects/text-style': {
            lazy: () => import('../../tests/e2e/page-defects/TextStyleDefect.svelte'),
            source: 'tests/e2e/page-defects/TextStyleDefect.svelte',
          },
          '/page-defects/contrast': {
            lazy: () => import('../../tests/e2e/page-defects/ContrastDefect.svelte'),
            source: 'tests/e2e/page-defects/ContrastDefect.svelte',
          },
          '/page-defects/grid': {
            lazy: () => import('../../tests/e2e/page-defects/GridDefect.svelte'),
            source: 'tests/e2e/page-defects/GridDefect.svelte',
          },
          '/page-defects/overflow': {
            lazy: () => import('../../tests/e2e/page-defects/OverflowDefect.svelte'),
            source: 'tests/e2e/page-defects/OverflowDefect.svelte',
          },
          '/page-defects/gradient-hero': {
            lazy: () => import('../../tests/e2e/page-defects/GradientHero.svelte'),
            source: 'tests/e2e/page-defects/GradientHero.svelte',
          },
          '/page-defects/scrolling-code': {
            lazy: () => import('../../tests/e2e/page-defects/ScrollingCode.svelte'),
            source: 'tests/e2e/page-defects/ScrollingCode.svelte',
          },
          '/page-defects/local-grid': {
            lazy: () => import('../../tests/e2e/page-defects/LocalGrid.svelte'),
            source: 'tests/e2e/page-defects/LocalGrid.svelte',
          },
          '/page-defects/no-instance': {
            lazy: () => import('../../tests/e2e/page-defects/NoInstance.svelte'),
            source: 'tests/e2e/page-defects/NoInstance.svelte',
          },
        } as unknown as Record<string, RouteEntry>)
      : {}),
  };
</script>

<LiveTokensRouter {pages} />
