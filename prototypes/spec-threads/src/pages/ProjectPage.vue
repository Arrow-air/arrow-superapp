<script setup lang="ts">
// One project: its versions side by side, and the threads addressed to each.
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import ThreadRow from '../components/ThreadRow.vue';
import type { ThreadBundle } from '../data/backend';
import { backend, myRoleOn, projectById, state } from '../data/store';
import { analyzeThread } from '../lib/analyze';
import { VERSION_STATE_LABEL } from '../lib/labels';
import { buildingVersion, discussingVersion, freezeCheck } from '../lib/versions';

const props = defineProps<{ id: string }>();

const bundles = ref<ThreadBundle[]>([]);
const loading = ref(true);
const tab = ref('');

watch(
  () => state.version,
  async () => {
    try {
      bundles.value = (await backend.listBundles()).filter((b) => b.thread.projectId === props.id);
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const project = computed(() => projectById.value.get(props.id));
const versions = computed(() => [...(project.value?.versions ?? [])].sort((a, b) => a.order - b.order));
const building = computed(() => (project.value ? buildingVersion(project.value) : undefined));
const discussing = computed(() => (project.value ? discussingVersion(project.value) : undefined));
const iAmLead = computed(() => myRoleOn(props.id) === 'lead');

watch(discussing, (d) => { if (!tab.value && d) tab.value = d.id; }, { immediate: true });

const countsFor = (versionId: string) => {
  if (!project.value) return null;
  const c = freezeCheck(project.value, versionId, bundles.value.map((b) => b.thread));
  return c;
};

const rows = computed(() =>
  bundles.value
    .filter((b) => !tab.value || b.thread.versionId === tab.value)
    .map((b) => ({ bundle: b, analysis: project.value ? analyzeThread({ bundle: b, members: state.members, roles: state.roles, project: project.value }) : null }))
    .sort((a, b) => {
      // Open first, then newest.
      if (a.bundle.thread.status !== b.bundle.thread.status) return a.bundle.thread.status === 'open' ? -1 : 1;
      return b.bundle.thread.createdAt.localeCompare(a.bundle.thread.createdAt);
    }),
);
</script>

<template>
  <div v-if="!project">
    <p>That project does not exist.</p>
    <RouterLink to="/">Back to projects</RouterLink>
  </div>

  <div v-else>
    <p class="small" style="margin: 0"><RouterLink to="/">← All projects</RouterLink></p>
    <div class="page-header spread" style="align-items: flex-end">
      <div>
        <h1 style="border: 0; margin: 6px 0 0; padding: 0">{{ project.name }}</h1>
        <p class="muted" style="margin: 6px 0 0; max-width: 700px">
          <template v-if="building && discussing">
            <b>{{ building.name }}</b> is being built. Outside ideas go to <b>{{ discussing.name }}</b>; that is the honest offer.
            The lead reads and votes along the way, then resolves every thread at the freeze.
          </template>
          <template v-else-if="discussing">Ideas go to <b>{{ discussing.name }}</b>.</template>
          <template v-else>Nothing is in discussion right now.</template>
        </p>
      </div>
      <div class="row">
        <RouterLink to="/register" class="btn btn-ghost">Register</RouterLink>
        <RouterLink v-if="state.me && discussing" :to="{ name: 'new-thread', query: { project: project.id } }" class="btn">Post a thread for {{ discussing.name }}</RouterLink>
      </div>
    </div>

    <div class="version-strip">
      <div v-for="v in versions" :key="v.id" class="version-card" :class="`is-${v.state}`">
        <div class="spread" style="align-items: baseline">
          <span class="version-name">{{ v.name }}</span>
          <span class="chip" :class="{ 'chip-version': v.state === 'discussing', 'chip-bounty': v.state === 'frozen' }">{{ VERSION_STATE_LABEL[v.state] }}</span>
        </div>
        <div class="small muted" style="margin-top: 6px">
          <template v-if="v.state === 'building'">Being built and flown. Not taking outside ideas.</template>
          <template v-else-if="v.state === 'discussing'">
            <b>{{ countsFor(v.id)?.open.length }}</b> open · {{ countsFor(v.id)?.resolved.length }} resolved
            <template v-if="v.freezeTarget"><br />Freeze target {{ v.freezeTarget }}</template>
          </template>
          <template v-else-if="v.state === 'frozen'">
            Frozen {{ v.frozenAt?.slice(0, 10) }}. {{ countsFor(v.id)?.resolved.length }} threads resolved, {{ countsFor(v.id)?.deferredAway.length }} deferred.
          </template>
          <template v-else>Threads can be deferred here. Opens for discussion when {{ versions.find((x) => x.order === v.order - 1)?.name ?? 'the one before' }} freezes.</template>
        </div>
        <div v-if="v.state === 'discussing' && iAmLead" style="margin-top: 10px">
          <RouterLink :to="{ name: 'freeze', params: { projectId: project.id, versionId: v.id } }" class="btn">Freeze {{ v.name }}</RouterLink>
        </div>
        <div v-else-if="v.state === 'discussing'" style="margin-top: 10px">
          <RouterLink :to="{ name: 'freeze', params: { projectId: project.id, versionId: v.id } }" class="small">What the freeze looks like →</RouterLink>
        </div>
      </div>
    </div>

    <div class="tabs" role="tablist" style="margin-top: 26px">
      <button v-for="v in versions" :key="v.id" type="button" class="tab" :class="{ on: tab === v.id }" role="tab" :aria-selected="tab === v.id" @click="tab = v.id">
        {{ v.name }} <span class="muted">{{ bundles.filter((b) => b.thread.versionId === v.id).length }}</span>
      </button>
      <button type="button" class="tab" :class="{ on: tab === '' }" role="tab" :aria-selected="tab === ''" @click="tab = ''">All</button>
    </div>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="rows.length === 0" class="muted" style="margin-top: 16px">
      No threads here yet.
      <RouterLink v-if="state.me && discussing" :to="{ name: 'new-thread', query: { project: project.id } }">Post the first one.</RouterLink>
    </p>
    <ul v-else class="thread-list">
      <ThreadRow v-for="r in rows" :key="r.bundle.thread.id" :bundle="r.bundle" :analysis="r.analysis" />
    </ul>
  </div>
</template>
