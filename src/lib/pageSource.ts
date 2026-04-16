export function resolvePageSource(route: string): string | undefined {
  if (route === '/') return 'src/pages/Landing.svelte';
  if (route === '/components') return 'src/pages/ShowcasePage.svelte';
  if (route === '/admin') return 'src/pages/Admin.svelte';
  return undefined;
}
