<script setup lang="ts">
import Menu, { type MenuItem } from './Menu.vue';

// Breadcrumb after shadcn/ui (base). The last crumb is the current page.
// A crumb with `menu` opens its siblings; on phones the middle crumbs
// collapse into an ellipsis menu.
export interface Crumb { id: string; label: string; to?: string; menu?: MenuItem[] }
const props = defineProps<{ crumbs: Crumb[] }>();

const middle = () => props.crumbs.slice(1, -1);
</script>

<template>
  <nav class="breadcrumb" aria-label="Breadcrumb">
    <ol>
      <template v-for="(c, i) in crumbs" :key="c.id">
        <!-- Ellipsis stands in for the middle crumbs on narrow screens. -->
        <template v-if="i === 1 && middle().length">
          <li class="item collapsed-only">
            <Menu :items="middle().map((m) => ({ id: m.id, label: m.label, to: m.to }))">
              <template #trigger="{ open, toggle }">
                <button class="ellipsis" type="button" aria-haspopup="menu" :aria-expanded="open" aria-label="Show path" @click="toggle">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                </button>
              </template>
            </Menu>
          </li>
          <li class="sep collapsed-only" role="presentation" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
          </li>
        </template>

        <li class="item" :class="{ middle: i > 0 && i < crumbs.length - 1 }">
          <span v-if="i === crumbs.length - 1" class="page" role="link" aria-disabled="true" aria-current="page">{{ c.label }}</span>
          <Menu v-else-if="c.menu" :items="c.menu" :current="c.id">
            <template #trigger="{ open, toggle }">
              <button class="link trigger" type="button" aria-haspopup="menu" :aria-expanded="open" @click="toggle">
                {{ c.label }}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
              </button>
            </template>
          </Menu>
          <RouterLink v-else-if="c.to" :to="c.to" class="link">{{ c.label }}</RouterLink>
          <span v-else>{{ c.label }}</span>
        </li>
        <li
          v-if="i < crumbs.length - 1"
          class="sep"
          :class="{ middle: i > 0 }"
          role="presentation"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg>
        </li>
      </template>
    </ol>
  </nav>
</template>

<style scoped>
ol {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-base);
  color: var(--fg-muted);
  overflow-wrap: break-word;
}
.item { display: inline-flex; align-items: center; gap: var(--space-1); }
.link {
  color: inherit;
  text-decoration: none;
  transition: color 150ms;
}
.link:hover, .trigger[aria-expanded='true'] { color: var(--fg); }
.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.page { color: var(--fg); font-weight: 400; }

svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.sep { display: inline-flex; }

.ellipsis {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin-block: -4px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: none;
  color: inherit;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.ellipsis svg { width: 16px; height: 16px; }
.ellipsis:hover, .ellipsis[aria-expanded='true'] { background: var(--surface-hover); color: var(--fg); }

.collapsed-only { display: none; }
@media (max-width: 767px) {
  .middle { display: none; }
  .collapsed-only { display: inline-flex; }
}
</style>
