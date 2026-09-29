<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useWorkspace } from '../frame/useWorkspace';
import Placeholder from './Placeholder.vue';
import { threads } from '../modules/threads/data';

// Picks the module for the current page: the threads module in the Discussion
// tab and on any page that has threads; the placeholder everywhere else.
const ThreadsModule = defineAsyncComponent(() => import('../modules/threads/ThreadsModule.vue'));
const { tab, item } = useWorkspace();
const page = computed(() => `${tab.value?.id}/${item.value?.id}`);
const hasThreads = computed(() => threads.some((t) => t.page === page.value));
const module = computed(() => (tab.value?.id === 'discussion' || hasThreads.value ? ThreadsModule : Placeholder));
</script>

<template>
  <component :is="module" :page="tab?.id === 'discussion' ? undefined : page" />
</template>
