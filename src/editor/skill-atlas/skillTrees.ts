// Wave 1 compile-only stub, so `SkillAtlas.svelte`'s `./skillTrees` import
// resolves ahead of Wave 3, which copies the real trees here from
// `../live-tokens-online/src/skill-atlas/skillTrees.ts` and deletes this file's
// contents. `check:skill-atlas` fails against this stub until then.
import type { SkillTree } from './types';

export const skillTrees: Record<string, SkillTree> = {};
