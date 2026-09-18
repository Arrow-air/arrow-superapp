<script setup lang="ts">
import type { WeightBreakdown } from '../lib/types';

defineProps<{ breakdown: WeightBreakdown; title?: string }>();
</script>

<template>
  <div class="weight-box">
    <div class="label">{{ title ?? 'Your vote weight on this need' }}</div>
    <div class="row" style="margin-top: 6px; align-items: baseline">
      <span class="weight-total">{{ breakdown.total }}</span>
      <span class="muted small">votes</span>
    </div>
    <div class="weight-formula">
      (<span class="term">{{ breakdown.base }} base</span>
      + <span class="term" :class="{ zero: !breakdown.token }">{{ breakdown.token }} tokens</span>
      + <span class="term" :class="{ zero: !breakdown.expertise }">{{ breakdown.expertise }} expertise</span>
      + <span class="term" :class="{ zero: !breakdown.builder }">{{ breakdown.builder }} builder</span>)
      × <span class="term">{{ breakdown.roleMultiplier }} {{ breakdown.role }}</span>
    </div>
    <div v-if="breakdown.matchedTags.length" class="row" style="margin-top: 8px; gap: 5px">
      <span class="label">matched</span>
      <span v-for="t in breakdown.matchedTags" :key="t" class="chip chip-match">{{ t }}</span>
    </div>
  </div>
</template>
