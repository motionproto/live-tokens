/**
 * A `tokens-css` migration: a pure, idempotent transform on the text of a
 * consumer's `tokens.css`.
 *
 * Sibling to the in-browser data-file migrations in
 * `src/editor/core/themes/migrations/` (which transform theme and
 * component-config JSON as the editor loads them). Those run in the browser on
 * `Record<string,string>` maps; these run in Node — from the `live-tokens
 * migrate` CLI and the dev-plugin guardrail — on the Layer-1 CSS file the data
 * migrations deliberately never touch.
 *
 * There is no `schemaVersion` here: CSS carries no version stamp, so migrations
 * must be idempotent by presence (see `cssTokenOps`). Re-running the full set is
 * always safe, which is what the CLI relies on.
 */
export interface TokensCssMigration {
  /** Unique id; convention: `YYYY-MM-DD-<short-name>`. */
  id: string;
  /** One-line summary shown by the CLI when the migration applies. */
  description: string;
  /** Pure, idempotent transform on the `tokens.css` source. */
  apply(css: string): string;
}
