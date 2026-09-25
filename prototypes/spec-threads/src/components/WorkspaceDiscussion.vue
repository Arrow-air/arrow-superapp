<script setup lang="ts">
import { computed, reactive, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ThreadBundle } from '../data/backend';
import { act, backend, handleOf, memberById, myRoleOn, state } from '../data/store';
import { analyzeThread } from '../lib/analyze';
import { positionTitle, signed } from '../lib/format';
import type { Project } from '../lib/types';
import OutcomeDraft from './OutcomeDraft.vue';
import Markdown from './Markdown.vue';
import ResolvePanel from './ResolvePanel.vue';
import WeightBox from './WeightBox.vue';

const props = defineProps<{ bundle: ThreadBundle; project: Project }>();
const emit = defineEmits<{ review: []; grant: [id: string] }>();
const route = useRoute(), router = useRouter();
const tab = computed(() => route.query.tab === 'draft' && !route.query.source ? 'draft' : 'discussion');
function switchTab(value: string) { return router.replace({ query: { ...route.query, tab: value === 'draft' ? 'draft' : undefined, source: undefined } }); }
watch(() => route.query.source, async key => {
  if (!key) return;
  await nextTick();
  const el = [...document.querySelectorAll('[data-source]')].find(n => n.getAttribute('data-source') === key);
  if (el) {
    const details = el.closest('details'); if (details) details.open = true;
    document.querySelectorAll('.source-selected').forEach(n => n.classList.remove('source-selected'));
    el.classList.add('source-selected');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, { immediate: true, flush: 'post' });
const draft = ref('');
const comments = reactive<Record<string, string>>({});
const busy = ref(false);
const analysis = computed(() => analyzeThread({ bundle: props.bundle, project: props.project, members: state.members, roles: state.roles }));
const open = computed(() => props.bundle.thread.status === 'open');
const version = computed(() => props.project.versions.find(v => v.id === props.bundle.thread.versionId));
const canContribute = computed(() => !!state.me && open.value && version.value?.state !== 'frozen');
const isLead = computed(() => myRoleOn(props.project.id) === 'lead');
const builder = computed(() => props.bundle.intents.some(i => i.memberId === state.me?.id));
const contributions = computed(() => props.bundle.positions.map(p => ({ p, tally: analysis.value.tallies.find(t => t.positionId === p.id)! })).sort((a, b) => a.p.createdAt.localeCompare(b.p.createdAt)));
const chosenTitle = computed(() => {
  const resolution = props.bundle.thread.resolution;
  if (resolution?.kind === 'conclude') return resolution.snapshot.body;
  if (resolution && resolution.kind !== 'reject' && props.bundle.brief) return props.bundle.brief.purpose;
  return resolution && (resolution.kind === 'spec' || resolution.kind === 'grant')
    ? positionTitle(props.bundle.positions.find(p => p.id === resolution.positionId)?.body ?? '')
    : '';
});
const myVote = (id: string) => props.bundle.votes.find(v => v.positionId === id && v.memberId === state.me?.id)?.value ?? 0;
const myWeight = computed(() => state.me ? analysis.value.weights.get(state.me.id) : undefined);
const name = (id: string) => memberById.value.get(id)?.displayName.split(' (')[0] ?? handleOf(id);
async function write(fn: () => Promise<unknown>, done?: () => void) {
  if (busy.value) return;
  busy.value = true;
  try { if (await act(fn)) done?.(); } finally { busy.value = false; }
}
function vote(id: string, value: 1 | -1) { return write(() => backend.castVote({ positionId: id, value: myVote(id) === value ? 0 : value })); }
function post() { return write(() => backend.createPosition({ threadId: props.bundle.thread.id, body: draft.value }), () => { draft.value = ''; }); }
function comment(id: string) { return write(() => backend.addComment({ positionId: id, body: comments[id] }), () => { comments[id] = ''; }); }
</script>

<template>
  <article class="discussion-panel" aria-label="Change discussion">
    <div class="discussion-heading"><span class="eyebrow">{{ bundle.thread.system || 'PROJECT-WIDE' }} / {{ version?.name }}</span><span class="workspace-badge" :class="{ green: !open }">{{ open ? 'Exploring' : bundle.thread.resolution?.kind === 'conclude' ? 'Outcome recorded' : bundle.thread.resolution?.kind === 'grant' ? 'Grant drafted' : bundle.thread.resolution?.kind === 'spec' ? 'Adopted' : 'Not pursuing' }}</span></div>
    <h2 class="discussion-title">{{ bundle.thread.title }}</h2>
    <p class="discussion-byline">Opened by {{ name(bundle.thread.authorId) }} <span>· {{ bundle.positions.length }} contributions · {{ bundle.comments.length }} replies</span></p>
    <nav class="discussion-tabs" aria-label="Discussion and draft"><button :class="{ active: tab === 'discussion' }" :aria-current="tab === 'discussion' ? 'page' : undefined" @click="switchTab('discussion')">Discussion <span>{{ bundle.positions.length + bundle.comments.length }}</span></button><button :class="{ active: tab === 'draft' }" :aria-current="tab === 'draft' ? 'page' : undefined" @click="switchTab('draft')">{{ open ? 'Draft outcome' : 'Recorded outcome' }} <span v-if="bundle.draft">r{{ bundle.draft.revision }}</span></button></nav>
    <div v-show="tab === 'discussion'" class="discussion-conversation">
    <div :data-source="`thread:${bundle.thread.id}`"><Markdown :source="bundle.thread.body" /></div>
    <div v-if="bundle.thread.deferrals.length" class="context-note">Carried forward from {{ project.versions.find(v => v.id === bundle.thread.deferrals[bundle.thread.deferrals.length - 1]?.fromVersionId)?.name }}. Earlier contributions and votes are preserved.</div>
    <div v-if="bundle.thread.resolution" class="decision-note">
      <strong>{{ bundle.thread.resolution.kind === 'conclude' ? 'Outcome recorded' : bundle.thread.resolution.kind === 'spec' ? 'Part of the design' : bundle.thread.resolution.kind === 'grant' ? 'Ready to develop into funded work' : 'Not pursuing this change' }}</strong>
      <p v-if="bundle.thread.resolution.kind === 'reject'">{{ bundle.thread.resolution.note }}</p>
      <p v-else-if="bundle.thread.resolution.kind !== 'conclude'">{{ chosenTitle }}</p><button v-if="bundle.thread.resolution.kind === 'conclude'" class="text-action" @click="switchTab('draft')">Read the outcome →</button>
      <button v-if="bundle.thread.resolution.kind === 'grant'" class="text-action" @click="emit('grant', bundle.thread.resolution.grantId)">Open the grant draft →</button>
      <button v-else class="text-action" @click="emit('review')">See the design review →</button>
    </div>
    <div v-if="open" class="draft-summary"><div><strong>{{ bundle.draft ? 'A draft is ready to discuss.' : bundle.brief ? 'An illustrative starting draft is available.' : 'Conversation first. A draft when it helps.' }}</strong><p>{{ bundle.draft ? 'Review the synthesis, then bring feedback back here.' : 'No separate requirement cards to maintain.' }}</p></div><button class="text-action" @click="switchTab('draft')">{{ bundle.draft || bundle.brief ? 'Read draft' : 'Prepare a draft' }} →</button></div>
    <div class="section-heading discussion-section"><h3>Contributions & replies</h3><span>{{ contributions.length }}</span></div>
    <p v-if="!contributions.length" class="empty-note">No contributions yet. A short suggestion, test result, or useful question is a good start.</p>
    <details v-for="({ p, tally }, index) in contributions" :key="p.id" class="approach" :data-source="`position:${p.id}`" :open="true">
      <summary><span class="approach-index">{{ String(index + 1).padStart(2, '0') }}</span><span class="approach-summary"><strong>{{ positionTitle(p.body, 110) }}</strong><small>{{ name(p.authorId) }} · {{ tally.voters }} {{ tally.voters === 1 ? 'voter' : 'voters' }}<template v-if="tally.weightedRank === 1 && tally.voters"> · Leading by weighted support</template></small></span><span class="approach-toggle">＋</span></summary>
      <div class="approach-body">
        <Markdown :source="p.body" />
        <div class="support-row"><div class="row"><button class="support-button" :class="{ selected: myVote(p.id) === 1 }" :aria-pressed="myVote(p.id) === 1" :disabled="!canContribute || busy" aria-label="Support this approach" @click="vote(p.id, 1)">↑ Support {{ tally.rawUp }}</button><button class="support-button" :class="{ opposed: myVote(p.id) === -1 }" :aria-pressed="myVote(p.id) === -1" :disabled="!canContribute || busy" aria-label="Oppose this approach" @click="vote(p.id, -1)">↓ {{ tally.rawDown }}</button></div><span class="small muted">{{ signed(tally.weightedScore) }} weighted</span></div>
        <div v-for="c in bundle.comments.filter(c => c.positionId === p.id)" :key="c.id" class="workspace-comment" :data-source="`comment:${c.id}`"><span class="comment-avatar">{{ name(c.authorId).slice(0, 1) }}</span><div><strong>{{ name(c.authorId) }}</strong><Markdown :source="c.body" /></div></div>
        <form v-if="canContribute" class="workspace-comment-form" @submit.prevent="comment(p.id)"><label :for="`reply-${p.id}`" class="sr-only">Reply to {{ positionTitle(p.body) }}</label><input :id="`reply-${p.id}`" v-model="comments[p.id]" type="text" placeholder="Add a question, constraint, or evidence…" required /><button class="btn btn-ghost" :disabled="busy || !comments[p.id]?.trim()">Reply</button></form>
      </div>
    </details>
    <form v-if="canContribute" class="new-approach" @submit.prevent="post"><label for="approach-draft"><strong>Add to the conversation</strong><span>You don’t need a complete specification to contribute.</span></label><textarea id="approach-draft" v-model="draft" placeholder="Suggest an approach. Explain the trade-off, or share something you’ve learned." required /><div class="spread"><button type="button" class="text-action" :disabled="busy" :aria-pressed="builder" @click="write(() => backend.setBuilderIntent({ threadId: bundle.thread.id, on: !builder }))">{{ builder ? '✓ I can help build this' : '+ I can help build this' }}</button><button class="btn" :disabled="busy || !draft.trim()">Post contribution →</button></div></form>
    <p v-else-if="!state.me" class="context-note">Choose a demo persona above to contribute.</p>
    <details class="weight-disclosure"><summary>How support is weighted<template v-if="myWeight"> · your vote counts {{ myWeight.total }}</template></summary><WeightBox v-if="myWeight" :breakdown="myWeight" /><p v-else class="small">Votes combine token holdings, relevant expertise, builder intent, and project role.</p><p class="small muted">Support informs the lead’s decision; it does not make it automatically.</p></details>
    <details v-if="isLead && open" class="lead-disclosure"><summary>Other ways to finish <span>Defer or decline</span></summary><ResolvePanel :bundle="bundle" :analysis="analysis" :project="project" @done="emit('review')" /></details>
    </div>
    <div v-show="tab === 'draft'"><OutcomeDraft :bundle="bundle" :project="project" @conversation="switchTab('discussion')" @grant="emit('grant', $event)" /></div>
  </article>
</template>
