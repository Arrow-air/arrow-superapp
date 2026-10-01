<script setup lang="ts">
import { computed } from 'vue';
import Avatar from '../threads/Avatar.vue';
import { attachmentById, statusLabel } from '../../data/attachments';
import { personById } from '../../data/people';

// An attachment's spec line at the top of its zone: status, port, power,
// data, who champions it, and where the design lives.
const props = defineProps<{ id: string }>();
const a = computed(() => attachmentById(props.id));
</script>

<template>
  <div v-if="a" class="card">
    <div class="top">
      <span class="status" :data-status="a.status">{{ statusLabel[a.status] }}</span>
      <span v-if="a.champion" class="champ">
        <Avatar v-for="c in a.champion" :key="c" :id="c" :size="16" />
        {{ a.champion.map((c) => personById(c)?.name).join(' and ') }}
      </span>
    </div>
    <p class="what">{{ a.what }}</p>
    <dl v-if="a.port || a.power || a.data" class="spec">
      <template v-if="a.port"><dt>Port</dt><dd>{{ a.port }}</dd></template>
      <template v-if="a.power"><dt>Power</dt><dd>{{ a.power }}</dd></template>
      <template v-if="a.data"><dt>Data</dt><dd>{{ a.data }}</dd></template>
    </dl>
    <div class="links">
      <a v-for="l in a.links" :key="l.url" :href="l.url" target="_blank" rel="noopener">{{ l.label }}</a>
    </div>
  </div>
</template>

<style scoped>
.card { margin-top: 16px; padding: 14px 16px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2); }
.top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.status { height: 20px; padding: 0 8px; border-radius: 6px; background: var(--slate-a3); color: var(--fg-2); font-size: var(--text-sm); font-weight: 500; line-height: 20px; }
.status[data-status='flown'] { background: var(--jade-a3); color: var(--jade-11); }
.status[data-status='prototype'] { background: var(--indigo-a3); color: var(--indigo-11); }
.status[data-status='reference'] { background: var(--amber-a3); color: var(--amber-11); }
.champ { display: inline-flex; align-items: center; gap: 4px; font-size: var(--text-sm); color: var(--fg-muted); }
.champ .av + .av { margin-left: -4px; }
.what { margin: 10px 0 0; color: var(--fg); font-size: var(--text-nav); line-height: 1.5; }
.spec { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 10px 0 0; font-size: var(--text-base); }
.spec dt { color: var(--fg-muted); }
.spec dd { margin: 0; color: var(--fg-2); }
.links { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-size: var(--text-sm); }
.links a { color: var(--indigo-11); text-decoration: none; }
.links a:hover { text-decoration: underline; }
</style>
