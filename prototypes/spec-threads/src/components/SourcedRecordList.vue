<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';
import { recordTarget } from '../lib/sourcedNavigation';
import { evidenceLabels, isStaleEvidence, kindLabels, type SourcedRecord } from '../lib/sourcedProject';
defineProps<{ records: SourcedRecord[]; asOf: string; empty?: string }>();
const route=useRoute();
</script>
<template>
  <div class="sourced-record-list">
    <RouterLink v-for="r in records" :key="r.id" :to="recordTarget(r, route.fullPath, route.query)" :data-record-id="r.id" class="briefing-item sourced-record-row">
      <span class="eyebrow">{{ r.versions.join(' / ') }} · {{ kindLabels[r.kind] }}</span>
      <strong>{{ r.title }}</strong><span>{{ r.summary }}</span>
      <span class="sourced-row-meta"><span class="evidence-tag" :data-status="r.status">{{ evidenceLabels[r.status] }}</span><span v-if="isStaleEvidence(r.date, asOf)" class="evidence-tag stale-evidence">Evidence age · &gt;30 days</span><span v-if="r.owner">{{ r.owner }} · </span><time :datetime="r.date">{{ r.date }}</time><span aria-hidden="true">→</span></span>
    </RouterLink>
    <p v-if="!records.length" class="empty-note">{{ empty ?? 'No records in this snapshot match this view.' }}</p>
  </div>
</template>
