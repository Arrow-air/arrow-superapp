<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from '../../frame/Icon.vue';
import Kbd from '../../frame/Kbd.vue';
import { MOD } from '../../frame/shortcuts';
import Avatar from './Avatar.vue';
import StatusIcon from './StatusIcon.vue';
import type { Thread } from './data';
import type { Role } from './weights';
import {
  CONVERGE_SHARE, changedWinner, leaderOf, myVote, person, reopen, reply, settle, state, statusOf, talliesOf, vote, weightOf,
} from './store';

const props = defineProps<{ thread: Thread }>();
defineEmits<{ back: [] }>();

const t = computed(() => props.thread);
const status = computed(() => statusOf(t.value));
const tallies = computed(() => talliesOf(t.value));
const tallyOf = (id: string) => tallies.value.find((x) => x.positionId === id)!;
const leader = computed(() => leaderOf(t.value));
const maxScore = computed(() => Math.max(1, ...tallies.value.map((x) => Math.abs(x.weightedScore))));
const mine = computed(() => weightOf(t.value, 'me'));
const flipped = computed(() => changedWinner(t.value));
const rawLeader = computed(() => [...tallies.value].sort((a, b) => b.rawScore - a.rawScore)[0]);
const rawTie = computed(() => tallies.value.filter((x) => x.rawScore === rawLeader.value?.rawScore).length > 1);
const letter = (id: string) => String.fromCharCode(65 + t.value.positions.findIndex((p) => p.id === id));

// Positions ordered by weighted score, so the leader reads first.
const ordered = computed(() => [...t.value.positions].sort((a, b) => tallyOf(b.id).weightedScore - tallyOf(a.id).weightedScore));
const votersOf = (id: string) => t.value.votes.filter((v) => v.positionId === id && v.value === 1).map((v) => v.memberId);

const showWhy = ref(false);
const isLead = computed(() => state.role === 'lead');
const settleNote = ref('');
const draft = ref('');
watch(() => t.value.id, () => { showWhy.value = false; settleNote.value = ''; draft.value = ''; });

function doSettle(positionId: string) {
  settle(t.value, positionId, settleNote.value.trim() || 'Settled on the weighted leader.');
  settleNote.value = '';
}
function send() {
  if (!draft.value.trim()) return;
  reply(t.value, draft.value.trim());
  draft.value = '';
}
const roles: Role[] = ['member', 'core', 'lead'];
const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

