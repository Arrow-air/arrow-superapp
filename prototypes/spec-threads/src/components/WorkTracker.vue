<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { act, backend, state, myRoleOn, handleOf, memberById } from '../data/store';
import type { Decision, Grant, WorkProgress } from '../lib/types';
import { progressOf, trackingOf, transitions, workStages, designDecisions } from '../lib/projectRecords';
import { nextWorkStep } from '../lib/projectBriefing';
import Markdown from './Markdown.vue';
import FollowUp from './FollowUp.vue';
import {isSharedProject} from '../data/projectDataMode';
import {SharedBackend} from '../data/sharedBackend';
import { useUnsaved } from '../composables/useUnsaved';
const props = defineProps<{ grant: Grant; scopeDirty?: boolean }>();
const router = useRouter();
const controls=ref<HTMLDetailsElement|null>(null);
const leadName=computed(()=>memberById.value.get(state.roles.find(r=>r.projectId===props.grant.projectId&&r.role==='lead')?.memberId??'')?.displayName.split(' (')[0]??'Project lead');
const next=computed(()=>nextWorkStep(props.grant,state.members,leadName.value));
const actionLabel=computed(()=>loaded.value.stage==='in_review'&&lead.value?'Review submission':loaded.value.stage==='draft'?'Prepare work':loaded.value.stage==='completed'?'Update funding record':'Record progress');
function openControls(){if(controls.value){controls.value.open=true;controls.value.scrollIntoView({behavior:'smooth',block:'start'});controls.value.querySelector('select')?.focus({preventScroll:true});}}

