<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Kbd from '../../frame/Kbd.vue';
import { MOD } from '../../frame/shortcuts';
import Avatar from './Avatar.vue';
import SourceChip from './SourceChip.vue';
import StatusIcon from './StatusIcon.vue';
import type { Thread } from './data';
import {
  changedWinner, day, leaderOf, myVote, person, propose, reopen, reply, settle, standing, state, talliesOf, vote, weightOf,
} from './store';

// One thread, always in the same order: the question, the positions people
// vote on, the lead's decision, then the replies. Rendered in the thread
// panel wherever the thread is opened from.
const props = defineProps<{ thread: Thread }>();

const t = computed(() => props.thread);
const stand = computed(() => standing(t.value));
const tallies = computed(() => talliesOf(t.value));
const tallyOf = (id: string) => tallies.value.find((x) => x.positionId === id)!;
const leader = computed(() => leaderOf(t.value));
const hasLeader = computed(() => !!leader.value.top && leader.value.top.weightedScore > 0);
const mine = computed(() => weightOf(t.value, 'me'));
const flipped = computed(() => changedWinner(t.value));
const rawLeader = computed(() => [...tallies.value].sort((a, b) => b.rawScore - a.rawScore)[0]);
const rawTie = computed(() => tallies.value.filter((x) => x.rawScore === rawLeader.value?.rawScore).length > 1);
const letter = (id: string) => String.fromCharCode(65 + t.value.positions.findIndex((p) => p.id === id));
const typeLabel = computed(() => ({ question: 'Question', proposal: 'Proposal', idea: 'Idea' })[t.value.type]);
// Your weight shows where you use it: on hover over the vote buttons.
const formula = computed(() =>
  `Your vote counts ${mine.value.total}: (${mine.value.base} base + ${mine.value.token} token + ${mine.value.expertise} expertise + ${mine.value.builder} builder) × ${mine.value.roleMultiplier} ${mine.value.role}. Technical calls weigh role, verified expertise and intent to build more than holdings. No wallet is linked in the demo.`,
);

// Positions ordered by weighted score, so the leader reads first; ties keep
// the order they were proposed in.
const ordered = computed(() =>
  t.value.positions.map((p, i) => ({ p, i })).sort((a, b) => tallyOf(b.p.id).weightedScore - tallyOf(a.p.id).weightedScore || a.i - b.i).map((x) => x.p),
);
const votersOf = (id: string) => t.value.votes.filter((v) => v.positionId === id && v.value === 1).map((v) => v.memberId);
const nameOf = (id?: string) => (id === 'me' ? 'You' : person(id)?.name);

// Adding a position is its own action, at the end of the positions.
const adding = ref(false);
const newPosition = ref('');
function addPosition() {
  if (!newPosition.value.trim()) return;
  propose(t.value, newPosition.value.trim());
  newPosition.value = '';
  adding.value = false;
}

// The lead's decision: one place, pick a position, say why.
const isLead = computed(() => state.role === 'lead');
const choice = ref<string>();
const note = ref('');
const chosen = computed(() => choice.value ?? (hasLeader.value ? leader.value.top!.positionId : t.value.positions[0]?.id));
const overrides = computed(() => hasLeader.value && chosen.value !== leader.value.top!.positionId);
function decide() {
  if (!chosen.value || !note.value.trim()) return;
  settle(t.value, chosen.value, note.value.trim());
  note.value = '';
  choice.value = undefined;
}

// Replies only; positions have their own control above.
const draft = ref('');
function send() {
  if (!draft.value.trim()) return;
  reply(t.value, draft.value.trim());
  draft.value = '';
}
watch(() => t.value.id, () => { adding.value = false; newPosition.value = ''; choice.value = undefined; note.value = ''; draft.value = ''; });
const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

