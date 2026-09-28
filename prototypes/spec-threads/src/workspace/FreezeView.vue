<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { act, backend } from '../data/store';
import { freezeCheck, deferTargets } from '../lib/versions';
import { versionRetro, PROJECT_WIDE } from '../lib/retro';
import { positionTitle, signed } from '../lib/format';
import type { Version } from '../lib/types';
import { useNav } from './nav';
import { useProject, nameOf } from './useProject';
import { arrow, daysUntil, discussingVersion, openQuestions, recentOutcomes, systemName, tallyLeader } from './derive';
import { shortDate } from './labels';

const { to } = useNav();
const { data, isLead } = useProject();
const version = computed(() => (data.value ? discussingVersion(data.value.project) : undefined));
const frozenVersions = computed(() => (data.value?.project.versions ?? []).filter((v) => v.state === 'frozen').sort((a, b) => b.order - a.order));
const check = computed(() => (data.value && version.value ? freezeCheck(data.value.project, version.value.id, data.value.bundles.map((b) => b.thread)) : null));
const openBundles = computed(() => (data.value && check.value ? data.value.bundles.filter((b) => check.value!.open.some((t) => t.id === b.thread.id)) : []));
const settled = computed(() => (data.value && version.value ? recentOutcomes(data.value, version.value.id) : []));
const declined = computed(() => (data.value && version.value ? data.value.bundles.filter((b) => b.thread.versionId === version.value!.id && b.thread.resolution?.kind === 'reject') : []));
const unpicked = computed(() => (data.value && version.value ? openQuestions(data.value, version.value.id).filter((q) => q.kind === 'record') : []));
const retroFor = (v: Version) => (data.value ? versionRetro({ project: data.value.project, versionId: v.id, bundles: data.value.bundles, members: data.value.members, roles: data.value.roles }) : null);
const retro = computed(() => (version.value ? retroFor(version.value) : null));
const positionLabel = (id: string) => {
  const b = data.value?.bundles.find((x) => x.positions.some((p) => p.id === id));
  const p = b?.positions.find((x) => x.id === id);
  return p && b ? { title: positionTitle(p.body, 80), thread: b.thread } : undefined;
};
const later = computed(() => (data.value && version.value ? deferTargets(data.value.project, version.value.id) : []));

// Plan
const plan = reactive({ date: '', amount: '' as string | number, shares: {} as Record<string, number | ''> });
const splitting = ref(false), busy = ref(false), saved = ref(false);
watch(version, (v) => {
  plan.date = v?.freezeTarget ?? '';
  plan.amount = v?.retroPool?.amount ?? '';
  plan.shares = Object.fromEntries(Object.entries(v?.retroPool?.systemShares ?? {}).map(([k, s]) => [k, Math.round(s * 100)]));
  splitting.value = !!Object.keys(plan.shares).length;
}, { immediate: true });
const shareTotal = computed(() => Object.values(plan.shares).reduce<number>((n, v) => n + (Number(v) || 0), 0));
async function savePlan() {
  if (!data.value || !version.value || !backend.setVersionPlan) return;
  busy.value = true; saved.value = false;
  const shares = splitting.value ? Object.fromEntries(Object.entries(plan.shares).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v) / 100])) : {};
  saved.value = await act(() => backend.setVersionPlan!({ projectId: data.value!.project.id, versionId: version.value!.id, freezeTarget: plan.date, retroPool: plan.amount === '' ? null : { amount: Number(plan.amount), systemShares: shares } }));
  busy.value = false;
}

// Settling from the checklist
const acting = ref(''), note = ref('');
async function resolve(threadId: string, kind: 'defer' | 'reject') {
  if (kind === 'reject' && note.value.trim().length < 10) return;
  busy.value = true;
  const ok = await act(() => kind === 'defer' ? backend.resolveThread({ threadId, kind: 'defer', toVersionId: later.value[0].id, note: note.value.trim() || undefined }) : backend.resolveThread({ threadId, kind: 'reject', note: note.value.trim() }));
  busy.value = false;
  if (ok) { acting.value = ''; note.value = ''; }
}
async function freeze() {
  if (!data.value || !version.value || !check.value?.canFreeze) return;
  if (!confirm(`Freeze ${version.value.name}? Its spec locks, the retro split is recorded, and ${later.value[0]?.name ?? 'the next version'} opens for discussion.`)) return;
  busy.value = true;
  await act(() => backend.freezeVersion({ projectId: data.value!.project.id, versionId: version.value!.id }));
  busy.value = false;
}
const days = computed(() => (version.value?.freezeTarget ? daysUntil(version.value.freezeTarget) : null));
</script>

