const COMPONENT_SOURCE: Record<string, string> = {
  badge: 'Badge',
  button: 'Button',
  card: 'Card',
  collapsiblesection: 'CollapsibleSection',
  dialog: 'Dialog',
  inlineeditactions: 'InlineEditActions',
  notification: 'Notification',
  progressbar: 'ProgressBar',
  radiobutton: 'RadioButton',
  sectiondivider: 'SectionDivider',
  segmentedcontrol: 'SegmentedControl',
  tabbar: 'TabBar',
  tooltip: 'Tooltip',
};

export function componentSourceFile(component: string): string {
  const name = COMPONENT_SOURCE[component];
  return name ? `src/components/${name}.svelte` : '';
}
