<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import Markdown from '../components/Markdown.vue';
import WeightBox from '../components/WeightBox.vue';
import type { NeedBundle } from '../data/backend';
import { act, backend, memberById, projectById, state } from '../data/store';
import { analyzeNeed, roleOf } from '../lib/analyze';
import { signed, timeAgo } from '../lib/format';
import { MIN_RATIONALE_LENGTH, PromotionError, canPromote, needsRationale, promote } from '../lib/promotion';
import type { Spec } from '../lib/types';

const props = defineProps<{ id: string }>();

const bundle = ref<NeedBundle | null>(null);
const loading = ref(true);
const newSpec = ref('');
const commentDraft = reactive<Record<string, string>>({});
const showVoters = reactive<Record<string, boolean>>({});
const promoting = ref<Spec | null>(null);
const rationale = ref('');
const promoteError = ref('');
const copied = ref(false);

watch(
  [() => props.id, () => state.version],
  async () => {
    try {
      bundle.value = await backend.getBundle(props.id);
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const project = computed(() => (bundle.value ? projectById.value.get(bundle.value.need.projectId) : undefined));

const analysis = computed(() =>
  bundle.value && project.value
    ? analyzeNeed({ bundle: bundle.value, members: state.members, roles: state.roles, project: project.value })
    : null,
);

const isOpen = computed(() => bundle.value?.need.status === 'open');
const myRole = computed(() => (state.me && project.value ? roleOf(state.roles, project.value.id, state.me.id) : undefined));
const iAmLead = computed(() => canPromote(myRole.value));
const myWeight = computed(() => (state.me ? analysis.value?.weights.get(state.me.id) : undefined));
const iAmBuilder = computed(() => !!state.me && !!bundle.value?.intents.some((i) => i.memberId === state.me!.id));
const builders = computed(() => (bundle.value?.intents ?? []).map((i) => memberById.value.get(i.memberId)).filter(Boolean));

const rankedSpecs = computed(() => {
  if (!bundle.value || !analysis.value) return [];
  const byId = new Map(analysis.value.tallies.map((t) => [t.specId, t]));
  const promotedId = bundle.value.need.promotion?.specId;
  return bundle.value.specs
    .map((spec) => ({ spec, tally: byId.get(spec.id)! }))
    .sort((a, b) => {
      if (a.spec.id === promotedId) return -1;
      if (b.spec.id === promotedId) return 1;
      return b.tally.weightedScore - a.tally.weightedScore || a.spec.createdAt.localeCompare(b.spec.createdAt);
    });
});

const myVote = (specId: string) =>
  bundle.value?.votes.find((v) => v.specId === specId && v.memberId === state.me?.id)?.value ?? 0;

const votersOf = (specId: string) =>
  (bundle.value?.votes ?? [])
    .filter((v) => v.specId === specId)
    .map((v) => ({
      handle: memberById.value.get(v.memberId)?.handle ?? 'unknown',
      value: v.value,
      weight: analysis.value?.weights.get(v.memberId)?.total ?? 1,
    }))
    .sort((a, b) => b.weight - a.weight);

const commentsOf = (specId: string) => (bundle.value?.comments ?? []).filter((c) => c.specId === specId);

function vote(specId: string, value: 1 | -1) {
  const next = myVote(specId) === value ? 0 : value;
  return act(() => backend.castVote({ specId, value: next }));
}

async function submitSpec() {
  if (await act(() => backend.createSpec({ needId: props.id, body: newSpec.value }))) newSpec.value = '';
}

async function submitComment(specId: string) {
  const body = commentDraft[specId] ?? '';
  if (!body.trim()) return;
  if (await act(() => backend.addComment({ specId, body }))) commentDraft[specId] = '';
}

function toggleBuilder() {
  return act(() => backend.setBuilderIntent({ needId: props.id, on: !iAmBuilder.value }));
}

function startPromote(spec: Spec) {
  promoting.value = spec;
  rationale.value = '';
  promoteError.value = '';
}

const promotingNeedsRationale = computed(() =>
  promoting.value && analysis.value ? needsRationale(promoting.value.id, analysis.value.tallies) : false,
);

async function confirmPromote() {
  if (!promoting.value || !bundle.value || !analysis.value || !state.me) return;
  const spec = promoting.value;
  const specAuthor = memberById.value.get(spec.authorId);
  if (!specAuthor) {
    promoteError.value = 'Cannot find the author of this spec.';
    return;
  }
  try {
    const promotion = promote({
      need: bundle.value.need,
      spec,
      specAuthor,
      lead: state.me,
      leadRole: myRole.value,
      tallies: analysis.value.tallies,
      overrideRationale: rationale.value,
    });
    if (await act(() => backend.recordPromotion({ needId: props.id, promotion }))) promoting.value = null;
  } catch (e) {
    promoteError.value = e instanceof PromotionError ? e.message : String(e);
  }
}

async function copyBounty() {
  const md = bundle.value?.need.promotion?.bountyMarkdown;
  if (!md) return;
  try {
    await navigator.clipboard.writeText(md);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    state.error = 'Could not copy. Select the text and copy it by hand.';
  }
}

const issueUrl = computed(() => {
  const need = bundle.value?.need;
  if (!need?.promotion) return '';
  const q = new URLSearchParams({ title: `Bounty: ${need.title}`, body: need.promotion.bountyMarkdown });
  return `https://github.com/Arrow-air/grant-and-bounties/issues/new?${q.toString()}`;
});
</script>

<template>
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="!bundle || !analysis">
    <p>That need does not exist.</p>
    <RouterLink to="/">Back to needs</RouterLink>
  </div>

  <div v-else>
    <p class="small"><RouterLink to="/">← All needs</RouterLink></p>

    <div class="row" style="margin-bottom: 8px">
      <span class="chip chip-project">{{ project?.name }}</span>
      <span class="chip" :class="isOpen ? 'chip-open' : 'chip-bounty'">{{ isOpen ? 'open' : 'promoted to bounty' }}</span>
      <span v-for="t in bundle.need.tags" :key="t" class="chip">{{ t }}</span>
    </div>
    <h1 style="margin-bottom: 6px">{{ bundle.need.title }}</h1>
    <p class="small muted" style="margin-top: 0">
      Posted by @{{ memberById.get(bundle.need.authorId)?.handle ?? 'unknown' }}, {{ timeAgo(bundle.need.createdAt) }}
    </p>

    <div class="layout-2" style="margin-top: 20px">
      <div class="stack">
        <div class="card card-subtle"><Markdown :source="bundle.need.body" /></div>

        <!-- The experiment's headline signal for this thread -->
        <div v-if="bundle.specs.length >= 2 && analysis.participants > 0">
          <div v-if="analysis.weightingChangedWinner" class="signal signal-diverge">
            <strong>The crowd and the weighting disagree.</strong>
            One person one vote puts a different spec on top than the weighted tally does. Open “who voted” on each spec to see why.
          </div>
          <div v-else class="signal signal-agree">
            <strong>The crowd and the weighting agree</strong> on the top spec.
          </div>
        </div>

        <!-- Promotion result -->
        <div v-if="bundle.need.promotion" class="card stack">
          <div class="spread">
            <div>
              <div class="label">Promoted to bounty</div>
              <div style="margin-top: 4px">
                by @{{ memberById.get(bundle.need.promotion.byMemberId)?.handle }} · weighted rank
                <b>{{ bundle.need.promotion.weightedRankAtPromotion }}</b> · raw rank
                <b>{{ bundle.need.promotion.rawRankAtPromotion }}</b>
              </div>
            </div>
            <div class="row">
              <button class="btn btn-ghost" @click="copyBounty">{{ copied ? 'Copied' : 'Copy markdown' }}</button>
              <a class="btn" :href="issueUrl" target="_blank" rel="noopener">Open as GitHub issue</a>
            </div>
          </div>
          <div v-if="bundle.need.promotion.overrideRationale" class="signal signal-neutral">
            <span class="label">Lead's rationale for not picking the top weighted spec</span>
            <div style="margin-top: 4px">{{ bundle.need.promotion.overrideRationale }}</div>
          </div>
          <div class="bounty-md">{{ bundle.need.promotion.bountyMarkdown }}</div>
        </div>

        <h2 style="margin-bottom: 0">{{ bundle.specs.length }} {{ bundle.specs.length === 1 ? 'spec' : 'specs' }}</h2>
        <p v-if="bundle.specs.length === 0" class="muted">No specs yet. Be the first to reply.</p>

        <div>
          <article
            v-for="{ spec, tally } in rankedSpecs"
            :key="spec.id"
            class="spec"
            :class="{ 'is-promoted': bundle.need.promotion?.specId === spec.id }"
          >
            <div class="spec-votes">
              <button
                class="vote" :class="{ 'on-up': myVote(spec.id) === 1 }"
                :disabled="!state.me || !isOpen" :aria-pressed="myVote(spec.id) === 1"
                aria-label="Upvote" title="Upvote" @click="vote(spec.id, 1)"
              >▲</button>
              <div class="score-weighted" title="Weighted score">{{ signed(tally.weightedScore) }}</div>
              <div class="score-raw" title="Raw score: one person, one vote">raw {{ signed(tally.rawScore) }}</div>
              <button
                class="vote" :class="{ 'on-down': myVote(spec.id) === -1 }"
                :disabled="!state.me || !isOpen" :aria-pressed="myVote(spec.id) === -1"
                aria-label="Downvote" title="Downvote" @click="vote(spec.id, -1)"
              >▼</button>
            </div>

            <div class="spec-main">
              <div class="spec-meta">
                <strong>@{{ memberById.get(spec.authorId)?.handle ?? 'unknown' }}</strong>
                <span class="muted">{{ timeAgo(spec.createdAt) }}</span>
                <span v-if="bundle.need.promotion?.specId === spec.id" class="chip chip-bounty">promoted</span>
                <span
                  v-for="t in analysis.weights.get(spec.authorId)?.matchedTags ?? []"
                  :key="t" class="chip chip-match" title="Author's expertise matches this need"
                >{{ t }}</span>
              </div>

              <Markdown :source="spec.body" />

              <div class="spec-foot">
                <div class="spread" style="align-items: center">
                  <div class="rank-line">
                    weighted rank <b>{{ tally.weightedRank }}</b> · raw rank <b>{{ tally.rawRank }}</b> ·
                    {{ tally.voters }} {{ tally.voters === 1 ? 'voter' : 'voters' }}
                    <template v-if="tally.voters">
                      · <button class="link-btn" @click="showVoters[spec.id] = !showVoters[spec.id]">
                        {{ showVoters[spec.id] ? 'hide' : 'who voted' }}
                      </button>
                    </template>
                  </div>
                  <button v-if="iAmLead && isOpen" class="btn btn-ghost" @click="startPromote(spec)">Promote to bounty</button>
                </div>

                <div v-if="showVoters[spec.id]" class="voters">
                  <span v-for="v in votersOf(spec.id)" :key="v.handle" class="voter" :class="v.value === 1 ? 'up' : 'down'">
                    {{ v.value === 1 ? '▲' : '▼' }} @{{ v.handle }} × {{ v.weight }}
                  </span>
                </div>

                <!-- Promote panel -->
                <div v-if="promoting?.id === spec.id" class="card card-subtle stack" style="margin-top: 12px">
                  <div>
                    <strong>Promote this spec to a bounty?</strong>
                    <div class="small muted">This closes the thread to new specs and votes.</div>
                  </div>
                  <label v-if="promotingNeedsRationale" class="field-row">
                    <span class="label">This is not the top weighted spec. Why this one?</span>
                    <textarea v-model="rationale" style="min-height: 80px; font-family: inherit" />
                    <div class="hint">
                      At least {{ MIN_RATIONALE_LENGTH }} characters. Shown publicly on the bounty. You keep the final say; the community gets the reasoning.
                    </div>
                  </label>
                  <div v-if="promoteError" class="signal signal-diverge">{{ promoteError }}</div>
                  <div class="row">
                    <button class="btn" @click="confirmPromote">Promote</button>
                    <button class="btn btn-ghost" @click="promoting = null">Cancel</button>
                  </div>
                </div>

                <div class="comments">
                  <div v-for="c in commentsOf(spec.id)" :key="c.id" class="comment">
                    <div class="comment-head">@{{ memberById.get(c.authorId)?.handle ?? 'unknown' }} · {{ timeAgo(c.createdAt) }}</div>
                    <div>{{ c.body }}</div>
                  </div>
                  <form v-if="state.me" class="comment-form" @submit.prevent="submitComment(spec.id)">
                    <input v-model="commentDraft[spec.id]" type="text" placeholder="Add a comment" :aria-label="`Comment on spec by ${memberById.get(spec.authorId)?.handle}`" />
                    <button class="btn btn-ghost" type="submit" :disabled="!(commentDraft[spec.id] ?? '').trim()">Comment</button>
                  </form>
                </div>
              </div>
            </div>
          </article>
        </div>

        <!-- Reply -->
        <div v-if="isOpen" class="card stack">
          <h3 style="margin: 0">Reply with a spec</h3>
          <template v-if="state.me">
            <label class="field-row">
              <span class="label">Your spec (markdown)</span>
              <textarea v-model="newSpec" placeholder="What should it be, who does it serve, who does it leave out? A short expert hint is welcome too." />
            </label>
            <div><button class="btn" :disabled="!newSpec.trim()" @click="submitSpec">Post spec</button></div>
          </template>
          <p v-else class="muted" style="margin: 0">Sign in to reply.</p>
        </div>
      </div>

      <!-- Sidebar -->
      <aside class="side stack">
        <template v-if="state.me && myWeight">
          <WeightBox :breakdown="myWeight" />
          <div class="card">
            <label class="row" style="cursor: pointer; align-items: flex-start; flex-wrap: nowrap">
              <input type="checkbox" :checked="iAmBuilder" :disabled="!isOpen" style="margin-top: 4px" @change="toggleBuilder" />
              <span>
                <strong>I intend to build or operate this</strong>
                <span class="hint" style="display: block">
                  Adds {{ project?.weights.builderBonus }} to your weight on this need. It is public, so people can hold you to it.
                </span>
              </span>
            </label>
          </div>
        </template>
        <div v-else class="card muted small">Sign in to vote and see how your vote is weighted.</div>

        <div class="card">
          <div class="label">Declared builders</div>
          <div v-if="builders.length" class="row" style="margin-top: 6px; gap: 6px">
            <span v-for="b in builders" :key="b!.id" class="chip">@{{ b!.handle }}</span>
          </div>
          <div v-else class="muted small" style="margin-top: 4px">Nobody yet.</div>
        </div>

        <div class="card small">
          <div class="label">Reading the scores</div>
          <p style="margin: 6px 0 0">
            The big number is the <strong>weighted</strong> score. The small one is <strong>raw</strong>: one person, one vote.
            Specs sort by weighted score. <RouterLink to="/how">How weighting works</RouterLink>
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
