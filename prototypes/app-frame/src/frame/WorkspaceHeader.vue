<script setup lang="ts">
import { computed } from 'vue';
import Breadcrumb, { type Crumb } from './Breadcrumb.vue';
import SegmentedTabs from './SegmentedTabs.vue';
import { tabs } from './nav';
import { useWorkspace } from './useWorkspace';

const { project, tab, item, base } = useWorkspace();

// Project, then the tab (which opens a menu of the other tabs), then the page.
const crumbs = computed<Crumb[]>(() => {
  const out: Crumb[] = [];
  if (project.value) out.push({ id: project.value.id, label: project.value.label, to: `${base.value}/overview` });
  if (tab.value) {
    out.push({
      id: tab.value.id,
      label: tab.value.label,
      to: `${base.value}/${tab.value.id}`,
      menu: tabs.map((t) => ({ id: t.id, label: t.label, to: `${base.value}/${t.id}` })),
    });
  }
  if (item.value) out.push({ id: item.value.id, label: item.value.label });
  return out;
});
</script>

<template>
  <div class="header">
    <Breadcrumb :crumbs="crumbs" />

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
  min-height: 64px;
  padding: var(--space-3) var(--space-3) var(--space-3) var(--gutter);
  background: var(--surface-header);
  border-bottom: 1px solid var(--border);
}

@media (max-width: 1023px) {
  .header { flex-direction: column; align-items: stretch; padding: var(--space-3) var(--gutter); }
}
</style>
