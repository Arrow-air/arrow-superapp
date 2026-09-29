<script setup lang="ts">
import { computed } from 'vue';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import StatusIcon from '../modules/threads/StatusIcon.vue';
import { areaOf, byActivity, day, standing, state } from '../modules/threads/store';
import { attachments } from '../data/attachments';
import { gate } from '../data/gate';
import { tasks, prs, REPO } from '../data/quiver';
import { tabs, zoneLabel, zonePath } from '../frame/nav';

// Quiver at a glance: what it is, the areas where the work is, what needs
// input across all of them, and what was decided lately.
const areas = [
  { id: 'attachments', blurb: 'Payloads on the three quick-release ports, and the interface standard they build against.' },
  { id: 'software', blurb: 'The SDK, QuiverHub on the onboard computer, the ground station and remote, and autonomy.' },
  { id: 'aircraft', blurb: 'The next hardware revision, flight testing, and operating the aircraft.' },
  { id: 'build', blurb: 'Guides for building and configuring units, and bringing on more manufacturers.' },
  { id: 'selling', blurb: 'Getting Quiver to customers: channels, pricing, the sales page, and what goes back to the DAO.' },
];
const openIn = (area: string) => state.threads.filter((t) => areaOf(t) === area && !t.settled).length;
const firstZone = (area: string) => tabs.find((t) => t.id === area)?.groups[0].items[0].id ?? '';
const zonesIn = (area: string) => tabs.find((t) => t.id === area)?.groups.flatMap((g) => g.items).filter((i) => !i.page || i.page === 'zone' || i.page === 'gate').slice(0, 4) ?? [];
const areaLabel = (id: string) => tabs.find((t) => t.id === id)?.label;

const needs = computed(() => state.threads.filter((t) => !t.settled).sort(byActivity).slice(0, 8));
const recent = computed(() => state.threads.filter((t) => t.settled).sort((a, b) => b.settled!.at.localeCompare(a.settled!.at)).slice(0, 5));
const flown = attachments.filter((a) => a.status === 'flown').length;
const concepts = attachments.filter((a) => a.status === 'defined').length;
const claimable = tasks.filter((t) => t.claimable).length;
</script>

<template>
  <div class="view sum">
    <div class="view-head">
      <div>
        <h1 class="view-title">Quiver</h1>
        <p class="view-lede">
          An open-source, modular quadcopter for developers and operators: 25 kg takeoff weight, 5 to 8 kg of payload on three hot-swappable attachment ports, and a Python SDK.
          <a :href="REPO" target="_blank" rel="noopener">project-quiver</a>
        </p>
      </div>
    </div>

    <div class="stats">
      <RouterLink to="/quiver/discussion/all" class="stat"><b>{{ state.threads.filter((t) => !t.settled).length }}</b> open threads</RouterLink>
      <RouterLink to="/quiver/attachments/catalog" class="stat"><b>{{ flown }}</b> attachments flown · <b>{{ concepts }}</b> ready for contributors</RouterLink>
      <RouterLink to="/quiver/work/tasks" class="stat"><b>{{ claimable }}</b> claimable tasks · <b>{{ prs.length }}</b> open PRs</RouterLink>
    </div>

    <section class="view-section">
      <h2>Areas</h2>
      <div class="areas">
        <RouterLink v-for="a in areas" :key="a.id" :to="`/quiver/${a.id}/${firstZone(a.id)}`" class="area">
          <span class="a-top"><span class="a-name">{{ areaLabel(a.id) }}</span><span class="a-count">{{ openIn(a.id) }} open</span></span>
          <span class="a-blurb">{{ a.blurb }}</span>
          <span class="a-zones">{{ zonesIn(a.id).map((z) => z.label).join(' · ') }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="view-section">
      <h2>Needs input</h2>
      <div class="list"><ThreadRows :threads="needs" :show-zone="true" /></div>
      <RouterLink to="/quiver/discussion/all" class="more">All threads</RouterLink>
    </section>

    <section class="view-section">
      <h2>Road to selling</h2>
      <RouterLink :to="zonePath('road-to-selling')" class="gate">
        <span v-for="g in gate" :key="g.id" class="g" :data-status="g.status"><span class="pip"></span>{{ g.title }}<span class="g-st">{{ g.statusText }}</span></span>
      </RouterLink>
    </section>

    <section v-if="recent.length" class="view-section">
      <h2>Recently decided</h2>
      <ul class="dec">
        <li v-for="t in recent" :key="t.id">
          <RouterLink :to="{ query: { thread: t.id } }" class="d">
            <StatusIcon status="settled" :override="t.settled?.override" :size="12" />
            <span class="mono">{{ t.settled!.decision }}</span>
            <span class="d-t">{{ t.title }}</span>
            <span class="muted">{{ zoneLabel(t.zone) }} · {{ day(t.settled!.at) }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.sum { max-width: 960px; }
.stats { display: flex; flex-wrap: wrap; gap: 8px; }
.stat { padding: 6px 10px; border: 1px solid var(--slate-a4); border-radius: 8px; color: var(--fg-muted); font-size: var(--text-base); text-decoration: none; }
.stat b { color: var(--fg); font-weight: 600; }
.stat:hover { border-color: var(--slate-a7); color: var(--fg-2); }
.areas { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.area { display: flex; flex-direction: column; gap: 6px; padding: 14px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2); text-decoration: none; transition: border-color 120ms; }
.area:hover { border-color: var(--slate-a7); }
.a-top { display: flex; justify-content: space-between; align-items: baseline; }
.a-name { color: var(--fg); font-weight: 600; font-size: 14px; }
.a-count { font-size: var(--text-sm); color: var(--fg-muted); }
.a-blurb { color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
.a-zones { color: var(--fg-faint); font-size: var(--text-sm); line-height: 1.5; }
.list { border: 1px solid var(--slate-a4); border-radius: 12px; overflow: hidden; }
.more { display: inline-block; margin-top: 8px; font-size: var(--text-sm); color: var(--indigo-11); text-decoration: none; }
.more:hover { text-decoration: underline; }
.gate { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; text-decoration: none; }
.g { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px 10px 26px; position: relative; border: 1px solid var(--slate-a4); border-radius: 10px; color: var(--fg); font-size: var(--text-base); font-weight: 500; }
.gate:hover .g { border-color: var(--slate-a6); }
.g .pip { position: absolute; left: 11px; top: 15px; width: 7px; height: 7px; border-radius: 50%; background: var(--slate-9); }
.g[data-status='waiting'] .pip { background: var(--amber-9); }
.g[data-status='in-progress'] .pip { background: var(--indigo-9); }
.g[data-status='open'] .pip { background: var(--red-9); }
.g-st { font-weight: 400; font-size: var(--text-sm); color: var(--fg-muted); }
.dec { margin: 0; padding: 0; list-style: none; }
.d { display: flex; align-items: center; gap: 8px; padding: 6px 0; color: var(--fg-2); text-decoration: none; font-size: var(--text-base); }
.d:hover .d-t { text-decoration: underline; }
.d-t { flex: 1; min-width: 0; color: var(--fg); }
</style>
