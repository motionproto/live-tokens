import type { ComponentSummary } from '../components/componentConfigService';
import type { Theme } from './themeTypes';

export interface ThemeProductionInput {
  /** Slug of the theme the editor has open. */
  openTheme: string;
  /** The production read, or null while it has not landed. */
  production: Pick<Theme, '_fileName' | '_baked'> | null;
  /** The live state holds changes the open theme's file does not. */
  unsaved: boolean;
}

export interface ThemeProductionState {
  /** True when production is known to ship the theme on screen. */
  inProduction: boolean;
  /** True while the production theme is unread: neither claim can be made. */
  unknown: boolean;
  /** True when production ships a theme other than the open one. */
  themeOff: boolean;
  /** True when the live state is ahead of what production ships: unsaved
   *  changes, or a save the bake has not seen. */
  unpublished: boolean;
}

/**
 * Whether production is running the theme on screen. Production is one saved
 * theme, so the first half is an identity check against the open one; the
 * second half is the live theme sitting ahead of what was published: unsaved
 * changes, or a saved theme the server reports the bake has not caught up with.
 *
 * A null production read is not an answer, so it is neither state: `unknown`
 * says so and `inProduction` stays false. Callers render that as its own
 * neutral state, which keeps a mount from flashing the alarm without letting a
 * read that never lands read as shipped forever.
 */
export function themeProductionState({
  openTheme,
  production,
  unsaved,
}: ThemeProductionInput): ThemeProductionState {
  const unknown = production === null;
  const themeOff = !unknown && production._fileName !== openTheme;
  const unpublished = unsaved || (!unknown && production._baked !== true);
  return {
    unknown,
    themeOff,
    unpublished,
    inProduction: !unknown && !themeOff && !unpublished,
  };
}

/** How many components run an unsaved buffer, diverging from what the open theme carries. */
export function countComponentsOffTheme(components: ComponentSummary[]): number {
  return components.filter((c) => c.source === 'working').length;
}
