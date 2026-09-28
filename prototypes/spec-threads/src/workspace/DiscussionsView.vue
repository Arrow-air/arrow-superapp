<script setup lang="ts">
import { computed, ref } from 'vue';
import WorkspaceDiscussion from '../components/WorkspaceDiscussion.vue';
import RecordAttachments from '../components/RecordAttachments.vue';
import FollowRecord from '../components/FollowRecord.vue';
import { act, backend, state } from '../data/store';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import QuestionRow from './QuestionRow.vue';
import { callSuggestions, discussingVersion, firstLine, lastActivity, openQuestions, recentOutcomes, systemName, type QuestionItem } from './derive';
import { origin, shortDate } from './labels';

const { q, patch, go, to, router } = useNav();
const { data, isMember } = useProject();
const pt2 = computed(() => (data.value ? discussingVersion(data.value.project) : undefined));
const versions = computed(() => (data.value ? [...data.value.project.versions].sort((a, b) => a.order - b.order) : []));
const status = computed(() => (['settled', 'all', 'suggested'].includes(q('status')) ? q('status') : 'open'));
const suggestions = computed(() => (data.value ? callSuggestions(data.value).filter((i) => matches(`${i.title} ${i.summary}`, i.system)) : []));
// Accept a version by id or by name (PT3 links use the name).
const versionId = computed(() => { const v = q('version'); return v === 'all' ? 'all' : versions.value.find((x) => x.id === v || x.name === v)?.id ?? pt2.value?.id ?? ''; });
const system = computed(() => q('system'));
const search = computed({ get: () => q('find'), set: (v: string) => void patch({ find: v || undefined }) });
const selected = computed(() => data.value?.bundles.find((b) => b.thread.id === q('thread')));
const sourceRecord = computed(() => selected.value?.thread.sourceRecordId ? data.value?.evidence.records.find((r) => r.id === selected.value!.thread.sourceRecordId) : undefined);

const matches = (text: string, sys: string) => (!system.value || sys === system.value) && text.toLowerCase().includes(search.value.toLowerCase());
const open = computed<QuestionItem[]>(() => {
  if (!data.value) return [];
  const ids = versionId.value === 'all' ? versions.value.map((v) => v.id) : [versionId.value];
  return ids.flatMap((id) => openQuestions(data.value!, id)).filter((i) => matches(`${i.title} ${i.summary}`, i.system));
});
const settled = computed(() => {
  if (!data.value) return [];
  const ids = versionId.value === 'all' ? versions.value.map((v) => v.id) : [versionId.value];
  const rows = ids.flatMap((id) => recentOutcomes(data.value!, id).map((o) => ({ ...o, rejected: false })));
  const rejected = data.value.bundles.filter((b) => b.thread.resolution?.kind === 'reject' && ids.includes(b.thread.versionId)).map((b) => ({ bundle: b, decision: undefined, summary: b.thread.resolution?.kind === 'reject' ? b.thread.resolution.note : '', at: b.thread.resolution!.at, adopted: false, rejected: true }));
  return [...rows, ...rejected].filter((o) => matches(`${o.bundle.thread.title} ${o.summary}`, o.bundle.thread.system || 'project-wide')).sort((a, b) => b.at.localeCompare(a.at));
});

const composing = ref(false), title = ref(''), body = ref(''), newSystem = ref(''), busy = ref(false);
async function create() {
  if (!data.value || busy.value) return;
  busy.value = true;
  let id = '';
  const ok = await act(async () => { id = (await backend.createThread({ projectId: data.value!.project.id, system: newSystem.value || undefined, title: title.value, body: body.value, tags: [] })).id; });
  busy.value = false;
  if (ok) { composing.value = false; title.value = body.value = newSystem.value = ''; await go('discussions', { thread: id }); }
}
function back() { if (window.history.state?.back) router.back(); else go('discussions'); }
</script>

