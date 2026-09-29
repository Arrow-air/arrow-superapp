<script setup lang="ts">
import Avatar from '../threads/Avatar.vue';
import StatusIcon from '../threads/StatusIcon.vue';
import { gate } from '../../data/gate';
import { issueUrl, prUrl, taskById } from '../../data/quiver';
import { personById } from '../../data/people';
import { zoneLabel, zonePath } from '../../frame/nav';
import { state, statusOf } from '../threads/store';

// The blockers, one row each: who, where it stands, the next step, and where
// the work lives.
const threadStatus = (id?: string) => {
  const t = id ? state.threads.find((x) => x.id === id) : undefined;
  return t ? statusOf(t) : undefined;
};
</script>

<template>
  <div class="gate">
    <h3 class="h">Before Quiver ships</h3>
    <ol class="items">
      <li v-for="g in gate" :key="g.id" class="item">
        <span class="state" :data-status="g.status" :title="g.statusText"></span>
        <div class="main">
          <div class="top">
            <span class="title">{{ g.title }}</span>
            <span class="status" :data-status="g.status">{{ g.statusText }}</span>
            <span class="owners">
              <Avatar v-for="o in g.owners" :key="o" :id="o" :size="16" />
              <span class="names">{{ g.owners.map((o) => personById(o)?.name).join(', ') }}</span>
            </span>
          </div>
          <p class="next">{{ g.next }}</p>
          <div class="links">
            <RouterLink v-if="g.zone" :to="zonePath(g.zone)">{{ zoneLabel(g.zone) }}</RouterLink>
            <RouterLink v-if="g.thread" :to="{ query: { thread: g.thread } }" class="thread">
              <StatusIcon v-if="threadStatus(g.thread)" :status="threadStatus(g.thread)!" :size="11" /> {{ g.thread }}
            </RouterLink>
            <a v-for="t in g.tasks ?? []" :key="t" :href="taskById(t)?.url" target="_blank" rel="noopener">{{ t }}</a>
            <a v-for="n in g.issues ?? []" :key="n" :href="issueUrl(n)" target="_blank" rel="noopener">#{{ n }}</a>
            <a v-for="n in g.prs ?? []" :key="n" :href="prUrl(n)" target="_blank" rel="noopener">PR #{{ n }}</a>
            <RouterLink :to="{ path: '/quiver/overview/calls', query: { item: g.callItem } }" class="muted">Sep 29 call</RouterLink>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.gate { flex-basis: 100% !important; }
.h { margin: 0 0 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.items { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; margin: 0; padding: 0; list-style: none; }
.item { display: flex; gap: 8px; padding: 9px 11px; border: 1px solid var(--slate-a3); border-radius: 10px; background: var(--slate-a2); }
.state { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--slate-9); }
.state[data-status='waiting'] { background: var(--amber-9); }
.state[data-status='in-progress'] { background: var(--indigo-9); }
.state[data-status='open'] { background: var(--red-9); }
.main { flex: 1; min-width: 0; }
.top { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 8px; }
.title { flex-basis: 100%; }
.title { color: var(--fg); font-weight: 500; font-size: var(--text-nav); }
.status { font-size: var(--text-sm); color: var(--fg-muted); }
.owners { display: inline-flex; align-items: center; gap: 2px; }
.owners .av + .av { margin-left: -4px; }
.names { margin-left: 5px; font-size: var(--text-sm); color: var(--fg-muted); }
.next { margin: 5px 0 6px; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
.links { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: var(--text-sm); }
.links a { color: var(--indigo-11); text-decoration: none; display: inline-flex; align-items: center; gap: 4px; }
.links a:hover { text-decoration: underline; }
.links a.muted { color: var(--fg-muted); }
</style>
