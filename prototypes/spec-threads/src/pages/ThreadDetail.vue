<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import DiscussPin from '../components/DiscussPin.vue';
import Markdown from '../components/Markdown.vue';
import PickComparison, { type Pick } from '../components/PickComparison.vue';
import ResolvePanel from '../components/ResolvePanel.vue';
import VoteBar, { type VoterSlice } from '../components/VoteBar.vue';
import WeightBox from '../components/WeightBox.vue';
import type { ThreadBundle } from '../data/backend';
import { act, backend, handleOf, memberById, myRoleOn, projectById, state, versionOf } from '../data/store';
import { analyzeThread } from '../lib/analyze';
import { positionTitle, signed, timeAgo } from '../lib/format';
import { RESOLUTION_LABEL, VERSION_STATE_LABEL, threadStatusChip, threadStatusLabel } from '../lib/labels';
import { canResolve } from '../lib/resolution';

const props = defineProps<{ id: string }>();

const bundle = ref<ThreadBundle | null>(null);
const loading = ref(true);
const newPosition = ref('');
const commentDraft = reactive<Record<string, string>>({});
const showVoters = reactive<Record<string, boolean>>({});
const flashPosition = ref('');

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

const project = computed(() => (bundle.value ? projectById.value.get(bundle.value.thread.projectId) : undefined));
const version = computed(() => (bundle.value ? versionOf(bundle.value.thread.projectId, bundle.value.thread.versionId) : undefined));

const analysis = computed(() =>
  bundle.value && project.value
    ? analyzeThread({ bundle: bundle.value, members: state.members, roles: state.roles, project: project.value })
    : null,
);

const isOpen = computed(() => bundle.value?.thread.status === 'open');
const resolution = computed(() => bundle.value?.thread.resolution);
const chosenId = computed(() => (resolution.value && resolution.value.kind !== 'reject' ? resolution.value.positionId : undefined));
const myRole = computed(() => (project.value ? myRoleOn(project.value.id) : undefined));
const iAmLead = computed(() => canResolve(myRole.value));
const myWeight = computed(() => (state.me ? analysis.value?.weights.get(state.me.id) : undefined));
const iAmBuilder = computed(() => !!state.me && !!bundle.value?.intents.some((i) => i.memberId === state.me!.id));
const builders = computed(() => (bundle.value?.intents ?? []).map((i) => memberById.value.get(i.memberId)).filter(Boolean));

const rankedPositions = computed(() => {
  if (!bundle.value || !analysis.value) return [];
  const byId = new Map(analysis.value.tallies.map((t) => [t.positionId, t]));
  return bundle.value.positions
    .map((position) => ({ position, tally: byId.get(position.id)! }))
    .sort((a, b) => {
      if (a.position.id === chosenId.value) return -1;
      if (b.position.id === chosenId.value) return 1;
      return b.tally.weightedScore - a.tally.weightedScore || a.position.createdAt.localeCompare(b.position.createdAt);
    });
});

const myVote = (positionId: string) =>
  bundle.value?.votes.find((v) => v.positionId === positionId && v.memberId === state.me?.id)?.value ?? 0;

