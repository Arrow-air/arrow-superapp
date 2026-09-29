<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../../frame/Icon.vue';
import StatusIcon from './StatusIcon.vue';
import ThreadDetail from './ThreadDetail.vue';
import type { Thread } from './data';
import { state, statusOf, type Status } from './store';

// Community decisions, Linear-style but minimal: the list is only for finding
// a thread (status, title, time). Everything else is in the thread itself. Votes are weighted
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
const query = ref('');
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const visible = computed(() =>
  state.threads.filter((t) => {
    const st = statusOf(t);
    if (scope.value === 'open' && st === 'settled') return false;
    if (scope.value === 'settled' && st !== 'settled') return false;
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

</script>

<template>
  <div class="threads" :class="{ 'show-detail': mobileDetail }">
    <section class="list-pane" aria-label="Threads">
      <div class="top">
        <div class="find">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input v-model="query" placeholder="Find a thread" aria-label="Find a thread" />
        </div>
        <div class="seg" role="radiogroup" aria-label="Scope">
          <button v-for="s in (['open', 'settled', 'all'] as Scope[])" :key="s" type="button" role="radio" :aria-checked="scope === s" @click="scope = s">
            {{ cap(s) }}
          </button>
        </div>
      </div>

      <div class="list">
        <p v-if="!flat.length" class="empty">Nothing here.</p>
        <section v-for="g in groups" :key="g.id" class="group">
          <h3 class="group-head">{{ g.label }}</h3>
          <button
            v-for="t in g.threads"
            :key="t.id"
            :data-thread="t.id"
            type="button"
            class="row"
            :aria-current="t.id === selectedId ? 'true' : undefined"
            :title="t.title"
            @click="select(t.id)"
          >
            <StatusIcon :status="statusOf(t)" :override="t.settled?.override" :size="13" />
            <span class="rtitle">{{ t.title }}</span>
            <span class="rtime">{{ t.active }}</span>
          </button>
        </section>
      </div>
    </section>

    <section class="detail-pane" aria-label="Thread">
      <ThreadDetail v-if="selected" :thread="selected" @back="mobileDetail = false" />
      <p v-else class="empty pad">Pick a thread.</p>
    </section>
  </div>
</template>

<style scoped>
.threads { display: grid; grid-template-columns: 340px minmax(0, 1fr); height: 100%; min-height: 0; }

/* The list keeps the slot's colour and casts a soft shadow over the thread,
   so the two read as separate sheets. */
.list-pane {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--slot-bg);
  box-shadow: 1px 0 0 var(--slate-a5), 14px 0 32px -12px rgb(0 0 0 / 0.7);
}
.top { display: flex; align-items: center; gap: 8px; padding: 12px; }

.find { position: relative; flex: 1; min-width: 0; }
.find svg { position: absolute; left: 9px; top: 50%; width: 12px; height: 12px; transform: translateY(-50%); fill: none; stroke: var(--fg-faint); stroke-width: 2; stroke-linecap: round; }
.find input {
  width: 100%; height: 28px; padding: 0 8px 0 27px; border: 0; border-radius: 8px;
  background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none;
  transition: background-color 150ms, box-shadow 150ms;
}
.find input:focus { background: var(--slate-a3); box-shadow: 0 0 0 1px var(--indigo-a7); }
.find input::placeholder { color: var(--fg-faint); }

/* Flat segmented switch (coss tabs, no depth) */
.seg { display: inline-flex; flex: none; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a2); }
.seg button {
  height: 24px; padding: 0 8px; border: 0; border-radius: 6px; background: none;
  color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
}
.seg button:hover { color: var(--fg-2); }
.seg button[aria-checked='true'] { background: var(--slate-a4); color: var(--fg); }

.list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 8px 12px; scrollbar-width: thin; }
.group + .group { margin-top: 14px; }
.group-head { margin: 0; padding: 6px 10px 4px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }

/* One line per thread: status, title, time. Quiet selection. */
.row {
  display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 8px 10px;
  border: 0; border-radius: 8px; background: none; text-align: left; color: inherit; font: inherit; cursor: pointer;
  transition: background-color 120ms;
}
.row:hover { background: var(--slate-a2); }
.row[aria-current='true'] { background: var(--slate-a3); }
.row:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.row :deep(.st) { margin-top: 3px; }
/* Up to two lines, so titles stay findable without widening the list. */
.rtitle {
  flex: 1; min-width: 0; overflow: hidden; color: var(--fg-2); font-size: var(--text-nav); line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.row[aria-current='true'] .rtitle { color: var(--fg); }
.rtime { flex: none; margin-top: 2px; font-size: var(--text-sm); color: var(--fg-faint); }

.detail-pane { min-height: 0; overflow-y: auto; }
.empty { margin: 0; padding: 24px 8px; text-align: center; color: var(--fg-muted); }
.empty.pad { padding: 48px; }

@media (max-width: 899px) {
  .threads { grid-template-columns: minmax(0, 1fr); }
  .detail-pane { display: none; }
  .show-detail .list-pane { display: none; }
  .show-detail .detail-pane { display: block; }
  .list-pane { box-shadow: none; }
}
</style>
