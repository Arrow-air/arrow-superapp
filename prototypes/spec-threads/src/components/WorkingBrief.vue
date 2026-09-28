<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { BriefAction, ThreadBundle } from '../data/backend';
import { act, backend, handleOf, nameOf, myRoleOn, state } from '../data/store';
import { briefApproved, briefIssues, discussionSources, grantBriefIssues, unreviewedSources } from '../lib/brief';
import type { BriefItem, BriefKind, BriefSource, Project } from '../lib/types';
import { positionTitle } from '../lib/format';
import Markdown from './Markdown.vue';
const props = defineProps<{ bundle: ThreadBundle; project: Project; captureKey?: string }>();
const emit = defineEmits<{ captured: [] }>();
const route = useRoute(), router = useRouter();
const brief = computed(() => props.bundle.brief);
const sources = computed(() => discussionSources(props.bundle));
const isLead = computed(() => myRoleOn(props.project.id) === 'lead');
const editable = computed(() => !!state.me && props.bundle.thread.status === 'open' && props.project.versions.find(v => v.id === props.bundle.thread.versionId)?.state !== 'frozen');
const approved = computed(() => briefApproved(props.bundle));
const issues = computed(() => briefIssues(props.bundle));
const grantIssues = computed(() => grantBriefIssues(props.bundle));
const unread = computed(() => unreviewedSources(props.bundle));
const busy = ref(false), purpose = ref(''), editor = ref(false), editingId = ref('');
const itemKind = ref<BriefKind>('requirement'), text = ref(''), verification = ref(''), selectedSources = ref<string[]>([]);
const rationale = reactive<Record<string, string>>({});
const sourceList = ref<HTMLDetailsElement>();
const kinds: { id: BriefKind; label: string }[] = [
  { id: 'requirement', label: 'Requirements' }, { id: 'deliverable', label: 'Deliverables & acceptance' },
  { id: 'question', label: 'Questions to resolve' }, { id: 'evidence', label: 'Supporting reports' }, { id: 'exclusion', label: 'Out of scope' },
];
watch(() => props.bundle.thread.id, () => { editor.value = false; editingId.value = ''; purpose.value = brief.value?.purpose ?? ''; }, { immediate: true });
watch(() => brief.value?.purpose, v => { purpose.value = v ?? ''; });
watch(() => props.captureKey, key => { if (key) { start(key); emit('captured'); } });
watch([() => route.query.source, () => props.bundle.thread.id], async () => {
  if (!route.query.source) return;
  await nextTick();
  if (sourceList.value) sourceList.value.open = true;
  await nextTick();
  const node = document.getElementById(`brief-source-${String(route.query.source)}`);
  if (node instanceof HTMLDetailsElement) { node.open = true; node.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}, { immediate: true });
async function write(action: BriefAction) {
  if (busy.value) return false;
  busy.value = true;
  try { return await act(() => backend.changeBrief({ threadId: props.bundle.thread.id, expectedRevision: brief.value?.revision ?? 0, action })); }
  finally { busy.value = false; }
}
function start(key?: string, item?: BriefItem) {
  editingId.value = item?.id ?? '';
  itemKind.value = item?.kind ?? 'requirement';
  text.value = item?.text ?? '';
  verification.value = item?.verification ?? '';
  selectedSources.value = item?.sources.map(s => s.key) ?? [key ?? `thread:${props.bundle.thread.id}`];
  editor.value = true;
  nextTick(() => document.getElementById('brief-item-text')?.focus());
}
async function saveItem() {
  if (await write({ kind: 'item', id: editingId.value || undefined, itemKind: itemKind.value, text: text.value, verification: verification.value, sourceKeys: selectedSources.value })) editor.value = false;
}
function showSource(source: BriefSource) { return router.replace({ query: { ...route.query, source: source.key } }); }
function reviewed(source: BriefSource) { return !!brief.value?.reviewed.some(r => r.source.key === source.key && r.source.body === source.body); }
const label = (s: BriefSource) => `${s.kind === 'thread' ? 'Original question' : s.kind === 'comment' ? 'Reply' : 'Approach'} · ${nameOf(s.authorId)}`;
const status = (i: BriefItem) => i.status === 'dismissed' ? 'Not included' : i.status === 'proposed' ? (i.kind === 'question' ? 'Open question' : 'Proposed') : i.kind === 'question' ? 'Answered' : i.kind === 'evidence' ? 'Included report' : 'Accepted';
</script>
<template>
  <section class="working-brief" aria-label="Working brief">
    <header class="brief-heading"><div><span class="eyebrow">DISCUSSION → SPECIFICATION</span><h3>Working brief <small v-if="brief">r{{ brief.revision }}</small></h3></div><span class="workspace-badge" :class="{ green: approved }">{{ approved ? 'Lead reviewed' : brief?.approval ? 'New discussion · review again' : 'Taking shape' }}</span></header>
    <p class="brief-intro">Combine what holds up across the conversation. A vote supports an approach; only a lead review accepts a requirement.</p>
    <div v-if="!brief" class="brief-empty"><strong>The specification doesn’t have to wait for the freeze.</strong><p>Capture requirements from any approach or reply. Keep unknowns separate. The grant will inherit the reviewed brief.</p></div>
    <div class="brief-purpose">
      <label v-if="isLead && editable" class="field-row"><span class="label">Intended outcome</span><textarea v-model="purpose" aria-label="Brief intended outcome" placeholder="What should someone be able to deliver, and why?" rows="2" /><button v-if="purpose.trim() && purpose !== brief?.purpose" class="btn btn-ghost" :disabled="busy" @click="write({ kind: 'purpose', text: purpose })">Save outcome</button></label>
      <template v-else><span class="label">Intended outcome</span><p>{{ brief?.purpose || 'The project lead has not written the outcome yet.' }}</p></template>
    </div>
    <div v-for="kind in kinds" :key="kind.id" class="brief-section">
      <h4>{{ kind.label }} <span>{{ brief?.items.filter(i => i.kind === kind.id && i.status !== 'dismissed').length ?? 0 }}</span></h4>
      <p v-if="!brief?.items.some(i => i.kind === kind.id && i.status !== 'dismissed')" class="brief-empty-line">{{ kind.id === 'evidence' ? 'No supporting reports recorded. Acceptance is not verification.' : kind.id === 'question' ? 'No questions recorded. This does not certify that the design is complete.' : 'Nothing recorded yet.' }}</p>
      <article v-for="item in brief?.items.filter(i => i.kind === kind.id && i.status !== 'dismissed')" :key="item.id" class="brief-item" :data-item-id="item.id">
        <div class="spread"><span class="brief-item-status" :class="item.status">{{ status(item) }}</span><button v-if="editable && (isLead || item.authorId === state.me?.id && item.status === 'proposed')" class="text-action" :disabled="busy" @click="start(undefined, item)">Edit</button></div>
        <p class="brief-item-text">{{ item.text }}</p>
        <p v-if="item.verification" class="brief-check"><strong>Acceptance check</strong> {{ item.verification }}</p>
        <p v-if="item.rationale" class="brief-rationale"><strong>{{ item.kind === 'question' ? 'Answer' : 'Lead rationale' }}</strong> {{ item.rationale }}</p>
        <div class="brief-sources"><button v-for="source in item.sources" :key="source.key" class="text-action" @click="showSource(source)">↗ {{ label(source) }}</button></div>
        <p class="brief-attribution">Written by {{ nameOf(item.authorId) }}<template v-if="item.updatedBy !== item.authorId"> · edited by {{ nameOf(item.updatedBy) }}</template><template v-if="item.decidedBy"> · reviewed by {{ nameOf(item.decidedBy) }}</template></p>
        <div v-if="isLead && editable && item.status === 'proposed'" class="brief-decision">
          <input v-model="rationale[item.id]" :aria-label="`Review note for ${item.text}`" :placeholder="item.kind === 'question' ? 'Answer, or explain why this is out of scope…' : 'Review note (required to leave an item out)…'" />
          <div class="row"><button class="btn btn-ghost" :disabled="busy || ((item.kind === 'question' || item.kind === 'exclusion') && !rationale[item.id]?.trim()) || (item.kind === 'deliverable' && !item.verification)" @click="write({ kind: 'decide', id: item.id, status: 'accepted', rationale: rationale[item.id] ?? '' })">{{ item.kind === 'question' ? 'Record answer' : item.kind === 'evidence' ? 'Include report' : 'Accept' }}</button><button class="text-action" :disabled="busy || !rationale[item.id]?.trim()" @click="write({ kind: 'decide', id: item.id, status: 'dismissed', rationale: rationale[item.id] ?? '' })">Leave out with reason</button></div>
        </div>
      </article>
    </div>
    <details v-if="brief?.items.some(i => i.status === 'dismissed')" class="brief-excluded"><summary>Considered, not included · {{ brief.items.filter(i => i.status === 'dismissed').length }}</summary><article v-for="item in brief.items.filter(i => i.status === 'dismissed')" :key="item.id" class="brief-item"><p>{{ item.text }}</p><p class="brief-rationale">{{ item.rationale }}</p><button v-for="source in item.sources" :key="source.key" class="text-action" @click="showSource(source)">{{ label(source) }}</button><button v-if="isLead && editable" class="btn btn-ghost" @click="start(undefined, item)">Reconsider</button></article></details>
    <button v-if="editable && !editor" class="btn btn-ghost brief-add" :disabled="busy" @click="start()">＋ Add to the brief</button>
    <form v-if="editor && editable" class="brief-editor stack" @submit.prevent="saveItem">
      <strong>{{ editingId ? 'Revise this item' : 'Propose a brief item' }}</strong><p class="small muted">Write a synthesis, not a transcript. New and edited items require lead review.</p>
      <label class="field-row"><span class="label">Item type</span><select v-model="itemKind" aria-label="Brief item type"><option v-for="kind in kinds" :key="kind.id" :value="kind.id">{{ kind.label }}</option></select></label>
      <label class="field-row"><span class="label">{{ itemKind === 'question' ? 'What remains unknown?' : 'Proposed wording' }}</span><textarea id="brief-item-text" v-model="text" aria-label="Brief item wording" required /></label>
      <label v-if="itemKind === 'deliverable'" class="field-row"><span class="label">How will we know it’s done?</span><textarea v-model="verification" aria-label="Deliverable acceptance check" placeholder="An observable result, test, or review—not ‘works correctly’." required /></label>
      <fieldset class="brief-source-picker"><legend>Discussion sources</legend><label v-for="source in sources" :key="source.key"><input v-model="selectedSources" type="checkbox" :value="source.key" /><span>{{ label(source) }}<small>{{ positionTitle(source.body, 90) }}</small></span></label></fieldset>
      <div class="row"><button class="btn" :disabled="busy || !text.trim() || !selectedSources.length">Save proposal</button><button class="btn btn-ghost" type="button" @click="editor = false">Cancel</button></div>
    </form>
    <details ref="sourceList" class="brief-source-review"><summary>Review the whole discussion <span>{{ sources.length - unread.length }}/{{ sources.length }} considered</span></summary><p class="small muted">Consider every approach and reply. Capture constraints and contradictions above before marking a source reviewed. This is human review, not automatic conflict detection.</p>
      <details v-for="source in sources" :id="`brief-source-${source.key}`" :key="source.key" class="brief-source-card" :class="{ 'source-selected': route.query.source === source.key }"><summary>{{ reviewed(source) ? '✓' : '○' }} {{ label(source) }}<small>{{ positionTitle(source.body, 95) }}</small></summary><Markdown :source="source.body" /><div class="row"><button v-if="editable" class="btn btn-ghost" :disabled="busy" @click="start(source.key)">Capture an item</button><button v-if="isLead && editable && !reviewed(source)" class="btn btn-ghost" :disabled="busy" @click="write({ kind: 'review', sourceKey: source.key })">Mark considered</button></div></details>
    </details>
    <div v-if="brief" class="brief-readiness" aria-live="polite">
      <strong>{{ approved ? 'Reviewed specification' : 'Before this becomes a specification' }}</strong>
      <ul v-if="issues.length"><li v-for="issue in issues" :key="issue">{{ issue }}</li></ul>
      <p v-else-if="!approved">The recorded items and sources have been reviewed. The lead can approve this revision.</p>
      <p v-if="approved">Approved by {{ nameOf(brief.approval!.byMemberId) }}. A grant keeps this exact revision and its sources.</p>
      <p v-if="approved && grantIssues.length" class="small">{{ grantIssues.join(' ') }}</p>
      <button v-if="isLead && editable && !approved" class="btn" :disabled="busy || !!issues.length" @click="write({ kind: 'approve' })">Approve this brief</button>
      <p class="brief-attribution">New proposals or discussion require a new review. Approval records a design decision—not engineering certification.</p>
    </div>
    <details v-if="brief?.history.length" class="brief-history"><summary>Revision history · {{ brief.history.length }}</summary><details v-for="entry in [...brief.history].reverse()" :key="entry.revision"><summary>r{{ entry.revision }} · {{ entry.action }} · {{ nameOf(entry.byMemberId) }}</summary><p>{{ entry.content.purpose }}</p><ul><li v-for="item in entry.content.items" :key="item.id">{{ item.status }} · {{ item.text }}<template v-if="item.rationale"> — {{ item.rationale }}</template></li></ul></details></details>
  </section>
</template>
