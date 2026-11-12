<script setup lang="ts">
// #/community/people: the registry, as the onboarding mockups' screen 4.
// Signed out, the public cards (people who chose the map). Members, everyone
// with an account and their profiles. Core and leads, everyone, people the
// team added before they joined, and the team's columns (status, owner,
// notes); leads also settle "same person?" cards above the list.
// The view, the taxonomy group, the search and the chips live in the query,
// so a saved view is a link; the sidebar's links carry only the view, so
// picking one starts clean.
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../../frame/Icon.vue';
import DisciplineChip from '../../modules/registry/DisciplineChip.vue';
import PersonAvatar from '../../modules/registry/PersonAvatar.vue';
import ProfileCard from '../../modules/registry/ProfileCard.vue';
import StatusPill from '../../modules/registry/StatusPill.vue';
import SameStrip from '../../modules/registry/SameStrip.vue';
import {
  community, filterCards, filterPeople, filtersOf, findView, fromYou, intro, loadCommunity, onTeam, openToCall,
  shortPlace, skillsOf, teamAdded, teamName, toolsOf, viewer, whose, cap,
} from '../../modules/registry/community';
import { localTime } from '../../modules/registry/taxonomy';
import { TOOLS, type Person, type Tool } from '../../lib/registry';
import { remote } from '../../lib/backend';
import { session } from '../../lib/session';
import '../../modules/registry/registry.css';
import '../../modules/registry/community.css';

const route = useRoute();
const router = useRouter();
const f = computed(() => filtersOf(route));
const v = viewer;
const view = computed(() => findView(f.value.view, v.value));
const title = computed(() => (f.value.cat ? `Can do: ${f.value.cat}` : view.value.label));

onMounted(() => {
  document.title = 'People · Community · Arrow';
  void loadCommunity();
});
watch(() => session.ready, (r) => { if (r) void loadCommunity(); });

const rows = computed(() => filterPeople(community.people, f.value, v.value));
const cards = computed(() => filterCards(community.cards, f.value));
const count = computed(() => (v.value === 'public' ? cards.value.length : rows.value.length));
const filtered = computed(() => !!(f.value.q || f.value.shop || f.value.call || f.value.cat || view.value.id !== 'all'));

// Search and chips change the query in place (no history entry per letter).
const q = ref(f.value.q);
watch(() => f.value.q, (x) => { if (x !== q.value) q.value = x; });
let timer = 0;
watch(q, (x) => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { if (x !== f.value.q) void router.replace({ query: { ...route.query, q: x || undefined } }); }, 200);
});
const toggle = (k: 'shop' | 'call') => router.replace({ query: { ...route.query, [k]: f.value[k] ? undefined : '1' } });
const clear = () => { q.value = ''; void router.replace({ query: view.value.id === 'all' ? {} : { view: view.value.id } }); };

// A row opens the person; the view comes along so the page can link back to it.
const personTo = (id: string) => ({ path: `/community/people/${id}`, query: view.value.id !== 'all' ? { from: view.value.id } : {} });
const open = (id: string) => router.push(personTo(id));

const SHORT: Record<Tool, string> = {
  fdm: 'FDM', resin: 'Resin', cnc: 'CNC', mill: 'Mill', lathe: 'Lathe', laser: 'Laser', solder: 'Solder', spot: 'Spot welder',
  scope: 'Scope', composite: 'Layup', weld: 'Welder', field: 'Field', aircraft: 'Own drone',
};
const handleLine = (p: Person) => [p.discord ? `@${p.discord}` : p.github ? p.github : '', p.source].filter(Boolean).join(' · ');
const clock = (tz: string | null) => [localTime(tz), fromYou(tz)].filter(Boolean).join(' · ');

</script>

