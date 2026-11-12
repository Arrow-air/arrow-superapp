<script setup lang="ts">
import { TAXONOMY } from '../../lib/registry';

// Taxonomy v1.0 as tappable chips, in its 9 groups and Gavin's colours.
// cycle: tap once for can do, twice for want to learn, a third time to clear
// (the join wizard). Without cycle a tap only picks or clears (the team's
// guess at someone's skills).
const props = withDefaults(defineProps<{ can: string[]; learn?: string[]; cycle?: boolean; label?: string }>(), { learn: () => [], cycle: true, label: 'Disciplines' });
const emit = defineEmits<{ 'update:can': [string[]]; 'update:learn': [string[]] }>();

const state = (t: string) => (props.can.includes(t) ? 'can' : props.learn.includes(t) ? 'learn' : '');
function tap(t: string) {
  const s = state(t);
  if (s === 'can') {
    emit('update:can', props.can.filter((x) => x !== t));
    if (props.cycle) emit('update:learn', [...props.learn, t]);
  } else if (s === 'learn') {
    emit('update:learn', props.learn.filter((x) => x !== t));
  } else {
    emit('update:can', [...props.can, t]);
  }
}
const said = (t: string) => {
  const s = state(t);
  return s === 'can' ? (props.cycle ? 'can do' : 'picked') : s === 'learn' ? 'learning' : props.cycle ? 'not picked; tap for can do' : 'not picked';
};
</script>

<template>
  <div class="taxpick" role="group" :aria-label="label">
    <div v-for="[group, what, colour, tags] in TAXONOMY" :key="group" class="taxcat">
      <h6>{{ group }} <span>{{ what }}</span></h6>
      <div class="taxchips">
        <button
          v-for="t in tags"
          :key="t"
          type="button"
          class="tchip"
          :class="[state(t), { guess: !cycle }]"
          :style="{ '--c': colour }"
          :aria-label="`${t}: ${said(t)}`"
          :data-tax="t"
          @click="tap(t)"
        >{{ t }}<small v-if="state(t) && cycle">{{ state(t) === 'can' ? 'can do' : 'learning' }}</small></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.taxcat { margin-bottom: 12px; }
h6 { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline; margin: 0 0 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-muted); }
h6 span { color: var(--fg-faint); font-weight: 400; }
.taxchips { display: flex; flex-wrap: wrap; gap: 6px; }
.tchip {
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border-radius: 8px;
  border: 1px solid var(--border); background: transparent; color: var(--fg-2); font: inherit; font-size: var(--text-base); cursor: pointer;
}
.tchip:hover { border-color: var(--slate-a7); }
.tchip:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.tchip.can { color: color-mix(in srgb, var(--c) 52%, var(--fg)); background: color-mix(in srgb, var(--c) 16%, transparent); border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.tchip.learn { color: color-mix(in srgb, var(--c) 52%, var(--fg)); border-style: dashed; border-color: color-mix(in srgb, var(--c) 70%, transparent); }
.tchip.guess.can { background: transparent; border-style: dotted; }
.tchip small { font: 9.5px var(--font-mono); letter-spacing: 0.04em; opacity: 0.85; text-transform: uppercase; }
</style>
