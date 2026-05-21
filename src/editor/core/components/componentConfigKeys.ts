// TODO(M3 schemaVersion / Wave 4): replace this enumerated list with a
// per-component schema declaration (e.g. registerComponentSchema(...,
// { kind: 'config' })). For now it's a flat set used by the on-load
// migration that splits legacy single-bucket aliases into the new
// {aliases, config} shape.
//
// What goes here: literal-valued knobs that don't translate to CSS vars
// (e.g. Dialog's confirm/cancel variant string is consumed by Dialog.svelte
// via `$editorState`, not via CSS cascade).
//
// What does NOT go here: aliases whose values are themselves CSS-var refs
// — even if the value space is constrained (e.g. `--button-shimmer` →
// `--shimmer-on` | `--shimmer-off`). Those are still aliases and must flow
// through `componentsToVars` so SCSS that does `var(--button-shimmer)`
// keeps resolving.
export const KNOWN_COMPONENT_CONFIG_KEYS: ReadonlySet<string> = new Set([
  '--dialog-confirm-variant',
  '--dialog-cancel-variant',
  // SectionDivider per-variant intrinsic properties — align / hairline /
  // eyebrow visibility / description visibility per size variant. These are
  // intent metadata the designer sets per-variant; the live divider in the
  // editor preview passes them as runtime props.
  '--sectiondivider-lg-align',
  '--sectiondivider-md-align',
  '--sectiondivider-sm-align',
  '--sectiondivider-lg-hairline',
  '--sectiondivider-md-hairline',
  '--sectiondivider-sm-hairline',
  '--sectiondivider-lg-show-eyebrow',
  '--sectiondivider-md-show-eyebrow',
  '--sectiondivider-sm-show-eyebrow',
  '--sectiondivider-lg-show-description',
  '--sectiondivider-md-show-description',
  '--sectiondivider-sm-show-description',
  '--sectiondivider-lg-show-hairline',
  '--sectiondivider-md-show-hairline',
  '--sectiondivider-sm-show-hairline',
  '--sectiondivider-lg-color-family',
  '--sectiondivider-md-color-family',
  '--sectiondivider-sm-color-family',
  '--sectiondivider-lg-eyebrow-uppercase',
  '--sectiondivider-md-eyebrow-uppercase',
  '--sectiondivider-sm-eyebrow-uppercase',
]);
