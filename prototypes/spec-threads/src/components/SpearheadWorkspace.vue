<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Markdown from './Markdown.vue';
import SourcedRecordList from './SourcedRecordList.vue';
import { spearhead } from '../data/spearheadReal';
import { evidenceLabels, isStaleEvidence, kindLabels, recordsFor, type SourcedRecord } from '../lib/sourcedProject';

const route = useRoute(), router = useRouter();
const tabs = [{ id: 'overview', label: 'Overview' }, { id: 'shape', label: 'Discussions' }, { id: 'design', label: 'Design' }, { id: 'work', label: 'Work' }, { id: 'sources', label: 'Sources' }];
const view = computed(() => tabs.some(t => t.id === route.query.view) ? String(route.query.view) : 'overview');
const version = computed(() => {
  const v = String(route.query.version ?? '').replace('sh-pt', 'PT');
  return spearhead.versions.some(x => x.id === v) ? v : '';
});
const system = computed(() => spearhead.systems.find(s => s.id === route.query.system));
const search = ref('');
const queue = computed(() => ['all','history'].includes(String(route.query.queue)) ? String(route.query.queue) : 'active');
const here = computed(() => recordsFor(spearhead, version.value, system.value?.id));
const selected = computed(() => spearhead.records.find(r => r.id === route.query.record));
const missingRecord = computed(() => !selected.value && !!(route.query.record || route.query.thread || route.query.grant || route.query.decision));
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
  if (view.value === 'shape' && r.kind !== 'question') return false;
  if (view.value === 'design') {
    if (r.kind !== 'design') return false;
    if (queue.value === 'active' && r.status === 'historical') return false;
    if (queue.value === 'history' && r.status !== 'historical') return false;
  }
  if (view.value === 'work') {
    if (r.kind !== 'work' && r.kind !== 'result') return false;
    if (queue.value === 'active' && !['in_progress','planned'].includes(r.status)) return false;
    if (queue.value === 'history' && !['completed','historical'].includes(r.status) && r.kind !== 'result') return false;
  }
  return `${r.title} ${r.summary} ${r.body} ${r.owner ?? ''}`.toLowerCase().includes(search.value.toLowerCase());
}));
const sourcesFor = (r: SourcedRecord) => spearhead.sources.filter(s => r.sourceIds.includes(s.id));
const related = computed(() => spearhead.records.filter(r => selected.value?.relatedIds.includes(r.id)));
const headings: Record<string,string> = { shape: 'What’s still being worked out.', design: 'The design, with its evidence.', work: 'What people are actually working on.' };
const descriptions: Record<string,string> = { shape: 'Open questions and proposals from the real project conversations. These are summaries, not invented forum posts.', design: 'Repository documentation and meeting-reported direction are labeled separately. A proposal is not an approved specification.', work: 'Reported activity and plans—not invented grants, payouts, or acceptance records.' };
function navigate(nextView: string, extra: Record<string,string|undefined> = {}) {
  return router.push({ path: '/p/spearhead', query: { view: nextView === 'overview' ? undefined : nextView, version: version.value || undefined, system: system.value?.id, ...extra } });
}
function open(r: SourcedRecord) { return navigate(r.kind === 'work' || r.kind === 'result' ? 'work' : r.kind === 'question' ? 'shape' : 'design', { record: r.id }); }
watch([view, version, system], () => { search.value = ''; });
watch(() => route.query.record, () => { document.getElementById('main-content')?.focus(); });
</script>

