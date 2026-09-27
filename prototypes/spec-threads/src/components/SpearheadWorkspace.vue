<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Markdown from './Markdown.vue';
import {defineAsyncComponent} from 'vue';
const LiveWorkspace=defineAsyncComponent(()=>import('./LiveWorkspace.vue'));
import ProjectSearchExtras from './ProjectSearchExtras.vue';
import WorkspaceInbox from './WorkspaceInbox.vue';
import RecordAttachments from './RecordAttachments.vue';
import FollowRecord from './FollowRecord.vue';
import { isSharedProject } from '../data/projectDataMode';
import { state, backend, act, refresh } from '../data/store';
import { SharedBackend } from '../data/sharedBackend';
import SourceLibrary from './SourceLibrary.vue';
import { recordTarget, defaultReturn, validReturn, compareRecords, designFacet } from '../lib/sourcedNavigation';
import SourcedRecordList from './SourcedRecordList.vue';
import RepoFollowThrough from './RepoFollowThrough.vue';
import { repoReview, repoReviewLabels } from '../data/spearheadRepoReview';
import { projectEvidence as spearhead } from '../data/evidenceState';
import { evidenceLabels, isStaleEvidence, kindLabels, recordsFor, sourceLabels, type SourcedRecord } from '../lib/sourcedProject';

