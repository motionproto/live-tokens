import type { ComponentSummary } from '../components/componentConfigService';

export interface LookProductionInput {
  /** Slug of the theme the editor has open. */
  openTheme: string;
  /** Slug of the published theme, or null while the read has not landed. */
  productionTheme: string | null;
  /** Live look moved past what the published theme holds: unsaved edits, or a
   *  save since the last Adopt. */
  unpublished: boolean;
}

export interface LookProductionState {
  /** True when production is known to ship the look on screen. */
  inProduction: boolean;
  /** True while the production theme is unread: neither claim can be made. */
  unknown: boolean;
  /** True when production ships a theme other than the open one. */
  themeOff: boolean;
  /** True when the open theme has moved since it was published. */
  unpublished: boolean;
}

/**
 * Whether production is running the look on screen. Production is one saved
 * theme, so the first half is an identity check against the open one; the
 * second half is the live look sitting ahead of what was published, which
 * `unpublished` carries.
 *
 * A null production read is not an answer, so it is neither state: `unknown`
 * says so and `inProduction` stays false. Callers render that as its own
 * neutral state, which keeps a mount from flashing the alarm without letting a
 * read that never lands read as shipped forever.
 */
export function lookProductionState({
  openTheme,
  productionTheme,
  unpublished,
}: LookProductionInput): LookProductionState {
  const unknown = productionTheme === null;
  const themeOff = !unknown && productionTheme !== openTheme;
  return {
    unknown,
    themeOff,
    unpublished,
    inProduction: !unknown && !themeOff && !unpublished,
  };
}

/** How many components run an unsaved buffer, diverging from what the open theme carries. */
export function countComponentsOffLook(components: ComponentSummary[]): number {
  return components.filter((c) => c.source === 'working').length;
}
