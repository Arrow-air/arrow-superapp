<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from '../../frame/Icon.vue';
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
      <div class="meta-top">
        <StatusIcon :status="status" :override="t.settled?.override" />
        <span class="mono">{{ t.id }}</span>
        <span class="kind" :class="t.kind">{{ t.kind === 'funding' ? 'Funding · token-weighted' : 'Technical · signal-weighted' }}</span>
      </div>
      <h1 class="title">{{ t.title }}</h1>
      <div class="chips">
        <span class="chip">{{ t.system[0].toUpperCase() + t.system.slice(1) }}</span>
        <span class="chip"><Icon :name="t.anchor.kind === 'model' ? 'box' : 'megaphone'" :size="11" /> {{ t.anchor.label }}</span>
        <span class="chip mono">{{ t.version }}</span>
        <span class="by"><Avatar :id="t.authorId" :size="16" /> {{ person(t.authorId)?.name }} · raised {{ t.raised }}</span>
      </div>
      <p class="body">{{ t.body }}</p>
    </header>

    <!-- Decided -->
    <section v-if="t.settled" class="decided" :class="{ override: t.settled.override }">
      <div class="decided-head">
        <StatusIcon status="settled" :override="t.settled.override" />
        <strong>{{ t.settled.override ? 'Settled against the vote' : 'Settled' }}</strong>
        <span class="muted">by {{ person(t.settled.byId)?.name }} · {{ t.settled.at }}</span>
        <button v-if="isLead" class="tbtn small" type="button" @click="reopen(t)">Reopen</button>
      </div>
      <p>Position {{ letter(t.settled.positionId) }}: {{ t.positions.find((p) => p.id === t.settled!.positionId)?.text }}</p>
      <p class="note">“{{ t.settled.note }}”</p>
      <p v-if="t.settled.override" class="override-note">Recorded as an override. A falling override rate means coordination is working.</p>
    </section>

    <!-- Positions -->
    <section class="block">
      <div class="block-head">
        <h2 class="label">Positions</h2>
        <span class="legend">weighted <span class="dot-sep">·</span> raw</span>
      </div>

      <p v-if="!t.positions.length" class="empty">No positions yet. Propose one below to get this moving.</p>

      <div
        v-for="p in ordered"
        :key="p.id"
        class="pos"
        :class="{ lead: leader.top?.positionId === p.id && tallyOf(p.id).weightedScore > 0, chosen: t.settled?.positionId === p.id }"
      >
        <div class="voter" role="group" :aria-label="`Vote on position ${letter(p.id)}`">
          <button class="vbtn up" type="button" :aria-pressed="myVote(t, p.id) === 1" :disabled="!!t.settled" aria-label="Vote up" @click="vote(t, p.id, 1)">
            <svg viewBox="0 0 16 16"><path d="m4 10 4-4 4 4" /></svg>
          </button>
          <span class="score mono">{{ tallyOf(p.id).weightedScore }}</span>
          <button class="vbtn down" type="button" :aria-pressed="myVote(t, p.id) === -1" :disabled="!!t.settled" aria-label="Vote down" @click="vote(t, p.id, -1)">
            <svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
          </button>
        </div>
        <div class="pos-main">
          <p class="pos-text"><span class="letter">{{ letter(p.id) }}</span>{{ p.text }}</p>
          <div class="pos-meta">
            <span class="by"><Avatar :id="p.authorId" :size="14" /> {{ person(p.authorId)?.name }}</span>
            <span class="bar" aria-hidden="true"><span :style="{ width: `${Math.max(0, tallyOf(p.id).weightedScore) / maxScore * 100}%` }"></span></span>
            <span class="mono nums">{{ fmt(tallyOf(p.id).weightedScore) }} <span class="raw">raw {{ fmt(tallyOf(p.id).rawScore) }}</span></span>
            <span class="stack">
              <Avatar v-for="id in votersOf(p.id).slice(0, 4)" :key="id" :id="id" :size="16" />
              <span v-if="votersOf(p.id).length > 4" class="more">+{{ votersOf(p.id).length - 4 }}</span>
            </span>
            <button
              v-if="isLead && !t.settled"
              class="tbtn small settle-this"
              type="button"
              @click="doSettle(p.id)"
            >Settle on {{ letter(p.id) }}</button>
          </div>
        </div>
      </div>

      <!-- Weighting changed the leader: the experiment's headline signal. -->
      <p v-if="flipped && !t.settled" class="flag">
        <Icon name="alert" :size="12" />
        Weighting changed the leader. By headcount {{ letter(rawLeader.positionId) }} is ahead; weighted, {{ letter(leader.top!.positionId) }} is.
      </p>

      <!-- Your weight, explained with the formula's actual terms. -->
      <div class="yours">
        <span>Your vote counts <strong class="mono">{{ mine.total }}</strong> here</span>
        <button class="linkish" type="button" :aria-expanded="showWhy" @click="showWhy = !showWhy">{{ showWhy ? 'Hide' : 'Why?' }}</button>
      </div>
      <div v-if="showWhy" class="why">
        <template v-if="mine.kind === 'technical'">
          <span class="term">(</span>
          <span class="term"><b>{{ mine.base }}</b> base</span><span class="op">+</span>
          <span class="term" :class="{ zero: !mine.token }"><b>{{ mine.token }}</b> token</span><span class="op">+</span>
          <span class="term" :class="{ zero: !mine.expertise }"><b>{{ mine.expertise }}</b> expertise{{ mine.matched.length ? ` (${mine.matched.join(', ')})` : '' }}</span><span class="op">+</span>
          <span class="term" :class="{ zero: !mine.builder }"><b>{{ mine.builder }}</b> builder</span>
          <span class="term">)</span><span class="op">×</span>
          <span class="term"><b>{{ mine.roleMultiplier }}</b> {{ mine.role }}</span><span class="op">=</span>
          <span class="term total"><b>{{ mine.total }}</b></span>
          <p class="why-note">Technical calls are signal-weighted: role, matching expertise and a declared intent to build count for more than holdings.</p>
        </template>
        <template v-else>
          <span class="term"><b>1</b> base</span><span class="op">+</span>
          <span class="term"><b>{{ mine.token }}</b> √(1,440 / 1,000)</span><span class="op">=</span>
          <span class="term total"><b>{{ mine.total }}</b></span>
          <p class="why-note">Funding calls are token-weighted on a square-root curve: say grows with holdings but never flattens. A proposal from ideas/weighted-voting.md.</p>
        </template>
      </div>
    </section>

    <!-- Settle strip -->
    <section v-if="!t.settled && t.positions.length" class="settle">
      <div class="settle-stats">
        <span>Margin <strong class="mono">{{ leader.margin }}</strong></span>
        <span class="sep-dot">·</span>
        <span :class="{ warn: t.objections }">{{ t.objections ? `${t.objections} open objection${t.objections > 1 ? 's' : ''}` : 'No open objections' }}</span>
        <span class="sep-dot">·</span>
        <span>Leader holds <strong class="mono">{{ Math.round(leader.share * 100) }}%</strong></span>
        <span class="sep-dot">·</span>
        <span class="muted">{{ status === 'converging' ? 'Clear leader' : `Converges at ${CONVERGE_SHARE * 100}% and a 3 point margin` }}</span>
      </div>
      <div v-if="isLead" class="settle-act">
        <input v-model="settleNote" class="note-input" placeholder="Decision note (optional)" />
        <button class="btn-primary" type="button" :disabled="!leader.top || leader.top.weightedScore <= 0" @click="doSettle(leader.top!.positionId)">
          Settle on {{ leader.top ? letter(leader.top.positionId) : '—' }}
        </button>
      </div>
      <p v-else class="muted small">Only the project lead can settle.</p>
      <div class="viewas">
        <span class="muted">Prototype: view as</span>
        <div class="seg" role="radiogroup" aria-label="View as">
          <button v-for="r in roles" :key="r" type="button" role="radio" :aria-checked="state.role === r" @click="state.role = r">{{ r[0].toUpperCase() + r.slice(1) }}</button>
        </div>
      </div>
    </section>

    <!-- Replies -->
    <section class="block">
      <div class="block-head"><h2 class="label">Discussion</h2><span class="legend">{{ t.replies.length }} {{ t.replies.length === 1 ? 'reply' : 'replies' }}</span></div>
      <div v-for="r in t.replies" :key="r.id" class="reply">
        <Avatar :id="r.authorId" :size="22" />
        <div>
          <div class="reply-head"><strong>{{ person(r.authorId)?.name }}</strong><span class="muted">{{ r.at }}</span></div>
          <p>{{ r.text }}</p>
        </div>
      </div>
      <form class="composer" @submit.prevent="send">
        <Avatar id="me" :size="22" />
        <input v-model="draft" placeholder="Reply, or propose a position…" />
        <button class="tbtn" type="submit" :disabled="!draft.trim()">Send</button>
      </form>
    </section>
  </article>
