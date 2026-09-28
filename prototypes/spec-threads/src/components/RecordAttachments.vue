<script setup lang="ts">
import { ref, watch } from "vue";
import { api } from "../data/sharedBackend";
import { isSharedProject } from "../data/projectDataMode";
import { state } from "../data/store";
const props = defineProps<{ entityId: string }>();
const files = ref<any[]>([]),
  note = ref(""),
  error = ref(""),
  busy = ref(false),
  file = ref<File>();
async function load() {
  if (!state.me) return;
  try {
    files.value = await api(
      "/attachments?entity=" + encodeURIComponent(props.entityId),
    );
  } catch (e: any) {
    error.value = e.message;
  }
}
watch(() => [props.entityId, state.me?.id], load, { immediate: true });
async function upload() {
  if (!file.value || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    if (file.value.size > 10000000)
      throw new Error("Files must be 10 MB or smaller.");
    const f = file.value;
    const encoded = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
    await api("/attachments", {
      method: "POST",
      body: JSON.stringify({
        entityId: props.entityId,
        filename: f.name,
        mediaType: f.type || "application/octet-stream",
        data: encoded,
        note: note.value,
      }),
    });
    file.value = undefined;
    note.value = "";
    await load();
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function download(f: any) {
  try {
    const data = await api<Blob>("/attachments/" + f.id);
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e: any) {
    error.value = e.message;
  }
}
</script>
<template>
  <section v-if="state.me && isSharedProject" class="briefing-panel record-attachments">
    <h3>Files & revisions</h3>
    <p class="small muted">
      CAD, test logs, photos, or documents. Each upload keeps its own file and a
      note saying which revision or configuration it is.
    </p>
    <article v-for="f in files" :key="f.id">
      <button class="text-action" @click="download(f)">
        {{ f.filename }} ↓
      </button>
      <p>{{ f.revision_note }}</p>
      <small
        >{{ new Date(f.created_at).toLocaleString() }} ·
        {{ Math.ceil(f.size / 1024) }} KB · SHA-256
        {{ f.digest.slice(0, 12) }}</small
      >
    </article>
    <p v-if="!files.length" class="muted">No files attached.</p>
    <details>
      <summary>Attach a file</summary>
      <form @submit.prevent="upload">
        <label class="field-row"
          >File (up to 10 MB)<input
            type="file"
            @change="file = ($event.target as HTMLInputElement).files?.[0]"
            required /></label
        ><label class="field-row"
          >Revision and configuration context<textarea
            v-model="note"
            required
            placeholder="What revision is this? Which prototype/configuration does it apply to?"
          /></label
        ><button class="btn" :disabled="busy || !file || !note.trim()">
          {{ busy ? "Uploading…" : "Upload evidence" }}
        </button>
      </form>
    </details>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>