const route = useRoute(), router = useRouter();
const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'shape', label: 'Discussions' }, { id: 'design', label: 'Design' }, { id: 'work', label: 'Work' }, { id: 'sources', label: 'Sources' }, ...(isSharedProject ? [{id:'inbox',label:'Inbox'}] : [])];
const view = computed(() => [...tabs,{id:'search'}].some(t => t.id === route.query.view) ? String(route.query.view) : 'overview');
const version = computed(() => {
  const v = String(route.query.version ?? '').replace('sh-pt', 'PT');
  return spearhead.versions.some(x => x.id === v) ? v : '';
});
const system = computed(() => spearhead.systems.find(s => s.id === route.query.system));
const queryField = (key:string) => computed({get:()=>String(route.query[key]??''),set:(value:string)=>{void router.replace({query:{...route.query,[key]:value||undefined}})}});
const search=queryField('q'), order=queryField('sort');
const contributors=queryField('contributor');
const globalSearch=computed({get:()=>view.value==='search'?search.value:'',set:(value:string)=>{void router.replace({path:'/p/spearhead',query:{view:'search',q:value||undefined}})}});
const queue = computed(() => ['all','history','in_progress','planned','confirmation','baseline','direction','as-built'].includes(String(route.query.queue)) ? String(route.query.queue) : 'active');
const here = computed(() => recordsFor(spearhead, version.value, system.value?.id));
const selected = computed(() => spearhead.records.find(r => r.id === route.query.record));
const teamMode=computed(()=>isSharedProject&&['shape','design','work'].includes(view.value)&&!!(route.query.workspace==='team'||route.query.thread||route.query.grant||route.query.decision));
const missingRecord = computed(() => !selected.value && !!(route.query.record || !isSharedProject&&(route.query.thread || route.query.grant || route.query.decision)));
async function discussRecord(){if(!state.me)return router.push('/sign-in');if(!selected.value||!(backend instanceof SharedBackend))return;let thread:any;const ok=await act(async()=>{thread=await (backend as SharedBackend).rpc('startFromEvidence',{recordId:selected.value!.id})});if(ok)await router.push({path:'/p/spearhead',query:{view:'shape',workspace:'team',thread:thread.id,version:thread.versionId}});}
const attention = computed(() => here.value.filter(r => r.attention && r.status !== 'historical'));
const moving = computed(() => here.value.filter(r => r.kind === 'work' && (r.status === 'in_progress' || (system.value && r.status === 'planned'))));
const design = computed(() => here.value.filter(r => r.kind === 'design' && r.status !== 'historical'));
const questions = computed(() => here.value.filter(r => r.kind === 'question'));
const results = computed(() => here.value.filter(r => r.kind === 'result' || r.status === 'completed' || r.status === 'historical'));
const systems = computed(() => spearhead.systems.map(s => {
  const records = recordsFor(spearhead, version.value, s.id);
  const focus = records.find(r => r.id === s.focusId) ?? records.find(r => r.attention) ?? records.find(r => r.status === 'in_progress') ?? records[0];
  return { ...s, records, focus, work: records.filter(r => r.kind === 'work' && !['completed','historical'].includes(r.status)).length, questions: records.filter(r => r.kind === 'question').length };
}));
const list = computed(() => here.value.filter(r => {
  if (contributors.value && r.owner !== contributors.value) return false;
  if (view.value === 'shape' && r.kind !== 'question') return false;
  if (view.value === 'design') {
    if (r.kind !== 'design') return false;
    if (queue.value === 'active' && r.status === 'historical') return false;
    if (queue.value === 'history' && r.status !== 'historical') return false;
    if (['baseline','direction','as-built'].includes(queue.value) && designFacet(r)!==queue.value) return false;
  }
  if (view.value === 'work') {
    if (r.kind !== 'work' && r.kind !== 'result') return false;
    if (queue.value === 'active' && !['in_progress','planned'].includes(r.status)) return false;
    if (queue.value === 'history' && !['completed','historical'].includes(r.status) && r.kind !== 'result') return false;
    if (queue.value === 'in_progress' && r.status !== 'in_progress') return false;
    if (queue.value === 'planned' && r.status !== 'planned') return false;
    if (queue.value === 'confirmation' && (!['in_progress','planned'].includes(r.status) || !isStaleEvidence(r.date,spearhead.asOf))) return false;
  }
  return `${r.title} ${r.summary} ${r.body} ${r.owner ?? ''}`.toLowerCase().includes(search.value.toLowerCase());
}).sort(compareRecords(order.value || 'status')));
const sourcesFor = (r: SourcedRecord) => spearhead.sources.filter(s => r.sourceIds.includes(s.id));
const related = computed(() => spearhead.records.filter(r => selected.value?.relatedIds.includes(r.id)));
const selectedRepoReview = computed(() => repoReview.items.filter(item => selected.value && item.relatedIds.includes(selected.value.id)));
const repoCounts = Object.entries(repoReviewLabels).map(([category, label]) => ({ category, label, count: repoReview.items.filter(item => item.category === category).length }));
function openById(id: string) { const record = spearhead.records.find(r => r.id === id); if (record) return open(record); }
const headings: Record<string,string> = { shape: 'Open questions & proposals', design: 'Design & decisions', work: 'Work & results', search:'Search project' };
const descriptions: Record<string,string> = { shape: 'Questions and proposals summarized from project discussions. Open a record for context and sources.', design: 'Repository documentation and meeting-reported direction are labeled separately. A proposal is not an approved specification.', work: 'Planned and reported work, with contributors, next steps, and supporting evidence.', search:'Search imported evidence, team records, sources, and people.' };
function navigate(nextView: string, extra: Record<string,string|undefined> = {}) {
  return router.push({ path: '/p/spearhead', query: {
    ...(nextView === view.value ? route.query : {version: version.value || undefined, system: system.value?.id}),
    view: nextView === 'overview' ? undefined : nextView, record:undefined, thread:undefined, grant:undefined, decision:undefined, back:undefined, ...extra,
  } });
}
function open(r: SourcedRecord) { return router.push(recordTarget(r,route.fullPath,route.query)); }
function backToList() { const back=validReturn(route.query.back); return router.push(back ?? (selected.value ? defaultReturn(selected.value,route.query) : '/p/spearhead')); }
watch(selected, r => {
  if (!r) return;
  const query={...route.query};let changed=false;
  if(version.value&&!r.versions.includes(version.value)){delete query.version;changed=true;}
  if(system.value&&!r.systems.includes(system.value.id)){delete query.system;changed=true;}
  if(changed)void router.replace({query});
},{immediate:true});
watch(()=>route.query.record, async (id,previous)=>{
  await nextTick();
  if(id)document.getElementById('record-heading')?.focus({preventScroll:true});
  else if(previous){const link=[...document.querySelectorAll<HTMLElement>('[data-record-id]')].find(el=>el.dataset.recordId===previous);link?.focus();link?.scrollIntoView({block:'nearest'});}
});
watch([view,selected],()=>{document.title=`${selected.value?.title ?? tabs.find(t=>t.id===view.value)?.label ?? 'Search'} · Spearhead · Arrow`;},{immediate:true});
</script>

