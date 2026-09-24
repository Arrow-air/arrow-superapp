<script setup lang="ts">
// The lead's four ways to end a thread. Used on the thread page and on the freeze screen,
// so the rules read the same in both places. The backend re-checks everything; this only
// mirrors the checks so the button states make sense before you click.
import { computed, ref, watch } from 'vue';
import type { ThreadBundle } from '../data/backend';
import { act, backend, handleOf } from '../data/store';
import type { ThreadAnalysis } from '../lib/analyze';
import { positionTitle } from '../lib/format';
import { DEFAULT_PROPOSER_SHARE } from '../lib/grant';
import { RESOLUTION_VERB } from '../lib/labels';
import { MIN_RATIONALE_LENGTH, needsRationale } from '../lib/resolution';
import type { Project, ResolutionKind } from '../lib/types';
import { deferTargets } from '../lib/versions';
import DiscussPin from './DiscussPin.vue';

const props = defineProps<{ bundle: ThreadBundle; analysis: ThreadAnalysis; project: Project; compact?: boolean }>();
const emit = defineEmits<{ done: [kind: ResolutionKind] }>();

const mode = ref<ResolutionKind | ''>('');
const positionId = ref('');
const rationale = ref('');
const note = ref('');
const toVersionId = ref('');
const sharePercent = ref(Math.round(DEFAULT_PROPOSER_SHARE * 100));
const error = ref('');
const busy = ref(false);

const ranked = computed(() => {
  const byId = new Map(props.analysis.tallies.map((t) => [t.positionId, t]));
  return props.bundle.positions
    .map((p) => ({ p, t: byId.get(p.id)! }))
    .sort((a, b) => b.t.weightedScore - a.t.weightedScore || a.p.createdAt.localeCompare(b.p.createdAt));
});
const targets = computed(() => deferTargets(props.project, props.bundle.thread.versionId));
const hasPositions = computed(() => props.bundle.positions.length > 0);
const chosen = computed(() => ranked.value.find((r) => r.p.id === positionId.value));
const overriding = computed(() => !!positionId.value && needsRationale(positionId.value, props.analysis.tallies));
const rationaleLength = computed(() => rationale.value.trim().length);
const noteLength = computed(() => note.value.trim().length);

const canSubmit = computed(() => {
  if (busy.value) return false;
  switch (mode.value) {
    case 'reject':
      return noteLength.value >= MIN_RATIONALE_LENGTH;
    case 'spec':
    case 'grant':
      return !!positionId.value && (!overriding.value || rationaleLength.value >= MIN_RATIONALE_LENGTH);
    case 'defer':
      return !!toVersionId.value;
    default:
      return false;
  }
});

function open(kind: ResolutionKind) {
  if (mode.value === kind) {
    mode.value = '';
    return;
  }
  mode.value = kind;
  error.value = '';
  positionId.value = ranked.value[0]?.p.id ?? '';
  toVersionId.value = targets.value[0]?.id ?? '';
}

watch(() => props.bundle.thread.id, () => { mode.value = ''; rationale.value = ''; note.value = ''; error.value = ''; });

async function submit() {
  if (!mode.value || !canSubmit.value) return;
  busy.value = true;
  error.value = '';
  const threadId = props.bundle.thread.id;
  const kind = mode.value;
  const ok = await act(() => {
    switch (kind) {
      case 'reject':
        return backend.resolveThread({ threadId, kind, note: note.value });
      case 'spec':
        return backend.resolveThread({ threadId, kind, positionId: positionId.value, overrideRationale: rationale.value });
      case 'grant':
        return backend.resolveThread({ threadId, kind, positionId: positionId.value, overrideRationale: rationale.value, proposerShare: sharePercent.value / 100 });
      case 'defer':
        return backend.resolveThread({ threadId, kind, toVersionId: toVersionId.value, note: note.value });
    }
  });
  busy.value = false;
  if (ok) {
    mode.value = '';
    emit('done', kind);
  }
}
</script>