const votersOf = (positionId: string): VoterSlice[] =>
  (bundle.value?.votes ?? [])
    .filter((v) => v.positionId === positionId)
    .map((v) => {
      const w = analysis.value?.weights.get(v.memberId);
      return {
        handle: handleOf(v.memberId),
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
  rankedPositions.value
    .filter(({ tally }) => tally[rank] === 1 && tally.voters > 0)
    .map(({ position, tally }) => ({
      positionId: position.id,
      title: positionTitle(position.body),
      author: handleOf(position.authorId),
      score: tally[score],
    }));
const rawPicks = computed(() => picksBy('rawRank', 'rawScore'));
const weightedPicks = computed(() => picksBy('weightedRank', 'weightedScore'));

// Everyone with a stake in this thread (voted, declared, wrote a position) plus you, by weight.
const stakeholders = computed(() => {
  if (!bundle.value || !analysis.value) return [];
  const ids = new Set<string>([
    ...bundle.value.votes.map((v) => v.memberId),
    ...bundle.value.intents.map((i) => i.memberId),
    ...bundle.value.positions.map((sp) => sp.authorId),
  ]);
  if (state.me) ids.add(state.me.id);
  return [...ids]
    .map((id) => ({ id, handle: handleOf(id), w: analysis.value!.weights.get(id) }))
    .filter((x) => x.w)
    .sort((a, b) => b.w!.total - a.w!.total);
});
const maxStake = computed(() => Math.max(1, ...stakeholders.value.map((x) => x.w!.total)));

async function jumpTo(positionId: string) {
  await nextTick();
  const el = document.getElementById(`position-${positionId}`);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  flashPosition.value = positionId;
  setTimeout(() => flashPosition.value === positionId && (flashPosition.value = ''), 1600);
}

const commentsOf = (positionId: string) => (bundle.value?.comments ?? []).filter((c) => c.positionId === positionId);

function vote(positionId: string, value: 1 | -1) {
  const next = myVote(positionId) === value ? 0 : value;
  return act(() => backend.castVote({ positionId, value: next }));
}

async function submitPosition() {
  let createdId = '';
  const ok = await act(async () => {
    createdId = (await backend.createPosition({ threadId: props.id, body: newPosition.value })).id;
  });
  if (!ok) return;
  newPosition.value = '';
  // A new position has no votes, so it sorts to the bottom. Take the author to it.
  setTimeout(() => jumpTo(createdId), 60);
}

async function submitComment(positionId: string) {
  const body = commentDraft[positionId] ?? '';
  if (!body.trim()) return;
  if (await act(() => backend.addComment({ positionId, body }))) commentDraft[positionId] = '';
}

function toggleBuilder() {
  return act(() => backend.setBuilderIntent({ threadId: props.id, on: !iAmBuilder.value }));
}

const voteHint = (dir: 'Upvote' | 'Downvote') =>
  !state.me ? 'Sign in to vote' : !isOpen.value ? 'Voting is closed' : `${dir} · your vote counts ${myWeight.value?.total ?? 1}`;
</script>

<template>
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="!bundle || !analysis || !project">
    <p>That thread does not exist.</p>
    <RouterLink to="/threads">Back to threads</RouterLink>
  </div>

  <div v-else>
    <div class="spread" style="align-items: center">
      <p class="small" style="margin: 0">
        <RouterLink :to="{ name: 'project', params: { id: project.id } }">← {{ project.name }}</RouterLink>
        <span class="muted"> · </span>
        <RouterLink to="/threads">All threads</RouterLink>
      </p>
      <DiscussPin anchor="where-discussion-lives" label="Should this live next to the CAD?" />
    </div>

    <div class="row" style="margin: 10px 0 8px">
      <span class="chip chip-project">{{ project.name }}</span>
      <span class="chip chip-version" :title="version ? VERSION_STATE_LABEL[version.state] : ''">{{ version?.name ?? '?' }} · {{ version ? VERSION_STATE_LABEL[version.state] : '' }}</span>
      <span v-if="bundle.thread.system" class="chip chip-system">{{ bundle.thread.system }}</span>
      <span class="chip" :class="threadStatusChip(bundle.thread)">{{ threadStatusLabel(bundle.thread) }}</span>
      <span v-for="t in bundle.thread.tags" :key="t" class="chip">{{ t }}</span>
    </div>
    <h1 style="margin-bottom: 6px">{{ bundle.thread.title }}</h1>
    <p class="small muted" style="margin-top: 0">
      Posted by @{{ handleOf(bundle.thread.authorId) }}, {{ timeAgo(bundle.thread.createdAt) }}
      <template v-if="version?.state === 'discussing'"> · addressed to {{ version.name }}, the version in discussion<template v-if="version.freezeTarget">; freeze target {{ version.freezeTarget }}</template></template>
    </p>

    <div v-if="bundle.thread.deferrals.length" class="signal signal-neutral deferrals">
      <span class="label">Deferred</span>
      <div v-for="d in bundle.thread.deferrals" :key="d.at" style="margin-top: 4px">
        {{ versionOf(bundle.thread.projectId, d.fromVersionId)?.name }} → {{ versionOf(bundle.thread.projectId, d.toVersionId)?.name }}
        by @{{ handleOf(d.byMemberId) }}, {{ d.at.slice(0, 10) }}<template v-if="d.note">: {{ d.note }}</template>
      </div>
    </div>

    <div class="layout-2" style="margin-top: 20px">
      <div class="stack">
        <div class="card card-subtle"><Markdown :source="bundle.thread.body" /></div>

        <!-- Resolution -->
        <div v-if="resolution" class="card stack resolution" :class="`resolution-${resolution.kind}`">
          <div class="spread">
            <div>
              <div class="label">{{ RESOLUTION_LABEL[resolution.kind] }} <DiscussPin v-if="resolution.kind === 'grant'" anchor="bounty" class="pin-inline" /></div>
              <div style="margin-top: 4px">
                by @{{ handleOf(resolution.byMemberId) }}, {{ resolution.at.slice(0, 10) }}
                <template v-if="resolution.kind !== 'reject'">
                  · weighted rank <b>{{ resolution.weightedRankAtResolution }}</b> · raw rank <b>{{ resolution.rawRankAtResolution }}</b>
                </template>
              </div>
            </div>
            <div class="row">
              <RouterLink v-if="resolution.kind === 'spec'" to="/register" class="btn btn-ghost">See it in the register</RouterLink>
              <RouterLink v-if="resolution.kind === 'grant'" :to="{ name: 'grant', params: { id: resolution.grantId } }" class="btn">Open the grant draft</RouterLink>
            </div>
          </div>
          <div v-if="resolution.kind === 'reject'" class="signal signal-neutral">
            <span class="label">Why</span>
            <div style="margin-top: 4px">{{ resolution.note }}</div>
          </div>
          <div v-else-if="resolution.overrideRationale" class="signal signal-neutral">
            <span class="label">Lead's rationale for not picking the top weighted position</span>
            <div style="margin-top: 4px">{{ resolution.overrideRationale }}</div>
          </div>
        </div>

        <!-- The experiment's headline for this thread: the two winners, side by side -->
        <PickComparison
          v-if="bundle.positions.length >= 2 && analysis.participants > 0 && rawPicks.length && weightedPicks.length"
          :raw-picks="rawPicks" :weighted-picks="weightedPicks" :disagree="analysis.weightingChangedWinner"
          @jump="jumpTo"
        />

        <!-- Lead: resolve -->
        <div v-if="iAmLead && isOpen" class="card stack lead-card">
          <div>
            <DiscussPin anchor="lead-override" class="pin-right" />
            <strong>You are the lead. Resolve this thread?</strong>
            <div class="small muted">
              No rush: you can read and vote until the {{ version?.name }} freeze. At the freeze every open thread has to end one of these four ways.
              <RouterLink v-if="version" :to="{ name: 'freeze', params: { projectId: project.id, versionId: version.id } }">Go to the freeze screen.</RouterLink>
            </div>
          </div>
          <ResolvePanel :bundle="bundle" :analysis="analysis" :project="project" />
        </div>

        <h2 style="margin-bottom: 0">{{ bundle.positions.length }} {{ bundle.positions.length === 1 ? 'position' : 'positions' }}</h2>
        <p v-if="bundle.positions.length === 0" class="muted">No positions yet. Be the first to reply.</p>

        <TransitionGroup name="rank" tag="div" class="position-list">
          <article
            v-for="{ position, tally } in rankedPositions"
            :id="`position-${position.id}`"
            :key="position.id"
            class="position"
            :class="{ 'is-promoted': chosenId === position.id, 'is-flash': flashPosition === position.id }"
          >
            <div class="position-votes">
              <button
                class="vote" :class="{ 'on-up': myVote(position.id) === 1 }"
                :disabled="!state.me || !isOpen" :aria-pressed="myVote(position.id) === 1"
                aria-label="Upvote" :title="voteHint('Upvote')" @click="vote(position.id, 1)"
              >▲</button>
              <div class="score-weighted" title="Weighted score">{{ signed(tally.weightedScore) }}</div>
              <div class="score-raw" title="Raw score: one person, one vote">raw {{ signed(tally.rawScore) }}</div>
              <button
                class="vote" :class="{ 'on-down': myVote(position.id) === -1 }"
                :disabled="!state.me || !isOpen" :aria-pressed="myVote(position.id) === -1"
                aria-label="Downvote" :title="voteHint('Downvote')" @click="vote(position.id, -1)"
              >▼</button>
            </div>

            <div class="position-main">
              <div class="position-meta">
                <strong>@{{ handleOf(position.authorId) }}</strong>
                <span class="muted">{{ timeAgo(position.createdAt) }}</span>
                <span v-if="chosenId === position.id" class="chip chip-bounty">chosen</span>
                <span
                  v-for="t in analysis.weights.get(position.authorId)?.matchedTags ?? []"
                  :key="t" class="chip chip-match" title="Author's expertise matches this thread"
                >{{ t }}</span>
              </div>

              <Markdown :source="position.body" />

              <div class="position-foot">
                <div v-if="tally.voters" class="rank-block">
                  <VoteBar :voters="votersOf(position.id)" :scale-up="barScaleUp" :scale-down="barScaleDown" />
                  <div class="rank-line">
                    weighted rank <b>{{ tally.weightedRank }}</b> · raw rank <b>{{ tally.rawRank }}</b> ·
                    <button class="link-btn" :aria-expanded="!!showVoters[position.id]" @click="showVoters[position.id] = !showVoters[position.id]">
                      {{ tally.voters }} {{ tally.voters === 1 ? 'voter' : 'voters' }} {{ showVoters[position.id] ? '▴' : '▾' }}
                    </button>
                  </div>
                </div>
                <div v-else class="rank-line">No votes yet</div>

                <div v-if="showVoters[position.id]" class="voters">
                  <span v-for="v in votersOf(position.id)" :key="v.handle" class="voter" :class="v.value === 1 ? 'up' : 'down'">
                    {{ v.value === 1 ? '▲' : '▼' }} @{{ v.handle }} <span class="voter-role">{{ v.role }}</span> {{ v.weight }}
                  </span>
                </div>

                <div class="comments">
                  <div v-for="c in commentsOf(position.id)" :key="c.id" class="comment">
                    <div class="comment-head">@{{ handleOf(c.authorId) }} · {{ timeAgo(c.createdAt) }}</div>
                    <div>{{ c.body }}</div>
                  </div>
                  <form v-if="state.me && isOpen" class="comment-form" @submit.prevent="submitComment(position.id)">
                    <input v-model="commentDraft[position.id]" type="text" placeholder="Add a comment" :aria-label="`Comment on position by ${handleOf(position.authorId)}`" />
                    <button class="btn btn-ghost" type="submit" :disabled="!(commentDraft[position.id] ?? '').trim()">Comment</button>
                  </form>
                </div>
              </div>
            </div>
          </article>
        </TransitionGroup>

        <!-- Reply -->
        <div v-if="isOpen" class="card stack">
          <h3 style="margin: 0">Reply with a position</h3>
          <template v-if="state.me">
            <label class="field-row">
              <span class="label">Your position (markdown)</span>
              <textarea v-model="newPosition" placeholder="What should it be, who does it serve, who does it leave out? A short expert hint is welcome too." />
            </label>
            <div><button class="btn" :disabled="!newPosition.trim()" @click="submitPosition">Post position</button></div>
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
                  Adds {{ project?.weights.builderBonus }} to your weight on this thread. It is public, so people can hold you to it.
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
          <div class="hint">Everyone who voted, wrote a position, or declared intent. Hover a number for its breakdown.</div>
        </div>

        <div class="card small">
          <div class="label">Reading the scores</div>
          <p style="margin: 6px 0 0">
            The big number is the <strong>weighted</strong> score. The small one is <strong>raw</strong>: one person, one vote.
            Positions sort by weighted score. Each bar shows who is behind it: one block per voter, sized by their weight, for on the right and against on the left.
            <RouterLink to="/how">How it works</RouterLink>
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
