<script setup lang="ts">
import { computed, ref } from 'vue';
import StatusIcon from '../modules/threads/StatusIcon.vue';
import SourceChip from '../modules/threads/SourceChip.vue';
import { day, person, projectThreads, workFor } from '../modules/threads/store';
import { taskById } from '../data/quiver';
import { zoneLabel } from '../frame/nav';
import { useWorkspace } from '../frame/useWorkspace';
import { forLabel, matchesPack, packFilters, type PackFilter } from '../projects/longshot/variants';

// The decision register T-09 is funded to write: every settled thread, with
// what was chosen, who decided, why, and whether it overrode the weighted
// leader. In the demo it fills as you decide threads as a lead.
const { project } = useWorkspace();
// Longshot keeps one register and one numbering for every pack; each decision says which it is for.
const packs = computed(() => project.value?.id === 'longshot');
const pack = ref<PackFilter>('any');
const rows = computed(() =>
  projectThreads.value
    .filter((t) => t.settled)
    .filter((t) => !packs.value || matchesPack(t, pack.value))
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
          Every decided {{ project?.label }} thread, numbered D-001 upward, with the choice, who made it, why, and whether it overrode the weighted leader.
          <template v-if="project?.id === 'quiver'">This is the register <a v-if="t09" :href="t09.url" target="_blank" rel="noopener">T-09</a> is funded to produce; the app can write it as decisions happen instead of reconstructing it later.</template>
          <template v-else>Each project keeps its own register and numbering<template v-if="packs">: one for every Longshot pack, and each decision says which build or pack it is for</template>.</template>
        </p>
      </div>
    </div>
    <div v-if="packs" class="vseg" role="radiogroup" aria-label="Pack">
      <button v-for="f in packFilters" :key="f.id" type="button" role="radio" :aria-checked="pack === f.id" @click="pack = f.id">{{ f.label }}</button>
    </div>

    <p v-if="!rows.length && packs && pack !== 'any'" class="vempty">Nothing decided for this pack yet.</p>
    <p v-else-if="!rows.length" class="vempty">
      Nothing decided yet. In the demo, open the Demo menu in the footer, view as Lead, then decide a thread: it lands here with its number.
    </p>

    <table v-else class="vt">
      <thead><tr><th>No.</th><th>Decision</th><th class="hide-sm">Zone</th><th>Decided</th></tr></thead>
      <tbody>
        <tr v-for="r in rows" :key="r.t.id">
          <td class="mono muted">{{ r.s.decision }}</td>
          <td>
            <div class="choice">{{ r.p?.text }}</div>
            <div class="sub">
              <RouterLink :to="{ query: { thread: r.t.id } }" class="q">
                <StatusIcon status="settled" :override="r.s.override" :size="11" /> {{ r.t.id }} · {{ r.t.title }}
              </RouterLink>
            </div>
            <div class="why"><span class="faint">Why:</span> {{ r.s.note }}</div>
            <div class="sub">
              <span v-if="forLabel(r.t)" class="chip" data-for>For {{ forLabel(r.t) }}</span>
              <span v-if="r.s.override" class="chip amber">Override of the weighted leader</span>
              <SourceChip v-if="r.p?.source" :source="r.p.source" />
              <span v-if="workFor(r.t)" class="chip jade">{{ workFor(r.t)!.id }} · {{ workFor(r.t)!.kind }} · {{ workFor(r.t)!.stage.replace('_', ' ') }}</span>
              <span v-else class="chip">Not funded</span>
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
