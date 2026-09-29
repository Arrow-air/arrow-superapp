<script setup lang="ts">
import { ref, watch } from 'vue';
import Icon from './Icon.vue';
import { useWorkspace } from './useWorkspace';
import { sidebarCollapsed as collapsed, toggleSidebar } from './layout';

const { tab, item, base, route } = useWorkspace();

// On phones the sidebar collapses behind a toggle showing the current page.
const open = ref(false);
watch(() => route.fullPath, () => (open.value = false));
</script>

<template>
  <aside class="sidebar" :class="{ open, collapsed }" aria-label="Section">
    <button class="toggle control" type="button" :aria-expanded="open" @click="open = !open">
      <Icon v-if="item" :name="item.icon" :size="16" class="toggle-icon" />
      <span>{{ item?.label ?? tab?.label }}</span>
      <Icon name="chevrons-v" :size="14" class="muted" />
    </button>

    <div class="groups">
      <section v-for="g in tab?.groups" :key="g.id" class="group">
        <h2 class="group-label caps">
          {{ g.label }}
          <button v-if="g.sortable" class="sort" type="button" aria-label="Sort"><Icon name="sort" :size="12" /></button>
        </h2>
        <RouterLink
          v-for="i in g.items"
          :key="i.id"
          :to="`${base}/${tab!.id}/${i.id}`"
          class="item"
          :class="{ active: i.id === item?.id }"
          :title="collapsed ? i.label : undefined"
          :aria-label="collapsed ? i.label : undefined"
        >
          <Icon :name="i.icon" :size="16" />
          <span class="label">{{ i.label }}</span>
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
