import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

/** Names the module `selectedContracts` loads a custom component's
 *  `ComponentContract[]` from. The suite files are static Playwright entry
 *  points with no argument to receive one through, so an env var plus a
 *  dynamic import is the only route in. */
export const CONTRACTS_MODULE_ENV = 'LIVE_TOKENS_CONTRACTS_MODULE';

async function loadCustomContracts(): Promise<ComponentContract[]> {
  const modulePath = process.env[CONTRACTS_MODULE_ENV];
  if (!modulePath) return [];
  const mod = await import(pathToFileURL(path.resolve(modulePath)).href);
  const value = mod.default ?? mod.contracts;
  if (!Array.isArray(value)) {
    throw new Error(
      `${CONTRACTS_MODULE_ENV}=${modulePath} does not export a contracts array `
      + '(default export or a named "contracts" export)',
    );
  }
  return value as ComponentContract[];
}

/** The shipped list plus whatever `LIVE_TOKENS_CONTRACTS_MODULE` names,
 *  unfiltered — what a "no contract for this id" error lists as declared. */
export async function allContracts(
  contracts: ComponentContract[] = shippedContracts,
): Promise<ComponentContract[]> {
  const custom = await loadCustomContracts();
  return custom.length > 0 ? [...contracts, ...custom] : contracts;
}

/** The contracts a run covers, narrowed by `LIVE_TOKENS_COMPONENT`. */
export async function selectedContracts(
  contracts: ComponentContract[] = shippedContracts,
): Promise<ComponentContract[]> {
  const all = await allContracts(contracts);
  const requested = process.env.LIVE_TOKENS_COMPONENT;
  return requested ? all.filter((contract) => contract.id === requested) : all;
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
