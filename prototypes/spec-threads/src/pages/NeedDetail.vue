<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import DiscussPin from '../components/DiscussPin.vue';
import Markdown from '../components/Markdown.vue';
import PickComparison, { type Pick } from '../components/PickComparison.vue';
import VoteBar, { type VoterSlice } from '../components/VoteBar.vue';
import WeightBox from '../components/WeightBox.vue';
import type { NeedBundle } from '../data/backend';
import { act, backend, memberById, projectById, state } from '../data/store';
import { analyzeNeed, roleOf } from '../lib/analyze';
import { signed, specTitle, timeAgo } from '../lib/format';
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
const flashSpec = ref('');

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

const votersOf = (specId: string): VoterSlice[] =>
  (bundle.value?.votes ?? [])
    .filter((v) => v.specId === specId)
    .map((v) => {
      const w = analysis.value?.weights.get(v.memberId);
      return {
        handle: memberById.value.get(v.memberId)?.handle ?? 'unknown',
        value: v.value,
        weight: w?.total ?? 1,
        role: w?.role ?? 'member',
        isMe: v.memberId === state.me?.id,
      };
    })
    .sort((a, b) => b.weight - a.weight);

// One shared scale for every vote bar in the thread, so bars compare by eye.
const barScaleUp = computed(() => Math.max(0, ...(analysis.value?.tallies ?? []).map((t) => t.weightedUp)));
const barScaleDown = computed(() => Math.max(0, ...(analysis.value?.tallies ?? []).map((t) => t.weightedDown)));

const picksBy = (rank: 'rawRank' | 'weightedRank', score: 'rawScore' | 'weightedScore'): Pick[] =>
  rankedSpecs.value
    .filter(({ tally }) => tally[rank] === 1 && tally.voters > 0)
    .map(({ spec, tally }) => ({
      specId: spec.id,
      title: specTitle(spec.body),
      author: memberById.value.get(spec.authorId)?.handle ?? 'unknown',
      score: tally[score],
    }));
const rawPicks = computed(() => picksBy('rawRank', 'rawScore'));
const weightedPicks = computed(() => picksBy('weightedRank', 'weightedScore'));

// Everyone with a stake in this thread (voted, declared, wrote a spec) plus you, by weight.
const stakeholders = computed(() => {
  if (!bundle.value || !analysis.value) return [];
  const ids = new Set<string>([
    ...bundle.value.votes.map((v) => v.memberId),
    ...bundle.value.intents.map((i) => i.memberId),
    ...bundle.value.specs.map((sp) => sp.authorId),
  ]);
  if (state.me) ids.add(state.me.id);
  return [...ids]
    .map((id) => ({ id, handle: memberById.value.get(id)?.handle ?? 'unknown', w: analysis.value!.weights.get(id) }))
    .filter((x) => x.w)
    .sort((a, b) => b.w!.total - a.w!.total);
});
const maxStake = computed(() => Math.max(1, ...stakeholders.value.map((x) => x.w!.total)));

async function jumpTo(specId: string) {
  await nextTick();
  const el = document.getElementById(`spec-${specId}`);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  flashSpec.value = specId;
  setTimeout(() => flashSpec.value === specId && (flashSpec.value = ''), 1600);
}

const commentsOf = (specId: string) => (bundle.value?.comments ?? []).filter((c) => c.specId === specId);

function vote(specId: string, value: 1 | -1) {
  const next = myVote(specId) === value ? 0 : value;
  return act(() => backend.castVote({ specId, value: next }));
}

