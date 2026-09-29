// Mock contributor and prices. Nothing here is live: the frame only needs
// something to lay out until Thomas's wallet/identity work plugs in.
export const contributor = {
  name: 'Sleety',
  handle: '@sl33ty',
  arrow: 1440,
};

// USDC per ARROW is the AIP-010 policy rate (effective $0.20/token), not a
// market price. The ETH price is a placeholder.
export const USDC_PER_ARROW = 0.2;
export const USDC_PER_ETH = 2500;

export type Quote = 'USDC' | 'ETH';

export function formatQuote(arrow: number, quote: Quote) {
  const usdc = arrow * USDC_PER_ARROW;
  if (quote === 'USDC') return usdc.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return (usdc / USDC_PER_ETH).toLocaleString('en-US', { maximumFractionDigits: 4 });
}