<template>
  <div class="cm people">
    <nav class="crumb" aria-label="Breadcrumb"><span>Community</span><Icon name="chevron-right" :size="12" /><b data-viewname>{{ title }}</b></nav>

    <div class="head">
      <div>
        <h1>People</h1>
        <p v-if="v === 'public'" class="lede">People who chose to be on Arrow's contributor map, at the precision they chose. Sign in to see members' full profiles: what they want to build, their stories, links and tools.</p>
        <p v-else-if="v === 'member'" class="lede">Everyone in Arrow's registry with an account: what they want to build, what they can do, and the tools they have.</p>
        <p v-else class="lede">Everyone who filled in the registry, and people the team added before they signed up. Members see profiles; notes, call status, owners and team-added people are for the core team.</p>
      </div>
      <div v-if="v === 'public'" class="rg actions">
        <RouterLink class="btn primary" :to="{ path: '/join', query: { ref: 'community' } }">Join Arrow</RouterLink>
        <button v-if="remote" class="btn" type="button" @click="session.signInOpen = true">Sign in</button>
      </div>
    </div>

    <!-- Leads: someone who signed up may be a person the team added. -->
    <SameStrip v-if="v === 'lead'" :matches="community.matches" @settled="loadCommunity(true)" />

    <div class="filters">
      <label class="search">
        <Icon name="search" :size="14" />
        <input v-model="q" type="search" placeholder="Names, skills, places, tools" aria-label="Search people" data-search />
      </label>
      <template v-if="v !== 'public'">
        <button class="fchip" type="button" :aria-pressed="f.shop" data-chip="shop" title="Three or more tools" @click="toggle('shop')"><Icon name="wrench" :size="13" />Has a shop</button>
        <button v-if="onTeam" class="fchip" type="button" :aria-pressed="f.call" data-chip="call" @click="toggle('call')"><Icon name="video" :size="13" />Open to a call</button>
      </template>
      <span class="n" data-count>{{ count }} {{ count === 1 ? 'person' : 'people' }}</span>
      <button v-if="filtered" class="clear" type="button" @click="clear">Clear</button>
    </div>

    <p v-if="community.phase === 'loading' || community.phase === 'idle'" class="state" role="status">Loading people…</p>
    <div v-else-if="community.phase === 'error'" class="state rg">
      <p class="err">Couldn't load the registry: {{ community.error }}</p>
      <button class="btn" type="button" @click="loadCommunity(true)">Try again</button>
    </div>

    <!-- Signed out: the public cards. -->
    <template v-else-if="v === 'public'">
      <div v-if="cards.length" class="cards">
        <RouterLink v-for="c in cards" :key="c.id" class="cardlink" :to="`/community/people/${c.id}`" data-card><ProfileCard :card="c" /></RouterLink>
      </div>
      <p v-else class="state">{{ community.cards.length ? 'Nobody matches.' : 'Nobody is on the map yet.' }}</p>
    </template>

    <template v-else>
      <table v-if="rows.length" class="list" :class="{ team: onTeam }">
        <thead>
          <tr>
            <th>Person</th><th>Place</th><th>Can do · <span class="dash">learning</span></th><th>Tools</th><th>Time</th>
            <template v-if="onTeam"><th>Status</th><th><span class="teamtag"><Icon name="lock" :size="11" />Notes</span></th></template>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id" :data-person="p.id" @click="open(p.id)">
            <td class="who">
              <div class="pcell">
                <PersonAvatar :name="p.name" :size="28" />
                <div class="grow">
                  <RouterLink class="nm" :to="personTo(p.id)" @click.stop>{{ p.name }}</RouterLink>
                  <div v-if="p.profile?.wants_to_build" class="wtb">“{{ p.profile.wants_to_build }}”</div>
                  <div v-if="teamAdded(p)" class="hd"><span class="acct">no account</span> added by {{ teamName(p.added_by) || 'the team' }}<template v-if="p.source"> · {{ p.source }}</template></div>
                  <div v-else-if="handleLine(p)" class="hd">{{ handleLine(p) }}</div>
                </div>
              </div>
            </td>
            <td class="place" data-label="Place">
              <template v-if="shortPlace(p.city, p.country)">{{ shortPlace(p.city, p.country) }}</template><span v-else class="faint">place unknown</span>
              <div v-if="p.tz" class="faint small">{{ clock(p.tz) }}</div>
            </td>
            <td data-label="Can do">
              <div class="chips">
                <template v-if="skillsOf(p).guess"><DisciplineChip v-for="d in skillsOf(p).names" :key="d" :name="d" kind="guess" /></template>
                <template v-else>
                  <DisciplineChip v-for="d in skillsOf(p).names" :key="d" :name="d" />
                  <DisciplineChip v-for="d in p.profile?.learn ?? []" :key="`l-${d}`" :name="d" kind="learn" />
                </template>
              </div>
              <div v-if="skillsOf(p).guess" class="faint small guessby">{{ cap(whose(p.added_by)) }} guess</div>
              <span v-if="!skillsOf(p).names.length && !(p.profile?.learn ?? []).length" class="faint">{{ teamAdded(p) ? 'not known' : '—' }}</span>
            </td>
            <td class="tools" data-label="Tools">
              <span v-if="toolsOf(p).tools.length" :title="toolsOf(p).tools.map((t) => TOOLS[t]).join(', ')" :class="{ guess: toolsOf(p).guess }">{{ toolsOf(p).tools.map((t) => SHORT[t]).join(' · ') }}</span>
              <span v-else class="faint">{{ teamAdded(p) ? 'not known' : 'none' }}</span>
            </td>
            <td class="time" data-label="Time">
              <template v-if="p.profile?.hours">{{ p.profile.hours }}</template><span v-else class="faint">—</span>
              <div v-if="p.profile?.availability" class="faint">{{ p.profile.availability }}</div>
            </td>
            <template v-if="onTeam">
              <td data-label="Status">
                <StatusPill v-if="intro(p)" :status="intro(p)!.status" />
                <div v-if="openToCall(p)" class="faint small sub"><Icon name="video" :size="11" /> open to a call</div>
                <div v-if="intro(p)?.owner_id" class="faint small sub" data-owner>owner: {{ teamName(intro(p)!.owner_id) }}</div>
              </td>
              <td data-label="Notes">
                <span v-if="p.note_count" class="note-count" data-notes><Icon name="note" :size="12" />{{ p.note_count }}</span>
                <span v-else class="faint">·</span>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
      <div v-else class="state">
        <p>{{ community.people.length ? 'Nobody matches.' : 'Nobody has filled in the registry yet.' }}</p>
        <button v-if="filtered" class="link clearlink" type="button" @click="clear">Clear the search and chips</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.actions { display: flex; gap: 8px; flex: none; }
