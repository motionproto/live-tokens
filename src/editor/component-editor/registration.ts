import type { RegisterComponentEntry } from './registry';

/*
 * `registerComponent` lives apart from `registry.ts` so a production build can
 * call it without bundling the registry, which imports every shipped component
 * and editor. Entries wait here until the registry loads, which happens in dev
 * only.
 */

type Sink = (entry: RegisterComponentEntry) => void;

const pending: RegisterComponentEntry[] = [];
let sink: Sink | null = null;

/**
 * Register a consumer-authored component with the editor. Call from `main.ts`
 * before app mount.
 *
 * Collision rule: if `entry.id` matches a built-in id, a warning is logged and
 * the custom entry wins (the custom editor and schema replace the built-in for
 * the rest of the session).
 *
 * Side effect: registers the schema with the editor store so reset-to-default
 * and sibling-group resolution work for the new component, and registers its
 * contrast pairs, which replace a built-in's pairs on an id collision.
 */
export function registerComponent(entry: RegisterComponentEntry): void {
  if (sink) sink(entry);
  else pending.push(entry);
}

/** Called once by `registry.ts` as it loads. Drains the entries registered
    before it, in call order, and takes every later one directly. */
export function attachRegistry(next: Sink): void {
  sink = next;
  for (const entry of pending.splice(0)) next(entry);
}
