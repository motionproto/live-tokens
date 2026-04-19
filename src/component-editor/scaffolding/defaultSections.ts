import type { ComponentSection } from './componentSectionType';
import ChoiceButtonsEditor from '../ChoiceButtonsEditor.svelte';
import StandardButtonsEditor from '../StandardButtonsEditor.svelte';
import NotificationEditor from '../NotificationEditor.svelte';
import DialogEditor from '../DialogEditor.svelte';
import RadioButtonEditor from '../RadioButtonEditor.svelte';
import CardEditor from '../CardEditor.svelte';
import BadgeEditor from '../BadgeEditor.svelte';
import InlineEditActionsEditor from '../InlineEditActionsEditor.svelte';
import SectionDividerEditor from '../SectionDividerEditor.svelte';
import CollapsibleSectionEditor from '../CollapsibleSectionEditor.svelte';
import TabBarEditor from '../TabBarEditor.svelte';
import TooltipEditor from '../TooltipEditor.svelte';
import ProgressBarEditor from '../ProgressBarEditor.svelte';

export const defaultSections: ComponentSection[] = [
  { id: 'choiceButtons', label: 'Choice Sets', component: ChoiceButtonsEditor },
  { id: 'standardButtons', label: 'Button', component: StandardButtonsEditor },
  { id: 'notifications', label: 'Notification', component: NotificationEditor },
  { id: 'dialog', label: 'Dialog', component: DialogEditor },
  { id: 'radioButtons', label: 'Radio Button', component: RadioButtonEditor },
  { id: 'cards', label: 'Card', component: CardEditor },
  { id: 'traitBadges', label: 'Trait Badge', component: BadgeEditor },
  { id: 'inlineEdit', label: 'Inline Edit Actions', component: InlineEditActionsEditor },
  { id: 'sectionDivider', label: 'Section Divider', component: SectionDividerEditor },
  { id: 'collapsible', label: 'Collapsible Section', component: CollapsibleSectionEditor },
  { id: 'tabBar', label: 'Tab Bar', component: TabBarEditor },
  { id: 'tooltip', label: 'Tooltip', component: TooltipEditor },
  { id: 'progressBar', label: 'Progress Bar', component: ProgressBarEditor },
];
