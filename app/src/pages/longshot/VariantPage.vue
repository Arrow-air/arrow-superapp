<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadRows from '../../modules/threads/ThreadRows.vue';
import NewThread from '../../modules/threads/NewThread.vue';
import StatusIcon from '../../modules/threads/StatusIcon.vue';
import type { Thread } from '../../modules/threads/data';
import { buildChoices, byActivity, day, isOpen, projectThreads, releaseOf, startThread, state, statusOf } from '../../modules/threads/store';
import { zoneLabel, zonePath } from '../../frame/nav';
import { useWorkspace } from '../../frame/useWorkspace';
import { clockById } from '../../projects/plans';
import { clockOfVariant, shared, specRows, variantById, variantOf, variants } from '../../projects/longshot/variants';
import { specRows as tattuRows } from '../../data/longshot';

// One Longshot variant on one page: what it is and where it stands, its spec
// sheet with a source on every line, what it shares with every Longshot, its
// model and parts, its builds, and every thread about it. Threads about every
// pack stay in their parts of the workspace; the ones here are on this pack's
// builds or its aircraft's page.
const route = useRoute();
const router = useRouter();
const { item } = useWorkspace();
const v = computed(() => variantById(item.value?.id) ?? variants[0]);
const other = computed(() => variants.find((x) => x.id !== v.value.id)!);
const clock = computed(() => clockOfVariant(v.value));
const bms = clockById('bms-v1')!;
const rel = computed(() => releaseOf(clock.value));
const rows = computed(() => specRows.map((r) => ({ id: r.id, label: r.label, cell: r.cells[v.value.id] })));

const mine = computed(() => projectThreads.value.filter((t) => variantOf(t) === v.value.id));
const open = computed(() => mine.value.filter(isOpen).sort(byActivity));
const closed = computed(() => mine.value.filter((t) => !isOpen(t)).sort(byActivity));
const showClosed = ref(false);
const onNext = computed(() => mine.value.filter((t) => t.version === clock.value.next));
const bmsOpen = computed(() => projectThreads.value.filter((t) => t.version === bms.next && isOpen(t)).length);
const threadOf = (id?: string) => (id ? state.threads.find((t) => t.id === id) : undefined);
const openThread = (id: string) => router.replace({ query: { ...route.query, thread: id } });

// Proposing from here: for this pack's next build unless said otherwise, in
// the part of the pack it changes or how it fits the aircraft.
const composing = ref(false);
const draft = ref({ zone: clock.value.zones[0] });
const builds = computed(() => buildChoices('longshot'));
const build = ref(clock.value.next);
async function create(d: { type: Thread['type']; title: string; body: string; key: string }): Promise<boolean> {
  const t = await startThread({ zone: draft.value.zone, title: d.title, body: d.body, type: d.type, version: build.value, key: d.key });
  if (!t) return false;
  composing.value = false;
  router.replace({ query: { ...route.query, thread: t.id } });
  return true;
}
</script>

