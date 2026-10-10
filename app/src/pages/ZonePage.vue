<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import NewThread from '../modules/threads/NewThread.vue';
import ZoneSections from '../modules/zone/ZoneSections.vue';
import GateList from '../modules/zone/GateList.vue';
import AttachmentCard from '../modules/zone/AttachmentCard.vue';
import LongshotCard from '../modules/zone/LongshotCard.vue';
import type { Thread } from '../modules/threads/data';
import { byActivity, isOpen, openVersion, projectOf, startThread, state, threadsInZone } from '../modules/threads/store';
import { zoneById } from '../data/zones';
import { findProject, projectOfZone, zoneIcon, zoneLabel } from '../frame/nav';
import { planOf } from '../projects/plans';

// A working zone is one page that scrolls: what it is, its discussion, then
// what the call notes and GitHub already say about it. Threads open in the
// side panel, so the zone stays in view.
const props = defineProps<{ zone: string; gate?: boolean }>();
const route = useRoute();
const router = useRouter();
const z = computed(() => zoneById(props.zone));
// Threads started here are about the project's next version when this is one of its zones.
const project = computed(() => projectOfZone(props.zone));
// Threads this zone depends on that live in another project's workspace, grouped by project.
const related = computed(() => {
  const ts = (z.value?.related ?? []).map((id) => state.threads.find((t) => t.id === id)).filter((t): t is Thread => !!t);
  return [...new Set(ts.map(projectOf))].map((p) => ({ project: findProject(p)?.label ?? p, threads: ts.filter((t) => projectOf(t) === p) }));
});
const nextVersion = computed(() => (planOf(project.value).nextZones.includes(props.zone) ? openVersion(project.value) : undefined));

const all = computed(() => threadsInZone(props.zone));
const open = computed(() => all.value.filter(isOpen).sort(byActivity));
const decided = computed(() => all.value.filter((t) => !isOpen(t)).sort(byActivity));
const showDecided = ref(false);

const composing = ref(false);
async function create(d: { type: Thread['type']; title: string; body: string; key: string }): Promise<boolean> {
  const t = await startThread({ zone: props.zone, title: d.title, body: d.body, type: d.type, key: d.key });
  if (!t) return false;
  composing.value = false;
  if (t) router.replace({ query: { ...route.query, thread: t.id } });
  return true;
}
</script>

<template>
  <div class="zp">
    <header class="zp-head">
      <h1 class="zp-title">{{ zoneLabel(zone) }}</h1>
      <p v-if="z" class="zp-sum">{{ z.summary }}</p>
      <p v-if="z?.status" class="zp-status" :data-tone="z.status.tone"><span class="pip" aria-hidden="true"></span>{{ z.status.text }}</p>
    </header>

    <dl v-if="z?.facts?.length" class="facts">
      <template v-for="f in z.facts" :key="f.label">
        <dt>{{ f.label }}</dt>
        <dd>{{ f.value }} <a v-if="f.source" :href="f.source.url" target="_blank" rel="noopener" class="fsrc">{{ f.source.label }}</a></dd>
      </template>
    </dl>

    <AttachmentCard v-if="z?.attachment" :id="z.attachment" />
    <LongshotCard v-if="z?.card === 'longshot'" />
    <div v-if="gate" class="gate-wrap"><GateList /></div>

    <section class="disc">
      <div class="disc-head">
        <h2 class="sec-h">Discussion <span v-if="open.length" class="count">{{ open.length }} open</span></h2>
        <button v-if="!composing" class="new-btn" type="button" @click="composing = true">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg> New thread
        </button>
      </div>

      <NewThread
        v-if="composing"
        class="nt"
        :where="zoneLabel(zone)"
        :where-icon="zoneIcon(zone)"
        :version="nextVersion"
        :draft-key="`new:${zone}`"
        :submit="create"
        @cancel="composing = false"
      />

      <div class="list">
        <ThreadRows v-if="open.length" :threads="open" />
        <p v-else-if="!composing" class="empty">
          No open threads here. <button class="link" type="button" @click="composing = true">Start one</button>: a question to decide, a proposal, or an early idea.
        </p>
      </div>

      <div v-for="r in related" :key="r.project" class="related">
        <h3 class="sec-h">Also discussed in {{ r.project }}</h3>
        <div class="list"><ThreadRows :threads="r.threads" :show-zone="true" /></div>
      </div>

      <div v-if="decided.length" class="decided">
        <button class="toggle" type="button" :aria-expanded="showDecided" @click="showDecided = !showDecided">
          <svg viewBox="0 0 16 16" aria-hidden="true" :class="{ open: showDecided }"><path d="m6 4 4 4-4 4" /></svg>
          Closed ({{ decided.length }})
        </button>
        <div v-if="showDecided" class="list"><ThreadRows :threads="decided" /></div>
      </div>
    </section>

    <ZoneSections :zone="zone" />
  </div>
</template>

<style scoped>
.zp { max-width: 880px; padding: 24px 28px 64px; }
.zp-title { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: var(--fg); }
.zp-sum { margin: 8px 0 0; max-width: 720px; color: var(--fg-2); font-size: var(--text-nav); line-height: 1.6; }
.gate-wrap { margin-top: 18px; }
.zp-status { display: inline-flex; align-items: center; gap: 7px; margin: 10px 0 0; padding: 3px 10px 3px 8px; border-radius: 999px; background: var(--slate-a3); color: var(--fg-2); font-size: var(--text-sm); }
.zp-status .pip { width: 7px; height: 7px; border-radius: 50%; background: var(--slate-9); }
.zp-status[data-tone='done'] .pip { background: var(--jade-9); }
.zp-status[data-tone='open'] .pip { background: var(--amber-9); }
.zp-status[data-tone='blocked'] .pip { background: var(--red-9); }
.facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 0; margin: 18px 0 0; max-width: 760px; border-top: 1px solid var(--slate-a3); font-size: var(--text-base); }
.facts dt, .facts dd { margin: 0; padding: 7px 0; border-bottom: 1px solid var(--slate-a3); line-height: 1.5; }
.facts dt { padding-right: 18px; color: var(--fg-muted); }
.facts dd { color: var(--fg-2); }
.fsrc { margin-left: 4px; color: var(--indigo-11); font-size: var(--text-sm); text-decoration: none; white-space: nowrap; }
.fsrc:hover { text-decoration: underline; }
.disc { margin-top: 28px; }
.disc-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.sec-h { margin: 0; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.count { margin-left: 6px; color: var(--fg-muted); }
.list { border: 1px solid var(--slate-a4); border-radius: 12px; overflow: hidden; background: var(--slate-a1, transparent); }
.empty { margin: 0; padding: 18px 16px; color: var(--fg-muted); font-size: var(--text-nav); }
.link { padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; cursor: pointer; }
.link:hover { text-decoration: underline; }
.new-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border: 1px solid var(--slate-a5); border-radius: 8px;
  background: none; color: var(--fg-2); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
}
.new-btn:hover { color: var(--fg); border-color: var(--slate-a7); }
.new-btn svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.decided { margin-top: 10px; }
.related { margin-top: 18px; }
.related .sec-h { margin-bottom: 8px; }
.toggle { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 8px; padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.toggle:hover { color: var(--fg); }
.toggle svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; transition: transform 150ms; }
.toggle svg.open { transform: rotate(90deg); }
@media (max-width: 767px) { .zp { padding: 16px; } }
.nt { margin-top: 12px; }
</style>
