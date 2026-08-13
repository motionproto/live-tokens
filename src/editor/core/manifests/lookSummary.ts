import type { ComponentSummary } from '../components/componentConfigService';

export interface LookProductionState {
  /** True when production is known to run the look on screen, slice for slice. */
  inProduction: boolean;
  /** True while the production theme is unread: neither claim can be made. */
  unknown: boolean;
  /** True when production runs colors and type other than the live ones. */
  themeOff: boolean;
  /** Components running a config production does not have. */
  componentsOff: string[];
}

/**
 * Whether production is running the whole look. Two pointer comparisons: the
 * live colors and type against the production theme, and each component's
 * active config against its production one.
 *
 * A null production theme is not an answer, so it is neither state: `unknown`
 * says so and `inProduction` stays false. Callers render that as its own
 * neutral state, which keeps a mount from flashing the alarm without letting a
 * read that never lands read as shipped forever.
 */
export function lookProductionState(
  activeTheme: string,
  productionTheme: string | null,
  components: ComponentSummary[],
): LookProductionState {
  const unknown = productionTheme === null;
  const themeOff = !unknown && productionTheme !== activeTheme;
  const componentsOff = components
    .filter((c) => c.activeFile !== c.productionFile)
    .map((c) => c.name);
  return {
    unknown,
    themeOff,
    componentsOff,
    inProduction: !unknown && !themeOff && componentsOff.length === 0,
  };
}

/**
 * How many components run something other than what the active look carries.
 *
 * Two facts are free on the client: whether the look embeds a config for a
 * component, and whether that component's active file is a non-default one.
 * When those disagree the component cannot be showing the look's config, and
 * that is the whole signal. Two customised states stay uncounted on purpose:
 * an Adopt re-embeds the live config under whatever file name it already has,
 * so comparing file names there would report drift that does not exist.
 *
 * The Default look breaks the disagreement rule: it is the one manifest that
 * embeds every component's DEFAULT config by value (full set, not delta), so
 * carrying an entry says nothing. For it, off-look is simply "customised".
 */
export function countComponentsOffLook(
  components: ComponentSummary[],
  lookConfigs: Record<string, unknown> | null | undefined,
  lookIsDefault = false,
): number {
  const carried = lookConfigs ?? {};
  return components.filter((c) => {
    const customised = Boolean(c.activeFile) && c.activeFile !== 'default';
    if (lookIsDefault) return customised;
    const inLook = Object.prototype.hasOwnProperty.call(carried, c.name);
    return inLook !== customised;
  }).length;
}
