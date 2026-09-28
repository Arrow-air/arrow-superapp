<script setup lang="ts">
import { computed, ref } from 'vue';
import EvidenceImport from '../components/EvidenceImport.vue';
import ReconciliationQueue from '../components/ReconciliationQueue.vue';
import RepoFollowThrough from '../components/RepoFollowThrough.vue';
import { state } from '../data/store';
import { api } from '../data/sharedBackend';
import { isSharedProject } from '../data/projectDataMode';
import { repoReview } from '../data/spearheadRepoReview';
import type { ProjectSource } from '../lib/sourcedProject';
import { useNav } from './nav';
import { useProject } from './useProject';
import { recordStatus, shortDate, sourceKind } from './labels';
import { recordState, systemName } from './derive';

const { q, patch, to } = useNav();
const { data, isLead, isMember } = useProject();
const find = computed({ get: () => q('find'), set: (v: string) => void patch({ find: v || undefined }) });
const kind = computed(() => q('kind'));
const sources = computed(() => (data.value?.evidence.sources ?? []).filter((s) => (!kind.value || s.kind === kind.value) && `${s.title} ${s.note ?? ''}`.toLowerCase().includes(find.value.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date)));
const citing = (s: ProjectSource) => data.value?.evidence.records.filter((r) => r.sourceIds.includes(s.id)) ?? [];
const needsWork = computed(() => repoReview.items.filter((i) => i.category !== 'recorded'));
const error = ref('');
async function exportProject() {
  try {
    const blob = new Blob([JSON.stringify(await api('/export'), null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'spearhead-workspace.json' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e: any) { error.value = e.message; }
}
</script>

<template>
  <div v-if="data">
    <div class="pw-page-head">
      <div><h2>Sources</h2><p class="pw-muted">The calls, notes, repository documents and messages behind the records in this workspace, collected through {{ shortDate(data.evidence.asOf) }}. Anything the team adds in the app is stored separately and never overwrites a source.</p></div>
      <button v-if="isMember && isSharedProject" class="pw-btn pw-btn-quiet" @click="exportProject">Export project data</button>
    </div>
    <p v-if="error" role="alert" class="pw-warn">{{ error }}</p>
    <div class="pw-filters">
      <label><span class="sr-only">Type</span><select :value="kind" aria-label="Source type" @change="patch({ kind: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All types</option><option v-for="(label, key) in sourceKind" :key="key" :value="key">{{ label }}</option></select></label>
      <label class="pw-grow"><span class="sr-only">Find</span><input v-model="find" type="search" placeholder="Find a source…" aria-label="Search sources" /></label>
      <span class="pw-muted pw-small">{{ sources.length }} sources</span>
    </div>
    <section class="pw-card">
      <details v-for="s in sources" :key="s.id" class="pw-source-row">
        <summary><span class="pw-eyebrow">{{ sourceKind[s.kind] }} · {{ shortDate(s.date) }}</span><strong>{{ s.title }}</strong><span class="pw-muted pw-small">{{ citing(s).length }} {{ citing(s).length === 1 ? 'record' : 'records' }}</span></summary>
        <p v-if="s.note" class="pw-muted pw-small">{{ s.note }}</p>
        <a :href="s.url" target="_blank" rel="noopener" class="pw-link">Open the source ↗</a>
        <RouterLink v-for="r in citing(s)" :key="r.id" :to="to('discussions', { record: r.id })" class="pw-item"><span class="pw-eyebrow">{{ recordState(data, r).label || recordStatus[r.status] }} · {{ systemName(data.evidence, r.systems[0]) }}</span><strong>{{ r.title }}</strong></RouterLink>
      </details>
    </section>

    <section class="pw-card">
      <h3>Repository catch-up <span class="pw-count">{{ needsWork.length }}</span></h3>
      <p class="pw-muted pw-small">Things agreed on calls that the Spearhead repository doesn’t record yet, or records differently. Checked {{ shortDate(repoReview.checked) }}.</p>
      <RepoFollowThrough :items="needsWork" />
      <ReconciliationQueue v-if="isSharedProject && state.me && state.roles.some(r => r.memberId === state.me!.id && r.role !== 'member')" />
    </section>

    <details class="pw-card">
      <summary>About these records</summary>
      <ul class="pw-small"><li v-for="note in data.evidence.coverage" :key="note">{{ note }}</li></ul>
    </details>
    <EvidenceImport v-if="isLead && isSharedProject" />
  </div>
</template>
