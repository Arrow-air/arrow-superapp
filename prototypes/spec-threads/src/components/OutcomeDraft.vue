<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import type { ThreadBundle } from '../data/backend';
import type { Project, WorkInput } from '../lib/types';
import { act, backend, handleOf, nameOf, myRoleOn, state } from '../data/store';
import { briefMarkdown, corpusKey, discussionSources, sourceUrl } from '../lib/brief';
import { startingOutcome } from '../lib/outcome';
import Markdown from './Markdown.vue';
import WorkFields from './WorkFields.vue';
import { usesWorkspaceShell, isSharedProject as hasServer } from '../data/projectDataMode';
const firstLine = (text: string) => text.split('\n').map(l => l.replace(/^#{1,6}\s+|^[-*>]\s+|[*_`]/g, '').trim()).find(Boolean) ?? '';
const props = defineProps<{ bundle: ThreadBundle; project: Project; decisionLine?: string }>();
const emit = defineEmits<{ conversation: []; grant: [id: string] }>();
const body = ref(''), questions = ref(''), baseline = ref(''), expectedRevision = ref(0);
const discussionChanged = ref(false);
const editing = ref(false), busy = ref(false), reviewed = ref(false), adopt = ref(false), commission = ref(false), feedback = ref(''), saved = ref(false);
const work = ref<WorkInput>({ kind: 'grant', purpose: 'implementation', title: '', scope: '', acceptance: '' });
const decisionText = ref('');
const shared = usesWorkspaceShell;
const lead = computed(() => myRoleOn(props.project.id) === 'lead');
const closed = computed(() => props.bundle.thread.status !== 'open');
const outcome = computed(() => props.bundle.thread.resolution?.kind === 'conclude' ? props.bundle.thread.resolution : undefined);
const canEdit = computed(() => !!state.me && !closed.value && (!props.bundle.draft || props.bundle.draft.authorId === state.me.id || lead.value));
const dirty = computed(() => JSON.stringify([body.value, questions.value]) !== baseline.value);
const sources = computed(() => discussionSources(props.bundle));
const currentCorpus = computed(() => corpusKey(props.bundle));
const workValid = computed(() => !!work.value.title.trim() && !!work.value.scope.trim() && !!work.value.acceptance.trim());
const blockers = computed(() => [
  !props.bundle.draft && 'Save the summary first.',
  props.bundle.draft && dirty.value && 'Save your edits to the summary first.',
  adopt.value && questions.value.trim() && 'Resolve the open questions before adopting a design change.',
  adopt.value && shared && !decisionText.value.trim() && 'Write the decision in one line.',
  commission.value && !workValid.value && 'Give the work a title, scope, and acceptance criteria.',
  commission.value && questions.value.trim() && work.value.purpose !== 'research' && 'Open questions remain: commission research, or resolve them first.',
  !shared && !reviewed.value && 'Confirm you’ve reviewed the draft against the conversation.',
].filter((b): b is string => !!b));
const ready = computed(() => !busy.value && !blockers.value.length);
watch([adopt, () => props.bundle.draft?.body], () => { if (adopt.value && !decisionText.value) decisionText.value = firstLine(body.value); });
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
  if (!work.value.title && !shared) work.value.title = props.bundle.thread.title;
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
  await act(() => backend.concludeThread({ threadId: props.bundle.thread.id, expectedRevision: expectedRevision.value, expectedCorpus: currentCorpus.value, adopt: adopt.value, decision: adopt.value && decisionText.value.trim() ? decisionText.value.trim() : undefined, work: commission.value ? work.value : undefined }));
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
  body.value += `\n\n[${source.kind} by ${nameOf(source.authorId)}](${sourceUrl(props.project.id, props.bundle.thread.id, source, props.bundle.thread.versionId)})`;
}
</script>
<template>
  <section class="outcome-draft" aria-label="Draft outcome">
    <header class="outcome-heading"><div><span class="eyebrow">{{ outcome ? 'OUTCOME' : shared ? 'SUMMARY' : 'ONE CONVERSATION → ONE DRAFT' }}</span><h3>{{ outcome ? 'What we concluded' : shared ? 'Where the discussion landed' : 'Draft outcome' }}</h3></div><span class="workspace-badge" :class="{ green: outcome }">{{ outcome ? 'Settled' : bundle.draft ? (shared ? 'Draft' : `Draft · r${bundle.draft.revision}`) : bundle.brief ? 'Illustrative starting draft' : 'Not started' }}</span></header>
    <p class="outcome-intro">{{ outcome ? 'The summary and the discussion as they stood are kept below.' : shared ? 'One short summary of where the discussion landed and what is still open. Corrections and disagreements go back into the discussion.' : 'A synthesis of this conversation—not a second place to propose ideas. Read it as a whole; bring corrections and disagreements back to the discussion.' }}</p>
    <template v-if="outcome">
      <div class="outcome-result"><span>{{ outcome.decisionId ? (shared ? '✓ Adopted into the spec' : '✓ Adopted into the design') : (shared ? 'Settled · no design change' : 'Conclusion recorded · no design change') }}</span><span v-if="!shared || outcome.grantIds.length">{{ outcome.grantIds.length }} work {{ shared ? (outcome.grantIds.length === 1 ? 'item' : 'items') : outcome.grantIds.length === 1 ? 'package' : 'packages' }}</span></div>
      <p v-if="shared && decisionLine" class="outcome-decision"><span class="eyebrow">Decision</span><strong>{{ decisionLine }}</strong></p>
      <div class="outcome-document"><Markdown :source="outcome.snapshot.body" /></div>
      <div v-if="outcome.snapshot.openQuestions" class="context-note"><strong>Still unresolved</strong><Markdown :source="outcome.snapshot.openQuestions" /></div>
      <div class="row"><button v-for="(id, i) in outcome.grantIds" :key="id" class="text-action" @click="emit('grant', id)">{{ shared ? (outcome.grantIds.length > 1 ? `Open work ${i + 1} →` : 'Open the work →') : `Open work package ${i + 1} →` }}</button></div>
      <details class="outcome-sources"><summary>{{ shared ? `The discussion as it stood · ${outcome.snapshot.sources.length} ${outcome.snapshot.sources.length === 1 ? 'post' : 'posts'}` : `Discussion preserved at review · ${outcome.snapshot.sources.length} sources` }}</summary><details v-for="s in outcome.snapshot.sources" :key="s.key"><summary>{{ nameOf(s.authorId) }} · {{ s.kind }}</summary><Markdown :source="s.body" /><a :href="sourceUrl(project.id, bundle.thread.id, s, outcome.snapshot.versionId)">View in conversation →</a></details></details>
      <details v-if="lead" class="outcome-review"><summary @click="seedWork">{{ shared ? 'Fund more work from this' : 'Commission follow-on work' }}</summary><p class="small muted">{{ shared ? 'Another grant or bounty from the same outcome. The decision stays as it is.' : 'Create another bounded work package from this recorded outcome. The design decision stays unchanged.' }}</p><WorkFields v-model="work" /><p v-if="outcome.snapshot.openQuestions && work.purpose !== 'research'" class="context-note">This outcome leaves open questions. Commission research to answer them before implementation.</p><button class="btn" :disabled="busy || !workValid || !!outcome.snapshot.openQuestions && work.purpose !== 'research'" @click="createWork">Create work draft</button></details>
    </template>
    <template v-else-if="closed"><p class="context-note">This discussion was resolved in an earlier workflow. Its original decision is preserved.</p><Markdown v-if="bundle.thread.resolution?.kind === 'reject'" :source="bundle.thread.resolution.note" /><Markdown v-else-if="bundle.brief?.approval" :source="briefMarkdown({ ...bundle.brief, approval: bundle.brief.approval }, project.id)" /><Markdown v-else :source="bundle.positions.find(p => (bundle.thread.resolution?.kind === 'spec' || bundle.thread.resolution?.kind === 'grant') && p.id === bundle.thread.resolution.positionId)?.body || bundle.thread.body" /></template>
    <template v-else>
      <div v-if="editing && canEdit" class="outcome-editor stack">
        <label class="field-row"><span class="label">{{ shared ? 'Summary' : 'Draft document' }}</span><textarea v-model="body" aria-label="Draft document" :placeholder="shared ? 'Start with the answer in one line, then the reasoning and any limits. Markdown works.' : 'Describe the proposed outcome, reasoning, boundaries, and sources. Markdown is supported.'" /></label>
        <details class="outcome-sources"><summary>Reference the conversation · {{ sources.length }} sources</summary><details v-for="s in sources" :key="s.key"><summary>{{ nameOf(s.authorId) }} · {{ s.kind }}</summary><Markdown :source="s.body" /><button class="text-action" @click="cite(s.key)">Insert source link</button></details></details>
        <label class="field-row"><span class="label">{{ shared ? 'Still open' : 'Unresolved questions' }}</span><textarea v-model="questions" aria-label="Unresolved questions" placeholder="What still needs an answer? Leave empty only when settled; record answers in the document." /></label>
        <div class="row"><button class="btn" :disabled="busy || !body.trim()" @click="save">{{ shared ? 'Save summary' : 'Save draft' }}</button><button class="btn btn-ghost" @click="hydrate(); editing = false">Cancel edits</button><span v-if="dirty" class="small muted">Unsaved edits</span></div>
      </div>
      <template v-else>
        <div v-if="body" class="outcome-document"><Markdown :source="body" /></div>
        <div v-else class="draft-empty"><h4>Let the conversation develop.</h4><p>{{ shared ? 'When the direction is clear, anyone can write a short summary: the answer first, then what is still open.' : 'There is no required specification to fill out. When the direction becomes clearer, a contributor or the lead can write one draft for everyone to review.' }}</p></div>
        <div v-if="questions" class="context-note"><strong>Still unresolved</strong><Markdown :source="questions" /></div>
        <div class="row"><button v-if="canEdit" class="btn btn-ghost" @click="editing = true">{{ shared ? (body ? 'Edit summary' : 'Write a summary') : (body ? 'Edit draft' : 'Start a draft') }}</button><span v-if="saved" class="small" role="status">{{ shared ? 'Summary saved.' : 'Draft saved.' }}</span><span v-if="bundle.draft" class="small muted">Last edited by {{ nameOf(bundle.draft.updatedBy) }}<template v-if="!shared"> · r{{ bundle.draft.revision }}</template></span></div>
        <p v-if="!canEdit && !closed && bundle.draft" class="small muted">{{ nameOf(bundle.draft.authorId) }} and the project lead edit this draft. Everyone can discuss it below.</p>
      </template>
      <form v-if="state.me && !closed && body" class="draft-feedback" @submit.prevent="sendFeedback"><label class="field-row"><span class="label">{{ shared ? 'Comment on this summary' : 'Discuss this draft' }}</span><textarea v-model="feedback" aria-label="Feedback on draft" placeholder="What is missing, incorrect, or worth reconsidering?" /></label><div class="spread"><span class="small muted">Posts into the same conversation.</span><button class="btn btn-ghost" :disabled="busy || !feedback.trim()">Post to conversation →</button></div></form>
      <section v-if="lead && !closed" class="outcome-review" aria-label="Settle the discussion"><span class="eyebrow">PROJECT LEAD</span><h4>{{ shared ? 'Settle this discussion' : 'What follows from this conversation?' }}</h4><p>{{ shared ? 'Record the outcome on its own, adopt it into the spec, fund work from it, or both.' : 'Record a conclusion on its own, adopt a design change, commission work—or do both.' }}</p>
        <label class="outcome-choice"><input v-model="adopt" type="checkbox" /><span><strong>{{ shared ? `Adopt into the ${project.versions.find(v => v.id === bundle.thread.versionId)?.name ?? ''} spec` : 'Adopt into the design' }}</strong><small>{{ shared ? 'It becomes a decision in the spec. It doesn’t create work by itself.' : 'Add this reviewed document to the version’s design decisions. It does not create a grant.' }}</small></span></label>
        <label v-if="adopt && shared" class="field-row decision-line"><span class="label">The decision, in one line</span><input v-model="decisionText" maxlength="240" placeholder="e.g. Separate regulator per tail servo" aria-label="Decision in one line" /><small class="muted">This is how it reads in the spec: the answer, not the question.</small></label>
        <label class="outcome-choice"><input v-model="commission" type="checkbox" /><span><strong>{{ shared ? 'Fund work from it' : 'Commission work' }}</strong><small>{{ shared ? 'Draft a grant or bounty. Whoever raised the idea gets a share of the reward.' : 'Prepare a grant or bounty. It does not automatically adopt a design.' }}</small></span></label>
        <WorkFields v-if="commission" v-model="work" />
        <p v-if="discussionChanged" class="context-note" role="status">New contributions arrived since you opened this. Read them before settling.</p><label v-if="!shared" class="outcome-choice review-ack"><input v-model="reviewed" type="checkbox" /><span>{{ shared ? 'I’ve read the latest contributions, including disagreements.' : 'I’ve reviewed this draft against the current conversation, including disagreements.' }}</span></label>
        <div class="settle-row"><button class="btn" :disabled="!ready" @click="conclude">{{ busy ? 'Saving…' : shared ? (adopt ? 'Adopt and settle' : commission ? 'Settle and draft work' : 'Settle discussion') : adopt || commission ? 'Approve and record outcome' : 'Record conclusion' }}</button><ul v-if="blockers.length" class="settle-blockers small" aria-live="polite"><li v-for="b in blockers" :key="b">{{ b }}</li></ul></div>
        <p class="small muted">{{ shared ? 'This closes the discussion. Any work starts as a draft.' : 'This closes the discussion for this version. No funds move; any work remains a draft.' }}</p>
      </section>
      <details v-if="bundle.draft?.history.length" class="outcome-sources"><summary>{{ shared ? 'Earlier versions' : 'Draft history' }} · {{ bundle.draft.history.length }} {{ bundle.draft.history.length === 1 ? 'revision' : 'revisions' }}</summary><details v-for="h in [...bundle.draft.history].reverse()" :key="h.revision"><summary>r{{ h.revision }} · {{ nameOf(h.byMemberId) }}</summary><Markdown :source="h.content.body" /><p v-if="h.content.openQuestions">Unresolved: {{ h.content.openQuestions }}</p></details></details>
    </template>
  </section>
</template>