</template>

<style scoped>
.detail { padding: 20px 28px 40px; max-width: 760px; }
.mono { font-family: var(--font-mono); }
.muted { color: var(--fg-muted); }
.small { font-size: var(--text-sm); }

.back { display: none; margin: 0 0 12px -8px; }
.flip { transform: rotate(180deg); }
.meta-top { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm); color: var(--fg-muted); }
.kind { padding: 1px 7px; border-radius: 999px; background: var(--slate-a3); color: var(--fg-2); font-size: var(--text-sm); }
.kind.funding { background: var(--amber-a3, var(--slate-a3)); color: var(--amber-11); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--amber-9) 30%, transparent); }
.title { margin: 10px 0 10px; font-size: 18px; font-weight: 600; line-height: 1.35; letter-spacing: -0.01em; color: var(--fg); }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.chip {
  display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px;
  border: 1px solid var(--slate-a4); border-radius: 7px; background: var(--slate-a2);
  font-size: var(--text-sm); color: var(--fg-2);
}
.chip :deep(svg) { color: var(--fg-faint); }
.by { display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--fg-muted); }
.chips .by { margin-left: 4px; }
.body { margin: 14px 0 0; color: var(--fg-2); line-height: 1.6; font-size: var(--text-nav); }

.block { margin-top: 26px; }
.block-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 10px; }
.label { margin: 0; font-size: var(--text-sm); font-weight: 500; color: var(--fg-muted); }
.legend { font-size: var(--text-sm); color: var(--fg-faint); }
.empty { margin: 0; padding: 18px; border: 1px dashed var(--slate-a5); border-radius: 12px; color: var(--fg-muted); text-align: center; }

