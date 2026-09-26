<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ProjectOverview from '../components/ProjectOverview.vue';
import WorkspaceDiscussion from '../components/WorkspaceDiscussion.vue';
import ResolvePanel from '../components/ResolvePanel.vue';
import GrantDetail from './GrantDetail.vue';
import ProjectDesign from '../components/ProjectDesign.vue';
import ProjectWork from '../components/ProjectWork.vue';
import type { ThreadBundle } from '../data/backend';
import { act, backend, memberById, myRoleOn, projectById, state } from '../data/store';
import { analyzeThread } from '../lib/analyze';
import { parseTags } from '../lib/format';
import type { Decision, Grant, SpecificationSection } from '../lib/types';
import { currentDecisions, trackingOf, workStages } from '../lib/projectRecords';
import { buildingVersion, discussingVersion, freezeCheck } from '../lib/versions';

const props = defineProps<{ id: string }>();
const route = useRoute();
const router = useRouter();
const bundles = ref<ThreadBundle[]>([]);
const decisions = ref<Decision[]>([]);
const grants = ref<Grant[]>([]);
const sections = ref<SpecificationSection[]>([]);
const loading = ref(true);
const loadError = ref('');
const search = ref('');
const composing = ref(false);
const title = ref('');
const body = ref('');
const system = ref('');
const tags = ref('');
const busy = ref(false);
const resolving = ref('');
const project = computed(() => projectById.value.get(props.id));
const building = computed(() => project.value && buildingVersion(project.value));
const discussing = computed(() => project.value && discussingVersion(project.value));
const selectedVersion = computed(() => project.value?.versions.find(v => v.id === route.query.version) ?? discussing.value ?? project.value?.versions[project.value.versions.length - 1]);
const view = computed(() => ['shape', 'review', 'design', 'work'].includes(String(route.query.view)) ? String(route.query.view) : 'overview');
const filter = computed(() => String(route.query.system ?? ''));
const isLead = computed(() => myRoleOn(props.id) === 'lead');
const lead = computed(() => memberById.value.get(state.roles.find(r => r.projectId === props.id && r.role === 'lead')?.memberId ?? '')?.displayName.split(' (')[0] ?? 'Project lead');
const here = computed(() => bundles.value.filter(b => b.thread.versionId === selectedVersion.value?.id));
const open = computed(() => here.value.filter(b => b.thread.status === 'open'));
const adopted = computed(() => project.value && selectedVersion.value ? currentDecisions(project.value, selectedVersion.value.id, decisions.value) : []);
const work = computed(() => grants.value.filter(g => g.versionId === selectedVersion.value?.id));
const review = computed(() => project.value && selectedVersion.value ? freezeCheck(project.value, selectedVersion.value.id, bundles.value.map(b => b.thread)) : null);
const checked = computed(() => (review.value?.resolved.length ?? 0) + (review.value?.deferredAway.length ?? 0));
const total = computed(() => checked.value + (review.value?.open.length ?? 0));
const rows = computed(() => here.value.filter(b => (!filter.value || b.thread.system === filter.value) && `${b.thread.title} ${b.thread.body} ${b.thread.tags.join(' ')}`.toLowerCase().includes(search.value.toLowerCase())).sort((a, b) => Number(b.thread.status === 'open') - Number(a.thread.status === 'open')));
const selected = computed(() => rows.value.find(b => b.thread.id === route.query.thread) ?? (route.query.thread ? null : rows.value[0]));
const selectedGrant = computed(() => work.value.find(g => g.id === route.query.grant));
const summary = computed(() => props.id === 'spearhead' ? 'An open fixed-wing VTOL project. Build, fly, learn — and bring what we learn into the next prototype.' : props.id === 'quiver' ? 'A modular aircraft, shaped by the people who build and operate it. Make the next version more useful in the field.' : 'A smaller aircraft. A new starting point. Develop the next iteration together, one useful question at a time.');
const analysis = (bundle: ThreadBundle) => analyzeThread({ bundle, project: project.value!, members: state.members, roles: state.roles });
const shortTitle = (b: ThreadBundle) => b.thread.title.split(':')[0];
const stage = (b: ThreadBundle) => b.thread.status === 'resolved' ? b.thread.resolution?.kind === 'conclude' ? b.thread.resolution.decisionId ? 'Design adopted' : 'Conclusion recorded' : b.thread.resolution?.kind === 'spec' ? 'Adopted' : b.thread.resolution?.kind === 'grant' ? 'Grant drafted' : 'Not pursuing' : !b.positions.length ? 'Needs a first approach' : b.positions.length > 1 ? `${b.positions.length} approaches to compare` : 'An approach taking shape';
watch([() => props.id, () => state.version], async (_, __, onCleanup) => {
  let cancelled = false;
  onCleanup(() => { cancelled = true; });
  try {
    const [b, d, g, s] = await Promise.all([backend.listBundles(), backend.listDecisions(), backend.listGrants(), backend.listSpecifications()]);
    if (cancelled) return;
    bundles.value = b.filter(x => x.thread.projectId === props.id);
    decisions.value = d.filter(x => x.projectId === props.id);
    grants.value = g.filter(x => x.projectId === props.id);
    sections.value = s.filter(x => x.projectId === props.id);
    loadError.value = '';
  } catch (e) { if (!cancelled) loadError.value = e instanceof Error ? e.message : String(e); }
  finally { if (!cancelled) loading.value = false; }
}, { immediate: true });
function navigate(nextView: string, extra: Record<string, string | undefined> = {}) {
  composing.value = false;
  return router.push({ name: 'project', params: { id: props.id }, query: { view: ['aircraft','overview'].includes(nextView) ? undefined : nextView, version: selectedVersion.value?.id, ...extra } });
}
function explore(s = '') { search.value = ''; return navigate('shape', { system: s || undefined }); }
function openThread(b: ThreadBundle) { search.value = ''; return navigate('shape', { thread: b.thread.id, version: b.thread.versionId }); }
function changeVersion(e: Event) { search.value = ''; return navigate(view.value, { version: (e.target as HTMLSelectElement).value }); }
function compose() { title.value = ''; body.value = ''; tags.value = ''; system.value = filter.value; composing.value = true; }
async function create() {
  if (!project.value || !discussing.value || busy.value) return;
  busy.value = true;
  let id = '';
  const ok = await act(async () => { id = (await backend.createThread({ projectId: props.id, versionId: discussing.value!.id, title: title.value, body: body.value, system: system.value || undefined, tags: parseTags(tags.value) })).id; });
  busy.value = false;
  if (ok) { search.value = ''; await navigate('shape', { thread: id, version: discussing.value.id }); }
}
async function freeze() {
  if (!selectedVersion.value || !review.value?.canFreeze || busy.value) return;
  if (!confirm(`Freeze ${selectedVersion.value.name}? Its design decisions will be locked and the next planned version will open for contributions.`)) return;
  busy.value = true;
  // Keep the just-frozen design selected so the lead can inspect the completed result.
  const versionId = selectedVersion.value.id;
  const ok = await act(() => backend.freezeVersion({ projectId: props.id, versionId }));
  busy.value = false;
  if (ok) await navigate('review', { version: versionId });
}
</script>

