<script setup lang="ts">
// Shows what a spec's weighted score is made of: one segment per voter, sized by that
// voter's weight. Upvotes grow right from the centre line, downvotes grow left.
// Bars across a thread share one scale so they can be compared by eye. The centre line sits
// where the thread needs it: if nobody voted against anything, the against side takes no room.
import { computed } from 'vue';

export interface VoterSlice {
  handle: string;
  value: 1 | -1;
  weight: number;
  role: string;
  isMe: boolean;
}

const props = defineProps<{ voters: VoterSlice[]; scaleUp: number; scaleDown: number }>();

const ups = computed(() => props.voters.filter((v) => v.value === 1).sort((a, b) => b.weight - a.weight));
const downs = computed(() => props.voters.filter((v) => v.value === -1).sort((a, b) => b.weight - a.weight));
const pct = (w: number, side: number) => `${Math.min(100, (w / Math.max(side, 0.0001)) * 100)}%`;
const sum = (xs: VoterSlice[]) => Math.round(xs.reduce((n, v) => n + v.weight, 0) * 100) / 100;
const label = computed(
  () =>
    `Weighted votes. For: ${sum(ups.value)} from ${ups.value.map((v) => v.handle).join(', ') || 'nobody'}. ` +
    `Against: ${sum(downs.value)} from ${downs.value.map((v) => v.handle).join(', ') || 'nobody'}.`,
);
</script>

<template>
  <div class="votebar" role="img" :aria-label="label">
    <div v-if="scaleDown > 0" class="votebar-half votebar-down" :style="{ flexGrow: scaleDown }">
      <span
        v-for="v in downs" :key="v.handle" class="seg seg-down" :class="{ 'seg-me': v.isMe }"
        :style="{ width: pct(v.weight, scaleDown) }" :title="`@${v.handle} (${v.role}) voted against · counts ${v.weight}`"
      />
    </div>
    <div class="votebar-axis" />
    <div class="votebar-half votebar-up" :style="{ flexGrow: Math.max(scaleUp, 0.0001) }">
      <span
        v-for="v in ups" :key="v.handle" class="seg seg-up" :class="{ 'seg-me': v.isMe }"
        :style="{ width: pct(v.weight, scaleUp) }" :title="`@${v.handle} (${v.role}) voted for · counts ${v.weight}`"
      />
    </div>
  </div>
</template>
