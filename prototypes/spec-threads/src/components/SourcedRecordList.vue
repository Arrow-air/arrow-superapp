<script setup lang="ts">
import { evidenceLabels, isStaleEvidence, kindLabels, type SourcedRecord } from '../lib/sourcedProject';
defineProps<{ records: SourcedRecord[]; asOf: string; empty?: string }>();
defineEmits<{ open: [record: SourcedRecord] }>();
</script>
<template>
  <div class="sourced-record-list">
    <button v-for="r in records" :key="r.id" class="briefing-item sourced-record-row" @click="$emit('open', r)">
      <span class="eyebrow">{{ r.versions.join(' / ') }} · {{ kindLabels[r.kind] }}</span>
      <strong>{{ r.title }}</strong>
      <span>{{ r.summary }}</span>
      <span class="sourced-row-meta"><span class="evidence-tag" :data-status="r.status">{{ evidenceLabels[r.status] }}</span><span v-if="isStaleEvidence(r.date, asOf)" class="evidence-tag stale-evidence">Stale evidence · &gt;30 days</span><span v-if="r.owner">{{ r.owner }} · </span><time :datetime="r.date">{{ r.date }}</time><span aria-hidden="true">↗</span></span>
    </button>
    <p v-if="!records.length" class="empty-note">{{ empty ?? 'No records in this snapshot match this view.' }}</p>
  </div>
</template>
