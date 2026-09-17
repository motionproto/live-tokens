import type { Component } from 'svelte';

declare const Demo: Component<{
  onThemePick?: (fileName: string) => void;
  onSketchPick?: (id: string | null) => void;
}>;
export default Demo;
