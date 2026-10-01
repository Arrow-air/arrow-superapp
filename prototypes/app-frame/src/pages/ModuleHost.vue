<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useWorkspace } from '../frame/useWorkspace';
import Placeholder from './Placeholder.vue';
import { threads } from '../modules/threads/data';
import { subsystemGroups } from '../modules/model/model';

// Picks the module for the current page: the model on Design subsystems and
// the whole aircraft, the parts list under Reference, the threads module in the
// Discussion tab and on any other page that has threads; the placeholder everywhere else.
const ThreadsModule = defineAsyncComponent(() => import('../modules/threads/ThreadsModule.vue'));
const SubsystemModule = defineAsyncComponent(() => import('../modules/model/SubsystemModule.vue'));
const ModelStage = defineAsyncComponent(() => import('../modules/model/ModelStage.vue'));
const PartsModule = defineAsyncComponent(() => import('../modules/model/PartsModule.vue'));
const { tab, item } = useWorkspace();
const page = computed(() => `${tab.value?.id}/${item.value?.id}`);
const hasThreads = computed(() => threads.some((t) => t.page === page.value));
const view = computed(() => {
  const id = item.value?.id ?? '';
  if (tab.value?.id === 'design') {
    if (id in subsystemGroups) return { is: SubsystemModule, props: { subsystem: id, label: item.value!.label, page: page.value } };
    if (id === 'aircraft') return { is: ModelStage, props: { label: 'Whole aircraft' } };
    if (id === 'parts') return { is: PartsModule, props: {} };
  }
  if (tab.value?.id === 'discussion') return { is: ThreadsModule, props: {} };
  if (hasThreads.value) return { is: ThreadsModule, props: { page: page.value } };
  return { is: Placeholder, props: {} };
});
</script>

<template>
  <component :is="view.is" :key="page" v-bind="view.props" />
</template>
