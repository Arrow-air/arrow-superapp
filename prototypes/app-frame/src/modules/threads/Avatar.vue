<script setup lang="ts">
import { computed } from 'vue';
import { person } from './store';
const props = withDefaults(defineProps<{ id: string; size?: number }>(), { size: 18 });
const p = computed(() => person(props.id));
</script>

<template>
  <span
    class="av"
    :data-hue="p?.hue"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.42)}px` }"
    :title="p?.name"
  >{{ p?.initials }}</span>
</template>

<style scoped>
.av {
  display: inline-grid;
  place-items: center;
  flex: none;
  border-radius: 50%;
  font-weight: 600;
  letter-spacing: -0.02em;
  box-shadow: 0 0 0 1.5px var(--slate-1);
}
.av[data-hue='indigo'] { background: var(--indigo-4); color: var(--indigo-11); }
.av[data-hue='jade'] { background: var(--jade-4); color: var(--jade-11); }
.av[data-hue='plum'] { background: var(--plum-4); color: var(--plum-11); }
.av[data-hue='amber'] { background: var(--amber-4); color: var(--amber-11); }
.av[data-hue='sky'] { background: var(--sky-4); color: var(--sky-11); }
.av[data-hue='red'] { background: var(--red-4); color: var(--red-11); }
</style>
