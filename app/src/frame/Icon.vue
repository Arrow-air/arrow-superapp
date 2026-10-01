<script setup lang="ts">
import { icons, type IconName } from './icons';
withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 18 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path :d="icons[name]" fill-rule="evenodd" />
  </svg>
</template>
