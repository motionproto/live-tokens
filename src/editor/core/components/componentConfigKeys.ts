// TODO(M3 schemaVersion / Wave 4): replace this enumerated list with a
// per-component schema declaration (e.g. registerComponentSchema(...,
// { kind: 'config' })). For now it's a flat set used by the on-load
// migration that splits legacy single-bucket aliases into the new
// {aliases, config} shape.
//
// What goes here: literal-valued knobs that live in the config bucket rather
// than the alias bucket. Some are runtime CSS values consumed by live
// components via the cascade (see CASCADING_COMPONENT_CONFIG_KEYS below);
// others are editor-only metadata that drive alias rewrites without ever
// reaching :root.
//
// What does NOT go here: aliases whose values are themselves CSS-var refs
// — even if the value space is constrained (e.g. `--button-shimmer` →
// `--shimmer-on` | `--shimmer-off`). Those are still aliases and must flow
// through `componentsToVars` so SCSS that does `var(--button-shimmer)`
// keeps resolving.
export const KNOWN_COMPONENT_CONFIG_KEYS: ReadonlySet<string> = new Set([
  '--dialog-confirm-variant',
  '--dialog-cancel-variant',
  // SectionDivider per-variant `color-family` is editor metadata that drives
  // the family-swap rewrite on aliases. It is not a runtime CSS value, so it
  // stays in the config bucket. The other intrinsics (align, hairline,
  // eyebrow/description visibility, eyebrow text-transform) now flow through
  // the alias bucket as cascading CSS vars — see the 2026-05-22 migration.
  '--sectiondivider-lg-color-family',
  '--sectiondivider-md-color-family',
  '--sectiondivider-sm-color-family',
]);

// Subset of KNOWN_COMPONENT_CONFIG_KEYS that the renderer emits to :root as
// CSS vars so live components can read them via the cascade. Editor-only
// metadata (e.g. `--sectiondivider-*-color-family`, which drives an alias
// rewrite rather than a runtime value) is intentionally excluded.
export const CASCADING_COMPONENT_CONFIG_KEYS: ReadonlySet<string> = new Set([
  '--dialog-confirm-variant',
  '--dialog-cancel-variant',
]);