async function submitSpec() {
  let createdId = '';
  const ok = await act(async () => {
    createdId = (await backend.createSpec({ needId: props.id, body: newSpec.value })).id;
  });
  if (!ok) return;
  newSpec.value = '';
  // A new spec has no votes, so it sorts to the bottom. Take the author to it.
  setTimeout(() => jumpTo(createdId), 60);
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
const rationaleLength = computed(() => rationale.value.trim().length);
const canConfirmPromote = computed(() => !promotingNeedsRationale.value || rationaleLength.value >= MIN_RATIONALE_LENGTH);
const voteHint = (dir: 'Upvote' | 'Downvote') =>
  !state.me ? 'Sign in to vote' : !isOpen.value ? 'Voting is closed' : `${dir} · your vote counts ${myWeight.value?.total ?? 1}`;

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
    <div class="spread" style="align-items: center">
      <p class="small" style="margin: 0"><RouterLink to="/">← All needs</RouterLink></p>
      <DiscussPin anchor="where-discussion-lives" label="Should this live next to the CAD?" />
    </div>

    <div class="row" style="margin: 10px 0 8px">
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

        <!-- The experiment's headline for this thread: the two winners, side by side -->
        <PickComparison
          v-if="bundle.specs.length >= 2 && analysis.participants > 0 && rawPicks.length && weightedPicks.length"
          :raw-picks="rawPicks" :weighted-picks="weightedPicks" :disagree="analysis.weightingChangedWinner"
          @jump="jumpTo"
        />

        <!-- Promotion result -->
        <div v-if="bundle.need.promotion" class="card stack">
          <div class="spread">
            <div>
              <div class="label">Promoted to bounty <DiscussPin anchor="bounty" class="pin-inline" /></div>
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

        <TransitionGroup name="rank" tag="div" class="spec-list">
          <article
            v-for="{ spec, tally } in rankedSpecs"
            :id="`spec-${spec.id}`"
            :key="spec.id"
            class="spec"
            :class="{ 'is-promoted': bundle.need.promotion?.specId === spec.id, 'is-flash': flashSpec === spec.id }"
          >
            <div class="spec-votes">
              <button
                class="vote" :class="{ 'on-up': myVote(spec.id) === 1 }"
                :disabled="!state.me || !isOpen" :aria-pressed="myVote(spec.id) === 1"
                aria-label="Upvote" :title="voteHint('Upvote')" @click="vote(spec.id, 1)"
              >▲</button>
              <div class="score-weighted" title="Weighted score">{{ signed(tally.weightedScore) }}</div>
              <div class="score-raw" title="Raw score: one person, one vote">raw {{ signed(tally.rawScore) }}</div>
              <button
                class="vote" :class="{ 'on-down': myVote(spec.id) === -1 }"
                :disabled="!state.me || !isOpen" :aria-pressed="myVote(spec.id) === -1"
                aria-label="Downvote" :title="voteHint('Downvote')" @click="vote(spec.id, -1)"
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
                  <div v-if="tally.voters" class="rank-block">
                    <VoteBar :voters="votersOf(spec.id)" :scale-up="barScaleUp" :scale-down="barScaleDown" />
                    <div class="rank-line">
                      weighted rank <b>{{ tally.weightedRank }}</b> · raw rank <b>{{ tally.rawRank }}</b> ·
                      <button class="link-btn" :aria-expanded="!!showVoters[spec.id]" @click="showVoters[spec.id] = !showVoters[spec.id]">
                        {{ tally.voters }} {{ tally.voters === 1 ? 'voter' : 'voters' }} {{ showVoters[spec.id] ? '▴' : '▾' }}
                      </button>
                    </div>
                  </div>
                  <div v-else class="rank-line">No votes yet</div>
                  <button v-if="iAmLead && isOpen" class="btn btn-ghost" @click="startPromote(spec)">Promote to bounty</button>
                </div>

                <div v-if="showVoters[spec.id]" class="voters">
                  <span v-for="v in votersOf(spec.id)" :key="v.handle" class="voter" :class="v.value === 1 ? 'up' : 'down'">
                    {{ v.value === 1 ? '▲' : '▼' }} @{{ v.handle }} <span class="voter-role">{{ v.role }}</span> {{ v.weight }}
                  </span>
                </div>

                <!-- Promote panel -->
                <div v-if="promoting?.id === spec.id" class="card card-subtle stack" style="margin-top: 12px">
                  <div>
                    <DiscussPin anchor="lead-override" class="pin-right" />
                    <strong>Promote this spec to a bounty?</strong>
                    <div class="small muted">This closes the thread to new specs and votes.</div>
                  </div>
                  <label v-if="promotingNeedsRationale" class="field-row">
                    <span class="label">This is not the top weighted spec. Why this one?</span>
                    <textarea v-model="rationale" style="min-height: 80px; font-family: inherit" />
                    <div class="hint spread" style="flex-wrap: nowrap">
                      <span>Shown publicly on the bounty. You keep the final say; the community gets the reasoning.</span>
                      <span class="mono" :style="{ color: canConfirmPromote ? 'var(--status-success-text)' : undefined }" aria-live="polite">
                        {{ rationaleLength }} / {{ MIN_RATIONALE_LENGTH }}
                      </span>
                    </div>
                  </label>
                  <div v-else class="small" style="color: var(--status-success-text)">This is the top weighted spec. No rationale needed.</div>
                  <div v-if="promoteError" class="signal signal-diverge">{{ promoteError }}</div>
                  <div class="row">
                    <button class="btn" :disabled="!canConfirmPromote" @click="confirmPromote">Promote</button>
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
        </TransitionGroup>

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
          <WeightBox :breakdown="myWeight" pin="formula" />
          <div class="card">
            <label class="row" style="cursor: pointer; align-items: flex-start; flex-wrap: nowrap">
              <input type="checkbox" :checked="iAmBuilder" :disabled="!isOpen" style="margin-top: 4px" @change="toggleBuilder" />
              <span>
                <strong>I intend to build or operate this</strong>
                <DiscussPin anchor="builder-intent" class="pin-inline" compact />
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

        <div v-if="stakeholders.length" class="card">
          <div class="spread" style="align-items: center; flex-wrap: nowrap">
            <div class="label">Who counts for how much here</div>
            <DiscussPin anchor="role-multiplier" compact />
          </div>
          <ul class="stake-list">
            <li v-for="x in stakeholders" :key="x.id" :class="{ 'stake-me': x.id === state.me?.id }">
              <span class="stake-name">@{{ x.handle }}<span v-if="x.id === state.me?.id" class="muted"> (you)</span></span>
              <span class="stake-bar"><span :style="{ width: (x.w!.total / maxStake) * 100 + '%' }" /></span>
              <span class="stake-num mono" :title="`(${x.w!.base} base + ${x.w!.token} tokens + ${x.w!.expertise} expertise + ${x.w!.builder} builder) × ${x.w!.roleMultiplier} ${x.w!.role}`">{{ x.w!.total }}</span>
            </li>
          </ul>
          <div class="hint">Everyone who voted, wrote a spec, or declared intent. Hover a number for its breakdown.</div>
        </div>

        <div class="card small">
          <div class="label">Reading the scores</div>
          <p style="margin: 6px 0 0">
            The big number is the <strong>weighted</strong> score. The small one is <strong>raw</strong>: one person, one vote.
            Specs sort by weighted score. Each bar shows who is behind it: one block per voter, sized by their weight, for on the right and against on the left.
            <RouterLink to="/how">How weighting works</RouterLink>
          </p>
        </div>
      </aside>
    </div>

    <!-- On narrow screens the sidebar drops below the thread, so keep your weight in view while voting. -->
    <div v-if="state.me && myWeight && isOpen" class="mobile-weight">
      <span>Your vote counts <b class="mono">{{ myWeight.total }}</b></span>
      <span class="muted">{{ myWeight.role }}<template v-if="iAmBuilder"> · builder</template><template v-if="myWeight.matchedTags.length"> · expert</template></span>
    </div>
  </div>
</template>
