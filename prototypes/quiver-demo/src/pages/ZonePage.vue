<script setup lang="ts">
import ZoneContext from '../modules/zone/ZoneContext.vue';
import ThreadsModule from '../modules/threads/ThreadsModule.vue';
import GateList from '../modules/zone/GateList.vue';

// A working zone: what already exists for it on top, its threads below.
// Road to selling is a zone too, with the blocker list as its context.
defineProps<{ zone: string; gate?: boolean }>();
</script>

<template>
  <div class="zone">
    <ZoneContext :zone="zone">
      <GateList v-if="gate" />
    </ZoneContext>
    <div class="zone-threads">
      <ThreadsModule :zone="zone" />
    </div>
  </div>
</template>

<style scoped>
.zone { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.zone-threads { flex: 1; min-height: 420px; }
</style>
