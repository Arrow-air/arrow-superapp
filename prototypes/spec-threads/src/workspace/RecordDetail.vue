<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Markdown from '../components/Markdown.vue';
import FollowRecord from '../components/FollowRecord.vue';
import { isExampleWorkspace } from '../data/projectDataMode';
import { act, backend, state } from '../data/store';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import { recordLinks, recordState, systemName, firstLine, decisionTitle } from './derive';
import { origin, recordStatus, shortDate, sourceKind } from './labels';

const props = defineProps<{ recordId: string }>();
const { view, go, router, to } = useNav();
const { data, isMember } = useProject();
const record = computed(() => data.value?.evidence.records.find((r) => r.id === props.recordId));
const link = computed(() => (data.value ? recordLinks(data.value).get(props.recordId) : undefined));
const sources = computed(() => (record.value && data.value ? data.value.evidence.sources.filter((s) => record.value!.sourceIds.includes(s.id)) : []));
const related = computed(() => (record.value && data.value ? data.value.evidence.records.filter((r) => record.value!.relatedIds.includes(r.id)) : []));
const composing = ref(false), title = ref(''), body = ref(''), busy = ref(false);
watch(record, (r) => { if (r) title.value = r.title; }, { immediate: true });
const cta = computed(() => (record.value?.kind === 'question' ? 'Discuss this' : record.value?.kind === 'work' ? 'Discuss this work' : 'Question or refine this'));
// Mirrors the server: questions about the aircraft in build stay with it; the rest go to the version in discussion.
const targetName = computed(() => {
  const versions = data.value?.project.versions ?? [];
  const discussing = versions.find((v) => v.state === 'discussing'), building = versions.find((v) => v.state === 'building');
  if (discussing && record.value?.versions.includes(discussing.id)) return `${discussing.name}, the version being designed`;
  if (building && record.value?.versions.includes(building.id)) return `${building.name}, the aircraft in build`;
  return discussing?.name ?? 'the version in discussion';
});
const listView = computed(() => (view.value === 'overview' ? 'overview' : view.value));
function back() {
  if (window.history.state?.back) router.back();
  else go(record.value?.kind === 'design' ? 'spec' : record.value?.kind === 'work' || record.value?.kind === 'result' ? 'work' : 'discussions');
}
async function start() {
  if (!backend.startFromEvidence || !body.value.trim() || busy.value) return;
  busy.value = true;
  let thread: { id: string } | undefined;
  const ok = await act(async () => { thread = await backend.startFromEvidence!({ recordId: props.recordId, title: title.value.trim() || undefined, body: body.value.trim() }); });
  busy.value = false;
  if (ok && thread) await router.replace(to('discussions', { thread: thread.id }));
}
const outcomeLine = computed(() => {
  const r = link.value?.bundle.thread.resolution;
  if (!r) return '';
  if (link.value?.decision) return decisionTitle(link.value.decision);
  if (r.kind === 'conclude') return firstLine(r.snapshot.body);
  if (r.kind === 'reject') return r.note;
  return '';
});
</script>

<template>
  <article v-if="record && data" class="pw-detail">
    <button class="pw-back" @click="back">← Back</button>
    <p class="pw-eyebrow">{{ origin(data.evidence, record) }} · {{ systemName(data.evidence, record.systems[0]) }} · {{ record.versions.join(' / ') }}</p>
    <h2 class="pw-detail-title" tabindex="-1">{{ record.title }}</h2>
    <p class="pw-lede">{{ record.summary }}</p>
    <p class="pw-row"><span class="pw-status" :data-status="link?.state === 'answered' ? 'answered' : record.status">{{ link?.state === 'answered' ? 'Answered' : link?.state === 'discussing' ? 'Being discussed' : recordStatus[record.status] }}</span><span v-if="record.owner" class="pw-muted">Named in the notes: {{ record.owner }}</span><FollowRecord v-if="state.me" :target="record.id" /></p>

    <section v-if="link" class="pw-callout" :data-tone="link.state">
      <template v-if="link.state === 'discussing'">
        <strong>The team is discussing this</strong>
        <p>{{ link.bundle.positions.length }} {{ link.bundle.positions.length === 1 ? 'contribution' : 'contributions' }} · started by {{ nameOf(link.bundle.thread.authorId) }} on {{ shortDate(link.bundle.thread.createdAt) }}</p>
      </template>
      <template v-else-if="link.state === 'answered'">
        <strong>{{ link.decision ? 'Decided' : 'Concluded' }}: {{ outcomeLine }}</strong>
        <p>Recorded by {{ nameOf(link.bundle.thread.resolution?.byMemberId) }} on {{ shortDate(link.bundle.thread.resolution!.at) }}</p>
      </template>
      <template v-else><strong>Not pursued</strong><p>{{ outcomeLine }}</p></template>
      <RouterLink class="pw-link" :to="to('discussions', { thread: link.bundle.thread.id })">Open the discussion →</RouterLink>
    </section>
    <section v-else-if="isMember" class="pw-callout">
      <template v-if="!composing"><strong>Nobody has picked this up in the app yet.</strong><p>Start a discussion with what you know or want to find out. It goes into {{ targetName }}.</p><button class="pw-btn" @click="composing = true">{{ cta }}</button></template>
      <form v-else class="pw-form" @submit.prevent="start">
        <label>Question<input v-model="title" maxlength="240" required /></label>
        <label>Your opening contribution<textarea v-model="body" required placeholder="What do you know, suspect, or need to find out? A short expert hint is enough." /></label>
        <p class="pw-muted pw-small">The background and sources above are attached for everyone.</p>
        <div class="pw-row"><button class="pw-btn" :disabled="busy || !body.trim()">{{ busy ? 'Starting…' : 'Start discussion' }}</button><button type="button" class="pw-btn pw-btn-quiet" @click="composing = false">Cancel</button></div>
      </form>
    </section>
    <p v-else-if="!state.me" class="pw-callout"><template v-if="isExampleWorkspace">Pick someone under “Explore as” at the top to start a discussion about this.</template><template v-else><RouterLink to="/sign-in">Sign in</RouterLink> to start a discussion about this.</template></p>

    <section v-if="record.next && link?.state !== 'answered'" class="pw-next"><strong>Next step</strong><p>{{ record.next }}</p></section>
    <section class="pw-prose"><Markdown :source="record.body" /></section>
    <section v-if="sources.length" class="pw-section">
      <h3>Sources</h3>
      <a v-for="s in sources" :key="s.id" :href="s.url" target="_blank" rel="noopener" class="pw-source"><span class="pw-eyebrow">{{ sourceKind[s.kind] }} · {{ shortDate(s.date) }}</span><strong>{{ s.title }} ↗</strong><span v-if="s.note" class="pw-muted pw-small">{{ s.note }}</span></a>
    </section>
    <section v-if="related.length" class="pw-section">
      <h3>Related</h3>
      <RouterLink v-for="r in related" :key="r.id" :to="to(listView, { record: r.id })" class="pw-item"><span class="pw-eyebrow">{{ recordState(data, r).label || recordStatus[r.status] }} · {{ systemName(data.evidence, r.systems[0]) }}</span><strong>{{ r.title }}</strong></RouterLink>
    </section>
  </article>
  <section v-else class="pw-empty"><h2>Not found</h2><p>This record isn’t in the Spearhead workspace. The link may be out of date.</p><RouterLink class="pw-link" :to="to('overview')">Back to the overview →</RouterLink></section>
</template>
