<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { backend, state } from "../data/store";
import { isSharedProject } from "../data/projectDataMode";
import { projectEvidence } from "../data/evidenceState";
const props = defineProps<{ query: string }>();
const threads = ref<any[]>([]),
  work = ref<any[]>([]),
  decisions = ref<any[]>([]),
  error = ref("");
watch(
  () => [state.me?.id, state.version],
  async () => {
    if (!isSharedProject || !state.me) {
      threads.value = [];
      work.value = [];
      decisions.value = [];
      return;
    }
    try {
      [threads.value, work.value, decisions.value] = await Promise.all([
        backend.listThreads(),
        backend.listGrants(),
        backend.listDecisions(),
      ]);
      error.value = "";
    } catch (e: any) {
      error.value = e.message;
    }
  },
  { immediate: true },
);
const matches = (v: unknown) =>
  props.query.trim().length > 0 &&
  JSON.stringify(v).toLowerCase().includes(props.query.toLowerCase());
const sources = computed(() => projectEvidence.sources.filter(matches));
const people = computed(() => state.members.filter(matches));
const shared = computed(() => [
  ...threads.value
    .filter(matches)
    .map((t) => ({
      id: t.id,
      title: t.title,
      kind: "Discussion",
      query: {
        view: "shape",
        workspace: "team",
        thread: t.id,
        version: t.versionId,
      },
    })),
  ...work.value
    .filter(matches)
    .map((g) => ({
      id: g.id,
      title: g.title,
      kind: "Work package",
      query: {
        view: "work",
        workspace: "team",
        grant: g.id,
        version: g.versionId,
      },
    })),
  ...decisions.value
    .filter(matches)
    .map((d) => ({
      id: d.id,
      title: d.title ?? d.chosen ?? d.body?.slice(0, 100) ?? "Design decision",
      kind: "Reviewed design",
      query: {
        view: "design",
        workspace: "team",
        decision: d.id,
        version: d.versionId,
      },
    })),
]);
</script>
<template>
  <div v-if="query.trim()" class="search-extras">
    <p v-if="error" role="alert">Shared results unavailable: {{ error }}</p>
    <section v-if="shared.length" class="briefing-panel">
      <h3>Team records · {{ shared.length }}</h3>
      <RouterLink
        v-for="r in shared"
        :key="r.id"
        class="briefing-item"
        :to="{ path: '/p/spearhead', query: r.query }"
        ><span class="eyebrow">{{ r.kind }}</span
        ><strong>{{ r.title }}</strong></RouterLink
      >
    </section>
    <section v-if="sources.length" class="briefing-panel">
      <h3>Sources · {{ sources.length }}</h3>
      <RouterLink
        v-for="s in sources"
        :key="s.id"
        class="briefing-item"
        :to="{ path: '/p/spearhead', query: { view: 'sources', source: s.id } }"
        ><strong>{{ s.title }}</strong
        ><span>{{ s.date }} · View citing records →</span></RouterLink
      >
    </section>
    <section v-if="people.length" class="briefing-panel">
      <h3>People · {{ people.length }}</h3>
      <article v-for="p in people" :key="p.id" class="briefing-item">
        <strong>{{ p.displayName }} · @{{ p.handle }}</strong
        ><span>{{ p.expertise.join(", ") }}</span
        ><span>{{ p.bio }}</span>
      </article>
    </section>
    <p
      v-if="!shared.length && !sources.length && !people.length"
      class="small muted"
    >
      No matching team records, sources, or people.
    </p>
  </div>
</template>