<template>
  <div v-if="data">
    <template v-if="selected">
      <div class="pw-detail-bar"><button class="pw-back" @click="back">← Back</button><FollowRecord :target="selected.thread.id" /></div>
      <p v-if="sourceRecord" class="pw-origin">Raised on the {{ origin(data.evidence, sourceRecord) }}. <RouterLink :to="to('discussions', { record: sourceRecord.id })">Original notes and sources →</RouterLink></p>
      <WorkspaceDiscussion :key="selected.thread.id" :bundle="selected" :project="data.project" @review="go('spec')" @grant="(id) => go('work', { grant: id })" />
      <RecordAttachments v-if="state.me" :entity-id="selected.thread.id" />
    </template>
    <section v-else-if="q('thread')" class="pw-empty"><h2>Discussion not found</h2><p>It may have been moved or the link is out of date.</p><RouterLink class="pw-link" :to="to('discussions')">All discussions →</RouterLink></section>
    <template v-else>
      <div class="pw-page-head">
        <div><h2>Discussions</h2><p class="pw-muted">Questions and proposals for Spearhead. New ones go into {{ pt2?.name }}, the version being designed.</p></div>
        <button v-if="isMember" class="pw-btn" @click="composing = !composing">New discussion</button>
      </div>
      <form v-if="composing" class="pw-card pw-form" @submit.prevent="create">
        <label>Question or proposed change<input v-model="title" maxlength="240" required placeholder="e.g. Should PT2 run two CAN buses?" /></label>
        <label>Context<textarea v-model="body" required placeholder="What prompted this, what you know, and what would help settle it." /></label>
        <label>System<select v-model="newSystem"><option value="">Project-wide</option><option v-for="s in data.project.systems" :key="s" :value="s">{{ systemName(data.evidence, s) }}</option></select></label>
        <div class="pw-row"><button class="pw-btn" :disabled="busy || !title.trim() || !body.trim()">Post discussion</button><button type="button" class="pw-btn pw-btn-quiet" @click="composing = false">Cancel</button></div>
      </form>
      <div class="pw-filters">
        <div class="pw-seg" role="group" aria-label="Status">
          <button :aria-pressed="status === 'open'" @click="patch({ status: undefined })">Open <span>{{ status === 'open' ? open.length : '' }}</span></button>
          <button :aria-pressed="status === 'settled'" @click="patch({ status: 'settled' })">Settled</button>
          <button :aria-pressed="status === 'all'" @click="patch({ status: 'all' })">All</button>
          <button :aria-pressed="status === 'suggested'" @click="patch({ status: 'suggested' })">Suggested from calls <span>{{ suggestions.length }}</span></button>
        </div>
        <label><span class="sr-only">Version</span><select :value="versionId" aria-label="Version" @change="patch({ version: ($event.target as HTMLSelectElement).value === pt2?.id ? undefined : ($event.target as HTMLSelectElement).value })"><option v-for="v in versions" :key="v.id" :value="v.id">{{ v.name }}</option><option value="all">All versions</option></select></label>
        <label><span class="sr-only">System</span><select :value="system" aria-label="System" @change="patch({ system: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All systems</option><option v-for="s in [...data.project.systems, 'project-wide']" :key="s" :value="s">{{ systemName(data.evidence, s) }}</option></select></label>
        <label class="pw-grow"><span class="sr-only">Find</span><input v-model="search" type="search" placeholder="Find a topic…" aria-label="Find a discussion" /></label>
      </div>
      <section v-if="status === 'suggested'" class="pw-card">
        <p class="pw-muted pw-small">Questions and directions from call notes and the repository that nobody has brought into the app yet. They aren't in the spec or any freeze. Open one and start a discussion to bring it in.</p>
        <p v-if="!suggestions.length" class="pw-muted">Nothing left to pick up.</p>
        <QuestionRow v-for="item in suggestions" :key="item.key" :item="item" />
      </section>
      <section v-if="status === 'open' || status === 'all'" class="pw-card">
        <h3 v-if="status === 'all'">Open</h3>
        <p v-if="!open.length" class="pw-muted">No open discussions{{ search || system ? ' match' : '' }}. Start one, or pick up a <RouterLink :to="to('discussions', { status: 'suggested' })">suggestion from calls</RouterLink>.</p>
        <QuestionRow v-for="item in open" :key="item.key" :item="item" />
      </section>
      <section v-if="status === 'settled' || status === 'all'" class="pw-card">
        <h3 v-if="status === 'all'">Settled</h3>
        <p v-if="!settled.length" class="pw-muted">Nothing settled yet{{ versionId !== 'all' ? ` for ${versions.find(v => v.id === versionId)?.name}` : '' }}.</p>
        <RouterLink v-for="o in settled" :key="o.bundle.thread.id" :to="to('discussions', { thread: o.bundle.thread.id })" class="pw-q">
          <span class="pw-eyebrow">{{ o.rejected ? 'Not pursued' : o.adopted ? 'Adopted into the spec' : 'Concluded' }} · {{ systemName(data.evidence, o.bundle.thread.system || 'project-wide') }} · {{ shortDate(o.at) }}</span>
          <strong>{{ o.bundle.thread.title }}</strong>
          <span class="pw-q-meta">{{ o.rejected ? o.summary : o.decision ? `Decided: ${o.summary}` : firstLine(o.summary) }} · {{ o.bundle.positions.length }} {{ o.bundle.positions.length === 1 ? 'contribution' : 'contributions' }} · last active {{ shortDate(lastActivity(o.bundle)) }} · {{ nameOf(o.bundle.thread.authorId) }}</span>
        </RouterLink>
      </section>
    </template>
  </div>
</template>
