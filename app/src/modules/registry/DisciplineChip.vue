<script setup lang="ts">
import { computed } from 'vue';
import { colourOf } from './taxonomy';

// One discipline, in its taxonomy group's colour. Can do is filled,
// learning is dashed, and the team's guess (for people who haven't said) is
// dotted and says so, so it never reads as theirs.
const props = withDefaults(defineProps<{ name: string; kind?: 'can' | 'learn' | 'guess'; checked?: boolean }>(), { kind: 'can', checked: false });
const style = computed(() => ({ '--c': colourOf(props.name) }));
const title = computed(() => (props.kind === 'learn' ? `${props.name}: learning` : props.kind === 'guess' ? `${props.name}: the team's guess` : props.checked ? `${props.name}: checked by the team` : props.name));
</script>

<template>
  <span class="dchip" :class="[kind, { checked }]" :style="style" :title="title">{{ name }}<span v-if="kind === 'guess'" class="sr">, the team's guess</span><span v-else-if="kind === 'learn'" class="sr">, learning</span></span>
</template>

<style scoped>
/* The taxonomy colours are light pastels; mixing them toward the text colour
   keeps them readable on the light theme as well as the dark. */
.dchip {
  display: inline-flex; align-items: center; gap: 4px; height: 21px; padding: 0 7px; border-radius: 6px;
  font-size: var(--text-sm); line-height: 1; white-space: nowrap;
  color: color-mix(in srgb, var(--c) 52%, var(--fg));
  background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
}
.dchip.learn { background: transparent; border-style: dashed; border-color: color-mix(in srgb, var(--c) 60%, transparent); }
.dchip.guess { background: transparent; border-style: dotted; border-color: color-mix(in srgb, var(--c) 70%, transparent); }
.dchip.checked::after { content: '✓'; font-size: 10px; margin-left: 1px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