<template>
  <div class="view vp">
    <div class="view-head">
      <div>
        <p class="kicker">Longshot variant</p>
        <h1 class="view-title">{{ v.code }} · {{ v.aircraft }}</h1>
        <p class="view-lede">{{ v.lede }}</p>
        <p class="stage" :data-tone="v.stage.tone"><span class="pip" aria-hidden="true"></span>{{ v.stage.text }}</p>
      </div>
    </div>

    <div class="stats">
      <RouterLink :to="clock.path" class="stat">Next build <b>{{ clock.label }}</b> · {{ onNext.filter(isOpen).length }} proposed</RouterLink>
      <RouterLink :to="bms.path" class="stat">Waits on <b>{{ bms.label }}</b> · {{ bmsOpen }} open</RouterLink>
      <RouterLink :to="zonePath(v.aircraftZone)" class="stat">Fit on {{ v.aircraft }}</RouterLink>
      <RouterLink :to="other.page" class="stat">The other variant: {{ other.code }} · {{ other.aircraft }}</RouterLink>
    </div>

    <section class="view-section">
      <h2>Spec sheet</h2>
      <dl class="facts" data-spec>
        <template v-for="r in rows" :key="r.id">
          <dt>{{ r.label }}</dt>
          <dd>
            {{ r.cell.value }}
            <button v-if="threadOf(r.cell.thread)" type="button" class="th" :title="threadOf(r.cell.thread)!.title" @click="openThread(r.cell.thread!)">
              <StatusIcon :status="statusOf(threadOf(r.cell.thread)!)" :size="10" /> {{ r.cell.thread }}
            </button>
            <a v-for="s in r.cell.sources" :key="s.url" :href="s.url" target="_blank" rel="noopener" class="fsrc">{{ s.label }}</a>
          </dd>
        </template>
      </dl>
    </section>

    <section class="view-section">
      <h2>Shared by every Longshot</h2>
      <dl class="facts">
        <template v-for="s in shared" :key="s.label">
          <dt>{{ s.label }}</dt>
          <dd>{{ s.text }} <a v-for="x in s.sources" :key="x.url" :href="x.url" target="_blank" rel="noopener" class="fsrc">{{ x.label }}</a></dd>
        </template>
      </dl>
      <p class="note"><RouterLink to="/longshot/overview/summary" class="link">Compare the variants side by side</RouterLink></p>
    </section>

    <section class="view-section">
      <h2>Model and parts</h2>
      <p class="note">{{ v.model.text }} <a :href="v.model.source.url" target="_blank" rel="noopener" class="fsrc">{{ v.model.source.label }}</a></p>
      <p class="links">
        <template v-if="v.model.inApp">
          <RouterLink to="/longshot/overview/model">3D model</RouterLink>
          <RouterLink to="/longshot/build/bom">Bill of materials</RouterLink>
          <RouterLink to="/longshot/build/guide">Manufacturing guide</RouterLink>
        </template>
        <a :href="v.buildSite" target="_blank" rel="noopener">Model and parts list on the build site</a>
      </p>
    </section>

    <section v-if="v.id === '14s9p'" class="view-section">
      <h2>PT1 against the Tattu it replaces</h2>
      <table class="vt spec">
        <thead><tr><th></th><th>14S9P PT1</th><th>Tattu 4.0 30 Ah</th><th class="hide-sm">Source</th></tr></thead>
        <tbody>
          <tr v-for="r in tattuRows" :key="r.label">
            <th>{{ r.label }}</th>
            <td>{{ r.longshot }}</td>
            <td class="muted">{{ r.tattu }}</td>
            <td class="hide-sm"><a :href="r.url" target="_blank" rel="noopener" class="link">{{ r.source }}</a></td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="view-section">
      <h2>Builds</h2>
      <ol class="builds">
        <li v-for="b in v.built" :key="b.code">
          <span class="b-code mono">{{ v.code }} {{ b.code }}</span>
          <span class="b-text">{{ b.text }} <a :href="b.source.url" target="_blank" rel="noopener" class="fsrc">{{ b.source.label }}</a></span>
        </li>
        <li data-next>
          <RouterLink :to="clock.path" class="b-code mono">{{ clock.label }}</RouterLink>
          <span class="b-text">
            Next. {{ onNext.filter(isOpen).length }} proposed, {{ onNext.filter((t) => t.settled).length }} decided.
            <template v-if="rel.frozenAt">Frozen {{ day(rel.frozenAt) }}.</template>
            <template v-else-if="rel.freezeTarget">Design freeze {{ day(rel.freezeTarget) }}.</template>
            <template v-else>No freeze date set yet.</template>
            It waits on <RouterLink :to="bms.path" class="link">{{ bms.label }}</RouterLink>.
          </span>
        </li>
      </ol>
    </section>

    <section class="view-section">
      <div class="disc-head">
        <h2>Threads about the {{ v.code }} <span v-if="open.length" class="count">{{ open.length }} open</span></h2>
        <button v-if="!composing" class="vbtn" type="button" @click="composing = true">Propose for the {{ v.code }}</button>
      </div>
      <NewThread
        v-if="composing"
        v-model:zone="draft.zone"
        v-model:build="build"
        class="nt"
        :where="zoneLabel(draft.zone)"
        :zones="clock.zones.map((z) => ({ id: z, label: zoneLabel(z) }))"
        :builds="builds"
        type="proposal"
        :draft-key="`new:longshot:${v.id}`"
        :submit="create"
        @cancel="composing = false"
      />
      <div v-if="open.length" class="list"><ThreadRows :threads="open" :show-zone="true" /></div>
      <p v-else-if="!composing" class="none">No open threads about the {{ v.code }} alone yet.</p>
      <div v-if="closed.length" class="closed">
        <button class="toggle" type="button" :aria-expanded="showClosed" @click="showClosed = !showClosed">Closed ({{ closed.length }})</button>
        <div v-if="showClosed" class="list"><ThreadRows :threads="closed" :show-zone="true" /></div>
      </div>
      <p class="note">
        Here: threads on the {{ v.code }}'s builds and on its <RouterLink :to="zonePath(v.aircraftZone)" class="link">{{ v.aircraft }}</RouterLink> page.
        Questions about every pack stay with their part, like the BMS or the cells: <RouterLink to="/longshot/discussion/all" class="link">all threads</RouterLink>.
      </p>
    </section>
  </div>
