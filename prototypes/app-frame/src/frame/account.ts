import { ref, watch } from 'vue';

// Mock contributor, wallet and prices. Nothing here is live: the frame only
// needs something to lay out until Thomas's wallet/identity work plugs in.
export const contributor = {
  name: 'Sleety',
  handle: '@sl33ty',
  address: '0x71C4a0e2b9D3f58A6c1E7b204dF9e3a8B5c63a9E',
  arrow: 1440,
};

export const holdings = [
  { symbol: 'ARROW', name: 'Arrow', amount: 1440 },
  { symbol: 'USDC', name: 'USD Coin', amount: 125.5 },
  { symbol: 'ETH', name: 'Ether', amount: 0.042 },
] as const;

export const activity = [
  { id: 'a1', kind: 'in', label: 'Contribution reward', detail: 'From Arrow DAO treasury', amount: 400, symbol: 'ARROW', date: '27 Sep' },
  { id: 'a2', kind: 'out', label: 'Swap', detail: 'ARROW to USDC', amount: -200, symbol: 'ARROW', date: '19 Sep' },
  { id: 'a3', kind: 'in', label: 'Contribution reward', detail: 'From Arrow DAO treasury', amount: 640, symbol: 'ARROW', date: '30 Aug' },
  { id: 'a4', kind: 'in', label: 'Received', detail: 'From 0x9a3F…c21B', amount: 0.02, symbol: 'ETH', date: '12 Aug' },
] as const;

// USDC per ARROW is the AIP-010 policy rate (effective $0.20/token), not a
// market price. The ETH price is a placeholder.
export const USDC_PER_ARROW = 0.2;
export const USDC_PER_ETH = 2500;
const USDC_PER: Record<string, number> = { ARROW: USDC_PER_ARROW, USDC: 1, ETH: USDC_PER_ETH };

export type Quote = 'USDC' | 'ETH';

// Value of an amount of any held token, in the chosen quote currency.
export function quoteValue(amount: number, symbol: string, q: Quote) {
  const usdc = amount * (USDC_PER[symbol] ?? 0);
  return q === 'USDC' ? usdc : usdc / USDC_PER_ETH;
}
export function formatAmount(n: number, q: Quote | string) {
  return n.toLocaleString('en-US', { maximumFractionDigits: q === 'ETH' ? 4 : 2 });
}
export function formatQuote(arrow: number, q: Quote) {
  return formatAmount(quoteValue(arrow, 'ARROW', q), q);
}
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// The chosen quote currency, shared by the toolbar and the wallet drawer.
// A per-viewer convenience, so it lives in localStorage.
const KEY = 'arrow.quote';
const read = (): Quote => {
  try { return localStorage.getItem(KEY) === 'ETH' ? 'ETH' : 'USDC'; } catch { return 'USDC'; }
};
export const quote = ref<Quote>(read());
watch(quote, (q) => { try { localStorage.setItem(KEY, q); } catch { /* storage unavailable */ } });
