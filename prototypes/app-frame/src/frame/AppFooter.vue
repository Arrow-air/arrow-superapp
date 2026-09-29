<script setup lang="ts">
import Icon from './Icon.vue';
import { dao, formatMoney, network, quote, quoteValue, sync, type Quote, USDC_PER_ETH } from './account';
import { socials } from './links';
import { theme, type Theme } from './theme';
import type { IconName } from './icons';

const themes: { id: Theme; label: string; icon: IconName }[] = [
  { id: 'system', label: 'System', icon: 'monitor' },
  { id: 'light', label: 'Light', icon: 'sun' },
  { id: 'dark', label: 'Dark', icon: 'moon' },
];

// The status bar pinned to the bottom, after OpenSea's footer: network and
// sync state and live DAO activity on the left; prices, support and the
// quote currency on the right. The currency switch shares state with the
// wallet toolbar.
const SITE = 'https://arrowair.com';
</script>

<template>
  <footer class="footer" aria-label="Status">
    <div class="side">
      <span class="stat" :title="network.connected ? `Connected to ${network.name}` : 'Disconnected'">
        <span class="live" :class="{ off: !network.connected }" aria-hidden="true"></span>
        {{ network.name }}
      </span>
      <span class="sep" aria-hidden="true"></span>
      <span class="stat"><Icon name="sync" :size="11" /> Synced with {{ sync.source }} · {{ sync.ago }}</span>
      <span class="sep hide-md" aria-hidden="true"></span>
      <a class="stat link hide-md" :href="`${SITE}/docs/governance/good-to-know/dao-voting`" target="_blank" rel="noopener">
        <Icon name="vote" :size="11" /> {{ dao.votesOpen }} votes open
      </a>
      <a class="stat link hide-md" :href="`${SITE}/bounty/`" target="_blank" rel="noopener">
        <Icon name="coin" :size="11" /> {{ dao.bountiesOpen }} bounties
      </a>
      <span class="sep hide-md" aria-hidden="true"></span>
      <a class="stat link hide-md" :href="`${SITE}/docs/`" target="_blank" rel="noopener">Docs</a>
      <span class="socials hide-md">
        <a v-for="s in socials" :key="s.label" :href="s.href" target="_blank" rel="noopener" :aria-label="s.label" :title="s.label">
          <Icon :name="s.icon" :size="12" />
        </a>
      </span>
    </div>

    <div class="side">
      <span class="stat price hide-sm" title="Arrow at the AIP-010 rate">
        <span class="coin arrow" aria-hidden="true">A</span>{{ formatMoney(quoteValue(1, 'ARROW', 'USDC'), 'USDC') }}
      </span>
      <span class="stat price hide-sm" title="Ether (placeholder price)">
        <span class="coin eth" aria-hidden="true">Ξ</span>{{ formatMoney(USDC_PER_ETH, 'USDC') }}
      </span>
      <span class="sep hide-sm" aria-hidden="true"></span>
      <a class="stat link hide-sm" href="https://discord.com/invite/arrow" target="_blank" rel="noopener"><Icon name="help" :size="11" /> Support</a>
      <div class="seg icons" role="radiogroup" aria-label="Theme">
        <button
          v-for="t in themes"
          :key="t.id"
          type="button"
          role="radio"
          :aria-checked="theme === t.id"
          :aria-label="t.label"
          :title="t.label"
          @click="theme = t.id"
        ><Icon :name="t.icon" :size="11" /></button>
      </div>
      <div class="seg" role="radiogroup" aria-label="Show values in">
        <button
          v-for="q in (['USDC', 'ETH'] as Quote[])"
          :key="q"
          type="button"
          role="radio"
          :aria-checked="quote === q"
          @click="quote = q"
        >{{ q }}</button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: sticky;
  bottom: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  height: var(--footer-height);
  padding: 0 var(--frame-inset) 0 calc(var(--frame-inset) + 4px);
  border-top: 1px solid var(--slate-a4);
  background: var(--bg);
  font-size: var(--text-sm);
  color: var(--fg-muted);
  white-space: nowrap;
}
.side { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.stat { display: inline-flex; align-items: center; gap: 5px; }
.stat :deep(svg) { color: var(--fg-faint); }
.link { color: inherit; text-decoration: none; transition: color 150ms; }
.link:hover { color: var(--fg); }
.link:hover :deep(svg) { color: var(--fg-2); }
.sep { width: 1px; height: 12px; background: var(--slate-a5); }

/* Live dot: jade with a slow breathing halo, like OpenSea's. */
.live {
  position: relative;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--status-current);
}
.live::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: var(--status-current);
  opacity: 0.35;
  animation: breathe 2.4s ease-in-out infinite;
}
.live.off { background: var(--status-unmaintained); }
.live.off::after { display: none; }
@keyframes breathe {
  0%, 100% { transform: scale(0.6); opacity: 0.35; }
  50% { transform: scale(1.2); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) { .live::after { animation: none; } }

.socials { display: inline-flex; gap: 2px; }
.socials a {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: var(--fg-faint);
  transition: color 150ms, background-color 150ms;
}
.socials a:hover { background: var(--surface-hover); color: var(--fg); }

.price { font-family: var(--font-mono); color: var(--fg-2); }
.coin {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  font-family: var(--font-sans);
  font-size: 8px;
  font-weight: 700;
}
.coin.arrow { background: var(--indigo-9); color: #fff; }
.coin.eth { background: var(--slate-a4); color: var(--fg-2); }

/* Small segmented switch, same family as the tabs, flat. */
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 7px; background: var(--slate-a3); }
.seg button {
  height: 20px;
  padding: 0 7px;
  border: 0;
  border-radius: 5px;
  background: none;
  color: var(--fg-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}
.seg button:hover { color: var(--fg-2); }
.seg button[aria-checked='true'] { background: var(--slate-a5); color: var(--fg); }
.seg.icons button { width: 24px; padding: 0; display: grid; place-items: center; }
.seg.icons button :deep(svg) { color: inherit; }
.link:focus-visible, .socials a:focus-visible, .seg button:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); border-radius: 5px; }

@media (max-width: 1279px) { .hide-md { display: none; } }
@media (max-width: 767px) {
  .hide-sm { display: none; }
  .footer { padding-inline: var(--gutter); }
}
</style>
