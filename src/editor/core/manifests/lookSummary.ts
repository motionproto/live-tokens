import type { ComponentSummary } from '../components/componentConfigService';

/**
 * How many components run something other than what the active look carries.
 *
 * Two facts are free on the client: whether the look embeds a config for a
 * component, and whether that component's active file is a non-default one.
 * When those disagree the component cannot be showing the look's config, and
 * that is the whole signal. Two customised states stay uncounted on purpose:
 * an Adopt re-embeds the live config under whatever file name it already has,
 * so comparing file names there would report drift that does not exist.
 */
export function countComponentsOffLook(
  components: ComponentSummary[],
  lookConfigs: Record<string, unknown> | null | undefined,
): number {
  const carried = lookConfigs ?? {};
  return components.filter((c) => {
    const inLook = Object.prototype.hasOwnProperty.call(carried, c.name);
    const customised = Boolean(c.activeFile) && c.activeFile !== 'default';
    return inLook !== customised;
  }).length;
}
