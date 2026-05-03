// TODO(M3 schemaVersion / Wave 4): replace this enumerated list with a
// per-component schema declaration (e.g. registerComponentSchema(...,
// { kind: 'config' })). For now it's a flat set used by the on-load
// migration that splits legacy single-bucket aliases into the new
// {aliases, config} shape.
export const KNOWN_COMPONENT_CONFIG_KEYS: ReadonlySet<string> = new Set([
  '--dialog-confirm-variant',
  '--dialog-cancel-variant',
  '--button-shimmer',
]);
