<script setup lang="ts">
import { computed, ref } from 'vue';
import Icon from './Icon.vue';
import Menu from './Menu.vue';
import WalletDrawer from './WalletDrawer.vue';
import logomark from '../assets/arrow-logomark-white.svg';
import { contributor, formatQuote, quote, type Quote } from './account';

// Top right: the dashboard button on its own, then a toolbar (after coss ui
// Toolbar) holding the balance with its quote select, and the contributor,
// which opens the wallet drawer.
const arrow = computed(() => contributor.arrow.toLocaleString('en-US'));
const value = computed(() => formatQuote(contributor.arrow, quote.value));
const quotes = computed(() =>
  (['USDC', 'ETH'] as Quote[]).map((q) => ({ id: q, label: q, hint: formatQuote(contributor.arrow, q) })),
);
const walletOpen = ref(false);
</script>

<template>
  <div class="account">
    <button class="tbtn dash" type="button">
      <Icon name="grid" :size="12" class="icon" />
      <span class="hide-md">Contributor Dashboard</span>
      <span class="show-md">Dashboard</span>
    </button>

    <div class="toolbar" role="toolbar" aria-label="Wallet">
      <Menu class="hide-sm" :items="quotes" :current="quote" align="end" @select="quote = $event as Quote">
        <template #trigger="{ open, toggle }">
          <button
            class="tbtn balance"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="open"
            :aria-label="`${arrow} ARROW, worth about ${value} ${quote}. Change currency`"
            @click="toggle"
          >
            <span class="token" aria-hidden="true"><img :src="logomark" alt="" /></span>
            <span class="stack">
              <span class="line1"><span class="num">{{ arrow }}</span> <span class="unit">ARROW</span></span>
              <span class="line2">≈ {{ value }} {{ quote }}</span>
            </span>
            <svg class="chev-v" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
          </button>
        </template>
      </Menu>

      <span class="tsep hide-sm" aria-hidden="true"></span>

      <button
        class="tbtn who"
        type="button"
        aria-haspopup="dialog"
        :aria-expanded="walletOpen"
        :aria-label="`Open wallet for ${contributor.name}`"
        @click="walletOpen = true"
      >
        <span class="avatar" aria-hidden="true">
          {{ contributor.name.slice(0, 1) }}
          <span class="status" title="Wallet connected"></span>
        </span>
        <span class="hide-sm">{{ contributor.name }}</span>
      </button>
    </div>

    <WalletDrawer v-model:open="walletOpen" />
  </div>
</template>

<style scoped>
.account { display: flex; align-items: center; gap: var(--space-2); }
.dash { height: var(--control-height); padding-inline: 12px; border-radius: 10px; }

/* Balance: token badge, amount over value, no inner box. */
.balance { height: 28px; padding: 0 8px 0 4px; gap: 8px; }
.token {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand-fill);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.25), 0 0 0 1px rgb(0 0 0 / 0.3);
}
.token img { width: 11px; height: 12px; margin-top: -1px; }
.stack { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.05; }
.line1 { display: inline-flex; align-items: baseline; gap: 3px; }
.num { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg); }
.unit { font-size: var(--text-2xs); font-weight: 500; letter-spacing: 0.06em; color: var(--fg-muted); }
.line2 { font-family: var(--font-mono); font-size: 9.5px; color: var(--fg-muted); letter-spacing: 0.01em; }

/* Profile: avatar with initial and a connected dot. */
.who { padding-left: 3px; gap: 8px; color: var(--fg); }
.avatar {
  position: relative;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--avatar);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 -1px 0 rgb(0 0 0 / 0.2), 0 0 0 1px rgb(0 0 0 / 0.3);
  color: var(--plum-1);
  font-size: var(--text-sm);
  font-weight: 700;
  text-shadow: 0 1px 0 rgb(255 255 255 / 0.2);
}
.status {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--jade-9);
  box-shadow: 0 0 0 2px var(--toolbar-bg);
}

.show-md { display: none; }
@media (max-width: 1279px) {
  .hide-md { display: none; }
  .show-md { display: inline; }
}
@media (max-width: 767px) {
  .hide-sm, .show-md { display: none; }
  .who { padding-right: 3px; }
}
</style>
