// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest';
import type { RegisterComponentEntry } from './registry';

function entry(id: string): RegisterComponentEntry {
  return {
    id,
    label: id,
    icon: 'fas fa-square',
    sourceFile: `src/system/components/${id}.svelte`,
    editorComponent: (() => {}) as unknown as RegisterComponentEntry['editorComponent'],
    schema: [],
    catalogue: {} as RegisterComponentEntry['catalogue'],
  };
}

beforeEach(() => {
  vi.resetModules();
});

it('keeps components registered before the registry loads', async () => {
  const { registerComponent } = await import('./registration');
  registerComponent(entry('alpha'));
  registerComponent(entry('beta'));

  const { getComponentRegistryEntries } = await import('./registry');
  const custom = getComponentRegistryEntries().filter((e) => e.origin === 'custom');
  expect(custom.map((e) => e.id)).toEqual(['alpha', 'beta']);
});

it('adds components registered after the registry loads', async () => {
  const { getComponentRegistryEntries } = await import('./registry');
  const { registerComponent } = await import('./registration');
  registerComponent(entry('gamma'));

  expect(getComponentRegistryEntries().find((e) => e.id === 'gamma')?.origin).toBe('custom');
});
