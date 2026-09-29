<script setup lang="ts">
import { computed, ref } from 'vue';
import Drawer from './Drawer.vue';
import {
  activity, contributor, formatMoney, holdings, quote, quoteValue, shortAddress, type Quote,
} from './account';

// The contributor's wallet in detail: identity, total value, holdings and
// recent activity. Mock data from account.ts.
const open = defineModel<boolean>('open', { required: true });

const total = computed(() => holdings.reduce((sum, h) => sum + quoteValue(h.amount, h.symbol, quote.value), 0));

const copied = ref(false);
async function copyAddress() {
  try {
    await navigator.clipboard.writeText(contributor.address);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch { /* clipboard unavailable */ }
}
</script>

<template>
  <Drawer v-model:open="open" title="Wallet" description="Your balance and recent activity.">
    <div class="identity">
      <span class="avatar" aria-hidden="true">{{ contributor.name.slice(0, 1) }}</span>
      <div class="who">
        <span class="name">{{ contributor.name }}</span>
        <span class="handle">{{ contributor.handle }}</span>
      </div>
      <button class="address" type="button" :aria-label="`Copy address ${contributor.address}`" @click="copyAddress">
        <span class="mono">{{ shortAddress(contributor.address) }}</span>
        <span class="copy-state">{{ copied ? 'Copied' : 'Copy' }}</span>
      </button>
    </div>

    <section class="total">
      <div class="total-head">
        <span class="label caps">Total value</span>
        <div class="seg" role="radiogroup" aria-label="Show value in">
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
      <div class="figure">
        <span class="mono big">{{ formatMoney(total, quote) }}</span>
      </div>
      <div class="actions">
        <button class="btn primary" type="button">Send</button>
        <button class="btn" type="button">Receive</button>
        <button class="btn" type="button">Swap</button>
      </div>
    </section>

    <section class="block">
      <h3 class="label caps">Holdings</h3>
      <ul class="list">
        <li v-for="h in holdings" :key="h.symbol" class="row">
          <span class="token" :data-symbol="h.symbol">{{ h.symbol.slice(0, 1) }}</span>
          <span class="row-main">
            <span class="row-title">{{ h.name }}</span>
            <span class="row-sub">{{ formatMoney(h.amount, h.symbol) }}</span>
          </span>
          <span class="row-value mono">{{ formatMoney(quoteValue(h.amount, h.symbol, quote), quote) }}</span>
        </li>
      </ul>
    </section>

    <section class="block">
      <h3 class="label caps">Recent activity</h3>
      <ul class="list">
        <li v-for="a in activity" :key="a.id" class="row">
          <span class="dir" :class="a.kind" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path :d="a.kind === 'in' ? 'M17 7 7 17M7 8v9h9' : 'M7 17 17 7M8 7h9v9'" /></svg>
          </span>
          <span class="row-main">
            <span class="row-title">{{ a.label }}</span>
            <span class="row-sub">{{ a.detail }} · {{ a.date }}</span>
          </span>
          <span class="row-value mono" :class="a.kind">
            {{ formatMoney(a.amount, a.symbol, true) }}
          </span>
        </li>
      </ul>
    </section>

    <template #footer>
      <div class="foot-row">
        <button class="btn ghost" type="button">Settings</button>
        <button class="btn ghost" type="button">View on Etherscan</button>
      </div>
      <button class="btn danger" type="button">Disconnect</button>
    </template>
  </Drawer>
</template>

<style scoped>
.caps { font-size: var(--text-xs); letter-spacing: var(--tracking-caps); text-transform: uppercase; }
.mono { font-family: var(--font-mono); }
.label { margin: 0; font-weight: 400; color: var(--fg-muted); }

.identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
}
.avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 9px;
  background: var(--avatar);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 -1px 0 rgb(0 0 0 / 0.2), 0 0 0 1px rgb(0 0 0 / 0.3);
  color: var(--plum-1);
  font-size: var(--text-md);
  font-weight: 700;
}
.who { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.name { font-weight: 600; color: var(--fg); }
.handle { font-size: var(--text-sm); color: var(--fg-muted); }
.address {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: 28px;
  padding: 0 var(--space-2);
  border: 1px solid var(--select-border);
  border-radius: 8px;
  background: var(--select-bg);
  color: var(--fg-2);
  font-size: var(--text-sm);
  cursor: pointer;
}
.address:hover { border-color: var(--border-strong); }
.copy-state { font-size: var(--text-sm); color: var(--fg-muted); }

.total {
  padding: var(--space-4);
  border: 1px solid var(--toolbar-border);
  border-radius: 12px;
  background: var(--slate-a2);
}
.total-head { display: flex; align-items: center; justify-content: space-between; }
.figure { display: flex; align-items: baseline; gap: 6px; margin: var(--space-2) 0 var(--space-4); }
.big { font-size: var(--text-xl); color: var(--fg); letter-spacing: -0.02em; }

/* Small segmented control, same shape as the workspace tabs, flat. */
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a3); }
.seg button {
  height: 22px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--fg-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}
.seg button:hover { color: var(--fg-2); }
.seg button[aria-checked='true'] { background: var(--slate-a4); color: var(--fg); }

.actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.btn {
  height: 30px;
  padding: 0 var(--space-3);
  border: 1px solid var(--select-border);
  border-radius: 8px;
  background: var(--select-bg);
  color: var(--fg);
  font-size: var(--text-base);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms, border-color 150ms;
}
.btn:hover { background: var(--slate-a3); border-color: var(--border-strong); }
/* Primary, after the coss toolbar's Save: light fill with an inset top highlight. */
.btn.primary {
  border-color: var(--slate-12);
  background: var(--slate-12);
  color: var(--slate-1);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.16);
}
.btn.primary:hover { background: var(--slate-11); border-color: var(--slate-11); }
.btn.ghost { border-color: transparent; background: none; color: var(--fg-2); }
.btn.ghost:hover { background: var(--surface-hover); color: var(--fg); }
.btn.danger { border-color: var(--danger-border); background: var(--danger-bg); color: var(--danger); }
.btn.danger:hover { background: var(--red-a3); }
.btn:focus-visible, .address:focus-visible, .seg button:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }

.block { margin-top: var(--space-6); }
.list { margin: var(--space-2) 0 0; padding: 0; list-style: none; }
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.row + .row { border-top: 1px solid var(--border-soft); }
.row-main { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.row-title { color: var(--fg); }
.row-sub { font-size: var(--text-sm); color: var(--fg-muted); }
.row-value { font-size: var(--text-sm); color: var(--fg-2); white-space: nowrap; }
.row-value.in { color: var(--success); }

.token, .dir {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex: none;
  font-size: var(--text-sm);
  font-weight: 600;
}
.token[data-symbol='ARROW'] { background: var(--indigo-a4); color: var(--indigo-11); }
.token[data-symbol='USDC'] { background: var(--slate-a4); color: var(--slate-11); }
.token[data-symbol='ETH'] { background: var(--plum-4); color: var(--plum-11); }
.dir { background: var(--slate-a3); color: var(--fg-muted); }
.dir.in { background: var(--jade-a3); color: var(--jade-11); }
.dir svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

.foot-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
</style>
