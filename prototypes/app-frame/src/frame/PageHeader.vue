<script setup lang="ts">
import { computed } from 'vue';
import Breadcrumb, { type Crumb } from './Breadcrumb.vue';
import Icon from './Icon.vue';
import { useWorkspace } from './useWorkspace';

// The strip above the content slot: where you are inside the section, and
// the page's own actions. Modules can add deeper crumbs later.
const { tab, item, base } = useWorkspace();

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
    <Breadcrumb :crumbs="crumbs" />
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
  padding: var(--space-2) var(--space-4) 0 var(--space-5);
}
.actions { display: flex; gap: 2px; }
@media (max-width: 767px) {
  .page-header { padding-inline: var(--space-3); }
  .hide-sm { display: none; }
}
</style>
