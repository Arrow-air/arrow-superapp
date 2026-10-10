<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Avatar from '../modules/threads/Avatar.vue';
import { awardOf, projectThreads, state, type Work } from '../modules/threads/store';
import { zoneLabel } from '../frame/nav';

// Bounties and grants drafted from decisions. Each one lives on its thread;
// this is the list across all of them, by where they stand.
const route = useRoute();
const router = useRouter();
const order: { stage: Work['stage']; label: string }[] = [
  { stage: 'open', label: 'Open to claim' },
  { stage: 'in_progress', label: 'In progress' },
  { stage: 'in_review', label: 'Waiting for review' },
  { stage: 'draft', label: 'Drafts' },
  { stage: 'completed', label: 'Accepted' },
  { stage: 'withdrawn', label: 'Withdrawn (decision reopened)' },
];
// Only this project's work: work belongs to the project of the thread it was funded from.
const mine = computed(() => { const ids = new Set(projectThreads.value.map((t) => t.id)); return state.work.filter((w) => ids.has(w.threadId)); });
const groups = computed(() => order.map((o) => ({ ...o, items: mine.value.filter((w) => w.stage === o.stage) })).filter((g) => g.items.length));
const live = (w: Work) => w.stage !== 'draft' && w.stage !== 'withdrawn';
const committed = computed(() => mine.value.filter(live).reduce((s, w) => s + w.reward, 0));
const threadOf = (w: Work) => state.threads.find((t) => t.id === w.threadId);
const open = (w: Work) => router.replace({ query: { ...route.query, thread: w.threadId } });
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">Grants and bounties</h1>
        <p class="view-lede">
          Work funded from decisions. A thread is discussed, a lead adopts a position into the spec, and the decision becomes a bounty anyone can claim or a grant someone takes on.
          The person whose idea was adopted gets a 25% proposer award. Rewards are records in ARROW; nothing is paid from the app.
        </p>
      </div>
    </div>
    <p v-if="!mine.length" class="vempty">
      Nothing funded yet. Open a decided thread and, as a lead, choose "Fund it as a bounty or grant". What's on GitHub is under Work › From GitHub.
    </p>
    <p v-else class="muted sum"><b>{{ committed.toLocaleString('en-US') }}</b> ARROW published across {{ mine.filter(live).length }} of {{ mine.length }}</p>
    <section v-for="g in groups" :key="g.stage" class="view-section">
      <h2>{{ g.label }}</h2>
      <table class="vt">
        <tbody>
          <tr v-for="w in g.items" :key="w.id" class="clickable" @click="open(w)">
            <td class="mono muted nowrap">{{ w.id }}</td>
            <td>
              <span class="t">{{ w.title }}</span>
              <div class="sub">
                <span class="chip">{{ w.kind === 'bounty' ? 'Bounty' : 'Grant' }}</span>
                <span class="chip indigo">{{ w.decision }}</span>
                <span v-if="threadOf(w)" class="muted">{{ zoneLabel(threadOf(w)!.zone) }}</span>
              </div>
            </td>
            <td class="nowrap">
              <span v-if="w.ownerId" class="who"><Avatar :id="w.ownerId" :size="16" /> {{ w.ownerId === 'me' ? 'You' : w.ownerId }}</span>
              <span v-else class="muted">Unclaimed</span>
            </td>
            <td class="num">{{ w.reward.toLocaleString('en-US') }}<div class="muted small">award {{ awardOf(w).toLocaleString('en-US') }}</div></td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.sum b { color: var(--fg); }
.clickable { cursor: pointer; }
.t { color: var(--fg); }
.sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; font-size: var(--text-sm); }
.who { display: inline-flex; align-items: center; gap: 6px; }
.nowrap { white-space: nowrap; }
.small { font-size: var(--text-sm); }
</style>
