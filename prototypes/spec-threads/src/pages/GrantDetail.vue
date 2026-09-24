<script setup lang="ts">
// One grant draft: the lead edits it, sees the markdown it becomes, and publishes it.
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import Markdown from '../components/Markdown.vue';
import { act, backend, handleOf, memberById, myRoleOn, projectById, state, versionOf } from '../data/store';
import { grantMarkdown } from '../lib/grant';
import { percent } from '../lib/labels';
import type { Grant } from '../lib/types';

const props = defineProps<{ id: string }>();

const grant = ref<Grant | null>(null);
const loading = ref(true);
const title = ref('');
const scope = ref('');
const constraints = ref('');
const sharePercent = ref(25);
const dirty = ref(false);
const saved = ref(false);
const copied = ref(false);

function load(g: Grant | null) {
  grant.value = g;
  if (!g) return;
  title.value = g.title;
  scope.value = g.scope;
  constraints.value = g.constraints.join('\n');
  sharePercent.value = Math.round(g.proposerShare * 100);
  dirty.value = false;
}

watch(
  [() => props.id, () => state.version],
  async () => {
    try {
      load(await backend.getGrant(props.id));
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
watch([title, scope, constraints, sharePercent], () => { dirty.value = true; saved.value = false; });

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
      title: title.value,
      scope: scope.value,
      constraints: constraints.value.split('\n'),
      proposerShare: sharePercent.value / 100,
    }),
  );
  if (ok) { saved.value = true; dirty.value = false; }
}

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
  const q = new URLSearchParams({ title: `Grant: ${preview.value.title}`, body: markdown.value });
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
    <p class="small" style="margin: 0"><RouterLink to="/grants">← All grants</RouterLink></p>
    <div class="row" style="margin: 10px 0 8px">
      <span class="chip chip-project">{{ project.name }}</span>
      <span class="chip chip-version">{{ version?.name ?? '?' }}</span>
      <span class="chip" :class="grant.status === 'draft' ? 'chip-warn' : 'chip-open'">{{ grant.status }}</span>
    </div>
    <h1 style="margin-bottom: 6px">{{ title }}</h1>
    <p class="small muted" style="margin-top: 0">
      From thread <RouterLink :to="{ name: 'thread', params: { id: grant.threadId } }">{{ grant.title }}</RouterLink> ·
      promoted by @{{ handleOf(grant.byMemberId) }} · weighted rank {{ grant.weightedRankAtResolution }}, raw rank {{ grant.rawRankAtResolution }} at promotion
    </p>

    <div class="layout-2" style="margin-top: 20px">
      <div class="stack">
        <div class="card stack">
          <div class="spread" style="align-items: center">
            <strong>{{ canEdit ? 'Edit the draft' : grant.status === 'draft' ? 'Draft (only the lead edits it)' : 'Published' }}</strong>
            <span v-if="canEdit" class="small muted">The discussion wrote this. Fix what it got wrong.</span>
          </div>
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
            <div class="hint">Pulled from the chosen position and its comments: list items and anything with a number and a unit.</div>
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
            <button class="btn btn-ghost" @click="publish">Publish</button>
            <span v-if="saved" class="small" style="color: var(--status-success-text)">Saved.</span>
          </div>
        </div>

        <div class="card stack">
          <div class="spread" style="align-items: center">
            <div class="label">Markdown for grant-and-bounties</div>
            <div class="row">
              <button class="btn btn-ghost" @click="copy">{{ copied ? 'Copied' : 'Copy markdown' }}</button>
              <a class="btn" :href="issueUrl" target="_blank" rel="noopener">Open as GitHub issue</a>
            </div>
          </div>
          <div class="bounty-md">{{ markdown }}</div>
        </div>
      </div>

      <aside class="side stack">
        <div class="card">
          <div class="label">Rendered</div>
          <div style="margin-top: 8px"><Markdown :source="markdown" /></div>
        </div>
        <div class="card small">
          <div class="label">Proposer award</div>
          <p style="margin: 6px 0 0">
            <b>{{ percent(sharePercent / 100) }}</b> of whatever this grant is funded at goes to the people who wrote the idea. Writing the spec was the work.
            Whether the draft is good enough as written, or the proposer is paid to finish it, is open question Q30.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
