<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Icon from './Icon.vue';
import { useWorkspace } from './useWorkspace';
import { sidebarCollapsed as collapsed, toggleSidebar } from './layout';
import { communitySidebar, type SideGroup } from '../modules/registry/community';

const { project, tab, item, base, route } = useWorkspace();

// A project's tabs list their pages; Community's sidebar is its saved views
// and the taxonomy, with counts from the registry.
const groups = computed<(SideGroup & { sortable?: boolean })[]>(() => {
  if (project.value?.id === 'community') return communitySidebar(route, typeof route.query.from === 'string' ? `view:${route.query.from}` : undefined);
  return (tab.value?.groups ?? []).map((g) => ({
    id: g.id, label: g.label, sortable: g.sortable,
    items: g.items.map((i) => ({ id: i.id, label: i.label, icon: i.icon, to: `${base.value}/${tab.value!.id}/${i.id}`, active: i.id === item.value?.id })),
  }));
});
const current = computed(() => groups.value.flatMap((g) => g.items).find((i) => i.active));

// On phones the sidebar collapses behind a toggle showing the current page.
const open = ref(false);
watch(() => route.fullPath, () => (open.value = false));
</script>

<template>
  <aside class="sidebar" :class="{ open, collapsed }" aria-label="Section">
    <button class="toggle control" type="button" :aria-expanded="open" @click="open = !open">
      <Icon v-if="current?.icon" :name="current.icon" :size="16" class="toggle-icon" />
      <span v-else-if="current?.dot" class="dot" :style="{ '--c': current.dot }"></span>
      <span>{{ current?.label ?? tab?.label }}</span>
      <Icon name="chevrons-v" :size="14" class="muted" />
    </button>

    <div class="groups">
      <section v-for="g in groups" :key="g.id" class="group">
        <h2 class="group-label caps">
          {{ g.label }}
          <button v-if="g.sortable" class="sort" type="button" aria-label="Sort"><Icon name="sort" :size="12" /></button>
        </h2>
        <RouterLink
          v-for="i in g.items"
          :key="i.id"
          :to="i.to"
          class="item"
          :class="{ active: i.active }"
          :aria-current="i.active ? 'page' : undefined"
          :title="collapsed ? i.label : i.title"
          :aria-label="collapsed ? i.label : undefined"
          :data-side="i.id"
        >
          <Icon v-if="i.icon" :name="i.icon" :size="16" />
          <span v-else class="dot" :style="{ '--c': i.dot }" aria-hidden="true"></span>
          <span class="label">{{ i.label }}</span>
          <span v-if="i.count !== undefined" class="n">{{ i.count }}</span>
        </RouterLink>
      </section>
    </div>

    <!-- The rail: a thin hit area on the edge that also toggles, as in shadcn's Sidebar. -->
    <button
      class="rail"
      type="button"
      tabindex="-1"
      :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      @click="toggleSidebar"
    ></button>
  </aside>
</template>

<style scoped>
.sidebar {
  position: relative;
  width: var(--sidebar-width);
  flex: none;
  transition: width 200ms cubic-bezier(0.32, 0.72, 0, 1), padding 200ms cubic-bezier(0.32, 0.72, 0, 1);
  padding: var(--space-5) var(--space-3);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}
.toggle { display: none; }
.group + .group { margin-top: var(--space-6); }
.group-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-2);
  padding-inline: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--fg-muted);
}
.sort {
  display: grid;
  padding: 2px;
  border: 0;
  background: none;
  color: var(--fg-2);
  cursor: pointer;
}
.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 5px var(--space-2) 5px var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--fg-muted);
  font-size: var(--text-nav);
  text-decoration: none;
}
.item:hover { color: var(--fg-2); background: var(--surface-hover); }
/* A taxonomy group: its colour where an icon would be. */
.dot { display: grid; place-items: center; width: 16px; height: 16px; flex: none; }
.dot::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.n { margin-left: auto; padding-left: var(--space-2); color: var(--fg-faint); font: 11px var(--font-mono); }
.collapsed .n { display: none; }
.item.active { color: var(--accent-text); background: var(--surface-active); }

/* Collapsed: an icon rail. Labels fade, group headings become hairlines. */
.label { white-space: nowrap; transition: opacity 150ms; }
.collapsed { width: var(--sidebar-rail); padding-inline: 8px; overflow-x: hidden; }
.collapsed .label { opacity: 0; }
.collapsed .group-label {
  height: 1px;
  margin: 0 6px var(--space-2);
  padding: 0;
  overflow: hidden;
  color: transparent;
  background: var(--border-soft);
}
.collapsed .group:first-child .group-label { display: none; }
.collapsed .item { justify-content: center; padding-inline: 0; gap: 0; }
.collapsed .item .label { width: 0; overflow: hidden; }

.rail {
  position: absolute;
  inset: 0 -4px 0 auto;
  width: 8px;
  padding: 0;
  border: 0;
  background: none;
  cursor: ew-resize;
  z-index: 1;
}
.rail::after {
  content: '';
  position: absolute;
  inset: 0 3px 0 auto;
  width: 2px;
  background: transparent;
  transition: background-color 150ms;
}
.rail:hover::after { background: var(--indigo-a7); }

@media (max-width: 767px) {
  .rail { display: none; }
  .sidebar {
    width: auto;
    padding: var(--space-3) var(--gutter);
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
  .toggle { display: inline-flex; width: 100%; }
  .toggle span { flex: 1; text-align: left; }
  .toggle-icon { color: var(--accent-text); }
  .groups { display: none; margin-top: var(--space-4); }
  .open .groups { display: block; }
}
</style>
