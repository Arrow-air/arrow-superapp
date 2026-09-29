<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useWorkspace } from '../frame/useWorkspace';
import Placeholder from './Placeholder.vue';

// Picks what renders in the slot from the sidebar item: a working zone (its
// context and threads) by default, or one of the views.
const ZonePage = defineAsyncComponent(() => import('./ZonePage.vue'));
const views = {
  summary: defineAsyncComponent(() => import('./SummaryPage.vue')),
  catalog: defineAsyncComponent(() => import('./CatalogPage.vue')),
  threads: defineAsyncComponent(() => import('./ThreadsIndex.vue')),
  bom: defineAsyncComponent(() => import('./BomPage.vue')),
  work: defineAsyncComponent(() => import('./WorkPage.vue')),
  prs: defineAsyncComponent(() => import('./PrsPage.vue')),
  people: defineAsyncComponent(() => import('./PeoplePage.vue')),
  sources: defineAsyncComponent(() => import('./SourcesPage.vue')),
  suggested: defineAsyncComponent(() => import('./SuggestedPage.vue')),
  decisions: defineAsyncComponent(() => import('./DecisionsPage.vue')),
};
const { item } = useWorkspace();
const page = computed(() => item.value?.page ?? 'zone');
</script>

<template>
  <ZonePage v-if="item && page === 'zone'" :zone="item.id" />
  <ZonePage v-else-if="item && page === 'gate'" :zone="item.id" gate />
  <component :is="views[page as keyof typeof views]" v-else-if="page in views" />
  <Placeholder v-else />
</template>
