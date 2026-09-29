<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StatusIcon from './StatusIcon.vue';
import ThreadDetail from './ThreadDetail.vue';
import type { Thread } from './data';
import { ago, startThread, state, statusOf, type Status } from './store';
import { zoneLabel, zoneTab } from '../../frame/nav';

// Community decisions, Linear-style but minimal: the list is only for finding
// a thread (status, title, time). Everything else is in the thread itself. Votes are weighted
// with the real formula (see weights.ts). On a zone page the list is that
// zone's threads; in the Discussion tab it is the index over every zone.
const route = useRoute();
const router = useRouter();

const props = defineProps<{ zone?: string }>();
const views: Record<string, (t: Thread) => boolean> = {
  all: () => true,
  'ctx-overview': (t) => t.context === 'overview',
  'ctx-design': (t) => t.context === 'design',
  'ctx-docs': (t) => t.context === 'docs',
  'ctx-market': (t) => t.context === 'market',
};
const index = computed(() => !props.zone);
const viewFilter = computed(() => (props.zone ? (t: Thread) => t.zone === props.zone : views[String(route.params.item)] ?? views.all));

type Scope = 'open' | 'settled' | 'all';
const scope = ref<Scope>('open');
const query = ref('');
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const inView = computed(() => state.threads.filter((t) => viewFilter.value(t)));
const visible = computed(() =>
  inView.value.filter((t) => {
    const st = statusOf(t);
    if (scope.value === 'open' && st === 'settled') return false;
    if (scope.value === 'settled' && st !== 'settled') return false;
    const q = query.value.trim().toLowerCase();
    if (q && !`${t.id} ${t.title} ${zoneLabel(t.zone)} ${t.body}`.toLowerCase().includes(q)) return false;
    return true;
  }),
);

const groupsDef: { id: Status; label: string }[] = [
  { id: 'needs', label: 'Needs input' },
  { id: 'converging', label: 'Converging' },
  { id: 'settled', label: 'Decided' },
];
const byActivity = (a: Thread, b: Thread) => b.activeAt.localeCompare(a.activeAt);
const groups = computed(() =>
  groupsDef
    .map((g) => ({ ...g, threads: visible.value.filter((t) => statusOf(t) === g.id).sort(byActivity) }))
    .filter((g) => g.threads.length),
);
const flat = computed(() => groups.value.flatMap((g) => g.threads));

// Selection lives in the URL (?thread=Q-3) so a thread can be linked to directly.
const selectedId = computed(() => (route.query.thread as string) || flat.value[0]?.id);
const selected = computed(() => state.threads.find((t) => t.id === selectedId.value));
const mobileDetail = ref(!!route.query.thread);
function select(id: string) {
  router.replace({ query: { ...route.query, thread: id } });
  mobileDetail.value = true;
}
// A linked thread that is settled should still show when the scope is "open".
watch(selected, (t) => { if (t?.settled && scope.value === 'open' && route.query.thread) scope.value = 'all'; }, { immediate: true });

// Starting a thread: only on a zone page, so every thread lives somewhere.
const composing = ref(false);
const draft = ref({ title: '', body: '', type: 'question' as Thread['type'] });
function create() {
  if (!props.zone || !draft.value.title.trim()) return;
  const t = startThread({
    zone: props.zone,
    context: zoneTab(props.zone)?.id ?? 'overview',
    title: draft.value.title.trim(),
    body: draft.value.body.trim(),
    type: draft.value.type,
  });
  draft.value = { title: '', body: '', type: 'question' };
  composing.value = false;
  scope.value = 'open';
  select(t.id);
}

// j / k move through the list, like Linear. Ignored while typing.
function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  if (el?.closest?.('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey) return;
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
            {{ s === 'settled' ? 'Decided' : cap(s) }}
          </button>
        </div>
      </div>

      <div v-if="zone" class="new">
        <button v-if="!composing" class="new-btn" type="button" @click="composing = true">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg> New thread
        </button>
        <form v-else class="new-form" @submit.prevent="create">
          <input v-model="draft.title" class="nf-title" placeholder="What needs deciding?" aria-label="Title" autofocus />
          <textarea v-model="draft.body" rows="3" placeholder="Context: what you know, what it affects" aria-label="Thread context"></textarea>
          <div class="nf-bar">
            <div class="seg" role="radiogroup" aria-label="Kind">
              <button v-for="k in (['question', 'proposal', 'idea'] as Thread['type'][])" :key="k" type="button" role="radio" :aria-checked="draft.type === k" @click="draft.type = k">{{ cap(k) }}</button>
            </div>
            <span class="nf-actions">
              <button class="ghost-btn" type="button" @click="composing = false">Cancel</button>
              <button class="primary-sm" type="submit" :disabled="!draft.title.trim()">Start</button>
            </span>
          </div>
        </form>
      </div>

      <div class="list">
        <p v-if="!flat.length" class="empty">
          {{ inView.length ? 'Nothing here with this filter.' : zone ? 'No threads in this zone yet.' : 'Nothing here.' }}
        </p>
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
            <span class="rmain">
              <span class="rtitle">{{ t.title }}</span>
              <span v-if="index" class="rzone">{{ zoneLabel(t.zone) }}</span>
            </span>
            <span class="rtime">{{ ago(t.activeAt) }}</span>
          </button>
        </section>
      </div>
    </section>

    <section class="detail-pane" aria-label="Thread">
      <ThreadDetail v-if="selected" :thread="selected" :index="index" @back="mobileDetail = false" />
      <p v-else class="empty pad">{{ zone ? 'Start the first thread in this zone.' : 'Pick a thread.' }}</p>
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

.detail-pane { min-height: 0; overflow-y: auto; background: var(--thread-bg); }
.empty { margin: 0; padding: 24px 8px; text-align: center; color: var(--fg-muted); }
.empty.pad { padding: 48px; }

/* Starting a thread */
.new { padding: 0 12px 8px; }
.new-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px dashed var(--slate-a5); border-radius: 8px;
  background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; width: 100%;
}
.new-btn:hover { color: var(--fg); border-color: var(--slate-a7); }
.new-btn svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.new-form { display: grid; gap: 6px; padding: 8px; border: 1px solid var(--slate-a4); border-radius: 10px; background: var(--slate-a2); }
.new-form input, .new-form textarea {
  width: 100%; border: 0; background: none; color: var(--fg); font: inherit; font-size: var(--text-nav); outline: none; resize: vertical;
}
.nf-title { font-weight: 500; }
.new-form textarea { font-size: var(--text-base); color: var(--fg-2); }
.new-form ::placeholder { color: var(--fg-faint); }
.nf-bar { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.nf-bar .seg button { height: 20px; padding: 0 7px; }
.nf-actions { display: inline-flex; gap: 4px; }
.ghost-btn { height: 24px; padding: 0 8px; border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.ghost-btn:hover { color: var(--fg); }
.primary-sm {
  height: 24px; padding: 0 10px; border: 0; border-radius: 6px; background: var(--indigo-9); color: #fff;
  font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
}
.primary-sm:disabled { opacity: 0.4; cursor: default; }
.rmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.rzone { font-size: var(--text-sm); color: var(--fg-faint); }

@media (max-width: 899px) {
  .threads { grid-template-columns: minmax(0, 1fr); }
  .detail-pane { display: none; }
  .show-detail .list-pane { display: none; }
  .show-detail .detail-pane { display: block; }
  .list-pane { box-shadow: none; }
}
</style>
