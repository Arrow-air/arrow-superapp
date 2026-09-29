<script setup lang="ts">
import { ref, watch } from 'vue';
import Icon from './Icon.vue';
import { useWorkspace } from './useWorkspace';

const { tab, item, base, route } = useWorkspace();

// On phones the sidebar collapses behind a toggle showing the current page.
const open = ref(false);
watch(() => route.fullPath, () => (open.value = false));
</script>

<template>
  <aside class="sidebar" :class="{ open }" aria-label="Section">
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
        >
          <Icon :name="i.icon" :size="18" />
          <span>{{ i.label }}</span>
        </RouterLink>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  flex: none;
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
  padding: 6px var(--space-2) 6px var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--fg-muted);
  font-size: var(--text-md);
  text-decoration: none;
}
.item:hover { color: var(--fg-2); }
.item.active { color: var(--accent-text); }

@media (max-width: 767px) {
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
