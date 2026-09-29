<script setup lang="ts">
import { computed } from 'vue';
import StatusIcon from '../modules/threads/StatusIcon.vue';
import SourceChip from '../modules/threads/SourceChip.vue';
import { day, person, state } from '../modules/threads/store';
import { taskById } from '../data/quiver';
import { zoneLabel, zonePath } from '../frame/nav';

// The decision register T-09 is funded to write: every settled thread, with
// what was chosen, who decided, why, and whether it overrode the weighted
// leader. In the demo it fills as you decide threads as a lead.
const rows = computed(() =>
  state.threads
    .filter((t) => t.settled)
    .map((t) => ({ t, s: t.settled!, p: t.positions.find((p) => p.id === t.settled!.positionId) }))
    .sort((a, b) => a.s.decision.localeCompare(b.s.decision)),
);
const t09 = taskById('T-09');
const nameOf = (id?: string) => (id === 'me' ? 'You' : person(id)?.name);
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">Decision register</h1>
        <p class="view-lede">
          Every decided thread, numbered D-001 upward, with the choice, who made it, why, and whether it overrode the weighted leader. This is the register
          <a v-if="t09" :href="t09.url" target="_blank" rel="noopener">T-09</a> is funded to produce; the app can write it as decisions happen instead of reconstructing it later.
        </p>
      </div>
    </div>

    <p v-if="!rows.length" class="vempty">
      Nothing decided yet. In the demo, switch "view as" to Lead on a thread, vote, and decide it: it lands here with its number.
    </p>

    <table v-else class="vt">
      <thead><tr><th>No.</th><th>Decision</th><th class="hide-sm">Zone</th><th>Decided</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.t.id">
          <td class="mono muted">{{ r.s.decision }}</td>
          <td>
            <div class="choice">{{ r.p?.text }}</div>
            <div class="sub">
              <RouterLink :to="{ path: zonePath(r.t.zone), query: { thread: r.t.id } }" class="q">
                <StatusIcon status="settled" :override="r.s.override" :size="11" /> {{ r.t.id }} · {{ r.t.title }}
              </RouterLink>
            </div>
            <div class="why"><span class="faint">Why:</span> {{ r.s.note }}</div>
            <div class="sub">
              <span v-if="r.s.override" class="chip amber">Override of the weighted leader</span>
              <SourceChip v-if="r.p?.source" :source="r.p.source" />
            </div>
          </td>
          <td class="hide-sm muted">{{ zoneLabel(r.t.zone) }}</td>
          <td class="muted nowrap">{{ nameOf(r.s.byId) }} as lead<br />{{ day(r.s.at) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.choice { color: var(--fg); font-size: var(--text-nav); line-height: 1.5; }
.sub { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.q { display: inline-flex; align-items: center; gap: 5px; color: var(--fg-muted) !important; font-size: var(--text-sm); }
.why { margin-top: 4px; color: var(--fg-2); }
.nowrap { white-space: nowrap; }
</style>
