<script setup lang="ts">
import Avatar from '../modules/threads/Avatar.vue';
import { prs, generatedAt, shortDate } from '../data/quiver';
import { personByGithub } from '../data/people';
import { zones } from '../data/zones';
import { zoneLabel, zonePath } from '../frame/nav';

// Open pull requests on project-quiver. Review and merge stay on GitHub;
// the app only says which zone a change belongs to.
const zoneOf = (n: number) => zones.find((z) => z.prs?.includes(n))?.id;
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">Open pull requests</h1>
        <p class="view-lede">{{ prs.length }} open on project-quiver as of {{ shortDate(generatedAt) }}. Only pull requests that decide or change the spec need a thread; the rest get a normal review on GitHub.</p>
      </div>
    </div>
    <table class="vt">
      <thead><tr><th>PR</th><th></th><th>Author</th><th class="hide-sm">Updated</th></tr></thead>
      <tbody>
        <tr v-for="p in prs" :key="p.number">
          <td class="mono muted" style="white-space: nowrap">#{{ p.number }}</td>
          <td>
            <a :href="p.url" target="_blank" rel="noopener">{{ p.title }}</a>
            <div class="sub">
              <span v-if="p.draft" class="chip">Draft</span>
              <RouterLink v-if="zoneOf(p.number)" :to="zonePath(zoneOf(p.number)!)" class="chip">{{ zoneLabel(zoneOf(p.number)!) }}</RouterLink>
            </div>
          </td>
          <td>
            <span v-if="personByGithub(p.author)" class="who"><Avatar :id="personByGithub(p.author)!.id" :size="16" /> {{ personByGithub(p.author)!.name }}</span>
            <span v-else class="muted">{{ p.author }}</span>
          </td>
          <td class="hide-sm muted">{{ shortDate(p.updatedAt) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.sub { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.sub:empty { display: none; }
.who { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
</style>
