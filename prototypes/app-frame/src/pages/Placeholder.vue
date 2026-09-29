<script setup lang="ts">
import { useRoute } from 'vue-router';
const route = useRoute();
</script>

<template>
  <div class="placeholder">
    <p>Content for <strong>{{ route.meta.title }}</strong> goes here.</p>
    <!-- Tall filler so scrolling, the sticky bar and the panel can be checked. -->
    <div v-for="n in 12" :key="n" class="block"></div>
  </div>
</template>

<style scoped>
.placeholder { display: grid; gap: var(--space-4); }
.block {
  height: 120px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}
</style>
