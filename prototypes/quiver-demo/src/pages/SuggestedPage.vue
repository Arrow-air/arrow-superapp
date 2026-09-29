<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Avatar from '../modules/threads/Avatar.vue';
import { callItems } from '../data/calls';
import { personById } from '../data/people';
import { zoneLabel, zonePath, zoneTab } from '../frame/nav';
import { startThread, state } from '../modules/threads/store';

// Questions, proposals and gaps from the calls that no thread has picked up.
// They are not open questions until someone starts a discussion, and they are
// never counted as decided.
const router = useRouter();
const picked = (id: string, seeded?: string) => !!seeded || state.threads.some((t) => t.source?.kind === 'call' && t.source.ref === id);
const open = computed(() => callItems.filter((c) => ['question', 'proposal', 'gap'].includes(c.kind) && !picked(c.id, c.thread)));
const kindLabel = { question: 'Question', proposal: 'Proposal', gap: 'Gap' } as Record<string, string>;

function start(c: (typeof callItems)[number]) {
  const t = startThread({
    zone: c.zone,
    context: zoneTab(c.zone)?.id ?? 'overview',
    title: c.text.length > 90 ? `${c.text.slice(0, 87).trimEnd()}…` : c.text,
    body: `From the ${c.call.date} call notes, which name ${c.who.map((w) => personById(w)?.name).join(' and ')}: ${c.text}`,
    type: c.kind === 'proposal' ? 'proposal' : 'question',
    fromCall: c.id,
  });
  router.push({ path: zonePath(c.zone), query: { thread: t.id } });
}
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">Suggested from calls</h1>
        <p class="view-lede">Questions and gaps the call notes raise that no thread carries yet. Starting a discussion puts it in its zone, with a link back to the notes; the thread is yours, and the notes are credited as the source.</p>
      </div>
    </div>
    <p v-if="!open.length" class="vempty">Every question from the calls has a thread.</p>
    <ul class="list">
      <li v-for="c in open" :key="c.id" class="item">
        <div class="main">
          <p><span class="kind">{{ kindLabel[c.kind] }}</span> {{ c.text }}</p>
          <div class="meta">
            <span class="who"><Avatar v-for="w in c.who" :key="w" :id="w" :size="14" /> named in the {{ c.call.date }} notes</span>
            <span class="dot">·</span>
            <RouterLink :to="zonePath(c.zone)" class="link">{{ zoneLabel(c.zone) }}</RouterLink>
          </div>
        </div>
        <button class="vbtn" type="button" @click="start(c)">Start a discussion</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list { margin: 0; padding: 0; list-style: none; }
.item { display: flex; align-items: center; gap: 16px; padding: 12px 0; }
.item + .item { border-top: 1px solid var(--slate-a3); }
.main { flex: 1; min-width: 0; }
.main p { margin: 0; color: var(--fg); font-size: var(--text-nav); line-height: 1.55; }
.kind { margin-right: 4px; font-size: var(--text-sm); font-weight: 500; color: var(--amber-11); }
.meta { display: flex; align-items: center; margin-top: 4px; font-size: var(--text-sm); color: var(--fg-muted); }
.who { display: inline-flex; align-items: center; gap: 4px; }
.who .av + .av { margin-left: -4px; }
</style>
