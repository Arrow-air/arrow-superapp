<script setup lang="ts">
import { computed, ref } from 'vue';
import Avatar from './Avatar.vue';
import SourceChip from './SourceChip.vue';
import type { Position, Thread } from './data';
import { ago, childrenOf, comment, isOpen, leaderOf, letterOf, myVote, person, state, talliesOf, vote } from './store';

// One comment and its replies, Reddit style: a vote column, the comment,
// Reply, and the replies indented under a line. Top-level comments are the
// options: they carry a letter, can lead, and a lead can adopt one.
const props = defineProps<{ thread: Thread; c: Position; depth: number; formula: string }>();
const emit = defineEmits<{ adopt: [id: string] }>();

const t = computed(() => props.thread);
const top = computed(() => !props.c.parentId);
const open = computed(() => isOpen(t.value));
const tally = computed(() => talliesOf(t.value).find((x) => x.positionId === props.c.id));
const score = computed(() => Math.round((tally.value?.weightedScore ?? 0) * 10) / 10);
const leader = computed(() => leaderOf(t.value));
const leading = computed(() => top.value && open.value && leader.value.top?.positionId === props.c.id && (leader.value.top?.weightedScore ?? 0) > 0);
const decided = computed(() => t.value.settled?.positionId === props.c.id);
// Poll bar (Gavin's app-frame): an option's share of the positive weighted
// vote across all the options, so the options read as a vote.
const share = computed(() => {
  if (!top.value) return 0;
  const tops = talliesOf(t.value).filter((x) => !t.value.positions.find((p) => p.id === x.positionId)?.parentId);
  const positive = tops.reduce((sum, x) => sum + Math.max(0, x.weightedScore), 0);
  return positive ? Math.round((Math.max(0, tally.value?.weightedScore ?? 0) / positive) * 100) : 0;
});
const ahead = computed(() => (t.value.settled ? decided.value : leading.value));
const kids = computed(() => {
  const byScore = (a: Position, b: Position) =>
    (talliesOf(t.value).find((x) => x.positionId === b.id)?.weightedScore ?? 0) - (talliesOf(t.value).find((x) => x.positionId === a.id)?.weightedScore ?? 0) || a.at.localeCompare(b.at);
  return childrenOf(t.value, props.c.id).sort(byScore);
});
const countAll = (id: string): number => childrenOf(t.value, id).reduce((n, k) => n + 1 + countAll(k.id), 0);
const nameOf = (id?: string) => (id === 'me' ? 'You' : person(id)?.name);
const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

const collapsed = ref(false);
const replying = ref(false);
const draft = ref('');
function send() {
  if (!draft.value.trim()) return;
  comment(t.value, draft.value.trim(), props.c.id);
  draft.value = '';
  replying.value = false;
  collapsed.value = false;
}
const isLead = computed(() => state.role === 'lead');
</script>