<template>
  <div v-if="data">
    <template v-if="version && check">
      <div class="pw-page-head">
        <div>
          <h2>{{ version.name }} freeze</h2>
          <p class="pw-muted">At the freeze the lead settles every open {{ version.name }} discussion: adopt it into the spec, fund it as work, defer it to {{ later[0]?.name ?? 'a later version' }}, or decline it with a reason. Then the spec locks and the retro pool is split.</p>
        </div>
      </div>

      <div class="pw-grid pw-grid-even">
        <section class="pw-card">
          <h3>Plan</h3>
          <template v-if="isLead">
            <form class="pw-form" @submit.prevent="savePlan">
              <label>Freeze date<input v-model="plan.date" type="date" /></label>
              <label>Retro pool ($ARROW)<input v-model="plan.amount" type="number" min="0" step="500" placeholder="e.g. 10000" /></label>
              <label class="pw-check"><input v-model="splitting" type="checkbox" />Reserve part of the pool for specific systems</label>
              <div v-if="splitting" class="pw-split">
                <label v-for="s in [...data.project.systems, PROJECT_WIDE]" :key="s">{{ systemName(data.evidence, s) }} %<input v-model="plan.shares[s]" type="number" min="0" max="100" step="5" /></label>
                <p class="pw-small" :class="shareTotal > 100 ? 'pw-warn' : 'pw-muted'">{{ shareTotal }}% assigned. The rest rewards contributions in any system.</p>
              </div>
              <div class="pw-row"><button class="pw-btn" :disabled="busy || shareTotal > 100">Save plan</button><span v-if="saved" class="pw-muted" role="status">Saved.</span></div>
            </form>
          </template>
          <template v-else>
            <p class="pw-big">{{ version.freezeTarget ? shortDate(version.freezeTarget) : 'No date yet' }}<small v-if="days !== null"> {{ days > 0 ? `in ${days} days` : days === 0 ? 'today' : 'overdue' }}</small></p>
            <p>{{ version.retroPool ? `${arrow(version.retroPool.amount)} retro pool` : 'No retro pool set yet.' }}</p>
          </template>
        </section>
        <section class="pw-card">
          <h3>Readiness</h3>
          <p class="pw-big">{{ check.resolved.length }} <small>of {{ check.resolved.length + check.open.length }} discussions settled</small></p>
          <p class="pw-muted">{{ check.open.length ? `${check.open.length} still open.` : 'Every team discussion is settled.' }} <template v-if="check.deferredAway.length">{{ check.deferredAway.length }} deferred to a later version. </template><template v-if="unpicked.length">{{ unpicked.length }} {{ unpicked.length === 1 ? 'question' : 'questions' }} from calls nobody picked up will carry into {{ later[0]?.name ?? 'the next version' }}.</template></p>
          <button v-if="isLead && check.resolved.length + check.open.length" class="pw-btn" :disabled="busy || !check.canFreeze" @click="freeze">Freeze {{ version.name }}</button><p v-else-if="isLead" class="pw-muted pw-small">Nothing to freeze until {{ version.name }} has discussions.</p>
          <p v-if="isLead && !check.canFreeze" class="pw-muted pw-small">Settle or defer the open discussions below to enable the freeze.</p>
        </section>
      </div>

      <section class="pw-card">
        <h3>Still open <span class="pw-count">{{ openBundles.length }}</span></h3>
        <p v-if="!openBundles.length" class="pw-muted">Nothing left to settle.</p>
        <div v-for="b in openBundles" :key="b.thread.id" class="pw-freeze-row">
          <div>
            <span class="pw-eyebrow">{{ systemName(data.evidence, b.thread.system || PROJECT_WIDE) }} · {{ b.positions.length }} contributions</span>
            <RouterLink :to="to('discussions', { thread: b.thread.id })"><strong>{{ b.thread.title }}</strong></RouterLink>
            <span v-if="tallyLeader(data, b)" class="pw-muted pw-small">Leading: “{{ positionTitle(b.positions.find(p => p.id === tallyLeader(data!, b)!.positionId)?.body ?? '', 70) }}” {{ signed(tallyLeader(data, b)!.score) }}</span>
          </div>
          <div v-if="isLead" class="pw-freeze-actions">
            <RouterLink class="pw-btn pw-btn-small" :to="to('discussions', { thread: b.thread.id, tab: 'draft' })">Settle</RouterLink>
            <button v-if="later.length" class="pw-btn pw-btn-quiet pw-btn-small" @click="acting = acting === 'defer:' + b.thread.id ? '' : 'defer:' + b.thread.id">Defer</button>
            <button class="pw-btn pw-btn-quiet pw-btn-small" @click="acting = acting === 'reject:' + b.thread.id ? '' : 'reject:' + b.thread.id">Decline</button>
          </div>
          <form v-if="acting.endsWith(b.thread.id)" class="pw-form pw-inline-form" @submit.prevent="resolve(b.thread.id, acting.startsWith('defer') ? 'defer' : 'reject')">
            <label>{{ acting.startsWith('defer') ? `Why it moves to ${later[0]?.name} (optional)` : 'Why not (shown on the discussion)' }}<input v-model="note" :required="acting.startsWith('reject')" :minlength="acting.startsWith('reject') ? 10 : undefined" /></label>
            <button class="pw-btn pw-btn-small" :disabled="busy">{{ acting.startsWith('defer') ? `Defer to ${later[0]?.name}` : 'Decline' }}</button>
          </form>
        </div>
      </section>

      <section class="pw-card">
        <div class="pw-card-head"><h3>Retro split{{ version.retroPool ? `: ${arrow(version.retroPool.amount)}` : '' }}</h3><span class="pw-muted pw-small">if it froze now</span></div>
        <p v-if="!version.retroPool" class="pw-muted">No pool set. {{ isLead ? 'Add one in the plan to show contributors what the discussion is worth.' : '' }}</p>
        <template v-else-if="retro">
          <p class="pw-muted pw-small">Each contribution to a {{ version.name }} discussion earns in proportion to its weighted net support, including ideas that weren’t adopted.<template v-if="version.retroPool.systemShares"> Reserved by system: {{ Object.entries(version.retroPool.systemShares).map(([k, v]) => `${Math.round(v * 100)}% for ${systemName(data!.evidence, k)}`).join(', ') }}; the rest is open to any system.</template></p>
          <p v-if="!retro.lines.length" class="pw-muted">No contribution has positive support yet, so nothing would be paid out.</p>
          <details v-for="line in retro.lines" :key="line.memberId" class="pw-retro-line">
            <summary><span>{{ nameOf(line.memberId) }}</span><b>{{ arrow(line.amount) }}</b><span class="pw-muted pw-small">{{ line.items.length }} {{ line.items.length === 1 ? 'contribution' : 'contributions' }}</span></summary>
            <ul><li v-for="i in line.items" :key="i.positionId"><RouterLink :to="to('discussions', { thread: i.threadId })">{{ positionLabel(i.positionId)?.title }}</RouterLink> <span class="pw-muted">in “{{ positionLabel(i.positionId)?.thread.title }}” · support {{ signed(i.score) }}</span> <b>{{ arrow(i.amount) }}</b></li></ul>
          </details>
          <p v-if="retro.unallocated" class="pw-muted pw-small">{{ arrow(retro.unallocated) }} unallocated.</p>
        </template>
      </section>

      <section class="pw-card">
        <h3>Settled <span class="pw-count">{{ settled.length + declined.length }}</span></h3>
        <RouterLink v-for="o in settled" :key="o.bundle.thread.id" :to="o.decision ? to('spec', { decision: o.decision.id }) : to('discussions', { thread: o.bundle.thread.id })" class="pw-item"><span class="pw-eyebrow">{{ o.adopted ? 'Adopted' : 'Concluded' }} · {{ shortDate(o.at) }}</span><strong>{{ o.summary }}</strong><span class="pw-muted pw-small">{{ o.bundle.thread.title }}</span></RouterLink>
        <RouterLink v-for="b in declined" :key="b.thread.id" :to="to('discussions', { thread: b.thread.id })" class="pw-item"><span class="pw-eyebrow">Declined</span><strong>{{ b.thread.title }}</strong><span class="pw-muted pw-small">{{ b.thread.resolution?.kind === 'reject' ? b.thread.resolution.note : '' }}</span></RouterLink>
        <p v-if="!settled.length && !declined.length" class="pw-muted">Nothing settled yet.</p>
      </section>

      <details v-if="unpicked.length" class="pw-card">
        <summary>Questions from calls nobody has picked up · {{ unpicked.length }}</summary>
        <p class="pw-muted pw-small">Start a discussion to settle one at this freeze. The rest carry into {{ later[0]?.name ?? 'the next version' }}.</p>
        <RouterLink v-for="q in unpicked" :key="q.key" :to="to('discussions', { record: q.record!.id })" class="pw-item"><span class="pw-eyebrow">{{ systemName(data.evidence, q.system) }}</span><strong>{{ q.title }}</strong></RouterLink>
      </details>
    </template>
    <section v-else class="pw-empty"><h2>No version is in discussion</h2><p>Every version is building or frozen.</p></section>

    <section v-for="v in frozenVersions" :key="v.id" class="pw-card">
      <h3>{{ v.name }} froze {{ v.frozenAt ? shortDate(v.frozenAt) : '' }}<template v-if="v.frozenBy"> · {{ nameOf(v.frozenBy) }}</template></h3>
      <template v-if="v.retroAllocation">
        <p>{{ arrow(v.retroAllocation.amount) }} retro pool, recorded at the freeze:</p>
        <ul class="pw-ledger"><li v-for="l in v.retroAllocation.lines" :key="l.memberId"><span>{{ nameOf(l.memberId) }}</span><b>{{ arrow(l.amount) }}</b></li></ul>
        <p class="pw-muted pw-small">Payment happens outside the app.</p>
      </template>
      <p v-else class="pw-muted">No retro pool was set.</p>
    </section>
  </div>
</template>
