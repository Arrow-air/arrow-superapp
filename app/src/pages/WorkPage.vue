<script setup lang="ts">
import { computed, ref } from 'vue';
import Avatar from '../modules/threads/Avatar.vue';
import { tasks, fundingNames, generatedAt, shortDate, REPO } from '../data/quiver';
import { personByGithub, personById } from '../data/people';
import { zones } from '../data/zones';
import { zoneLabel, zonePath } from '../frame/nav';

// The Quiver task board as the repository has it (T-01 upward): price,
// funding line, owner, deadline. Read-only; claiming happens on GitHub.
type Filter = 'all' | 'claimable' | 'assigned';
const filter = ref<Filter>('all');
const ownerOf = (owner: string | null) => {
  if (!owner || /^open/i.test(owner)) return undefined;
  const first = owner.replace(/^@/, '').split(/[\s,(.]/)[0];
  return personById(first.toLowerCase()) ?? personByGithub(first);
};
const zoneOf = (id: string) => zones.find((z) => z.tasks?.includes(id))?.id;
const rows = computed(() =>
  tasks.filter((t) => t.state !== 'CLOSED' && t.state !== 'closed').filter((t) =>
    filter.value === 'claimable' ? t.claimable : filter.value === 'assigned' ? !!ownerOf(t.owner) : true,
  ),
);
const price = (t: (typeof tasks)[number]) => (t.priceUsd ? `$${t.priceUsd.toLocaleString('en-US')}` : '—');
// The first clause is the date; the rest of the cell is explanation that lives on GitHub.
const deadline = (d: string | null) => (d ? d.split(/\. | \(/)[0].replace(/\.$/, '') : '—');
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">Task board</h1>
        <p class="view-lede">The funded Quiver tasks, read from <a :href="`${REPO}/issues?q=label%3Atask-board`" target="_blank" rel="noopener">the task-board issues</a> on {{ shortDate(generatedAt) }}. Claiming, milestones and payment stay on GitHub; each task links to the zone where it is discussed.</p>
      </div>
      <div class="vseg" role="radiogroup" aria-label="Filter">
        <button v-for="f in (['all', 'claimable', 'assigned'] as Filter[])" :key="f" type="button" role="radio" :aria-checked="filter === f" @click="filter = f">
          {{ f === 'all' ? 'All open' : f === 'claimable' ? 'Claimable' : 'Assigned' }}
        </button>
      </div>
    </div>

    <table class="vt">
      <thead>
        <tr><th>Task</th><th></th><th>Owner</th><th class="num">Price</th><th class="hide-sm">Funding line</th><th class="hide-sm">Deadline</th></tr>
      </thead>
      <tbody>
        <tr v-for="t in rows" :key="t.id">
          <td class="mono muted nowrap">{{ t.id }}</td>
          <td>
            <a :href="t.url" target="_blank" rel="noopener">{{ t.title }}</a>
            <div class="sub">
              <span v-if="t.claimable" class="chip jade">Claimable</span>
              <RouterLink v-if="zoneOf(t.id)" :to="zonePath(zoneOf(t.id)!)" class="chip">{{ zoneLabel(zoneOf(t.id)!) }}</RouterLink>
            </div>
          </td>
          <td>
            <span v-if="ownerOf(t.owner)" class="who"><Avatar :id="ownerOf(t.owner)!.id" :size="16" /> {{ ownerOf(t.owner)!.name }}</span>
            <span v-else class="muted">{{ t.owner && /^open/i.test(t.owner) ? 'Open' : '—' }}</span>
          </td>
          <td class="num">{{ price(t) }}</td>
          <td class="hide-sm muted">{{ t.fundingLabel ? fundingNames[t.fundingLabel] ?? t.fundingLabel : '—' }}</td>
          <td class="hide-sm muted small">{{ deadline(t.deadline) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sub { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.sub:empty { display: none; }
.who { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.small { font-size: var(--text-sm); max-width: 200px; }
.nowrap { white-space: nowrap; }
</style>