<template>
  <article class="detail">
    <header class="head">
      <button class="tbtn back" type="button" @click="$emit('back')"><Icon name="chevron-right" :size="12" class="flip" /> Threads</button>
      <div class="eyebrow">
        <StatusIcon :status="status" :override="t.settled?.override" :size="12" />
        <span class="mono">{{ t.id }}</span>
        <span class="dot">·</span>
        <span>{{ t.kind === 'funding' ? 'Funding, token-weighted' : 'Technical, signal-weighted' }}</span>
      </div>
      <h1 class="title">{{ t.title }}</h1>
      <p class="meta">
        {{ t.system[0].toUpperCase() + t.system.slice(1) }}<span class="dot">·</span>{{ t.anchor.label }}<span class="dot">·</span><span class="mono">{{ t.version }}</span><span class="dot">·</span><Avatar :id="t.authorId" :size="16" /> {{ person(t.authorId)?.name }}, {{ t.raised }}
      </p>
      <p class="body">{{ t.body }}</p>
    </header>

    <!-- Decided: plain text, no tinted box. -->
    <section v-if="t.settled" class="decided">
      <div class="decided-head">
        <StatusIcon status="settled" :override="t.settled.override" :size="13" />
        <span class="strong">Decided: {{ letter(t.settled.positionId) }}</span>
        <span v-if="t.settled.override" class="tag">Override</span>
        <span class="muted">{{ person(t.settled.byId)?.name }}, {{ t.settled.at }}</span>
        <button v-if="isLead" class="ghost" type="button" @click="reopen(t)">Reopen</button>
      </div>
      <p class="note">{{ t.settled.note }}</p>
    </section>

    <section class="block">
      <div class="block-head">
        <h2 class="label">Positions</h2>
        <span class="legend">Your vote counts <b class="mono">{{ mine.total }}</b> <button class="ghost link" type="button" :aria-expanded="showWhy" @click="showWhy = !showWhy">{{ showWhy ? 'Hide' : 'Why' }}</button></span>
      </div>

      <div v-if="showWhy" class="why">
        <template v-if="mine.kind === 'technical'">
          <p class="formula mono">({{ mine.base }} base + {{ mine.token }} token + {{ mine.expertise }} expertise + {{ mine.builder }} builder) × {{ mine.roleMultiplier }} {{ mine.role }} = <b>{{ mine.total }}</b></p>
          <p class="why-note">Technical calls are signal-weighted: role, matching expertise{{ mine.matched.length ? ` (${mine.matched.join(', ')})` : '' }} and a declared intent to build count for more than holdings.</p>
        </template>
        <template v-else>
          <p class="formula mono">1 base + √(1,440 / 1,000) = <b>{{ mine.total }}</b></p>
          <p class="why-note">Funding calls are token-weighted on a square-root curve, a proposal from ideas/weighted-voting.md.</p>
        </template>
        <p class="why-note">Scores below are weighted; hover a score for the raw headcount.</p>
      </div>

      <p v-if="!t.positions.length" class="empty">No positions yet. Propose one below.</p>

      <div class="positions">
        <div v-for="p in ordered" :key="p.id" class="pos">
          <!-- The vote capsule: obvious, one tap, solid when it's yours. -->
          <div class="vote" role="group" :aria-label="`Vote on position ${letter(p.id)}`" :class="{ locked: !!t.settled }">
            <button class="v up" type="button" :aria-pressed="myVote(t, p.id) === 1" :disabled="!!t.settled" aria-label="Vote up" @click="vote(t, p.id, 1)">
              <svg viewBox="0 0 16 16"><path d="m4 10 4-4 4 4" /></svg>
            </button>
            <span class="n mono" :title="`Raw ${fmt(tallyOf(p.id).rawScore)} from ${tallyOf(p.id).voters} ${tallyOf(p.id).voters === 1 ? 'vote' : 'votes'}`">{{ Math.round(tallyOf(p.id).weightedScore * 10) / 10 }}</span>
            <button class="v down" type="button" :aria-pressed="myVote(t, p.id) === -1" :disabled="!!t.settled" aria-label="Vote down" @click="vote(t, p.id, -1)">
              <svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
            </button>
          </div>
          <div class="pos-main">
            <div class="pos-top">
              <span class="letter">{{ letter(p.id) }}</span>
              <span v-if="t.settled?.positionId === p.id" class="tag">Decided</span>
              <span v-else-if="!t.settled && leader.top?.positionId === p.id && tallyOf(p.id).weightedScore > 0" class="tag">Leading</span>
            </div>
            <p class="pos-text">{{ p.text }}</p>
            <div class="pos-meta">
              <span class="by"><Avatar :id="p.authorId" :size="14" /> {{ person(p.authorId)?.name }}</span>
              <span class="dot">·</span>
              <span class="stack" :title="votersOf(p.id).map((id) => person(id)?.name).join(', ')">
                <Avatar v-for="id in votersOf(p.id).slice(0, 4)" :key="id" :id="id" :size="14" />
              </span>
              <span class="muted">{{ tallyOf(p.id).voters }} {{ tallyOf(p.id).voters === 1 ? 'vote' : 'votes' }}</span>
              <button v-if="isLead && !t.settled" class="ghost settle-this" type="button" @click="doSettle(p.id)">Decide on {{ letter(p.id) }}</button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="flipped && !t.settled" class="aside">
        <span class="pip" aria-hidden="true"></span>
        Weighting changed the leader: {{ rawTie ? 'by headcount it is level' : `by headcount ${letter(rawLeader.positionId)} is ahead` }}.
      </p>
    </section>

    <!-- Decision state: a quiet line, controls only for the lead. -->
    <section v-if="!t.settled && t.positions.length" class="settle">
      <p class="stats">
        Leader holds <b class="mono">{{ Math.round(leader.share * 100) }}%</b><span class="dot">·</span>margin <b class="mono">{{ leader.margin }}</b><span class="dot">·</span>{{ t.objections ? `${t.objections} open objection${t.objections > 1 ? 's' : ''}` : 'no open objections' }}
      </p>
      <div v-if="isLead" class="settle-act">
        <input v-model="settleNote" class="field" placeholder="Decision note" />
        <button class="primary" type="button" :disabled="!leader.top || leader.top.weightedScore <= 0" @click="doSettle(leader.top!.positionId)">
          Decide on {{ leader.top ? letter(leader.top.positionId) : '—' }}
        </button>
      </div>
      <div class="viewas">
        <span class="muted">Prototype: view as</span>
        <div class="seg" role="radiogroup" aria-label="View as">
          <button v-for="r in roles" :key="r" type="button" role="radio" :aria-checked="state.role === r" @click="state.role = r">{{ r[0].toUpperCase() + r.slice(1) }}</button>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2 class="label">Discussion</h2><span class="legend">{{ t.replies.length }} {{ t.replies.length === 1 ? 'reply' : 'replies' }}</span></div>
      <div v-for="r in t.replies" :key="r.id" class="reply">
        <Avatar :id="r.authorId" :size="20" />
        <div>
          <div class="reply-head"><span class="strong">{{ person(r.authorId)?.name }}</span><span class="muted">{{ r.at }}</span></div>
          <p>{{ r.text }}</p>
        </div>
      </div>

      <!-- Composer: a real text area with a clear primary action. -->
      <form class="composer" @submit.prevent="send">
        <textarea
          v-model="draft"
          rows="2"
          placeholder="Write a reply, or propose a position…"
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
.title { margin: 10px 0 8px; font-size: 18px; font-weight: 600; line-height: 1.35; letter-spacing: -0.01em; color: var(--fg); }
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

/* Each reply sits on a faint card so consecutive replies read as separate. */
.reply { display: flex; gap: 10px; padding: 12px 14px; border-radius: var(--radius-lg); background: var(--slate-a2); }
.reply + .reply { margin-top: 6px; }
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

@media (max-width: 899px) {
  .detail { padding: 16px; }
  .back { display: inline-flex; }
}
</style>
