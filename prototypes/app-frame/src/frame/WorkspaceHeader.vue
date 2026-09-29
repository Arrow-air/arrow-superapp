<script setup lang="ts">
import Icon from './Icon.vue';
import SegmentedTabs from './SegmentedTabs.vue';
import { tabs } from './nav';
import { useWorkspace } from './useWorkspace';

const { project, tab, item, base } = useWorkspace();
</script>

<template>
  <div class="header">
    <nav class="crumbs caps" aria-label="Breadcrumb">
      <RouterLink :to="`${base}/overview`" class="crumb project">{{ project?.label }}</RouterLink>
      <template v-if="tab">
        <Icon name="chevron-right" :size="12" class="sep" />
        <RouterLink :to="`${base}/${tab.id}`" class="crumb section">{{ tab.label }}</RouterLink>
      </template>
      <template v-if="item">
        <Icon name="chevron-right" :size="12" class="sep" />
        <span class="crumb current" aria-current="page">{{ item.label }}</span>
      </template>
    </nav>

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
.crumbs {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  white-space: nowrap;
}
.crumb { text-decoration: none; }
.project { color: var(--link); }
.section { color: var(--accent-text); }
.current { color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; }
.sep { color: var(--fg-faint); flex: none; }


@media (max-width: 1023px) {
  .header { flex-direction: column; align-items: stretch; padding: var(--space-3) var(--gutter); }
}
</style>
