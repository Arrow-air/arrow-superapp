<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AircraftMap from './AircraftMap.vue';
import type { ThreadBundle } from '../data/backend';
import type { Decision, Grant, Project, SpecificationSection, Version } from '../lib/types';
import { state, memberById, myRoleOn } from '../data/store';
import { projectBriefing, isActiveWork, nextWorkStep } from '../lib/projectBriefing';
import { workStages, trackingOf } from '../lib/projectRecords';
import { buildingVersion } from '../lib/versions';
const props = defineProps<{project:Project;version:Version;bundles:ThreadBundle[];decisions:Decision[];grants:Grant[];sections:SpecificationSection[]}>();
const emit = defineEmits<{navigate:[view:string,query?:Record<string,string|undefined>]}>();
const route=useRoute();
const brief=computed(()=>projectBriefing(props.project,props.version.id,props.bundles,props.decisions,props.grants,props.sections));
const building=computed(()=>buildingVersion(props.project));
const leadName=computed(()=>memberById.value.get(state.roles.find(r=>r.projectId===props.project.id&&r.role==='lead')?.memberId??'')?.displayName.split(' (')[0]??'Project lead');
const lead=computed(()=>myRoleOn(props.project.id)==='lead');
const focus=computed(()=>brief.value.systems.find(s=>s.system===route.query.system));
const reviews=computed(()=>brief.value.work.filter(g=>trackingOf(g).stage==='in_review'));
const moving=computed(()=>brief.value.work.filter(g=>trackingOf(g).stage==='in_progress').sort((a,b)=>Number(trackingOf(b).ownerId===state.me?.id)-Number(trackingOf(a).ownerId===state.me?.id)));
const opportunities=computed(()=>brief.value.work.filter(g=>trackingOf(g).stage==='open'&&!trackingOf(g).ownerId));
const owner=(g:Grant)=>memberById.value.get(trackingOf(g).ownerId)?.displayName.split(' (')[0]??'Unassigned';
const next=(g:Grant)=>nextWorkStep(g,state.members,leadName.value);
const goWork=(g:Grant)=>emit('navigate','work',{grant:g.id,version:g.versionId});
const goSystem=(system?:string)=>emit('navigate','overview',{system});
const openQuestions=computed(()=>brief.value.threads.filter(b=>b.thread.status==='open'));
const sourceGrant=(d:Decision)=>{const id=props.bundles.find(b=>b.thread.id===d.threadId)?.thread.sourceGrantId;return props.grants.find(g=>g.id===id);};
const stateOf=(s:typeof brief.value.systems[number])=>s.stale||s.pending.length?'Specification needs updating':s.work.some(g=>trackingOf(g).stage==='in_review')?'Results ready for review':s.work.some(g=>trackingOf(g).stage==='in_progress')?'Work underway':s.conversations.some(b=>b.thread.status==='open')?'Questions being explored':s.section?'Design documented':'Ready for a first contribution';
</script>
<template>
<section class="project-overview records-view">
  <template v-if="!focus">
    <header class="briefing-heading"><span class="eyebrow">PROJECT BRIEFING / {{ version.name }}</span><h2>Here’s where things stand.</h2><p>{{ building && building.id!==version.id ? `${building.name} is in the workshop. ` : '' }}{{ version.name }} {{ ['frozen','building'].includes(version.state) ? 'has a locked design. Delivery and learning continue.' : brief.current.length || brief.work.length ? 'is taking shape. Follow the agreed design, active work, and open questions below.' : 'is open for ideas. Start with a question or an approach; no design or work has been recorded yet.' }}</p></header>
    <div class="briefing-grid">
      <section class="briefing-panel attention-panel"><div class="section-heading"><h3>{{ lead ? 'Needs your attention' : 'Needs attention' }}</h3><span class="small muted">{{ lead ? 'As project lead' : leadName + ' leads review' }}</span></div>
        <button v-for="g in reviews.slice(0,3)" :key="g.id" class="briefing-item" @click="goWork(g)"><span class="eyebrow">REVIEW SUBMISSION</span><strong>{{ g.title }}</strong><span>{{ owner(g) }} submitted results · {{ lead ? 'Ready for your review' : 'Awaiting '+leadName }}</span><span class="text-action">Read the results →</span></button>
        <button v-if="reviews.length>3" class="text-action" @click="emit('navigate','work',{queue:'review'})">All {{ reviews.length }} submissions →</button>
        <button v-for="s in brief.stale" :key="s.id" class="briefing-item" @click="emit('navigate','design',{system:s.system})"><strong>Update {{ s.system }} specification</strong><span>A source decision was replaced. The document still needs review.</span></button>
        <button v-for="d in brief.missing.slice(0,2)" :key="d.id" class="briefing-item" @click="emit('navigate','design',{system:bundles.find(b=>b.thread.id===d.threadId)?.thread.system??'project-wide'})"><span class="eyebrow">UPDATE THE SPECIFICATION</span><strong>{{ d.chosen }}</strong><span>Adopted, but not yet incorporated into a specification.</span></button>
        <button v-if="brief.missing.length>2" class="text-action" @click="emit('navigate','design')">All {{ brief.missing.length }} decisions awaiting a specification →</button>
        <p v-if="!reviews.length&&!brief.missing.length&&!brief.stale.length" class="empty-note">No submitted work or specification updates waiting for review.</p>
      </section>
      <section class="briefing-panel"><div class="section-heading"><h3>Moving forward</h3><button class="text-action" @click="emit('navigate','work')">Active work →</button></div><button v-for="g in moving.slice(0,3)" :key="g.id" class="briefing-item" @click="goWork(g)"><strong>{{ g.title }}</strong><span>{{ owner(g) }} · {{ trackingOf(g).milestones.length ? `${trackingOf(g).milestones.filter(m=>m.completed).length} of ${trackingOf(g).milestones.length} milestones accepted` : 'In progress' }}</span></button><p v-if="!moving.length" class="empty-note">No work is in progress for this version.</p><div class="briefing-footer"><b>{{ openQuestions.length }} open {{ openQuestions.length===1?'question':'questions' }}</b><p>Not every conversation needs a design change or a grant.</p><button class="text-action" @click="emit('navigate','shape')">Join the discussion →</button></div></section>
    </div>
    <div class="section-heading"><div><h3>Follow a part of the aircraft</h3><p>Current design, work, and the decisions connecting them.</p></div></div>
    <div class="subsystem-stories"><button v-for="s in brief.systems" :key="s.system" class="story-card" @click="goSystem(s.system)"><span class="eyebrow">{{ s.system }}</span><h3>{{ stateOf(s) }}</h3><p>{{ s.section ? 'Specification available' : s.design.length ? 'Decisions adopted · no specification yet' : 'No agreed design yet' }}</p><span>{{ s.work.filter(isActiveWork).length }} active work · {{ s.conversations.filter(b=>b.thread.status==='open').length }} open questions <b aria-hidden="true">→</b></span></button></div>
    <section class="briefing-panel opportunity-panel"><div class="section-heading"><div><h3>Where you can help</h3><p>Open work without an assigned contributor.</p></div><button class="text-action" @click="emit('navigate','work',{queue:'open'})">All opportunities →</button></div><button v-for="g in opportunities.slice(0,3)" :key="g.id" class="briefing-item" @click="goWork(g)"><strong>{{ g.title }}</strong><span>{{ trackingOf(g).budget || 'Budget to agree' }} · {{ trackingOf(g).funding }} · {{ g.workKind??'grant' }}</span></button><p v-if="!opportunities.length" class="empty-note">No unassigned opportunities right now. The discussions are open for ideas.</p></section>
    <details class="record-followup aircraft-explorer"><summary>Explore the aircraft visually</summary><AircraftMap :project-id="project.id" :systems="project.systems" @select="goSystem" /></details>
  </template>
  <template v-else>
    <button class="text-action" @click="goSystem()">← Project overview</button><header class="briefing-heading"><span class="eyebrow">{{ version.name }} / CONNECTED OVERVIEW</span><h2 class="capitalize">{{ focus.system }}</h2><p>{{ stateOf(focus) }}. {{ focus.section ? 'Read the current specification, then follow the work and its reasoning below.' : 'Follow the questions and decisions below; a specification is not required before research can begin.' }}</p></header>
    <div class="story-actions"><button class="btn" @click="emit('navigate','design',{system:focus.system})">{{ focus.section ? 'Read current specification' : 'Explore design decisions' }} →</button><button class="btn btn-ghost" @click="emit('navigate','shape',{system:focus.system})">Join a discussion</button></div>
    <div class="briefing-grid"><section class="briefing-panel"><h3>Now & next</h3><button v-for="g in focus.work.filter(isActiveWork).sort((a,b)=>Number(trackingOf(b).stage==='in_review')-Number(trackingOf(a).stage==='in_review'))" :key="g.id" class="briefing-item" @click="goWork(g)"><span class="work-stage" :data-stage="trackingOf(g).stage">{{ workStages[trackingOf(g).stage] }}</span><strong>{{ g.title }}</strong><span>{{ next(g) }}</span></button><p v-if="!focus.work.some(isActiveWork)" class="empty-note">No active work here. A design decision doesn’t have to create a work package.</p></section>
    <section class="briefing-panel"><h3>What we decided—and why</h3><article v-for="d in focus.design" :key="d.id" class="story-decision"><button class="text-action" @click="emit('navigate','design',{decision:d.id})">{{ d.chosen }} →</button><p>{{ d.rationale || d.question }}</p><button v-if="sourceGrant(d)" class="story-origin" @click="goWork(sourceGrant(d)!)">Informed by results: {{ sourceGrant(d)!.title }} →</button><button class="text-action small" @click="emit('navigate','shape',{thread:d.threadId,version:d.versionId})">Read the conversation →</button><p v-if="d.supersedesIds?.length" class="small muted">Replaces: {{ d.supersedesIds.map(id=>decisions.find(x=>x.id===id)?.chosen??'Earlier decision').join('; ') }}</p></article><p v-if="!focus.design.length" class="empty-note">No design adopted for this subsystem yet.</p></section></div>
    <section class="briefing-panel"><h3>Still being explored</h3><button v-for="b in focus.conversations.filter(b=>b.thread.status==='open')" :key="b.thread.id" class="briefing-item" @click="emit('navigate','shape',{thread:b.thread.id,version:b.thread.versionId})"><strong>{{ b.thread.title }}</strong><span>Continue the original conversation →</span></button><p v-if="!focus.conversations.some(b=>b.thread.status==='open')" class="empty-note">No open discussions for this subsystem in {{ version.name }}.</p></section>
    <details class="record-followup"><summary>Completed work & earlier outcomes</summary><button v-for="g in focus.work.filter(g=>!isActiveWork(g))" :key="g.id" class="briefing-item" @click="goWork(g)"><strong>{{ g.title }}</strong><span>{{ next(g) }}</span></button><button class="text-action" @click="emit('navigate','design',{system:focus.system,mode:'history'})">Full decision history →</button></details>
  </template>
</section>
</template>
