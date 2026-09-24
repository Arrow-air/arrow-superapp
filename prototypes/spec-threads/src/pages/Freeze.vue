<script setup lang="ts">
// The freeze screen. Every open thread addressed to this version, and the four ways to end
// each one. The version cannot be frozen with anything still open. This is the screen the
// 2026-09-23 call described: "you go down the list and everything gets resolved one way or another."
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import ResolvePanel from '../components/ResolvePanel.vue';
import type { ThreadBundle } from '../data/backend';
import { act, backend, handleOf, myRoleOn, projectById, state, versionOf } from '../data/store';
import { analyzeThread } from '../lib/analyze';
import { positionTitle } from '../lib/format';
import { RESOLUTION_CHIP, RESOLUTION_LABEL } from '../lib/labels';
import { freezeCheck } from '../lib/versions';

const props = defineProps<{ projectId: string; versionId: string }>();

const bundles = ref<ThreadBundle[]>([]);
const loading = ref(true);
const expanded = reactive<Record<string, boolean>>({});
const justFroze = ref(false);

watch(
  () => state.version,
  async () => {
    try {
      bundles.value = (await backend.listBundles()).filter((b) => b.thread.projectId === props.projectId);
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const project = computed(() => projectById.value.get(props.projectId));
const version = computed(() => versionOf(props.projectId, props.versionId));
const iAmLead = computed(() => myRoleOn(props.projectId) === 'lead');
const check = computed(() => (project.value && version.value ? freezeCheck(project.value, props.versionId, bundles.value.map((b) => b.thread)) : null));

const analyzed = computed(() => {
  const map = new Map<string, ReturnType<typeof analyzeThread>>();
  if (!project.value) return map;
  for (const b of bundles.value) map.set(b.thread.id, analyzeThread({ bundle: b, members: state.members, roles: state.roles, project: project.value }));
  return map;
});
const bundleOf = (id: string) => bundles.value.find((b) => b.thread.id === id)!;
const weightedTop = (id: string) => {
  const a = analyzed.value.get(id);
  const b = bundleOf(id);
  const t = a?.tallies.find((x) => x.weightedRank === 1 && x.voters > 0);
  const p = t && b.positions.find((x) => x.id === t.positionId);
  return p ? { title: positionTitle(p.body), author: handleOf(p.authorId), score: t!.weightedScore } : null;
};

const total = computed(() => (check.value ? check.value.open.length + check.value.resolved.length + check.value.deferredAway.length : 0));
const done = computed(() => (check.value ? check.value.resolved.length + check.value.deferredAway.length : 0));
const openSorted = computed(() => [...(check.value?.open ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
const nextName = computed(() => project.value?.versions.find((v) => v.order === (version.value?.order ?? 0) + 1)?.name);

function onResolved(threadId: string) {
  expanded[threadId] = false;
}

async function freeze() {
  if (!check.value?.canFreeze) return;
  if (!confirm(`Freeze ${version.value?.name}? Its threads are locked and ${nextName.value ?? 'the next version'} opens for discussion.`)) return;
  if (await act(() => backend.freezeVersion({ projectId: props.projectId, versionId: props.versionId }))) justFroze.value = true;
}
</script>

<template>
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="!project || !version || !check">
    <p>That version does not exist.</p>
    <RouterLink to="/">Back to projects</RouterLink>
  </div>

  <div v-else>
    <p class="small" style="margin: 0"><RouterLink :to="{ name: 'project', params: { id: project.id } }">← {{ project.name }}</RouterLink></p>
    <div class="page-header spread" style="align-items: flex-end">
      <div>
        <h1 style="border: 0; margin: 6px 0 0; padding: 0">Freeze {{ version.name }}</h1>
        <p class="muted" style="margin: 6px 0 0; max-width: 720px">
          Every thread addressed to {{ version.name }} ends one of four ways: rejected with a line of why, promoted to a spec in the register,
          turned into a grant draft, or deferred to {{ nextName ?? 'the next version' }}. Nothing stays half-open across a freeze.
        </p>
      </div>
    </div>

    <div class="freeze-progress card">
      <div class="spread" style="align-items: center">
        <div>
          <span class="stat-value" style="font-size: 1.4rem">{{ done }} / {{ total }}</span>
          <span class="muted"> resolved or deferred</span>
          <span v-if="version.freezeTarget" class="small muted"> · freeze target {{ version.freezeTarget }}</span>
        </div>
        <div class="row">
          <template v-if="version.state === 'frozen'">
            <span class="chip chip-bounty">frozen {{ version.frozenAt?.slice(0, 10) }} by @{{ handleOf(version.frozenBy ?? '') }}</span>
          </template>
          <template v-else-if="iAmLead">
            <button class="btn" :disabled="!check.canFreeze" :title="check.canFreeze ? '' : `${check.open.length} still open`" @click="freeze">Freeze {{ version.name }}</button>
          </template>
          <span v-else class="small muted">Only the project lead can resolve threads and freeze. Switch persona to try it.</span>
        </div>
      </div>
      <div class="progress" role="progressbar" :aria-valuenow="done" :aria-valuemin="0" :aria-valuemax="total" :aria-label="`${done} of ${total} threads resolved`">
        <span :style="{ width: total ? (done / total) * 100 + '%' : '0%' }" />
      </div>
      <div v-if="justFroze" class="signal signal-agree" style="margin-top: 12px">
        {{ version.name }} is frozen. <template v-if="nextName">{{ nextName }} is now in discussion.</template>
        See the <RouterLink to="/register">register</RouterLink> and the <RouterLink to="/grants">grant drafts</RouterLink>.
      </div>
    </div>

    <section v-if="openSorted.length" style="margin-top: 22px">
      <h2 style="margin-bottom: 8px">{{ openSorted.length }} open</h2>
      <div v-for="t in openSorted" :key="t.id" class="freeze-row">
        <div class="spread" style="align-items: flex-start">
          <div style="min-width: 0">
            <div class="row" style="gap: 6px">
              <span v-if="t.system" class="chip chip-system">{{ t.system }}</span>
              <span v-for="tag in t.tags" :key="tag" class="chip">{{ tag }}</span>
              <span v-if="analyzed.get(t.id)?.weightingChangedWinner" class="chip chip-warn">crowd and weighting disagree</span>
            </div>
            <RouterLink :to="{ name: 'thread', params: { id: t.id } }" class="freeze-title">{{ t.title }}</RouterLink>
            <div class="small muted">
              {{ bundleOf(t.id).positions.length }} {{ bundleOf(t.id).positions.length === 1 ? 'position' : 'positions' }} ·
              {{ analyzed.get(t.id)?.participants ?? 0 }} voters ·
              <template v-if="weightedTop(t.id)">weighted top: <b>{{ weightedTop(t.id)!.title }}</b> (@{{ weightedTop(t.id)!.author }}, +{{ weightedTop(t.id)!.score }})</template>
              <template v-else>no votes yet</template>
            </div>
          </div>
          <button v-if="iAmLead" class="btn btn-ghost" :aria-expanded="!!expanded[t.id]" @click="expanded[t.id] = !expanded[t.id]">
            {{ expanded[t.id] ? 'Close' : 'Resolve' }}
          </button>
        </div>
        <div v-if="iAmLead && expanded[t.id]" style="margin-top: 12px">
          <ResolvePanel :bundle="bundleOf(t.id)" :analysis="analyzed.get(t.id)!" :project="project" compact @done="onResolved(t.id)" />
        </div>
      </div>
    </section>
    <div v-else-if="version.state !== 'frozen'" class="signal signal-agree" style="margin-top: 22px">
      Nothing open. {{ iAmLead ? `Freeze ${version.name} when you are ready.` : 'The lead can freeze it now.' }}
    </div>

    <section v-if="check.resolved.length" style="margin-top: 26px">
      <h2 style="margin-bottom: 8px">{{ check.resolved.length }} resolved</h2>
      <ul class="thread-list">
        <li v-for="t in check.resolved" :key="t.id" class="thread-item">
          <RouterLink :to="{ name: 'thread', params: { id: t.id } }">
            <div class="row" style="gap: 6px">
              <span class="chip" :class="RESOLUTION_CHIP[t.resolution!.kind]">{{ RESOLUTION_LABEL[t.resolution!.kind] }}</span>
              <span v-if="t.system" class="chip chip-system">{{ t.system }}</span>
              <span v-if="t.resolution!.kind !== 'reject' && t.resolution!.weightedRankAtResolution !== 1" class="chip chip-warn">lead overrode</span>
            </div>
            <div class="thread-title">{{ t.title }}</div>
            <div class="small muted">
              by @{{ handleOf(t.resolution!.byMemberId) }} · {{ t.resolution!.at.slice(0, 10) }}
              <template v-if="t.resolution!.kind === 'reject'"> · {{ t.resolution!.note }}</template>
            </div>
          </RouterLink>
        </li>
      </ul>
    </section>

    <section v-if="check.deferredAway.length" style="margin-top: 26px">
      <h2 style="margin-bottom: 8px">{{ check.deferredAway.length }} deferred</h2>
      <ul class="thread-list">
        <li v-for="t in check.deferredAway" :key="t.id" class="thread-item">
          <RouterLink :to="{ name: 'thread', params: { id: t.id } }">
            <div class="row" style="gap: 6px">
              <span class="chip chip-defer">deferred to {{ versionOf(t.projectId, t.versionId)?.name }}</span>
              <span v-if="t.system" class="chip chip-system">{{ t.system }}</span>
            </div>
            <div class="thread-title">{{ t.title }}</div>
            <div class="small muted">{{ t.deferrals[t.deferrals.length - 1]?.note || 'Still open there, with its votes and history.' }}</div>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