/* Position cards: a quiet card; the weighted leader gets an indigo edge. */
.pos {
  display: flex; gap: 12px; padding: 12px; margin-bottom: 8px;
  border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2);
  transition: border-color 150ms, background-color 150ms;
}
.pos.lead { border-color: var(--indigo-a6); background: var(--indigo-a2); box-shadow: inset 0 1px 0 var(--indigo-a3); }
.pos.chosen { border-color: color-mix(in srgb, var(--jade-9) 55%, transparent); }
.voter { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 36px; }
.score { font-size: var(--text-md); font-weight: 600; color: var(--fg); }
.vbtn {
  display: grid; place-items: center; width: 26px; height: 22px; padding: 0;
  border: 1px solid transparent; border-radius: 7px; background: none; color: var(--fg-muted); cursor: pointer;
  transition: color 150ms, background-color 150ms;
}
.vbtn svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.vbtn:hover:not(:disabled) { background: var(--slate-a3); color: var(--fg); }
.vbtn.up[aria-pressed='true'] { background: var(--indigo-a4); color: var(--indigo-11); border-color: var(--indigo-a6); }
.vbtn.down[aria-pressed='true'] { background: var(--red-a3); color: var(--red-11); border-color: var(--red-a7); }
.vbtn:disabled { opacity: 0.4; cursor: default; }
.vbtn:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.pos-main { flex: 1; min-width: 0; }
.pos-text { margin: 2px 0 10px; line-height: 1.55; color: var(--fg); font-size: var(--text-nav); }
.letter {
  display: inline-grid; place-items: center; width: 18px; height: 18px; margin-right: 8px; vertical-align: 1px;
  border-radius: 5px; background: var(--slate-a4); color: var(--fg-2); font-size: var(--text-sm); font-weight: 600;
}
.pos.lead .letter { background: var(--indigo-9); color: #fff; }
.pos-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.bar { flex: 1; min-width: 60px; max-width: 180px; height: 4px; border-radius: 99px; background: var(--slate-a3); overflow: hidden; }
.bar span { display: block; height: 100%; border-radius: inherit; background: var(--fg-faint); transition: width 300ms cubic-bezier(0.32, 0.72, 0, 1); }
.pos.lead .bar span { background: var(--indigo-9); }
.nums { font-size: var(--text-sm); color: var(--fg-2); }
.raw { color: var(--fg-faint); margin-left: 4px; }
.stack { display: inline-flex; }
.stack .av + .av { margin-left: -5px; }
.more { margin-left: 4px; font-size: var(--text-sm); color: var(--fg-muted); }
.settle-this { margin-left: auto; }

.flag {
  display: flex; align-items: center; gap: 8px; margin: 10px 0 0; padding: 8px 10px;
  border-radius: 9px; background: var(--amber-a3, var(--slate-a3)); color: var(--amber-11); font-size: var(--text-sm);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--amber-9) 25%, transparent);
}
.yours { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-size: var(--text-sm); color: var(--fg-muted); }
.yours strong { color: var(--fg); }
.linkish { padding: 0; border: 0; background: none; color: var(--indigo-11); font-size: var(--text-sm); cursor: pointer; }
.linkish:hover { text-decoration: underline; }
.why {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; padding: 10px 12px;
  border: 1px solid var(--slate-a4); border-radius: 10px; background: var(--slate-1); font-size: var(--text-sm); color: var(--fg-muted);
}
.term b { font-family: var(--font-mono); color: var(--fg); font-weight: 500; }
.term.zero b { color: var(--fg-faint); }
.term.total b { color: var(--indigo-11); font-size: var(--text-nav); }
.op { color: var(--fg-faint); }
.why-note { flex-basis: 100%; margin: 6px 0 0; color: var(--fg-faint); }

