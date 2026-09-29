<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from './Icon.vue';
import Menu from './Menu.vue';
import { contributor, formatQuote, type Quote } from './account';

// The top-right account toolbar, after coss ui Toolbar: ghost buttons in
// groups split by separators, with the quote currency as an outlined select.

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
  (['USDC', 'ETH'] as Quote[]).map((q) => ({ id: q, label: q, hint: formatQuote(contributor.arrow, q) })),
);
const accountMenu = [
  { id: 'profile', label: 'Profile' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'settings', label: 'Settings' },
  { id: 'sign-out', label: 'Sign out' },
];
</script>

<template>
  <div class="toolbar" role="toolbar" aria-label="Account">
    <div class="tgroup">
      <button class="tbtn" type="button">
        <Icon name="grid" :size="13" class="icon" />
        <span class="hide-md">Contributor Dashboard</span>
        <span class="show-md">Dashboard</span>
      </button>
    </div>

    <span class="sep hide-sm" aria-hidden="true"></span>

    <div class="tgroup hide-sm">
      <span class="balance" :aria-label="`${arrow} ARROW`">
        <span class="num">{{ arrow }}</span><span class="unit">ARROW</span>
      </span>
      <Menu :items="quotes" :current="quote" align="end" @select="quote = $event as Quote">
        <template #trigger="{ open, toggle }">
          <button
            class="select"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="open"
            :aria-label="`Worth about ${value} ${quote}. Change currency`"
            @click="toggle"
          >
            <span class="approx">≈</span>
            <span class="num">{{ value }}</span><span class="unit">{{ quote }}</span>
            <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
          </button>
        </template>
      </Menu>
    </div>

    <span class="sep" aria-hidden="true"></span>

    <div class="tgroup">
      <Menu :items="accountMenu" align="end">
        <template #trigger="{ open, toggle }">
          <button
            class="tbtn who"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="open"
            :aria-label="`Account menu for ${contributor.name}`"
            @click="toggle"
          >
            <span class="hide-sm">{{ contributor.name }}</span>
            <span class="avatar" aria-hidden="true"></span>
          </button>
        </template>
      </Menu>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: var(--control-height);
  padding: 3px;
  border: 1px solid var(--toolbar-border);
  border-radius: 12px;
  background: var(--toolbar-bg);
}
.tgroup { display: flex; align-items: center; gap: var(--space-1); }
.sep { width: 1px; height: 18px; background: var(--toolbar-sep); }

/* Ghost button */
.tbtn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding-inline: 9px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: none;
  color: var(--fg-2);
  font-size: var(--text-base);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color 150ms, background-color 150ms;
}
.tbtn:hover { background: var(--surface-hover); color: var(--fg); }
.tbtn[aria-expanded='true'] { background: var(--toolbar-active); color: var(--fg); }
.icon { color: var(--fg-muted); }

/* Outlined select */
.select {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  height: 28px;
  padding: 0 6px 0 8px;
  border: 1px solid var(--select-border);
  border-radius: 8px;
  background: var(--select-bg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
  line-height: 26px;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 150ms, background-color 150ms;
}
.select:hover { border-color: var(--border-strong); }
.select[aria-expanded='true'] { background: var(--toolbar-active); }
.tbtn:focus-visible, .select:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }

.balance { display: inline-flex; align-items: baseline; gap: 3px; padding-inline: 6px; }
.num { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg); }
.select .num { color: var(--fg-2); }
.unit { font-size: var(--text-2xs); font-weight: 500; letter-spacing: 0.06em; color: var(--fg-muted); }
.approx { font-size: var(--text-sm); color: var(--fg-faint); }
.chev {
  align-self: center;
  width: 12px;
  height: 12px;
  margin-left: 3px;
  fill: none;
  stroke: var(--fg-muted);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.who { padding-right: 3px; gap: 7px; }
.avatar {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--avatar);
}

.show-md { display: none; }
@media (max-width: 1279px) {
  .hide-md { display: none; }
  .show-md { display: inline; }
}
@media (max-width: 767px) {
  .hide-sm, .show-md { display: none; }
  .who { padding-left: 3px; }
}
</style>