<template>
  <div class="cm" :class="{ top, decided }" :data-comment="c.id">
    <!-- Replies keep the small arrow column; options vote with Back this below. -->
    <div v-if="!top" class="cm-vote" role="group" aria-label="Vote on this reply">
      <button class="v up" type="button" :aria-pressed="myVote(t, c.id) === 1" :disabled="!open" aria-label="Vote up" :title="formula" @click="vote(t, c.id, 1)">
        <svg viewBox="0 0 16 16"><path d="m4 10 4-4 4 4" /></svg>
      </button>
      <span class="n mono" :title="`Weighted. Raw ${fmt(tally?.rawScore ?? 0)} from ${tally?.voters ?? 0} ${tally?.voters === 1 ? 'vote' : 'votes'}`">{{ score }}</span>
      <button class="v down" type="button" :aria-pressed="myVote(t, c.id) === -1" :disabled="!open" aria-label="Vote down" :title="formula" @click="vote(t, c.id, -1)">
        <svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
      </button>
    </div>
    <div class="cm-main">
      <div class="cm-head">
        <span v-if="top" class="letter">{{ letterOf(t, c.id) }}</span>
        <template v-if="c.authorId"><Avatar :id="c.authorId" :size="16" /><span class="who">{{ nameOf(c.authorId) }}</span></template>
        <SourceChip v-if="c.source" :source="c.source" />
        <span class="muted">{{ ago(c.at) }}</span>
        <span v-if="decided" class="tag ok">Adopted</span>
        <span v-else-if="leading" class="tag">Leading</span>
      </div>
      <p v-if="!collapsed" class="cm-text">{{ c.text }}</p>
      <!-- Poll bar: this option's share of the weighted vote. -->
      <div v-if="top && !collapsed" class="share" :class="{ lead: ahead }" :title="`Weighted ${score}. Raw ${fmt(tally?.rawScore ?? 0)} from ${tally?.voters ?? 0} ${tally?.voters === 1 ? 'vote' : 'votes'}`">
        <span class="bar"><i :style="{ width: `${share}%` }"></i></span>
        <span class="pct mono">{{ share }}%</span>
      </div>
      <div class="cm-acts">
        <button v-if="!collapsed" class="act" type="button" @click="replying = !replying">Reply</button>
        <button v-if="top && open && isLead && !collapsed" class="act" type="button" @click="emit('adopt', c.id)">Adopt…</button>
        <button v-if="kids.length || collapsed" class="act muted" type="button" :aria-expanded="!collapsed" @click="collapsed = !collapsed">
          {{ collapsed ? `Show (${countAll(c.id) + 1})` : 'Collapse' }}
        </button>
        <!-- The vote on an option: say what it does, fill when it's yours. -->
        <div v-if="top" class="votes" role="group" :aria-label="`Vote on option ${letterOf(t, c.id)}`">
          <template v-if="open">
            <button class="vote-back" type="button" :aria-pressed="myVote(t, c.id) === 1" :aria-label="`Back option ${letterOf(t, c.id)}`" :title="formula" @click="vote(t, c.id, 1)">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4" /></svg>
              {{ myVote(t, c.id) === 1 ? 'Backed' : 'Back this' }}<span class="n mono">{{ score }}</span>
            </button>
            <button class="against" type="button" :aria-pressed="myVote(t, c.id) === -1" :aria-label="`Vote against option ${letterOf(t, c.id)}`" :title="formula" @click="vote(t, c.id, -1)">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
            </button>
          </template>
          <span v-else class="final mono">{{ score }}</span>
        </div>
      </div>
      <form v-if="replying && !collapsed" class="cm-reply" @submit.prevent="send">
        <div class="cm-reply-body">
          <Avatar id="me" :size="22" />
          <textarea v-model="draft" rows="2" :placeholder="`Reply to ${nameOf(c.authorId) ?? 'this comment'}…`" aria-label="Reply" autofocus @keydown.meta.enter.prevent="send" @keydown.ctrl.enter.prevent="send"></textarea>
        </div>
        <div class="cm-bar">
          <button class="ghost" type="button" @click="replying = false">Cancel</button>
          <button class="primary sm" type="submit" :disabled="!draft.trim()">Reply</button>
        </div>
      </form>
      <div v-if="kids.length && !collapsed" class="cm-kids" :class="{ flat: depth >= 6 }">
        <CommentNode v-for="k in kids" :key="k.id" :thread="t" :c="k" :depth="depth + 1" :formula="formula" @adopt="emit('adopt', $event)" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cm { display: flex; gap: 10px; padding-top: 12px; }
