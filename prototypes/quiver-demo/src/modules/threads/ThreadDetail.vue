<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Kbd from '../../frame/Kbd.vue';
import { MOD } from '../../frame/shortcuts';
import Avatar from './Avatar.vue';
import SourceChip from './SourceChip.vue';
import StatusIcon from './StatusIcon.vue';
import WorkCard from '../work/WorkCard.vue';
import { LATER, NEXT, type Thread } from './data';
import { partById } from '../../data/quiver';
import { boardById } from '../../data/pcbs';
import {
  changedWinner, day, decline, defer, draftWork, isOpen, leaderOf, locked, myVote, person, propose, reopen, reply, settle,
  standing, state, talliesOf, vote, weightOf, workFor, isBuilder, setBuilder, type WorkKind,
} from './store';
import { remote } from '../../lib/backend';
import { session } from '../../lib/session';

// One thread, always in the same order: the question and where it is in the
// pipeline (discussion → decided spec → funded work), the outcome and its
// work, the positions people vote on, the lead's outcome controls, then the
// replies. Rendered in the thread panel wherever the thread is opened from.
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

const open = computed(() => isOpen(t.value));
const work = computed(() => workFor(t.value));
const frozen = computed(() => locked(t.value));

// The lead's outcome: adopt a position into the spec, decline, or defer.
const isLead = computed(() => state.role === 'lead');
type Outcome = 'adopt' | 'decline' | 'defer';
const outcome = ref<Outcome>('adopt');
const declineNote = ref('');
const deferNote = ref('');
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
// Funding a decision: a bounty or grant drafted from the adopted position.
const funding = ref(false);
const chosenText = computed(() => t.value.positions.find((p) => p.id === t.value.settled?.positionId)?.text ?? '');
const wd = ref({ kind: 'bounty' as WorkKind, title: '', scope: '', acceptance: '', reward: '' as number | '' });
function startFunding() {
  const text = chosenText.value;
  wd.value = {
    kind: 'bounty',
    title: text.length > 90 ? `${text.slice(0, 87).trimEnd()}…` : text,
    scope: `${t.value.title}\n\nDecided (${t.value.settled!.decision}): ${text}${t.value.settled!.note ? `\nWhy: ${t.value.settled!.note}` : ''}${t.value.body ? `\n\n${t.value.body}` : ''}`,
    acceptance: '',
    reward: '',
  };
  funding.value = true;
}
const previewAward = computed(() => Math.floor((Number(wd.value.reward) || 0) * 0.25));
function saveWork() {
  if (!wd.value.title.trim() || !wd.value.acceptance.trim() || !(Number(wd.value.reward) > 0)) return;
  draftWork(t.value, { kind: wd.value.kind, title: wd.value.title.trim(), scope: wd.value.scope.trim(), acceptance: wd.value.acceptance.trim(), reward: Number(wd.value.reward) });
  funding.value = false;
}
const proposerName = computed(() => {
  const p = t.value.positions.find((x) => x.id === t.value.settled?.positionId);
  return p?.authorId ? nameOf(p.authorId) : p?.source ? `the source (${p.source.label})` : 'the proposer';
});

