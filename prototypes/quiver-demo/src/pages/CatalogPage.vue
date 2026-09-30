<script setup lang="ts">
import { computed } from 'vue';
import Avatar from '../modules/threads/Avatar.vue';
import { attachments, statusLabel, type AttachmentStatus } from '../data/attachments';
import { personById } from '../data/people';
import { isOpen, state } from '../modules/threads/store';
import { zonePath } from '../frame/nav';

// Every attachment Quiver has, by how far along it is: flown, prototyped,
// designed as a reference, or specified and waiting for someone to build it.
const order: AttachmentStatus[] = ['flown', 'prototype', 'reference', 'defined'];
const heading: Record<AttachmentStatus, string> = {
  flown: 'Built and flown',
  prototype: 'Prototyped',
  reference: 'Reference designs',
  defined: 'Ready for contributors: requirements written',
};
const groups = computed(() => order.map((s) => ({ s, items: attachments.filter((a) => a.status === s) })).filter((g) => g.items.length));
const openThreads = (zone?: string) => (zone ? state.threads.filter((t) => t.zone === zone && isOpen(t)).length : 0);
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">Attachments</h1>
        <p class="view-lede">
          Quiver carries payloads on three quick-release ports: bottom and two sides, each with power, Ethernet, CAN and a PWM channel. Everything here builds against
          <RouterLink :to="zonePath('interface')">the attachment interface</RouterLink>. Have an idea?
          <RouterLink :to="zonePath('attachment-ideas')">Propose it</RouterLink>.
        </p>
      </div>
    </div>
    <section v-for="g in groups" :key="g.s" class="view-section">
      <h2>{{ heading[g.s] }}</h2>
      <div class="grid">
        <RouterLink v-for="a in g.items" :key="a.id" :to="zonePath(a.zone ?? 'concepts')" class="card">
          <span class="top">
            <span class="name">{{ a.name }}</span>
            <span class="status" :data-status="a.status">{{ statusLabel[a.status] }}</span>
          </span>
          <span class="what">{{ a.what }}</span>
          <span v-if="a.port || a.data" class="spec">
            <template v-if="a.port">Port: {{ a.port }}</template>
            <template v-if="a.port && a.data"> · </template>
            <template v-if="a.data">{{ a.data }}</template>
          </span>
          <span class="foot">
            <span v-if="a.champion" class="champ"><Avatar v-for="c in a.champion" :key="c" :id="c" :size="14" /> {{ a.champion.map((c) => personById(c)?.name).join(', ') }}</span>
            <span v-if="a.status !== 'defined' && openThreads(a.zone)" class="threads">{{ openThreads(a.zone) }} open {{ openThreads(a.zone) === 1 ? 'thread' : 'threads' }}</span>
          </span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.card { display: flex; flex-direction: column; gap: 6px; padding: 14px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2); text-decoration: none; transition: border-color 120ms; }
.card:hover { border-color: var(--slate-a7); }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.name { color: var(--fg); font-weight: 600; font-size: var(--text-nav); }
.status { flex: none; height: 18px; padding: 0 6px; border-radius: 5px; background: var(--slate-a3); color: var(--fg-muted); font-size: 11px; line-height: 18px; font-weight: 500; }
.status[data-status='flown'] { background: var(--jade-a3); color: var(--jade-11); }
.status[data-status='prototype'] { background: var(--indigo-a3); color: var(--indigo-11); }
.status[data-status='reference'] { background: var(--amber-a3); color: var(--amber-11); }
.what { color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
.spec { color: var(--fg-muted); font-size: var(--text-sm); }
.foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; font-size: var(--text-sm); color: var(--fg-muted); }
.foot:empty { display: none; }
.champ { display: inline-flex; align-items: center; gap: 3px; }
.champ .av + .av { margin-left: -4px; }
.threads { color: var(--indigo-11); }
</style>
