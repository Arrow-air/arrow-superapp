<script setup lang="ts">
import EvidenceImport from "./EvidenceImport.vue";
import ReconciliationQueue from "./ReconciliationQueue.vue";
import { isSharedProject } from "../data/projectDataMode";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { projectEvidence as spearhead } from "../data/evidenceState";
import { repoReview, repoReviewLabels } from "../data/spearheadRepoReview";
import { sourceLabels, isStaleEvidence } from "../lib/sourcedProject";
import RepoFollowThrough from "./RepoFollowThrough.vue";
import SourcedRecordList from "./SourcedRecordList.vue";
import { recordTarget } from "../lib/sourcedNavigation";
const route = useRoute(),
  router = useRouter();
const field = (name: string) =>
  computed({
    get: () => String(route.query[name] ?? ""),
    set: (value: string) => {
      void router.replace({
        query: { ...route.query, [name]: value || undefined },
      });
    },
  });
const query = field("sq"),
  type = field("sourceType"),
  after = field("after"),
  system = field("sourceSystem"),
  category = field("category");
const sources = computed(() =>
  spearhead.sources
    .filter(
      (s) =>
        (!type.value || s.kind === type.value) &&
        (!after.value || s.date >= after.value) &&
        `${s.title} ${s.note ?? ""}`
          .toLowerCase()
          .includes(query.value.toLowerCase()) &&
        (!system.value ||
          spearhead.records.some(
            (r) =>
              r.systems.includes(system.value) && r.sourceIds.includes(s.id),
          )),
    )
    .sort((a, b) => b.date.localeCompare(a.date)),
);
const selected = computed(() =>
  spearhead.sources.find((s) => s.id === route.query.source),
);
const linked = computed(() =>
  spearhead.records.filter(
    (r) => selected.value && r.sourceIds.includes(selected.value.id),
  ),
);
const counts = Object.entries(repoReviewLabels).map(([key, label]) => ({
  key,
  label,
  count: repoReview.items.filter((i) => i.category === key).length,
}));
const reviewItems = computed(() =>
  repoReview.items.filter(
    (i) => !category.value || i.category === category.value,
  ),
);
function open(id: string) {
  const r = spearhead.records.find((r) => r.id === id);
  if (r) void router.push(recordTarget(r, route.fullPath, route.query));
}
</script>
<template>
  <section class="records-view sourced-sources">
    <header class="briefing-heading">
      <h2>Sources & coverage</h2>
      <p>
        Repository documents, original transcripts, and attributed call
        summaries. Evidence collection: {{ spearhead.asOf }}.
      </p>
    </header>
    <details class="briefing-panel coverage-disclosure">
      <summary>How to read this snapshot</summary>
      <ul>
        <li v-for="note in spearhead.coverage" :key="note">{{ note }}</li>
      </ul>
    </details>
    <EvidenceImport v-if="isSharedProject" />
    <nav class="work-queues" aria-label="Evidence views">
      <button
        :aria-pressed="route.query.evidence !== 'review'"
        @click="
          router.push({
            query: { ...route.query, evidence: undefined, source: undefined },
          })
        "
      >
        Source library · {{ spearhead.sources.length }}</button
      ><button
        :aria-pressed="route.query.evidence === 'review'"
        @click="
          router.push({
            query: { ...route.query, evidence: 'review', source: undefined },
          })
        "
      >
        Repository follow-through · {{ repoReview.items.length }}
      </button>
    </nav>
    <template v-if="route.query.evidence !== 'review'">
      <div class="sourced-list-filters">
        <label
          >Find a source<input
            v-model="query"
            type="search"
            aria-label="Search sources"
            placeholder="Title or source notes" /></label
        ><label
          >Source type<select v-model="type" aria-label="Source type">
            <option value="">All sources</option>
            <option
              v-for="(label, key) in sourceLabels"
              :value="key"
              :key="key"
            >
              {{ label }}
            </option>
          </select></label
        ><label
          >System<select v-model="system" aria-label="Source system">
            <option value="">All systems</option>
            <option v-for="s in spearhead.systems" :value="s.id" :key="s.id">
              {{ s.name }}
            </option>
          </select></label
        ><label
          >Published on or after<input
            v-model="after"
            type="date"
            aria-label="Source date from"
        /></label>
      </div>
      <p role="status" class="muted">{{ sources.length }} sources</p>
      <section v-if="selected" class="briefing-panel source-linked-records">
        <div class="section-heading">
          <h3>Records citing {{ selected.title }}</h3>
          <button
            class="text-action"
            @click="
              router.replace({ query: { ...route.query, source: undefined } })
            "
          >
            Close
          </button>
        </div>
        <SourcedRecordList :records="linked" :as-of="spearhead.asOf" />
      </section>
      <div class="sourced-source-grid">
        <article
          v-for="source in sources"
          :key="source.id"
          class="briefing-panel"
        >
          <span class="eyebrow"
            >{{ sourceLabels[source.kind] }} · {{ source.date }}</span
          ><span
            v-if="isStaleEvidence(source.date, spearhead.asOf)"
            class="evidence-tag stale-evidence"
            >Evidence age · &gt;30 days</span
          >
          <h3>
            <a :href="source.url" target="_blank" rel="noopener"
              >{{ source.title }} ↗</a
            >
          </h3>
          <p v-if="source.note">{{ source.note }}</p>
          <p class="source-access">
            {{
              source.url.includes("discord.com")
                ? "Discord sign-in and channel access required."
                : "GitHub source; access depends on repository permissions."
            }}
          </p>
          <button
            class="text-action"
            @click="
              router.push({ query: { ...route.query, source: source.id } })
            "
          >
            View
            {{
              spearhead.records.filter((r) => r.sourceIds.includes(source.id))
                .length
            }}
            linked records →
          </button>
        </article>
      </div>
      <p v-if="!sources.length" class="empty-note">
        No sources match these filters.
      </p>
    </template>
    <section
      v-else
      class="briefing-panel repo-review-panel"
      aria-labelledby="repo-review-heading"
    >
      <h3 id="repo-review-heading">Repository follow-through</h3>
      <p>{{ repoReview.summary }}</p>
      <div class="repo-review-counts">
        <button
          v-for="c in counts"
          :key="c.key"
          :aria-pressed="category === c.key"
          @click="category = category === c.key ? '' : c.key"
        >
          <b>{{ c.count }}</b
          >{{ c.label }}
        </button>
      </div>
      <button v-if="category" class="text-action" @click="category = ''">
        Show all reviewed items
      </button>
      <p>{{ repoReview.method }}</p>
      <details>
        <summary>Review scope and qualifications</summary>
        <p>{{ repoReview.qualification }}</p>
        <p>
          Checked {{ repoReview.checked }} against
          <a
            :href="
              'https://github.com/Arrow-air/project-spearhead/tree/' +
              repoReview.commit
            "
            target="_blank"
            rel="noopener"
            >{{ repoReview.commit.slice(0, 8) }}</a
          >. Discussions availability was checked separately.
        </p>
      </details>
      <ReconciliationQueue v-if="isSharedProject" /><RepoFollowThrough
        :items="reviewItems"
        show-context
        @open="open"
      />
    </section>
  </section>
</template>