.settle {
  margin-top: 16px; padding: 12px 14px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-2);
}
.settle-stats { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: var(--text-sm); color: var(--fg-2); }
.settle-stats strong { color: var(--fg); }
.warn { color: var(--amber-11); }
.sep-dot { color: var(--fg-faint); }
.settle-act { display: flex; gap: 8px; margin-top: 10px; }
.note-input, .composer input {
  flex: 1; min-width: 0; height: 30px; padding: 0 10px; border: 1px solid var(--slate-a5); border-radius: 8px;
  background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none;
}
.note-input:focus, .composer input:focus { border-color: var(--indigo-a7); }
.btn-primary {
  height: 30px; padding: 0 12px; border: 1px solid var(--indigo-9); border-radius: 8px;
  background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2);
}
.btn-primary:disabled { opacity: 0.5; cursor: default; }
.tbtn.small { height: 24px; padding-inline: 8px; font-size: var(--text-sm); }

.decided {
  margin-top: 20px; padding: 12px 14px; border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--jade-9) 35%, transparent); background: var(--jade-a2, var(--slate-a2));
}
.decided.override { border-color: color-mix(in srgb, var(--amber-9) 40%, transparent); background: var(--amber-a2, var(--slate-a2)); }
.decided-head { display: flex; align-items: center; gap: 8px; font-size: var(--text-sm); }
.decided-head strong { color: var(--fg); font-weight: 600; }
.decided-head .tbtn { margin-left: auto; }
.decided p { margin: 8px 0 0; color: var(--fg-2); line-height: 1.55; }
.decided .note { color: var(--fg-muted); font-style: italic; }
.override-note { font-size: var(--text-sm); color: var(--amber-11) !important; }

.reply { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--slate-a3); }
.reply:first-of-type { border-top: 0; }
.reply-head { display: flex; gap: 8px; align-items: baseline; font-size: var(--text-sm); }
.reply-head strong { color: var(--fg); font-weight: 500; }
.reply p { margin: 3px 0 0; color: var(--fg-2); line-height: 1.55; }
.composer { display: flex; align-items: center; gap: 10px; margin-top: 10px; }

.viewas { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--slate-a3); font-size: var(--text-sm); }
.viewas .seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a2); }
.viewas .seg button { height: 20px; padding: 0 7px; border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; }
.viewas .seg button[aria-checked='true'] { background: var(--slate-a4); color: var(--fg); }

@media (max-width: 899px) {
  .detail { padding: 16px; }
  .back { display: inline-flex; }
}
</style>
