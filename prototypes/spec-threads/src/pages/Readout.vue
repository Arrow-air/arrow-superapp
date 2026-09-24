<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import DiscussPin from '../components/DiscussPin.vue';
import type { ThreadBundle } from '../data/backend';
import { backend, handleOf, memberById, projectById, state, versionOf } from '../data/store';
import { analyzeThread } from '../lib/analyze';
import { RESOLUTION_CHIP, RESOLUTION_LABEL, percent } from '../lib/labels';
import type { Grant, ResolutionKind } from '../lib/types';

// The point of the prototype. Questions from OPEN-QUESTIONS.md, answered with counts:
//   Q6  does weighting change outcomes versus one person one vote?
//   Q2  how often does the lead go against the weighted result, and why?
//   Q13 does anyone actually take part?
//   v2: how do threads end at the freeze, and what do grants carry for their proposers? (Q30, Q31)

const bundles = ref<ThreadBundle[]>([]);
const grants = ref<Grant[]>([]);
const loading = ref(true);

watch(
  () => state.version,
  async () => {
    try {
      [bundles.value, grants.value] = await Promise.all([backend.listBundles(), backend.listGrants()]);
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const rows = computed(() =>
  bundles.value.flatMap((b) => {
    const project = projectById.value.get(b.thread.projectId);
    if (!project) return [];
    const a = analyzeThread({ bundle: b, members: state.members, roles: state.roles, project });
    const top = (k: 'rawRank' | 'weightedRank') =>
      a.tallies
        .filter((t) => t[k] === 1 && t.voters > 0)
        .map((t) => '@' + (memberById.value.get(b.positions.find((s) => s.id === t.positionId)?.authorId ?? '')?.handle ?? '?'))
        .join(', ') || '—';
    return [{ bundle: b, project, a, rawTop: top('rawRank'), weightedTop: top('weightedRank') }];
  }),
);

const contested = computed(() => rows.value.filter((r) => r.bundle.positions.length >= 2 && r.a.participants > 0));
const diverged = computed(() => contested.value.filter((r) => r.a.weightingChangedWinner));
const chosen = computed(() => rows.value.filter((r) => r.a.leadFollowedWeighted !== null));
const overrides = computed(() => chosen.value.filter((r) => r.a.leadFollowedWeighted === false));
const totalVoters = computed(() => new Set(bundles.value.flatMap((b) => b.votes.map((v) => v.memberId))).size);
const positionAuthors = computed(() => new Set(bundles.value.flatMap((b) => b.positions.map((s) => s.authorId))).size);

const KINDS: ResolutionKind[] = ['reject', 'spec', 'grant', 'defer'];
const byKind = computed(() => {
  const counts: Record<ResolutionKind, number> = { reject: 0, spec: 0, grant: 0, defer: 0 };
  for (const b of bundles.value) {
    if (b.thread.resolution) counts[b.thread.resolution.kind] += 1;
    counts.defer += b.thread.deferrals.length;
  }
  return counts;
});
const resolvedOrDeferred = computed(() => bundles.value.filter((b) => b.thread.resolution || b.thread.deferrals.length).length);

const weightTable = computed(() =>
  state.projects.map((p) => ({
    project: p,
    members: state.members
      .map((m) => {
        // Weight with no thread context: no expertise match, no builder intent. The floor each person votes from.
        const role = state.roles.find((r) => r.projectId === p.id && r.memberId === m.id)?.role ?? 'member';
        const a = analyzeThread({
          bundle: { thread: { id: '', projectId: p.id, versionId: '', title: '', body: '', tags: [], authorId: '', status: 'open', createdAt: '', deferrals: [] }, positions: [], votes: [], intents: [], comments: [] },
          members: [m],
          roles: state.roles,
          project: p,
        });
        return { m, role, w: a.weights.get(m.id)! };
      })
      .sort((x, y) => y.w.total - x.w.total),
  })),
);
</script>

<template>
  <h1>Experiment readout <DiscussPin anchor="readout" class="pin-inline" /></h1>
  <p class="muted" style="max-width: 760px">
    This prototype exists to answer a few questions with evidence instead of opinion. The numbers below update as people use it.
    With the demo data they only show that the instrument works.
  </p>

  <p v-if="loading" class="muted">Loading…</p>
  <div v-else class="stack" style="margin-top: 22px">
    <div class="stat-grid">
      <div class="stat">
        <div class="stat-value">{{ diverged.length }} / {{ contested.length }}</div>
        <div class="label stat-label">contested threads where weighting changed the winner</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ overrides.length }} / {{ chosen.length }}</div>
        <div class="label stat-label">lead choices that overrode the weighted result</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ totalVoters }}</div>
        <div class="label stat-label">distinct voters</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ positionAuthors }}</div>
        <div class="label stat-label">distinct position authors</div>
      </div>
    </div>

    <section>
      <h2>How threads end</h2>
      <p class="muted small">At the freeze every thread is rejected, promoted to spec, turned into a grant, or deferred. The mix says what the discussion is producing. Raw material for Q30 and Q31.</p>
      <div class="stat-grid">
        <div v-for="k in KINDS" :key="k" class="stat">
          <div class="stat-value">{{ byKind[k] }}</div>
          <div class="label stat-label"><span class="chip" :class="RESOLUTION_CHIP[k]">{{ RESOLUTION_LABEL[k] }}</span></div>
        </div>
        <div class="stat">
          <div class="stat-value">{{ resolvedOrDeferred }} / {{ bundles.length }}</div>
          <div class="label stat-label">threads resolved or deferred at least once</div>
        </div>
      </div>
    </section>

    <section v-if="grants.length">
      <h2>Grants and proposer awards</h2>
      <p class="muted small">What the discussion handed to the lead, and what the idea's author is owed for it. No tokens move in this prototype.</p>
      <div class="table-scroll">
        <table class="data">
          <thead><tr><th>Grant</th><th>Project</th><th>Status</th><th>Proposer</th><th class="num">Award</th><th class="num">Constraints</th><th>Lead's pick</th></tr></thead>
          <tbody>
            <tr v-for="g in grants" :key="g.id">
              <td><RouterLink :to="{ name: 'grant', params: { id: g.id } }">{{ g.title }}</RouterLink></td>
              <td>{{ projectById.get(g.projectId)?.name }} · {{ versionOf(g.projectId, g.versionId)?.name }}</td>
              <td><span class="chip" :class="g.status === 'draft' ? 'chip-warn' : 'chip-open'">{{ g.status }}</span></td>
              <td class="mono small">{{ g.proposerIds.map((id) => '@' + handleOf(id)).join(', ') }}</td>
              <td class="num">{{ percent(g.proposerShare) }}</td>
              <td class="num">{{ g.constraints.length }}</td>
              <td><span v-if="g.weightedRankAtResolution === 1" class="chip chip-open">followed weighted</span><span v-else class="chip chip-warn">overrode</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Per thread</h2>
      <div class="thread-cards">
        <RouterLink v-for="r in rows" :key="r.bundle.thread.id" :to="{ name: 'thread', params: { id: r.bundle.thread.id } }" class="card thread-card">
          <div class="row" style="gap: 6px">
            <span class="chip chip-project">{{ r.project.name }}</span>
            <span class="chip chip-version">{{ versionOf(r.project.id, r.bundle.thread.versionId)?.name }}</span>
            <span v-if="r.bundle.positions.length >= 2 && r.a.participants && r.a.weightingChangedWinner" class="chip chip-warn">weighting changed the winner</span>
            <span v-if="r.a.leadFollowedWeighted === false" class="chip chip-warn">lead overrode</span>
            <span v-else-if="r.a.leadFollowedWeighted" class="chip chip-open">lead followed weighted</span>
          </div>
          <div style="font-weight: 600; margin: 6px 0 4px; color: var(--docs-text)">{{ r.bundle.thread.title }}</div>
          <div class="small muted">{{ r.bundle.positions.length }} positions · {{ r.a.participants }} voters · raw top {{ r.rawTop }} · weighted top {{ r.weightedTop }}</div>
        </RouterLink>
      </div>
      <div class="table-scroll thread-table">
        <table class="data">
          <thead>
            <tr>
              <th>Thread</th><th>Project</th><th class="num">Positions</th><th class="num">Voters</th>
              <th>Raw top</th><th>Weighted top</th><th>Weighting mattered</th><th>Ended</th><th>Lead's pick</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.bundle.thread.id">
              <td><RouterLink :to="{ name: 'thread', params: { id: r.bundle.thread.id } }">{{ r.bundle.thread.title }}</RouterLink></td>
              <td>{{ r.project.name }} · {{ versionOf(r.project.id, r.bundle.thread.versionId)?.name }}</td>
              <td class="num">{{ r.bundle.positions.length }}</td>
              <td class="num">{{ r.a.participants }}</td>
              <td class="mono small">{{ r.rawTop }}</td>
              <td class="mono small">{{ r.weightedTop }}</td>
              <td>
                <span v-if="r.bundle.positions.length < 2 || !r.a.participants" class="muted">n/a</span>
                <span v-else-if="r.a.weightingChangedWinner" class="chip chip-warn">yes</span>
                <span v-else class="chip">no</span>
              </td>
              <td>
                <span v-if="r.bundle.thread.resolution" class="chip" :class="RESOLUTION_CHIP[r.bundle.thread.resolution.kind]">{{ RESOLUTION_LABEL[r.bundle.thread.resolution.kind] }}</span>
                <span v-else-if="r.bundle.thread.deferrals.length" class="chip chip-defer">deferred, open</span>
                <span v-else class="muted">open</span>
              </td>
              <td>
                <span v-if="r.a.leadFollowedWeighted === null" class="muted">—</span>
                <span v-else-if="r.a.leadFollowedWeighted" class="chip chip-open">followed weighted</span>
                <span v-else class="chip chip-warn">overrode</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="overrides.length">
      <h2>Override rationales</h2>
      <p class="muted small">Where a lead chose against the weighted result, in their words. Raw material for open question Q2.</p>
      <div v-for="r in overrides" :key="r.bundle.thread.id" class="card" style="margin-top: 10px">
        <RouterLink :to="{ name: 'thread', params: { id: r.bundle.thread.id } }"><strong>{{ r.bundle.thread.title }}</strong></RouterLink>
        <div v-if="r.bundle.thread.resolution && r.bundle.thread.resolution.kind !== 'reject'" class="small muted">
          {{ RESOLUTION_LABEL[r.bundle.thread.resolution.kind] }} · picked weighted rank {{ r.bundle.thread.resolution.weightedRankAtResolution }}, raw rank {{ r.bundle.thread.resolution.rawRankAtResolution }}
        </div>
        <p v-if="r.bundle.thread.resolution && r.bundle.thread.resolution.kind !== 'reject'" style="margin-bottom: 0">{{ r.bundle.thread.resolution.overrideRationale }}</p>
      </div>
    </section>

    <section>
      <h2>Who counts for how much</h2>
      <p class="muted small">
        Each member's floor weight per project, before any expertise match or builder intent on a specific thread.
        If this table looks wrong to you, the weights are wrong. Say so.
      </p>
      <div v-for="t in weightTable" :key="t.project.id" style="margin-top: 14px">
        <div class="label" style="margin-bottom: 4px">{{ t.project.name }}</div>
        <div class="table-scroll">
          <table class="data">
            <thead><tr><th>Member</th><th>Role</th><th class="num">$ARROW</th><th class="num">Token term</th><th class="num">× role</th><th class="num">Floor weight</th></tr></thead>
            <tbody>
              <tr v-for="x in t.members" :key="x.m.id">
                <td>@{{ x.m.handle }}</td>
                <td>{{ x.role }}</td>
                <td class="num">{{ x.m.tokenBalance.toLocaleString('en-US') }}</td>
                <td class="num">{{ x.w.token }}</td>
                <td class="num">{{ x.w.roleMultiplier }}</td>
                <td class="num"><b>{{ x.w.total }}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
