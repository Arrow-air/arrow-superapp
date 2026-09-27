<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { state } from "../data/store";
import { api } from "../data/sharedBackend";
import { repoReview } from "../data/spearheadRepoReview";
const loading = ref(true);
const saved = ref(false);
const rows = ref<any[]>([]),
  selected = ref(""),
  error = ref(""),
  busy = ref(false);
const form = ref({
  status: "open",
  ownerId: "",
  note: "",
  proposedText: "",
  artifactUrl: "",
  resolution: "",
});
const revision = ref(0);
const allowed = computed(() =>
  state.roles.some(
    (r) => r.memberId === state.me?.id && ["lead", "core"].includes(r.role),
  ),
);
watch(
  () => state.me?.id,
  async () => {
    if (!state.me) return;
    loading.value = true;
    try {
      rows.value = await api("/reconciliation");
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
function choose() {
  const row = rows.value.find((r) => r.item_id === selected.value);
  revision.value = row?.revision ?? 0;
  form.value = {
    status: "open",
    ownerId: "",
    note: "",
    proposedText: "",
    artifactUrl: "",
    resolution: "",
    ...row?.data,
  };
}
async function save() {
  busy.value = true;
  saved.value = false;
  error.value = "";
  try {
    rows.value = await api("/reconciliation", {
      method: "POST",
      body: JSON.stringify({
        itemId: selected.value,
        expectedRevision: revision.value,
        status: form.value.status,
        ownerId: form.value.ownerId,
        note: form.value.note,
        proposedText: form.value.proposedText,
        artifactUrl: form.value.artifactUrl,
        resolution: form.value.resolution,
      }),
    });
    choose();
    saved.value = true;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
function download() {
  const item = repoReview.items.find((i) => i.id === selected.value);
  const content = `# ${item?.title}\n\n## Source context\n\n${item?.detail}\n\n[Original source](${item?.sourceUrl})\n\n## Proposed documentation change\n\n${form.value.proposedText}\n\n## Review notes\n\n${form.value.note}\n\nDraft only. This export does not publish a repository change or approve the design.\n`;
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/markdown" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "reconciliation-draft.md";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
</script>
<template>
  <section v-if="state.me" class="briefing-panel">
    <h3>Documentation actions</h3>
    <p>
      Assign follow-through, draft the correction, and link the reviewed result.
      Source classifications remain unchanged.
    </p>
    <label class="field-row"
      >Review item<select
        aria-label="Review item"
        v-model="selected"
        :disabled="loading"
        @change="choose"
      >
        <option value="">Select a documentation item</option>
        <option
          v-for="item in repoReview.items"
          :key="item.id"
          :value="item.id"
        >
          {{ item.title }} ·
          {{ rows.find((r) => r.item_id === item.id)?.data.status ?? "open" }}
        </option>
      </select></label
    >
    <form v-if="selected" @submit.prevent="save">
      <label class="field-row"
        >Follow-through status<select
          aria-label="Follow-through status"
          v-model="form.status"
          :disabled="!allowed"
        >
          <option>open</option>
          <option>investigating</option>
          <option>drafted</option>
          <option>resolved</option>
        </select></label
      ><label class="field-row"
        >Owner<select
          aria-label="Owner"
          v-model="form.ownerId"
          :disabled="!allowed"
        >
          <option value="">Unassigned</option>
          <option v-for="m in state.members" :value="m.id">
            {{ m.displayName }}
          </option>
        </select></label
      ><label class="field-row"
        >Review note<textarea v-model="form.note" :disabled="!allowed" /></label
      ><label class="field-row"
        >Proposed repository text<textarea
          v-model="form.proposedText"
          :disabled="!allowed"
        /></label
      ><label class="field-row"
        >PR, commit, or reviewed artifact<input
          v-model="form.artifactUrl"
          type="url"
          :disabled="!allowed" /></label
      ><label class="field-row"
        >Resolution rationale<textarea
          v-model="form.resolution"
          :disabled="!allowed"
        />
      </label>
      <div class="row">
        <button v-if="allowed" class="btn" :disabled="busy">Save review</button
        ><button type="button" class="btn btn-ghost" @click="download">
          Export proposed change
        </button>
      </div>
    </form>
    <p v-if="saved" role="status">Review saved.</p>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>
