<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import WorkFields from './WorkFields.vue';
import { useUnsaved } from '../composables/useUnsaved';
import GrantDetail from '../pages/GrantDetail.vue';
import { handleOf, state, act, backend, myRoleOn } from '../data/store';
import type { Grant, Project, Version, WorkInput } from '../lib/types';
import type { ThreadBundle } from '../data/backend';
import { trackingOf, workStages } from '../lib/projectRecords';
const props = defineProps<{project:Project; version:Version; grants:Grant[]; bundles:ThreadBundle[]}>();
const emit = defineEmits<{navigate:[view:string, query?:Record<string,string|undefined>]}>();
const route = useRoute(), search = ref(''), kind = ref(''), stage = ref(''), owner = ref(''), system = ref(''), funding=ref('');
const composing=ref(false), source=ref(''), newWork=ref<WorkInput>({kind:'grant',purpose:'implementation',title:'',scope:'',acceptance:''}), busy=ref(false);
const dirty=computed(()=>composing.value && !!(newWork.value.title || newWork.value.scope || newWork.value.acceptance)); useUnsaved(dirty);
const lead=computed(()=>myRoleOn(props.project.id)==='lead');
const outcomes=computed(()=>props.bundles.filter(b=>b.thread.resolution?.kind==='conclude'||b.thread.resolution?.kind==='spec'));
function begin(id='') {source.value=id;composing.value=true;}

