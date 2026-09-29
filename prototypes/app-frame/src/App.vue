<script setup lang="ts">
import { computed, onErrorCaptured, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppBar from './frame/AppBar.vue';
import MobileNav from './frame/MobileNav.vue';
import SidePanel from './frame/SidePanel.vue';
import PageHeader from './frame/PageHeader.vue';
import SlotState from './frame/SlotState.vue';

const route = useRoute();
const title = computed(() => route.meta.title ?? '');
const hasPanel = computed(() => !!route.meta.panel);
const panelOpen = ref(true);

// A page that throws is contained to the content slot; the frame stays usable.
const pageError = ref<Error | null>(null);
onErrorCaptured((err) => {
  pageError.value = err instanceof Error ? err : new Error(String(err));
  return false;
});
watch(() => route.fullPath, () => (pageError.value = null));

watch(title, (t) => (document.title = t ? `${t} · Arrow` : 'Arrow'), { immediate: true });
</script>

<template>
  <div class="frame" :class="{ 'has-panel': hasPanel && panelOpen }">
    <AppBar class="frame-bar" />

    <main class="frame-main">
      <PageHeader :title="title">
        <template #actions>
          <button v-if="hasPanel" class="btn" type="button" @click="panelOpen = !panelOpen">
            {{ panelOpen ? 'Hide panel' : 'Show panel' }}
          </button>
        </template>
      </PageHeader>

      <div class="frame-slot">
        <SlotState v-if="pageError" kind="error" :detail="pageError.message" />
        <RouterView v-else v-slot="{ Component }">
          <Suspense>
            <component :is="Component" :key="route.fullPath" />
            <template #fallback><SlotState kind="loading" /></template>
          </Suspense>
        </RouterView>
      </div>
    </main>

    <SidePanel v-if="hasPanel && panelOpen" class="frame-panel" @close="panelOpen = false" />
    <MobileNav class="frame-mobile-nav" />
  </div>
</template>

<style scoped>
.frame {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto 1fr;
  grid-template-areas: 'bar' 'main';
}
.frame.has-panel {
  grid-template-columns: minmax(0, 1fr) var(--panel-width);
  grid-template-areas: 'bar bar' 'main panel';
}
.frame-bar { grid-area: bar; }
.frame-main {
  grid-area: main;
  width: 100%;
  max-width: var(--content-max);
  margin-inline: auto;
  padding: var(--space-6) var(--gutter) var(--space-8);
}
.frame-panel { grid-area: panel; }
.frame-mobile-nav { display: none; }

@media (max-width: 767px) {
  .frame.has-panel {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'bar' 'main';
  }
  .frame-main { padding-bottom: calc(var(--mobile-nav-height) + var(--space-6)); }
  .frame-mobile-nav { display: flex; }
}
</style>
