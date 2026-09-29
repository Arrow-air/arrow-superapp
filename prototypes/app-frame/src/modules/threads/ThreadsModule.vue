<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../../frame/Icon.vue';
import Kbd from '../../frame/Kbd.vue';
import Menu from '../../frame/Menu.vue';
import Avatar from './Avatar.vue';
import StatusIcon from './StatusIcon.vue';
import ThreadDetail from './ThreadDetail.vue';
import type { Thread } from './data';
import { leaderOf, state, statusOf, talliesOf, type Status } from './store';
import type { Role } from './weights';

// Community decisions, Linear-style: a dense inbox grouped by how close each
// thread is to a decision, with the open thread beside it. Votes are weighted
// with the real formula (see weights.ts). The sidebar item picks the view.
const route = useRoute();
const router = useRouter();

const views: Record<string, (t: Thread) => boolean> = {
  all: () => true,
  proposals: (t) => t.type === 'proposal',
  decisions: (t) => !!t.settled,
  ideas: (t) => t.type === 'idea',
  qa: (t) => t.type === 'question',
  'ctx-design': (t) => t.context === 'design',
  'ctx-building': (t) => t.context === 'building',
  'ctx-manufacturing': (t) => t.context === 'manufacturing',
  'ctx-testing': (t) => t.context === 'testing',
  'ctx-store': (t) => t.context === 'store',
};
const viewFilter = computed(() => views[String(route.params.item)] ?? views.all);

type Scope = 'open' | 'settled' | 'all';
const scope = ref<Scope>(route.params.item === 'decisions' ? 'all' : 'open');
watch(() => route.params.item, (i) => (scope.value = i === 'decisions' ? 'all' : 'open'));
const system = ref('all');
const query = ref('');

const systems = computed(() => ['all', ...new Set(state.threads.map((t) => t.system))]);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const visible = computed(() =>
  state.threads.filter((t) => {
    const st = statusOf(t);
    if (scope.value === 'open' && st === 'settled') return false;
    if (scope.value === 'settled' && st !== 'settled') return false;
    if (system.value !== 'all' && t.system !== system.value) return false;
    const q = query.value.trim().toLowerCase();
    if (q && !`${t.id} ${t.title} ${t.anchor.label} ${t.system}`.toLowerCase().includes(q)) return false;
    return viewFilter.value(t);
  }),
);

const groupsDef: { id: Status; label: string }[] = [
  { id: 'needs', label: 'Needs input' },
  { id: 'converging', label: 'Converging' },
  { id: 'settled', label: 'Settled' },
];
const groups = computed(() =>
  groupsDef.map((g) => ({ ...g, threads: visible.value.filter((t) => statusOf(t) === g.id) })).filter((g) => g.threads.length),
);
const flat = computed(() => groups.value.flatMap((g) => g.threads));

// Selection lives in the URL (?thread=ARW-14) so a thread can be linked to directly.
const selectedId = computed(() => (route.query.thread as string) || flat.value[0]?.id);
const selected = computed(() => state.threads.find((t) => t.id === selectedId.value));
const mobileDetail = ref(!!route.query.thread);
function select(id: string) {
  router.replace({ query: { ...route.query, thread: id } });
  mobileDetail.value = true;
}

// Consensus bar: how far the weighted leader is ahead of the runner-up.
function consensus(t: Thread) {
  const s = talliesOf(t).map((x) => Math.max(0, x.weightedScore)).sort((a, b) => b - a);
  const total = s.reduce((a, b) => a + b, 0) || 1;
  return { a: (s[0] ?? 0) / total, b: (s[1] ?? 0) / total, any: s.some((x) => x > 0) };
}
const voters = (t: Thread) => [...new Set(t.votes.map((v) => v.memberId))];

