<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadRows from '../../modules/threads/ThreadRows.vue';
import StatusIcon from '../../modules/threads/StatusIcon.vue';
import { areaOf, byActivity, day, isOpen, projectThreads, state, statusOf } from '../../modules/threads/store';
import { projectTabs, zoneLabel, zonePath } from '../../frame/nav';
import { specRows } from '../../data/longshot';
import { lsBom, lsOpenIssues } from '../../projects/longshot/github';
import { links, steps, timeline } from '../../projects/longshot/overview';

// Longshot at a glance: what it is, where each piece stands, how it compares
// with the Tattu it replaces, the areas where the work is, what needs input,
// and how it got here. Every claim links to its source.
const route = useRoute();
const router = useRouter();
const open = (id: string) => router.replace({ query: { ...route.query, thread: id } });

const areas: { id: string; blurb: string }[] = [
  { id: 'pack', blurb: 'The 126 cells and their holders, the copper busbars spot-welded to them, and the case that slides into Quiver like the Tattu.' },
  { id: 'electronics', blurb: 'The BMS Longshot still needs, what it tells the aircraft over CAN, how it charges, and the boards that carry its power and sense lines.' },
  { id: 'aircraft', blurb: 'Quiver, where it started and has flown; Spearhead, which gets a third-size version; and what has been tested.' },
  { id: 'build', blurb: 'Building packs, the parts and what they cost, safety without a BMS, and the budget the DAO approved.' },
];
const tabs = computed(() => projectTabs('longshot'));
const areaLabel = (id: string) => tabs.value.find((t) => t.id === id)?.label ?? id;
const zonesIn = (id: string) => tabs.value.find((t) => t.id === id)?.groups.flatMap((g) => g.items).filter((i) => !i.page) ?? [];
const openIn = (area: string) => projectThreads.value.filter((t) => areaOf(t) === area && isOpen(t)).length;
const firstZone = (area: string) => zonesIn(area)[0]?.id ?? '';

const needs = computed(() => projectThreads.value.filter(isOpen).sort(byActivity).slice(0, 8));
const decided = computed(() => projectThreads.value.filter((t) => t.settled).sort((a, b) => b.settled!.at.localeCompare(a.settled!.at)).slice(0, 5));
const threadOf = (id?: string) => (id ? state.threads.find((t) => t.id === id) : undefined);
const toneLabel = { done: 'Done', interim: 'Interim', open: 'Open', blocked: 'Blocking' } as const;
const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
</script>

