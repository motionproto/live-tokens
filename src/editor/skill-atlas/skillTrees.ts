import type { SkillTree } from './types';
import { createTheme } from './trees/create-theme';
import { setColors } from './trees/set-colors';
import { setType } from './trees/set-type';
import { setGeometry } from './trees/set-geometry';
import { pickComponent } from './trees/pick-component';
import { createPage } from './trees/create-page';
import { createComponent } from './trees/create-component';
import { checkCompliance } from './trees/check-compliance';
import { fixFindings } from './trees/fix-findings';

// Tab order: the theme route and its three set skills, the page path, then the audit pair.
export const skillTrees: Record<string, SkillTree> = {
  'create-theme': createTheme,
  'set-colors': setColors,
  'set-type': setType,
  'set-geometry': setGeometry,
  'pick-component': pickComponent,
  'create-page': createPage,
  'create-component': createComponent,
  'check-compliance': checkCompliance,
  'fix-findings': fixFindings,
};
