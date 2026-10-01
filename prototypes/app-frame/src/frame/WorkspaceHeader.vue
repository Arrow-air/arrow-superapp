<script setup lang="ts">
import ProjectSwitcher from './ProjectSwitcher.vue';
import SegmentedTabs from './SegmentedTabs.vue';
import { tabs } from './nav';
import { useWorkspace } from './useWorkspace';

const { tab, base } = useWorkspace();
</script>

<template>
  <div class="header">
    <ProjectSwitcher />
    <SegmentedTabs
      label="Workspace"
      :items="tabs.map((t) => ({ id: t.id, label: t.label, to: `${base}/${t.id}` }))"
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
