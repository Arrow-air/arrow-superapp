<script setup lang="ts">
import { computed } from 'vue';
import { initialsOf } from './taxonomy';

// Initials on a colour picked from the name, as on the public card.
const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 28 });
const HUES = ['indigo', 'jade', 'plum', 'amber', 'sky', 'red'];
const hue = computed(() => HUES[[...props.name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]);
</script>

<template>
  <span class="av" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.36)}px`, background: `var(--${hue}-9)` }" aria-hidden="true">{{ initialsOf(name) }}</span>
</template>

<style scoped>
.av { display: inline-grid; place-items: center; flex: none; border-radius: 50%; color: #fff; font-weight: 600; line-height: 1; }
</style>
