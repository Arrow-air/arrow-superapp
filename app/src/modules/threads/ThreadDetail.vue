<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Kbd from '../../frame/Kbd.vue';
import { MOD } from '../../frame/shortcuts';
import Avatar from './Avatar.vue';
import SourceChip from './SourceChip.vue';
import StatusIcon from './StatusIcon.vue';
import WorkCard from '../work/WorkCard.vue';
import CommentNode from './CommentNode.vue';
import Icon from '../../frame/Icon.vue';
import { threadTypes, typeStyle } from './types';
import { useFreeze } from '../../frame/freeze';
import { LATER, NEXT, type Thread } from './data';
import { partById } from '../../data/quiver';
import { boardById } from '../../data/pcbs';
import {
  canReopen, changedWinner, comment, day, decline, defer, draftWork, isOpen, leaderOf, letterOf, locked, person, reopen, settle, takenWork,
  standing, state, talliesOf, topLevel, options, liveComments, weightOf, workFor, isBuilder, setBuilder, type WorkKind,
} from './store';
import { remote } from '../../lib/backend';
import { session } from '../../lib/session';

// One thread, always in the same order: the question and where it is in the
// pipeline (discussion → decided spec → funded work), the outcome and its
// work, the comments, then the lead's outcome controls. Comments are one
// Reddit-style tree with voting at every level; top-level comments are the
// options a lead can adopt. Rendered in the thread panel wherever it opens.
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
const letter = (id: string) => letterOf(t.value, id);
const freeze = useFreeze();
// Open v1.1 threads are due at the design freeze: settled, deferred or declined.
const due = computed(() => isOpen(t.value) && t.value.version === NEXT && freeze.active.value && !state.release.frozenAt);
const showWhy = ref(false);
// Your weight shows where you use it: on hover over the vote buttons.
const formula = computed(() =>
  `Your vote counts ${mine.value.total}: (${mine.value.base} base + ${mine.value.token} token + ${mine.value.expertise} expertise + ${mine.value.builder} builder) × ${mine.value.roleMultiplier} ${mine.value.role}. Technical calls weigh role, verified expertise and intent to build more than holdings. No wallet is linked in the demo.`,
);

// Top-level comments ordered by weighted score, so the leader reads first;
// ties keep the order they were posted in.
const tops = computed(() => topLevel(t.value));
// The options still standing: what can lead, be counted and be adopted.
const live = computed(() => options(t.value));
const commentCount = computed(() => liveComments(t.value).length);
const ordered = computed(() =>
  tops.value.map((p, i) => ({ p, i })).sort((a, b) => (tallyOf(b.p.id)?.weightedScore ?? 0) - (tallyOf(a.p.id)?.weightedScore ?? 0) || a.i - b.i).map((x) => x.p),
);
const nameOf = (id?: string) => (id === 'me' ? 'You' : person(id)?.name);

