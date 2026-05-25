/**
 * Resolved API base path for the editor's REST client. Injected by the
 * `themeFileApi` vite plugin via `config().define` so the client and server
 * always agree on the route prefix, even when a consumer overrides `apiBase`.
 *
 * Fallback (no plugin running) matches the plugin's default. The strings must
 * stay in sync — there is no single source of truth across the build-time /
 * runtime boundary, but the cost of one constant in two files is small.
 */
declare const __LIVE_TOKENS_API_BASE__: string | undefined;

export const API_BASE: string =
  typeof __LIVE_TOKENS_API_BASE__ !== 'undefined' && __LIVE_TOKENS_API_BASE__
    ? __LIVE_TOKENS_API_BASE__
    : '/api/live-tokens';
