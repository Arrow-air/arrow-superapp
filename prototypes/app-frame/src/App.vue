<script setup lang="ts">
import { computed, onErrorCaptured, ref, watch } from 'vue';
import AppBar from './frame/AppBar.vue';
import WorkspaceHeader from './frame/WorkspaceHeader.vue';
import SectionSidebar from './frame/SectionSidebar.vue';
import PageHeader from './frame/PageHeader.vue';
import SlotState from './frame/SlotState.vue';
import AppFooter from './frame/AppFooter.vue';
import GlobalDrawer from './frame/GlobalDrawer.vue';
import { useWorkspace } from './frame/useWorkspace';

const { route, project, tab, item } = useWorkspace();
const inWorkspace = computed(() => !!project.value && !!tab.value);

// A page that throws is contained to the content slot; the frame stays usable.
const pageError = ref<Error | null>(null);
onErrorCaptured((err) => {
  pageError.value = err instanceof Error ? err : new Error(String(err));
  return false;
});
watch(() => route.fullPath, () => (pageError.value = null));

watch(
  () => [item.value?.label, project.value?.label].filter(Boolean).join(' · '),
  (t) => (document.title = t ? `${t} · Arrow` : 'Arrow'),
  { immediate: true },
);
</script>

<template>
  <div class="shell">
  <GlobalDrawer />
  <div class="frame">
    <AppBar />

    <div class="card">
      <WorkspaceHeader v-if="inWorkspace" />
      <div class="body">
        <SectionSidebar v-if="inWorkspace" />
        <div class="column">
          <PageHeader v-if="inWorkspace && item" />
          <main class="slot">
            <SlotState v-if="pageError" kind="error" :detail="pageError.message" />
            <RouterView v-else v-slot="{ Component }">
              <Suspense>
                <component :is="Component" :key="route.path" />
                <template #fallback><SlotState kind="loading" /></template>
              </Suspense>
            </RouterView>
          </main>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
  </div>
</template>

<style scoped>
/* Shell: the Arrow panel and the app side by side, so opening the panel
   pushes the whole app right. */
.shell { display: flex; height: 100dvh; overflow: hidden; }
.frame {
  flex: 1;
  min-width: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}
.card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  margin: 0 var(--frame-inset) var(--frame-inset);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.body {
  flex: 1;
  min-height: 0;
  display: flex;
}
.column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
/* The slot is the only thing that scrolls; bar, header and sidebar stay put. */
.slot {
  flex: 1;
  min-height: 0;
  margin: var(--space-2) var(--space-4) var(--space-4);
  background: var(--slot-bg);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  overflow: auto;
}

@media (max-width: 767px) {
  .shell { height: auto; overflow: visible; }
  .frame { height: auto; min-height: 100dvh; }
  .card { border-radius: 0; border-inline: 0; border-bottom: 0; }
  .body { flex-direction: column; }
  .slot { margin: var(--space-3); min-height: 60dvh; }
}
</style>
