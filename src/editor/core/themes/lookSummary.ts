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

/**
 * How many components run something other than what the open theme carries.
 *
 * Two facts are free on the client: whether the theme embeds a config for a
 * component, and which layer the component's live config resolves from. A
 * component the theme carries but which runs the shipped default is off it, and
 * so is a component running a buffer the theme carries nothing for. A buffer
 * over a config the theme does carry says nothing either way — that is the
 * state an apply leaves — so it stays uncounted.
 *
 * The Default theme breaks that rule: it is the one theme that embeds every
 * component's DEFAULT config by value (full set, not delta), so carrying an
 * entry says nothing. For it, off-theme is simply "buffered".
 */
export function countComponentsOffLook(
  components: ComponentSummary[],
  lookConfigs: Record<string, unknown> | null | undefined,
  lookIsDefault = false,
): number {
  const carried = lookConfigs ?? {};
  return components.filter((c) => {
    if (lookIsDefault) return c.source === 'working';
    const inLook = Object.prototype.hasOwnProperty.call(carried, c.name);
    return inLook ? c.source === 'default' : c.source === 'working';
  }).length;
}
