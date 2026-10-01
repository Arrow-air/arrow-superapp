<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

// A popover list anchored to its trigger. Items with `to` are router links,
// the rest emit `select`. Shared by the pickers and the breadcrumb.
export interface MenuItem { id: string; label: string; hint?: string; to?: string; note?: string; dot?: string }
defineProps<{ items: MenuItem[]; current?: string; align?: 'start' | 'end' }>();
const emit = defineEmits<{ select: [id: string] }>();

const open = ref(false);
const root = ref<HTMLElement>();
const onDoc = (e: MouseEvent) => {
  if (!root.value?.contains(e.target as Node)) open.value = false;
};
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (open.value = false);
document.addEventListener('click', onDoc);
document.addEventListener('keydown', onKey);
onBeforeUnmount(() => {
  document.removeEventListener('click', onDoc);
  document.removeEventListener('keydown', onKey);
});

function choose(id: string) {
  emit('select', id);
  open.value = false;
}
</script>

<template>
  <div ref="root" class="menu-root">
    <slot name="trigger" :open="open" :toggle="() => (open = !open)" />
    <ul v-if="open" class="menu" :class="align" role="menu">
      <li v-for="o in items" :key="o.id" role="none">
        <RouterLink
          v-if="o.to"
          :to="o.to"
          class="menu-item"
          role="menuitem"
          :aria-current="o.id === current ? 'page' : undefined"
          @click="open = false"
        >
          <span class="main">
            <span v-if="o.dot" class="dot" :style="{ '--dot': o.dot }" aria-hidden="true"></span>
            <span class="text">
              <span>{{ o.label }}</span>
              <span v-if="o.note" class="note">{{ o.note }}</span>
            </span>
          </span>
          <span v-if="o.hint" class="hint">{{ o.hint }}</span>
        </RouterLink>
        <button
          v-else
          type="button"
          class="menu-item"
          role="menuitemradio"
          :aria-checked="o.id === current"
          @click="choose(o.id)"
        >
          <span class="main">
            <span v-if="o.dot" class="dot" :style="{ '--dot': o.dot }" aria-hidden="true"></span>
            <span class="text">
              <span>{{ o.label }}</span>
              <span v-if="o.note" class="note">{{ o.note }}</span>
            </span>
          </span>
          <span v-if="o.hint" class="hint">{{ o.hint }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.menu-root { position: relative; display: inline-flex; }
.menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: 30;
  min-width: max(100%, 160px);
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.menu.end { left: auto; right: 0; }
.menu-item {
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: var(--space-4);
  padding: 6px var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--fg-2);
  font-size: var(--text-base);
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}
.menu-item:hover { background: var(--surface-hover); color: var(--fg); }
.menu-item[aria-current='page'],
.menu-item[aria-checked='true'] { color: var(--accent-text); }
.hint { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-faint); }
.main { display: inline-flex; align-items: center; gap: var(--space-2); }
.text { display: inline-flex; flex-direction: column; }
.note { font-size: var(--text-sm); color: var(--fg-muted); }
.menu-item:has(.note) { padding-block: 6px; align-items: center; }
.dot {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--dot);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dot) 22%, transparent);
}
</style>
