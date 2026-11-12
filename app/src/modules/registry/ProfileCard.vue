<script setup lang="ts">
import { computed } from 'vue';
import Icon from '../../frame/Icon.vue';
import DisciplineChip from './DisciplineChip.vue';
import { initialsOf, localTime } from './taxonomy';
import type { Card } from '../../lib/registry';

// A person's public card: what the contributor map shows, at the precision
// they chose (the card's city is null at country precision). The wizard
// previews it live; Your Arrow and the registry show it as saved.
const props = defineProps<{ card: Pick<Card, 'name' | 'city' | 'country' | 'tz' | 'disciplines' | 'blurb' | 'discord' | 'github' | 'joined'> }>();

const HUES = ['indigo', 'jade', 'plum', 'amber', 'sky', 'red'];
const hue = computed(() => HUES[[...props.card.name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]);
const place = computed(() => [props.card.city, props.card.country].filter(Boolean).join(', '));
const time = computed(() => localTime(props.card.tz));
const since = computed(() => {
  const [y, m] = props.card.joined.split('-').map(Number);
  if (!y || !m) return '';
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
});
</script>

<template>
  <div class="pcard">
    <div class="top">
      <span class="av" :style="{ background: `var(--${hue}-9)` }" aria-hidden="true">{{ initialsOf(card.name) }}</span>
      <div class="who">
        <div class="nm">{{ card.name }}</div>
        <div v-if="place || time" class="where">{{ place }}<template v-if="place && time"> · </template><template v-if="time">{{ time }} local</template></div>
      </div>
    </div>
    <div v-if="card.disciplines.length" class="chips">
      <DisciplineChip v-for="d in card.disciplines" :key="d" :name="d" />
    </div>
    <p v-if="card.blurb" class="blurb">{{ card.blurb }}</p>
    <div class="foot">
      <span v-if="card.discord" class="h"><Icon name="discord" :size="12" />{{ card.discord }}</span>
      <span v-if="card.github" class="h"><Icon name="github" :size="12" />{{ card.github }}</span>
      <span v-if="since">since {{ since }}</span>
    </div>
  </div>
</template>

<style scoped>
.pcard { padding: 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface-raised, var(--slate-2)); }
.top { display: flex; align-items: center; gap: 10px; }
.av { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 600; }
.who { min-width: 0; }
.nm { color: var(--fg); font-weight: 600; font-size: 14px; overflow-wrap: anywhere; }
.where { color: var(--fg-faint); font-size: var(--text-sm); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }
.blurb { margin: 10px 0 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; overflow-wrap: anywhere; }
.foot { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 10px; color: var(--fg-faint); font-size: var(--text-sm); }
.h { display: inline-flex; align-items: center; gap: 4px; }
</style>
