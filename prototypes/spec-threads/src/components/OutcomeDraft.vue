<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import type { ThreadBundle } from '../data/backend';
import type { Project, WorkInput } from '../lib/types';
import { act, backend, handleOf, myRoleOn, state } from '../data/store';
import { briefMarkdown, corpusKey, discussionSources, sourceUrl } from '../lib/brief';
import { startingOutcome } from '../lib/outcome';
import Markdown from './Markdown.vue';
import WorkFields from './WorkFields.vue';
const props = defineProps<{ bundle: ThreadBundle; project: Project }>();
const emit = defineEmits<{ conversation: []; grant: [id: string] }>();
const body = ref(''), questions = ref(''), baseline = ref(''), expectedRevision = ref(0);
const discussionChanged = ref(false);
const editing = ref(false), busy = ref(false), reviewed = ref(false), adopt = ref(false), commission = ref(false), feedback = ref(''), saved = ref(false);
const work = ref<WorkInput>({ kind: 'grant', purpose: 'implementation', title: '', scope: '', acceptance: '' });
const lead = computed(() => myRoleOn(props.project.id) === 'lead');
const closed = computed(() => props.bundle.thread.status !== 'open');
const outcome = computed(() => props.bundle.thread.resolution?.kind === 'conclude' ? props.bundle.thread.resolution : undefined);
const canEdit = computed(() => !!state.me && !closed.value && (!props.bundle.draft || props.bundle.draft.authorId === state.me.id || lead.value));
const dirty = computed(() => JSON.stringify([body.value, questions.value]) !== baseline.value);
const sources = computed(() => discussionSources(props.bundle));
const currentCorpus = computed(() => corpusKey(props.bundle));
const workValid = computed(() => !!work.value.title.trim() && !!work.value.scope.trim() && !!work.value.acceptance.trim());
const ready = computed(() => !busy.value && !dirty.value && !!props.bundle.draft && reviewed.value && (!adopt.value || !questions.value.trim()) && (!commission.value || (workValid.value && (!questions.value.trim() || work.value.purpose === 'research'))));
function hydrate() {
  const content = startingOutcome(props.bundle);
  body.value = content.body; questions.value = content.openQuestions;
  expectedRevision.value = props.bundle.draft?.revision ?? 0;
  baseline.value = JSON.stringify([body.value, questions.value]);
}
hydrate();
watch(() => props.bundle.draft?.revision, () => { if (!dirty.value) hydrate(); reviewed.value = false; });
watch(currentCorpus, () => { if (reviewed.value) discussionChanged.value = true; reviewed.value = false; });
watch(reviewed, value => { if (value) discussionChanged.value = false; });
watch(commission, value => { if (value) seedWork(); });
watch([body, questions], () => { reviewed.value = false; saved.value = false; });
watch(canEdit, value => { if (!value) editing.value = false; });
function seedWork() {
  if (!work.value.title) work.value.title = props.bundle.thread.title;
  if (!work.value.scope) work.value.scope = outcome.value?.snapshot.body ?? body.value;
}
function beforeUnload(e: BeforeUnloadEvent) { if (dirty.value) { e.preventDefault(); e.returnValue = ''; } }
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload));
function confirmLeave() { return !dirty.value || confirm('Leave without saving your draft edits?'); }
onBeforeRouteLeave(confirmLeave);
onBeforeRouteUpdate((to, from) => to.query.thread === from.query.thread && to.params.id === from.params.id && to.query.view === from.query.view || confirmLeave());
async function save() {
  if (busy.value) return; busy.value = true;
  const ok = await act(async () => {
    const d = await backend.saveOutcome({ threadId: props.bundle.thread.id, expectedRevision: expectedRevision.value, body: body.value, openQuestions: questions.value });
    body.value = d.body; questions.value = d.openQuestions; expectedRevision.value = d.revision;
    baseline.value = JSON.stringify([body.value, questions.value]);
  });
  busy.value = false;
  if (ok) { editing.value = false; saved.value = true; }
}
async function conclude() {
  if (!ready.value) return; busy.value = true;
  await act(() => backend.concludeThread({ threadId: props.bundle.thread.id, expectedRevision: expectedRevision.value, expectedCorpus: currentCorpus.value, adopt: adopt.value, work: commission.value ? work.value : undefined }));
  busy.value = false;
}
async function sendFeedback() {
  if (!feedback.value.trim() || busy.value) return; busy.value = true;
  const ok = await act(() => backend.createPosition({ threadId: props.bundle.thread.id, body: `Feedback on draft r${props.bundle.draft?.revision ?? 0}\n\n${feedback.value.trim()}` }));
  busy.value = false;
  if (ok) { feedback.value = ''; emit('conversation'); }
}
async function createWork() {
  if (!workValid.value || busy.value) return; busy.value = true;
  let id = '';
  const ok = await act(async () => { id = (await backend.createWork({ threadId: props.bundle.thread.id, work: work.value })).id; });
  busy.value = false;
  if (ok) { commission.value = false; work.value = { kind: 'grant', purpose: 'implementation', title: '', scope: '', acceptance: '' }; emit('grant', id); }
}
function cite(key: string) {
  const source = sources.value.find(s => s.key === key)!;
  body.value += `\n\n[${source.kind} by @${handleOf(source.authorId)}](${sourceUrl(props.project.id, props.bundle.thread.id, source, props.bundle.thread.versionId)})`;
}
</script>
<template>
  <section class="outcome-draft" aria-label="Draft outcome">
    <header class="outcome-heading"><div><span class="eyebrow">{{ outcome ? 'RECORDED OUTCOME' : 'ONE CONVERSATION → ONE DRAFT' }}</span><h3>{{ outcome ? 'What we concluded' : 'Draft outcome' }}</h3></div><span class="workspace-badge" :class="{ green: outcome }">{{ outcome ? 'Lead reviewed' : bundle.draft ? `Draft · r${bundle.draft.revision}` : bundle.brief ? 'Illustrative starting draft' : 'Not started' }}</span></header>
    <p class="outcome-intro">{{ outcome ? 'The reviewed document and discussion are preserved below. Work can be commissioned separately.' : 'A synthesis of this conversation—not a second place to propose ideas. Read it as a whole; bring corrections and disagreements back to the discussion.' }}</p>
    <template v-if="outcome">
      <div class="outcome-result"><span>{{ outcome.decisionId ? '✓ Adopted into the design' : 'Conclusion recorded · no design change' }}</span><span>{{ outcome.grantIds.length }} work {{ outcome.grantIds.length === 1 ? 'package' : 'packages' }}</span></div>
      <div class="outcome-document"><Markdown :source="outcome.snapshot.body" /></div>
      <div v-if="outcome.snapshot.openQuestions" class="context-note"><strong>Still unresolved</strong><Markdown :source="outcome.snapshot.openQuestions" /></div>
      <div class="row"><button v-for="(id, i) in outcome.grantIds" :key="id" class="text-action" @click="emit('grant', id)">Open work package {{ i + 1 }} →</button></div>
      <details class="outcome-sources"><summary>Discussion preserved at review · {{ outcome.snapshot.sources.length }} sources</summary><details v-for="s in outcome.snapshot.sources" :key="s.key"><summary>@{{ handleOf(s.authorId) }} · {{ s.kind }}</summary><Markdown :source="s.body" /><a :href="sourceUrl(project.id, bundle.thread.id, s, outcome.snapshot.versionId)">View in conversation →</a></details></details>
      <details v-if="lead" class="outcome-review"><summary @click="seedWork">Commission follow-on work</summary><p class="small muted">Create another bounded work package from this recorded outcome. The design decision stays unchanged.</p><WorkFields v-model="work" /><p v-if="outcome.snapshot.openQuestions && work.purpose !== 'research'" class="context-note">This outcome leaves open questions. Commission research to answer them before implementation.</p><button class="btn" :disabled="busy || !workValid || !!outcome.snapshot.openQuestions && work.purpose !== 'research'" @click="createWork">Create work draft</button></details>
    </template>
    <template v-else-if="closed"><p class="context-note">This discussion was resolved in an earlier workflow. Its original decision is preserved.</p><Markdown v-if="bundle.thread.resolution?.kind === 'reject'" :source="bundle.thread.resolution.note" /><Markdown v-else-if="bundle.brief?.approval" :source="briefMarkdown({ ...bundle.brief, approval: bundle.brief.approval }, project.id)" /><Markdown v-else :source="bundle.positions.find(p => (bundle.thread.resolution?.kind === 'spec' || bundle.thread.resolution?.kind === 'grant') && p.id === bundle.thread.resolution.positionId)?.body || bundle.thread.body" /></template>
    <template v-else>
      <div v-if="editing && canEdit" class="outcome-editor stack">
        <label class="field-row"><span class="label">Draft document</span><textarea v-model="body" aria-label="Draft document" placeholder="Describe the proposed outcome, reasoning, boundaries, and sources. Markdown is supported." /></label>
        <details class="outcome-sources"><summary>Reference the conversation · {{ sources.length }} sources</summary><details v-for="s in sources" :key="s.key"><summary>@{{ handleOf(s.authorId) }} · {{ s.kind }}</summary><Markdown :source="s.body" /><button class="text-action" @click="cite(s.key)">Insert source link</button></details></details>
        <label class="field-row"><span class="label">Unresolved questions</span><textarea v-model="questions" aria-label="Unresolved questions" placeholder="What still needs an answer? Leave empty only when settled; record answers in the document." /></label>
        <div class="row"><button class="btn" :disabled="busy || !body.trim()" @click="save">Save draft</button><button class="btn btn-ghost" @click="hydrate(); editing = false">Cancel edits</button><span v-if="dirty" class="small muted">Unsaved edits</span></div>
      </div>
      <template v-else>
        <div v-if="body" class="outcome-document"><Markdown :source="body" /></div>
        <div v-else class="draft-empty"><h4>Let the conversation develop.</h4><p>There is no required specification to fill out. When the direction becomes clearer, a contributor or the lead can write one draft for everyone to review.</p></div>
        <div v-if="questions" class="context-note"><strong>Still unresolved</strong><Markdown :source="questions" /></div>
        <div class="row"><button v-if="canEdit" class="btn btn-ghost" @click="editing = true">{{ body ? 'Edit draft' : 'Start a draft' }}</button><span v-if="saved" class="small" role="status">Draft saved.</span><span v-if="bundle.draft" class="small muted">Last edited by @{{ handleOf(bundle.draft.updatedBy) }} · r{{ bundle.draft.revision }}</span></div>
        <p v-if="!canEdit && !closed && bundle.draft" class="small muted">@{{ handleOf(bundle.draft.authorId) }} and the project lead edit this draft. Everyone can discuss it below.</p>
      </template>
      <form v-if="state.me && !closed && body" class="draft-feedback" @submit.prevent="sendFeedback"><label class="field-row"><span class="label">Discuss this draft</span><textarea v-model="feedback" aria-label="Feedback on draft" placeholder="What is missing, incorrect, or worth reconsidering?" /></label><div class="spread"><span class="small muted">Posts into the same conversation.</span><button class="btn btn-ghost" :disabled="busy || !feedback.trim()">Post to conversation →</button></div></form>
      <section v-if="lead && !closed" class="outcome-review" aria-label="Review outcome"><span class="eyebrow">PROJECT LEAD / REVIEW</span><h4>What follows from this conversation?</h4><p>Record a conclusion on its own, adopt a design change, commission work—or do both.</p>
        <label class="outcome-choice"><input v-model="adopt" type="checkbox" /><span><strong>Adopt into the design</strong><small>Add this reviewed document to the version’s design decisions. It does not create a grant.</small></span></label>
        <label class="outcome-choice"><input v-model="commission" type="checkbox" /><span><strong>Commission work</strong><small>Prepare a grant or bounty. It does not automatically adopt a design.</small></span></label>
        <WorkFields v-if="commission" v-model="work" />
        <p v-if="adopt && questions.trim()" class="context-note">Resolve the open questions before adopting the design. Record answers or explicit scope boundaries in the document.</p>
        <p v-if="commission && questions.trim() && work.purpose !== 'research'" class="context-note">Open questions remain. Choose research to commission answers, or resolve them before implementation.</p>
        <p v-if="!bundle.draft || dirty" class="context-note">Save the document before recording the outcome.</p>
        <p v-if="discussionChanged" class="context-note" role="status">New discussion arrived since your review. Read it before recording the outcome.</p><label class="outcome-choice review-ack"><input v-model="reviewed" type="checkbox" /><span>I’ve reviewed this draft against the current conversation, including disagreements.</span></label>
        <button class="btn" :disabled="!ready" @click="conclude">{{ busy ? 'Recording…' : adopt || commission ? 'Approve and record outcome' : 'Record conclusion' }}</button>
        <p class="small muted">This closes the discussion for this version. No funds move; any work remains a draft.</p>
      </section>
      <details v-if="bundle.draft?.history.length" class="outcome-sources"><summary>Draft history · {{ bundle.draft.history.length }} revisions</summary><details v-for="h in [...bundle.draft.history].reverse()" :key="h.revision"><summary>r{{ h.revision }} · @{{ handleOf(h.byMemberId) }}</summary><Markdown :source="h.content.body" /><p v-if="h.content.openQuestions">Unresolved: {{ h.content.openQuestions }}</p></details></details>
    </template>
  </section>
</template>
