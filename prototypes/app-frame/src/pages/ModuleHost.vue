<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useWorkspace } from '../frame/useWorkspace';
import Placeholder from './Placeholder.vue';

// Picks the module for the current page. Only the Discussion tab has a real
// module so far; everything else shows the placeholder.
const ThreadsModule = defineAsyncComponent(() => import('../modules/threads/ThreadsModule.vue'));
const { tab } = useWorkspace();
const module = computed(() => (tab.value?.id === 'discussion' ? ThreadsModule : Placeholder));
</script>

<template>
  <component :is="module" />
</template>
