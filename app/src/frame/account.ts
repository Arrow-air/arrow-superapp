import { ref, watch } from 'vue';

// The demo visitor: no account, no wallet linked, no history. Identity and
// wallets plug in later; until then nothing here should look like a balance.
export const contributor = {
  name: 'You',
  handle: 'Demo visitor · no wallet linked',
  address: '',
  arrow: 0,
};

export const holdings: { symbol: string; name: string; amount: number }[] = [
  { symbol: 'ARROW', name: 'Arrow', amount: 0 },
];

export const activity: { id: string; kind: 'in' | 'out'; label: string; detail: string; amount: number; symbol: string; date: string }[] = [];

// Footer status. The demo has no network connection; the GitHub data is a
// snapshot taken at build time.
export const network = { name: 'Demo', connected: false };

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
// How amounts read on screen. No uppercase tickers: USDC shows as dollars,
// ETH with the ether sign, and ARROW as the word "Arrow".
export function formatMoney(n: number, symbol: string, signed = false) {
  const sign = signed && n > 0 ? '+' : n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (symbol === 'USDC') return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (symbol === 'ETH') return `${sign}Ξ${abs.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
  return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 2 })} Arrow`;
}
export const shortAddress = (a: string) => (a.startsWith('0x') ? `${a.slice(0, 6)}…${a.slice(-4)}` : 'Not linked');

// The chosen quote currency, shared by the toolbar and the wallet drawer.
// A per-viewer convenience, so it lives in localStorage.
const KEY = 'arrow.quote';
const read = (): Quote => {
  try { return localStorage.getItem(KEY) === 'ETH' ? 'ETH' : 'USDC'; } catch { return 'USDC'; }
};
export const quote = ref<Quote>(read());
watch(quote, (q) => { try { localStorage.setItem(KEY, q); } catch { /* storage unavailable */ } });
