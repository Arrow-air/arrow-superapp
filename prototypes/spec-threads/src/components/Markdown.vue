<script setup lang="ts">
import { computed } from 'vue';
import { renderMarkdown } from '../lib/markdown';

const props = defineProps<{ source: string }>();
// Sanitized by DOMPurify inside renderMarkdown; this is the only v-html in the app.
const html = computed(() => renderMarkdown(props.source));
</script>

<template>
  <div class="md" v-html="html" />
</template>