watch(() => t.value.id, () => {
  adding.value = false; newPosition.value = ''; choice.value = undefined; note.value = ''; draft.value = '';
  outcome.value = 'adopt'; declineNote.value = ''; deferNote.value = ''; funding.value = false;
});
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
        <template v-if="t.version"><span class="dot">·</span><span class="mono ver" title="The version this thread is about">{{ t.version }}</span></template>
      </p>
      <p v-if="t.pcb" class="part">
        About <span class="mono">{{ t.pcb.ref }}</span> on the {{ boardById(t.pcb.board)?.name }}
        <RouterLink :to="{ path: '/quiver/overview/pcbs', query: { board: t.pcb.board, ref: t.pcb.ref, thread: t.id } }">View on the board</RouterLink>
      </p>
      <p v-else-if="t.part" class="part">
        About <span class="mono">{{ t.part }}</span> {{ partById(t.part)?.name }}
        <RouterLink :to="{ path: '/quiver/overview/model', query: { part: t.part, thread: t.id } }">View in model</RouterLink>
      </p>
      <ol class="pipe" aria-label="Where this thread is">
        <li :class="open ? 'on' : 'done'">Discussion</li>
        <li :class="t.settled ? 'done' : t.declined ? 'stop' : ''">
          <template v-if="t.settled">Decided <span class="mono">{{ t.settled.decision }}</span></template>
          <template v-else-if="t.declined">Declined</template>
          <template v-else>Decided spec</template>
        </li>
        <li v-if="!t.declined" :class="work?.stage === 'completed' ? 'done' : work ? 'on' : ''">
          <template v-if="work">{{ work.kind === 'bounty' ? 'Bounty' : 'Grant' }} <span class="mono">{{ work.id }}</span></template>
          <template v-else>Grant or bounty</template>
        </li>
      </ol>
      <p class="state" :data-status="stand.status">
        <StatusIcon :status="stand.status" :override="t.settled?.override" :size="12" />
        {{ stand.status === 'needs' ? 'Needs input' : stand.status === 'converging' ? 'Converging' : stand.status === 'declined' ? 'Declined' : 'Decided' }}<span class="dot">·</span>{{ stand.text }}
      </p>
      <p v-for="(d, i) in t.deferrals ?? []" :key="i" class="deferred">Deferred from {{ d.from }} to {{ d.to }} by {{ nameOf(d.byId) }}, {{ day(d.at) }}<template v-if="d.note">: {{ d.note }}</template></p>
      <p v-if="t.body" class="body">{{ t.body }}</p>
    </header>

    <section v-if="t.settled" class="decided">
      <div class="decided-head">
        <span class="strong">Decided: {{ letter(t.settled.positionId) }}</span>
        <span class="tag mono">{{ t.settled.decision }}</span>
        <span v-if="t.settled.override" class="tag warn">Override</span>
        <span class="muted">{{ nameOf(t.settled.byId) }} as lead, {{ day(t.settled.at) }}</span>
        <SourceChip v-if="t.settled.source" :source="t.settled.source" />
        <button v-if="isLead && !frozen && !work && !t.settled.source" class="ghost" type="button" @click="reopen(t)">Reopen</button>
      </div>
      <p class="note">{{ t.settled.note }}</p>
      <p v-if="frozen" class="muted small">Part of the frozen {{ NEXT }} spec.</p>
    </section>

    <section v-if="t.declined" class="decided">
      <div class="decided-head">
        <span class="strong">Declined</span>
        <span class="muted">{{ nameOf(t.declined.byId) }} as lead, {{ day(t.declined.at) }}</span>
        <button v-if="isLead && !frozen" class="ghost" type="button" @click="reopen(t)">Reopen</button>
      </div>
      <p class="note">{{ t.declined.note }}</p>
      <p class="muted small">Declined ideas still share in the retro pool by the support they got.</p>
    </section>

    <section v-if="t.settled" class="block work">
      <div class="block-head"><h2 class="label">Work</h2></div>
      <WorkCard v-if="work" :work="work" />
      <template v-else-if="isLead">
        <button v-if="!funding" class="add-btn" type="button" @click="startFunding">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg> Fund it as a bounty or grant
        </button>
        <form v-else class="fund" @submit.prevent="saveWork">
          <div class="choices" role="radiogroup" aria-label="Kind of work">
            <button type="button" role="radio" :aria-checked="wd.kind === 'bounty'" title="A fixed deliverable anyone can claim" @click="wd.kind = 'bounty'">Bounty</button>
            <button type="button" role="radio" :aria-checked="wd.kind === 'grant'" title="Scoped work someone takes on, often with milestones" @click="wd.kind = 'grant'">Grant</button>
          </div>
          <input v-model="wd.title" class="field" placeholder="Title" aria-label="Work title" />
          <textarea v-model="wd.scope" class="area" rows="5" aria-label="Scope"></textarea>
          <textarea v-model="wd.acceptance" class="area" rows="2" placeholder="Accepted when (required): what gets delivered and how the lead checks it" aria-label="Acceptance"></textarea>
          <div class="fund-bar">
            <label class="reward"><input v-model.number="wd.reward" type="number" min="1" step="1" placeholder="Reward" aria-label="Reward in ARROW" /> ARROW</label>
            <span class="muted small">Proposer award 25%: {{ previewAward.toLocaleString('en-US') }} ARROW to {{ proposerName }}</span>
          </div>
          <div class="add-bar">
            <button class="ghost" type="button" @click="funding = false">Cancel</button>
            <button class="primary sm" type="submit" :disabled="!wd.title.trim() || !wd.acceptance.trim() || !(Number(wd.reward) > 0)">Draft {{ wd.kind }}</button>
          </div>
        </form>
      </template>
      <p v-else class="empty">Not funded yet. A lead can turn this decision into a bounty or grant.</p>
    </section>

    <section class="block">
      <div class="block-head">
        <h2 class="label">Positions</h2>
        <label v-if="remote && session.userId && open" class="builder" title="Adds one point of weight to your votes in this thread">
          <input type="checkbox" :checked="isBuilder(t)" @change="setBuilder(t, ($event.target as HTMLInputElement).checked)" /> I'd help build this
        </label>
      </div>

      <p v-if="!t.positions.length" class="empty">No positions yet. Add the first one.</p>

      <div class="positions">
        <div v-for="p in ordered" :key="p.id" class="pos">
          <div class="vote" role="group" :aria-label="`Vote on position ${letter(p.id)}`" :class="{ locked: !open }">
            <button class="v up" type="button" :aria-pressed="myVote(t, p.id) === 1" :disabled="!open" aria-label="Vote up" :title="formula" @click="vote(t, p.id, 1)">
              <svg viewBox="0 0 16 16"><path d="m4 10 4-4 4 4" /></svg>
            </button>
            <span class="n mono" :title="`Weighted. Raw ${fmt(tallyOf(p.id).rawScore)} from ${tallyOf(p.id).voters} ${tallyOf(p.id).voters === 1 ? 'vote' : 'votes'}`">{{ Math.round(tallyOf(p.id).weightedScore * 10) / 10 }}</span>
            <button class="v down" type="button" :aria-pressed="myVote(t, p.id) === -1" :disabled="!open" aria-label="Vote down" :title="formula" @click="vote(t, p.id, -1)">
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

      <div v-if="open" class="add">
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

      <p v-if="flipped && open" class="aside">
        <span class="pip" aria-hidden="true"></span>
        Weighting changed the leader: {{ rawTie ? 'by headcount it is level' : `by headcount ${letter(rawLeader.positionId)} is ahead` }}.
      </p>
    </section>

    <section v-if="isLead && open && !frozen" class="decide">
      <h2 class="label">Outcome, as lead</h2>
      <div class="modes" role="radiogroup" aria-label="Outcome">
        <button type="button" role="radio" :aria-checked="outcome === 'adopt'" @click="outcome = 'adopt'">Adopt into the spec</button>
        <button type="button" role="radio" :aria-checked="outcome === 'decline'" @click="outcome = 'decline'">Decline</button>
        <button v-if="t.version === NEXT" type="button" role="radio" :aria-checked="outcome === 'defer'" @click="outcome = 'defer'">Defer to {{ LATER }}</button>
      </div>

      <template v-if="outcome === 'decline'">
        <p class="hint-line">Closes the thread without adopting anything. Its positions still share in the retro pool by the support they got.</p>
        <div class="settle-act">
          <input v-model="declineNote" class="field" placeholder="Why (required, a sentence)" aria-label="Decline reason" />
          <button class="primary" type="button" :disabled="declineNote.trim().length < 10" @click="decline(t, declineNote.trim())">Decline</button>
        </div>
      </template>
      <template v-else-if="outcome === 'defer'">
        <p class="hint-line">Moves the thread to {{ LATER }}; it stays open there and leaves the {{ NEXT }} list.</p>
        <div class="settle-act">
          <input v-model="deferNote" class="field" placeholder="Why (optional)" aria-label="Defer note" />
          <button class="primary" type="button" @click="defer(t, deferNote.trim() || undefined)">Defer to {{ LATER }}</button>
        </div>
      </template>
      <p v-else-if="!t.positions.length" class="hint-line">Add a position first: adopting picks one of them.</p>
      <template v-else>
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
      </template>
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
.part { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; margin: 8px 0 0; font-size: var(--text-sm); color: var(--fg-2); }
.part .mono { color: var(--fg-muted); }
.part a { color: var(--indigo-11); text-decoration: none; }
.part a:hover { text-decoration: underline; }