.err { margin: 10px 0 0; color: var(--red-11); font-size: var(--text-base); }
.filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 16px 0 10px; }
.search { display: flex; align-items: center; gap: 7px; width: 280px; max-width: 100%; height: 30px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--slate-a2); color: var(--fg-muted); }
.search:focus-within { border-color: var(--indigo-8); box-shadow: 0 0 0 2px var(--indigo-a4); }
.search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--fg); font: inherit; font-size: var(--text-base); }
.fchip { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border: 1px dashed var(--border); border-radius: 8px; background: transparent; color: var(--fg-muted); font: inherit; font-size: var(--text-base); cursor: pointer; }
.fchip:hover { color: var(--fg-2); }
.fchip[aria-pressed='true'] { border-style: solid; border-color: var(--indigo-8); background: var(--indigo-a3); color: var(--indigo-12); }
.fchip:focus-visible, .clear:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.filters .n { margin-left: auto; color: var(--fg-faint); font: 11px var(--font-mono); }
.clear, .clearlink { padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; font-size: var(--text-sm); cursor: pointer; }

.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
.cardlink { color: inherit; text-decoration: none; border-radius: 12px; }
.cardlink:hover :deep(.pcard) { border-color: var(--slate-a7); }
.cardlink:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }

.list { width: 100%; border-collapse: collapse; }
.list th { padding: 7px 10px; border-bottom: 1px solid var(--slate-a4); color: var(--fg-faint); font-size: var(--text-sm); font-weight: 500; text-align: left; white-space: nowrap; }
.list th .dash { border-bottom: 1px dashed var(--fg-faint); }
.list td { padding: 10px; border-bottom: 1px solid var(--slate-a3); vertical-align: top; line-height: 1.45; }
.list tbody tr { cursor: pointer; }
.list tbody tr:hover td { background: var(--slate-a2); }
.pcell { display: flex; align-items: flex-start; gap: 9px; }
.pcell .nm { color: var(--fg); font-weight: 500; text-decoration: none; }
.pcell .nm:hover { text-decoration: underline; }
.pcell .wtb { max-width: 300px; margin: 1px 0 2px; color: var(--fg-2); }
.pcell .hd { color: var(--fg-faint); font-size: var(--text-sm); }
.place { white-space: nowrap; }
.tools { max-width: 150px; color: var(--fg-2); }
.tools .guess { border-bottom: 1px dotted var(--fg-faint); }
.time { white-space: nowrap; }
.guessby { margin-top: 3px; }
.sub { display: flex; align-items: center; gap: 4px; margin-top: 3px; white-space: nowrap; }
.note-count { display: inline-flex; align-items: center; gap: 4px; color: var(--team); font: 11px var(--font-mono); }
.list.team th:last-child, .list.team td:last-child { text-align: right; }

/* Narrower: drop the time column, then become one card per person. */
@media (max-width: 1279px) {
  .list.team th:nth-child(5), .list.team td:nth-child(5) { display: none; }
}
@media (max-width: 1023px) {
  .head { flex-direction: column; }
  .list thead { display: none; }
  .list, .list tbody { display: block; }
  .list tbody tr { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px 12px; padding: 12px 4px; border-bottom: 1px solid var(--slate-a3); }
  .list td, .list.team td:nth-child(5) { display: block; padding: 0; border: 0; }
  .list td.who { grid-column: 1 / -1; }
  .list td:last-child { text-align: left; }
  .list tbody tr:hover td { background: none; }
  .list tbody tr:hover { background: var(--slate-a2); }
  .list td[data-label]::before { content: attr(data-label); display: block; margin-bottom: 2px; color: var(--fg-faint); font-size: var(--text-sm); }
  .place, .time { white-space: normal; }
  .tools { max-width: none; }
  .search { flex: 1 1 100%; width: auto; }
}
</style>
