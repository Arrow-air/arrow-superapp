<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import Markdown from '../components/Markdown.vue';
import { backend, projectById, refresh, state } from '../data/store';
import { parseTags } from '../lib/format';
import { discussingVersion } from '../lib/versions';

const router = useRouter();
const route = useRoute();
const projectId = ref(typeof route.query.project === 'string' && projectById.value.has(route.query.project) ? route.query.project : state.projects[0]?.id ?? '');
const versionId = ref('');
const system = ref('');
const title = ref('');
const body = ref('');
const tagInput = ref('');
const saving = ref(false);

const project = computed(() => projectById.value.get(projectId.value));
const targetVersions = computed(() => [...(project.value?.versions ?? [])].filter((v) => v.state === 'discussing' || v.state === 'planned').sort((a, b) => a.order - b.order));
watch(project, (p) => { versionId.value = (p && discussingVersion(p)?.id) ?? targetVersions.value[0]?.id ?? ''; system.value = ''; }, { immediate: true });

const tags = computed(() => parseTags(tagInput.value));
const canSubmit = computed(() => !!projectId.value && !!versionId.value && !!title.value.trim() && !saving.value);

async function submit() {
  saving.value = true;
  try {
    const thread = await backend.createThread({ projectId: projectId.value, versionId: versionId.value, system: system.value || undefined, title: title.value, body: body.value, tags: tags.value });
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
  <p class="small"><RouterLink to="/threads">← All threads</RouterLink></p>
  <h1>Post a thread</h1>
  <p v-if="!state.me" class="muted">Sign in to post a thread.</p>

  <form v-else class="stack" style="max-width: 760px" @submit.prevent="submit">
    <p class="muted" style="margin-top: 0">
      Describe the decision, not the answer. Say who is affected and what the trade-offs are. People reply with positions.
      It is addressed to the version in discussion: that is where outside ideas land.
    </p>
    <div class="row" style="align-items: flex-start; gap: 16px">
      <label class="field-row" style="flex: 1 1 180px">
        <span class="label">Project</span>
        <select v-model="projectId" class="field">
          <option v-for="p in state.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
      <label class="field-row" style="flex: 1 1 140px">
        <span class="label">For version</span>
        <select v-model="versionId" class="field">
          <option v-for="v in targetVersions" :key="v.id" :value="v.id">{{ v.name }} ({{ v.state }})</option>
        </select>
      </label>
      <label class="field-row" style="flex: 1 1 160px">
        <span class="label">System (optional)</span>
        <select v-model="system" class="field">
          <option value="">—</option>
          <option v-for="s in project?.systems ?? []" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
    </div>
    <label class="field-row">
      <span class="label">Title</span>
      <input v-model="title" type="text" placeholder="Gasoline engine integration: what does the engine PCB have to do?" />
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
      <RouterLink to="/threads" class="btn btn-ghost">Cancel</RouterLink>
    </div>
  </form>
</template>
