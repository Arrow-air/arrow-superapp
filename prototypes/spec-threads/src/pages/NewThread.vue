<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import Markdown from '../components/Markdown.vue';
import { backend, refresh, state } from '../data/store';
import { parseTags } from '../lib/format';

const router = useRouter();
const projectId = ref(state.projects[0]?.id ?? '');
const title = ref('');
const body = ref('');
const tagInput = ref('');
const saving = ref(false);

const tags = computed(() => parseTags(tagInput.value));
const canSubmit = computed(() => !!projectId.value && !!title.value.trim() && !saving.value);

async function submit() {
  saving.value = true;
  try {
    const thread = await backend.createThread({ projectId: projectId.value, title: title.value, body: body.value, tags: tags.value });
    await refresh();
    router.push({ name: 'thread', params: { id: thread.id } });
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <p class="small"><RouterLink to="/">← All threads</RouterLink></p>
  <h1>Post a thread</h1>
  <p v-if="!state.me" class="muted">Sign in to post a thread.</p>

  <form v-else class="stack" style="max-width: 760px" @submit.prevent="submit">
    <p class="muted" style="margin-top: 0">
      Describe the decision, not the answer. Say who is affected and what the trade-offs are. People reply with positions.
    </p>
    <label class="field-row">
      <span class="label">Project</span>
      <select v-model="projectId" class="field">
        <option v-for="p in state.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </label>
    <label class="field-row">
      <span class="label">Title</span>
      <input v-model="title" type="text" placeholder="Attachment interface: how much power should it supply?" />
    </label>
    <label class="field-row">
      <span class="label">Details (markdown)</span>
      <textarea v-model="body" style="min-height: 180px" />
    </label>
    <label class="field-row">
      <span class="label">Tags, comma separated</span>
      <input v-model="tagInput" type="text" placeholder="pcb, power" />
      <div class="hint">Members whose expertise matches a tag get more weight on this thread. Tag honestly.</div>
    </label>
    <div v-if="tags.length" class="row" style="gap: 5px">
      <span v-for="t in tags" :key="t" class="chip">{{ t }}</span>
    </div>
    <div v-if="body.trim()" class="card card-subtle">
      <div class="label" style="margin-bottom: 8px">Preview</div>
      <Markdown :source="body" />
    </div>
    <div class="row">
      <button class="btn" type="submit" :disabled="!canSubmit">{{ saving ? 'Posting…' : 'Post thread' }}</button>
      <RouterLink to="/" class="btn btn-ghost">Cancel</RouterLink>
    </div>
  </form>
</template>
