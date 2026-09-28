<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import Markdown from '../components/Markdown.vue';
import FollowUp from '../components/FollowUp.vue';
import { act, backend } from '../data/store';
import { currentDecisions, designDecisions, trackingOf } from '../lib/projectRecords';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import QuestionRow from './QuestionRow.vue';
import { decisionSystem, decisionTitle, discussingVersion, specFor, systemName } from './derive';
import { origin, recordStatus, shortDate, stageLabel } from './labels';
import type { SpecSystem } from './derive';

const { q, patch, to, go, router } = useNav();
const { data, isLead } = useProject();
const versions = computed(() => (data.value ? [...data.value.project.versions].sort((a, b) => a.order - b.order) : []));
const version = computed(() => versions.value.find((v) => v.id === q('version')) ?? (data.value ? discussingVersion(data.value.project) : undefined) ?? versions.value[0]);
const spec = computed(() => (data.value && version.value ? specFor(data.value, version.value) : []));
const focus = computed(() => q('system'));
const shown = computed(() => spec.value.filter((s) => (!focus.value || s.system === focus.value) && (focus.value || s.system !== 'project-wide' || s.decisions.length || s.inherited.length || s.open.length || s.section)));
const totals = computed(() => ({
  decided: spec.value.reduce((n, s) => n + s.decisions.length + s.inherited.length, 0),
  open: spec.value.reduce((n, s) => n + s.open.length, 0),
}));
const decision = computed(() => data.value?.decisions.find((d) => d.id === q('decision')));
const decisionBody = computed(() => {
  const d = decision.value;
  if (!d || !data.value) return '';
  return d.outcomeSnapshot?.body ?? d.briefSnapshot?.purpose ?? data.value.bundles.find((b) => b.thread.id === d.threadId)?.positions.find((p) => p.id === d.positionId)?.body ?? '';
});
const isCurrent = computed(() => !!decision.value && !!data.value && currentDecisions(data.value.project, decision.value.versionId, data.value.decisions).some((d) => d.id === decision.value!.id));
const linkedWork = computed(() => (decision.value && data.value ? data.value.grants.filter((g) => g.decisionIds?.includes(decision.value!.id)) : []));
const editable = computed(() => isLead.value && !!version.value && ['discussing', 'planned'].includes(version.value.state));

// Lead writes an optional prose section that pulls a system's decisions together.
const editing = ref(''), body = ref(''), note = ref(''), busy = ref(false);
function edit(s: SpecSystem) { editing.value = s.system; body.value = s.section?.body ?? s.decisions.map((d) => `- ${d.chosen}`).join('\n'); note.value = ''; }
async function save(s: SpecSystem) {
  if (!data.value || !version.value) return;
  busy.value = true;
  const ok = await act(() => backend.saveSpecification({ projectId: data.value!.project.id, versionId: version.value!.id, system: s.system, expectedRevision: s.section?.versionId === version.value!.id ? s.section.revision : 0, body: body.value, decisionIds: s.decisions.map((d) => d.id), note: note.value }));
  busy.value = false;
  if (ok) editing.value = '';
}
watch(focus, async (s) => { if (s) { await nextTick(); document.getElementById('spec-' + s)?.scrollIntoView({ block: 'start' }); } });
function back() { if (window.history.state?.back) router.back(); else go('spec'); }
</script>

