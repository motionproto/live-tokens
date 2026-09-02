// The atlas reads the skills themselves, so the source pane can never drift
// from what Claude actually loads. `.claude/skills` ships in the tarball;
// src/app does not, so these paths only resolve in this repo's dev app.
import adjustGeometry from '../../../.claude/skills/live-tokens-adjust-geometry/SKILL.md?raw';
import buildPage from '../../../.claude/skills/live-tokens-build-page/SKILL.md?raw';
import createComponent from '../../../.claude/skills/live-tokens-create-component/SKILL.md?raw';
import fixFindings from '../../../.claude/skills/live-tokens-fix-findings/SKILL.md?raw';
import checkCompliance from '../../../.claude/skills/live-tokens-check-compliance/SKILL.md?raw';
import generateTheme from '../../../.claude/skills/live-tokens-generate-theme/SKILL.md?raw';
import pairFonts from '../../../.claude/skills/live-tokens-pair-fonts/SKILL.md?raw';
import pickComponent from '../../../.claude/skills/live-tokens-pick-component/SKILL.md?raw';

const raw: Record<string, string> = {
  'generate-theme': generateTheme,
  'pair-fonts': pairFonts,
  'adjust-geometry': adjustGeometry,
  'pick-component': pickComponent,
  'build-page': buildPage,
  'create-component': createComponent,
  'fix-findings': fixFindings,
  'check-compliance': checkCompliance,
};

export const skillSources: Record<string, string[]> = Object.fromEntries(
  Object.entries(raw).map(([key, text]) => [key, text.replace(/\n$/, '').split('\n')]),
);
