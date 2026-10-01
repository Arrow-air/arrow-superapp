<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import ZoneSections from '../modules/zone/ZoneSections.vue';
import GateList from '../modules/zone/GateList.vue';
import AttachmentCard from '../modules/zone/AttachmentCard.vue';
import LongshotCard from '../modules/zone/LongshotCard.vue';
import type { Thread } from '../modules/threads/data';
import { byActivity, isOpen, startThread, threadsInZone } from '../modules/threads/store';
import { zoneById } from '../data/zones';
import { zoneLabel } from '../frame/nav';

// A working zone is one page that scrolls: what it is, its discussion, then
// what the call notes and GitHub already say about it. Threads open in the
// side panel, so the zone stays in view.
const props = defineProps<{ zone: string; gate?: boolean }>();
const route = useRoute();
const router = useRouter();
const z = computed(() => zoneById(props.zone));

const all = computed(() => threadsInZone(props.zone));
const open = computed(() => all.value.filter(isOpen).sort(byActivity));
const decided = computed(() => all.value.filter((t) => !isOpen(t)).sort(byActivity));
const showDecided = ref(false);

const composing = ref(false);
const draft = ref({ title: '', body: '', type: 'question' as Thread['type'] });
const kinds: { id: Thread['type']; label: string; hint: string }[] = [
  { id: 'question', label: 'Question', hint: 'Something that needs deciding' },
  { id: 'proposal', label: 'Proposal', hint: 'A change you want to make' },
  { id: 'idea', label: 'Idea', hint: 'Early, not ready to decide' },
];
async function create() {
  if (!draft.value.title.trim()) return;
  const t = await startThread({ zone: props.zone, title: draft.value.title.trim(), body: draft.value.body.trim(), type: draft.value.type });
  draft.value = { title: '', body: '', type: 'question' };
  composing.value = false;
  if (t) router.replace({ query: { ...route.query, thread: t.id } });
}
</script>

<template>
  <div class="zp">
    <header class="zp-head">
      <h1 class="zp-title">{{ zoneLabel(zone) }}</h1>
      <p v-if="z" class="zp-sum">{{ z.summary }}</p>
    </header>

    <AttachmentCard v-if="z?.attachment" :id="z.attachment" />
    <LongshotCard v-if="z?.card === 'longshot'" />
    <div v-if="gate" class="gate-wrap"><GateList /></div>

    <section class="disc">
      <div class="disc-head">
        <h2 class="sec-h">Discussion <span v-if="open.length" class="count">{{ open.length }} open</span></h2>
        <button v-if="!composing" class="new-btn" type="button" @click="composing = true">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg> New thread
        </button>
      </div>

      <form v-if="composing" class="new-form" @submit.prevent="create">
        <div class="kinds" role="radiogroup" aria-label="Kind of thread">
          <button v-for="k in kinds" :key="k.id" type="button" role="radio" :aria-checked="draft.type === k.id" :title="k.hint" @click="draft.type = k.id">{{ k.label }}</button>
        </div>
        <input v-model="draft.title" class="nf-title" placeholder="Title: what should the group weigh in on?" aria-label="Title" autofocus />
        <textarea v-model="draft.body" rows="3" placeholder="Context: what you know, what it affects, links" aria-label="Thread context"></textarea>
        <div class="nf-bar">
          <span class="hint">You can add positions for people to vote on once it's open.</span>
          <span class="nf-actions">
            <button class="ghost" type="button" @click="composing = false">Cancel</button>
            <button class="primary" type="submit" :disabled="!draft.title.trim()">Start thread</button>
          </span>
        </div>
      </form>

      <div class="list">
        <ThreadRows v-if="open.length" :threads="open" />
        <p v-else-if="!composing" class="empty">
          No open threads here. <button class="link" type="button" @click="composing = true">Start one</button>: a question to decide, a proposal, or an early idea.
        </p>
      </div>

      <div v-if="decided.length" class="decided">
        <button class="toggle" type="button" :aria-expanded="showDecided" @click="showDecided = !showDecided">
          <svg viewBox="0 0 16 16" aria-hidden="true" :class="{ open: showDecided }"><path d="m6 4 4 4-4 4" /></svg>
          Closed ({{ decided.length }})
        </button>
        <div v-if="showDecided" class="list"><ThreadRows :threads="decided" /></div>
      </div>
    </section>

    <ZoneSections :zone="zone" />
  </div>
</template>

<style scoped>
.zp { max-width: 880px; padding: 24px 28px 64px; }
.zp-title { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: var(--fg); }
.zp-sum { margin: 8px 0 0; max-width: 720px; color: var(--fg-2); font-size: var(--text-nav); line-height: 1.6; }
.gate-wrap { margin-top: 18px; }
.disc { margin-top: 28px; }
.disc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sec-h { margin: 0; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.count { margin-left: 6px; color: var(--fg-muted); }
.list { border: 1px solid var(--slate-a4); border-radius: 12px; overflow: hidden; background: var(--slate-a1, transparent); }
.empty { margin: 0; padding: 18px 16px; color: var(--fg-muted); font-size: var(--text-nav); }
.link { padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; cursor: pointer; }
.link:hover { text-decoration: underline; }
.new-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border: 1px solid var(--slate-a5); border-radius: 8px;
  background: none; color: var(--fg-2); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
}
.new-btn:hover { color: var(--fg); border-color: var(--slate-a7); }
.new-btn svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.new-form { display: grid; gap: 8px; margin-bottom: 10px; padding: 12px; border: 1px solid var(--slate-a5); border-radius: 12px; background: var(--slate-a2); }
.kinds { display: inline-flex; gap: 2px; width: fit-content; padding: 2px; border-radius: 8px; background: var(--slate-a3); }
.kinds button { height: 24px; padding: 0 10px; border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; }
.kinds button[aria-checked='true'] { background: var(--slate-a5); color: var(--fg); }
.new-form input, .new-form textarea { width: 100%; border: 0; background: none; color: var(--fg); font: inherit; outline: none; resize: vertical; }
.nf-title { font-size: 15px; font-weight: 500; }
.new-form textarea { font-size: var(--text-nav); color: var(--fg-2); line-height: 1.5; }
.new-form ::placeholder { color: var(--fg-faint); }
.nf-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hint { font-size: var(--text-sm); color: var(--fg-faint); }
.nf-actions { display: inline-flex; align-items: center; gap: 10px; }
.ghost { padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.ghost:hover { color: var(--fg); }
.primary {
  height: 30px; padding: 0 14px; border: 0; border-radius: 8px; background: var(--indigo-9); color: #fff;
  font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer;
}
.primary:disabled { opacity: 0.4; cursor: default; }
.decided { margin-top: 10px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 8px; padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.toggle:hover { color: var(--fg); }
.toggle svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; transition: transform 150ms; }
.toggle svg.open { transform: rotate(90deg); }
@media (max-width: 767px) { .zp { padding: 16px; } }
</style>
