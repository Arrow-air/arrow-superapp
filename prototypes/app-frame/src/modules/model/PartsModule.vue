<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { state, statusOf } from '../threads/store';
import { tabs } from '../../frame/nav';
import { componentName, groupComponents, groupNames, provenance, selKey, subsystemGroups, touches, type Sel } from './model';
import meta from './meta.json'; // copy of public/models/spearhead/model.json

// Every group and component in the model, which subsystem it belongs to and
// how many open threads are about it. A row opens that part on its subsystem page.
const route = useRoute();
const router = useRouter();
const subsystemLabel = (id: string) => tabs.find((t) => t.id === 'design')?.groups.flatMap((g) => g.items).find((i) => i.id === id)?.label ?? id;

const open = (sel: Sel) => state.threads.filter((t) => t.part && statusOf(t) !== 'settled' && touches(t.part, sel)).length;

const sections = computed(() =>
  Object.entries(subsystemGroups)
    .filter(([, groups]) => groups.length)
    .map(([id, groups]) => ({
      id,
      label: subsystemLabel(id),
      groups: groups.map((g) => ({
        id: g,
        name: groupNames[g] ?? g,
        prov: provenance(g),
        solids: meta.groups.find((m) => m.id === g)?.solids ?? 0,
        open: open({ group: g }),
        components: (groupComponents[g] ?? []).filter((c) => componentName(c.id)).map((c) => ({ ...c, name: componentName(c.id), open: open({ group: g, component: c.id }) })),
      })),
    })),
);
const empty = Object.keys(subsystemGroups).filter((s) => !subsystemGroups[s].length).map(subsystemLabel);

function go(subsystem: string, sel: Sel) {
  router.push({ path: `/${route.params.project}/design/${subsystem}`, query: { part: selKey(sel) } });
}
</script>

<template>
  <div class="parts">
    <header class="intro">
      <h2>Parts</h2>
      <p>{{ meta.solids }} solids in the Spearhead model, revision {{ meta.revision }}, by subsystem. Open a row to see it on the model.</p>
    </header>

    <table>
      <thead>
        <tr><th>Part</th><th class="num">Solids</th><th class="num">Open threads</th></tr>
      </thead>
      <tbody v-for="s in sections" :key="s.id">
        <tr class="sub"><th colspan="3">{{ s.label }}</th></tr>
        <template v-for="g in s.groups" :key="g.id">
          <tr class="group" tabindex="0" @click="go(s.id, { group: g.id })" @keydown.enter="go(s.id, { group: g.id })">
            <td><i :class="g.prov"></i>{{ g.name }}<span v-if="g.prov !== 'modelled'" class="prov">{{ g.prov }}</span></td>
            <td class="num">{{ g.solids }}</td>
            <td class="num"><span v-if="g.open" class="open">{{ g.open }}</span></td>
          </tr>
          <tr v-for="c in g.components" :key="c.id" class="comp" tabindex="0" @click="go(s.id, { group: g.id, component: c.id })" @keydown.enter="go(s.id, { group: g.id, component: c.id })">
            <td>{{ c.name }}</td>
            <td class="num">{{ c.parts }}</td>
            <td class="num"><span v-if="c.open" class="open">{{ c.open }}</span></td>
          </tr>
        </template>
      </tbody>
    </table>
    <p class="foot">No geometry yet for {{ empty.join(', ') }}. The model covers the structure only.</p>
  </div>
</template>

<style scoped>
.parts { max-width: 760px; padding: 24px 28px 32px; }
.intro h2 { margin: 0 0 4px; font-size: var(--text-md); font-weight: 600; color: var(--fg); }
.intro p, .foot { margin: 0; font-size: var(--text-base); line-height: 1.5; color: var(--fg-muted); }
.foot { margin-top: 16px; color: var(--fg-faint); }

table { width: 100%; margin-top: 20px; border-collapse: collapse; font-size: var(--text-nav); }
thead th.num { font-family: inherit; }
thead th { padding: 0 10px 8px; text-align: left; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); border-bottom: 1px solid var(--border-soft); }
.num { text-align: right; width: 110px; font-family: var(--font-mono); font-size: var(--text-sm); }
.sub th { padding: 18px 10px 6px; text-align: left; font-size: var(--text-sm); font-weight: 500; color: var(--fg-muted); }
td { padding: 7px 10px; color: var(--fg-2); }
tr.group, tr.comp { cursor: pointer; }
tr.group:hover td, tr.comp:hover td { background: var(--slate-a2); }
tr.group:focus-visible td, tr.comp:focus-visible td { background: var(--slate-a3); outline: none; }
tr.group td:first-child { border-radius: 8px 0 0 8px; }
tr.group td:last-child { border-radius: 0 8px 8px 0; }
tr.comp td:first-child { padding-left: 32px; color: var(--fg-muted); }
tr.comp td { color: var(--fg-muted); }
i { display: inline-block; width: 7px; height: 7px; margin-right: 10px; border-radius: 50%; background: var(--slate-11); vertical-align: 1px; }
i.mirrored { background: var(--sky-11); }
i.recovered { background: var(--jade-11); }
.prov { margin-left: 8px; font-size: var(--text-sm); color: var(--fg-faint); }
.open { display: inline-block; min-width: 18px; padding: 1px 5px; border-radius: 5px; background: var(--amber-a3); color: var(--amber-11); text-align: center; }
</style>