/* Options are people's answers, so each sits on its own faint card; its replies thread inside it. */
.cm.top { padding: 12px 14px 12px; border: 1px solid var(--slate-a3); border-radius: var(--radius-lg); background: var(--slate-a2); }
.cm.top + .cm.top { margin-top: 8px; }
.cm.top.decided { border-color: var(--jade-a5); }
.cm-vote { display: flex; flex-direction: column; align-items: center; flex: none; width: 28px; padding-top: 1px; }
.v { display: grid; place-items: center; width: 26px; height: 20px; padding: 0; border: 0; border-radius: 6px; background: none; color: var(--fg-faint); cursor: pointer; transition: background-color 120ms, color 120ms; }
.v svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.v:hover:not(:disabled) { background: var(--slate-a3); color: var(--fg); }
.v.up[aria-pressed='true'] { color: var(--indigo-11); background: var(--indigo-a3); }
.v.down[aria-pressed='true'] { color: var(--red-11); background: var(--red-a3, var(--slate-a3)); }
.v:disabled { cursor: default; opacity: 0.45; }
.n { padding: 1px 0; font-size: var(--text-sm); font-weight: 600; color: var(--fg-2); }
.mono { font-family: var(--font-mono); }
.cm-main { flex: 1; min-width: 0; }
.cm-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--fg-muted); }
.letter { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 5px; background: var(--slate-a4); color: var(--fg); font-weight: 600; }
.who { color: var(--fg); font-weight: 500; }
.muted { color: var(--fg-muted); }
.tag { height: 18px; padding: 0 6px; border-radius: 5px; background: var(--slate-a3); color: var(--fg-2); line-height: 18px; font-weight: 500; }
.tag.ok { background: var(--jade-a3); color: var(--jade-11); }
.cm-text { margin: 4px 0 0; color: var(--fg); font-size: var(--text-nav); line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
.cm.top > .cm-main > .cm-text { margin-top: 6px; font-size: 14px; }
.cm-acts { display: flex; gap: 12px; margin-top: 4px; }
.act { padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; }
.act:hover { color: var(--fg); }
.cm-reply { margin-top: 8px; overflow: clip; border: 1px solid var(--slate-a4); border-radius: 10px; background: var(--slate-2); }
.cm-reply:focus-within { border-color: var(--slate-a7); }
.cm-reply-body { display: flex; align-items: flex-start; gap: 10px; padding: 10px 10px 4px; }
.cm-reply-body .av { flex: none; }
.cm-reply textarea { flex: 1; display: block; min-width: 0; padding: 2px 0 0; border: 0; background: none; resize: vertical; color: var(--fg); font: inherit; font-size: var(--text-nav); outline: none; }
.cm-reply textarea::placeholder { color: var(--fg-faint); }
/* The utility bar: a darker strip under a hairline, apart from what you write. */
.cm-bar { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding: 6px 6px 6px; border-top: 1px solid var(--slate-a3); background: var(--composer-bar); }

/* Poll bar */
.share { display: flex; align-items: center; gap: 10px; margin: 8px 0 2px; }
.bar { flex: 1; height: 6px; border-radius: 3px; background: var(--slate-a3); overflow: hidden; }
.bar i { display: block; height: 100%; border-radius: 3px; background: var(--slate-a8); transition: width 300ms cubic-bezier(0.23, 1, 0.32, 1); }
.share.lead .bar i { background: var(--indigo-9); }
.decided .share.lead .bar i { background: var(--jade-9); }
.pct { width: 36px; text-align: right; font-size: var(--text-sm); color: var(--fg-muted); }
.share.lead .pct { color: var(--indigo-11); }
.decided .share.lead .pct { color: var(--jade-11); }

/* Back this / against */
.cm-acts { align-items: center; }
.votes { display: flex; align-items: stretch; gap: 4px; margin-left: auto; }
.vote-back, .against {
  display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box; height: 30px; border: 1px solid var(--slate-a5); border-radius: 8px;
  background: var(--slate-a2); color: var(--fg-2); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
  transition: background-color 120ms, border-color 120ms, color 120ms, transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
}
.vote-back { padding: 0 6px 0 8px; }
.against { justify-content: center; width: 30px; padding: 0; color: var(--fg-muted); }
.vote-back:hover, .against:hover { background: var(--slate-a4); color: var(--fg); }
.vote-back:active, .against:active { transform: scale(0.96); }
.vote-back svg, .against svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.vote-back .n { min-width: 26px; padding: 1px 5px; border-radius: 5px; background: var(--slate-a3); color: var(--fg); text-align: center; }
.vote-back[aria-pressed='true'] { border-color: transparent; background: var(--indigo-9); color: #fff; box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2); }
.vote-back[aria-pressed='true'] .n { background: rgb(255 255 255 / 0.18); color: #fff; }
.against[aria-pressed='true'] { border-color: transparent; background: var(--red-9); color: #fff; }
.vote-back:focus-visible, .against:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.final { font-size: var(--text-nav); font-weight: 600; color: var(--fg); }
.ghost { padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.primary { border: 0; background: var(--indigo-9); color: #fff; font: inherit; font-weight: 500; cursor: pointer; }
.primary.sm { height: 26px; padding: 0 10px; border-radius: 7px; font-size: var(--text-sm); }
.primary:disabled { opacity: 0.4; cursor: default; }
.cm-kids { margin-top: 2px; padding-left: 12px; border-left: 2px solid var(--slate-a3); }
.cm-kids:hover { border-left-color: var(--slate-a5); }
.cm-kids.flat { padding-left: 0; border-left: 0; }
</style>
