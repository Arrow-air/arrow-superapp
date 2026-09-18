<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import DiscussPin from '../components/DiscussPin.vue';
import type { NeedBundle } from '../data/backend';
import { backend, memberById, projectById, state } from '../data/store';
import { analyzeNeed } from '../lib/analyze';

// The point of the prototype. Three questions from OPEN-QUESTIONS.md, answered with counts:
//   Q6  does weighting change outcomes versus one person one vote?
//   Q2  how often does the lead go against the weighted result, and why?
//   Q13 does anyone actually take part?

const bundles = ref<NeedBundle[]>([]);
const loading = ref(true);

watch(
  () => state.version,
  async () => {
    try {
      bundles.value = await backend.listBundles();
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
    const project = projectById.value.get(b.need.projectId);
    if (!project) return [];
    const a = analyzeNeed({ bundle: b, members: state.members, roles: state.roles, project });
    const top = (k: 'rawRank' | 'weightedRank') =>
      a.tallies
        .filter((t) => t[k] === 1 && t.voters > 0)
        .map((t) => '@' + (memberById.value.get(b.specs.find((s) => s.id === t.specId)?.authorId ?? '')?.handle ?? '?'))
        .join(', ') || '—';
    return [{ bundle: b, project, a, rawTop: top('rawRank'), weightedTop: top('weightedRank') }];
  }),
);

const contested = computed(() => rows.value.filter((r) => r.bundle.specs.length >= 2 && r.a.participants > 0));
const diverged = computed(() => contested.value.filter((r) => r.a.weightingChangedWinner));
const promoted = computed(() => rows.value.filter((r) => r.bundle.need.promotion));
const overrides = computed(() => promoted.value.filter((r) => r.a.leadFollowedWeighted === false));
const totalVoters = computed(() => new Set(bundles.value.flatMap((b) => b.votes.map((v) => v.memberId))).size);
const specAuthors = computed(() => new Set(bundles.value.flatMap((b) => b.specs.map((s) => s.authorId))).size);

const weightTable = computed(() =>
  state.projects.map((p) => ({
    project: p,
    members: state.members
      .map((m) => {
        // Weight with no need context: no expertise match, no builder intent. The floor each person votes from.
        const role = state.roles.find((r) => r.projectId === p.id && r.memberId === m.id)?.role ?? 'member';
        const a = analyzeNeed({
          bundle: { need: { id: '', projectId: p.id, title: '', body: '', tags: [], authorId: '', status: 'open', createdAt: '' }, specs: [], votes: [], intents: [], comments: [] },
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
    This prototype exists to answer three questions with evidence instead of opinion. The numbers below update as people use it.
    With the demo data they only show that the instrument works.
  </p>

  <p v-if="loading" class="muted">Loading…</p>
  <div v-else class="stack" style="margin-top: 22px">
    <div class="stat-grid">
      <div class="stat">
        <div class="stat-value">{{ diverged.length }} / {{ contested.length }}</div>
        <div class="label stat-label">contested needs where weighting changed the winner</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ overrides.length }} / {{ promoted.length }}</div>
        <div class="label stat-label">promotions where the lead overrode the weighted result</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ totalVoters }}</div>
        <div class="label stat-label">distinct voters</div>
      </div>
      <div class="stat">
        <div class="stat-value">{{ specAuthors }}</div>
        <div class="label stat-label">distinct spec authors</div>
      </div>
    </div>

    <section>
      <h2>Per need</h2>
      <div class="need-cards">
        <RouterLink v-for="r in rows" :key="r.bundle.need.id" :to="{ name: 'need', params: { id: r.bundle.need.id } }" class="card need-card">
          <div class="row" style="gap: 6px">
            <span class="chip chip-project">{{ r.project.name }}</span>
            <span v-if="r.bundle.specs.length >= 2 && r.a.participants && r.a.weightingChangedWinner" class="chip chip-warn">weighting changed the winner</span>
            <span v-if="r.a.leadFollowedWeighted === false" class="chip chip-warn">lead overrode</span>
            <span v-else-if="r.a.leadFollowedWeighted" class="chip chip-open">lead followed weighted</span>
          </div>
          <div style="font-weight: 600; margin: 6px 0 4px; color: var(--docs-text)">{{ r.bundle.need.title }}</div>
          <div class="small muted">{{ r.bundle.specs.length }} specs · {{ r.a.participants }} voters · raw top {{ r.rawTop }} · weighted top {{ r.weightedTop }}</div>
        </RouterLink>
      </div>
      <div class="table-scroll need-table">
        <table class="data">
          <thead>
            <tr>
              <th>Need</th><th>Project</th><th class="num">Specs</th><th class="num">Voters</th>
              <th>Raw top</th><th>Weighted top</th><th>Weighting mattered</th><th>Lead's pick</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.bundle.need.id">
              <td><RouterLink :to="{ name: 'need', params: { id: r.bundle.need.id } }">{{ r.bundle.need.title }}</RouterLink></td>
              <td>{{ r.project.name }}</td>
              <td class="num">{{ r.bundle.specs.length }}</td>
              <td class="num">{{ r.a.participants }}</td>
              <td class="mono small">{{ r.rawTop }}</td>
              <td class="mono small">{{ r.weightedTop }}</td>
              <td>
                <span v-if="r.bundle.specs.length < 2 || !r.a.participants" class="muted">n/a</span>
                <span v-else-if="r.a.weightingChangedWinner" class="chip chip-warn">yes</span>
                <span v-else class="chip">no</span>
              </td>
              <td>
                <span v-if="r.a.leadFollowedWeighted === null" class="muted">open</span>
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
      <div v-for="r in overrides" :key="r.bundle.need.id" class="card" style="margin-top: 10px">
        <RouterLink :to="{ name: 'need', params: { id: r.bundle.need.id } }"><strong>{{ r.bundle.need.title }}</strong></RouterLink>
        <div class="small muted">
          picked weighted rank {{ r.bundle.need.promotion!.weightedRankAtPromotion }}, raw rank {{ r.bundle.need.promotion!.rawRankAtPromotion }}
        </div>
        <p style="margin-bottom: 0">{{ r.bundle.need.promotion!.overrideRationale }}</p>
      </div>
    </section>

    <section>
      <h2>Who counts for how much</h2>
      <p class="muted small">
        Each member's floor weight per project, before any expertise match or builder intent on a specific need.
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
