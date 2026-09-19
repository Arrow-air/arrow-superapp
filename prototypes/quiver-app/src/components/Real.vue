<script setup lang="ts">defineProps<{ href?: string; label?: string }>();</script>
<template>
  <a v-if="href" class="chip chip-real" :href="href" target="_blank" rel="noopener">{{ label ?? 'from the repo' }} ↗</a>
  <span v-else class="chip chip-real">{{ label ?? 'from the repo' }}</span>
</template>
