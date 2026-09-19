<script setup lang="ts">
import type { Task } from '../data/quiver';
import { ownerName, usd } from '../data/quiver';
defineProps<{ task: Task }>();
</script>
<template>
  <RouterLink :to="`/work/${task.id}`" class="trow">
    <span class="mono trow-id">{{ task.id }}</span>
    <span class="trow-title">{{ task.title }}</span>
    <span class="trow-meta">
      <span v-if="task.state === 'CLOSED'" class="chip">closed</span>
      <span v-else-if="task.claimable" class="chip chip-open">claimable</span>
      <span v-else-if="ownerName(task)" class="chip">{{ ownerName(task) }}</span>
      <span v-else class="chip chip-warn">not yet open</span>
      <span class="mono trow-price">{{ task.priceUsd != null ? usd(task.priceUsd) : '—' }}</span>
    </span>
  </RouterLink>
</template>
