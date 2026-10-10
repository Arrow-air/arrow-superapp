<script setup lang="ts">
import { computed, ref } from 'vue';
import Avatar from '../../modules/threads/Avatar.vue';
import { LS_REPO, lsGeneratedAt, lsIssues, lsPrs } from '../../projects/longshot/github';
import { shortDate } from '../../data/quiver';
import { personByGithub } from '../../data/people';
import { zones } from '../../data/zones';
import { zoneLabel, zonePath, zonesOf } from '../../frame/nav';

// Longshot's issues and pull requests as GitHub has them: the PT1 work
// packages, the build steps, the merged design work. Read-only; the work
// itself is tracked and closed on GitHub, and each issue links to the zone
// where it is discussed.
type Scope = 'open' | 'closed' | 'all';
const scope = ref<Scope>('open');
// Issue numbers are Longshot's own, so only Longshot's zones are asked.
const lsZones = new Set(zonesOf('longshot'));
const zoneOf = (n: number) => zones.find((z) => lsZones.has(z.id) && z.issues?.includes(n))?.id;
const issues = computed(() => lsIssues.filter((i) => (scope.value === 'all' ? true : scope.value === 'open' ? i.state === 'OPEN' : i.state === 'CLOSED')));
const prs = computed(() => lsPrs.filter((p) => (scope.value === 'all' ? true : scope.value === 'open' ? p.state === 'OPEN' : p.state !== 'OPEN')));
const who = (login: string | null) => personByGithub(login);
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">Issues and pull requests</h1>
        <p class="view-lede">
          From <a :href="LS_REPO" target="_blank" rel="noopener">project-longshot</a> on {{ shortDate(lsGeneratedAt) }}. Work is tracked, claimed and closed on GitHub;
          a question that needs deciding gets a thread in its zone.
        </p>
      </div>
      <div class="vseg" role="radiogroup" aria-label="Scope">
        <button v-for="s in (['open', 'closed', 'all'] as Scope[])" :key="s" type="button" role="radio" :aria-checked="scope === s" @click="scope = s">
          {{ s === 'open' ? 'Open' : s === 'closed' ? 'Closed' : 'All' }}
        </button>
      </div>
    </div>

    <section class="view-section">
      <h2>Issues · {{ issues.length }}</h2>
      <table v-if="issues.length" class="vt">
        <tbody>
          <tr v-for="i in issues" :key="i.number">
            <td class="mono muted nowrap">#{{ i.number }}</td>
            <td>
              <a :href="i.url" target="_blank" rel="noopener">{{ i.title }}</a>
              <div v-if="i.excerpt" class="ex">{{ i.excerpt }}</div>
              <div class="sub">
                <span v-if="i.state === 'CLOSED'" class="chip">Closed {{ i.closedAt ? shortDate(i.closedAt) : '' }}</span>
                <span v-for="l in i.labels" :key="l" class="chip">{{ l }}</span>
                <RouterLink v-if="zoneOf(i.number)" :to="zonePath(zoneOf(i.number)!)" class="chip indigo">{{ zoneLabel(zoneOf(i.number)!) }}</RouterLink>
              </div>
            </td>
            <td class="nowrap">
              <span v-for="a in i.assignees" :key="a" class="who"><Avatar v-if="who(a)" :id="who(a)!.id" :size="16" /> {{ who(a)?.name ?? a }}</span>
              <span v-if="!i.assignees.length" class="muted">—</span>
            </td>
            <td class="muted nowrap hide-sm">{{ shortDate(i.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="vempty">No {{ scope === 'all' ? '' : scope }} issues.</p>
    </section>

    <section class="view-section">
      <h2>Pull requests · {{ prs.length }}</h2>
      <table v-if="prs.length" class="vt">
        <tbody>
          <tr v-for="p in prs" :key="p.number">
            <td class="mono muted nowrap">PR {{ p.number }}</td>
            <td>
              <a :href="p.url" target="_blank" rel="noopener">{{ p.title }}</a>
              <div class="sub">
                <span v-if="p.state === 'MERGED'" class="chip jade">Merged {{ p.mergedAt ? shortDate(p.mergedAt) : '' }}</span>
                <span v-else-if="p.draft" class="chip">Draft</span>
                <span v-else-if="p.state === 'CLOSED'" class="chip">Closed</span>
                <span v-else class="chip amber">Open</span>
              </div>
            </td>
            <td class="nowrap">
              <span v-if="p.author" class="who"><Avatar v-if="who(p.author)" :id="who(p.author)!.id" :size="16" /> {{ who(p.author)?.name ?? p.author }}</span>
            </td>
            <td class="muted nowrap hide-sm">{{ shortDate(p.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="vempty">No {{ scope === 'all' ? '' : scope }} pull requests.</p>
    </section>
  </div>
</template>

<style scoped>
.sub { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.ex { margin-top: 3px; color: var(--fg-muted); font-size: var(--text-sm); line-height: 1.45; max-width: 640px; }
.who { display: inline-flex; align-items: center; gap: 6px; margin-right: 8px; }
</style>
