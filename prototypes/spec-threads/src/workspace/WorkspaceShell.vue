<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { act, backend, state } from '../data/store';
import { isExampleWorkspace, isSharedProject } from '../data/projectDataMode';
import { api } from '../data/sharedBackend';
import { useNav, type View } from './nav';
import { useProject } from './useProject';
import { buildingVersion, daysUntil, discussingVersion, openQuestions } from './derive';
import { activeStages } from './derive';
import { trackingOf } from '../lib/projectRecords';
import RecordDetail from './RecordDetail.vue';

const OverviewView = defineAsyncComponent(() => import('./OverviewView.vue'));
const DiscussionsView = defineAsyncComponent(() => import('./DiscussionsView.vue'));
const SpecView = defineAsyncComponent(() => import('./SpecView.vue'));
const WorkView = defineAsyncComponent(() => import('./WorkView.vue'));
const PeopleView = defineAsyncComponent(() => import('./PeopleView.vue'));
const SourcesView = defineAsyncComponent(() => import('./SourcesView.vue'));
const InboxView = defineAsyncComponent(() => import('./InboxView.vue'));
const FreezeView = defineAsyncComponent(() => import('./FreezeView.vue'));
const SearchView = defineAsyncComponent(() => import('./SearchView.vue'));

const { view, q, go, route } = useNav();
const { data } = useProject();
const pt2 = computed(() => (data.value ? discussingVersion(data.value.project) : undefined));
const pt1 = computed(() => (data.value ? buildingVersion(data.value.project) : undefined));
const openCount = computed(() => (data.value && pt2.value ? openQuestions(data.value, pt2.value.id).length : 0));
const activeWork = computed(() => data.value?.grants.filter((g) => activeStages.includes(trackingOf(g).stage)).length ?? 0);
const freezeDays = computed(() => (pt2.value?.freezeTarget ? daysUntil(pt2.value.freezeTarget) : null));
const tabs = computed<{ id: View; label: string; count?: number }[]>(() => [
  { id: 'overview', label: 'Overview' },
  { id: 'discussions', label: 'Discussions', count: openCount.value || undefined },
  { id: 'spec', label: 'Spec' },
  { id: 'work', label: 'Work', count: activeWork.value || undefined },
  { id: 'people', label: 'People' },
  { id: 'sources', label: 'Sources' },
]);
const current = computed(() => ({ overview: OverviewView, discussions: DiscussionsView, spec: SpecView, work: WorkView, people: PeopleView, sources: SourcesView, inbox: InboxView, freeze: FreezeView, search: SearchView })[view.value]);
const search = ref(q('q'));
watch(() => route.query.q, (v) => { if (view.value === 'search') search.value = String(v ?? ''); });
function submitSearch() { if (search.value.trim()) go('search', { q: search.value.trim() }); }

// Unread count for the signed-in member's inbox.
const unread = ref(0);
watch(() => [state.me?.id, state.version], async () => {
  if (!state.me || !isSharedProject) { unread.value = 0; return; }
  try { unread.value = (await api<{ read_at: string | null }[]>('/notifications')).filter((n) => !n.read_at).length; } catch { unread.value = 0; }
}, { immediate: true });
// An example workspace announces itself so nobody mistakes its people or activity for Arrow's.
const banner = ref(isExampleWorkspace ? 'Example workspace · fictional people and activity; the call and repository records are real. Pick someone under “Explore as” to act as a lead or a contributor. Your changes stay in this browser.' : '');
if (isSharedProject) fetch('/api/config').then((r) => r.json()).then((c) => { banner.value = c.banner ?? ''; }).catch(() => {});
async function resetExample() {
  if (confirm('Discard your changes and restore the example workspace?')) await act(() => backend.reset!());
}
const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
watch([view, () => route.query.thread, () => route.query.record], () => {
  const label = view.value === 'overview' ? 'Overview' : tabs.value.find((t) => t.id === view.value)?.label ?? view.value.charAt(0).toUpperCase() + view.value.slice(1);
  document.title = `${label} · Spearhead · Arrow`;
}, { immediate: true });
</script>

<template>
  <div class="pw">
    <p v-if="banner" class="pw-banner" role="note">{{ banner }} <button v-if="isExampleWorkspace" class="pw-banner-reset" @click="resetExample">Reset the example</button></p>
    <header class="pw-head">
      <div class="pw-head-main">
        <div class="pw-title-row">
          <h1>Spearhead</h1>
          <span v-if="pt2" class="pw-pill pw-pill-live">{{ pt2.name }} in design discussion</span>
        </div>
        <p class="pw-head-meta">
          <span v-if="pt1"><b>{{ pt1.name }}</b> in build</span>
          <span v-if="pt2" class="pw-sep" aria-hidden="true">·</span>
          <span v-if="pt2?.freezeTarget"><b>{{ pt2.name }} freeze</b> {{ fmt(pt2.freezeTarget) }}<template v-if="freezeDays !== null"> ({{ freezeDays > 0 ? `${freezeDays} days` : freezeDays === 0 ? 'today' : 'overdue' }})</template></span>
          <span v-else-if="pt2">{{ pt2.name }} freeze date not set</span>
        </p>
      </div>
      <RouterLink v-if="state.me && isSharedProject" class="pw-inbox-mobile" :to="{ path: '/p/spearhead', query: { view: 'inbox' } }">Inbox<span v-if="unread" class="pw-count pw-count-alert">{{ unread }}</span></RouterLink>
      <form class="pw-search" role="search" @submit.prevent="submitSearch">
        <label class="sr-only" for="pw-search">Search Spearhead</label>
        <input id="pw-search" v-model="search" type="search" placeholder="Search Spearhead…" />
      </form>
    </header>
    <nav class="pw-tabs" aria-label="Project sections">
      <RouterLink v-for="t in tabs" :key="t.id" :to="{ path: '/p/spearhead', query: t.id === 'overview' ? {} : { view: t.id } }" :class="{ active: view === t.id }" :aria-current="view === t.id ? 'page' : undefined">{{ t.label }}<span v-if="t.count" class="pw-count">{{ t.count }}</span></RouterLink>
      <RouterLink v-if="state.me && isSharedProject" :to="{ path: '/p/spearhead', query: { view: 'inbox' } }" class="pw-tab-inbox" :class="{ active: view === 'inbox' }" :aria-current="view === 'inbox' ? 'page' : undefined">Inbox<span v-if="unread" class="pw-count pw-count-alert" :aria-label="`${unread} unread`">{{ unread }}</span></RouterLink>
    </nav>
    <p v-if="!data" class="pw-muted pw-loading">Loading Spearhead…</p>
    <RecordDetail v-else-if="route.query.record" :key="String(route.query.record)" :record-id="String(route.query.record)" />
    <component :is="current" v-else />
  </div>
</template>
