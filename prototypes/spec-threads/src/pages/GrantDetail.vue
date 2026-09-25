<script setup lang="ts">
// One grant draft: the lead edits it, sees the markdown it becomes, and publishes it.
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import Markdown from '../components/Markdown.vue';
import WorkTracker from '../components/WorkTracker.vue';
import { useUnsaved } from '../composables/useUnsaved';
import { trackingOf, workStages } from '../lib/projectRecords';
import { act, backend, handleOf, memberById, myRoleOn, projectById, state, versionOf } from '../data/store';
import { outcomeMarkdown } from '../lib/outcome';
import { briefMarkdown } from '../lib/brief';
import { grantMarkdown } from '../lib/grant';
import { percent } from '../lib/labels';
import type { Grant } from '../lib/types';

const props = defineProps<{ id: string; embedded?: boolean }>();

const grant = ref<Grant | null>(null);
const loading = ref(true);
const title = ref('');
const scope = ref('');
const constraints = ref('');
const sharePercent = ref(25);
const dirty = ref(false);
const saved = ref(false);
const scopeRevision = ref(0);
const copied = ref(false);
let hydrating = false;
useUnsaved(dirty);

function load(g: Grant | null) {
  grant.value = g;
  if (!g) return;
  hydrating = true;
  scopeRevision.value = trackingOf(g).revision;
  title.value = g.title;
  scope.value = g.scope;
  constraints.value = g.constraints.join('\n');
  sharePercent.value = Math.round(g.proposerShare * 100);
  dirty.value = false;
  hydrating = false;
}