<template>
  <div class="project-workspace sourced-workspace">
    <div class="workspace-breadcrumb">PROJECTS <span>/</span> SPEARHEAD <span class="workspace-breadcrumb-end">PROJECT WORKSPACE</span></div>
    <header class="project-heading"><div><div class="row"><h1>Spearhead</h1><span class="workspace-badge green">In development</span></div></div><a class="text-action" href="https://github.com/Arrow-air/project-spearhead" target="_blank" rel="noopener">Project repository ↗</a></header>
    <label class="project-search"><span class="sr-only">Search project</span><input v-model="globalSearch" type="search" aria-label="Search project" placeholder="Search across the project…" /></label><div class="version-timeline"><span><i class="timeline-dot build"></i><b>PT1 / PT1.5</b> transition-flight preparation</span><span class="timeline-line"></span><span><i class="timeline-dot next"></i><b>PT2</b> design discussions</span></div>
    <nav class="workspace-tabs" aria-label="Project views"><button v-for="tab in tabs" :key="tab.id" :class="{ active: view === tab.id }" :aria-current="view === tab.id ? 'page' : undefined" @click="navigate(tab.id)">{{ tab.label }}</button><label class="version-picker"><span class="sr-only">Project version</span><select aria-label="Project version" :value="version" @change="navigate(view, { version: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All prototypes</option><option v-for="v in spearhead.versions" :value="v.id" :key="v.id">{{ v.name }}</option></select></label></nav>
    <div v-if="system" class="sourced-filter-banner"><span>Following <b>{{ system.name }}</b></span><FollowRecord v-if="isSharedProject" :target="'system:'+system.id" /><button class="text-action" @click="navigate(view, { system: undefined })">All systems ×</button></div>

    <nav v-if="isSharedProject && ['shape','design','work'].includes(view) && !selected" class="work-queues" aria-label="Record origin"><button :aria-pressed="!teamMode" @click="navigate(view,{workspace:undefined})">Imported evidence</button><button :aria-pressed="teamMode" @click="navigate(view,{workspace:'team',queue:undefined})">{{view==='shape'?'Team discussions':view==='design'?'Reviewed design':'Work packages'}}</button></nav>
    <LiveWorkspace v-if="teamMode" :view="view" />
    <WorkspaceInbox v-else-if="view==='inbox'" />
    <section v-else-if="missingRecord" class="briefing-panel sourced-missing"><h2>Record unavailable</h2><p>This record is not available in this workspace. The link may be outdated or refer to the separate example workspace.</p><button class="btn" @click="navigate('overview')">Back to project overview</button></section>
    <article v-else-if="selected" class="sourced-detail records-view">
      <button class="text-action" @click="backToList">← Back to {{ String(validReturn(route.query.back)?.includes('view=sources') ? 'sources' : validReturn(route.query.back)?.includes('view=search') ? 'search' : tabs.find(t => t.id === view)?.label.toLowerCase()) }}</button>
      <header class="briefing-heading"><span class="eyebrow">{{ selected.versions.join(' / ') }} · {{ kindLabels[selected.kind] }} · {{ selected.systems.join(' / ') }}</span><h2 id="record-heading" tabindex="-1">{{ selected.title }}</h2><p>{{ selected.summary }}</p><span class="evidence-tag" :data-status="selected.status">{{ evidenceLabels[selected.status] }}</span><span class="sourced-date">Source dated {{ selected.date }}</span><span v-if="selected.eventDate" class="sourced-date">Event date {{selected.eventDate}}</span><span v-if="selected.lastVerifiedAt" class="sourced-date">Last verified {{selected.lastVerifiedAt}}</span><span v-if="isStaleEvidence(selected.date, spearhead.asOf)" class="evidence-tag stale-evidence">Evidence age · &gt;30 days</span></header>
      <div class="sourced-detail-grid"><div>
        <div v-if="isSharedProject" class="record-actions"><button class="btn" @click="discussRecord">{{state.me?'Discuss this':'Sign in to discuss'}}</button><FollowRecord :target="selected.id" /></div><section v-if="selected.next" class="detail-next"><div><b>Next step / open dependency</b><p>{{ selected.next }}</p></div></section>
        <section class="briefing-panel"><Markdown :source="selected.body" /><p v-if="selected.owner" class="sourced-contributor">Reported contributor: <b>{{ selected.owner }}</b></p></section>
        <RecordAttachments v-if="isSharedProject" :entity-id="selected.id" /><section v-if="related.length" class="briefing-panel sourced-related"><h3>Connected context</h3><SourcedRecordList :as-of="spearhead.asOf" :records="related" /></section>
      </div><aside class="briefing-panel sourced-evidence"><h3>What supports this</h3><p>{{ selected.statusNote }}</p><p v-if="isStaleEvidence(selected.date, spearhead.asOf)">Older than 30 days at this snapshot. Revalidate before treating it as current; historical evidence and documented decisions are not invalidated by age alone.</p><a v-for="source in sourcesFor(selected)" :key="source.id" :href="source.url" target="_blank" rel="noopener" class="sourced-source-link"><span class="eyebrow">{{ sourceLabels[source.kind] }} · {{ source.date }}</span><span v-if="isStaleEvidence(source.date, spearhead.asOf)" class="evidence-tag stale-evidence">Evidence age · &gt;30 days</span><strong>{{ source.title }} ↗</strong><span v-if="source.note">{{ source.note }}</span></a><section v-if="selectedRepoReview.length" class="repo-detail-review"><h3>Repository follow-through</h3><p>Documentation coverage, not approval or compliance.</p><RepoFollowThrough :items="selectedRepoReview" /><button class="text-action" @click="navigate('sources',{evidence:'review'})">See all 16 reviewed call items →</button></section><p class="small muted">Source summaries preserve context; they are not project approvals.</p></aside></div>
    </article>

    <section v-else-if="view === 'overview'" class="project-overview records-view">
      <header class="briefing-heading"><span class="eyebrow">{{ version || 'PT1 + PT2' }} / PROJECT BRIEFING · {{ spearhead.asOf }}</span><h2>{{ system ? system.name : 'Transition preparation & PT2 planning' }}</h2><p>{{ system ? 'Follow the documented design, reported work, and unresolved questions for this system.' : version ? spearhead.versions.find(v => v.id === version)?.summary : spearhead.summary }}</p></header>
      <div class="briefing-grid"><section class="briefing-panel attention-panel"><div class="section-heading"><h3>Needs attention</h3><span class="small muted">Editorial attention list</span></div><SourcedRecordList :as-of="spearhead.asOf" :records="attention.slice(0,3)" empty="No attention items identified in the imported evidence for this view." /><button v-if="attention.length > 3" class="text-action" @click="navigate('shape')">Explore the open questions →</button></section><section class="briefing-panel"><div class="section-heading"><h3>{{ system ? 'Now & next' : 'In progress' }}</h3><button class="text-action" @click="navigate('work')">See work →</button></div><SourcedRecordList :as-of="spearhead.asOf" :records="system ? moving : moving.slice(0,3)" empty="No in-progress work reported in the imported evidence for this view." /></section></div>
      <template v-if="!system">
        <section class="systems-section" aria-labelledby="systems-heading"><div class="systems-heading"><div><h3 id="systems-heading">Aircraft systems</h3><p>Design, work, and open questions by system.</p></div><span class="systems-hint">View system details ↗</span></div><div class="subsystem-stories"><button v-for="s in systems" :key="s.id" class="story-card" :data-tone="s.focus?.attention ? 'attention' : ['in_progress','planned'].includes(s.focus?.status ?? '') ? 'active' : s.focus?.kind === 'question' ? 'exploring' : ['documented','agreed'].includes(s.focus?.status ?? '') ? 'documented' : 'quiet'" @click="navigate('overview', { system: s.id })"><span class="story-card-heading"><span class="story-system-name">{{ s.name }}</span><span class="story-open" aria-hidden="true">↗</span></span><span class="story-status"><span aria-hidden="true"></span>{{ s.focus ? evidenceLabels[s.focus.status] : 'Not covered in this snapshot' }}</span><span class="story-focus"><span class="story-focus-label">{{ s.focus ? s.focus.versions.join(' / ') : 'Coverage gap' }}</span><strong>{{ s.focus?.title ?? 'No source-backed update imported' }}</strong><span class="story-detail">{{ s.focus?.summary ?? 'This does not mean the system has no work or agreed design.' }}</span></span><span class="story-card-footer"><span class="story-metrics"><span v-if="s.work"><b>{{ s.work }}</b> {{ s.work === 1 ? 'work item' : 'work items' }}</span><span v-if="s.questions"><b>{{ s.questions }}</b> {{ s.questions === 1 ? 'question' : 'questions' }}</span><span v-if="!s.work && !s.questions">{{ s.records.length }} source-backed records</span></span><time v-if="s.focus">{{ s.focus.date }}</time></span></button></div></section>
      </template>
      <template v-else><div class="briefing-grid"><section class="briefing-panel"><h3>Design & direction</h3><SourcedRecordList :as-of="spearhead.asOf" :records="design" empty="No design evidence imported for this system and prototype." /></section><section class="briefing-panel"><h3>Still being explored</h3><SourcedRecordList :as-of="spearhead.asOf" :records="questions" empty="No open questions imported for this system and prototype." /></section></div><section v-if="results.length" class="briefing-panel"><h3>Results & earlier evidence</h3><SourcedRecordList :as-of="spearhead.asOf" :records="results" /></section></template>
      <section class="sourced-coverage"><h3>Data coverage</h3><p>Project evidence, collected {{ spearhead.asOf }}. <template v-if="isSharedProject">Imported evidence is dated; new team contributions are stored separately.</template><template v-else>It is a snapshot, not a live tracker or an approval record.</template></p><button class="text-action" @click="navigate('sources')">See sources and coverage gaps →</button></section>
    </section>

    <SourceLibrary v-else-if="view === 'sources'" />

    <section v-else class="records-view sourced-list-view"><header class="briefing-heading"><h2>{{ headings[view] }}</h2><p>{{ descriptions[view] }}</p></header><nav v-if="['work','design'].includes(view)" class="work-queues" :aria-label="view === 'work' ? 'Work views' : 'Design views'"><button v-for="q in view === 'work' ? [{id:'active',label:'Active & planned'},{id:'in_progress',label:'In progress'},{id:'planned',label:'Planned'},{id:'confirmation',label:'Needs confirmation'},{id:'history',label:'Results & history'},{id:'all',label:'All work'}] : [{id:'active',label:'Design & direction'},{id:'baseline',label:'Documented baseline'},{id:'direction',label:'Call direction'},{id:'as-built',label:'As-built evidence'},{id:'history',label:'Earlier context'},{id:'all',label:'All design'}]" :key="q.id" :class="{active:queue===q.id}" :aria-pressed="queue===q.id" @click="navigate(view, { queue: q.id })">{{ q.label }}</button></nav><div class="sourced-list-filters"><label><span class="sr-only">Search records</span><input v-model="search" type="search" placeholder="Find a topic or contributor…" aria-label="Search records" /></label><label><span class="sr-only">Aircraft system</span><select aria-label="Aircraft system" :value="system?.id ?? ''" @change="navigate(view, { system: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All systems</option><option v-for="s in spearhead.systems" :key="s.id" :value="s.id">{{ s.name }}</option></select></label><label><span class="sr-only">Sort records</span><select v-model="order" aria-label="Sort records"><option value="">Status, then newest</option><option value="date">Newest evidence</option><option value="contributor">Contributor</option><option value="prototype">Prototype</option></select></label><label><span class="sr-only">Contributor</span><select v-model="contributors" aria-label="Contributor"><option value="">All contributors</option><option v-for="person in [...new Set(here.map(r=>r.owner).filter(Boolean))].sort()" :key="person" :value="person">{{ person }}</option></select></label><span class="small muted" role="status">{{ list.length }} {{ list.length === 1 ? 'record' : 'records' }}</span></div><section class="briefing-panel"><h3 v-if="view==='search'">Imported records · {{list.length}}</h3><SourcedRecordList :as-of="spearhead.asOf" :records="list" /></section><ProjectSearchExtras v-if="view==='search'" :query="search" /></section>
  </div>
</template>
