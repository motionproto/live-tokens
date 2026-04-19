import type { ComponentSection } from './componentSectionType';
import ChoiceButtonsDemo from './demos/ChoiceButtonsDemo.svelte';
import StandardButtonsDemo from './demos/StandardButtonsDemo.svelte';
import NotificationDemo from './demos/NotificationDemo.svelte';
import DialogDemo from './demos/DialogDemo.svelte';
import RadioButtonDemo from './demos/RadioButtonDemo.svelte';
import CardDemo from './demos/CardDemo.svelte';
import BadgeDemo from './demos/BadgeDemo.svelte';
import InlineEditActionsDemo from './demos/InlineEditActionsDemo.svelte';
import SectionDividerDemo from './demos/SectionDividerDemo.svelte';
import CollapsibleSectionDemo from './demos/CollapsibleSectionDemo.svelte';
import TabBarDemo from './demos/TabBarDemo.svelte';
import TooltipDemo from './demos/TooltipDemo.svelte';
import ProgressBarDemo from './demos/ProgressBarDemo.svelte';

export const defaultSections: ComponentSection[] = [
  { id: 'choiceButtons', label: 'Choice Sets', component: ChoiceButtonsDemo },
  { id: 'standardButtons', label: 'Button', component: StandardButtonsDemo },
  { id: 'notifications', label: 'Notification', component: NotificationDemo },
  { id: 'dialog', label: 'Dialog', component: DialogDemo },
  { id: 'radioButtons', label: 'Radio Button', component: RadioButtonDemo },
  { id: 'cards', label: 'Card', component: CardDemo },
  { id: 'traitBadges', label: 'Trait Badge', component: BadgeDemo },
  { id: 'inlineEdit', label: 'Inline Edit Actions', component: InlineEditActionsDemo },
  { id: 'sectionDivider', label: 'Section Divider', component: SectionDividerDemo },
  { id: 'collapsible', label: 'Collapsible Section', component: CollapsibleSectionDemo },
  { id: 'tabBar', label: 'Tab Bar', component: TabBarDemo },
  { id: 'tooltip', label: 'Tooltip', component: TooltipDemo },
  { id: 'progressBar', label: 'Progress Bar', component: ProgressBarDemo },
];
