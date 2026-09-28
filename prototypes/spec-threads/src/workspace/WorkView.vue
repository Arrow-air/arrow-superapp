<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import GrantDetail from '../pages/GrantDetail.vue';
import RecordAttachments from '../components/RecordAttachments.vue';
import WorkFields from '../components/WorkFields.vue';
import { act, backend, state } from '../data/store';
import { trackingOf } from '../lib/projectRecords';
import { proposerAward } from '../lib/retro';
import type { Grant, WorkInput } from '../lib/types';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import { arrow, reportedWork, systemName } from './derive';
import { recordStatus, shortDate, stageLabel } from './labels';

const { q, patch, to, go, router } = useNav();
const { data, isLead } = useProject();
const selected = computed(() => data.value?.grants.find((g) => g.id === q('grant')));
const system = computed(() => q('system'));
const search = computed({ get: () => q('find'), set: (v: string) => void patch({ find: v || undefined }) });
const systemOf = (g: Grant) => data.value?.bundles.find((b) => b.thread.id === g.threadId)?.thread.system || 'project-wide';
const visible = computed(() => (data.value?.grants ?? []).filter((g) => (!system.value || systemOf(g) === system.value) && `${g.title} ${g.scope}`.toLowerCase().includes(search.value.toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
const groups = computed(() => {
  const by = (stages: string[], owned?: boolean) => visible.value.filter((g) => stages.includes(trackingOf(g).stage) && (owned === undefined || !!trackingOf(g).ownerId === owned));
  return [
    { id: 'review', title: isLead.value ? 'Waiting for your review' : 'Waiting for review', items: by(['in_review']) },
    { id: 'claim', title: 'Open to claim', items: by(['open'], false) },
    { id: 'progress', title: 'In progress', items: [...by(['in_progress']), ...by(['open'], true)] },
    { id: 'draft', title: 'Being scoped', items: by(['draft']) },
  ].filter((g) => g.items.length);
});
const done = computed(() => visible.value.filter((g) => ['completed', 'cancelled'].includes(trackingOf(g).stage)));
const reported = computed(() => (data.value ? reportedWork(data.value).filter((w) => (!system.value || (w.record.systems[0] || 'project-wide') === system.value) && `${w.record.title} ${w.record.summary} ${w.record.owner ?? ''}`.toLowerCase().includes(search.value.toLowerCase())) : []));
const reportedDone = computed(() => (data.value ? data.value.evidence.records.filter((r) => (r.kind === 'result' || (r.kind === 'work' && r.status === 'completed')) && (!system.value || (r.systems[0] || 'project-wide') === system.value)) : []));

// Work comes from a settled discussion, so it carries the reasoning and the proposer.
const composing = ref(false), source = ref(''), busy = ref(false);
const blank = (): WorkInput => ({ kind: 'bounty', purpose: 'implementation', title: '', scope: '', acceptance: '' });
const work = ref<WorkInput>(blank());
const settled = computed(() => (data.value?.bundles ?? []).filter((b) => b.thread.resolution?.kind === 'conclude' || b.thread.resolution?.kind === 'spec'));
watch(source, (id) => {
  const b = settled.value.find((x) => x.thread.id === id);
  const r = b?.thread.resolution;
  if (!b || !r) return;
  work.value = { ...work.value, title: work.value.title || b.thread.title, scope: work.value.scope || (r.kind === 'conclude' ? r.snapshot.body : ''), purpose: r.kind === 'conclude' && r.snapshot.openQuestions ? 'research' : work.value.purpose };
});
watch(() => q('from'), (id) => { if (id) { composing.value = true; source.value = id; } }, { immediate: true });
async function create() {
  busy.value = true;
  let g: Grant | undefined;
  const ok = await act(async () => { g = await backend.createWork({ threadId: source.value, work: work.value }); });
  busy.value = false;
  if (ok && g) { composing.value = false; work.value = blank(); source.value = ''; await go('work', { grant: g.id }); }
}
function back() { if (window.history.state?.back) router.back(); else go('work'); }
</script>

<template>
  <div v-if="data">
    <template v-if="selected">
      <button class="pw-back" @click="back">← Back</button>
      <div class="pw-grant"><GrantDetail :key="selected.id" :id="selected.id" embedded /></div>
      <RecordAttachments v-if="state.me" :entity-id="selected.id" />
    </template>
    <section v-else-if="q('grant')" class="pw-empty"><h2>Work not found</h2><p>The link may be out of date.</p><RouterLink class="pw-link" :to="to('work')">All work →</RouterLink></section>
    <template v-else>
      <div class="pw-page-head">
        <div><h2>Work</h2><p class="pw-muted">Grants and bounties funded from settled discussions. Claim open work, record progress, and submit results for a lead to accept.</p></div>
        <button v-if="isLead" class="pw-btn" @click="composing = !composing">New work</button>
      </div>
      <form v-if="composing && isLead" class="pw-card pw-form" @submit.prevent="create">
        <h3>Commission work from a settled discussion</h3>
        <label>Discussion<select v-model="source" required><option value="">Choose a settled discussion…</option><option v-for="b in settled" :key="b.thread.id" :value="b.thread.id">{{ b.thread.title }}</option></select></label>
        <p v-if="!settled.length" class="pw-muted pw-small">Settle a discussion first; the work keeps its reasoning and credits whoever raised it.</p>
        <WorkFields v-model="work" />
        <div class="pw-row"><button class="pw-btn" :disabled="busy || !source">Create draft</button><button type="button" class="pw-btn pw-btn-quiet" @click="composing = false">Cancel</button></div>
      </form>
      <div class="pw-filters">
        <label><span class="sr-only">System</span><select :value="system" aria-label="System" @change="patch({ system: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All systems</option><option v-for="s in [...data.project.systems, 'project-wide']" :key="s" :value="s">{{ systemName(data.evidence, s) }}</option></select></label>
        <label class="pw-grow"><span class="sr-only">Find</span><input v-model="search" type="search" placeholder="Find work or a person…" aria-label="Find work" /></label>
      </div>
      <section v-for="group in groups" :key="group.id" class="pw-card" :class="{ 'pw-card-alert': group.id === 'review' && isLead }">
        <h3>{{ group.title }} <span class="pw-count">{{ group.items.length }}</span></h3>
        <RouterLink v-for="g in group.items" :key="g.id" :to="to('work', { grant: g.id })" class="pw-work">
          <div>
            <span class="pw-eyebrow">{{ systemName(data.evidence, systemOf(g)) }} · {{ g.workKind === 'bounty' ? 'Bounty' : 'Grant' }}<template v-if="g.workPurpose === 'research'"> · research</template></span>
            <strong>{{ g.title }}</strong>
            <span class="pw-muted pw-small">{{ trackingOf(g).ownerId ? nameOf(trackingOf(g).ownerId) : 'Unclaimed' }}<template v-if="trackingOf(g).dueDate"> · due {{ shortDate(trackingOf(g).dueDate) }}</template> · idea from {{ g.proposerIds.length ? g.proposerIds.map(nameOf).join(', ') : g.proposerNote ?? 'a call, unconfirmed' }}</span>
          </div>
          <div class="pw-work-side">
            <span class="pw-stage" :data-stage="trackingOf(g).stage">{{ stageLabel[trackingOf(g).stage] }}</span>
            <span v-if="trackingOf(g).amount" class="pw-reward">{{ arrow(trackingOf(g).amount!) }}<small v-if="g.proposerShare"> incl. {{ arrow(proposerAward(trackingOf(g).amount, g.proposerShare)) }} proposer award</small></span>
          </div>
        </RouterLink>
      </section>
      <p v-if="!groups.length && !done.length" class="pw-card pw-muted">No work yet. Work is drafted when a lead settles a discussion and funds it.</p>
      <details v-if="done.length" class="pw-card pw-done">
        <summary>Done · {{ done.length }}</summary>
        <RouterLink v-for="g in done" :key="g.id" :to="to('work', { grant: g.id })" class="pw-work"><div><span class="pw-eyebrow">{{ stageLabel[trackingOf(g).stage] }}</span><strong>{{ g.title }}</strong><span class="pw-muted pw-small">{{ nameOf(trackingOf(g).ownerId) }}</span></div><div class="pw-work-side"><span v-if="trackingOf(g).amount" class="pw-reward">{{ arrow(trackingOf(g).amount!) }}</span><span class="pw-muted pw-small">{{ trackingOf(g).funding === 'paid' ? 'Paid' : 'Payment not recorded' }}</span></div></RouterLink>
      </details>
      <details v-if="reported.length || reportedDone.length" class="pw-card pw-reported">
        <summary>Reported on calls, not tracked here · {{ reported.length + reportedDone.length }}</summary>
        <p class="pw-muted pw-small">Work people described on calls or in the repository. It isn't part of this workspace's work or rewards until a discussion here funds it.</p>
        <RouterLink v-for="w in reported" :key="w.record.id" :to="to('work', { record: w.record.id })" class="pw-work">
          <div><span class="pw-eyebrow">{{ systemName(data.evidence, w.record.systems[0]) }} · reported {{ shortDate(w.record.date) }}</span><strong>{{ w.record.title }}</strong><span class="pw-muted pw-small">{{ w.record.owner }}<template v-if="w.link"> · being discussed</template></span></div>
          <div class="pw-work-side"><span class="pw-stage" :data-stage="w.record.status">{{ recordStatus[w.record.status] }}</span></div>
        </RouterLink>
        <RouterLink v-for="r in reportedDone" :key="r.id" :to="to('work', { record: r.id })" class="pw-work"><div><span class="pw-eyebrow">Reported done {{ shortDate(r.date) }}</span><strong>{{ r.title }}</strong><span class="pw-muted pw-small">{{ r.owner }}</span></div></RouterLink>
      </details>
    </template>
  </div>
</template>