<template>
  <article class="detail">
    <header class="head">
      <h1 class="title">{{ t.title }}</h1>
      <p class="meta">
        <span class="kind">{{ typeLabel }}</span><span class="dot">·</span>
        <template v-if="t.authorId"><Avatar :id="t.authorId" :size="16" /> {{ nameOf(t.authorId) }}<span class="dot">·</span></template>
        <span>{{ day(t.raisedAt) }}</span>
        <template v-if="t.source"><span class="dot"></span><SourceChip :source="t.source" /></template>
        <span class="dot">·</span><span class="mono ver" title="The version this thread is about">{{ t.version }}</span>
      </p>
      <p class="state" :data-status="stand.status">
        <StatusIcon :status="stand.status" :override="t.settled?.override" :size="12" />
        {{ stand.status === 'needs' ? 'Needs input' : stand.status === 'converging' ? 'Converging' : 'Decided' }}<span class="dot">·</span>{{ stand.text }}
      </p>
      <p v-if="t.body" class="body">{{ t.body }}</p>
    </header>

    <section v-if="t.settled" class="decided">
      <div class="decided-head">
        <span class="strong">Decided: {{ letter(t.settled.positionId) }}</span>
        <span class="tag mono">{{ t.settled.decision }}</span>
        <span v-if="t.settled.override" class="tag warn">Override</span>
        <span class="muted">{{ nameOf(t.settled.byId) }} as lead, {{ day(t.settled.at) }}</span>
        <button v-if="isLead" class="ghost" type="button" @click="reopen(t)">Reopen</button>
      </div>
      <p class="note">{{ t.settled.note }}</p>
    </section>

    <section class="block">
      <div class="block-head">
        <h2 class="label">Positions</h2>
      </div>

      <p v-if="!t.positions.length" class="empty">No positions yet. Add the first one.</p>

      <div class="positions">
        <div v-for="p in ordered" :key="p.id" class="pos">
          <div class="vote" role="group" :aria-label="`Vote on position ${letter(p.id)}`" :class="{ locked: !!t.settled }">
            <button class="v up" type="button" :aria-pressed="myVote(t, p.id) === 1" :disabled="!!t.settled" aria-label="Vote up" :title="formula" @click="vote(t, p.id, 1)">
              <svg viewBox="0 0 16 16"><path d="m4 10 4-4 4 4" /></svg>
            </button>
            <span class="n mono" :title="`Weighted. Raw ${fmt(tallyOf(p.id).rawScore)} from ${tallyOf(p.id).voters} ${tallyOf(p.id).voters === 1 ? 'vote' : 'votes'}`">{{ Math.round(tallyOf(p.id).weightedScore * 10) / 10 }}</span>
            <button class="v down" type="button" :aria-pressed="myVote(t, p.id) === -1" :disabled="!!t.settled" aria-label="Vote down" :title="formula" @click="vote(t, p.id, -1)">
              <svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
            </button>
          </div>
          <div class="pos-main">
            <div class="pos-top">
              <span class="letter">{{ letter(p.id) }}</span>
              <span v-if="t.settled?.positionId === p.id" class="tag ok">Decided</span>
              <span v-else-if="!t.settled && hasLeader && leader.top?.positionId === p.id" class="tag">Leading</span>
            </div>
            <p class="pos-text">{{ p.text }}</p>
            <div class="pos-meta">
              <span v-if="p.authorId" class="by"><Avatar :id="p.authorId" :size="14" /> {{ nameOf(p.authorId) }}</span>
              <span v-else class="muted">From</span>
              <template v-if="p.source"><span class="dot"></span><SourceChip :source="p.source" /></template>
              <span class="dot">·</span>
              <span class="stack" :title="votersOf(p.id).map((id) => nameOf(id)).join(', ')">
                <Avatar v-for="id in votersOf(p.id).slice(0, 4)" :key="id" :id="id" :size="14" />
              </span>
              <span class="muted">{{ tallyOf(p.id).voters }} {{ tallyOf(p.id).voters === 1 ? 'vote' : 'votes' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!t.settled" class="add">
        <button v-if="!adding" class="add-btn" type="button" @click="adding = true">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg> Add a position
        </button>
        <form v-else class="add-form" @submit.prevent="addPosition">
          <textarea v-model="newPosition" rows="2" placeholder="A concrete option people can vote for" aria-label="New position" autofocus></textarea>
          <div class="add-bar">
            <button class="ghost" type="button" @click="adding = false">Cancel</button>
            <button class="primary sm" type="submit" :disabled="!newPosition.trim()">Add position</button>
          </div>
        </form>
      </div>

      <p v-if="flipped && !t.settled" class="aside">
        <span class="pip" aria-hidden="true"></span>
        Weighting changed the leader: {{ rawTie ? 'by headcount it is level' : `by headcount ${letter(rawLeader.positionId)} is ahead` }}.
      </p>
    </section>

    <section v-if="isLead && !t.settled && t.positions.length" class="decide">
      <h2 class="label">Decide as lead</h2>
      <div class="choices" role="radiogroup" aria-label="Position to decide on">
        <button
          v-for="p in t.positions"
          :key="p.id"
          type="button"
          role="radio"
          :aria-checked="chosen === p.id"
          @click="choice = p.id"
        >{{ letter(p.id) }}</button>
      </div>
      <p class="hint-line">
        <template v-if="!hasLeader">No votes yet: this records your call without the group's signal.</template>
        <template v-else-if="overrides">This overrides the weighted leader ({{ letter(leader.top!.positionId) }}). The note is recorded with the override.</template>
        <template v-else>{{ letter(chosen!) }} is the weighted leader.</template>
      </p>
      <div class="settle-act">
        <input v-model="note" class="field" placeholder="Why (required): the decision note" aria-label="Decision note" />
        <button class="primary" type="button" :disabled="!note.trim()" @click="decide">Record decision</button>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2 class="label">Replies</h2><span class="legend">{{ t.replies.length }}</span></div>
      <div v-for="r in t.replies" :key="r.id" class="reply">
        <Avatar :id="r.authorId ?? ''" :size="20" />
        <div>
          <div class="reply-head">
            <span class="strong">{{ nameOf(r.authorId) ?? 'From' }}</span>
            <SourceChip v-if="r.source" :source="r.source" />
            <span v-else class="muted">{{ day(r.at) }}</span>
          </div>
          <p>{{ r.text }}</p>
        </div>
      </div>

      <form class="composer" @submit.prevent="send">
        <textarea
          v-model="draft"
          rows="2"
          placeholder="Reply…"
          aria-label="Reply"
          @keydown.meta.enter.prevent="send"
          @keydown.ctrl.enter.prevent="send"
        ></textarea>
        <div class="composer-bar">
          <span class="hint"><Kbd :keys="[MOD, '↵']" outline /> to send</span>
          <button class="primary" type="submit" :disabled="!draft.trim()">Reply</button>
        </div>
      </form>
    </section>
  </article>
</template>

<style scoped>
.detail { padding: 22px 32px 48px; max-width: 720px; }
.mono { font-family: var(--font-mono); }
.muted { color: var(--fg-muted); }
.strong { color: var(--fg); font-weight: 500; }
.dot { margin: 0 6px; color: var(--fg-faint); }

.back { display: none; margin: 0 0 12px -8px; }
.flip { transform: rotate(180deg); }
.eyebrow { display: flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--fg-muted); }
.eyebrow .dot { margin: 0; }
.title { margin: 0 0 8px; font-size: 18px; font-weight: 600; line-height: 1.35; letter-spacing: -0.01em; color: var(--fg); }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 0; margin: 0; font-size: var(--text-sm); color: var(--fg-muted); }
.meta .av { margin-right: 5px; }
.body { margin: 16px 0 0; color: var(--fg-2); line-height: 1.6; font-size: var(--text-nav); }

