<script setup lang="ts">
import Icon from './Icon.vue';
import Menu, { type MenuItem } from './Menu.vue';

// A raised control that opens a list. Used for the project and version pickers.
defineProps<{ options: MenuItem[]; current?: string; label: string }>();
defineEmits<{ select: [id: string] }>();
</script>

<template>
  <Menu :items="options" :current="current" @select="$emit('select', $event)">
    <template #trigger="{ open, toggle }">
      <button class="control" type="button" :aria-label="label" aria-haspopup="menu" :aria-expanded="open" @click="toggle">
        <slot />
        <Icon name="chevrons-v" :size="14" class="chev" />
      </button>
    </template>
  </Menu>
</template>

<style scoped>
.chev { color: var(--fg-muted); }
</style>
