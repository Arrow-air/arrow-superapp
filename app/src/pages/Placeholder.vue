<script setup lang="ts">
import { useWorkspace } from '../frame/useWorkspace';
const { item } = useWorkspace();
</script>

<template>
  <!-- Empty on purpose: the design shows the slot bare. Modules render here. -->
  <div class="placeholder">
    <span class="caps">{{ item?.label }} module</span>
  </div>
</template>

<style scoped>
.placeholder {
  height: 100%;
  min-height: 240px;
  display: grid;
  place-items: center;
  color: var(--fg-faint);
}
</style>