.tag {
  display: inline-flex; align-items: center; height: 18px; padding: 0 6px; border-radius: 5px;
  background: var(--slate-a3); color: var(--fg-2); font-size: var(--text-sm); font-weight: 500;
}
.ghost { padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.ghost:hover { color: var(--fg); }
.ghost.link { color: var(--indigo-11); }

.decided { margin-top: 22px; padding: 14px 0; border-top: 1px solid var(--slate-a3); border-bottom: 1px solid var(--slate-a3); }
.decided-head { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm); }
.decided-head .ghost { margin-left: auto; }
.note { margin: 8px 0 0; color: var(--fg-2); line-height: 1.55; font-size: var(--text-nav); }

.block { margin-top: 28px; }
.block-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 6px; }
.label { margin: 0; font-size: var(--text-sm); font-weight: 500; color: var(--fg-muted); }
.legend { font-size: var(--text-sm); color: var(--fg-muted); }
.legend b { color: var(--fg); font-weight: 500; }
.empty { margin: 8px 0 0; color: var(--fg-muted); }

.why { margin: 8px 0 4px; padding: 10px 12px; border-radius: 10px; background: var(--slate-a2); }
.formula { margin: 0; font-size: var(--text-sm); color: var(--fg-2); }
.formula b { color: var(--fg); }
.why-note { margin: 6px 0 0; font-size: var(--text-sm); color: var(--fg-muted); }