// A new top-level comment: an option others can vote on and a lead can adopt.
const newComment = ref('');
function addComment() {
  if (!newComment.value.trim()) return;
  comment(t.value, newComment.value.trim());
  newComment.value = '';
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
const chosen = computed(() => choice.value ?? (hasLeader.value ? leader.value.top!.positionId : live.value[0]?.id));
// "Adopt…" on a comment: pick it in the outcome block and go there.
const noteInput = ref<HTMLInputElement>();
function adoptFrom(id: string) {
  outcome.value = 'adopt';
  choice.value = id;
  requestAnimationFrame(() => { noteInput.value?.scrollIntoView({ block: 'center', behavior: 'smooth' }); noteInput.value?.focus(); });
}
const overrides = computed(() => hasLeader.value && chosen.value !== leader.value.top!.positionId);
function decide() {
  if (!chosen.value || !note.value.trim()) return;
  settle(t.value, chosen.value, note.value.trim());
  note.value = '';
  choice.value = undefined;
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

// Reopening an outcome: back to discussion, with an optional reason on the record.
const reopening = ref(false);
const reopenNote = ref('');
const withdrawable = computed(() => state.work.find((w) => w.threadId === t.value.id && (w.stage === 'draft' || w.stage === 'open')));
const taken = computed(() => takenWork(t.value));
function doReopen() {
  reopen(t.value, reopenNote.value.trim() || undefined);
  reopening.value = false;
  reopenNote.value = '';
}
watch(() => t.value.id, () => {
  reopening.value = false; reopenNote.value = '';
  newComment.value = ''; choice.value = undefined; note.value = '';
  outcome.value = 'adopt'; declineNote.value = ''; deferNote.value = ''; funding.value = false;
});
const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

<template>
  <article class="detail">
    <header class="head">
      <h1 class="title">{{ t.title }}</h1>
      <p class="meta">
        <span class="type" :style="typeStyle(t.type)"><Icon :name="threadTypes[t.type].icon" :size="12" />{{ threadTypes[t.type].label }}</span>
        <span v-if="due" class="due" :data-level="freeze.level.value" title="Open threads are settled, deferred or declined at the design freeze">
          {{ freeze.frozen.value ? 'Due at freeze' : `Settles by freeze · ${freeze.label.value}` }}
        </span>
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
      <p v-for="(h, i) in t.history ?? []" :key="`h${i}`" class="deferred">
        <template v-if="h.was === 'decided'">{{ h.decision }} (adopted {{ letter(h.positionId!) }}, {{ nameOf(h.decidedBy) }}, {{ day(h.decidedAt!) }})</template><template v-else>Declined ({{ nameOf(h.decidedBy) }}, {{ day(h.decidedAt!) }})</template>
        reopened by {{ nameOf(h.byId) }}, {{ day(h.at) }}<template v-if="h.note">: {{ h.note }}</template>
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
        <button v-if="canReopen(t) && !reopening" class="ghost" type="button" @click="reopening = true">Reopen as discussion</button>
      </div>
      <p class="note">{{ t.settled.note }}</p>
      <p v-if="frozen" class="muted small">Part of the frozen {{ NEXT }} spec.</p>
      <p v-else-if="isLead && taken && !t.settled.source" class="muted small">{{ taken.id }} has been taken on, so this decision stays.</p>
    </section>

    <section v-if="t.declined" class="decided">
      <div class="decided-head">
        <span class="strong">Declined</span>
        <span class="muted">{{ nameOf(t.declined.byId) }} as lead, {{ day(t.declined.at) }}</span>
        <button v-if="canReopen(t) && !reopening" class="ghost" type="button" @click="reopening = true">Reopen as discussion</button>
      </div>
      <p class="note">{{ t.declined.note }}</p>
      <p class="muted small">Declined ideas still share in the retro pool by the support they got.</p>
    </section>

    <form v-if="reopening && canReopen(t)" class="reopen" @submit.prevent="doReopen">
      <p class="hint-line">
        Puts the thread back into discussion; votes and comments stay.
        <template v-if="withdrawable">{{ withdrawable.id }} ({{ withdrawable.stage === 'open' ? 'open' : 'draft' }} {{ withdrawable.kind }}) is withdrawn.</template>
        <template v-if="t.settled">Decided again, it keeps {{ t.settled.decision }}.</template>
      </p>
      <div class="settle-act">
        <input v-model="reopenNote" class="field" placeholder="Why (optional)" aria-label="Why reopen" />
        <button class="primary" type="submit">Reopen</button>
        <button class="ghost" type="button" @click="reopening = false">Cancel</button>
      </div>
    </form>

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

    <section class="block comments">
      <div class="block-head">
        <h2 class="label">
          <template v-if="!live.length">Comments</template>
          <template v-else-if="!open">{{ live.length }} {{ live.length === 1 ? 'option' : 'options' }} · {{ t.settled ? 'decided' : 'closed' }}</template>
          <template v-else>{{ live.length }} competing {{ live.length === 1 ? 'option' : 'options' }} <span class="label-hint">· vote up the one you'd build</span></template>
          <span v-if="commentCount > live.length" class="legend">· {{ commentCount }} comments</span>
        </h2>
        <span class="legend">
          <label v-if="remote && session.userId && open" class="builder" title="Adds one point of weight to your votes in this thread">
            <input type="checkbox" :checked="isBuilder(t)" @change="setBuilder(t, ($event.target as HTMLInputElement).checked)" /> I'd help build this
          </label>
          Your vote counts <b class="mono">{{ mine.total }}</b> <button class="ghost link" type="button" :aria-expanded="showWhy" @click="showWhy = !showWhy">{{ showWhy ? 'Hide' : 'Why' }}</button>
        </span>
      </div>
      <div v-if="showWhy" class="why">
        <p class="why-note first">{{ t.kind === 'funding' ? 'A funding call, so votes are token-weighted.' : 'A technical call, so votes are signal-weighted.' }}</p>
        <p class="formula mono">({{ mine.base }} base + {{ mine.token }} token + {{ mine.expertise }} expertise + {{ mine.builder }} builder) × {{ mine.roleMultiplier }} {{ mine.role }} = <b>{{ mine.total }}</b></p>
        <p class="why-note">Role and a declared intent to build count for more than holdings. Scores are weighted; hover one for the raw headcount.</p>
      </div>

      <form v-if="open" class="composer top" @submit.prevent="addComment">
        <!-- You, speaking; the utility bar below is set apart. -->
        <div class="composer-body">
          <Avatar id="me" :size="28" />
          <textarea
            v-model="newComment"
            rows="2"
            placeholder="Add a comment: an option, an answer, or what you know"
            aria-label="New comment"
            @keydown.meta.enter.prevent="addComment"
            @keydown.ctrl.enter.prevent="addComment"
          ></textarea>
        </div>
        <div class="composer-bar">
          <span class="hint"><Kbd :keys="[MOD, '↵']" outline /> Top-level comments are the options people vote on; reply under any comment to discuss it.</span>
          <button class="primary" type="submit" :disabled="!newComment.trim()">Comment</button>
        </div>
      </form>
      <p v-else class="hint-line">Closed to new options. You can still reply under a comment.</p>

      <p v-if="!commentCount" class="empty">No comments yet. Start the discussion.</p>
      <div class="tree">
        <CommentNode v-for="c in ordered" :key="c.id" :thread="t" :c="c" :depth="0" :formula="formula" @adopt="adoptFrom" />
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
        <p class="hint-line">Closes the thread without adopting anything. Its comments still share in the retro pool by the support they got.</p>
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
      <p v-else-if="!live.length" class="hint-line">Adopting picks a top-level comment; there are none yet.</p>
      <template v-else>
      <div class="choices" role="radiogroup" aria-label="Position to decide on">
        <button
          v-for="p in live"
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
        <input ref="noteInput" v-model="note" class="field" placeholder="Why (required): the decision note" aria-label="Decision note" />
        <button class="primary" type="button" :disabled="!note.trim()" @click="decide">Record decision</button>
      </div>
      </template>
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
  margin-top: 12px; overflow: clip; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-2);
  transition: border-color 150ms;
}
.composer:focus-within { border-color: var(--slate-a7); }
.composer-body { display: flex; align-items: flex-start; gap: 12px; padding: 14px 14px 8px; }
.composer-body .av { flex: none; }
.composer textarea {
  flex: 1; display: block; min-width: 0; min-height: 48px; padding: 4px 0 0; border: 0; background: none; resize: vertical;
  color: var(--fg); font: inherit; font-size: var(--text-nav); line-height: 1.5; outline: none;
}
.composer textarea::placeholder { color: var(--fg-faint); }
/* The utility bar: a darker strip under a hairline, apart from what you write. */
.composer-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 8px 8px 14px;
  border-top: 1px solid var(--slate-a3); background: var(--composer-bar);
}
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
.meta .type { display: inline-flex; align-items: center; gap: 5px; height: 20px; margin-right: 10px; padding: 0 7px 0 6px; border-radius: 6px; background: var(--tbg); color: var(--tfg); font-weight: 500; }
.meta .due { display: inline-flex; align-items: center; height: 20px; margin-right: 10px; padding: 0 7px; border-radius: 6px; background: var(--slate-a3); color: var(--fg-2); font-weight: 500; font-variant-numeric: tabular-nums; }
.meta .due[data-level='soon'] { background: var(--amber-a3); color: var(--amber-11); }
.meta .due[data-level='urgent'], .meta .due[data-level='frozen'] { background: var(--red-a3); color: var(--red-11); }
.label-hint { color: var(--fg-faint); font-weight: 400; }
.why-note.first { margin: 0 0 6px; color: var(--fg-2); }
.legend .builder { margin-right: 10px; }
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
.reopen { margin-top: 12px; padding: 12px 14px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2); }
.reopen .settle-act { margin-top: 10px; }
.deferred { margin: 6px 0 0; font-size: var(--text-sm); color: var(--fg-muted); }
.small { font-size: var(--text-sm); }
.composer.top { margin: 4px 0 6px; }
.tree { margin-top: 2px; }
.label .legend { margin-left: 4px; font-weight: 400; }
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