watch(
  [() => props.id, () => state.version],
  async () => {
    try {
      const next = await backend.getGrant(props.id);
      if (!dirty.value || grant.value?.id !== props.id) load(next); else if (next) grant.value = next;
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
watch([title, scope, constraints, sharePercent], () => { if (!hydrating) { dirty.value = true; saved.value = false; } }, { flush: 'sync' });

const project = computed(() => (grant.value ? projectById.value.get(grant.value.projectId) : undefined));
const version = computed(() => (grant.value ? versionOf(grant.value.projectId, grant.value.versionId) : undefined));
const canEdit = computed(() => !!grant.value && grant.value.status === 'draft' && myRoleOn(grant.value.projectId) === 'lead');

/** The draft as it would be now, with unsaved edits, so the preview is live. */
const preview = computed<Grant | null>(() =>
  grant.value
    ? { ...grant.value, title: title.value, scope: scope.value, constraints: constraints.value.split('\n').map((c) => c.trim()).filter(Boolean), proposerShare: sharePercent.value / 100 }
    : null,
);
const markdown = computed(() => (preview.value && project.value ? grantMarkdown({ grant: preview.value, project: project.value, version: version.value, members: memberById.value }) : ''));

async function save() {
  if (!grant.value) return;
  const ok = await act(() =>
    backend.updateGrant({
      id: grant.value!.id,
      expectedRevision: scopeRevision.value,
      title: title.value,
      scope: scope.value,
      constraints: constraints.value.split('\n'),
      proposerShare: sharePercent.value / 100,
    }),
  );
  if (ok) { dirty.value = false; load(await backend.getGrant(props.id)); saved.value = true; }
}

async function discardScope() { if (!dirty.value || confirm('Discard unsaved scope changes?')) { dirty.value = false; load(await backend.getGrant(props.id)); } }
async function publish() {
  if (!grant.value) return;
  if (dirty.value && !(await act(() => backend.updateGrant({ id: grant.value!.id, title: title.value, scope: scope.value, constraints: constraints.value.split('\n'), proposerShare: sharePercent.value / 100 })))) return;
  await act(() => backend.publishGrant(grant.value!.id));
}

async function copy() {
  try {
    await navigator.clipboard.writeText(markdown.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    state.error = 'Could not copy. Select the text and copy it by hand.';
  }
}

const issueUrl = computed(() => {
  if (!preview.value) return '';
  const q = new URLSearchParams({ title: `${preview.value.workKind === 'bounty' ? 'Bounty' : 'Grant'}: ${preview.value.title}`, body: markdown.value });
  return `https://github.com/Arrow-air/grant-and-bounties/issues/new?${q.toString()}`;
});
</script>

<template>
  <p v-if="loading" class="muted">Loading…</p>
  <div v-else-if="!grant || !project">
    <p>That grant does not exist.</p>
    <RouterLink to="/grants">Back to grants</RouterLink>
  </div>

  <div v-else>
    <p v-if="!embedded" class="small" style="margin: 0"><RouterLink to="/grants">← All grants</RouterLink></p>
    <div class="row" style="margin: 10px 0 8px">
      <span class="chip chip-project">{{ project.name }}</span>
      <span class="chip chip-version">{{ version?.name ?? '?' }}</span>
      <span class="chip" :class="grant.status === 'draft' ? 'chip-warn' : 'chip-open'">{{ workStages[trackingOf(grant).stage] }}</span>
    </div>
    <h1 style="margin-bottom: 6px">{{ title }}</h1>
    <p class="small muted" style="margin-top: 0">
      From thread <RouterLink :to="embedded ? { name: 'project', params: { id: project.id }, query: { view: 'shape', version: grant.versionId, thread: grant.threadId } } : { name: 'thread', params: { id: grant.threadId } }">{{ grant.title }}</RouterLink> ·
      prepared by @{{ handleOf(grant.byMemberId) }} <template v-if="!grant.outcomeSnapshot">· weighted rank {{ grant.weightedRankAtResolution }}, raw rank {{ grant.rawRankAtResolution }} at promotion</template>
    </p>

    <WorkTracker :key="grant.id" :grant="grant" :scope-dirty="dirty" />
    <div v-if="grant.outcomeSnapshot" class="context-note"><strong>{{ grant.workKind === 'bounty' ? 'Bounty' : 'Grant' }} · {{ grant.workPurpose === 'research' ? 'Research / investigation' : 'Implementation' }}</strong><p>{{ grant.decisionIds?.length ? 'Linked to adopted design decisions. The reviewed source stays preserved.' : 'This work does not imply an adopted design. Its results may inform a later decision.' }}</p><RouterLink :to="{ name: 'project', params: { id: project.id }, query: { view: 'shape', thread: grant.threadId, version: grant.versionId, tab: 'draft' } }">Read the recorded outcome →</RouterLink></div>
    <details v-if="grant.outcomeSnapshot" class="brief-snapshot outcome-snapshot"><summary>Reviewed source document · r{{ grant.outcomeSnapshot.revision }}</summary><p>This record stays unchanged when the work scope is edited.</p><Markdown :source="outcomeMarkdown(grant.outcomeSnapshot, project.id)" /></details>
    <details v-if="grant.briefSnapshot" class="brief-snapshot">
      <summary>Approved source brief · r{{ grant.briefSnapshot.approval.revision }} · @{{ handleOf(grant.briefSnapshot.approval.byMemberId) }}</summary>
      <p>This snapshot is immutable. The editable grant below may diverge; compare it before publishing.</p>
      <Markdown :source="briefMarkdown(grant.briefSnapshot, project.id)" />
    </details>
    <div class="work-scope-layout" style="margin-top: 20px">
      <div class="stack">
        <div class="card stack">
          <div class="spread" style="align-items: center">
            <strong>{{ canEdit ? 'Scope & deliverables' : grant.status === 'draft' ? 'Draft scope (only the lead edits it)' : 'Agreed scope & deliverables' }}</strong>
            <span v-if="canEdit" class="small muted">{{ grant.outcomeSnapshot ? 'A work package linked to a reviewed outcome, not a replacement for the design.' : grant.briefSnapshot ? 'From an approved, source-linked working brief. Later edits do not change that snapshot.' : 'Legacy draft from one approach; it has no approved working brief.' }}</span>
          </div>
          <template v-if="canEdit">
          <label class="field-row">
            <span class="label">Title</span>
            <input v-model="title" type="text" :disabled="!canEdit" />
          </label>
          <label class="field-row">
            <span class="label">Scope (markdown)</span>
            <textarea v-model="scope" style="min-height: 220px" :disabled="!canEdit" />
          </label>
          <label class="field-row">
            <span class="label">Interfaces and constraints, one per line</span>
            <textarea v-model="constraints" style="min-height: 120px" :disabled="!canEdit" />
            <div class="hint">{{ grant.outcomeSnapshot ? 'Optional work-specific constraints. The recorded design remains linked above.' : grant.briefSnapshot ? 'Accepted requirements from the reviewed brief—not automatically extracted suggestions.' : 'Legacy extraction from the chosen position and its comments.' }}</div>
          </label>
          <label class="field-row" style="max-width: 360px">
            <span class="label">Proposer award</span>
            <span class="row" style="flex-wrap: nowrap">
              <input v-model.number="sharePercent" type="number" min="0" max="100" step="5" style="width: 90px" :disabled="!canEdit" aria-label="Proposer share, percent" />
              <span class="small">% of the grant to {{ grant.proposerIds.map((id) => '@' + handleOf(id)).join(', ') }}</span>
            </span>
          </label>
          <div v-if="grant.contributorIds.length" class="small muted">Also contributed: {{ grant.contributorIds.map((id) => '@' + handleOf(id)).join(', ') }}</div>
          <div v-if="grant.overrideRationale" class="signal signal-neutral">
            <span class="label">Lead's rationale for not picking the top weighted position</span>
            <div style="margin-top: 4px">{{ grant.overrideRationale }}</div>
          </div>
          <div v-if="canEdit" class="row">
            <button class="btn" :disabled="!dirty" @click="save">Save draft</button>
            <button class="btn btn-ghost" @click="discardScope">Discard / reload scope</button><span class="small muted">Open and track delivery in Manage work above.</span>
            <span v-if="saved" class="small" style="color: var(--status-success-text)">Saved.</span>
          </div>
          </template>
          <template v-else><Markdown :source="grant.scope" /><div v-if="grant.constraints.length"><h3>Interfaces & constraints</h3><ul><li v-for="c in grant.constraints" :key="c">{{ c }}</li></ul></div><p class="small muted">Discussion contributors: {{ [...new Set([...grant.proposerIds,...grant.contributorIds])].map(id=>'@'+handleOf(id)).join(', ') }}</p></template>
        </div>

        <details class="card stack work-export">
          <summary>Export work package</summary>
          <div class="spread" style="align-items: center">
            <div class="label">Markdown for grant-and-bounties</div>
            <div class="row">
              <button class="btn btn-ghost" @click="copy">{{ copied ? 'Copied' : 'Copy markdown' }}</button>
              <a class="btn" :href="issueUrl" target="_blank" rel="noopener">Open as GitHub issue</a>
            </div>
          </div>
          <div class="bounty-md">{{ markdown }}</div>
        </details>
      </div>

      <aside class="stack work-export-preview">
        <div class="card">
          <div class="label">Rendered</div>
          <div style="margin-top: 8px"><Markdown :source="markdown" /></div>
        </div>
        <div class="card small">
          <div class="label">Proposer award · provisional</div>
          <p v-if="grant.outcomeSnapshot" style="margin: 6px 0 0">No automatic allocation. The discussion authors are credited; the lead must review any reward allocation separately.</p><p v-else style="margin: 6px 0 0">
            <b>{{ percent(sharePercent / 100) }}</b> of whatever this grant is funded at goes to the people who wrote the idea. Writing the spec was the work.
            Whether the draft is good enough as written, or the proposer is paid to finish it, is open question Q30.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
