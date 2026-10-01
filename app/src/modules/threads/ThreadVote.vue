<script setup lang="ts">
import { computed } from 'vue';
import type { Thread } from './data';
import { isOpen, myThreadVote, threadScore, voteThread } from './store';

// Up and down on the thread itself, Reddit style: the same arrows as the
// comments, weighted the same way. Locked once the thread is decided or declined.
const props = defineProps<{ thread: Thread; size?: 'sm' | 'md' }>();
const open = computed(() => isOpen(props.thread));
const n = computed(() => props.thread.threadVotes?.length ?? 0);
</script>

<template>
  <div class="tv" :class="size ?? 'md'" role="group" aria-label="Vote on this thread" @click.stop>
    <button class="v up" type="button" :aria-pressed="myThreadVote(thread) === 1" :disabled="!open" aria-label="Upvote thread" @click="voteThread(thread, 1)">
      <svg viewBox="0 0 16 16"><path d="m4 10 4-4 4 4" /></svg>
    </button>
    <span class="n mono" :title="`Weighted score of the thread, from ${n} ${n === 1 ? 'vote' : 'votes'}`">{{ threadScore(thread) }}</span>
    <button class="v down" type="button" :aria-pressed="myThreadVote(thread) === -1" :disabled="!open" aria-label="Downvote thread" @click="voteThread(thread, -1)">
      <svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>
    </button>
  </div>
</template>

<style scoped>
.tv { display: flex; flex-direction: column; align-items: center; flex: none; }
.md { width: 32px; }
.sm { width: 26px; }
.v { display: grid; place-items: center; padding: 0; border: 0; border-radius: 6px; background: none; color: var(--fg-faint); cursor: pointer; transition: background-color 120ms, color 120ms; }
.md .v { width: 28px; height: 22px; }
.sm .v { width: 24px; height: 18px; }
.v svg { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.md .v svg { width: 16px; height: 16px; }
.sm .v svg { width: 14px; height: 14px; }
.v:hover:not(:disabled) { background: var(--slate-a3); color: var(--fg); }
.v.up[aria-pressed='true'] { color: var(--indigo-11); background: var(--indigo-a3); }
.v.down[aria-pressed='true'] { color: var(--red-11); background: var(--red-a3, var(--slate-a3)); }
.v:disabled { cursor: default; opacity: 0.45; }
.v:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.n { padding: 1px 0; font-weight: 600; color: var(--fg-2); }
.md .n { font-size: var(--text-nav); }
.sm .n { font-size: var(--text-sm); }
.mono { font-family: var(--font-mono); }
</style>