</template>

<style scoped>
.vp { max-width: 980px; }
.kicker { margin: 0 0 4px; color: var(--fg-faint); font-size: var(--text-sm); }
.stage { display: inline-flex; align-items: center; gap: 7px; margin: 10px 0 0; padding: 3px 10px 3px 8px; border-radius: 999px; background: var(--slate-a3); color: var(--fg-2); font-size: var(--text-sm); }
.stage .pip { width: 7px; height: 7px; border-radius: 50%; background: var(--slate-9); }
.stage[data-tone='done'] .pip { background: var(--jade-9); }
.stage[data-tone='interim'] .pip { background: var(--indigo-9); }
.stage[data-tone='open'] .pip { background: var(--amber-9); }
.stats { display: flex; flex-wrap: wrap; gap: 8px; }
.stat { padding: 6px 10px; border: 1px solid var(--slate-a4); border-radius: 8px; color: var(--fg-muted); font-size: var(--text-base); text-decoration: none; }
.stat b { color: var(--fg); font-weight: 600; }
.stat:hover { border-color: var(--slate-a7); color: var(--fg-2); }
.facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); margin: 0; max-width: 820px; border-top: 1px solid var(--slate-a3); font-size: var(--text-base); }
.facts dt, .facts dd { margin: 0; padding: 7px 0; border-bottom: 1px solid var(--slate-a3); line-height: 1.5; }
.facts dt { padding-right: 18px; color: var(--fg-muted); }
.facts dd { color: var(--fg-2); }
.fsrc { margin-left: 6px; color: var(--indigo-11); font-size: var(--text-sm); text-decoration: none; white-space: nowrap; }
.fsrc:hover { text-decoration: underline; }
.th { display: inline-flex; align-items: center; gap: 4px; margin-left: 6px; padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.th:hover { text-decoration: underline; }
.note { max-width: 760px; margin: 10px 0 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.6; }
.links { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 8px 0 0; font-size: var(--text-base); }
.links a { color: var(--indigo-11); text-decoration: none; }
.links a:hover { text-decoration: underline; }
.spec tbody th { width: 90px; padding: 8px 10px; text-align: left; vertical-align: top; color: var(--fg-muted); font-weight: 500; border-bottom: 1px solid var(--slate-a3); font-size: var(--text-base); }
.builds { margin: 0; padding: 0; list-style: none; border-left: 1px solid var(--slate-a5); }
.builds li { position: relative; display: flex; gap: 12px; padding: 6px 0 6px 14px; font-size: var(--text-base); line-height: 1.5; }
.builds li::before { content: ''; position: absolute; left: -4px; top: 13px; width: 7px; height: 7px; border-radius: 50%; background: var(--jade-9); }
.builds li[data-next]::before { background: var(--amber-9); }
.b-code { flex: none; min-width: 84px; color: var(--fg); font-size: var(--text-sm); padding-top: 1px; text-decoration: none; }
a.b-code { color: var(--indigo-11); }
a.b-code:hover { text-decoration: underline; }
.b-text { color: var(--fg-2); }
.disc-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.disc-head h2 { margin: 0; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.count { margin-left: 6px; color: var(--fg-muted); }
.nt { margin-bottom: 12px; }
.list { border: 1px solid var(--slate-a4); border-radius: 12px; overflow: hidden; }
.none { margin: 0; padding: 12px 14px; border: 1px dashed var(--slate-a4); border-radius: 12px; color: var(--fg-faint); font-size: var(--text-base); }
.closed { margin-top: 10px; }
.toggle { margin-bottom: 8px; padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.toggle:hover { color: var(--fg); }
@media (max-width: 767px) {
  .facts { grid-template-columns: minmax(0, 1fr); }
  .facts dt { padding-bottom: 0; border-bottom: 0; }
  .facts dd { padding-top: 2px; }
  .b-code { min-width: 72px; }
}
</style>