<template>
  <div v-if="!project" class="workspace-empty"><h1>Project not found</h1><a href="#/p/spearhead">Open Spearhead →</a></div>
  <div v-else class="project-workspace">
    <div class="workspace-breadcrumb">PROJECTS <span>/</span> {{ project.name.toUpperCase() }} <span class="workspace-breadcrumb-end">OPEN DEVELOPMENT</span></div>
    <header class="project-heading"><div><div class="row"><h1>{{ project.name }}</h1><span class="workspace-badge green"><span class="status-dot"></span> In development</span></div><p>{{ summary }}</p></div><button v-if="state.me && discussing && ['overview','shape'].includes(view)" class="btn new-change-button" @click="navigate('shape', { version: discussing.id }).then(compose)">＋ Suggest a change</button></header>
    <div class="version-timeline"><span><i class="timeline-dot build"></i><b>{{ building?.name ?? 'First build' }}</b> {{ building ? 'in the workshop' : 'ahead of us' }}</span><span class="timeline-line"></span><span><i class="timeline-dot next"></i><b>{{ discussing?.name ?? 'Design complete' }}</b> {{ discussing ? 'taking shape together' : '' }}</span><span class="timeline-lead">Project lead <b>{{ lead }}</b></span></div>
    <nav class="workspace-tabs" aria-label="Project views"><button :class="{ active: view === 'overview' }" :aria-current="view === 'overview' ? 'page' : undefined" @click="navigate('overview')">Overview</button><button :class="{ active: view === 'shape' }" :aria-current="view === 'shape' ? 'page' : undefined" @click="navigate('shape')">Discussions <span>{{ open.length }}</span></button><button :class="{ active: view === 'design' || view === 'review' }" :aria-current="['design','review'].includes(view) ? 'page' : undefined" @click="navigate('design')">Design</button><button :class="{active:view==='work'}" :aria-current="view==='work' ? 'page' : undefined" @click="navigate('work')">Work <span>{{ work.length }}</span></button><label class="version-picker"><span class="sr-only">Project version</span><select aria-label="Project version" :value="selectedVersion?.id" @change="changeVersion"><option v-for="v in project.versions" :key="v.id" :value="v.id">{{ v.name }} · {{ v.state }}</option></select></label></nav>
    <p v-if="loading" class="empty-note">Loading the project…</p>
    <div v-else-if="loadError" role="alert" class="context-note">Could not load this workspace: {{ loadError }}</div>
    <template v-else-if="view === 'overview' && selectedVersion"><ProjectOverview :project="project" :version="selectedVersion" :bundles="bundles" :decisions="decisions" :grants="grants" :sections="sections" @navigate="navigate" /></template>
    <template v-else-if="view === 'design' && selectedVersion"><ProjectDesign :key="selectedVersion.id" :project="project" :version="selectedVersion" :decisions="decisions" :grants="grants" :bundles="bundles" @navigate="navigate" /></template>
    <template v-else-if="view === 'work' && selectedVersion"><ProjectWork :key="selectedVersion.id" :project="project" :version="selectedVersion" :grants="grants" :bundles="bundles" @navigate="navigate" /></template>
    <template v-else-if="view === 'shape'">
      <div class="section-heading shape-intro"><div><h2>{{ selectedVersion?.state === 'frozen' ? 'The conversations behind the design.' : `What should change in ${selectedVersion?.name}?` }}</h2><p>{{ selectedVersion?.state === 'building' ? 'This version is being built. New ideas belong in the version in discussion.' : 'Explore the trade-offs. Add what you know. Help a good idea become buildable.' }}</p></div></div>
      <div class="change-workbench"><aside class="change-sidebar"><label class="sr-only" for="change-search">Find a change</label><input id="change-search" v-model="search" type="search" placeholder="Find a change…" /><label class="sr-only" for="system-filter">Filter by system</label><select id="system-filter" :value="filter" @change="navigate('shape', { system: ($event.target as HTMLSelectElement).value || undefined })"><option value="">All systems</option><option v-for="s in project.systems" :key="s" :value="s">{{ s }}</option></select><div class="change-list-label">{{ rows.length }} {{ rows.length === 1 ? 'CHANGE' : 'CHANGES' }} / {{ selectedVersion?.name }}</div><button v-for="b in rows" :key="b.thread.id" class="change-item" :class="{ selected: selected?.thread.id === b.thread.id && !composing }" :aria-current="selected?.thread.id === b.thread.id && !composing ? 'true' : undefined" @click="navigate('shape', { system: filter || undefined, thread: b.thread.id })"><span class="eyebrow">{{ b.thread.system || 'Project-wide' }}</span><strong>{{ shortTitle(b) }}</strong><span class="change-state"><i :class="{ resolved: b.thread.status === 'resolved' }"></i>{{ stage(b) }}</span></button><p v-if="!rows.length" class="empty-note">No changes match this view.</p><button v-if="state.me && discussing" class="add-change" @click="compose">＋ Suggest a change for {{ discussing.name }}</button></aside>
        <form v-if="composing" class="discussion-panel compose-change" @submit.prevent="create"><span class="eyebrow">NEW CHANGE / {{ discussing?.name }}</span><h2>Start with a good question.</h2><p>What could be better? Give others enough context to contribute.</p><label class="field-row"><span class="label">Your question or proposed change</span><input v-model="title" type="text" required maxlength="240" placeholder="What should we change, and why?" autofocus /></label><label class="field-row"><span class="label">Context</span><textarea v-model="body" required placeholder="What have we learned? What constraints matter? What’s still unknown?" /></label><label class="field-row"><span class="label">Aircraft system</span><select v-model="system" class="field" aria-label="Aircraft system"><option value="">Project-wide</option><option v-for="s in project.systems" :key="s" :value="s">{{ s }}</option></select></label><label class="field-row"><span class="label">Relevant expertise (comma-separated)</span><input v-model="tags" type="text" placeholder="pcb, power, propulsion" /></label><div class="context-note">This starts a discussion for <b>{{ discussing?.name }}</b>{{ building ? `, not a change to the ${building.name} build` : '' }}.</div><div class="row"><button class="btn" :disabled="busy || !title.trim() || !body.trim()">Start discussion →</button><button type="button" class="btn btn-ghost" @click="composing = false">Cancel</button></div></form>
        <WorkspaceDiscussion v-else-if="selected" :key="selected.thread.id" :bundle="selected" :project="project" @review="navigate('review')" @grant="navigate('work', { grant: $event })" />
        <div v-else class="workspace-empty"><span class="empty-symbol">＋</span><h2>{{ route.query.thread ? 'This change isn’t in this view.' : 'An open space for a useful idea.' }}</h2><p>{{ route.query.thread ? 'Clear the filters or choose another change.' : `Nothing here yet. Start a discussion for ${discussing?.name ?? 'a future version'}.` }}</p><button v-if="filter || search || route.query.thread" class="btn btn-ghost" @click="explore()">Show all changes</button><button v-else-if="state.me && discussing" class="btn" @click="compose">Start a discussion</button></div>
      </div>
    </template>
    <template v-else>
      <button class="text-action" @click="navigate('design')">← Back to design</button><div class="section-heading review-heading"><div><span class="eyebrow">THE EMERGING DESIGN / {{ selectedVersion?.name }}</span><h2>{{ selectedVersion?.state === 'frozen' ? `${selectedVersion.name} is ready for the next chapter.` : 'From conversation to an aircraft.' }}</h2><p>What we’re adopting, what needs work, and what still needs a decision.</p></div><button v-if="isLead && selectedVersion?.state === 'discussing'" class="btn" :disabled="!review?.canFreeze || busy" @click="freeze">Freeze {{ selectedVersion.name }} design</button></div>
      <div class="review-progress"><div class="spread"><strong>{{ checked }} of {{ total }} discussions reviewed</strong><span>{{ selectedVersion?.state === 'frozen' ? 'Design frozen · decisions preserved' : review?.open.length ? `${review.open.length} still need a decision before freeze` : 'All discussions accounted for' }}</span></div><progress :value="checked" :max="total || 1" aria-label="Discussions reviewed"></progress><p v-if="!isLead" class="small muted">Everyone can follow the design. {{ lead }} makes the final decisions.</p></div>
      <div v-if="selectedGrant" class="workspace-grant"><button class="text-action" @click="navigate('review')">← Back to {{ selectedVersion?.name }} design</button><GrantDetail :id="selectedGrant.id" embedded /></div>
      <template v-else>
        <div class="review-columns"><section class="review-section"><div class="section-heading"><h3><span class="review-icon">✓</span> Part of the design</h3><span>{{ adopted.length }}</span></div><p v-if="!adopted.length" class="empty-note">Accepted requirements will appear here, linked to the reasoning that shaped them.</p><button v-for="d in adopted" :key="d.id" class="decision-card" @click="navigate('design', { decision: d.id })"><span class="eyebrow">ADOPTED DESIGN DECISION</span><h4>{{ d.chosen }}</h4><p>{{ d.rationale || d.question }}</p><span class="text-action">Trace the decision →</span></button></section><section class="review-section"><div class="section-heading"><h3><span class="review-icon">↗</span> Work to make it real</h3><span>{{ work.length }}</span></div><p v-if="!work.length" class="empty-note">When a change needs someone to build it, its grant draft lives here — alongside the design it serves.</p><button v-for="g in work" :key="g.id" class="decision-card grant-card" @click="navigate('work', { grant: g.id })"><span class="eyebrow">{{ (g.workKind || 'grant').toUpperCase() }} · {{ workStages[trackingOf(g).stage] }}</span><h4>{{ g.title }}</h4><p v-if="g.outcomeSnapshot">{{ g.decisionIds?.length ? 'Linked to an adopted design decision' : 'No design adoption implied' }} · {{ trackingOf(g).funding }}</p><p v-else>{{ Math.round(g.proposerShare * 100) }}% proposer share · {{ g.constraints.length }} {{ g.briefSnapshot ? 'accepted requirements' : 'legacy extracted constraints' }}</p><span class="text-action">{{ g.status === 'draft' ? 'Develop the work package' : 'Read the work package' }} →</span></button></section></div>
        <section v-if="here.some(b => b.thread.resolution?.kind === 'conclude' && !b.thread.resolution.decisionId)" class="review-queue"><div class="section-heading"><h3>Conclusions without a design change</h3></div><article v-for="b in here.filter(b => b.thread.resolution?.kind === 'conclude' && !b.thread.resolution.decisionId)" :key="b.thread.id" class="review-change"><h4>{{ b.thread.title }}</h4><p>A recorded answer or next step—not a specification.</p><button class="text-action" @click="navigate('shape', { thread: b.thread.id, tab: 'draft' })">Read outcome →</button></article></section>
        <section class="review-queue"><div class="section-heading"><h3>Still to work through</h3><span>{{ open.length }}</span></div><p v-if="!open.length" class="empty-note">No open questions remain for this version.</p><article v-for="b in open" :key="b.thread.id" class="review-change"><div class="review-change-top"><div><span class="eyebrow">{{ b.thread.system || 'Project-wide' }}</span><h4>{{ b.thread.title }}</h4><p>{{ stage(b) }}<template v-if="analysis(b).weightingChangedWinner"> · Weighted support and the headcount disagree</template></p></div><div class="row"><button class="text-action" @click="openThread(b)">Explore →</button><button v-if="isLead && selectedVersion?.state === 'discussing'" class="btn btn-ghost" @click="resolving = resolving === b.thread.id ? '' : b.thread.id">{{ resolving === b.thread.id ? 'Close' : 'Make a decision' }}</button></div></div><div v-if="resolving === b.thread.id" class="inline-resolution"><ResolvePanel :bundle="b" :analysis="analysis(b)" :project="project" @done="resolving = ''" /></div></article></section>
        <details v-if="review?.deferredAway.length || here.some(b => b.thread.resolution?.kind === 'reject')" class="decision-history"><summary>Not in this version · {{ (review?.deferredAway.length ?? 0) + here.filter(b => b.thread.resolution?.kind === 'reject').length }}</summary><div v-for="t in review?.deferredAway" :key="t.id"><strong>{{ t.title }}</strong><p>Carried forward to {{ project.versions.find(v => v.id === t.versionId)?.name }} · {{ t.deferrals[t.deferrals.length - 1]?.note || 'Discussion continues in the next version.' }}</p><button class="text-action" @click="navigate('shape', { version: t.versionId, thread: t.id })">Continue the conversation →</button></div><div v-for="b in here.filter(b => b.thread.resolution?.kind === 'reject')" :key="b.thread.id"><strong>{{ b.thread.title }}</strong><p>{{ b.thread.resolution?.kind === 'reject' ? b.thread.resolution.note : '' }}</p><button class="text-action" @click="openThread(b)">Read the discussion →</button></div></details>
      </template>
      <div class="review-footnote">Decisions remain linked to their contributors. Grant drafts need editorial review before funding; no funds move in this preview.</div>
    </template>
  </div>
</template>
