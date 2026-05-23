export { default as ComponentsTab } from './scaffolding/ComponentsTab.svelte';
export type { ComponentSection } from './scaffolding/componentSectionType';
export { getDefaultSections } from './scaffolding/defaultSections';

// Editor primitives for consumer-authored components.
export { default as ComponentEditorBase } from './scaffolding/ComponentEditorBase.svelte';
export { default as VariantGroup } from './scaffolding/VariantGroup.svelte';
export { default as LinkedBlock } from './scaffolding/LinkedBlock.svelte';
export { default as TypeEditor } from './scaffolding/TypeEditor.svelte';
export { default as TokenLayout } from './scaffolding/TokenLayout.svelte';

// Helpers for assembling a VariantGroup's siblings and the linked-block view.
export { buildSiblings } from './scaffolding/siblings';
export type { Sibling } from './scaffolding/siblings';
export { computeLinkedBlock, withLinkedDisabled } from './scaffolding/linkedBlock';
export type { LinkedToken, LinkedGroup, LinkedBlockResult } from './scaffolding/linkedBlock';
export { buildTypeGroupTokens } from './scaffolding/buildTypeGroupTokens';

// Token schema type — the shape of an entry in an editor's `allTokens` array.
export type { Token } from './scaffolding/types';