<template>
  <div class="project-workspace sourced-workspace">
    <div class="workspace-breadcrumb">PROJECTS <span>/</span> SPEARHEAD <span class="workspace-breadcrumb-end">SOURCE-BACKED SNAPSHOT</span></div>
    <header class="project-heading"><div><div class="row"><h1>Spearhead</h1><span class="workspace-badge green">In development</span></div></div><a class="text-action" href="https://github.com/Arrow-air/project-spearhead" target="_blank" rel="noopener">Project repository ↗</a></header>
    <div class="version-timeline"><span><i class="timeline-dot build"></i><b>PT1 / PT1.5</b> transition-flight preparation</span><span class="timeline-line"></span><span><i class="timeline-dot next"></i><b>PT2</b> design discussions</span></div>
    <nav class="workspace-tabs" aria-label="Project views"><button v-for="tab in tabs" :key="tab.id" :class="{ active: view === tab.id }" :aria-current="view === tab.id ? 'page' : undefined" @click="navigate(tab.id)">{{ tab.label }}</button><label class="version-picker"><span class="sr-only">Project version</span><select aria-label="Project version" :value="version" @change="navigate(view, { version: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All prototypes</option><option v-for="v in spearhead.versions" :value="v.id" :key="v.id">{{ v.name }}</option></select></label></nav>
    <div v-if="system" class="sourced-filter-banner"><span>Following <b>{{ system.name }}</b></span><button class="text-action" @click="navigate(view, { system: undefined })">All systems ×</button></div>

    <section v-if="missingRecord" class="briefing-panel sourced-missing"><h2>This link belongs to a different dataset.</h2><p>The fictional record is not part of the real Spearhead snapshot. Your earlier sandbox is preserved separately.</p><button class="btn" @click="navigate('overview')">Open real project overview</button></section>
    <article v-else-if="selected" class="sourced-detail records-view">
      <button class="text-action" @click="navigate(view)">← Back to {{ tabs.find(t => t.id === view)?.label.toLowerCase() }}</button>
      <header class="briefing-heading"><span class="eyebrow">{{ selected.versions.join(' / ') }} · {{ kindLabels[selected.kind] }} · {{ selected.systems.join(' / ') }}</span><h2>{{ selected.title }}</h2><p>{{ selected.summary }}</p><span class="evidence-tag" :data-status="selected.status">{{ evidenceLabels[selected.status] }}</span><span class="sourced-date">Evidence dated {{ selected.date }}</span><span v-if="isStaleEvidence(selected.date, spearhead.asOf)" class="evidence-tag stale-evidence">Stale evidence · &gt;30 days</span></header>
      <div class="sourced-detail-grid"><div>
        <section v-if="selected.next" class="detail-next"><div><b>Next step / open dependency</b><p>{{ selected.next }}</p></div></section>
        <section class="briefing-panel"><Markdown :source="selected.body" /><p v-if="selected.owner" class="sourced-contributor">Reported contributor: <b>{{ selected.owner }}</b></p></section>
        <section v-if="related.length" class="briefing-panel sourced-related"><h3>Connected context</h3><SourcedRecordList :as-of="spearhead.asOf" :records="related" @open="open" /></section>
      </div><aside class="briefing-panel sourced-evidence"><h3>What supports this</h3><p>{{ selected.statusNote }}</p><p v-if="isStaleEvidence(selected.date, spearhead.asOf)">Older than 30 days at this snapshot. Revalidate before treating it as current; historical evidence and documented decisions are not invalidated by age alone.</p><a v-for="source in sourcesFor(selected)" :key="source.id" :href="source.url" target="_blank" rel="noopener" class="sourced-source-link"><span class="eyebrow">{{ source.kind }} · {{ source.date }}</span><span v-if="isStaleEvidence(source.date, spearhead.asOf)" class="evidence-tag stale-evidence">Stale evidence · &gt;30 days</span><strong>{{ source.title }} ↗</strong><span v-if="source.note">{{ source.note }}</span></a><p class="small muted">Summarized for this preview. Opening a source does not change or approve anything in the project.</p></aside></div>
    </article>

    <section v-else-if="view === 'overview'" class="project-overview records-view">
      <header class="briefing-heading"><span class="eyebrow">{{ version || 'PT1 + PT2' }} / PROJECT BRIEFING · {{ spearhead.asOf }}</span><h2>{{ system ? system.name : 'Get PT1.5 ready to transition. Learn before PT2.' }}</h2><p>{{ system ? 'Follow the documented design, reported work, and unresolved questions for this system.' : version ? spearhead.versions.find(v => v.id === version)?.summary : spearhead.summary }}</p></header>
      <div class="briefing-grid"><section class="briefing-panel attention-panel"><div class="section-heading"><h3>Needs attention</h3><span class="small muted">Unresolved in the sources</span></div><SourcedRecordList :as-of="spearhead.asOf" :records="attention.slice(0,3)" empty="No attention items identified in the imported evidence for this view." @open="open" /><button v-if="attention.length > 3" class="text-action" @click="navigate('shape')">Explore the open questions →</button></section><section class="briefing-panel"><div class="section-heading"><h3>{{ system ? 'Now & next' : 'Moving forward' }}</h3><button class="text-action" @click="navigate('work')">See work →</button></div><SourcedRecordList :as-of="spearhead.asOf" :records="system ? moving : moving.slice(0,3)" empty="No in-progress work reported in the imported evidence for this view." @open="open" /></section></div>
      <template v-if="!system">
        <section class="systems-section" aria-labelledby="systems-heading"><div class="systems-heading"><div><h3 id="systems-heading">Aircraft systems</h3><p>The real work and questions behind each part of the aircraft.</p></div><span class="systems-hint">Select a system to follow its story ↗</span></div><div class="subsystem-stories"><button v-for="s in systems" :key="s.id" class="story-card" :data-tone="s.focus?.attention ? 'attention' : ['in_progress','planned'].includes(s.focus?.status ?? '') ? 'active' : s.focus?.kind === 'question' ? 'exploring' : ['documented','agreed'].includes(s.focus?.status ?? '') ? 'documented' : 'quiet'" @click="navigate('overview', { system: s.id })"><span class="story-card-heading"><span class="story-system-name">{{ s.name }}</span><span class="story-open" aria-hidden="true">↗</span></span><span class="story-status"><span aria-hidden="true"></span>{{ s.focus ? evidenceLabels[s.focus.status] : 'Not covered in this snapshot' }}</span><span class="story-focus"><span class="story-focus-label">{{ s.focus ? s.focus.versions.join(' / ') : 'Coverage gap' }}</span><strong>{{ s.focus?.title ?? 'No source-backed update imported' }}</strong><span class="story-detail">{{ s.focus?.summary ?? 'This does not mean the system has no work or agreed design.' }}</span></span><span class="story-card-footer"><span class="story-metrics"><span v-if="s.work"><b>{{ s.work }}</b> {{ s.work === 1 ? 'work item' : 'work items' }}</span><span v-if="s.questions"><b>{{ s.questions }}</b> {{ s.questions === 1 ? 'question' : 'questions' }}</span><span v-if="!s.work && !s.questions">{{ s.records.length }} source-backed records</span></span><time v-if="s.focus">{{ s.focus.date }}</time></span></button></div></section>
      </template>
      <template v-else><div class="briefing-grid"><section class="briefing-panel"><h3>Design & direction</h3><SourcedRecordList :as-of="spearhead.asOf" :records="design" empty="No design evidence imported for this system and prototype." @open="open" /></section><section class="briefing-panel"><h3>Still being explored</h3><SourcedRecordList :as-of="spearhead.asOf" :records="questions" empty="No open questions imported for this system and prototype." @open="open" /></section></div><section v-if="results.length" class="briefing-panel"><h3>Results & earlier evidence</h3><SourcedRecordList :as-of="spearhead.asOf" :records="results" @open="open" /></section></template>
      <section class="sourced-coverage"><h3>What this view knows</h3><p>Real project evidence, collected {{ spearhead.asOf }}. It is a snapshot, not a live tracker or an approval record.</p><button class="text-action" @click="navigate('sources')">See sources and coverage gaps →</button></section>
    </section>

    <section v-else-if="view === 'sources'" class="records-view sourced-sources"><header class="briefing-heading"><span class="eyebrow">EVIDENCE & COVERAGE</span><h2>Nothing here is a fictional project record.</h2><p>Compiled from Vector’s published project notes, repository documents, and meeting transcripts. Evidence dates are kept separate from the snapshot date, {{ spearhead.asOf }}.</p></header><section class="briefing-panel"><h3>How to read this snapshot</h3><ul><li v-for="note in spearhead.coverage" :key="note">{{ note }}</li></ul></section><div class="sourced-source-grid"><article v-for="source in spearhead.sources" :key="source.id" class="briefing-panel"><span class="eyebrow">{{ source.kind }} · {{ source.date }}</span><span v-if="isStaleEvidence(source.date, spearhead.asOf)" class="evidence-tag stale-evidence">Stale evidence · &gt;30 days</span><h3><a :href="source.url" target="_blank" rel="noopener">{{ source.title }} ↗</a></h3><p v-if="source.note">{{ source.note }}</p><span class="small muted">{{ spearhead.records.filter(r => r.sourceIds.includes(source.id)).length }} linked records</span></article></div></section>

    <section v-else class="records-view sourced-list-view"><header class="briefing-heading"><h2>{{ headings[view] }}</h2><p>{{ descriptions[view] }}</p></header><nav v-if="['work','design'].includes(view)" class="work-queues" :aria-label="view === 'work' ? 'Work views' : 'Design views'"><button v-for="q in view === 'work' ? [{id:'active',label:'Active & planned'},{id:'history',label:'Results & history'},{id:'all',label:'All work'}] : [{id:'active',label:'Design & direction'},{id:'history',label:'Earlier context'},{id:'all',label:'All design'}]" :key="q.id" :class="{active:queue===q.id}" :aria-pressed="queue===q.id" @click="navigate(view, { queue: q.id })">{{ q.label }}</button></nav><div class="sourced-list-filters"><label><span class="sr-only">Search records</span><input v-model="search" type="search" placeholder="Find a topic or contributor…" aria-label="Search records" /></label><label><span class="sr-only">Aircraft system</span><select aria-label="Aircraft system" :value="system?.id ?? ''" @change="navigate(view, { system: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All systems</option><option v-for="s in spearhead.systems" :key="s.id" :value="s.id">{{ s.name }}</option></select></label><span class="small muted" role="status">{{ list.length }} {{ list.length === 1 ? 'record' : 'records' }}</span></div><section class="briefing-panel"><SourcedRecordList :as-of="spearhead.asOf" :records="list" @open="open" /></section></section>
  </div>
</template>