<template>
  <div class="resolve" :class="{ 'resolve-compact': compact }">
    <div class="resolve-actions" role="group" aria-label="Resolve this thread">
      <button type="button" class="btn btn-ghost btn-reject" :class="{ on: mode === 'reject' }" :aria-pressed="mode === 'reject'" @click="open('reject')">{{ RESOLUTION_VERB.reject }}</button>
      <button type="button" class="btn btn-ghost btn-spec" :class="{ on: mode === 'spec' }" :aria-pressed="mode === 'spec'" :disabled="!hasPositions" :title="hasPositions ? 'Write a decision to the register' : 'Nothing to promote: no positions yet'" @click="open('spec')">{{ RESOLUTION_VERB.spec }}</button>
      <button type="button" class="btn btn-ghost btn-grant" :class="{ on: mode === 'grant' }" :aria-pressed="mode === 'grant'" :disabled="!hasPositions" :title="hasPositions ? 'Draft a grant from the discussion' : 'Nothing to fund: no positions yet'" @click="open('grant')">{{ RESOLUTION_VERB.grant }}</button>
      <button type="button" class="btn btn-ghost btn-defer" :class="{ on: mode === 'defer' }" :aria-pressed="mode === 'defer'" :disabled="!targets.length" :title="targets.length ? `Push to ${targets[0].name}` : 'No later version to defer to'" @click="open('defer')">
        {{ RESOLUTION_VERB.defer }}<template v-if="targets.length"> to {{ targets[0].name }}</template>
      </button>
    </div>

    <form v-if="mode" class="resolve-form stack" @submit.prevent="submit">
      <!-- Reject -->
      <template v-if="mode === 'reject'">
        <label class="field-row">
          <span class="label">Why not? Published on the thread.</span>
          <textarea v-model="note" style="min-height: 70px; font-family: inherit" placeholder="One honest line is enough." />
          <div class="hint spread" style="flex-wrap: nowrap">
            <span>The author sees this. Ideas that were rejected with a reason still count for the retro later.</span>
            <span class="mono" :style="{ color: noteLength >= MIN_RATIONALE_LENGTH ? 'var(--status-success-text)' : undefined }" aria-live="polite">{{ noteLength }} / {{ MIN_RATIONALE_LENGTH }}</span>
          </div>
        </label>
      </template>

      <!-- Spec or grant: pick a position -->
      <template v-if="mode === 'spec' || mode === 'grant'">
        <div>
          <DiscussPin anchor="lead-override" class="pin-right" />
          <strong>{{ mode === 'spec' ? 'Which position becomes the specification?' : 'Which position is the spec for the grant?' }}</strong>
          <div class="small muted">
            {{ mode === 'spec' ? 'It goes into the decision register as a requirement on this version.' : 'A grant draft is written from it and the discussion around it. You edit it before it is real.' }}
          </div>
        </div>
        <div class="pick-list" role="radiogroup">
          <label v-for="{ p, t } in ranked" :key="p.id" class="pick-row" :class="{ on: positionId === p.id }">
            <input v-model="positionId" type="radio" name="position" :value="p.id" />
            <span class="pick-row-main">
              <span class="pick-title">{{ positionTitle(p.body) }}</span>
              <span class="pick-meta">@{{ handleOf(p.authorId) }} · weighted rank {{ t.weightedRank }} · raw rank {{ t.rawRank }} · {{ t.voters }} {{ t.voters === 1 ? 'voter' : 'voters' }}</span>
            </span>
            <span v-if="t.weightedRank === 1 && t.voters" class="chip chip-open">weighted top</span>
          </label>
        </div>
        <label v-if="overriding" class="field-row">
          <span class="label">This is not the top weighted position. Why this one?</span>
          <textarea v-model="rationale" style="min-height: 70px; font-family: inherit" />
          <div class="hint spread" style="flex-wrap: nowrap">
            <span>Published on the {{ mode === 'spec' ? 'decision' : 'grant' }}. You keep the final say; the community gets the reasoning.</span>
            <span class="mono" :style="{ color: rationaleLength >= MIN_RATIONALE_LENGTH ? 'var(--status-success-text)' : undefined }" aria-live="polite">{{ rationaleLength }} / {{ MIN_RATIONALE_LENGTH }}</span>
          </div>
        </label>
        <div v-else-if="chosen" class="small" style="color: var(--status-success-text)">This is the top weighted position. No rationale needed.</div>
        <label v-if="mode === 'grant'" class="field-row" style="max-width: 320px">
          <span class="label">Proposer award <DiscussPin anchor="bounty" compact class="pin-inline" /></span>
          <span class="row" style="flex-wrap: nowrap">
            <input v-model.number="sharePercent" type="number" min="0" max="100" step="5" style="width: 90px" aria-label="Proposer share, percent" />
            <span class="small">% of the grant to @{{ chosen ? handleOf(chosen.p.authorId) : '…' }} for writing the spec</span>
          </span>
          <div class="hint">A quarter was floated on the 2026-09-23 call. No tokens move in this prototype.</div>
        </label>
      </template>

      <!-- Defer -->
      <template v-if="mode === 'defer'">
        <label class="field-row" style="max-width: 320px">
          <span class="label">Push to</span>
          <select v-model="toVersionId" class="field">
            <option v-for="v in targets" :key="v.id" :value="v.id">{{ v.name }} ({{ v.state }})</option>
          </select>
          <div class="hint">The thread stays open with its votes and history, addressed to that version instead.</div>
        </label>
        <label class="field-row">
          <span class="label">Note (optional)</span>
          <input v-model="note" type="text" placeholder="Not done being discussed." />
        </label>
      </template>

      <div v-if="error" class="signal signal-diverge">{{ error }}</div>
      <div class="row">
        <button class="btn" type="submit" :disabled="!canSubmit">{{ busy ? 'Working…' : RESOLUTION_VERB[mode] }}</button>
        <button class="btn btn-ghost" type="button" @click="mode = ''">Cancel</button>
      </div>
    </form>
  </div>
</template>
