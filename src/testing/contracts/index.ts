import type { ComponentContract } from '../componentContract';
import { badgeContract } from './badge';
import { buttonContract } from './button';
import { calloutContract } from './callout';
import { cardContract } from './card';
import { codeSnippetContract } from './codesnippet';
import { collapsibleSectionContract } from './collapsiblesection';
import { cornerBadgeContract } from './cornerbadge';
import { dialogContract } from './dialog';
import { iconButtonContract } from './iconbutton';
import { imageContract } from './image';
import { imageLightboxContract } from './imagelightbox';
import { inlineEditActionsContract } from './inlineeditactions';
import { inputContract } from './input';
import { menuSelectContract } from './menuselect';
import { notificationContract } from './notification';
import { panelContract } from './panel';
import { progressBarContract } from './progressbar';
import { radioButtonContract } from './radiobutton';
import { sectionDividerContract } from './sectiondivider';
import { segmentedControlContract } from './segmentedcontrol';
import { sideNavigationContract } from './sidenavigation';
import { sliderContract } from './slider';
import { tabBarContract } from './tabbar';
import { tableContract } from './table';
import { toggleContract } from './toggle';
import { tooltipContract } from './tooltip';

export const shippedContracts: ComponentContract[] = [
  badgeContract,
  buttonContract,
  calloutContract,
  cardContract,
  codeSnippetContract,
  collapsibleSectionContract,
  cornerBadgeContract,
  dialogContract,
  iconButtonContract,
  imageContract,
  imageLightboxContract,
  inlineEditActionsContract,
  inputContract,
  menuSelectContract,
  notificationContract,
  panelContract,
  progressBarContract,
  radioButtonContract,
  sectionDividerContract,
  segmentedControlContract,
  sideNavigationContract,
  sliderContract,
  tabBarContract,
  tableContract,
  toggleContract,
  tooltipContract,
];

/** The contracts a run covers, narrowed by `LIVE_TOKENS_COMPONENT`. */
export function selectedContracts(
  contracts: ComponentContract[] = shippedContracts,
): ComponentContract[] {
  const requested = process.env.LIVE_TOKENS_COMPONENT;
  return requested ? contracts.filter((contract) => contract.id === requested) : contracts;
}

export {
  badgeContract,
  buttonContract,
  calloutContract,
  cardContract,
  codeSnippetContract,
  collapsibleSectionContract,
  cornerBadgeContract,
  dialogContract,
  iconButtonContract,
  imageContract,
  imageLightboxContract,
  inlineEditActionsContract,
  inputContract,
  menuSelectContract,
  notificationContract,
  panelContract,
  progressBarContract,
  radioButtonContract,
  sectionDividerContract,
  segmentedControlContract,
  sideNavigationContract,
  sliderContract,
  tabBarContract,
  tableContract,
  toggleContract,
  tooltipContract,
};