// j / k move through the list, like Linear. Ignored while typing.
function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  if (el?.closest?.('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey) return;
  if (e.key !== 'j' && e.key !== 'k') return;
  const i = flat.value.findIndex((t) => t.id === selectedId.value);
  const next = flat.value[Math.min(flat.value.length - 1, Math.max(0, i + (e.key === 'j' ? 1 : -1)))];
  if (next) {
    select(next.id);
    requestAnimationFrame(() => document.querySelector(`[data-thread="${next.id}"]`)?.scrollIntoView({ block: 'nearest' }));
  }
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

const roles: { id: Role; label: string }[] = [
  { id: 'member', label: 'Member' },
  { id: 'core', label: 'Core' },
  { id: 'lead', label: 'Lead' },
];
</script>

<template>
  <div class="threads" :class="{ 'show-detail': mobileDetail }">
    <section class="list-pane" aria-label="Threads">
      <div class="toolbar-row">
        <div class="seg" role="radiogroup" aria-label="Scope">
          <button v-for="s in (['open', 'settled', 'all'] as Scope[])" :key="s" type="button" role="radio" :aria-checked="scope === s" @click="scope = s">
            {{ cap(s) }}
          </button>
        </div>
        <Menu :items="systems.map((s) => ({ id: s, label: s === 'all' ? 'All systems' : cap(s) }))" :current="system" align="end" @select="system = $event">
          <template #trigger="{ open, toggle }">
            <button class="filter" type="button" aria-haspopup="menu" :aria-expanded="open" @click="toggle">
              {{ system === 'all' ? 'All systems' : cap(system) }}
              <svg class="chev-v" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
            </button>
          </template>
        </Menu>
      </div>
      <div class="find">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input v-model="query" placeholder="Find a thread…" aria-label="Find a thread" />
      </div>

      <div class="list">
        <p v-if="!flat.length" class="empty">No threads here yet.</p>
        <section v-for="g in groups" :key="g.id" class="group">
          <h3 class="group-head"><StatusIcon :status="g.id" :size="12" /> {{ g.label }} <span class="count">{{ g.threads.length }}</span></h3>
          <button
            v-for="t in g.threads"
            :key="t.id"
            :data-thread="t.id"
            type="button"
            class="row"
            :aria-current="t.id === selectedId ? 'true' : undefined"
            @click="select(t.id)"
          >
            <span class="row-top">
              <StatusIcon :status="statusOf(t)" :override="t.settled?.override" />
              <span class="rid mono">{{ t.id }}</span>
              <span class="rtitle">{{ t.title }}</span>
            </span>
            <span class="row-bottom">
              <span v-if="t.kind === 'funding'" class="rchip funding">Funding</span>
              <span class="rchip">{{ cap(t.system) }}</span>
              <span class="rchip"><Icon :name="t.anchor.kind === 'model' ? 'box' : 'megaphone'" :size="10" /> {{ t.anchor.label }}</span>
              <span class="spacer"></span>
              <span v-if="consensus(t).any" class="cbar" :title="`Leader margin ${leaderOf(t).margin}`" aria-hidden="true">
                <span class="ca" :style="{ width: `${consensus(t).a * 100}%` }"></span>
                <span class="cb" :style="{ width: `${consensus(t).b * 100}%` }"></span>
              </span>
              <span class="stack"><Avatar v-for="id in voters(t).slice(0, 3)" :key="id" :id="id" :size="18" /></span>
              <span class="rtime">{{ t.active }}</span>
            </span>
          </button>
        </section>
      </div>

      <footer class="list-foot">
        <span class="hint"><Kbd :keys="['J']" outline /><Kbd :keys="['K']" outline /> Move</span>
        <div class="viewas">
          <span class="muted">View as</span>
          <div class="seg small" role="radiogroup" aria-label="View as">
            <button v-for="r in roles" :key="r.id" type="button" role="radio" :aria-checked="state.role === r.id" @click="state.role = r.id">{{ r.label }}</button>
          </div>
        </div>
      </footer>
    </section>

    <section class="detail-pane" aria-label="Thread">
      <ThreadDetail v-if="selected" :thread="selected" @back="mobileDetail = false" />
      <p v-else class="empty pad">Pick a thread.</p>
    </section>
  </div>
</template>

<style scoped>
.threads { display: grid; grid-template-columns: 380px minmax(0, 1fr); height: 100%; min-height: 0; }
.mono { font-family: var(--font-mono); }
.muted { color: var(--fg-muted); }

.list-pane { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--slate-a4); }
.toolbar-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 12px 8px; }