.pipe { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0 0; padding: 0; list-style: none; font-size: var(--text-sm); }
.pipe li { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border: 1px solid var(--slate-a4); border-radius: 11px; color: var(--fg-faint); }
.pipe li + li::before { content: '→'; margin: 0 4px 0 -2px; color: var(--fg-faint); }
.pipe li.on { border-color: var(--indigo-a7); color: var(--indigo-11); }
.pipe li.done { border-color: var(--jade-a5); color: var(--jade-11); }
.pipe li.stop { color: var(--fg-muted); }
.pipe .mono { font-size: 11px; }
.deferred { margin: 6px 0 0; font-size: var(--text-sm); color: var(--fg-muted); }
.small { font-size: var(--text-sm); }
.builder { display: inline-flex; align-items: center; gap: 5px; font-size: var(--text-sm); color: var(--fg-muted); cursor: pointer; }
.builder input { accent-color: var(--indigo-9); }
.modes { display: flex; width: fit-content; flex-wrap: wrap; gap: 2px; margin-top: 8px; padding: 2px; border-radius: 8px; background: var(--slate-a3); }
.modes button { height: 26px; padding: 0 10px; border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; }
.modes button[aria-checked='true'] { background: var(--slate-a6); color: var(--fg); }
.work .add-btn { margin-top: 2px; }
.fund { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--slate-a5); border-radius: 12px; background: var(--slate-a2); }
.fund .field { width: 100%; }
.area { width: 100%; padding: 8px 10px; border: 1px solid var(--slate-a4); border-radius: 9px; background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); line-height: 1.5; outline: none; resize: vertical; }
.area::placeholder { color: var(--fg-faint); }
.fund-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.reward { display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--fg-muted); }
.reward input { width: 110px; height: 30px; padding: 0 8px; border: 1px solid var(--slate-a4); border-radius: 8px; background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none; }
</style>
