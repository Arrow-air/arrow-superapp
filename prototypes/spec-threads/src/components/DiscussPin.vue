<script setup lang="ts">
import { ANCHORS, type AnchorKey } from '../discuss/anchors';
import { openAnchor, openDiscussion } from '../discuss/drawer';

const props = defineProps<{ anchor: AnchorKey; label?: string; compact?: boolean }>();
</script>

<template>
  <button
    type="button" class="pin" :class="{ 'pin-open': openAnchor === props.anchor, 'pin-compact': compact }"
    :title="(compact ? 'Discuss: ' : '') + ANCHORS[props.anchor].hook" :aria-label="`Discuss: ${ANCHORS[props.anchor].title}`"
    @click.stop.prevent="openDiscussion(props.anchor)"
  >
    <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M2 2h12v9H7l-3 3v-3H2z" /></svg>
    <span v-if="!compact">{{ label ?? 'Discuss' }}</span>
  </button>
</template>