/* Flat segmented control (coss tabs, no depth) */
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 9px; background: var(--slate-a3); }
.seg button {
  height: 24px; padding: 0 10px; border: 0; border-radius: 7px; background: none;
  color: var(--fg-muted); font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer;
}
.seg button:hover { color: var(--fg-2); }
.seg button[aria-checked='true'] { background: var(--slate-a5); color: var(--fg); box-shadow: inset 0 1px 0 var(--slate-a4); }
.seg.small button { height: 20px; padding: 0 7px; font-size: var(--text-sm); }
.filter {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px 0 10px;
  border: 1px solid var(--slate-a5); border-radius: 8px; background: var(--slate-a2);
  color: var(--fg-2); font: inherit; font-size: var(--text-base); cursor: pointer;
}
.filter:hover { border-color: var(--border-strong); }

.find { position: relative; margin: 0 12px 8px; }
.find svg { position: absolute; left: 10px; top: 50%; width: 13px; height: 13px; transform: translateY(-50%); fill: none; stroke: var(--fg-faint); stroke-width: 2; stroke-linecap: round; }
.find input {
  width: 100%; height: 30px; padding: 0 10px 0 30px; border: 1px solid var(--slate-a4); border-radius: 8px;
  background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none;
}
.find input:focus { border-color: var(--indigo-a7); }
.find input::placeholder { color: var(--fg-faint); }

.list { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 8px 12px; scrollbar-width: thin; }
.group + .group { margin-top: 10px; }
.group-head {
  display: flex; align-items: center; gap: 6px; margin: 0; padding: 8px 8px 6px;
  font-size: var(--text-sm); font-weight: 500; color: var(--fg-muted);
}
.count { color: var(--fg-faint); font-weight: 400; }

/* Rows: dense, quiet selection (spell/coss), no borders. */
.row {
  display: flex; flex-direction: column; gap: 6px; width: 100%; padding: 9px 10px;
  border: 0; border-radius: 9px; background: none; text-align: left; color: inherit; font: inherit; cursor: pointer;
  transition: background-color 120ms;
}
.row:hover { background: var(--slate-a2); }
.row[aria-current='true'] { background: var(--slate-a3); box-shadow: inset 2px 0 0 var(--indigo-9); }
.row:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.row-top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.rid { flex: none; font-size: var(--text-sm); color: var(--fg-faint); }
.rtitle { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--fg); font-size: var(--text-nav); }
.row-bottom { display: flex; align-items: center; gap: 5px; padding-left: 22px; min-width: 0; }
.rchip {
  display: inline-flex; align-items: center; gap: 4px; height: 18px; padding: 0 6px; flex: none;
  border-radius: 5px; background: var(--slate-a3); color: var(--fg-muted); font-size: var(--text-sm);
  max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rchip :deep(svg) { color: var(--fg-faint); flex: none; }
.rchip.funding { background: var(--amber-a3, var(--slate-a3)); color: var(--amber-11); }
.spacer { flex: 1; }
.cbar { display: inline-flex; width: 36px; height: 4px; flex: none; gap: 1px; border-radius: 99px; background: var(--slate-a3); overflow: hidden; }
.ca { background: var(--indigo-9); }
.cb { background: var(--fg-faint); }
.stack { display: inline-flex; flex: none; }
.stack .av + .av { margin-left: -5px; }
.rtime { flex: none; min-width: 26px; text-align: right; font-size: var(--text-sm); color: var(--fg-faint); }

.list-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 40px; padding: 0 12px;
  border-top: 1px solid var(--slate-a4); font-size: var(--text-sm); color: var(--fg-muted);
}
.hint { display: inline-flex; align-items: center; gap: 4px; }
.hint :deep(.kbd-group) + :deep(.kbd-group) { margin-right: 2px; }
.viewas { display: inline-flex; align-items: center; gap: 8px; }

.detail-pane { min-height: 0; overflow-y: auto; }
.empty { margin: 0; padding: 24px 8px; text-align: center; color: var(--fg-muted); }
.empty.pad { padding: 48px; }

@media (max-width: 899px) {
  .threads { grid-template-columns: minmax(0, 1fr); }
  .detail-pane { display: none; }
  .show-detail .list-pane { display: none; }
  .show-detail .detail-pane { display: block; }
  .list-pane { border-right: 0; }
}
</style>
