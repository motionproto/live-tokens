// Runes-compiled helper: returns a $state proxy so a test can mutate props
// after mount() and have the change propagate into the component.
export function reactiveProps<T extends object>(init: T): T {
  const props = $state(init);
  return props;
}
