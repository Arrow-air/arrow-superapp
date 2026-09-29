<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import Icon from './Icon.vue';

// A raised control that opens a list. Used for the project and version pickers.
defineProps<{ options: { id: string; label: string; hint?: string }[]; current?: string; label: string }>();
const emit = defineEmits<{ select: [id: string] }>();

const open = ref(false);
const root = ref<HTMLElement>();
const onDoc = (e: MouseEvent) => {
  if (!root.value?.contains(e.target as Node)) open.value = false;
};
document.addEventListener('click', onDoc);
onBeforeUnmount(() => document.removeEventListener('click', onDoc));

function choose(id: string) {
  emit('select', id);
  open.value = false;
}
</script>

<template>
  <div ref="root" class="picker">
    <button class="control" type="button" :aria-label="label" :aria-expanded="open" @click="open = !open">
      <slot />
      <Icon name="chevrons-v" :size="14" class="chev" />
    </button>
    <ul v-if="open" class="menu" role="listbox">
      <li v-for="o in options" :key="o.id">
        <button type="button" role="option" :aria-selected="o.id === current" @click="choose(o.id)">
          <span>{{ o.label }}</span>
          <span v-if="o.hint" class="hint">{{ o.hint }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.picker { position: relative; }
.chev { color: var(--fg-muted); }
.menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: 30;
  min-width: 100%;
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: 0 12px 32px rgb(0 0 0 / 0.5);
}
.menu button {
  display: flex;
  width: 100%;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.menu button:hover { background: var(--surface-header); }
.menu button[aria-selected='true'] { color: var(--accent-text); }
.hint { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-faint); }
</style>
