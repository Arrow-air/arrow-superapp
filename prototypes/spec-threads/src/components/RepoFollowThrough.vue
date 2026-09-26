<script setup lang="ts">
import { repoReviewLabels, type RepoReviewItem } from '../data/spearheadRepoReview';
import { spearhead } from '../data/spearheadReal';
defineProps<{ items: RepoReviewItem[]; showContext?: boolean }>();
defineEmits<{ open: [recordId: string] }>();
const titleFor = (id: string) => spearhead.records.find(r => r.id === id)?.title ?? id;
</script>

<template>
  <div class="repo-follow-through">
    <details v-for="item in items" :key="item.id" class="repo-follow-item">
      <summary><strong>{{ item.title }}</strong><span class="evidence-tag" :data-repo-category="item.category">{{ repoReviewLabels[item.category] }}</span></summary>
      <p>{{ item.detail }}</p>
      <p class="small muted">Source date: {{ item.date }} · Repository review: September 26, 2026</p>
      <div class="repo-review-links"><a :href="item.sourceUrl" target="_blank" rel="noopener">Dated source ↗</a><a v-if="item.repoUrl" :href="item.repoUrl" target="_blank" rel="noopener">Repository reference ↗</a></div>
      <div v-if="showContext && item.relatedIds.length" class="repo-review-context"><button v-for="id in item.relatedIds" :key="id" class="text-action" @click="$emit('open', id)">{{ titleFor(id) }} →</button></div>
    </details>
  </div>
</template>
