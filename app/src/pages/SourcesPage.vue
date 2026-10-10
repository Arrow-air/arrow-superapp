<script setup lang="ts">
import { computed, nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Avatar from '../modules/threads/Avatar.vue';
import { callsOf } from '../data/calls';
import { useWorkspace } from '../frame/useWorkspace';
import { personById } from '../data/people';
import { zoneLabel, zonePath } from '../frame/nav';
import { state } from '../modules/threads/store';

// Call notes: reference material, not decisions. Each item names who said it
// and links to the zone it belongs to and any thread that picked it up.
const route = useRoute();
const { project } = useWorkspace();
const calls = computed(() => callsOf(project.value?.id ?? 'quiver'));
const hit = computed(() => route.query.item as string | undefined);
const kindLabel = { update: 'Update', question: 'Question', proposal: 'Proposal', agreement: 'Agreed', gap: 'Gap' } as const;
const threadFor = (id: string, seeded?: string) =>
  seeded ?? state.threads.find((t) => t.source?.kind === 'call' && t.source.ref === id)?.id;
onMounted(async () => {
  await nextTick();
  if (hit.value) document.querySelector(`[data-item="${hit.value}"]`)?.scrollIntoView({ block: 'center' });
});
</script>

<template>
  <div class="view">
    <p v-if="!calls.length" class="vempty">No call notes for {{ project?.label }} yet.</p>
    <div v-for="c in calls" :key="c.id">
      <div class="view-head">
        <div>
          <h1 class="view-title">{{ c.title }}, {{ c.date }}</h1>
          <p v-if="c.url" class="named muted"><a :href="c.url" target="_blank" rel="noopener" class="link">The published notes</a></p>
          <p class="view-lede">{{ c.lede ?? 'Curated from the transcript: Quiver items only, in plain words. The recording and the full transcript are not in the app.' }} A note is what someone said, not a decision; it becomes a thread when someone starts one.</p>
          <p class="named muted">Named in these notes:
            <span v-for="n in c.named" :key="n" class="who"><Avatar :id="n" :size="16" /> {{ personById(n)?.name }}</span>
          </p>
        </div>
      </div>
      <ol class="items">
        <li v-for="i in c.items" :key="i.id" :data-item="i.id" class="item" :class="{ hit: i.id === hit }">
          <span class="kind" :data-kind="i.kind">{{ kindLabel[i.kind] }}</span>
          <div class="main">
            <p>{{ i.text }}</p>
            <div class="meta">
              <span class="who-list"><Avatar v-for="w in i.who" :key="w" :id="w" :size="14" /> {{ i.who.map((w) => personById(w)?.name).join(', ') }}</span>
              <span class="dot">·</span>
              <RouterLink :to="zonePath(i.zone)" class="link">{{ zoneLabel(i.zone) }}</RouterLink>
              <template v-if="threadFor(i.id, i.thread)">
                <span class="dot">·</span>
                <RouterLink :to="{ query: { ...$route.query, thread: threadFor(i.id, i.thread) } }" class="link">{{ threadFor(i.id, i.thread) }}</RouterLink>
              </template>
            </div>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.named { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: 10px 0 0; font-size: var(--text-sm); }
.who { display: inline-flex; align-items: center; gap: 5px; color: var(--fg-2); }
.items { margin: 0; padding: 0; list-style: none; }
.item { display: flex; gap: 14px; padding: 12px 10px; margin: 0 -10px; border-radius: 8px; }
.item + .item { border-top: 1px solid var(--slate-a3); }
.item.hit { background: var(--indigo-a3); }
.kind { flex: none; width: 64px; padding-top: 2px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-muted); }
.kind[data-kind='question'], .kind[data-kind='gap'] { color: var(--amber-11); }
.kind[data-kind='proposal'] { color: var(--indigo-11); }
.kind[data-kind='agreement'] { color: var(--jade-11); }
.main p { margin: 0; color: var(--fg); font-size: var(--text-nav); line-height: 1.55; }
.meta { display: flex; flex-wrap: wrap; align-items: center; margin-top: 4px; font-size: var(--text-sm); color: var(--fg-muted); }
.who-list { display: inline-flex; align-items: center; gap: 3px; }
.who-list .av + .av { margin-left: -4px; }
</style>
