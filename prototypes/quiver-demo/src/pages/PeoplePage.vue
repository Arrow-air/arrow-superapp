<script setup lang="ts">
import Avatar from '../modules/threads/Avatar.vue';
import { people } from '../data/people';
import { tasks } from '../data/quiver';
import { state } from '../modules/threads/store';

// Who is in the Quiver material and what the record says they do. No roles,
// weights or holdings until people join; every line names its source.
const ownsTasks = (id: string, gh?: string) =>
  tasks.filter((t) => t.state.toUpperCase() !== 'CLOSED').filter((t) => {
    const o = (t.owner ?? '').toLowerCase();
    return o.startsWith(id) || (gh && o.includes(gh.toLowerCase())) || o.includes(`${id} (`);
  });
const positionsBy = (id: string) => state.threads.flatMap((t) => t.positions.filter((p) => p.authorId === id).map(() => t)).filter((t, i, a) => a.indexOf(t) === i);
</script>

<template>
  <div class="view">
    <div class="view-head">
      <div>
        <h1 class="view-title">People</h1>
        <p class="view-lede">Everyone named on the task board or in the call notes. Nobody has an account in the demo, so nobody has a role, verified expertise or vote weight here yet. Positions attributed to people link to the notes or issue they came from.</p>
      </div>
    </div>
    <div class="grid">
      <article v-for="p in people" :key="p.id" class="card">
        <header class="card-head">
          <Avatar :id="p.id" :size="28" />
          <div>
            <div class="name">{{ p.name }}</div>
            <div class="handles muted">
              <a v-if="p.github" :href="`https://github.com/${p.github}`" target="_blank" rel="noopener" class="link">github/{{ p.github }}</a>
              <span v-if="p.github && p.discord" class="dot">·</span>
              <span v-if="p.discord">{{ p.discord }}</span>
            </div>
          </div>
        </header>
        <ul class="does">
          <li v-for="d in p.does" :key="d.text">{{ d.text }} <span class="faint">({{ d.source }})</span></li>
        </ul>
        <div v-if="ownsTasks(p.id, p.github).length" class="chips">
          <a v-for="t in ownsTasks(p.id, p.github)" :key="t.id" :href="t.url" target="_blank" rel="noopener" class="chip">{{ t.id }}</a>
        </div>
        <div v-if="positionsBy(p.id).length" class="chips">
          <RouterLink v-for="t in positionsBy(p.id)" :key="t.id" :to="{ query: { thread: t.id } }" class="chip indigo">{{ t.id }}</RouterLink>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
.card { padding: 14px; border: 1px solid var(--slate-a3); border-radius: 12px; background: var(--slate-a2); }
.card-head { display: flex; align-items: center; gap: 10px; }
.name { color: var(--fg); font-weight: 500; font-size: var(--text-nav); }
.handles { font-size: var(--text-sm); }
.does { margin: 10px 0 0; padding-left: 16px; color: var(--fg-2); font-size: var(--text-base); line-height: 1.55; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
</style>