<template>
  <div class="view sum">
    <div class="view-head">
      <div>
        <h1 class="view-title">Longshot</h1>
        <p class="view-lede">
          Arrow's own battery pack, led by Julius. PT1 is 126 BAK 21700 cells in 14S9P, about 58.5 Ah, a drop-in replacement for the Tattu 4.0 30 Ah that Quiver flies.
          It is assembled and has flown. What it lacks is a BMS: no protection, no balancing, no telemetry, so it charges through exposed balance leads.
          Next it gets one, and a third-size version powers Spearhead.
        </p>
        <p class="links">
          <a v-for="l in links" :key="l.url" :href="l.url" target="_blank" rel="noopener">{{ l.label }}</a>
        </p>
      </div>
    </div>

    <div class="stats">
      <RouterLink to="/longshot/discussion/all" class="stat"><b>{{ projectThreads.filter(isOpen).length }}</b> open threads</RouterLink>
      <RouterLink to="/longshot/overview/model" class="stat"><b>{{ lsBom.length }}</b> part numbers in the 3D model</RouterLink>
      <RouterLink to="/longshot/overview/pcbs" class="stat">BMS board in KiCad</RouterLink>
      <RouterLink to="/longshot/work/github" class="stat"><b>{{ lsOpenIssues.length }}</b> open issues</RouterLink>
    </div>

    <section class="view-section">
      <h2>Where it stands</h2>
      <ol class="steps">
        <li v-for="s in steps" :key="s.id" class="step" :data-tone="s.tone">
          <div class="s-top">
            <span class="pip" aria-hidden="true"></span>
            <RouterLink :to="zonePath(s.zone)" class="s-title">{{ s.title }}</RouterLink>
          </div>
          <span class="s-state">{{ s.state }}</span>
          <p class="s-detail">{{ s.detail }}</p>
          <div class="s-foot">
            <button v-if="threadOf(s.thread)" type="button" class="s-thread" :title="threadOf(s.thread)!.title" @click="open(s.thread!)">
              <StatusIcon :status="statusOf(threadOf(s.thread)!)" :size="11" /> {{ s.thread }}
            </button>
            <a :href="s.source.url" target="_blank" rel="noopener" class="s-src">{{ s.source.label }}</a>
          </div>
          <span class="sr">{{ toneLabel[s.tone] }}</span>
        </li>
      </ol>
    </section>

    <section class="view-section">
      <h2>PT1 against the Tattu it replaces</h2>
      <table class="vt spec">
        <thead><tr><th></th><th>Longshot PT1</th><th>Tattu 4.0 30 Ah</th><th class="hide-sm">Source</th></tr></thead>
        <tbody>
          <tr v-for="r in specRows" :key="r.label">
            <th>{{ r.label }}</th>
            <td>{{ r.longshot }}</td>
            <td class="muted">{{ r.tattu }}</td>
            <td class="hide-sm"><a :href="r.url" target="_blank" rel="noopener" class="link">{{ r.source }}</a></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="view-section">
      <h2>Areas</h2>
      <div class="areas">
        <RouterLink v-for="a in areas" :key="a.id" :to="`/longshot/${a.id}/${firstZone(a.id)}`" class="area">
          <span class="a-top"><span class="a-name">{{ areaLabel(a.id) }}</span><span class="a-count">{{ openIn(a.id) }} open</span></span>
          <span class="a-blurb">{{ a.blurb }}</span>
          <span class="a-zones">{{ zonesIn(a.id).map((z) => z.label).join(' · ') }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="view-section">
      <h2>Needs input</h2>
      <div class="list"><ThreadRows :threads="needs" :show-zone="true" /></div>
      <RouterLink to="/longshot/discussion/all" class="more">All threads</RouterLink>
    </section>

    <section v-if="decided.length" class="view-section">
      <h2>Recently decided</h2>
      <ul class="dec">
        <li v-for="t in decided" :key="t.id">
          <RouterLink :to="{ query: { thread: t.id } }" class="d">
            <StatusIcon status="settled" :override="t.settled?.override" :size="12" />
            <span class="mono">{{ t.settled!.decision }}</span>
            <span class="d-t">{{ t.title }}</span>
            <span class="muted">{{ zoneLabel(t.zone) }} · {{ day(t.settled!.at) }}</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section class="view-section">
      <h2>How it got here</h2>
      <ol class="tl">
        <li v-for="e in timeline" :key="e.date + e.text">
          <span class="tl-d mono">{{ fmt(e.date) }}</span>
          <span class="tl-t">{{ e.text }} <a :href="e.source.url" target="_blank" rel="noopener" class="link">{{ e.source.label }}</a></span>
        </li>
      </ol>
    </section>

    <section class="view-section">
      <h2>Money and docs</h2>
      <p class="note">
        The DAO approved Phase 1 with caps of about $19,500 plus 10,000 ARROW for bounties; AIP-007 has that funding running to May 2026. Phase 2, the smart BMS and a production design, still needs its own proposal.
        <RouterLink :to="zonePath('budget')" class="link">Budget &amp; proposal</RouterLink>
      </p>
      <p class="note">
        Longshot has a card on arrowair.com's project pages but no docs section: the site only imports docs from the Quiver, Spearhead and Caribou repositories. The repository README is its spec page;
        it still carries the proposal's 2,200–2,300 Wh and the original v0/v1 BMS plan, while the issues and call notes above are newer. This workspace links each fact to wherever it is most current.
      </p>
    </section>
  </div>
</template>

<style scoped>
.sum { max-width: 980px; }
.links { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 8px 0 0; font-size: var(--text-sm); }
.links a { color: var(--indigo-11); text-decoration: none; }
.links a:hover { text-decoration: underline; }
.stats { display: flex; flex-wrap: wrap; gap: 8px; }
.stat { padding: 6px 10px; border: 1px solid var(--slate-a4); border-radius: 8px; color: var(--fg-muted); font-size: var(--text-base); text-decoration: none; }
.stat b { color: var(--fg); font-weight: 600; }
.stat:hover { border-color: var(--slate-a7); color: var(--fg-2); }

.steps { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
.step { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 12px 12px 10px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2); }
.s-top { display: flex; align-items: center; gap: 8px; }
.pip { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--slate-9); }
.step[data-tone='done'] .pip { background: var(--jade-9); }
.step[data-tone='interim'] .pip { background: var(--indigo-9); }
.step[data-tone='open'] .pip { background: var(--amber-9); }
.step[data-tone='blocked'] .pip { background: var(--red-9); box-shadow: 0 0 0 3px var(--red-a4); }
.s-title { color: var(--fg); font-weight: 600; font-size: 14px; text-decoration: none; }
.s-title:hover { text-decoration: underline; }
.s-state { font-size: var(--text-sm); color: var(--fg-muted); }
.step[data-tone='blocked'] .s-state { color: var(--red-11); }
.s-detail { margin: 2px 0 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; flex: 1; }
.s-foot { display: flex; align-items: center; gap: 10px; margin-top: 6px; font-size: var(--text-sm); }
.s-thread { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; cursor: pointer; }
.s-thread:hover { text-decoration: underline; }
.s-src { margin-left: auto; color: var(--fg-faint); text-decoration: none; }
.s-src:hover { color: var(--fg-2); text-decoration: underline; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

.spec th { width: 90px; }
.spec tbody th { padding: 8px 10px; text-align: left; vertical-align: top; color: var(--fg-muted); font-weight: 500; border-bottom: 1px solid var(--slate-a3); font-size: var(--text-base); }

.areas { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
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
.dec { margin: 0; padding: 0; list-style: none; }
.d { display: flex; align-items: center; gap: 8px; padding: 6px 0; color: var(--fg-2); text-decoration: none; font-size: var(--text-base); }
.d:hover .d-t { text-decoration: underline; }
.d-t { flex: 1; min-width: 0; color: var(--fg); }

.tl { margin: 0; padding: 0; list-style: none; border-left: 1px solid var(--slate-a5); }
.tl li { position: relative; display: flex; gap: 12px; padding: 5px 0 5px 14px; font-size: var(--text-base); line-height: 1.5; }
.tl li::before { content: ''; position: absolute; left: -4px; top: 12px; width: 7px; height: 7px; border-radius: 50%; background: var(--slate-8); }
.tl-d { flex: none; width: 52px; color: var(--fg-muted); font-size: var(--text-sm); padding-top: 1px; }
.tl-t { color: var(--fg-2); }
.note { max-width: 760px; margin: 0 0 8px; color: var(--fg-2); font-size: var(--text-base); line-height: 1.6; }
</style>
