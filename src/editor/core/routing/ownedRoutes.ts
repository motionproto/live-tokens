// The package's dev-only editor surfaces live under a reserved `/live-tokens/*`
// namespace so they can never collide with a consumer's own routes — the
// consumer owns the rest of the URL space. Keeping the defaults in one place
// is the guard against the nav rail and the dispatcher drifting onto different
// paths (the collision/shadow class these constants exist to prevent).
//
// A consumer relocates or disables each surface via the `editorRoutes` prop on
// <LiveTokensRouter>; these are only the defaults.
export const DEFAULT_EDITOR_PATH = '/live-tokens/editor';
export const DEFAULT_COMPONENTS_PATH = '/live-tokens/components';
export const DEFAULT_DOCS_PATH = '/live-tokens/docs';
