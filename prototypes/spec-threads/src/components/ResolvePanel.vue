<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import type { ThreadBundle } from '../data/backend';
import type { Project, ResolutionKind } from '../lib/types';
import type { ThreadAnalysis } from '../lib/analyze';
import { act, backend } from '../data/store';
import { deferTargets } from '../lib/versions';
import { MIN_RATIONALE_LENGTH } from '../lib/resolution';
const props = defineProps<{ bundle: ThreadBundle; project: Project; analysis: ThreadAnalysis; compact?: boolean }>();
const emit = defineEmits<{ done: [kind: ResolutionKind] }>();
const mode = ref<'reject' | 'defer' | ''>(''), note = ref(''), target = ref(''), busy = ref(false);
const targets = computed(() => deferTargets(props.project, props.bundle.thread.versionId));
async function submit() {
  if (!mode.value || busy.value) return; busy.value = true;
  const kind = mode.value;
  const ok = await act(() => kind === 'reject' ? backend.resolveThread({ threadId: props.bundle.thread.id, kind, note: note.value }) : backend.resolveThread({ threadId: props.bundle.thread.id, kind, toVersionId: target.value || targets.value[0]?.id, note: note.value }));
  busy.value = false;
  if (ok) { mode.value = ''; emit('done', kind); }
}
</script>
<template>
  <div class="resolve">
    <p>Ready to conclude? Review one draft, then decide separately whether to adopt a design change or commission work.</p>
    <RouterLink class="text-action" :to="{ name: 'project', params: { id: project.id }, query: { view: 'shape', thread: bundle.thread.id, version: bundle.thread.versionId, tab: 'draft' } }">Review draft outcome →</RouterLink>
    <div class="resolve-actions"><button class="btn btn-ghost btn-reject" @click="mode = mode === 'reject' ? '' : 'reject'">Decline change</button><button class="btn btn-ghost btn-defer" :disabled="!targets.length" @click="mode = mode === 'defer' ? '' : 'defer'">Defer discussion</button></div>
    <form v-if="mode" class="resolve-form stack" @submit.prevent="submit">
      <label v-if="mode === 'defer'" class="field-row"><span class="label">Continue in</span><select v-model="target" aria-label="Defer to version"><option value="">{{ targets[0]?.name }}</option><option v-for="v in targets" :key="v.id" :value="v.id">{{ v.name }}</option></select></label>
      <label class="field-row"><span class="label">{{ mode === 'reject' ? 'Why are we not pursuing this?' : 'Context for the next version (optional)' }}</span><textarea v-model="note" aria-label="Resolution note" /></label>
      <p class="small muted">{{ mode === 'defer' ? 'The conversation and draft move together, with their history intact.' : 'The reasoning stays with the discussion. No specification or work package is created.' }}</p>
      <button class="btn" :disabled="busy || mode === 'reject' && note.trim().length < MIN_RATIONALE_LENGTH">{{ mode === 'reject' ? 'Record decision to decline' : 'Defer discussion' }}</button>
    </form>
  </div>
</template>
