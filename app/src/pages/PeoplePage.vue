<script setup lang="ts">
import Avatar from '../modules/threads/Avatar.vue';
import { people } from '../data/people';
import { tasks } from '../data/quiver';
import { computed } from 'vue';
import { setRole, state } from '../modules/threads/store';
import { remote } from '../lib/backend';
import { session } from '../lib/session';
import type { Role } from '../modules/threads/weights';

const members = computed(() => Object.values(session.members).sort((a, b) => (a.role === b.role ? a.display_name.localeCompare(b.display_name) : a.role === 'lead' ? -1 : b.role === 'lead' ? 1 : a.role === 'core' ? -1 : 1)));
const iAmLead = computed(() => session.member?.role === 'lead');
const idOf = (uid: string) => (uid === session.userId ? 'me' : uid);

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
    <section v-if="remote" class="view-section">
      <h2>Members ({{ members.length }})</h2>
      <p class="muted small">Everyone who has signed in. Role sets vote weight: lead 2×, core 1.5×, member 1×. A lead sets roles.</p>
      <table v-if="members.length" class="vt">
        <tbody>
          <tr v-for="m in members" :key="m.user_id">
            <td><span class="mrow"><Avatar :id="idOf(m.user_id)" :size="20" /> {{ m.display_name }}</span></td>
            <td class="muted"><a v-if="m.github" :href="`https://github.com/${m.github}`" target="_blank" rel="noopener" class="link">github/{{ m.github }}</a></td>
            <td class="num">
              <select v-if="iAmLead && m.user_id !== session.userId" :value="m.role" :aria-label="`Role for ${m.display_name}`" @change="setRole(m.user_id, ($event.target as HTMLSelectElement).value as Role)">
                <option value="member">member</option><option value="core">core</option><option value="lead">lead</option>
              </select>
              <span v-else class="muted">{{ m.role }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="vempty">Nobody has signed in yet.</p>
    </section>
    <h2 v-if="remote" class="named-h">Named in the notes and on the task board</h2>
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
.mrow { display: inline-flex; align-items: center; gap: 8px; color: var(--fg); }
.small { font-size: var(--text-sm); }
.named-h { margin: 26px 0 8px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
select { height: 26px; border: 1px solid var(--slate-a5); border-radius: 6px; background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-sm); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
.card { padding: 14px; border: 1px solid var(--slate-a3); border-radius: 12px; background: var(--slate-a2); }
.card-head { display: flex; align-items: center; gap: 10px; }
.name { color: var(--fg); font-weight: 500; font-size: var(--text-nav); }
.handles { font-size: var(--text-sm); }
.does { margin: 10px 0 0; padding-left: 16px; color: var(--fg-2); font-size: var(--text-base); line-height: 1.55; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
</style>
