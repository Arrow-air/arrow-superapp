<script setup lang="ts">
import {isSharedProject} from '../data/projectDataMode';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import WorkFields from './WorkFields.vue';
import { useUnsaved } from '../composables/useUnsaved';
import GrantDetail from '../pages/GrantDetail.vue';
import { handleOf, nameOf, memberById, state, act, backend, myRoleOn } from '../data/store';
import type { Grant, Project, Version, WorkInput } from '../lib/types';
import type { ThreadBundle } from '../data/backend';
import { isActiveWork, nextWorkStep } from '../lib/projectBriefing';
import { trackingOf, workStages } from '../lib/projectRecords';
const props = defineProps<{project:Project; version:Version; grants:Grant[]; bundles:ThreadBundle[]}>();
const emit = defineEmits<{navigate:[view:string, query?:Record<string,string|undefined>]}>();
const filtersOpen=ref(false);
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
const queues=[{id:'active',label:'Active work'},{id:'review',label:'Needs review'},{id:'mine',label:'My work'},{id:'open',label:'Open opportunities'},{id:'all',label:'All work'},{id:'history',label:'History'}];
const queue=computed(()=>queues.some(q=>q.id===route.query.queue)?String(route.query.queue):'active');
watch(()=>route.query.system, value=>{system.value=String(value??'');},{immediate:true});
const leadName=computed(()=>memberById.value.get(state.roles.find(r=>r.projectId===props.project.id&&r.role==='lead')?.memberId??'')?.displayName.split(' (')[0]??'Project lead');
const next=(g:Grant)=>nextWorkStep(g,state.members,leadName.value);
const matchQueue=(g:Grant,q=queue.value)=>q==='all'||(q==='active'&&isActiveWork(g))||(q==='history'&&!isActiveWork(g))||(q==='review'&&trackingOf(g).stage==='in_review')||(q==='mine'&&!!state.me&&trackingOf(g).ownerId===state.me.id&&isActiveWork(g))||(q==='open'&&trackingOf(g).stage==='open'&&!trackingOf(g).ownerId);
const filterCount=computed(()=>[kind.value,stage.value,owner.value,system.value,funding.value].filter(Boolean).length);
function switchQueue(id:string){stage.value='';emit('navigate','work',{queue:id,all:allVersions.value?'1':undefined,system:system.value||undefined});}
function resetFilters(){search.value='';kind.value='';stage.value='';owner.value='';system.value='';funding.value='';}
const allVersions = computed(()=> route.query.all === '1');
const selected = computed(()=>props.grants.find(g=>g.id===route.query.grant));
const versionWork = computed(()=>props.grants.filter(g=>allVersions.value || g.versionId===props.version.id));
const rows = computed(()=>versionWork.value.filter(g=>matchQueue(g) && (!kind.value || (g.workKind ?? 'grant')===kind.value) && (!stage.value || trackingOf(g).stage===stage.value) && (!owner.value || (owner.value==='unassigned' ? !trackingOf(g).ownerId : trackingOf(g).ownerId===owner.value)) && (!funding.value || trackingOf(g).funding===funding.value) && (!system.value || props.bundles.find(b=>b.thread.id===g.threadId)?.thread.system===system.value) && `${g.title} ${g.scope}`.toLowerCase().includes(search.value.toLowerCase())));
const countQueue=(q:string)=>versionWork.value.filter(g=>matchQueue(g,q)).length;
const overdue = (g:Grant)=>trackingOf(g).dueDate && trackingOf(g).dueDate < new Date().toLocaleDateString('en-CA') && !['completed','cancelled'].includes(trackingOf(g).stage);
</script>
<template>
  <section class="records-view work-view">
    <div v-if="!selected" class="section-heading"><div><span class="eyebrow">WORK / {{ allVersions ? 'ALL VERSIONS' : version.name }}</span><h2>Find your next step.</h2><p>Review a submission, move your work forward, or find a place to contribute.</p></div><button v-if="lead" class="btn" @click="begin()">New work package</button></div>
    <form v-if="composing && lead" class="record-document stack" @submit.prevent="create"><h3>Commission work</h3><label class="field-row">Reviewed source outcome<select v-model="source" aria-label="Reviewed source outcome" required><option value="">Choose an outcome…</option><option v-for="b in outcomes" :key="b.thread.id" :value="b.thread.id">{{ project.versions.find(v=>v.id===b.thread.versionId)?.name }} · {{ b.thread.title }}</option></select></label><p class="small muted">The work keeps the source version and reviewed document. You can link additional decisions in its work plan.</p><WorkFields v-model="newWork" /><div class="row"><button class="btn" :disabled="busy || !source">Create work draft</button><button type="button" class="btn btn-ghost" @click="cancel">Cancel</button></div></form>
    <template v-else-if="selected"><div class="workspace-grant"><button class="text-action" @click="emit('navigate','work',{all:allVersions?'1':undefined,queue:queue})">← Back to work</button><GrantDetail :key="selected.id" :id="selected.id" embedded /></div><section v-if="bundles.some(b=>b.thread.sourceGrantId===selected!.id)" class="linked-record"><h3>Follow-up discussions</h3><button v-for="b in bundles.filter(b=>b.thread.sourceGrantId===selected!.id)" :key="b.thread.id" class="text-action" @click="emit('navigate','shape',{thread:b.thread.id,version:b.thread.versionId})">{{ b.thread.title }} →</button></section></template>
    <template v-else>
      <nav class="work-queues" aria-label="Work views"><button v-for="q in queues" :key="q.id" :class="{active:queue===q.id}" :aria-pressed="queue===q.id" @click="switchQueue(q.id)">{{ q.label }} <span>{{ countQueue(q.id) }}</span></button></nav>
      <div class="work-search"><input v-model="search" type="search" aria-label="Search work" placeholder="Find work…" /><button class="btn btn-ghost" :aria-expanded="filtersOpen" aria-controls="work-filters" @click="filtersOpen=!filtersOpen">Filter{{ filterCount ? ` · ${filterCount}` : '' }}</button><button v-if="filterCount||search" class="text-action" @click="resetFilters">Clear filters</button></div>
      <div v-show="filtersOpen" id="work-filters" class="records-toolbar work-filters"><select v-model="kind" aria-label="Work type filter"><option value="">Grants & bounties</option><option value="grant">Grants</option><option value="bounty">Bounties</option></select><select v-model="stage" aria-label="Work status filter"><option value="">All statuses</option><option v-for="(label,key) in workStages" :key="key" :value="key">{{ label }}</option></select><select v-model="owner" aria-label="Owner filter"><option value="">All owners</option><option value="unassigned">Unassigned</option><option v-for="m in state.members" :key="m.id" :value="m.id">{{ m.displayName }}</option></select><select v-model="system" aria-label="Work subsystem"><option value="">All subsystems</option><option v-for="s in project.systems" :key="s">{{ s }}</option></select><select v-model="funding" aria-label="Funding filter"><option value="">All funding</option><option value="unfunded">Unfunded</option><option value="proposed">Proposed</option><option value="funded">Funded</option><option value="paid">Paid</option></select><label class="record-check"><input type="checkbox" :checked="allVersions" @change="emit('navigate','work',{all:allVersions?undefined:'1',queue:queue,system:system||undefined})" />All versions</label></div>
      <p class="small muted">{{ rows.length }} {{ rows.length===1?'item':'items' }} · {{ queue==='history'?'Completed and cancelled work':queue==='all'?'Active and historical work':queue==='review'?`Awaiting ${leadName}’s review`:queue==='mine'?'Your active assignments':queue==='open'?'Unassigned work; agree scope and assignment with the lead':'Completed and cancelled work are in History' }}</p>
      <div v-if="rows.length" class="work-list"><button v-for="g in rows" :key="g.id" class="work-row" @click="emit('navigate','work',{grant:g.id,version:g.versionId,all:allVersions?'1':undefined,queue:queue})"><div><span class="eyebrow">{{ bundles.find(b=>b.thread.id===g.threadId)?.thread.system ?? 'project-wide' }} · {{ g.workKind ?? 'grant' }}<template v-if="allVersions"> · {{ project.versions.find(v=>v.id===g.versionId)?.name }}</template></span><h3>{{ g.title }}</h3><p class="work-next">{{ next(g) }}</p></div><div class="work-row-state"><span class="work-stage" :data-stage="trackingOf(g).stage">{{ workStages[trackingOf(g).stage] }}</span><p v-if="queue==='open'" class="small"><b>{{ trackingOf(g).budget || 'Budget to agree' }}</b> · {{ trackingOf(g).funding }}</p><p v-else class="small">{{ trackingOf(g).ownerId ? nameOf(trackingOf(g).ownerId) : 'Unassigned' }}<span v-if="trackingOf(g).dueDate && isActiveWork(g)" :class="{overdue:overdue(g)}"> · {{ overdue(g)?'Overdue':'Due' }} {{ trackingOf(g).dueDate }}</span></p></div><span aria-hidden="true">→</span></button></div>
      <div v-else class="record-empty"><h3>{{ queue==='mine'&&!state.me ? (isSharedProject?'Sign in to see your work.':'Choose a persona to see your work.') : queue==='review'&&!filterCount&&!search ? 'Nothing waiting for review.' : 'No work in this view.' }}</h3><p>Try another view or clear the filters. Research can start before the design is settled.</p><button class="text-action" @click="emit('navigate','shape')">Open discussions →</button></div>
    </template>
  </section>
</template>
