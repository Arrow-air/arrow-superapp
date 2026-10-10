<script setup lang="ts">
import { defineAsyncComponent, h, type Component } from 'vue';
import { useWorkspace } from '../frame/useWorkspace';
import SlotState from '../frame/SlotState.vue';
import Placeholder from './Placeholder.vue';

// Picks what renders in the slot from the sidebar item: a working zone (its
// context and threads) by default, or one of the views.
//
// Pages load as their own chunks and show the frame's loading state while
// they do, rather than holding up the route change: a page that suspended
// the change would keep the outgoing page alive, and that page re-rendering
// for the new route mid-transition is what broke navigation between projects.
const page$ = (load: () => Promise<{ default: Component }>) =>
  defineAsyncComponent({ loader: load, suspensible: false, delay: 150, loadingComponent: () => h(SlotState, { kind: 'loading' }) });
const ZonePage = page$(() => import('./ZonePage.vue'));
const ReleasePage = page$(() => import('./ReleasePage.vue'));
const ModelPage = page$(() => import('./ModelPage.vue'));
const views = {
  pcbs: page$(() => import('./PcbPage.vue')),
  grants: page$(() => import('./GrantsPage.vue')),
  summary: page$(() => import('./SummaryPage.vue')),
  catalog: page$(() => import('./CatalogPage.vue')),
  threads: page$(() => import('./ThreadsIndex.vue')),
  bom: page$(() => import('./BomPage.vue')),
  work: page$(() => import('./WorkPage.vue')),
  prs: page$(() => import('./PrsPage.vue')),
  people: page$(() => import('./PeoplePage.vue')),
  sources: page$(() => import('./SourcesPage.vue')),
  suggested: page$(() => import('./SuggestedPage.vue')),
  decisions: page$(() => import('./DecisionsPage.vue')),
  'ls-summary': page$(() => import('./longshot/SummaryPage.vue')),
  'ls-bom': page$(() => import('./longshot/BomPage.vue')),
  'ls-github': page$(() => import('./longshot/GithubPage.vue')),
};
// App.vue keys this host by route path, so each page gets its own host and
// the page is fixed when it is created; only the query (?thread=) changes
// under it.
const { item: current } = useWorkspace();
const item = current.value;
const page = item?.page ?? 'zone';
</script>

<template>
  <ZonePage v-if="item && page === 'zone'" :zone="item.id" />
  <ZonePage v-else-if="item && page === 'gate'" :zone="item.id" gate />
  <ReleasePage v-else-if="page === 'release'" />
  <ModelPage v-else-if="page === 'model'" />
  <component :is="views[page as keyof typeof views]" v-else-if="page in views" />
  <Placeholder v-else />
</template>
