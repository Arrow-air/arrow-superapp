<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { integration, longshotLinks, specRows } from '../../data/longshot';
import { state, statusOf } from '../threads/store';
import StatusIcon from '../threads/StatusIcon.vue';

// Longshot against the Tattu it replaces, and the integration steps, each
// pointing at the thread where it is being worked out.
const route = useRoute();
const router = useRouter();
const openThread = (id: string) => router.replace({ query: { ...route.query, thread: id } });
const threadStatus = (id?: string) => {
  const t = id ? state.threads.find((x) => x.id === id) : undefined;
  return t ? statusOf(t) : undefined;
};
</script>

<template>
  <div class="ls">
    <div class="ls-head">
      <span class="ls-name">Longshot PT1 vs. the Tattu 4.0 30 Ah</span>
      <a :href="longshotLinks.repo" target="_blank" rel="noopener">project-longshot</a>
    </div>
    <table class="spec">
      <thead><tr><th></th><th>Longshot</th><th>Tattu (today)</th></tr></thead>
      <tbody>
        <tr v-for="r in specRows" :key="r.label">
          <th>{{ r.label }}</th>
          <td>{{ r.longshot }}</td>
          <td class="muted">{{ r.tattu }}</td>
        </tr>
      </tbody>
    </table>
    <p class="src">Sources: <a :href="longshotLinks.specs" target="_blank" rel="noopener">LS #26</a>, <a :href="longshotLinks.board" target="_blank" rel="noopener">SL_PCB</a>, <a :href="longshotLinks.model" target="_blank" rel="noopener">LS PR #27</a>, Quiver #248 and #188.</p>

    <h3 class="h">Integration</h3>
    <ol class="steps">
      <li v-for="s in integration" :key="s.id" class="step">
        <span class="dot" :data-status="s.status"></span>
        <div class="s-main">
          <div class="s-top">
            <span class="s-title">{{ s.title }}</span>
            <span class="s-status" :data-status="s.status">{{ s.statusText }}</span>
            <button v-if="s.thread" class="s-link" type="button" @click="openThread(s.thread)">
              <StatusIcon v-if="threadStatus(s.thread)" :status="threadStatus(s.thread)!" :size="11" /> {{ s.thread }}
            </button>
          </div>
          <p class="s-detail">{{ s.detail }}</p>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.ls { margin-top: 16px; padding: 14px 16px; border: 1px solid var(--slate-a4); border-radius: 12px; background: var(--slate-a2); }
.ls-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.ls-name { color: var(--fg); font-weight: 600; font-size: var(--text-nav); }
.ls-head a, .src a { color: var(--indigo-11); font-size: var(--text-sm); text-decoration: none; }
.ls-head a:hover, .src a:hover { text-decoration: underline; }
.spec { width: 100%; margin-top: 10px; border-collapse: collapse; font-size: var(--text-base); }
.spec th, .spec td { padding: 5px 8px 5px 0; text-align: left; vertical-align: top; border-top: 1px solid var(--slate-a3); line-height: 1.45; }
.spec thead th { border-top: 0; color: var(--fg-faint); font-size: var(--text-sm); font-weight: 500; }
.spec tbody th { width: 84px; color: var(--fg-muted); font-weight: 500; }
.spec td { color: var(--fg-2); }
.muted { color: var(--fg-muted) !important; }
.src { margin: 6px 0 0; font-size: var(--text-sm); color: var(--fg-faint); }
.h { margin: 16px 0 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.steps { margin: 0; padding: 0; list-style: none; }
.step { display: flex; gap: 10px; padding: 7px 0; border-top: 1px solid var(--slate-a3); }
.step:first-child { border-top: 0; }
.dot { flex: none; width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--slate-8); }
.dot[data-status='done'] { background: var(--jade-9); }
.dot[data-status='blocked'] { background: var(--red-9); }
.dot[data-status='open'] { background: var(--amber-9); }
.s-main { flex: 1; min-width: 0; }
.s-top { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.s-title { color: var(--fg); font-size: var(--text-nav); font-weight: 500; }
.s-status { font-size: var(--text-sm); color: var(--fg-muted); }
.s-status[data-status='blocked'] { color: var(--red-11); }
.s-link { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.s-link:hover { text-decoration: underline; }
.s-detail { margin: 3px 0 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
</style>
