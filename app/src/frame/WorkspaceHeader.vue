<script setup lang="ts">
import ProjectSwitcher from './ProjectSwitcher.vue';
import SegmentedTabs from './SegmentedTabs.vue';
import { computed } from 'vue';
import { useWorkspace } from './useWorkspace';

// The project's own tabs: each project has its places, then the shared views.
const { project, tab, base } = useWorkspace();
const tabs = computed(() => project.value?.tabs ?? []);
</script>

<template>
  <div class="header">
    <ProjectSwitcher />
    <SegmentedTabs
      label="Workspace"
      :items="tabs.map((t, i) => ({ id: t.id, label: t.label, to: `${base}/${t.id}`, divider: !!t.view && !tabs[i - 1]?.view }))"
      :active="tab?.id"
    />
  </div>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-height: 60px;
  padding: var(--space-3);
  background: var(--surface-header);
  border-bottom: 1px solid var(--border);
}

@media (max-width: 1023px) {
  .header { flex-direction: column; align-items: stretch; padding: var(--space-3) var(--gutter); }
  .header > :first-child { align-self: flex-start; }
}
</style>