const loaded = ref(trackingOf(props.grant)), form = ref<WorkProgress>(progressOf(loaded.value)), note = ref(''), busy = ref(false), saved = ref(false), decisions = ref<Decision[]>([]);
const dirty = computed(() => JSON.stringify(form.value) !== JSON.stringify(progressOf(loaded.value)) || !!note.value.trim());
useUnsaved(dirty);
watch(() => props.grant, g => { if (!dirty.value || g.id !== props.grant.id) { loaded.value = trackingOf(g); form.value = progressOf(loaded.value); } });
watch(() => state.version, async () => { try { decisions.value = await backend.listDecisions(); } catch(e) { state.error = String(e); } }, { immediate:true });
const lead = computed(() => myRoleOn(props.grant.projectId) === 'lead');
const canUpdate = computed(() => lead.value || !!state.me && loaded.value.ownerId === state.me.id);
const closed = computed(() => ['completed','cancelled'].includes(loaded.value.stage));
const available = computed(() => { const project = state.projects.find(p=>p.id===props.grant.projectId); return project ? designDecisions(project,props.grant.versionId,decisions.value) : []; });
const stages = computed(() => [loaded.value.stage, ...transitions[loaded.value.stage].filter(s=>lead.value || ['in_progress','in_review'].includes(s))]);
async function save() {
  if (busy.value) return; busy.value = true; saved.value = false;
  let result: Grant | undefined;
  const ok = await act(async () => { result = await backend.updateWork({ id:props.grant.id, expectedRevision:loaded.value.revision, content:form.value, note:note.value }); });
  busy.value = false;
  if (ok && result) { loaded.value = trackingOf(result); form.value = progressOf(loaded.value); note.value = ''; saved.value = true; }
}
function discard() { if(!dirty.value || confirm('Discard unsaved work changes?')) { loaded.value=trackingOf(props.grant);form.value=progressOf(loaded.value);note.value='';saved.value=false; } }
async function claim(){if(backend instanceof SharedBackend)await act(()=> (backend as SharedBackend).rpc('claimWork',{id:props.grant.id,note:'I accept this work package and its acceptance criteria.'}));}
function addMilestone() {
  // getRandomValues also works on the HTTP LAN preview; randomUUID requires HTTPS.
  const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  form.value.milestones.push({id, title:'', acceptance:'', evidence:'', completed:false});
}
function openDecision(id:string) { router.push({ name:'project', params:{id:props.grant.projectId}, query:{view:'design',version:props.grant.versionId,decision:id} }); }
</script>
<template>
  <section class="work-tracker">
    <div class="record-summary"><div><b>{{ workStages[loaded.stage] }}</b><span>work status</span></div><div><b>{{ loaded.ownerId ? '@'+handleOf(loaded.ownerId) : 'Unassigned' }}</b><span>owner</span></div><div><b>{{ loaded.funding }}</b><span>funding · {{ loaded.budget || 'amount not set' }}</span></div><span class="baseline-badge">{{ loaded.dueDate ? 'Due '+loaded.dueDate : 'No due date' }}</span></div>
    <div class="detail-next"><div><b>{{ loaded.stage==='completed'||loaded.stage==='cancelled'?'Outcome':'Next step' }}</b><p>{{ next }}</p></div><button v-if="canUpdate && (lead || !closed)" class="btn" @click="openControls">{{ actionLabel }}</button></div>
    <button v-if="isSharedProject && state.me && loaded.stage==='open' && !loaded.ownerId" class="btn" @click="claim">Claim this work</button>
    <section v-if="loaded.blockers" class="context-note"><strong>Blocked on</strong><Markdown :source="loaded.blockers" /></section>
    <slot />
    <section class="work-read-plan"><h3>What completion needs to show</h3><Markdown v-if="loaded.acceptance" :source="loaded.acceptance" /><p v-else class="muted">Acceptance criteria have not been defined yet.</p><div v-if="loaded.milestones.length"><h3>Milestones</h3><article v-for="m in loaded.milestones" :key="m.id" class="milestone-read"><strong>{{ m.completed?'✓':'○' }} {{ m.title }}</strong><p class="small muted">{{ m.acceptance }}</p><details v-if="m.evidence" class="read-evidence"><summary>Read milestone evidence</summary><Markdown :source="m.evidence" /></details></article></div></section>
    <section v-if="loaded.evidence" class="record-document accepted-evidence"><span class="eyebrow">{{ loaded.stage === 'completed' ? 'ACCEPTED RESULTS' : 'SUBMITTED EVIDENCE' }}</span><Markdown :source="loaded.evidence" /><p class="small muted">{{ loaded.stage === 'completed' ? 'Accepted completion is recorded in the activity history below.' : 'Submission is not acceptance. The project lead reviews completion.' }}</p></section>
    <details ref="controls" class="work-control-panel"><summary>{{ canUpdate ? 'Manage work & record progress' : 'Work plan & acceptance' }}</summary>
      <form class="stack" @submit.prevent="save">
        <div class="record-form-grid"><label class="field-row">Work status<select v-model="form.stage" aria-label="Work status" :disabled="!canUpdate || closed"><option v-for="s in stages" :key="s" :value="s">{{ workStages[s] }}</option></select></label><label class="field-row">Assigned owner<select v-model="form.ownerId" aria-label="Assigned owner" :disabled="!lead || closed"><option value="">Unassigned</option><option v-for="m in state.members" :key="m.id" :value="m.id">{{ m.displayName }}</option></select></label><label class="field-row">Due date<input v-model="form.dueDate" aria-label="Due date" type="date" :disabled="!lead || closed" /></label><label class="field-row">Funding status<select v-model="form.funding" aria-label="Funding status" :disabled="!lead"><option value="unfunded">Unfunded</option><option value="proposed">Proposed</option><option value="funded">Funded</option><option value="paid">Paid</option></select></label><label class="field-row">Budget / currency<input v-model="form.budget" aria-label="Budget / currency" :disabled="!lead" placeholder="e.g. 2,000 USDC" /></label></div>
        <label class="field-row">Acceptance criteria<textarea v-model="form.acceptance" aria-label="Acceptance criteria" :disabled="!lead || closed" placeholder="What must the deliverables demonstrate?" /></label>
        <fieldset v-if="available.length"><legend>Design decisions this work serves</legend><label v-for="d in available" :key="d.id" class="record-check"><input v-model="form.decisionIds" type="checkbox" :value="d.id" :disabled="!lead || closed" />{{ d.chosen }}</label></fieldset>
        <section class="milestones"><div class="section-heading"><h3>Milestones <span class="small muted">{{ form.milestones.filter(m=>m.completed).length }}/{{ form.milestones.length }} accepted</span></h3><button v-if="lead && !closed" type="button" class="btn btn-ghost" @click="addMilestone">Add milestone</button></div><p v-if="!form.milestones.length" class="small muted">Optional for larger work. Small bounties can use the package’s acceptance criteria alone.</p><article v-for="(m,index) in form.milestones" :key="m.id" class="milestone-card"><label class="field-row">Milestone {{ index+1 }} title<input v-model="m.title" :disabled="!lead || closed" :aria-label="`Milestone ${index+1} title`" /></label><label class="field-row">Acceptance<textarea v-model="m.acceptance" :disabled="!lead || closed" :aria-label="`Milestone ${index+1} acceptance`" /></label><label class="field-row">Evidence<textarea v-model="m.evidence" :disabled="!canUpdate || closed" :aria-label="`Milestone ${index+1} evidence`" placeholder="Links to deliverables, test reports, or review notes" /></label><div class="spread"><label class="record-check"><input v-model="m.completed" type="checkbox" :disabled="!lead || closed" />Accepted by lead</label><button v-if="lead && !closed" type="button" class="text-action" @click="form.milestones.splice(index,1)">Remove milestone</button></div></article></section>
        <label class="field-row">Blockers and dependencies<textarea v-model="form.blockers" aria-label="Work blockers" :disabled="!canUpdate || closed" placeholder="What is preventing progress? Which work or external dependency must finish first?" /></label><label class="field-row">Result evidence<textarea v-model="form.evidence" aria-label="Result evidence" :disabled="!canUpdate || closed" placeholder="Link the deliverables and describe how they meet acceptance criteria. Required before review." /></label>
        <template v-if="canUpdate"><label class="field-row">Update note<input v-model="note" aria-label="Work update note" required placeholder="What changed or what did you review?" /></label><p v-if="scopeDirty" class="context-note">Save or discard the scope edits below before updating progress.</p><button class="btn" :disabled="busy || !dirty || !note.trim() || scopeDirty">Save work update</button><button type="button" class="btn btn-ghost" @click="discard">Discard / reload progress</button></template>
      </form>
    </details>
    <p v-if="saved" role="status" class="small">Work update saved.</p>
    <div v-if="loaded.decisionIds.length" class="linked-record"><h3>Linked design decisions</h3><button v-for="id in loaded.decisionIds" :key="id" class="text-action linked-source" @click="openDecision(id)">{{ decisions.find(d=>d.id===id)?.chosen ?? id }} →</button></div>

    <details v-if="loaded.history.length" class="record-followup"><summary>Work activity · {{ loaded.history.length }} updates</summary><article v-for="(h,index) in [...loaded.history].reverse()" :key="index" class="linked-record"><b>{{ h.note }}</b><p class="small">@{{ handleOf(h.byMemberId) }} · {{ new Date(h.at).toLocaleString() }} · {{ workStages[h.content.stage] }} · {{ h.content.funding }}</p><details><summary>Work record at this update</summary><p>Owner: {{ h.content.ownerId ? '@'+handleOf(h.content.ownerId) : 'Unassigned' }} · Due: {{ h.content.dueDate || 'Not set' }} · Budget: {{ h.content.budget || 'Not set' }}</p><Markdown :source="h.content.acceptance" /><Markdown :source="h.content.evidence" /><div v-for="m in h.content.milestones" :key="m.id"><strong>{{ m.title }} · {{ m.completed ? 'Accepted' : 'Pending' }}</strong><p>{{ m.acceptance }}</p><Markdown :source="m.evidence" /></div></details></article></details>
    <FollowUp :grant-id="grant.id" :title="grant.title" />
  </section>
</template>
