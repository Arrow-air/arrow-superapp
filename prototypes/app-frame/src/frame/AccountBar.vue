<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from './Icon.vue';
import Menu from './Menu.vue';
import { contributor, formatQuote, type Quote } from './account';

// The top-right account group: dashboard, balance with its value, and the
// contributor. Styled after the workspace tabs, but flat.

// The chosen quote currency is a per-viewer convenience, so it lives in localStorage.
const KEY = 'arrow.quote';
const read = (): Quote => {
  try { return localStorage.getItem(KEY) === 'ETH' ? 'ETH' : 'USDC'; } catch { return 'USDC'; }
};
const quote = ref<Quote>(read());
watch(quote, (q) => { try { localStorage.setItem(KEY, q); } catch { /* storage unavailable */ } });

const arrow = computed(() => contributor.arrow.toLocaleString('en-US'));
const value = computed(() => formatQuote(contributor.arrow, quote.value));
const quotes = computed(() =>
  (['USDC', 'ETH'] as Quote[]).map((q) => ({ id: q, label: `Show in ${q}`, hint: formatQuote(contributor.arrow, q) })),
);
const accountMenu = [
  { id: 'profile', label: 'Profile' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'settings', label: 'Settings' },
  { id: 'sign-out', label: 'Sign out' },
];
</script>

<template>
  <div class="group" role="group" aria-label="Account">
    <button class="seg" type="button">
      <Icon name="grid" :size="14" class="icon" />
      <span class="label-lg">Contributor Dashboard</span>
      <span class="label-sm">Dashboard</span>
    </button>

    <span class="divider hide-sm" aria-hidden="true"></span>

    <Menu class="hide-sm" :items="quotes" :current="quote" align="end" @select="quote = $event as Quote">
      <template #trigger="{ open, toggle }">
        <button
          class="seg balance"
          type="button"
          aria-haspopup="menu"
          :aria-expanded="open"
          :aria-label="`${arrow} ARROW, worth about ${value} ${quote}. Change currency`"
          @click="toggle"
        >
          <span class="num">{{ arrow }}</span><span class="unit">ARROW</span>
          <span class="approx hide-md">≈ <span class="num">{{ value }}</span> <span class="unit">{{ quote }}</span></span>
          <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </template>
    </Menu>

    <span class="divider" aria-hidden="true"></span>

    <Menu :items="accountMenu" align="end">
      <template #trigger="{ open, toggle }">
        <button class="seg who" type="button" aria-haspopup="menu" :aria-expanded="open" @click="toggle">
          <span class="name hide-sm">{{ contributor.name }}</span>
          <span class="avatar" aria-hidden="true"></span>
          <span class="sr-only">Account menu for {{ contributor.name }}</span>
        </button>
      </template>
    </Menu>
  </div>
</template>

<style scoped>
.group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 11px;
  background: var(--account-track);
  border: 1px solid var(--account-border);
}
.seg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding-inline: 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: none;
  color: var(--tabs-fg-hover);
  font-size: var(--text-base);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color 150ms, background-color 150ms;
}
.seg:hover { background: var(--surface-hover); color: var(--fg); }
.seg[aria-expanded='true'] { background: var(--account-active); color: var(--fg); }
.seg:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.icon { color: var(--fg-muted); }

.divider {
  width: 1px;
  height: 16px;
  background: var(--border-soft);
}

.num { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg); letter-spacing: 0.01em; }
.unit { font-size: var(--text-xs); color: var(--fg-muted); letter-spacing: 0.04em; }
.balance .num + .unit { margin-left: -2px; }
.approx { display: inline-flex; align-items: baseline; gap: 4px; margin-left: 4px; color: var(--fg-faint); }
.approx .num { color: var(--fg-2); }
.chev {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: var(--fg-muted);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.who { padding-right: 3px; gap: var(--space-2); }
.avatar {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--avatar);
}

.label-sm { display: none; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (max-width: 1279px) {
  .hide-md { display: none; }
  .label-lg { display: none; }
  .label-sm { display: inline; }
}
@media (max-width: 767px) {
  .hide-sm, .label-sm { display: none; }
  .who { padding-left: 3px; }
}
</style>
