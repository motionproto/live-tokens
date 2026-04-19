import type { ComponentType } from 'svelte';

export type ComponentSection = {
  id: string;
  label: string;
  component: ComponentType;
  props?: Record<string, unknown>;
};
