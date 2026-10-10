import type { ContrastPair } from '../palettes/contrastPairs';

// The palette selector reads pairs from here. Importing `registry.ts` instead
// would close a cycle, because every editor imports the palette selector.
const pairsByComponent = new Map<string, ContrastPair[]>();

/** Replaces the component's pairs, so a custom entry that overrides a built-in drops the built-in's pairs. */
export function registerContrastPairs(id: string, pairs: ContrastPair[]): void {
  pairsByComponent.set(id, pairs);
}

export function getContrastPairs(id: string, variable: string): ContrastPair[] {
  return (pairsByComponent.get(id) ?? []).filter((pair) => pair.foreground === variable);
}

export function allContrastPairs(): { component: string; pair: ContrastPair }[] {
  return [...pairsByComponent].flatMap(([component, pairs]) => pairs.map((pair) => ({ component, pair })));
}
