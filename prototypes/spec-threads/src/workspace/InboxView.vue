<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import FollowRecord from '../components/FollowRecord.vue';
import { state, refresh } from '../data/store';
import { api } from '../data/sharedBackend';
import { isSharedProject } from '../data/projectDataMode';
import { trackingOf } from '../lib/projectRecords';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import { activityLabel, describe } from './activity';
import { dateTime, stageLabel } from './labels';

interface Note { id: number; read_at: string | null; action: string; entity_id: string | null; title: string; at: string; actor_id?: string | null; data?: any }
interface Event { id: number; actor_id: string | null; action: string; entity_id: string | null; title: string; at: string }
const { to, router } = useNav();
const { data, isLead } = useProject();
const notes = ref<Note[]>([]), events = ref<Event[]>([]), error = ref(''), busy = ref(false);
async function load() {
  if (!state.me || !isSharedProject) return;
  try { [notes.value, events.value] = await Promise.all([api<Note[]>('/notifications'), api<Event[]>('/events')]); error.value = ''; } catch (e: any) { error.value = e.message; }
}
watch(() => [state.me?.id, state.version], load, { immediate: true });
const unread = computed(() => notes.value.filter((n) => !n.read_at).length);
const needs = computed(() => {
  if (!data.value || !state.me) return [];
  const review = isLead.value ? data.value.grants.filter((g) => trackingOf(g).stage === 'in_review').map((g) => ({ g, why: `${nameOf(trackingOf(g).ownerId)} submitted results for your review` })) : [];
  const mine = data.value.grants.filter((g) => trackingOf(g).ownerId === state.me!.id && ['open', 'in_progress'].includes(trackingOf(g).stage)).map((g) => ({ g, why: `Assigned to you · ${stageLabel[trackingOf(g).stage].toLowerCase()}` }));
  return [...review, ...mine];
});
function target(entity: string | null, action: string) {
  if (!data.value || !entity) return action === 'reconciliation' ? to('sources') : to('overview');
  if (data.value.grants.some((g) => g.id === entity)) return to('work', { grant: entity });
  if (data.value.bundles.some((b) => b.thread.id === entity)) return to('discussions', { thread: entity });
  if (data.value.members.some((m) => m.id === entity)) return to('people', { person: entity });
  if (data.value.project.versions.some((v) => v.id === entity)) return to('freeze');
  if (data.value.evidence.records.some((r) => r.id === entity)) return to('discussions', { record: entity });
  return to('overview');
}
async function open(n: Note) {
  if (!n.read_at) notes.value = await api<Note[]>('/notifications', { method: 'POST', body: JSON.stringify({ id: Number(n.id) }) }).catch(() => notes.value);
  await router.push(target(n.entity_id, n.action));
  await refresh();
}
async function markAll() {
  busy.value = true;
  try { notes.value = await api<Note[]>('/notifications', { method: 'POST', body: JSON.stringify({ all: true }) }); await refresh(); } catch (e: any) { error.value = e.message; } finally { busy.value = false; }
}
</script>

<template>
  <div>
    <p v-if="!isSharedProject" class="pw-card pw-muted">The inbox needs the shared workspace service; the example keeps no notifications.</p>
    <p v-else-if="!state.me" class="pw-card"><RouterLink to="/sign-in">Sign in</RouterLink> to see your inbox.</p>
    <template v-else>
      <div class="pw-page-head">
        <div><h2>Inbox</h2><p class="pw-muted">What needs you, and updates on things you follow or took part in.</p></div>
        <div class="pw-row"><FollowRecord target="project" /><button class="pw-btn pw-btn-quiet" :disabled="busy || !unread" @click="markAll">Mark all read</button></div>
      </div>
      <p v-if="error" role="alert" class="pw-warn">{{ error }}</p>
      <section v-if="needs.length" class="pw-card pw-card-alert">
        <h3>Needs you</h3>
        <RouterLink v-for="{ g, why } in needs" :key="g.id" :to="to('work', { grant: g.id })" class="pw-item"><strong>{{ g.title }}</strong><span class="pw-muted">{{ why }}</span></RouterLink>
      </section>
      <section class="pw-card">
        <h3>Updates <span v-if="unread" class="pw-count pw-count-alert">{{ unread }} new</span></h3>
        <p v-if="!notes.length" class="pw-muted">Nothing yet. You’ll hear about replies to your discussions, work you own, and anything you follow.</p>
        <button v-for="n in notes" :key="n.id" class="pw-note" :class="{ unread: !n.read_at }" @click="open(n)">
          <span class="pw-eyebrow">{{ n.title }} · {{ dateTime(n.at) }}</span>
          <strong>{{ describe(n.action, n.data, n.actor_id ? nameOf(n.actor_id) : 'Workspace') }}</strong>
        </button>
      </section>
      <details class="pw-card">
        <summary>All project activity</summary>
        <RouterLink v-for="e in events" :key="e.id" :to="target(e.entity_id, e.action)" class="pw-item"><span class="pw-eyebrow">{{ activityLabel(e.action) }} · {{ e.actor_id ? nameOf(e.actor_id) : 'System' }} · {{ dateTime(e.at) }}</span><strong>{{ e.title }}</strong></RouterLink>
      </details>
    </template>
  </div>
</template>