/* Positions: neutral rows separated by hairlines. */
.positions { margin-top: 4px; }
.pos { display: flex; gap: 16px; padding: 16px 0; }
.pos + .pos { border-top: 1px solid var(--slate-a3); }

/* Vote capsule */
.vote {
  display: flex; flex-direction: column; align-items: center; flex: none; width: 44px; padding: 3px;
  border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2);
}
.v {
  display: grid; place-items: center; width: 36px; height: 28px; padding: 0;
  border: 0; border-radius: 9px; background: none; color: var(--fg-muted); cursor: pointer;
  transition: background-color 120ms, color 120ms, transform 120ms;
}
.v svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.v:hover:not(:disabled) { background: var(--slate-a4); color: var(--fg); }
.v:active:not(:disabled) { transform: scale(0.94); }
.v.up[aria-pressed='true'] { background: var(--indigo-9); color: #fff; box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2); }
.v.down[aria-pressed='true'] { background: var(--red-9); color: #fff; box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2); }
.v:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.n { padding: 4px 0; font-size: var(--text-nav); font-weight: 600; color: var(--fg); cursor: default; }
.vote.locked { border-color: transparent; background: none; }
.vote.locked .v { display: none; }

.pos-main { flex: 1; min-width: 0; padding-top: 2px; }
.pos-top { display: flex; align-items: center; gap: 8px; }
.letter { font-size: var(--text-sm); font-weight: 600; color: var(--fg-muted); }
.pos-text { margin: 6px 0 10px; color: var(--fg); line-height: 1.55; font-size: var(--text-nav); }
.pos-meta { display: flex; flex-wrap: wrap; align-items: center; font-size: var(--text-sm); color: var(--fg-muted); }
.by { display: inline-flex; align-items: center; gap: 5px; }
.stack { display: inline-flex; margin-right: 6px; }
.stack .av + .av { margin-left: -4px; }
.settle-this { margin-left: auto; color: var(--fg-2); }

.aside { display: flex; align-items: center; gap: 8px; margin: 4px 0 0; font-size: var(--text-sm); color: var(--fg-muted); }
.pip { width: 6px; height: 6px; border-radius: 50%; background: var(--amber-9); }

.settle { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--slate-a3); }
.stats { margin: 0; font-size: var(--text-sm); color: var(--fg-muted); }
.stats b { color: var(--fg); font-weight: 500; }
.settle-act { display: flex; gap: 8px; margin-top: 12px; }
.field {
  flex: 1; min-width: 0; height: 32px; padding: 0 10px; border: 1px solid var(--slate-a4); border-radius: 9px;
  background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none;
}
.field:focus { border-color: var(--slate-a7); }
.primary {
  height: 32px; padding: 0 14px; border: 0; border-radius: 9px; background: var(--indigo-9); color: #fff;
  font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2), 0 1px 2px rgb(0 0 0 / 0.3);
  transition: background-color 120ms, opacity 120ms;
}
.primary:hover:not(:disabled) { background: var(--indigo-10); }
.primary:disabled { opacity: 0.4; cursor: default; }
.primary:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.viewas { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: var(--text-sm); }
.seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a2); }
.seg button { height: 20px; padding: 0 7px; border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; }
.seg button[aria-checked='true'] { background: var(--slate-a4); color: var(--fg); }