watch(source,id=>{const b=outcomes.value.find(b=>b.thread.id===id);if(!b)return; const r=b.thread.resolution;newWork.value={kind:'grant',purpose:r?.kind==='conclude'&&r.snapshot.openQuestions?'research':'implementation',title:b.thread.title,scope:r?.kind==='conclude'?r.snapshot.body:b.positions.find(p=>r?.kind==='spec'&&p.id===r.positionId)?.body??'',acceptance:''};},{flush:'sync'});
watch(()=>route.query.from, id=>{if(id)begin(String(id));},{immediate:true});
function cancel(){if(!dirty.value||confirm('Discard unsaved work draft?')){composing.value=false;}}
async function create(){busy.value=true;let g:Grant|undefined;const ok=await act(async()=>{g=await backend.createWork({threadId:source.value,work:newWork.value});});busy.value=false;if(ok&&g){composing.value=false;emit('navigate','work',{grant:g.id,version:g.versionId});}}
const allVersions = computed(()=> route.query.all === '1');
const selected = computed(()=>props.grants.find(g=>g.id===route.query.grant));
const versionWork = computed(()=>props.grants.filter(g=>allVersions.value || g.versionId===props.version.id));
const rows = computed(()=>versionWork.value.filter(g=>(!kind.value || (g.workKind ?? 'grant')===kind.value) && (!stage.value || trackingOf(g).stage===stage.value) && (!owner.value || (owner.value==='unassigned' ? !trackingOf(g).ownerId : trackingOf(g).ownerId===owner.value)) && (!funding.value || trackingOf(g).funding===funding.value) && (!system.value || props.bundles.find(b=>b.thread.id===g.threadId)?.thread.system===system.value) && `${g.title} ${g.scope}`.toLowerCase().includes(search.value.toLowerCase())));
const count = (stages:string[])=>versionWork.value.filter(g=>stages.includes(trackingOf(g).stage)).length;
const overdue = (g:Grant)=>trackingOf(g).dueDate && trackingOf(g).dueDate < new Date().toLocaleDateString('en-CA') && !['completed','cancelled'].includes(trackingOf(g).stage);
</script>
<template>
  <section class="records-view work-view">
    <div class="section-heading"><div><span class="eyebrow">WORK / {{ allVersions ? 'ALL VERSIONS' : version.name }}</span><h2>From agreed to delivered.</h2><p>Grants and bounties, organized around the work—not the conversation that started it.</p></div><button v-if="lead" class="btn" @click="begin()">New work package</button></div>
    <form v-if="composing && lead" class="record-document stack" @submit.prevent="create"><h3>Commission work</h3><label class="field-row">Reviewed source outcome<select v-model="source" aria-label="Reviewed source outcome" required><option value="">Choose an outcome…</option><option v-for="b in outcomes" :key="b.thread.id" :value="b.thread.id">{{ project.versions.find(v=>v.id===b.thread.versionId)?.name }} · {{ b.thread.title }}</option></select></label><p class="small muted">The work keeps the source version and reviewed document. You can link additional decisions in its work plan.</p><WorkFields v-model="newWork" /><div class="row"><button class="btn" :disabled="busy || !source">Create work draft</button><button type="button" class="btn btn-ghost" @click="cancel">Cancel</button></div></form>
    <template v-else-if="selected"><div class="workspace-grant"><button class="text-action" @click="emit('navigate','work',{all:allVersions?'1':undefined})">← Back to work</button><GrantDetail :key="selected.id" :id="selected.id" embedded /></div><section v-if="bundles.some(b=>b.thread.sourceGrantId===selected!.id)" class="linked-record"><h3>Follow-up discussions</h3><button v-for="b in bundles.filter(b=>b.thread.sourceGrantId===selected!.id)" :key="b.thread.id" class="text-action" @click="emit('navigate','shape',{thread:b.thread.id,version:b.thread.versionId})">{{ b.thread.title }} →</button></section></template>
    <template v-else>
      <div class="record-summary"><div><b>{{ count(['draft']) }}</b><span>being scoped</span></div><div><b>{{ count(['open']) }}</b><span>open opportunities</span></div><div><b>{{ count(['in_progress','in_review']) }}</b><span>in delivery / review</span></div><div><b>{{ count(['completed']) }}</b><span>accepted & complete</span></div></div>
      <div class="records-toolbar work-filters"><input v-model="search" type="search" aria-label="Search work" placeholder="Find a grant or bounty…" /><select v-model="kind" aria-label="Work type filter"><option value="">Grants & bounties</option><option value="grant">Grants</option><option value="bounty">Bounties</option></select><select v-model="stage" aria-label="Work status filter"><option value="">All statuses</option><option v-for="(label,key) in workStages" :key="key" :value="key">{{ label }}</option></select><select v-model="owner" aria-label="Owner filter"><option value="">All owners</option><option value="unassigned">Unassigned</option><option v-for="m in state.members" :key="m.id" :value="m.id">{{ m.displayName }}</option></select><select v-model="system" aria-label="Work subsystem"><option value="">All subsystems</option><option v-for="s in project.systems" :key="s">{{ s }}</option></select><select v-model="funding" aria-label="Funding filter"><option value="">All funding</option><option value="unfunded">Unfunded</option><option value="proposed">Proposed</option><option value="funded">Funded</option><option value="paid">Paid</option></select><label class="record-check"><input type="checkbox" :checked="allVersions" @change="emit('navigate','work',{all:allVersions?undefined:'1'})" />All versions</label></div>
      <p class="small muted">{{ rows.length }} work packages · Work continues when its design baseline is frozen.</p>
      <div v-if="rows.length" class="work-list"><button v-for="g in rows" :key="g.id" class="work-row" @click="emit('navigate','work',{grant:g.id,version:g.versionId,all:allVersions?'1':undefined})"><div><span class="eyebrow">{{ g.workKind ?? 'grant' }} · {{ g.workPurpose ?? 'implementation' }} · {{ project.versions.find(v=>v.id===g.versionId)?.name }}</span><h3>{{ g.title }}</h3><p class="small muted">{{ bundles.find(b=>b.thread.id===g.threadId)?.thread.system ?? 'project-wide' }} · {{ g.decisionIds?.length ?? 0 }} linked decisions</p></div><div><span class="work-stage" :data-stage="trackingOf(g).stage">{{ workStages[trackingOf(g).stage] }}</span><p>{{ trackingOf(g).ownerId ? '@'+handleOf(trackingOf(g).ownerId) : 'Unassigned' }}</p></div><div><b>{{ trackingOf(g).budget || 'Budget not set' }}</b><p class="small">{{ trackingOf(g).funding }} · {{ trackingOf(g).milestones.filter(m=>m.completed).length }}/{{ trackingOf(g).milestones.length }} milestones</p><span class="small" :class="{overdue:overdue(g)}">{{ trackingOf(g).dueDate ? `${overdue(g)?'Overdue · ': 'Due '}${trackingOf(g).dueDate}` : 'No due date' }}</span></div><span aria-hidden="true">→</span></button></div>
      <div v-else class="record-empty"><h3>{{ grants.length ? 'No work matches these filters.' : 'The next step needs a work package.' }}</h3><p>Review a discussion outcome, then commission a grant or bounty. Research can start before the design is settled.</p><button class="text-action" @click="emit('navigate','shape')">Open discussions →</button></div>
    </template>
  </section>
</template>
