import { getComponentRegistry } from '../registry';

/**
 * Resolve a component id to its runtime source file path. Reads from the
 * merged component registry (built-ins + runtime registrations).
 */
export function componentSourceFile(component: string): string {
  return getComponentRegistry()[component]?.sourceFile ?? '';
}
