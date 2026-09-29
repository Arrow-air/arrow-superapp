<script setup lang="ts">
import { computed } from 'vue';
import Breadcrumb, { type Crumb } from './Breadcrumb.vue';
import Icon from './Icon.vue';
import { useWorkspace } from './useWorkspace';
import { sidebarCollapsed, toggleSidebar } from './layout';
import { MOD, useShortcut } from './shortcuts';

// The strip above the content slot: where you are inside the section, and
// the page's own actions. Modules can add deeper crumbs later.
const { tab, item, base } = useWorkspace();
useShortcut('b', toggleSidebar);

const crumbs = computed<Crumb[]>(() => {
  const group = tab.value?.groups.find((g) => g.items.some((i) => i.id === item.value?.id));
  if (!tab.value || !group || !item.value) return [];
  const to = (id: string) => `${base.value}/${tab.value!.id}/${id}`;
  return [
    {
      id: group.id,
      label: group.label,
      current: item.value.id,
      menu: group.items.map((i) => ({ id: i.id, label: i.label, to: to(i.id) })),
    },
    { id: item.value.id, label: item.value.label },
  ];
});
</script>

<template>
  <div class="page-header">
    <div class="lead">
      <button
        class="tbtn icon-only trigger"
        type="button"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-pressed="sidebarCollapsed"
        :title="`Toggle sidebar (${MOD}B)`"
        @click="toggleSidebar"
      >
        <Icon name="panel-left" :size="14" />
      </button>
      <span class="lead-sep" aria-hidden="true"></span>
      <Breadcrumb :crumbs="crumbs" />
    </div>
    <div class="actions">
      <button class="tbtn" type="button"><Icon name="comment" :size="12" /> <span class="hide-sm">Comment</span></button>
      <button class="tbtn" type="button"><Icon name="share" :size="12" /> <span class="hide-sm">Share</span></button>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 44px;
  padding: var(--space-2) var(--space-4) 0 var(--space-3);
}
.lead { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.icon-only { width: 28px; padding: 0; justify-content: center; }
.trigger[aria-pressed='true'] { color: var(--fg); }
.lead-sep { width: 1px; height: 14px; background: var(--border); }
.actions { display: flex; gap: 2px; }
@media (max-width: 767px) {
  .page-header { padding-inline: var(--space-3); }
  .trigger, .lead-sep { display: none; }
  .hide-sm { display: none; }
}
</style>
