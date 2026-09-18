<script setup lang="ts">
// The experiment's headline for one thread: who wins under one person one vote,
// who wins under weighting, side by side. Replaces a banner that only said "they disagree".
import { signed } from '../lib/format';
import DiscussPin from './DiscussPin.vue';

export interface Pick {
  specId: string;
  title: string;
  author: string;
  score: number;
}

defineProps<{ rawPicks: Pick[]; weightedPicks: Pick[]; disagree: boolean }>();
defineEmits<{ jump: [specId: string] }>();
</script>

<template>
  <div class="picks" :class="disagree ? 'picks-disagree' : 'picks-agree'">
    <div class="picks-head">
      <DiscussPin anchor="crowd-vs-weighted" class="pin-right" />
      <strong>{{ disagree ? 'The crowd and the weighting disagree' : 'The crowd and the weighting agree' }}</strong>
      <span v-if="disagree" class="small muted"> This is the case the experiment is about.</span>
    </div>
    <div class="picks-grid">
      <div class="pick">
        <div class="label">One person, one vote</div>
        <button v-for="p in rawPicks" :key="p.specId" class="pick-link" @click="$emit('jump', p.specId)">
          <span class="pick-title">{{ p.title }}</span>
          <span class="pick-meta">@{{ p.author }} · raw {{ signed(p.score) }}</span>
        </button>
      </div>
      <div class="pick-vs" aria-hidden="true">{{ disagree ? '≠' : '=' }}</div>
      <div class="pick">
        <div class="label">Weighted</div>
        <button v-for="p in weightedPicks" :key="p.specId" class="pick-link" @click="$emit('jump', p.specId)">
          <span class="pick-title">{{ p.title }}</span>
          <span class="pick-meta">@{{ p.author }} · weighted {{ signed(p.score) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
