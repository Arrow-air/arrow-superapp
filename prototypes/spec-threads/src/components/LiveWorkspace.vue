<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { state, backend, act } from "../data/store";
import type { ThreadBundle } from "../data/backend";
import type { Decision, Grant } from "../lib/types";
import WorkspaceDiscussion from "./WorkspaceDiscussion.vue";
import ProjectDesign from "./ProjectDesign.vue";
import ProjectWork from "./ProjectWork.vue";
import RecordAttachments from "./RecordAttachments.vue";
import FollowRecord from "./FollowRecord.vue";
import { useUnsaved } from "../composables/useUnsaved";
const props = defineProps<{ view: string }>();
const route = useRoute(),
  router = useRouter();
const bundles = ref<ThreadBundle[]>([]),
  decisions = ref<Decision[]>([]),
  grants = ref<Grant[]>([]),
  loading = ref(true),
  loaded = ref(false),
  error = ref("");
const title = ref(""),
  body = ref(""),
  system = ref(""),
  composing = ref(false),
  busy = ref(false);
const dirty = computed(() => composing.value && !!(title.value || body.value));
useUnsaved(dirty);
const project = computed(() =>
  state.projects.find((p) => p.id === "spearhead"),
);
const version = computed(
  () =>
    project.value?.versions.find(
      (v) => v.id === String(route.query.version).replace("sh-pt", "PT"),
    ) ??
    project.value?.versions.find((v) => v.state === "discussing") ??
    project.value?.versions[0],
);
const rows = computed(() =>
  bundles.value
    .filter(
      (b) =>
        (!route.query.version ||
          b.thread.versionId ===
            String(route.query.version).replace("sh-pt", "PT")) &&
        (!route.query.system || b.thread.system === route.query.system),
    )
    .sort((a, b) => b.thread.createdAt.localeCompare(a.thread.createdAt)),
);
const selected = computed(() =>
  bundles.value.find((b) => b.thread.id === route.query.thread),
);
watch(
  () => [state.version, state.me?.id],
  async () => {
    if (!state.me) {
      loading.value = false;
      return;
    }
    if (!loaded.value) loading.value = true;
    try {
      [bundles.value, decisions.value, grants.value] = await Promise.all([
        backend.listBundles(),
        backend.listDecisions(),
        backend.listGrants(),
      ]);
      error.value = "";
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
      loaded.value = true;
    }
  },
  { immediate: true },
);
function navigate(
  view: string,
  query: Record<string, string | undefined> = {},
) {
  return router.push({
    path: "/p/spearhead",
    query: { workspace: "team", view, version: version.value?.id, ...query },
  });
}
async function create() {
  if (!project.value || busy.value) return;
  busy.value = true;
  let thread: any;
  const ok = await act(async () => {
    thread = await backend.createThread({
      projectId: project.value!.id,
      title: title.value,
      body: body.value,
      system: system.value || undefined,
      tags: [],
    });
  });
  busy.value = false;
  if (ok) {
    composing.value = false;
    title.value = "";
    body.value = "";
    await navigate("shape", { thread: thread.id, version: thread.versionId });
  }
}
</script>
<template>
  <section class="live-workspace">
    <p v-if="!state.me" class="briefing-panel">
      Sign in to read and contribute to the team workspace.
      <RouterLink to="/sign-in">Sign in →</RouterLink>
    </p>
    <p v-else-if="loading">Loading shared records…</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <template v-else-if="project && version">
      <template v-if="view === 'shape'">
        <div class="section-heading">
          <h2>Team discussions</h2>
          <button class="btn" @click="composing = !composing">
            New discussion
          </button>
        </div>
        <form v-if="composing" class="briefing-panel" @submit.prevent="create">
          <label class="field-row"
            >Question or proposed change<input
              v-model="title"
              required
              maxlength="240" /></label
          ><label class="field-row"
            >Context<textarea v-model="body" required /></label
          ><label class="field-row"
            >System<select v-model="system">
              <option value="">Project-wide</option>
              <option v-for="s in project.systems" :key="s">{{ s }}</option>
            </select></label
          >
          <p>
            New discussions target the open design version, not a change to the
            aircraft in build.
          </p>
          <button class="btn" :disabled="busy">Post discussion</button>
        </form>
        <template v-if="selected"
          ><div class="section-heading">
            <button class="text-action" @click="navigate('shape')">
              ← All team discussions</button
            ><FollowRecord :target="selected.thread.id" />
          </div>
          <p v-if="selected.thread.sourceRecordId" class="context-note">
            Started from imported evidence.
            <RouterLink
              :to="{
                path: '/p/spearhead',
                query: { record: selected.thread.sourceRecordId },
              }"
              >Read original context →</RouterLink
            >
          </p>
          <WorkspaceDiscussion
            :key="selected.thread.id"
            :bundle="selected"
            :project="project"
            @review="navigate('design')"
            @grant="
              (id) => navigate('work', { grant: id })
            " /><RecordAttachments :entity-id="selected.thread.id"
        /></template>
        <p v-else-if="route.query.thread" class="briefing-panel">
          Discussion unavailable. It may have moved or require different access.
        </p>
        <template v-else
          ><p v-if="!rows.length" class="briefing-panel">
            No team discussions yet. Start one here or open an imported question
            and choose “Discuss this.”
          </p>
          <RouterLink
            v-for="b in rows"
            :key="b.thread.id"
            class="briefing-item sourced-record-row briefing-panel"
            :to="{
              path: '/p/spearhead',
              query: {
                view: 'shape',
                workspace: 'team',
                thread: b.thread.id,
                version: b.thread.versionId,
              },
            }"
            ><span class="eyebrow"
              >{{ b.thread.versionId }} ·
              {{
                b.thread.status === "open" ? "Open" : "Outcome recorded"
              }}</span
            ><strong>{{ b.thread.title }}</strong
            ><span
              >{{ b.positions.length }} contributions ·
              {{ b.comments.length }} replies ·
              {{ new Date(b.thread.createdAt).toLocaleDateString() }}</span
            ></RouterLink
          ></template
        >
      </template>
      <ProjectDesign
        v-else-if="view === 'design'"
        :project="project"
        :version="version"
        :decisions="decisions"
        :grants="grants"
        :bundles="bundles"
        @navigate="navigate"
      />
      <template v-else-if="view === 'work'"
        ><ProjectWork
          :project="project"
          :version="version"
          :grants="grants"
          :bundles="bundles"
          @navigate="navigate" /><RecordAttachments
          v-if="route.query.grant"
          :entity-id="String(route.query.grant)"
      /></template>
    </template>
  </section>
</template>