.reply { display: flex; gap: 10px; padding: 12px 0; }
.reply + .reply { border-top: 1px solid var(--slate-a3); }
.reply-head { display: flex; gap: 8px; align-items: baseline; font-size: var(--text-sm); }
.reply p { margin: 3px 0 0; color: var(--fg-2); line-height: 1.55; font-size: var(--text-nav); }

.composer {
  margin-top: 12px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2);
  transition: border-color 150ms;
}
.composer:focus-within { border-color: var(--slate-a7); }
.composer textarea {
  display: block; width: 100%; min-height: 64px; padding: 12px 14px 4px; border: 0; background: none; resize: vertical;
  color: var(--fg); font: inherit; font-size: var(--text-nav); line-height: 1.5; outline: none;
}
.composer textarea::placeholder { color: var(--fg-faint); }
.composer-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 8px 14px; }
.hint { display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--fg-faint); }

.zlink { color: var(--fg-2); text-decoration: none; }
.zlink:hover { color: var(--fg); text-decoration: underline; }
.check { display: inline-flex; align-items: center; gap: 5px; color: var(--fg-muted); cursor: pointer; }
.check input { accent-color: var(--indigo-9); }
.composer-actions { display: inline-flex; gap: 6px; }
.secondary {
  height: 32px; padding: 0 12px; border: 1px solid var(--slate-a5); border-radius: 9px; background: none; color: var(--fg-2);
  font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer;
}
.secondary:hover:not(:disabled) { color: var(--fg); border-color: var(--slate-a7); }
.secondary:disabled { opacity: 0.4; cursor: default; }

@media (max-width: 899px) {
  .detail { padding: 16px; }
  .back { display: inline-flex; }
}

.ver { color: var(--fg-muted); }
.state { display: flex; align-items: center; gap: 6px; margin: 10px 0 0; font-size: var(--text-sm); color: var(--fg-muted); }
.state[data-status='settled'] { color: var(--jade-11); }
.state[data-status='converging'] { color: var(--indigo-11); }
.state .dot { margin: 0; }
.tag.ok { background: var(--jade-a3); color: var(--jade-11); }
.tag.warn { background: var(--amber-a3); color: var(--amber-11); }
.add { margin-top: 10px; }
.add-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 1px dashed var(--slate-a6); border-radius: 9px;
  background: none; color: var(--fg-2); font: inherit; font-size: var(--text-base); cursor: pointer;
}
.add-btn:hover { color: var(--fg); border-color: var(--slate-a8); }
.add-btn svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.add-form { border: 1px solid var(--slate-a5); border-radius: 12px; background: var(--slate-a2); }
.add-form textarea { display: block; width: 100%; padding: 10px 12px 4px; border: 0; background: none; resize: vertical; color: var(--fg); font: inherit; font-size: var(--text-nav); outline: none; }
.add-form textarea::placeholder { color: var(--fg-faint); }
.add-bar { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 6px 8px 8px; }
.primary.sm { height: 28px; padding: 0 12px; font-size: var(--text-sm); }
.decide { margin-top: 24px; padding: 14px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2); }
.choices { display: inline-flex; gap: 4px; margin-top: 8px; }
.choices button {
  min-width: 34px; height: 28px; padding: 0 10px; border: 1px solid var(--slate-a5); border-radius: 8px; background: none;
  color: var(--fg-2); font: inherit; font-weight: 600; cursor: pointer;
}
.choices button[aria-checked='true'] { background: var(--indigo-9); border-color: var(--indigo-9); color: #fff; }
.hint-line { margin: 8px 0 0; font-size: var(--text-sm); color: var(--fg-muted); }
.kind { color: var(--fg-2); font-weight: 500; }
</style>