<template>
  <div v-if="data && version">
    <article v-if="decision" class="pw-detail">
      <button class="pw-back" @click="back">← Back</button>
      <p class="pw-eyebrow">{{ isCurrent ? 'Decision' : 'Replaced decision' }} · {{ systemName(data.evidence, decisionSystem(data, decision)) }} · {{ data.project.versions.find(v => v.id === decision!.versionId)?.name }}</p>
      <h2 class="pw-detail-title">{{ decisionTitle(decision) }}</h2>
      <p class="pw-lede">Question: {{ decision.question }}</p>
      <p class="pw-muted">Adopted by {{ nameOf(decision.byMemberId) }} on {{ shortDate(decision.at) }}</p>
      <p v-if="decision.rationale && decision.rationale !== 'Adopted from the reviewed discussion outcome.'" class="pw-callout"><strong>Why</strong> {{ decision.rationale }}</p>
      <section v-if="decisionBody" class="pw-prose"><Markdown :source="decisionBody" /></section>
      <RouterLink class="pw-link" :to="to('discussions', { thread: decision.threadId, tab: 'draft' })">Read the discussion behind it →</RouterLink>
      <section class="pw-section">
        <h3>Work from this decision</h3>
        <p v-if="!linkedWork.length" class="pw-muted">None yet.</p>
        <RouterLink v-for="g in linkedWork" :key="g.id" :to="to('work', { grant: g.id })" class="pw-item"><span class="pw-eyebrow">{{ stageLabel[trackingOf(g).stage] }}</span><strong>{{ g.title }}</strong></RouterLink>
      </section>
      <FollowUp :key="decision.id" :decision-id="decision.id" :title="decisionTitle(decision)" />
    </article>

    <template v-else>
      <div class="pw-page-head">
        <div>
          <h2>{{ version.name }} spec</h2>
          <p class="pw-muted">What {{ version.name }} is so far: every decision a lead settled in a discussion here, and the discussions still open. Call notes and repository documents aren't in the spec until someone discusses them. {{ version.state === 'discussing' ? `It locks at the ${version.name} freeze.` : version.state === 'frozen' ? `Frozen ${version.frozenAt ? shortDate(version.frozenAt) : ''}.` : '' }}</p>
        </div>
        <RouterLink v-if="version.state === 'discussing'" class="pw-btn pw-btn-quiet" :to="to('freeze')">{{ isLead ? 'Freeze review' : 'Freeze status' }}</RouterLink>
      </div>
      <div class="pw-filters">
        <label><span class="sr-only">Version</span><select :value="version.id" aria-label="Version" @change="patch({ version: ($event.target as HTMLSelectElement).value, system: undefined })"><option v-for="v in versions" :key="v.id" :value="v.id">{{ v.name }}</option></select></label>
        <label><span class="sr-only">System</span><select :value="focus" aria-label="System" @change="patch({ system: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All systems</option><option v-for="s in spec" :key="s.system" :value="s.system">{{ s.name }}</option></select></label>
        <p class="pw-muted pw-small"><b>{{ totals.decided }}</b> decided · <b>{{ totals.open }}</b> open</p>
      </div>
      <p v-if="version.state === 'frozen'" class="pw-callout">This spec is locked. Its open discussions were settled or deferred at the freeze.</p>
      <p class="pw-legend"><span class="pw-mark pw-mark-decided">Decided</span> settled by a lead in a discussion <span class="pw-mark pw-mark-open">Open</span> being discussed now <RouterLink class="pw-link" :to="to('discussions', { status: 'suggested' })">Suggestions from calls →</RouterLink></p>

      <section v-for="s in shown" :id="'spec-' + s.system" :key="s.system" class="pw-card pw-spec">
        <div class="pw-card-head">
          <h3>{{ s.name }}</h3>
          <button v-if="editable && s.decisions.length && editing !== s.system" class="pw-btn pw-btn-quiet pw-btn-small" @click="edit(s)">{{ s.section ? 'Revise section text' : 'Write section text' }}</button>
        </div>
        <form v-if="editing === s.system" class="pw-form" @submit.prevent="save(s)">
          <label>{{ s.name }} section<textarea v-model="body" class="pw-tall" required /></label>
          <label>What changed<input v-model="note" required placeholder="e.g. Folded in the tail servo decision" /></label>
          <div class="pw-row"><button class="pw-btn" :disabled="busy">Save section</button><button type="button" class="pw-btn pw-btn-quiet" @click="editing = ''">Cancel</button></div>
        </form>
        <div v-else-if="s.section" class="pw-prose pw-spec-text"><Markdown :source="s.section.body" /><p class="pw-muted pw-small">Revision {{ s.section.revision }} · {{ nameOf(s.section.updatedBy) }} · {{ shortDate(s.section.updatedAt) }}</p></div>

        <ul class="pw-spec-lines">
          <li v-for="d in s.decisions" :key="d.id" class="pw-spec-line" data-kind="decided">
            <RouterLink :to="to('spec', { decision: d.id })"><strong>{{ decisionTitle(d) }}</strong><span><b class="pw-line-status">Decided</b> · {{ d.question }} · {{ shortDate(d.at) }}</span></RouterLink>
          </li>
          <li v-for="d in s.inherited" :key="d.id" class="pw-spec-line" data-kind="decided">
            <RouterLink :to="to('spec', { decision: d.id })"><strong>{{ decisionTitle(d) }}</strong><span>Carried from the {{ data.project.versions.find(v => v.id === d.versionId)?.name }} spec · {{ shortDate(d.at) }}</span></RouterLink>
          </li>
        </ul>
        <div v-if="s.open.length && version.state !== 'frozen'" class="pw-spec-open">
          <p class="pw-eyebrow">Open</p>
          <QuestionRow v-for="item in s.open" :key="item.key" :item="item" hide-system />
        </div>
        <p v-if="!s.decisions.length && !s.inherited.length && !s.open.length && !s.section" class="pw-muted">Nothing decided or under discussion for {{ s.name.toLowerCase() }} yet.</p>
      </section>
      <p v-if="focus" class="pw-row"><RouterLink class="pw-link" :to="to('spec', { version: q('version') || undefined })">← All systems</RouterLink></p>
    </template>
  </div>
</template>
