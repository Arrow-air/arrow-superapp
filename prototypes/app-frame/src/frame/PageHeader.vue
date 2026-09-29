<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="page-header">
    <h1>{{ title }}</h1>
    <div class="actions"><slot name="actions" /></div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
h1 { font-size: var(--text-2xl); margin: 0; }
.actions { display: flex; gap: var(--space-2); }
</style>
