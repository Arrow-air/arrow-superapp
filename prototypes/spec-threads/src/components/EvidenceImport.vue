<script setup lang="ts">
import { ref, computed } from "vue";
import { state } from "../data/store";
import { api } from "../data/sharedBackend";
import {
  projectEvidence,
  evidenceSync,
  refreshEvidence,
} from "../data/evidenceState";
const lead = computed(() =>
  state.roles.some((r) => r.memberId === state.me?.id && r.role === "lead"),
);
const incoming = ref<any>(),
  preview = ref<any>(),
  error = ref(""),
  busy = ref(false);
const reviewedRevision = ref(0);
function exportEvidence() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(projectEvidence, null, 2)], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "spearhead-evidence.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function read(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = true;
  error.value = "";
  preview.value = undefined;
  try {
    if (file.size > 10000000)
      throw new Error("Choose a JSON file below 10 MB.");
    incoming.value = JSON.parse(await file.text());
    reviewedRevision.value = evidenceSync.revision;
    preview.value = await api("/import/preview", {
      method: "POST",
      body: JSON.stringify({
        project: incoming.value,
        expectedRevision: reviewedRevision.value,
      }),
    });
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function apply() {
  busy.value = true;
  try {
    await api("/import/apply", {
      method: "POST",
      body: JSON.stringify({
        project: incoming.value,
        expectedRevision: reviewedRevision.value,
      }),
    });
    await refreshEvidence();
    preview.value = undefined;
    incoming.value = undefined;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <details v-if="lead" class="briefing-panel">
    <summary>Review an evidence import</summary>
    <p>
      Use the workspace evidence JSON format. Stable IDs prevent duplicates;
      omitted records are retained. Importing does not approve a design or
      create team posts.
    </p>
    <button class="btn btn-ghost" @click="exportEvidence">
      Export current evidence format</button
    ><label class="field-row"
      >Updated evidence JSON<input
        type="file"
        accept="application/json,.json"
        @change="read"
    /></label>
    <p v-if="error" role="alert">{{ error }}</p>
    <section v-if="preview">
      <h3>{{ preview.changed ? "Changes to review" : "No changes" }}</h3>
      <p>
        {{ preview.metadata.length }} project fields ·
        {{ preview.records.length }} changed records ·
        {{ preview.sources.length }} changed sources ·
        {{ preview.retained }} omitted records retained
      </p>
      <details
        v-for="change in [
          ...preview.metadata,
          ...preview.records,
          ...preview.sources,
        ]"
        :key="change.id"
      >
        <summary>{{ change.kind }} · {{ change.title }}</summary>
        <div v-if="change.before">
          <h4>Before</h4>
          <pre class="import-diff">{{
            JSON.stringify(change.before, null, 2)
          }}</pre>
        </div>
        <h4>After</h4>
        <pre class="import-diff">{{
          JSON.stringify(change.after, null, 2)
        }}</pre>
      </details>
      <button class="btn" :disabled="busy || !preview.changed" @click="apply">
        Apply reviewed import
      </button>
    </section>
  </details>
</template>
