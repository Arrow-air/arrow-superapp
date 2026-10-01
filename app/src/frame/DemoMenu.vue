<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import type { Role } from '../modules/threads/weights';
import { resetDemo, state, touched } from '../modules/threads/store';

// Demo scaffolding in one place, out of the product: who you are pretending
// to be, and putting the seed back. Nothing here exists in the real app.
const open = ref(false);
const root = ref<HTMLElement>();
const onDoc = (e: MouseEvent) => { if (!root.value?.contains(e.target as Node)) open.value = false; };
document.addEventListener('click', onDoc);
onBeforeUnmount(() => document.removeEventListener('click', onDoc));
const roles: { id: Role; label: string; note: string }[] = [
  { id: 'member', label: 'Member', note: 'votes count 1×' },
  { id: 'core', label: 'Core', note: '1.5×' },
  { id: 'lead', label: 'Lead', note: '2×, can decide' },
];
function reset() {
  if (confirm('Reset the demo? Your votes, replies, new threads and decisions in this browser are cleared.')) {
    resetDemo();
    open.value = false;
  }
}
</script>

<template>
  <div ref="root" class="demo">
    <button class="trigger" type="button" :aria-expanded="open" @click="open = !open">
      <span class="live" aria-hidden="true"></span>
      Demo<span class="hide-md">&nbsp;· viewing as {{ state.role }}</span>
    </button>
    <div v-if="open" class="pop" role="dialog" aria-label="Demo settings">
      <p class="p">No backend: what you do stays in this browser.</p>
      <div class="lab">View as</div>
      <div class="seg" role="radiogroup" aria-label="View as">
        <button v-for="r in roles" :key="r.id" type="button" role="radio" :aria-checked="state.role === r.id" :title="r.note" @click="state.role = r.id">{{ r.label }}</button>
      </div>
      <p class="note">{{ roles.find((r) => r.id === state.role)?.note }}</p>
      <label class="check"><input v-model="state.builder" type="checkbox" /> I'd help build what I vote for (+1 weight)</label>
      <button class="reset" type="button" :disabled="!touched" @click="reset">Reset demo</button>
    </div>
  </div>
</template>

<style scoped>
.demo { position: relative; }
.trigger { display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; cursor: pointer; }
.trigger:hover { color: var(--fg); }
.live { width: 7px; height: 7px; border-radius: 50%; background: var(--amber-9); }
.pop {
  position: absolute; left: 0; bottom: calc(100% + 10px); z-index: 70; width: 260px; padding: 12px;
  border: 1px solid var(--slate-a5); border-radius: 12px; background: var(--surface); box-shadow: 0 12px 32px -8px rgb(0 0 0 / 0.4);
  white-space: normal; color: var(--fg-2); font-size: var(--text-base);
}
.p { margin: 0 0 10px; color: var(--fg-muted); font-size: var(--text-sm); line-height: 1.5; }
.lab { margin-bottom: 4px; font-size: var(--text-sm); color: var(--fg-faint); }
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a3); }
.seg button { height: 24px; padding: 0 10px; border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; }
.seg button[aria-checked='true'] { background: var(--slate-a6); color: var(--fg); }
.note { margin: 4px 0 10px; font-size: var(--text-sm); color: var(--fg-faint); }
.check { display: flex; align-items: center; gap: 6px; font-size: var(--text-sm); cursor: pointer; }
.check input { accent-color: var(--indigo-9); }
.reset { margin-top: 12px; height: 26px; padding: 0 10px; border: 1px solid var(--slate-a5); border-radius: 7px; background: none; color: var(--amber-11); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.reset:disabled { opacity: 0.4; cursor: default; }
@media (max-width: 1279px) { .hide-md { display: none; } }
</style>
