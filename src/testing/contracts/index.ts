import type { ComponentContract } from '../componentContract';
import { sliderContract } from './slider';
import { sectionDividerContract } from './sectiondivider';

export const shippedContracts: ComponentContract[] = [
  sectionDividerContract,
  sliderContract,
];

/** The contracts a run covers, narrowed by `LIVE_TOKENS_COMPONENT`. */
export function selectedContracts(
  contracts: ComponentContract[] = shippedContracts,
): ComponentContract[] {
  const requested = process.env.LIVE_TOKENS_COMPONENT;
  return requested ? contracts.filter((contract) => contract.id === requested) : contracts;
}

export { sliderContract, sectionDividerContract };
