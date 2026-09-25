<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { act, backend, state } from '../data/store';
const props = defineProps<{ decisionId?: string; grantId?: string; title: string }>();
const router = useRouter(), title = ref(`Follow-up: ${props.title}`), body = ref(''), busy = ref(false);
async function create() {
  if (busy.value) return; busy.value = true;
  let t: Awaited<ReturnType<typeof backend.startFollowUp>> | undefined;
  const ok = await act(async () => { t = await backend.startFollowUp({ decisionId: props.decisionId, grantId: props.grantId, title: title.value, body: body.value }); });
  busy.value = false;
  if (ok && t) await router.push({ name: 'project', params: { id: t.projectId }, query: { view: 'shape', version: t.versionId, thread: t.id } });
}
</script>
<template>
  <details v-if="state.me" class="record-followup"><summary>Start a linked follow-up discussion</summary><form class="stack" @submit.prevent="create"><p class="small muted">New findings go into a conversation. The existing decision and accepted results stay unchanged.</p><label class="field-row">Discussion title<input v-model="title" required /></label><label class="field-row">Finding or question<textarea v-model="body" required /></label><button class="btn" :disabled="busy">Start follow-up</button></form></details>
</template>
